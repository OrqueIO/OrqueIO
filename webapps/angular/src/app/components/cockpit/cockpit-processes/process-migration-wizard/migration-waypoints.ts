/**
 * Pure functions for managing migration arrow waypoints.
 *
 * This module provides a waypoint-based model for migration arrows,
 * replacing the previous 2-parameter model (midOffset/bridgeY).
 *
 * ARCHITECTURE:
 * - All functions are pure (no side effects, no Angular dependencies)
 * - Uses diagram-js ManhattanLayout for orthogonal routing
 * - Waypoints are stored as Point[] (list of passage points)
 * - Supports repair/reconnection when shapes move
 *
 * NO ANGULAR, NO DOM - PURE LOGIC ONLY
 */

import * as ManhattanLayout from 'diagram-js/lib/layout/ManhattanLayout';
import { buildOrthogonalRoute, routeToPath as existingRouteToPath, sidePoint as existingSidePoint } from './migration-arrow-route';

export type Side = 'top' | 'right' | 'bottom' | 'left';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Segment {
  index: number;
  a: Point;
  b: Point;
  orientation: 'horizontal' | 'vertical';
  length: number;
}

/**
 * Generates initial waypoints for orthogonal arrow between two shapes.
 * Uses diagram-js ManhattanLayout.connectRectangles for production-quality routing.
 *
 * Default docking: right side of source (t=0.5), left side of target (t=0.5).
 * Endpoints are positioned on shape borders, path is orthogonal (right angles only).
 *
 * INVARIANT: Endpoints are on shape perimeters.
 *
 * @param sourceRect - Source shape in layer coordinates
 * @param targetRect - Target shape in layer coordinates
 * @param startSide - Source exit side (default: 'right')
 * @param startT - Position on source side [0, 1] (default: 0.5 = center)
 * @param endSide - Target entry side (default: 'left')
 * @param endT - Position on target side [0, 1] (default: 0.5 = center)
 * @returns Array of waypoints forming orthogonal path with normalized endpoints
 */
export function initialWaypoints(
  sourceRect: Rect,
  targetRect: Rect,
  startSide: Side = 'right',
  startT: number = 0.5,
  endSide: Side = 'left',
  endT: number = 0.5
): Point[] {

  const sourceBox = {
    x: sourceRect.left,
    y: sourceRect.top,
    width: sourceRect.width,
    height: sourceRect.height
  };

  const targetBox = {
    x: targetRect.left,
    y: targetRect.top,
    width: targetRect.width,
    height: targetRect.height
  };

  const waypoints = ManhattanLayout.connectRectangles(sourceBox, targetBox);

  let result = cleanWaypoints(waypoints);

  rebuildEnd(result, true, sourceRect, startSide, startT);
  rebuildEnd(result, false, targetRect, endSide, endT);

  return normalizeToPerimeter(result, sourceRect, targetRect);
}

/**
 * Rebuilds an endpoint (start or end) and adjusts its neighbor to maintain orthogonality.
 *
 * @param points
 * @param isStart
 * @param rect
 * @param side
 * @param t
 */
function rebuildEnd(points: Point[], isStart: boolean, rect: Rect, side: Side, t: number): void {
  if (points.length < 2) return;

  const endpointIdx = isStart ? 0 : points.length - 1;
  const neighborIdx = isStart ? 1 : points.length - 2;
  const endpoint = dockPoint(rect, side, t);
  points[endpointIdx] = endpoint;

  const neighbor = points[neighborIdx];
  const newNeighbor = (side === 'top' || side === 'bottom')
    ? { x: endpoint.x, y: neighbor.y }
    : { x: neighbor.x, y: endpoint.y };

  const adjacentIdx = isStart ? 2 : points.length - 3;
  if (adjacentIdx >= 0 && adjacentIdx < points.length) {
    const adjacent = points[adjacentIdx];
    const dx = Math.abs(adjacent.x - newNeighbor.x);
    const dy = Math.abs(adjacent.y - newNeighbor.y);
    const isOrthogonal = (dx < 0.01 || dy < 0.01);

    if (!isOrthogonal) {
      if (isStart) {
        points.splice(1, 0, newNeighbor);
      } else {
        points.splice(neighborIdx + 1, 0, newNeighbor);
      }
    } else {
      points[neighborIdx] = newNeighbor;
    }
  } else {
    points[neighborIdx] = newNeighbor;
  }
}

/**
 * Cleans waypoints by removing consecutive duplicates AND collinear points.
 * Preserves orthogonal structure and corners.
 *
 * @param points - Raw waypoints
 * @returns Cleaned waypoints (no duplicates, no redundant collinear points)
 */
export function cleanWaypoints(points: Point[]): Point[] {
  if (points.length <= 1) {
    return points;
  }

  // Step 1: Remove consecutive duplicates
  const noDuplicates: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = noDuplicates[noDuplicates.length - 1];
    const curr = points[i];
    if (Math.abs(curr.x - prev.x) > 0.01 || Math.abs(curr.y - prev.y) > 0.01) {
      noDuplicates.push(curr);
    }
  }

  if (noDuplicates.length <= 2) {
    return noDuplicates;
  }

  const noCollinear: Point[] = [noDuplicates[0]];
  for (let i = 1; i < noDuplicates.length - 1; i++) {
    const prev = noDuplicates[i - 1];
    const curr = noDuplicates[i];
    const next = noDuplicates[i + 1];

    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    const cross = dx1 * dy2 - dy1 * dx2;
    const isCollinear = Math.abs(cross) < 0.01;

    if (!isCollinear) {
      noCollinear.push(curr);
    }
  }
  noCollinear.push(noDuplicates[noDuplicates.length - 1]);

  return noCollinear;
}

/**
 * Normalizes waypoints to ensure endpoints are on shape perimeters.
 *
 * INVARIANTS enforced:
 * - First point is on sourceRect perimeter (≤ 0.5px tolerance)
 * - Last point is on targetRect perimeter (≤ 0.5px tolerance)
 * - First and last segments are perpendicular to their anchor sides
 * - No segment passes through shape interiors
 * - All segments remain orthogonal (H or V)
 * - No duplicate or collinear points (via cleanWaypoints)
 *
 * Algorithm:
 * 1. Remove any interior points adjacent to endpoints
 * 2. For each endpoint, find intersection of first/last segment with shape perimeter
 * 3. If segment is shifted outside shape bounds, re-dock to nearest perimeter point
 *    and insert orthogonal bend to reach adjacent point
 * 4. Clean waypoints to remove duplicates/collinear points
 *
 * @param points - Current waypoints
 * @param sourceRect - Source shape rectangle
 * @param targetRect - Target shape rectangle
 * @returns Normalized waypoints with endpoints on perimeters
 */
/**
 * Converts side and t parameter to absolute point on rectangle perimeter.
 *
 * @param rect
 * @param side
 * @param t
 * @returns
 */
export function sideAndTToPoint(rect: Rect, side: Side, t: number): Point {
  switch (side) {
    case 'top':
      return { x: rect.left + rect.width * t, y: rect.top };
    case 'bottom':
      return { x: rect.left + rect.width * t, y: rect.top + rect.height };
    case 'left':
      return { x: rect.left, y: rect.top + rect.height * t };
    case 'right':
      return { x: rect.left + rect.width, y: rect.top + rect.height * t };
  }
}

export function normalizeToPerimeter(
  points: Point[],
  sourceRect: Rect,
  targetRect: Rect,
  startSide?: Side,
  startT?: number,
  endSide?: Side,
  endT?: number
): Point[] {
  if (points.length < 2) {
    return points;
  }

  let result = [...points];

  const isInside = (p: Point, rect: Rect): boolean => {
    const EPSILON = 0.5;
    return (
      p.x > rect.left + EPSILON &&
      p.x < rect.left + rect.width - EPSILON &&
      p.y > rect.top + EPSILON &&
      p.y < rect.top + rect.height - EPSILON
    );
  };

  const isOnPerimeter = (p: Point, rect: Rect): boolean => {
    const EPSILON = 0.5;
    const onLeft = Math.abs(p.x - rect.left) < EPSILON;
    const onRight = Math.abs(p.x - (rect.left + rect.width)) < EPSILON;
    const onTop = Math.abs(p.y - rect.top) < EPSILON;
    const onBottom = Math.abs(p.y - (rect.top + rect.height)) < EPSILON;

    const inXRange = p.x >= rect.left - EPSILON && p.x <= rect.left + rect.width + EPSILON;
    const inYRange = p.y >= rect.top - EPSILON && p.y <= rect.top + rect.height + EPSILON;

    return ((onLeft || onRight) && inYRange) || ((onTop || onBottom) && inXRange);
  };

  const nearestPerimeterPoint = (p: Point, rect: Rect): Point => {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = p.x - cx;
    const dy = p.y - cy;

    const sides = [
      { side: 'top' as Side, point: { x: p.x, y: rect.top } },
      { side: 'bottom' as Side, point: { x: p.x, y: rect.top + rect.height } },
      { side: 'left' as Side, point: { x: rect.left, y: p.y } },
      { side: 'right' as Side, point: { x: rect.left + rect.width, y: p.y } }
    ];

    let nearest = sides[0];
    let minDist = Number.MAX_VALUE;

    for (const s of sides) {
      const d = Math.sqrt(
        Math.pow(s.point.x - p.x, 2) + Math.pow(s.point.y - p.y, 2)
      );
      if (d < minDist) {
        minDist = d;
        nearest = s;
      }
    }

    if (nearest.side === 'top' || nearest.side === 'bottom') {
      return {
        x: Math.max(rect.left, Math.min(rect.left + rect.width, nearest.point.x)),
        y: nearest.point.y
      };
    } else {
      return {
        x: nearest.point.x,
        y: Math.max(rect.top, Math.min(rect.top + rect.height, nearest.point.y))
      };
    }
  };

  while (result.length > 2 && isInside(result[1], sourceRect)) {
    result.splice(1, 1);
    if (result.length >= 2) {
      const dx = Math.abs(result[1].x - result[0].x);
      const dy = Math.abs(result[1].y - result[0].y);
      if (dx > 0.01 && dy > 0.01) {
        const corner: Point = { x: result[0].x, y: result[1].y };
        if (!isInside(corner, sourceRect) && !isInside(corner, targetRect)) {
          result.splice(1, 0, corner);
        } else {
          const altCorner: Point = { x: result[1].x, y: result[0].y };
          if (!isInside(altCorner, sourceRect) && !isInside(altCorner, targetRect)) {
            result.splice(1, 0, altCorner);
          }
        }
      }
    }
  }

  while (result.length > 2 && isInside(result[result.length - 2], targetRect)) {
    const removedIdx = result.length - 2;
    result.splice(removedIdx, 1);
    if (result.length >= 2) {
      const lastIdx = result.length - 1;
      const secondLastIdx = result.length - 2;
      const dx = Math.abs(result[lastIdx].x - result[secondLastIdx].x);
      const dy = Math.abs(result[lastIdx].y - result[secondLastIdx].y);
      if (dx > 0.01 && dy > 0.01) {
        const corner: Point = { x: result[secondLastIdx].x, y: result[lastIdx].y };
        if (!isInside(corner, sourceRect) && !isInside(corner, targetRect)) {
          result.splice(lastIdx, 0, corner);
        } else {
          const altCorner: Point = { x: result[lastIdx].x, y: result[secondLastIdx].y };
          if (!isInside(altCorner, sourceRect) && !isInside(altCorner, targetRect)) {
            result.splice(lastIdx, 0, altCorner);
          }
        }
      }
    }
  }

  if (result.length < 2) {
    return initialWaypoints(sourceRect, targetRect);
  }

  const first = result[0];
  const second = result[1];

  const onStartPerimeter = isOnPerimeter(first, sourceRect);

  if (!onStartPerimeter) {
    const dx = Math.abs(second.x - first.x);
    const dy = Math.abs(second.y - first.y);
    const isVertical = dy > dx;

    if (isVertical) {
      // Vertical segment: intersect line x = first.x with top/bottom edge
      const x = first.x;
      const inXRange = x >= sourceRect.left && x <= sourceRect.left + sourceRect.width;

      if (inXRange) {
        // Choose top or bottom based on direction
        const goingUp = second.y < first.y;
        const newY = goingUp ? sourceRect.top : sourceRect.top + sourceRect.height;
        result[0] = { x, y: newY };
      } else {
        // Segment shifted outside: re-dock and insert bend
        const docked = nearestPerimeterPoint(first, sourceRect);
        result[0] = docked;

        // Insert orthogonal bend to reach second point
        if (Math.abs(docked.x - second.x) > 0.5) {
          result.splice(1, 0, { x: docked.x, y: second.y });
        } else if (Math.abs(docked.y - second.y) > 0.5) {
          result.splice(1, 0, { x: second.x, y: docked.y });
        }
      }
    } else {
      // Horizontal segment: intersect line y = first.y with left/right edge
      const y = first.y;
      const inYRange = y >= sourceRect.top && y <= sourceRect.top + sourceRect.height;

      if (inYRange) {
        // Choose left or right based on direction
        const goingLeft = second.x < first.x;
        const newX = goingLeft ? sourceRect.left : sourceRect.left + sourceRect.width;
        result[0] = { x: newX, y };
      } else {
        // Segment shifted outside: re-dock and insert bend
        const docked = nearestPerimeterPoint(first, sourceRect);
        result[0] = docked;

        // Insert orthogonal bend to reach second point
        if (Math.abs(docked.y - second.y) > 0.5) {
          result.splice(1, 0, { x: second.x, y: docked.y });
        } else if (Math.abs(docked.x - second.x) > 0.5) {
          result.splice(1, 0, { x: docked.x, y: second.y });
        }
      }
    }
  } else {
    // Endpoint IS on perimeter - adjust if segment not orthogonal OR if explicit side/t provided
    const dx = Math.abs(second.x - first.x);
    const dy = Math.abs(second.y - first.y);
    const isOrthogonal = (dx < 0.01 || dy < 0.01);

    const needsSideChange = startSide !== undefined && startT !== undefined;

    if (!isOrthogonal || needsSideChange) {
      const isVertical = dy > dx;

      if (isVertical) {
        const x = first.x;
        const inXRange = x >= sourceRect.left && x <= sourceRect.left + sourceRect.width;
        if (inXRange) {
          let targetSide: Side;
          let targetT: number;
          if (startSide !== undefined && startT !== undefined) {
            targetSide = startSide;
            targetT = startT;
          } else {
            const currentSide: Side = first.y <= sourceRect.top + 0.5 ? 'top' : 'bottom';
            const dockResult = dockSideFromNeighbor(sourceRect, second, currentSide);
            targetSide = dockResult.side;
            targetT = 0.5;
          }
          const newPoint = sideAndTToPoint(sourceRect, targetSide, targetT);
          result[0] = newPoint;
          result[1] = (targetSide === 'top' || targetSide === 'bottom')
            ? { x: newPoint.x, y: second.y }
            : { x: second.x, y: newPoint.y };
        }
      } else {
        const y = first.y;
        const inYRange = y >= sourceRect.top && y <= sourceRect.top + sourceRect.height;
        if (inYRange) {
          let targetSide: Side;
          let targetT: number;
          if (startSide !== undefined && startT !== undefined) {
            targetSide = startSide;
            targetT = startT;
          } else {
            const currentSide: Side = first.x <= sourceRect.left + 0.5 ? 'left' : 'right';
            const dockResult = dockSideFromNeighbor(sourceRect, second, currentSide);
            targetSide = dockResult.side;
            targetT = 0.5;
          }
          const newPoint = sideAndTToPoint(sourceRect, targetSide, targetT);
          result[0] = newPoint;
          result[1] = (targetSide === 'top' || targetSide === 'bottom')
            ? { x: newPoint.x, y: second.y }
            : { x: second.x, y: newPoint.y };
        }
      }
    }
  }

  // STEP 4: Normalize end point
  // Recalculate dock side when endpoint is on perimeter
  const last = result[result.length - 1];
  const secondLast = result[result.length - 2];

  const onEndPerimeter = isOnPerimeter(last, targetRect);

  if (!onEndPerimeter) {
    const endDx = Math.abs(last.x - secondLast.x);
    const endDy = Math.abs(last.y - secondLast.y);
    const endIsVertical = endDy > endDx;

    if (endIsVertical) {
      // Vertical segment: intersect line x = last.x with top/bottom edge
      const x = last.x;
      const inXRange = x >= targetRect.left && x <= targetRect.left + targetRect.width;

      if (inXRange) {
        // Choose top or bottom based on direction of arrival
        const comingFromAbove = last.y > secondLast.y;
        const newY = comingFromAbove ? targetRect.top : targetRect.top + targetRect.height;
        result[result.length - 1] = { x, y: newY };
      } else {
        // Segment shifted outside: re-dock and insert bend
        const docked = nearestPerimeterPoint(last, targetRect);
        result[result.length - 1] = docked;

        // Insert orthogonal bend to reach secondLast point
        const insertIndex = result.length - 1;
        if (Math.abs(docked.x - secondLast.x) > 0.5) {
          result.splice(insertIndex, 0, { x: docked.x, y: secondLast.y });
        } else if (Math.abs(docked.y - secondLast.y) > 0.5) {
          result.splice(insertIndex, 0, { x: secondLast.x, y: docked.y });
        }
      }
    } else {
      // Horizontal segment: intersect line y = last.y with left/right edge
      const y = last.y;
      const inYRange = y >= targetRect.top && y <= targetRect.top + targetRect.height;

      if (inYRange) {
        // Choose left or right based on direction of arrival
        const comingFromLeft = last.x > secondLast.x;
        const newX = comingFromLeft ? targetRect.left : targetRect.left + targetRect.width;
        result[result.length - 1] = { x: newX, y };
      } else {
        // Segment shifted outside: re-dock and insert bend
        const docked = nearestPerimeterPoint(last, targetRect);
        result[result.length - 1] = docked;

        // Insert orthogonal bend to reach secondLast point
        const insertIndex = result.length - 1;
        if (Math.abs(docked.y - secondLast.y) > 0.5) {
          result.splice(insertIndex, 0, { x: secondLast.x, y: docked.y });
        } else if (Math.abs(docked.x - secondLast.x) > 0.5) {
          result.splice(insertIndex, 0, { x: docked.x, y: secondLast.y });
        }
      }
    }
  } else {
    // Endpoint IS on perimeter - recalculate side based on neighbor position
    const endDx = Math.abs(last.x - secondLast.x);
    const endDy = Math.abs(last.y - secondLast.y);
    const endIsVertical = endDy > endDx;

    if (endIsVertical) {
      const x = last.x;
      const inXRange = x >= targetRect.left && x <= targetRect.left + targetRect.width;
      if (inXRange) {
        let targetSide: Side;
        let targetT: number;
        if (endSide !== undefined && endT !== undefined) {
          targetSide = endSide;
          targetT = endT;
        } else {
          const currentSide: Side = last.y <= targetRect.top + 0.5 ? 'top' : 'bottom';
          const dockResult = dockSideFromNeighbor(targetRect, secondLast, currentSide);
          targetSide = dockResult.side;
          targetT = 0.5;
        }
        const newPoint = sideAndTToPoint(targetRect, targetSide, targetT);
        result[result.length - 1] = newPoint;
        result[result.length - 2] = (targetSide === 'top' || targetSide === 'bottom')
          ? { x: newPoint.x, y: secondLast.y }
          : { x: secondLast.x, y: newPoint.y };
      }
    } else {
      const y = last.y;
      const inYRange = y >= targetRect.top && y <= targetRect.top + targetRect.height;
      if (inYRange) {
        let targetSide: Side;
        let targetT: number;
        if (endSide !== undefined && endT !== undefined) {
          targetSide = endSide;
          targetT = endT;
        } else {
          const currentSide: Side = last.x <= targetRect.left + 0.5 ? 'left' : 'right';
          const dockResult = dockSideFromNeighbor(targetRect, secondLast, currentSide);
          targetSide = dockResult.side;
          targetT = 0.5;
        }
        const newPoint = sideAndTToPoint(targetRect, targetSide, targetT);
        result[result.length - 1] = newPoint;
        result[result.length - 2] = (targetSide === 'top' || targetSide === 'bottom')
          ? { x: newPoint.x, y: secondLast.y }
          : { x: secondLast.x, y: newPoint.y };
      }
    }
  }

  // STEP 5: Remove any points that ended up inside shapes
  result = result.filter((p, i) => {
    if (i === 0 || i === result.length - 1) return true; // Keep endpoints
    return !isInside(p, sourceRect) && !isInside(p, targetRect);
  });

  for (let i = 0; i < result.length - 1; i++) {
    const dx = Math.abs(result[i + 1].x - result[i].x);
    const dy = Math.abs(result[i + 1].y - result[i].y);

    if (dx > 0.01 && dy > 0.01) {
      const corner1: Point = { x: result[i + 1].x, y: result[i].y };
      const isCorner1Inside = isInside(corner1, sourceRect) || isInside(corner1, targetRect);

      if (!isCorner1Inside) {
        result.splice(i + 1, 0, corner1);
        continue;
      }

      const corner2: Point = { x: result[i].x, y: result[i + 1].y };
      const isCorner2Inside = isInside(corner2, sourceRect) || isInside(corner2, targetRect);

      if (!isCorner2Inside) {
        result.splice(i + 1, 0, corner2);
        continue;
      }
      return initialWaypoints(sourceRect, targetRect);
    }
  }

  let cleaned = cleanWaypoints(result);
  let prevLength = -1;
  let cleanIterations = 0;

  while (cleaned.length !== prevLength && cleanIterations < 3) {
    prevLength = cleaned.length;
    cleaned = cleanWaypoints(cleaned);
    cleanIterations++;
  }

  return cleaned;
}

/**
 * Extracts segments from waypoints with metadata.
 *
 * @param points - Waypoints
 * @returns Array of segments with index, endpoints, orientation, length
 */
export function segments(points: Point[]): Segment[] {
  if (points.length < 2) {
    return [];
  }

  const segs: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = Math.abs(b.x - a.x);
    const dy = Math.abs(b.y - a.y);
    const length = Math.sqrt(dx * dx + dy * dy);
    const orientation = dx > dy ? 'horizontal' : 'vertical';

    segs.push({ index: i, a, b, orientation, length });
  }

  return segs;
}

/**
 * Returns center position of a segment (for bar handle).
 * Bar exists even on zero-length segment (orientation preserved).
 *
 * @param segment - Segment metadata
 * @returns Center point of segment
 */
export function segmentBarPosition(segment: Segment): Point {
  return {
    x: (segment.a.x + segment.b.x) / 2,
    y: (segment.a.y + segment.b.y) / 2
  };
}

/**
 * Converts waypoints to SVG path string with right angles.
 *
 * @param points - Waypoints
 * @returns SVG path string (e.g., "M 100 100 L 200 100 L 200 200")
 */
export function waypointsToPath(points: Point[]): string {
  if (points.length === 0) {
    return '';
  }

  const parts: string[] = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 1; i < points.length; i++) {
    parts.push(`L ${points[i].x} ${points[i].y}`);
  }

  return parts.join(' ');
}

/**
 * Calculates angle of arrowhead based on last segment direction.
 * Returns angle in degrees:
 * - 0° = pointing right
 * - 90° = pointing down
 * - 180° = pointing left
 * - -90° = pointing up
 *
 * @param points - Waypoints
 * @returns Angle in degrees
 */
export function arrowheadAngle(points: Point[]): number {
  if (points.length < 2) {
    return 0;
  }

  const last = points[points.length - 1];
  const secondLast = points[points.length - 2];
  const dx = last.x - secondLast.x;
  const dy = last.y - secondLast.y;

  const angleRad = Math.atan2(dy, dx);
  const angleDeg = (angleRad * 180) / Math.PI;

  return angleDeg;
}

/**
 * Repairs waypoints after shape movement, preserving corners when possible.
 * Uses diagram-js ManhattanLayout.repairConnection.
 *
 * Endpoints are re-docked on new shape positions, intermediate corners are preserved
 * when feasible, result remains orthogonal.
 *
 * INVARIANT: Endpoints remain on shape perimeters after operation.
 *
 * @param oldWaypoints - Previous waypoints
 * @param newSourceRect - New source shape position
 * @param newTargetRect - New target shape position
 * @param startSide - Source exit side
 * @param startT - Position on source side [0, 1]
 * @param endSide - Target entry side
 * @param endT - Position on target side [0, 1]
 * @returns Repaired waypoints with endpoints normalized
 */
export function repairWaypoints(
  oldWaypoints: Point[],
  newSourceRect: Rect,
  newTargetRect: Rect,
  startSide: Side,
  startT: number,
  endSide: Side,
  endT: number
): Point[] {
  if (oldWaypoints.length < 2) {
    // Fallback to fresh routing
    return initialWaypoints(newSourceRect, newTargetRect, startSide, startT, endSide, endT);
  }

  // Convert our Rect format to diagram-js format
  const sourceBox = {
    x: newSourceRect.left,
    y: newSourceRect.top,
    width: newSourceRect.width,
    height: newSourceRect.height
  };

  const targetBox = {
    x: newTargetRect.left,
    y: newTargetRect.top,
    width: newTargetRect.width,
    height: newTargetRect.height
  };

  // Calculate new start and end points
  const newStart = dockPoint(newSourceRect, startSide, startT);
  const newEnd = dockPoint(newTargetRect, endSide, endT);

  // Use ManhattanLayout.repairConnection to preserve corners when possible
  const repairedWaypoints = ManhattanLayout.repairConnection(
    sourceBox,
    targetBox,
    newStart,
    newEnd,
    oldWaypoints
  );

  let withEndpoints = [...repairedWaypoints];
  if (withEndpoints.length >= 2) {
    withEndpoints[0] = newStart;
    withEndpoints[withEndpoints.length - 1] = newEnd;
  }

  let result = normalizeToPerimeter(withEndpoints, newSourceRect, newTargetRect);

  for (let i = 0; i < result.length - 1; i++) {
    const dx = Math.abs(result[i + 1].x - result[i].x);
    const dy = Math.abs(result[i + 1].y - result[i].y);

    if (dx > 0.01 && dy > 0.01) {
      const corner1: Point = { x: result[i + 1].x, y: result[i].y };
      const isCorner1Inside = (
        corner1.x > newSourceRect.left + 0.5 && corner1.x < newSourceRect.left + newSourceRect.width - 0.5 &&
        corner1.y > newSourceRect.top + 0.5 && corner1.y < newSourceRect.top + newSourceRect.height - 0.5
      ) || (
        corner1.x > newTargetRect.left + 0.5 && corner1.x < newTargetRect.left + newTargetRect.width - 0.5 &&
        corner1.y > newTargetRect.top + 0.5 && corner1.y < newTargetRect.top + newTargetRect.height - 0.5
      );

      if (!isCorner1Inside) {
        result.splice(i + 1, 0, corner1);
        continue;
      }

      const corner2: Point = { x: result[i].x, y: result[i + 1].y };
      const isCorner2Inside = (
        corner2.x > newSourceRect.left + 0.5 && corner2.x < newSourceRect.left + newSourceRect.width - 0.5 &&
        corner2.y > newSourceRect.top + 0.5 && corner2.y < newSourceRect.top + newSourceRect.height - 0.5
      ) || (
        corner2.x > newTargetRect.left + 0.5 && corner2.x < newTargetRect.left + newTargetRect.width - 0.5 &&
        corner2.y > newTargetRect.top + 0.5 && corner2.y < newTargetRect.top + newTargetRect.height - 0.5
      );

      if (!isCorner2Inside) {
        result.splice(i + 1, 0, corner2);
        continue; // Check this new segment next iteration
      }

      return initialWaypoints(newSourceRect, newTargetRect, startSide, startT, endSide, endT);
    }
  }

  return result;
}

/**
 * Returns point on shape border at specified side and parameter t.
 *
 * @param rect - Shape rectangle
 * @param side - Which side
 * @param t - Parameter [0, 1] along side (0 = start corner, 1 = end corner)
 * @returns Point on border
 */
export function dockPoint(rect: Rect, side: Side, t: number): Point {
  // Clamp t to [0, 1]
  const clamped = Math.max(0, Math.min(1, t));

  switch (side) {
    case 'top':
      return {
        x: rect.left + rect.width * clamped,
        y: rect.top
      };
    case 'right':
      return {
        x: rect.left + rect.width,
        y: rect.top + rect.height * clamped
      };
    case 'bottom':
      return {
        x: rect.left + rect.width * clamped,
        y: rect.top + rect.height
      };
    case 'left':
      return {
        x: rect.left,
        y: rect.top + rect.height * clamped
      };
  }
}

/**
 * Finds nearest anchor (middle of side) within snap radius.
 * Returns { side, t: 0.5 } if within radius, null otherwise.
 *
 * @param rect - Shape rectangle
 * @param point - Pointer position
 * @param radius - Snap radius in pixels (default: 14)
 * @returns Anchor { side, t } or null
 */
export function nearestAnchorSnap(rect: Rect, point: Point, radius: number = 14): { side: Side; t: number } | null {
  const anchors: Array<{ side: Side; point: Point }> = [
    { side: 'top', point: { x: rect.left + rect.width / 2, y: rect.top } },
    { side: 'right', point: { x: rect.left + rect.width, y: rect.top + rect.height / 2 } },
    { side: 'bottom', point: { x: rect.left + rect.width / 2, y: rect.top + rect.height } },
    { side: 'left', point: { x: rect.left, y: rect.top + rect.height / 2 } }
  ];

  let nearest: { side: Side; distance: number } | null = null;

  for (const anchor of anchors) {
    const dx = point.x - anchor.point.x;
    const dy = point.y - anchor.point.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= radius) {
      if (!nearest || distance < nearest.distance) {
        nearest = { side: anchor.side, distance };
      }
    }
  }

  return nearest ? { side: nearest.side, t: 0.5 } : null;
}

/**
 * Moves a segment perpendicular to its direction.
 * Interior segment: modifies coordinates of both endpoints.
 * Segment adjacent to anchored endpoint: inserts points to create bridge.
 *
 * INVARIANT: Endpoints remain on shape perimeters after operation.
 *
 * @param points - Current waypoints
 * @param segmentIndex - Index of segment to move (0-based)
 * @param delta - Distance to move (perpendicular to segment direction)
 * @param sourceRect - Source shape rectangle (for endpoint normalization)
 * @param targetRect - Target shape rectangle (for endpoint normalization)
 * @returns New waypoints with segment moved and endpoints normalized
 */
export function moveSegment(
  points: Point[],
  segmentIndex: number,
  delta: number,
  sourceRect: Rect,
  targetRect: Rect,
  startSide?: Side,
  startT?: number,
  endSide?: Side,
  endT?: number
): { points: Point[]; startSide: Side; startT: number; endSide: Side; endT: number } {
  if (points.length < 2 || segmentIndex < 0 || segmentIndex >= points.length - 1) {
    return {
      points,
      startSide: startSide ?? 'right',
      startT: startT ?? 0.5,
      endSide: endSide ?? 'left',
      endT: endT ?? 0.5
    };
  }

  const segs = segments(points);
  if (segmentIndex >= segs.length) {
    return {
      points,
      startSide: startSide ?? 'right',
      startT: startT ?? 0.5,
      endSide: endSide ?? 'left',
      endT: endT ?? 0.5
    };
  }

  const seg = segs[segmentIndex];
  let newPoints = [...points];

  // Current sides/t with defaults
  let currentStartSide = startSide ?? 'right';
  let currentStartT = startT ?? 0.5;
  let currentEndSide = endSide ?? 'left';
  let currentEndT = endT ?? 0.5;

  const affectsStart = segmentIndex === 0;
  const affectsEnd = segmentIndex === points.length - 2;

  if (points.length === 2 && (affectsStart || affectsEnd)) {
    if (seg.orientation === 'horizontal') {
      const newY = seg.a.y + delta;
      newPoints.splice(1, 0,
        { x: seg.a.x, y: newY },
        { x: seg.b.x, y: newY }
      );
    } else {
      const newX = seg.a.x + delta;
      newPoints.splice(1, 0,
        { x: newX, y: seg.a.y },
        { x: newX, y: seg.b.y }
      );
    }
  }

  if (seg.orientation === 'horizontal') {
    const newY = seg.a.y + delta;

    if (affectsStart) {
      const direction = 'horizontal';
      const barCoord = newY;

      let defaultStartSide: Side;
      if (direction === 'horizontal') {
        defaultStartSide = 'right';
      } else {
        const neighbor = newPoints[1];
        const centerY = sourceRect.top + sourceRect.height / 2;
        defaultStartSide = neighbor.y < centerY ? 'top' : 'bottom';
      }

      const sideResult = dockSideFromBar(sourceRect, barCoord, direction, defaultStartSide, currentStartSide);
      const newStartSide = sideResult.side;

      let newStartT = currentStartT;
      if (newStartSide !== currentStartSide) {
        newStartT = recenterOnSideChange(currentStartSide, newStartSide, currentStartT);
      }

      currentStartSide = newStartSide;
      currentStartT = newStartT;
    }

    if (affectsEnd) {
      const direction = 'horizontal';
      const barCoord = newY;

      let defaultEndSide: Side;
      if (direction === 'horizontal') {
        defaultEndSide = 'left';
      } else {
        const neighbor = newPoints[newPoints.length - 2];
        const centerY = targetRect.top + targetRect.height / 2;
        defaultEndSide = neighbor.y < centerY ? 'top' : 'bottom';
      }

      const sideResult = dockSideFromBar(targetRect, barCoord, direction, defaultEndSide, currentEndSide);
      const newEndSide = sideResult.side;

      let newEndT = currentEndT;
      if (newEndSide !== currentEndSide) {
        newEndT = recenterOnSideChange(currentEndSide, newEndSide, currentEndT);
      }

      currentEndSide = newEndSide;
      currentEndT = newEndT;
    }

    if (!affectsStart && !affectsEnd) {
      newPoints[segmentIndex] = { x: seg.a.x, y: newY };
      newPoints[segmentIndex + 1] = { x: seg.b.x, y: newY };
    }
  } else {
    const newX = seg.a.x + delta;

    if (affectsStart) {
      const direction = 'vertical';
      const barCoord = newX;

      const neighbor = newPoints[1];
      const centerY = sourceRect.top + sourceRect.height / 2;
      const defaultStartSide: Side = neighbor.y < centerY ? 'top' : 'bottom';

      const sideResult = dockSideFromBar(sourceRect, barCoord, direction, defaultStartSide, currentStartSide);
      const newStartSide = sideResult.side;

      let newStartT = currentStartT;
      if (newStartSide !== currentStartSide) {
        newStartT = recenterOnSideChange(currentStartSide, newStartSide, currentStartT);
      }

      currentStartSide = newStartSide;
      currentStartT = newStartT;
    }

    if (affectsEnd) {
      const direction = 'vertical';
      const barCoord = newX;

      const neighbor = newPoints[newPoints.length - 2];
      const centerY = targetRect.top + targetRect.height / 2;
      const defaultEndSide: Side = neighbor.y < centerY ? 'top' : 'bottom';

      const sideResult = dockSideFromBar(targetRect, barCoord, direction, defaultEndSide, currentEndSide);
      const newEndSide = sideResult.side;

      let newEndT = currentEndT;
      if (newEndSide !== currentEndSide) {
        newEndT = recenterOnSideChange(currentEndSide, newEndSide, currentEndT);
      }

      currentEndSide = newEndSide;
      currentEndT = newEndT;
    }

    if (!affectsStart && !affectsEnd) {
      newPoints[segmentIndex] = { x: newX, y: seg.a.y };
      newPoints[segmentIndex + 1] = { x: newX, y: seg.b.y };
    }
  }

  const sidesChanged = (currentStartSide !== startSide) || (currentEndSide !== endSide);

  let finalPoints: Point[];
  if (sidesChanged) {
    finalPoints = initialWaypoints(sourceRect, targetRect, currentStartSide, currentStartT, currentEndSide, currentEndT);
  } else {
    finalPoints = normalizeToPerimeter(cleanWaypoints(newPoints), sourceRect, targetRect,
                                       currentStartSide, currentStartT, currentEndSide, currentEndT);
  }

  return {
    points: finalPoints,
    startSide: currentStartSide,
    startT: currentStartT,
    endSide: currentEndSide,
    endT: currentEndT
  };
}

/**
 * Moves a waypoint (corner) to a new position.
 * Adjusts neighbors to maintain orthogonality:
 * - Horizontal neighbor takes new Y
 * - Vertical neighbor takes new X
 * If neighbor is an anchored endpoint, inserts new corner instead of moving it.
 *
 * INVARIANT: Endpoints remain on shape perimeters after operation.
 *
 * @param points - Current waypoints
 * @param index - Index of waypoint to move (not endpoint)
 * @param newPoint - New position
 * @param sourceRect - Source shape rectangle (for endpoint normalization)
 * @param targetRect - Target shape rectangle (for endpoint normalization)
 * @returns New waypoints with corner moved and endpoints normalized
 */
export function moveWaypoint(
  points: Point[],
  index: number,
  newPoint: Point,
  sourceRect: Rect,
  targetRect: Rect,
  startSide: Side,
  startT: number,
  endSide: Side,
  endT: number
): { points: Point[]; startSide: Side; startT: number; endSide: Side; endT: number } {
  if (points.length < 3 || index <= 0 || index >= points.length - 1) {
    return { points, startSide, startT, endSide, endT };
  }

  const currentPoint = points[index];
  const dx = newPoint.x - currentPoint.x;
  const dy = newPoint.y - currentPoint.y;


  let result = { points: [...points], startSide, startT, endSide, endT };

  const segBefore = points[index - 1];
  const dxBefore = Math.abs(currentPoint.x - segBefore.x);
  const dyBefore = Math.abs(currentPoint.y - segBefore.y);
  const isHorizontalBefore = dxBefore > dyBefore;

  if (isHorizontalBefore) {
    if (Math.abs(dy) > 0.01) {
      result = moveSegment(result.points, index - 1, dy, sourceRect, targetRect, result.startSide, result.startT, result.endSide, result.endT);
    }
  } else {
    if (Math.abs(dx) > 0.01) {
      result = moveSegment(result.points, index - 1, dx, sourceRect, targetRect, result.startSide, result.startT, result.endSide, result.endT);
    }
  }

  let newIndex = -1;
  let minDist = Number.MAX_VALUE;
  for (let i = 1; i < result.points.length - 1; i++) {
    const p = result.points[i];
    const dist = Math.abs(p.x - (currentPoint.x + (isHorizontalBefore ? 0 : dx))) +
                 Math.abs(p.y - (currentPoint.y + (isHorizontalBefore ? dy : 0)));
    if (dist < minDist) {
      minDist = dist;
      newIndex = i;
    }
  }
  if (newIndex < 0) newIndex = Math.min(index, result.points.length - 2);

  if (newIndex + 1 < result.points.length) {
    const segAfter = result.points[newIndex + 1];
    const currentAfter = result.points[newIndex];
    const dxAfter = Math.abs(segAfter.x - currentAfter.x);
    const dyAfter = Math.abs(segAfter.y - currentAfter.y);
    const isHorizontalAfter = dxAfter > dyAfter;

    if (isHorizontalAfter) {
      if (Math.abs(dy) > 0.01) {
        result = moveSegment(result.points, newIndex, dy, sourceRect, targetRect, result.startSide, result.startT, result.endSide, result.endT);
      }
    } else {
      if (Math.abs(dx) > 0.01) {
        result = moveSegment(result.points, newIndex, dx, sourceRect, targetRect, result.startSide, result.startT, result.endSide, result.endT);
      }
    }
  }

  return result;
}

/**
 * Moves endpoint along shape perimeter with optional anchor snapping.
 * Returns new docking { side, t } and updated waypoints.
 * Preserves intermediate corners when possible (uses repairWaypoints).
 *
 * INVARIANT: Endpoints remain on shape perimeters after operation.
 *
 * @param points - Current waypoints
 * @param whichEnd - Which endpoint to move ('start' or 'end')
 * @param sourceRect - Source shape rectangle
 * @param targetRect - Target shape rectangle
 * @param pointerPoint - Pointer position
 * @returns { side, t, points } - New docking parameters and normalized waypoints
 */
export function moveDock(
  points: Point[],
  whichEnd: 'start' | 'end',
  sourceRect: Rect,
  targetRect: Rect,
  pointerPoint: Point,
  startSide: Side,
  startT: number,
  endSide: Side,
  endT: number
): { startSide: Side; startT: number; endSide: Side; endT: number; points: Point[] } {
  // Determine which rect we're working with
  const movingRect = whichEnd === 'start' ? sourceRect : targetRect;
  const otherRect = whichEnd === 'start' ? targetRect : sourceRect;

  // First, try to snap to nearest anchor
  const anchorSnap = nearestAnchorSnap(movingRect, pointerPoint, 14);

  if (anchorSnap) {
    // Snapped to anchor
    const newDockPoint = dockPoint(movingRect, anchorSnap.side, anchorSnap.t);

    // Use repairWaypoints to update path, preserving the other endpoint's side/t
    let newPoints: Point[];
    let newStartSide: Side;
    let newStartT: number;
    let newEndSide: Side;
    let newEndT: number;

    if (whichEnd === 'start') {
      // Moving start endpoint, preserve end
      newStartSide = anchorSnap.side;
      newStartT = anchorSnap.t;
      newEndSide = endSide;
      newEndT = endT;
      newPoints = repairWaypoints(points, sourceRect, targetRect, newStartSide, newStartT, newEndSide, newEndT);
    } else {
      // Moving end endpoint, preserve start
      newStartSide = startSide;
      newStartT = startT;
      newEndSide = anchorSnap.side;
      newEndT = anchorSnap.t;
      newPoints = repairWaypoints(points, sourceRect, targetRect, newStartSide, newStartT, newEndSide, newEndT);
    }

    // Call normalizeToPerimeter then ensure orthogonality
    let finalPoints = normalizeToPerimeter(newPoints, sourceRect, targetRect);
    for (let i = 0; i < finalPoints.length - 1; i++) {
      const dx = Math.abs(finalPoints[i + 1].x - finalPoints[i].x);
      const dy = Math.abs(finalPoints[i + 1].y - finalPoints[i].y);
      if (dx > 0.01 && dy > 0.01) {
        const corner1: Point = { x: finalPoints[i + 1].x, y: finalPoints[i].y };
        const isCorner1Inside = (
          corner1.x > sourceRect.left + 0.5 && corner1.x < sourceRect.left + sourceRect.width - 0.5 &&
          corner1.y > sourceRect.top + 0.5 && corner1.y < sourceRect.top + sourceRect.height - 0.5
        ) || (
          corner1.x > targetRect.left + 0.5 && corner1.x < targetRect.left + targetRect.width - 0.5 &&
          corner1.y > targetRect.top + 0.5 && corner1.y < targetRect.top + targetRect.height - 0.5
        );
        if (!isCorner1Inside) {
          finalPoints.splice(i + 1, 0, corner1);
          continue;
        }
        const corner2: Point = { x: finalPoints[i].x, y: finalPoints[i + 1].y };
        const isCorner2Inside = (
          corner2.x > sourceRect.left + 0.5 && corner2.x < sourceRect.left + sourceRect.width - 0.5 &&
          corner2.y > sourceRect.top + 0.5 && corner2.y < sourceRect.top + sourceRect.height - 0.5
        ) || (
          corner2.x > targetRect.left + 0.5 && corner2.x < targetRect.left + targetRect.width - 0.5 &&
          corner2.y > targetRect.top + 0.5 && corner2.y < targetRect.top + targetRect.height - 0.5
        );
        if (!isCorner2Inside) {
          finalPoints.splice(i + 1, 0, corner2);
          continue;
        }
        // Both corners inside - use initialWaypoints
        finalPoints = initialWaypoints(sourceRect, targetRect, newStartSide, newStartT, newEndSide, newEndT);
        break;
      }
    }

    return {
      startSide: newStartSide,
      startT: newStartT,
      endSide: newEndSide,
      endT: newEndT,
      points: finalPoints
    };
  }

  // No snap: find nearest perimeter point
  const nearest = findNearestPerimeterPoint(movingRect, pointerPoint);
  const newDockPoint = dockPoint(movingRect, nearest.side, nearest.t);

  // Use repairWaypoints, preserving the other endpoint's side/t
  let newPoints: Point[];
  let newStartSide: Side;
  let newStartT: number;
  let newEndSide: Side;
  let newEndT: number;

  if (whichEnd === 'start') {
    // Moving start endpoint, preserve end
    newStartSide = nearest.side;
    newStartT = nearest.t;
    newEndSide = endSide;
    newEndT = endT;
    newPoints = repairWaypoints(points, sourceRect, targetRect, newStartSide, newStartT, newEndSide, newEndT);
  } else {
    // Moving end endpoint, preserve start
    newStartSide = startSide;
    newStartT = startT;
    newEndSide = nearest.side;
    newEndT = nearest.t;
    newPoints = repairWaypoints(points, sourceRect, targetRect, newStartSide, newStartT, newEndSide, newEndT);
  }

  // Call normalizeToPerimeter then ensure orthogonality
  let finalPoints = normalizeToPerimeter(newPoints, sourceRect, targetRect);
  for (let i = 0; i < finalPoints.length - 1; i++) {
    const dx = Math.abs(finalPoints[i + 1].x - finalPoints[i].x);
    const dy = Math.abs(finalPoints[i + 1].y - finalPoints[i].y);
    if (dx > 0.01 && dy > 0.01) {
      const corner1: Point = { x: finalPoints[i + 1].x, y: finalPoints[i].y };
      const isCorner1Inside = (
        corner1.x > sourceRect.left + 0.5 && corner1.x < sourceRect.left + sourceRect.width - 0.5 &&
        corner1.y > sourceRect.top + 0.5 && corner1.y < sourceRect.top + sourceRect.height - 0.5
      ) || (
        corner1.x > targetRect.left + 0.5 && corner1.x < targetRect.left + targetRect.width - 0.5 &&
        corner1.y > targetRect.top + 0.5 && corner1.y < targetRect.top + targetRect.height - 0.5
      );
      if (!isCorner1Inside) {
        finalPoints.splice(i + 1, 0, corner1);
        continue;
      }
      const corner2: Point = { x: finalPoints[i].x, y: finalPoints[i + 1].y };
      const isCorner2Inside = (
        corner2.x > sourceRect.left + 0.5 && corner2.x < sourceRect.left + sourceRect.width - 0.5 &&
        corner2.y > sourceRect.top + 0.5 && corner2.y < sourceRect.top + sourceRect.height - 0.5
      ) || (
        corner2.x > targetRect.left + 0.5 && corner2.x < targetRect.left + targetRect.width - 0.5 &&
        corner2.y > targetRect.top + 0.5 && corner2.y < targetRect.top + targetRect.height - 0.5
      );
      if (!isCorner2Inside) {
        finalPoints.splice(i + 1, 0, corner2);
        continue;
      }
      // Both corners inside - use initialWaypoints
      finalPoints = initialWaypoints(sourceRect, targetRect, newStartSide, newStartT, newEndSide, newEndT);
      break;
    }
  }

  return {
    startSide: newStartSide,
    startT: newStartT,
    endSide: newEndSide,
    endT: newEndT,
    points: finalPoints
  };
}

/**
 * Finds nearest perimeter point on rect to given point.
 * Returns { side, t } with t clamped to [0.1, 0.9].
 */
function findNearestPerimeterPoint(rect: Rect, point: Point): { side: Side; t: number } {
  const sides: Side[] = ['top', 'right', 'bottom', 'left'];
  let nearest: { side: Side; t: number; distance: number } | null = null;

  for (const side of sides) {
    // Find closest point on this side
    let closestT: number;
    let closestPoint: Point;

    switch (side) {
      case 'top':
        closestT = (point.x - rect.left) / rect.width;
        closestPoint = { x: rect.left + closestT * rect.width, y: rect.top };
        break;
      case 'right':
        closestT = (point.y - rect.top) / rect.height;
        closestPoint = { x: rect.left + rect.width, y: rect.top + closestT * rect.height };
        break;
      case 'bottom':
        closestT = (point.x - rect.left) / rect.width;
        closestPoint = { x: rect.left + closestT * rect.width, y: rect.top + rect.height };
        break;
      case 'left':
        closestT = (point.y - rect.top) / rect.height;
        closestPoint = { x: rect.left, y: rect.top + closestT * rect.height };
        break;
    }

    // Clamp t to [0.1, 0.9]
    closestT = Math.max(0.1, Math.min(0.9, closestT));
    closestPoint = dockPoint(rect, side, closestT);

    const dx = point.x - closestPoint.x;
    const dy = point.y - closestPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (!nearest || distance < nearest.distance) {
      nearest = { side, t: closestT, distance };
    }
  }

  return { side: nearest!.side, t: nearest!.t };
}

/**
 * Finds which side of rect a point is nearest to.
 */
function findNearestSide(rect: Rect, point: Point): Side {
  const distances = {
    top: Math.abs(point.y - rect.top),
    right: Math.abs(point.x - (rect.left + rect.width)),
    bottom: Math.abs(point.y - (rect.top + rect.height)),
    left: Math.abs(point.x - rect.left)
  };

  let minSide: Side = 'top';
  let minDist = distances.top;

  for (const side of ['right', 'bottom', 'left'] as Side[]) {
    if (distances[side] < minDist) {
      minDist = distances[side];
      minSide = side;
    }
  }

  return minSide;
}

/**
 * Extracts dock sides and parameters from normalized waypoints.
 * Analyzes the position of the first and last waypoints to determine
 * which side they're on and their parameter t along that side.
 *
 * @param points - Normalized waypoints (endpoints must be on perimeters)
 * @param sourceRect - Source shape rectangle
 * @param targetRect - Target shape rectangle
 * @returns { startSide, startT, endSide, endT }
 */
export function extractDockSides(
  points: Point[],
  sourceRect: Rect,
  targetRect: Rect
): { startSide: Side; startT: number; endSide: Side; endT: number } {
  if (points.length < 2) {
    return { startSide: 'right', startT: 0.5, endSide: 'left', endT: 0.5 };
  }

  const first = points[0];
  const last = points[points.length - 1];

  // Determine start side
  const TOLERANCE = 1;
  let startSide: Side = 'right';
  let startT = 0.5;

  if (Math.abs(first.y - sourceRect.top) < TOLERANCE) {
    startSide = 'top';
    startT = (first.x - sourceRect.left) / sourceRect.width;
  } else if (Math.abs(first.y - (sourceRect.top + sourceRect.height)) < TOLERANCE) {
    startSide = 'bottom';
    startT = (first.x - sourceRect.left) / sourceRect.width;
  } else if (Math.abs(first.x - sourceRect.left) < TOLERANCE) {
    startSide = 'left';
    startT = (first.y - sourceRect.top) / sourceRect.height;
  } else if (Math.abs(first.x - (sourceRect.left + sourceRect.width)) < TOLERANCE) {
    startSide = 'right';
    startT = (first.y - sourceRect.top) / sourceRect.height;
  }

  // Clamp startT
  startT = Math.max(0, Math.min(1, startT));

  // Determine end side
  let endSide: Side = 'left';
  let endT = 0.5;

  if (Math.abs(last.y - targetRect.top) < TOLERANCE) {
    endSide = 'top';
    endT = (last.x - targetRect.left) / targetRect.width;
  } else if (Math.abs(last.y - (targetRect.top + targetRect.height)) < TOLERANCE) {
    endSide = 'bottom';
    endT = (last.x - targetRect.left) / targetRect.width;
  } else if (Math.abs(last.x - targetRect.left) < TOLERANCE) {
    endSide = 'left';
    endT = (last.y - targetRect.top) / targetRect.height;
  } else if (Math.abs(last.x - (targetRect.left + targetRect.width)) < TOLERANCE) {
    endSide = 'right';
    endT = (last.y - targetRect.top) / targetRect.height;
  }

  // Clamp endT
  endT = Math.max(0, Math.min(1, endT));

  return { startSide, startT, endSide, endT };
}

/**
 * Determines the dock side based on the position of a bar (horizontal or vertical segment)
 * relative to a shape rectangle. Used for automatic side switching when dragging the middle bar.
 *
 * RULES (with MARGIN = 12px):
 * - For horizontal bar (direction='horizontal'):
 *   - barCoord (y) < rect.top - MARGIN        → 'top'
 *   - barCoord (y) > rect.bottom + MARGIN     → 'bottom'
 *   - Otherwise (bar in vertical band)        → previousSide (default)
 * - For vertical bar (direction='vertical'):
 *   - barCoord (x) < rect.left - MARGIN       → 'left'
 *   - barCoord (x) > rect.right + MARGIN      → 'right'
 *   - Otherwise (bar in horizontal band)      → previousSide (default)
 *
 * Hysteresis: When bar crosses a threshold, it must move hysteresisMargin pixels
 * beyond the threshold before the side changes. This prevents flickering when the
 * bar oscillates around the threshold.
 *
 * @param rect - Shape rectangle
 * @param barCoord - The coordinate of the bar (y for horizontal, x for vertical)
 * @param direction - 'horizontal' or 'vertical'
 * @param previousSide - Previous dock side (default for in-band, and for hysteresis)
 * @param hysteresisMargin - Additional margin for hysteresis (default: 4px)
 * @returns { side } - The determined dock side
 */
export function dockSideFromBar(
  rect: Rect,
  barCoord: number,
  direction: 'horizontal' | 'vertical',
  defaultSide: Side,
  previousSide?: Side,
  hysteresisMargin: number = 4
): { side: Side } {
  const MARGIN = 12;
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  const currentSide = previousSide ?? defaultSide;

  if (direction === 'horizontal') {
    // Horizontal bar: check y coordinate
    const topThreshold = rect.top - MARGIN;
    const bottomThreshold = bottom + MARGIN;

    // Entry thresholds (without hysteresis)
    if (barCoord < topThreshold) {
      return { side: 'top' };
    }
    if (barCoord > bottomThreshold) {
      return { side: 'bottom' };
    }

    // Hysteresis zones: stay on edge side if within hysteresis margin
    if (currentSide === 'top' && barCoord < topThreshold + hysteresisMargin) {
      return { side: 'top' };
    }
    if (currentSide === 'bottom' && barCoord > bottomThreshold - hysteresisMargin) {
      return { side: 'bottom' };
    }

    // In middle band: preserve currentSide if it's left/right, else use defaultSide
    if (currentSide === 'left' || currentSide === 'right') {
      return { side: currentSide };
    }
    return { side: defaultSide };
  } else {
    // Vertical bar: check x coordinate
    const leftThreshold = rect.left - MARGIN;
    const rightThreshold = right + MARGIN;

    // Entry thresholds (without hysteresis)
    if (barCoord < leftThreshold) {
      return { side: 'left' };
    }
    if (barCoord > rightThreshold) {
      return { side: 'right' };
    }

    // Hysteresis zones: stay on edge side if within hysteresis margin
    if (currentSide === 'left' && barCoord < leftThreshold + hysteresisMargin) {
      return { side: 'left' };
    }
    if (currentSide === 'right' && barCoord > rightThreshold - hysteresisMargin) {
      return { side: 'right' };
    }

    // In middle band: preserve currentSide if it's top/bottom, else use defaultSide
    if (currentSide === 'top' || currentSide === 'bottom') {
      return { side: currentSide };
    }
    return { side: defaultSide };
  }
}

/**
 * Determines the new t (parameter along side) when the dock side changes.
 *
 * RULE:
 * - If prevSide === newSide: return prevT (preserve custom position)
 * - If prevSide !== newSide: return 0.5 (recenter to middle of new side)
 *
 * This ensures that:
 * - User's manual adjustments are preserved when the side doesn't change
 * - Endpoints are centered when the side changes automatically
 *
 * @param prevSide - Previous dock side
 * @param newSide - New dock side
 * @param prevT - Previous t parameter [0, 1]
 * @returns New t parameter [0, 1]
 */
export function recenterOnSideChange(
  prevSide: Side,
  newSide: Side,
  prevT: number
): number {
  if (prevSide === newSide) {
    return prevT; // Side didn't change: preserve t
  }
  return 0.5; // Side changed: recenter to middle
}

/**
 * Determines the dock side based on the position of the neighbor point relative to the rect.
 * Pushes neighbor away from rect if it's too close (< 12px).
 * Uses hysteresis: when distances are equal, preserves previousSide.
 *
 * RULES:
 * - neighbor.y < rect.top - 12    → 'top'
 * - neighbor.y > rect.bottom + 12 → 'bottom'
 * - neighbor.x < rect.left - 12   → 'left'
 * - neighbor.x > rect.right + 12  → 'right'
 * - If neighbor is within 12px margin or inside: push it out by 12px on the nearest side
 *   (use previousSide for hysteresis when distances are equal)
 *
 * @param rect - Shape rectangle
 * @param neighbor - The neighboring waypoint (first corner for start, last corner for end)
 * @param previousSide - Previous dock side (for hysteresis)
 * @returns { side, neighborAdjusted } - The dock side and potentially adjusted neighbor position
 */
export function dockSideFromNeighbor(
  rect: Rect,
  neighbor: Point,
  previousSide: Side = 'right'
): { side: Side; neighborAdjusted: Point } {
  const MARGIN = 12;
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;

  // Calculate distances to each side
  const distToTop = neighbor.y - (rect.top - MARGIN);
  const distToBottom = (bottom + MARGIN) - neighbor.y;
  const distToLeft = neighbor.x - (rect.left - MARGIN);
  const distToRight = (right + MARGIN) - neighbor.x;

  // Determine if neighbor is outside the margin zone on each side
  const aboveMargin = neighbor.y < rect.top - MARGIN;
  const belowMargin = neighbor.y > bottom + MARGIN;
  const leftOfMargin = neighbor.x < rect.left - MARGIN;
  const rightOfMargin = neighbor.x > right + MARGIN;

  // Case 1: Neighbor is clearly outside margin zone
  if (aboveMargin) {
    return { side: 'top', neighborAdjusted: neighbor };
  }
  if (belowMargin) {
    return { side: 'bottom', neighborAdjusted: neighbor };
  }
  if (leftOfMargin) {
    return { side: 'left', neighborAdjusted: neighbor };
  }
  if (rightOfMargin) {
    return { side: 'right', neighborAdjusted: neighbor };
  }

  // Case 2: Neighbor is inside margin zone or inside rect - need to push it out
  // Find the nearest side to push neighbor to
  const distances = [
    { side: 'top' as Side, distance: Math.abs(neighbor.y - rect.top) },
    { side: 'bottom' as Side, distance: Math.abs(neighbor.y - bottom) },
    { side: 'left' as Side, distance: Math.abs(neighbor.x - rect.left) },
    { side: 'right' as Side, distance: Math.abs(neighbor.x - right) }
  ];

  // Sort by distance
  distances.sort((a, b) => a.distance - b.distance);

  // Use hysteresis: if distances are equal within tolerance, prefer previousSide
  const minDist = distances[0].distance;
  const TOLERANCE = 0.5;
  const equalSides = distances.filter(d => Math.abs(d.distance - minDist) < TOLERANCE);

  let chosenSide: Side;
  if (equalSides.length > 1 && equalSides.some(d => d.side === previousSide)) {
    chosenSide = previousSide;
  } else {
    chosenSide = distances[0].side;
  }

  // Push neighbor out by MARGIN from the chosen side
  let adjustedNeighbor: Point;
  switch (chosenSide) {
    case 'top':
      adjustedNeighbor = { x: neighbor.x, y: rect.top - MARGIN };
      break;
    case 'bottom':
      adjustedNeighbor = { x: neighbor.x, y: bottom + MARGIN };
      break;
    case 'left':
      adjustedNeighbor = { x: rect.left - MARGIN, y: neighbor.y };
      break;
    case 'right':
      adjustedNeighbor = { x: right + MARGIN, y: neighbor.y };
      break;
  }

  return { side: chosenSide, neighborAdjusted: adjustedNeighbor };
}

/**
 * Chooses bar position when dragging a segment between two shapes.
 * If the bar would be inside either shape, pushes it outside both shapes
 * on the side closest to the pointer.
 *
 * Returns a position OUTSIDE the margin zones (≤ top-24 or ≥ bottom+24)
 * so that dockSideFromBar will return top/bottom (not in-band).
 *
 * @param sourceRect - Source shape rectangle
 * @param targetRect - Target shape rectangle
 * @param barCoord - The coordinate of the bar (y for horizontal bar, x for vertical bar)
 * @param orientation - 'horizontal' or 'vertical'
 * @returns Adjusted bar coordinate outside both shapes and their margin zones
 */
export function chooseBarPosition(
  sourceRect: Rect,
  targetRect: Rect,
  barCoord: number,
  orientation: 'horizontal' | 'vertical'
): number {
  const MARGIN = 12;
  const OUTER_MARGIN = 24; // 2 * MARGIN to be clearly outside both shapes

  if (orientation === 'horizontal') {
    // Bar is horizontal: check if barCoord (y) intersects either shape
    const sourceBottom = sourceRect.top + sourceRect.height;
    const targetBottom = targetRect.top + targetRect.height;

    const sourceRange = { min: sourceRect.top, max: sourceBottom };
    const targetRange = { min: targetRect.top, max: targetBottom };

    // Find the overall range covered by both shapes
    const minTop = Math.min(sourceRange.min, targetRange.min);
    const maxBottom = Math.max(sourceRange.max, targetRange.max);

    // If bar is outside both shapes, return as-is
    if (barCoord < minTop || barCoord > maxBottom) {
      return barCoord;
    }

    // Bar is inside or intersects one/both shapes
    // Choose to place it above or below based on proximity
    // Place OUTER_MARGIN away to ensure dockSideFromBar sees it as top/bottom
    const distAbove = Math.abs(barCoord - minTop);
    const distBelow = Math.abs(barCoord - maxBottom);

    if (distAbove <= distBelow) {
      return minTop - OUTER_MARGIN; // Place above, outside margin zone
    } else {
      return maxBottom + OUTER_MARGIN; // Place below, outside margin zone
    }
  } else {
    // Bar is vertical: check if barCoord (x) intersects either shape
    const sourceRight = sourceRect.left + sourceRect.width;
    const targetRight = targetRect.left + targetRect.width;

    const sourceRange = { min: sourceRect.left, max: sourceRight };
    const targetRange = { min: targetRect.left, max: targetRight };

    const minLeft = Math.min(sourceRange.min, targetRange.min);
    const maxRight = Math.max(sourceRange.max, targetRange.max);

    if (barCoord < minLeft || barCoord > maxRight) {
      return barCoord;
    }

    const distLeft = Math.abs(barCoord - minLeft);
    const distRight = Math.abs(barCoord - maxRight);

    if (distLeft <= distRight) {
      return minLeft - OUTER_MARGIN; // Place left, outside margin zone
    } else {
      return maxRight + OUTER_MARGIN; // Place right, outside margin zone
    }
  }
}
