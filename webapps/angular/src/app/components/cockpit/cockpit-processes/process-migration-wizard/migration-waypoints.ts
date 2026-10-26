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
  // Convert our Rect format to diagram-js format
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

  // Use ManhattanLayout.connectRectangles for production-quality orthogonal routing
  const waypoints = ManhattanLayout.connectRectangles(sourceBox, targetBox);

  // Clean and normalize endpoints
  return normalizeToPerimeter(cleanWaypoints(waypoints), sourceRect, targetRect);
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

  // Step 2: Remove collinear points (3+ points on same line)
  const noCollinear: Point[] = [noDuplicates[0]];
  for (let i = 1; i < noDuplicates.length - 1; i++) {
    const prev = noDuplicates[i - 1];
    const curr = noDuplicates[i];
    const next = noDuplicates[i + 1];

    // Check if curr is collinear with prev and next
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    // Cross product = 0 means collinear
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
export function normalizeToPerimeter(points: Point[], sourceRect: Rect, targetRect: Rect): Point[] {
  if (points.length < 2) {
    return points;
  }

  let result = [...points];

  // Helper: check if point is inside rect (not on perimeter)
  const isInside = (p: Point, rect: Rect): boolean => {
    const EPSILON = 0.5;
    return (
      p.x > rect.left + EPSILON &&
      p.x < rect.left + rect.width - EPSILON &&
      p.y > rect.top + EPSILON &&
      p.y < rect.top + rect.height - EPSILON
    );
  };

  // Helper: check if point is on perimeter (within tolerance)
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

  // Helper: find nearest perimeter point
  const nearestPerimeterPoint = (p: Point, rect: Rect): Point => {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = p.x - cx;
    const dy = p.y - cy;

    // Determine which side is closest
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

    // Clamp to valid range
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

  // STEP 1: Remove interior points adjacent to start
  while (result.length > 2 && isInside(result[1], sourceRect)) {
    result.splice(1, 1);
  }

  // STEP 2: Remove interior points adjacent to end
  while (result.length > 2 && isInside(result[result.length - 2], targetRect)) {
    result.splice(result.length - 2, 1);
  }

  if (result.length < 2) {
    // Degenerate case: recreate simple connection
    return initialWaypoints(sourceRect, targetRect);
  }

  // STEP 3: Normalize start point
  const first = result[0];
  const second = result[1];

  if (!isOnPerimeter(first, sourceRect)) {
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
  }

  // STEP 4: Normalize end point
  const last = result[result.length - 1];
  const secondLast = result[result.length - 2];

  if (!isOnPerimeter(last, targetRect)) {
    const dx = Math.abs(last.x - secondLast.x);
    const dy = Math.abs(last.y - secondLast.y);
    const isVertical = dy > dx;

    if (isVertical) {
      // Vertical segment: intersect line x = last.x with top/bottom edge
      const x = last.x;
      const inXRange = x >= targetRect.left && x <= targetRect.left + targetRect.width;

      if (inXRange) {
        // Choose top or bottom based on direction of arrival
        // If segment descends (last.y > secondLast.y), it enters from TOP
        // If segment ascends (last.y < secondLast.y), it enters from BOTTOM
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
        // If segment goes right (last.x > secondLast.x), it enters from LEFT
        // If segment goes left (last.x < secondLast.x), it enters from RIGHT
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
  }

  // STEP 5: Remove any points that ended up inside shapes
  result = result.filter((p, i) => {
    if (i === 0 || i === result.length - 1) return true; // Keep endpoints
    return !isInside(p, sourceRect) && !isInside(p, targetRect);
  });

  // STEP 6: Clean waypoints
  return cleanWaypoints(result);
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

  const cleaned = cleanWaypoints(repairedWaypoints);

  // Adjust endpoints to be exactly on shape borders while preserving orthogonality
  if (cleaned.length >= 2) {
    // Adjust start point
    cleaned[0] = newStart;
    if (cleaned.length > 1) {
      const secondPoint = cleaned[1];
      const dx = Math.abs(secondPoint.x - newStart.x);
      const dy = Math.abs(secondPoint.y - newStart.y);
      // Snap to make first segment orthogonal
      if (dx < dy) {
        // Vertical segment: align X
        cleaned[1] = { x: newStart.x, y: secondPoint.y };
      } else {
        // Horizontal segment: align Y
        cleaned[1] = { x: secondPoint.x, y: newStart.y };
      }
    }

    // Adjust end point
    cleaned[cleaned.length - 1] = newEnd;
    if (cleaned.length > 1) {
      const secondLastPoint = cleaned[cleaned.length - 2];
      const dx = Math.abs(newEnd.x - secondLastPoint.x);
      const dy = Math.abs(newEnd.y - secondLastPoint.y);
      // Snap to make last segment orthogonal
      if (dx < dy) {
        // Vertical segment: align X
        cleaned[cleaned.length - 2] = { x: newEnd.x, y: secondLastPoint.y };
      } else {
        // Horizontal segment: align Y
        cleaned[cleaned.length - 2] = { x: secondLastPoint.x, y: newEnd.y };
      }
    }
  }

  return cleanWaypoints(cleaned);
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
export function moveSegment(points: Point[], segmentIndex: number, delta: number, sourceRect: Rect, targetRect: Rect): Point[] {
  if (points.length < 2 || segmentIndex < 0 || segmentIndex >= points.length - 1) {
    return points;
  }

  const segs = segments(points);
  if (segmentIndex >= segs.length) {
    return points;
  }

  const seg = segs[segmentIndex];
  const newPoints = [...points];

  // Determine if this is an endpoint segment (first or last) AND it's a simple 2-point path
  const isFirstSegment = segmentIndex === 0 && points.length === 2;
  const isLastSegment = segmentIndex === points.length - 2 && points.length === 2;

  if (isFirstSegment || isLastSegment) {
    // Endpoint segment on simple 2-point path: create bridge (U-shape) to keep endpoint anchored
    // Strategy: insert two points to form perpendicular offset

    if (seg.orientation === 'horizontal') {
      // Horizontal segment: move perpendicular = change Y
      const newY = seg.a.y + delta;

      // Insert bridge at start: [a, corner1, corner2, b]
      newPoints.splice(1, 0,
        { x: seg.a.x, y: newY },
        { x: seg.b.x, y: newY }
      );
    } else {
      // Vertical segment: move perpendicular = change X
      const newX = seg.a.x + delta;

      newPoints.splice(1, 0,
        { x: newX, y: seg.a.y },
        { x: newX, y: seg.b.y }
      );
    }
  } else {
    // Interior segment OR multi-segment path: simply move both endpoints
    if (seg.orientation === 'horizontal') {
      // Move vertically
      newPoints[segmentIndex] = { x: seg.a.x, y: seg.a.y + delta };
      newPoints[segmentIndex + 1] = { x: seg.b.x, y: seg.b.y + delta };
    } else {
      // Move horizontally
      newPoints[segmentIndex] = { x: seg.a.x + delta, y: seg.a.y };
      newPoints[segmentIndex + 1] = { x: seg.b.x + delta, y: seg.b.y };
    }
  }

  return normalizeToPerimeter(cleanWaypoints(newPoints), sourceRect, targetRect);
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
export function moveWaypoint(points: Point[], index: number, newPoint: Point, sourceRect: Rect, targetRect: Rect): Point[] {
  if (points.length < 3 || index <= 0 || index >= points.length - 1) {
    return points;
  }

  const newPoints = [...points];

  // Move the corner
  newPoints[index] = newPoint;

  // Adjust neighbors to maintain orthogonality
  // Previous point (index - 1)
  if (index === 1) {
    // Previous is endpoint - insert new corner instead of moving it
    const prev = newPoints[0];
    const dx = Math.abs(newPoint.x - prev.x);
    const dy = Math.abs(newPoint.y - prev.y);

    if (dx > dy) {
      // Segment is more horizontal: insert corner that aligns Y with newPoint
      newPoints.splice(1, 0, { x: prev.x, y: newPoint.y });
    } else {
      // Segment is more vertical: insert corner that aligns X with newPoint
      newPoints.splice(1, 0, { x: newPoint.x, y: prev.y });
    }
  } else {
    // Previous is not endpoint - can move it
    const prev = newPoints[index - 1];
    const dx = Math.abs(newPoint.x - prev.x);
    const dy = Math.abs(newPoint.y - prev.y);

    if (dx > dy) {
      // Segment is more horizontal: align Y
      newPoints[index - 1] = { x: prev.x, y: newPoint.y };
    } else {
      // Segment is more vertical: align X
      newPoints[index - 1] = { x: newPoint.x, y: prev.y };
    }
  }

  // Next point (index + 1) - need to adjust index if we inserted
  const actualNextIndex = index === 1 ? index + 2 : index + 1;
  if (actualNextIndex === newPoints.length - 1) {
    // Next is endpoint - insert new corner instead of moving it
    const next = newPoints[actualNextIndex];
    const dx = Math.abs(next.x - newPoint.x);
    const dy = Math.abs(next.y - newPoint.y);

    if (dx > dy) {
      // Segment is more horizontal: insert corner that aligns Y with newPoint
      newPoints.splice(actualNextIndex, 0, { x: next.x, y: newPoint.y });
    } else {
      // Segment is more vertical: insert corner that aligns X with newPoint
      newPoints.splice(actualNextIndex, 0, { x: newPoint.x, y: next.y });
    }
  } else if (actualNextIndex < newPoints.length) {
    // Next is not endpoint - can move it
    const next = newPoints[actualNextIndex];
    const dx = Math.abs(next.x - newPoint.x);
    const dy = Math.abs(next.y - newPoint.y);

    if (dx > dy) {
      // Segment is more horizontal: align Y
      newPoints[actualNextIndex] = { x: next.x, y: newPoint.y };
    } else {
      // Segment is more vertical: align X
      newPoints[actualNextIndex] = { x: newPoint.x, y: next.y };
    }
  }

  return normalizeToPerimeter(cleanWaypoints(newPoints), sourceRect, targetRect);
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
  pointerPoint: Point
): { side: Side; t: number; points: Point[] } {
  // Determine which rect we're working with
  const movingRect = whichEnd === 'start' ? sourceRect : targetRect;
  const otherRect = whichEnd === 'start' ? targetRect : sourceRect;

  // First, try to snap to nearest anchor
  const anchorSnap = nearestAnchorSnap(movingRect, pointerPoint, 14);

  if (anchorSnap) {
    // Snapped to anchor
    const newDockPoint = dockPoint(movingRect, anchorSnap.side, anchorSnap.t);

    // Use repairWaypoints to update path
    let newPoints: Point[];
    if (whichEnd === 'start') {
      // Moving start endpoint
      const endPoint = points[points.length - 1];
      const endSide = findNearestSide(targetRect, endPoint);
      const endT = 0.5;

      newPoints = repairWaypoints(points, sourceRect, targetRect, anchorSnap.side, anchorSnap.t, endSide, endT);
    } else {
      // Moving end endpoint
      const startPoint = points[0];
      const startSide = findNearestSide(sourceRect, startPoint);
      const startT = 0.5;

      newPoints = repairWaypoints(points, sourceRect, targetRect, startSide, startT, anchorSnap.side, anchorSnap.t);
    }

    return {
      side: anchorSnap.side,
      t: anchorSnap.t,
      points: normalizeToPerimeter(newPoints, sourceRect, targetRect)
    };
  }

  // No snap: find nearest perimeter point
  const nearest = findNearestPerimeterPoint(movingRect, pointerPoint);
  const newDockPoint = dockPoint(movingRect, nearest.side, nearest.t);

  // Use repairWaypoints
  let newPoints: Point[];
  if (whichEnd === 'start') {
    const endPoint = points[points.length - 1];
    const endSide = findNearestSide(targetRect, endPoint);
    const endT = 0.5;

    newPoints = repairWaypoints(points, sourceRect, targetRect, nearest.side, nearest.t, endSide, endT);
  } else {
    const startPoint = points[0];
    const startSide = findNearestSide(sourceRect, startPoint);
    const startT = 0.5;

    newPoints = repairWaypoints(points, sourceRect, targetRect, startSide, startT, nearest.side, nearest.t);
  }

  return {
    side: nearest.side,
    t: nearest.t,
    points: normalizeToPerimeter(newPoints, sourceRect, targetRect)
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
