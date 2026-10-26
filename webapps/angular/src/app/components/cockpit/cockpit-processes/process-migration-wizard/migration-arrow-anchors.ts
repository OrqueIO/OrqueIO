/**
 * Pure functions for migration arrow anchor management.
 *
 * Anchors define where arrows attach to BPMN shapes (top, right, bottom, left).
 * All functions are pure (no side effects) and work with simple data structures.
 */

export type Anchor = 'top' | 'right' | 'bottom' | 'left';

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
 * Returns the point at the center of the specified side of a rectangle.
 *
 * @param rect - Rectangle in layer coordinates
 * @param anchor - Which side to get the point from
 * @returns Point at the center of the specified side
 */
export function anchorPoint(rect: Rect, anchor: Anchor): Point {
  switch (anchor) {
    case 'top':
      return {
        x: rect.left + rect.width / 2,
        y: rect.top
      };
    case 'right':
      return {
        x: rect.left + rect.width,
        y: rect.top + rect.height / 2
      };
    case 'bottom':
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height
      };
    case 'left':
      return {
        x: rect.left,
        y: rect.top + rect.height / 2
      };
  }
}

/**
 * Finds the anchor (side) of a rectangle nearest to a given point.
 *
 * Tiebreaker rule (when distances are equal):
 * Priority order is: right > bottom > left > top
 * This ensures deterministic behavior when the point is equidistant from multiple sides.
 *
 * @param rect
 * @param point
 * @returns
 */
export function nearestAnchor(rect: Rect, point: Point): Anchor {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const topCenter = anchorPoint(rect, 'top');
  const rightCenter = anchorPoint(rect, 'right');
  const bottomCenter = anchorPoint(rect, 'bottom');
  const leftCenter = anchorPoint(rect, 'left');

  const distToTop = Math.sqrt((point.x - topCenter.x) ** 2 + (point.y - topCenter.y) ** 2);
  const distToRight = Math.sqrt((point.x - rightCenter.x) ** 2 + (point.y - rightCenter.y) ** 2);
  const distToBottom = Math.sqrt((point.x - bottomCenter.x) ** 2 + (point.y - bottomCenter.y) ** 2);
  const distToLeft = Math.sqrt((point.x - leftCenter.x) ** 2 + (point.y - leftCenter.y) ** 2);

  const minDist = Math.min(distToTop, distToRight, distToBottom, distToLeft);
  const epsilon = 0.001;

  if (Math.abs(distToRight - minDist) < epsilon) return 'right';
  if (Math.abs(distToBottom - minDist) < epsilon) return 'bottom';
  if (Math.abs(distToLeft - minDist) < epsilon) return 'left';
  return 'top';
}

/**
 * Returns the outward direction vector for an anchor.
 *
 * @param anchor
 * @returns
 */
export function anchorDirection(anchor: Anchor): Point {
  switch (anchor) {
    case 'top':
      return { x: 0, y: -1 };
    case 'right':
      return { x: 1, y: 0 };
    case 'bottom':
      return { x: 0, y: 1 };
    case 'left':
      return { x: -1, y: 0 };
  }
}

/**
 * Builds an SVG path for an arrow from start to end, with control points
 * extending perpendicular to the anchor sides.
 *
 * IMPORTANT: For default anchors (source='right', target='left'), this function
 * uses the EXACT algorithm from the existing createBezierPath to ensure
 * pixel-perfect compatibility (≤2px difference).
 *
 * For non-default anchors, control points extend perpendicular to the anchor side
 * by a distance of min(80, 40% of distance between endpoints).
 *
 * @param startPoint
 * @param startAnchor
 * @param endPoint
 * @param endAnchor
 * @returns
 */
export function buildArrowPath(
  startPoint: Point,
  startAnchor: Anchor,
  endPoint: Point,
  endAnchor: Anchor
): string {
  const x1 = startPoint.x;
  const y1 = startPoint.y;
  const x2 = endPoint.x;
  const y2 = endPoint.y;

  if (startAnchor === 'right' && endAnchor === 'left') {
    const dx = x2 - x1;
    const dy = Math.abs(y2 - y1);

    let cp1x, cp1y, cp2x, cp2y;

    if (dy < 40) {
      const dipY = Math.max(y1, y2) + 40;

      cp1x = x1 + dx * 0.25;
      cp1y = dipY;
      cp2x = x1 + dx * 0.75;
      cp2y = dipY;
    } else {
      const offset = Math.min(Math.abs(dx) * 0.5, 150);

      cp1x = x1 + offset;
      cp1y = y1;
      cp2x = x2 - offset;
      cp2y = y2;
    }

    return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
  }

  const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const controlDistance = Math.min(80, distance * 0.4);

  const startDir = anchorDirection(startAnchor);
  const endDir = anchorDirection(endAnchor);

  const cp1x = x1 + startDir.x * controlDistance;
  const cp1y = y1 + startDir.y * controlDistance;
  const cp2x = x2 + endDir.x * controlDistance;
  const cp2y = y2 + endDir.y * controlDistance;

  return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
}

/**
 * Generates a unique key for an instruction based on source and target activity IDs.
 * This key is used to store custom anchors for the arrow connecting these activities.
 *
 * IMPORTANT: This function must be used consistently by both the wizard component
 * and the arrows component to ensure the same key format.
 *
 * @param sourceActivityId
 * @param targetActivityId
 * @returns
 */
export function getAnchorKey(sourceActivityId: string, targetActivityId: string): string {
  return `${sourceActivityId}-${targetActivityId}`;
}