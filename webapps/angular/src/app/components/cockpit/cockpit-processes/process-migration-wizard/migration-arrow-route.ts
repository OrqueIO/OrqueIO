/**
 * Pure functions for orthogonal (right-angle) arrow routing.
 *
 * No Angular dependencies - pure logic only.
 *
 * COORDINATE SYSTEM:
 * All coordinates and rectangles are in SVG layer space (not screen/viewport space).
 * The layer origin (0, 0) corresponds to the top-left of the .diagrams-container.
 * Input rectangles MUST be pre-converted to layer coordinates before calling these functions.
 * DO NOT pass screen coordinates - they will produce incorrect results.
 */

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

/**
 * Returns a point on the specified side of a rectangle at parameter t.
 *
 * @param rect - The rectangle
 * @param side - Which side ('top', 'right', 'bottom', 'left')
 * @param t - Position along side [0.1, 0.9], clamped to this range
 * @returns Point on the perimeter
 */
export function sidePoint(rect: Rect, side: Side, t: number): Point {
  const clamped = Math.max(0.1, Math.min(0.9, t));

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
 * Builds an orthogonal (right-angle) route between two rectangles.
 *
 * IMPORTANT: startRect and endRect MUST be in SVG layer coordinates (not screen coordinates).
 * The layer origin (0,0) is the top-left of the .diagrams-container.
 *
 * @param startRect
 * @param startSide
 * @param startT
 * @param endRect
 * @param endSide
 * @param endT
 * @param midOffset
 * @param bridgeY
 * @returns
 */
export function buildOrthogonalRoute(
  startRect: Rect,
  startSide: Side,
  startT: number,
  endRect: Rect,
  endSide: Side,
  endT: number,
  midOffset: number | null,
  bridgeY: number | null = null
): Point[] {
  const start = sidePoint(startRect, startSide, startT);
  const end = sidePoint(endRect, endSide, endT);
  const MIN_EXIT = 12;
  const startHorizontal = startSide === 'left' || startSide === 'right';
  const endHorizontal = endSide === 'left' || endSide === 'right';

  const startDir = getDirection(startSide);
  const endDir = getDirection(endSide);

  if (startHorizontal === endHorizontal) {
    const points: Point[] = [start];

    if (startHorizontal) {
      const exitX = start.x + startDir.x * MIN_EXIT;
      const entryX = end.x + endDir.x * MIN_EXIT;

      if (bridgeY !== null) {
        const gap = Math.abs(end.x - start.x);
        const margin = Math.min(24, gap / 4);
        const Yb = (start.y + end.y) / 2 + bridgeY;
        const exitMarginX = start.x + startDir.x * margin;
        const entryMarginX = end.x + endDir.x * margin;

        points.push({ x: exitMarginX, y: start.y });
        points.push({ x: exitMarginX, y: Yb });
        points.push({ x: entryMarginX, y: Yb });
        points.push({ x: entryMarginX, y: end.y });
        points.push(end);
      } else {
        let midX: number;
        if (midOffset !== null) {
          midX = (exitX + entryX) / 2 + midOffset;
        } else {
          midX = (exitX + entryX) / 2;
        }

        points.push({ x: midX, y: start.y });
        points.push({ x: midX, y: end.y });
        points.push(end);
      }
    } else {
      const exitY = start.y + startDir.y * MIN_EXIT;
      const entryY = end.y + endDir.y * MIN_EXIT;

      let midY: number;
      if (midOffset !== null) {
        midY = (exitY + entryY) / 2 + midOffset;
      } else {
        midY = (exitY + entryY) / 2;
      }

      points.push({ x: start.x, y: midY });
      points.push({ x: end.x, y: midY });
      points.push(end);
    }

    return removeConsecutiveDuplicates(points);
  }

  const points: Point[] = [start];

  if (startHorizontal) {
    const exitX = start.x + startDir.x * MIN_EXIT;
    const entryY = end.y + endDir.y * MIN_EXIT;
    const canDirectL =
      (startSide === 'right' && exitX <= end.x) ||
      (startSide === 'left' && exitX >= end.x);

    if (canDirectL && Math.abs(entryY - start.y) >= MIN_EXIT) {
      points.push({ x: end.x, y: start.y });
      points.push(end);
    } else {
      const midX = exitX;
      const midY = entryY;

      points.push({ x: midX, y: start.y });
      points.push({ x: midX, y: midY });
      points.push({ x: end.x, y: midY });
      points.push(end);
    }
  } else {
    const exitY = start.y + startDir.y * MIN_EXIT;
    const entryX = end.x + endDir.x * MIN_EXIT;

    const canDirectL =
      (startSide === 'bottom' && exitY <= end.y) ||
      (startSide === 'top' && exitY >= end.y);

    if (canDirectL && Math.abs(entryX - start.x) >= MIN_EXIT) {
      points.push({ x: start.x, y: end.y });
      points.push(end);
    } else {
      const midX = entryX;
      const midY = exitY;

      points.push({ x: start.x, y: midY });
      points.push({ x: midX, y: midY });
      points.push({ x: midX, y: end.y });
      points.push(end);
    }
  }

  return removeConsecutiveDuplicates(points);
}

/**
 * Converts an array of points to an SVG path string with sharp angles.
 *
 * @param points
 * @returns
 */
export function routeToPath(points: Point[]): string {
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
 * Finds the middle segment of a route.
 *
 * For 5-segment routes (bridge mode, 6 points), returns the horizontal bridge segment (segment 2).
 * For 3-segment routes (H-V-H or V-H-V), returns the middle segment (segment 1).
 * For 2-segment routes (L-shape), returns the first segment (segment 0).
 *
 * Handles degenerate cases where the middle segment has zero length:
 * - H-V-H with aligned Y → vertical segment of length 0
 * - V-H-V with aligned X → horizontal segment of length 0
 *
 * @param points
 * @returns
 */
export function midSegment(points: Point[]): {
  index: number;
  center: Point;
  orientation: 'horizontal' | 'vertical';
} {
  if (points.length < 2) {
    return {
      index: 0,
      center: points[0] || { x: 0, y: 0 },
      orientation: 'horizontal'
    };
  }

  const segmentCount = points.length - 1;

  let midIndex: number;
  if (segmentCount === 5) {
    midIndex = 2;
  } else if (segmentCount === 3) {
    midIndex = 1;
  } else {
    midIndex = 0;
  }

  const p1 = points[midIndex];
  const p2 = points[midIndex + 1];

  const center: Point = {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2
  };

  const dx = Math.abs(p2.x - p1.x);
  const dy = Math.abs(p2.y - p1.y);

  if (points.length === 3) {
    const allSameY = points.every(p => Math.abs(p.y - points[0].y) < 0.01);
    const allSameX = points.every(p => Math.abs(p.x - points[0].x) < 0.01);

    if (allSameY) {
      return {
        index: 1,
        center: points[1],
        orientation: 'vertical'
      };
    } else if (allSameX) {
      return {
        index: 1,
        center: points[1],
        orientation: 'horizontal'
      };
    }
  }

  const orientation = dx > dy ? 'horizontal' : 'vertical';

  return { index: midIndex, center, orientation };
}

/**
 * Finds the nearest point on a rectangle's perimeter to a given point.
 *
 * @param rect
 * @param point
 * @returns
 */
export function nearestPerimeterPoint(rect: Rect, point: Point): {
  side: Side;
  t: number;
} {
  const sides: Side[] = ['top', 'right', 'bottom', 'left'];

  let minDist = Infinity;
  let bestSide: Side = 'top';
  let bestT = 0.5;

  for (const side of sides) {
    let t: number;
    let projectedPoint: Point;

    switch (side) {
      case 'top':
        t = (point.x - rect.left) / rect.width;
        projectedPoint = { x: rect.left + rect.width * t, y: rect.top };
        break;
      case 'right':
        t = (point.y - rect.top) / rect.height;
        projectedPoint = { x: rect.left + rect.width, y: rect.top + rect.height * t };
        break;
      case 'bottom':
        t = (point.x - rect.left) / rect.width;
        projectedPoint = { x: rect.left + rect.width * t, y: rect.top + rect.height };
        break;
      case 'left':
        t = (point.y - rect.top) / rect.height;
        projectedPoint = { x: rect.left, y: rect.top + rect.height * t };
        break;
    }

    t = Math.max(0.1, Math.min(0.9, t));

    const clampedPoint = sidePoint(rect, side, t);

    const dist = Math.sqrt(
      (clampedPoint.x - point.x) ** 2 +
      (clampedPoint.y - point.y) ** 2
    );

    if (dist < minDist - 0.001 || (Math.abs(dist - minDist) < 0.001 && isBetterSide(side, bestSide))) {
      minDist = dist;
      bestSide = side;
      bestT = t;
    }
  }

  return { side: bestSide, t: bestT };
}


function getDirection(side: Side): Point {
  switch (side) {
    case 'top': return { x: 0, y: -1 };
    case 'right': return { x: 1, y: 0 };
    case 'bottom': return { x: 0, y: 1 };
    case 'left': return { x: -1, y: 0 };
  }
}

function removeConsecutiveDuplicates(points: Point[]): Point[] {
  if (points.length <= 1) {
    return points;
  }

  const result: Point[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];

    if (Math.abs(curr.x - prev.x) > 0.01 || Math.abs(curr.y - prev.y) > 0.01) {
      result.push(curr);
    }
  }

  return result;
}

function isBetterSide(candidate: Side, current: Side): boolean {
  const priority: Record<Side, number> = {
    top: 4,
    right: 3,
    bottom: 2,
    left: 1
  };

  return priority[candidate] > priority[current];
}
