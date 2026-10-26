/**
 * Tests for pure waypoint functions (migration-waypoints.ts).
 * No Angular dependencies - pure logic testing only.
 */
import { describe, it, expect } from 'vitest';
import {
  initialWaypoints,
  cleanWaypoints,
  segments,
  segmentBarPosition,
  waypointsToPath,
  arrowheadAngle,
  repairWaypoints,
  dockPoint,
  moveSegment,
  moveWaypoint,
  moveDock,
  nearestAnchorSnap,
  normalizeToPerimeter,
  Point,
  Rect,
  Side
} from './migration-waypoints';

describe('migration-waypoints (pure functions)', () => {
  describe('initialWaypoints', () => {
    it('should generate 2-point straight line for aligned shapes (right to left)', () => {
      const source: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const target: Rect = { left: 300, top: 100, width: 80, height: 60 };

      const points = initialWaypoints(source, target);

      expect(points.length).toBeGreaterThanOrEqual(2);
      // First point on right side of source
      expect(Math.abs(points[0].x - (source.left + source.width))).toBeLessThan(1);
      expect(Math.abs(points[0].y - (source.top + source.height / 2))).toBeLessThan(1);
      // Last point on left side of target
      const lastIdx = points.length - 1;
      expect(Math.abs(points[lastIdx].x - target.left)).toBeLessThan(1);
      expect(Math.abs(points[lastIdx].y - (target.top + target.height / 2))).toBeLessThan(1);
    });

    it('should generate Z-shape (4 points) for shapes offset in Y', () => {
      const source: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const target: Rect = { left: 300, top: 200, width: 80, height: 60 };

      const points = initialWaypoints(source, target);

      expect(points.length).toBe(4);
      // Verify orthogonality
      for (let i = 0; i < points.length - 1; i++) {
        const dx = Math.abs(points[i + 1].x - points[i].x);
        const dy = Math.abs(points[i + 1].y - points[i].y);
        const isHorizontal = dy < 0.01;
        const isVertical = dx < 0.01;
        expect(isHorizontal || isVertical).toBe(true);
      }
    });

    it('should handle target above source', () => {
      const source: Rect = { left: 100, top: 200, width: 80, height: 60 };
      const target: Rect = { left: 300, top: 100, width: 80, height: 60 };

      const points = initialWaypoints(source, target);

      expect(points.length).toBeGreaterThanOrEqual(2);
      expect(points.every(p => !isNaN(p.x) && !isNaN(p.y))).toBe(true);
    });

    it('should handle target to the left of source', () => {
      const source: Rect = { left: 300, top: 100, width: 80, height: 60 };
      const target: Rect = { left: 100, top: 100, width: 80, height: 60 };

      const points = initialWaypoints(source, target);

      expect(points.length).toBeGreaterThanOrEqual(2);
      expect(points.every(p => !isNaN(p.x) && !isNaN(p.y))).toBe(true);
    });

    it('should handle overlapping shapes', () => {
      const source: Rect = { left: 100, top: 100, width: 100, height: 80 };
      const target: Rect = { left: 150, top: 120, width: 100, height: 80 };

      const points = initialWaypoints(source, target);

      expect(points.length).toBeGreaterThanOrEqual(2);
      expect(points.every(p => !isNaN(p.x) && !isNaN(p.y))).toBe(true);
    });

    it('should produce no NaN coordinates', () => {
      const source: Rect = { left: 0, top: 0, width: 50, height: 50 };
      const target: Rect = { left: 200, top: 200, width: 50, height: 50 };

      const points = initialWaypoints(source, target);

      points.forEach(p => {
        expect(isNaN(p.x)).toBe(false);
        expect(isNaN(p.y)).toBe(false);
      });
    });

    it('should produce orthogonal path (all segments H or V)', () => {
      const source: Rect = { left: 100, top: 150, width: 80, height: 60 };
      const target: Rect = { left: 400, top: 300, width: 80, height: 60 };

      const points = initialWaypoints(source, target);

      for (let i = 0; i < points.length - 1; i++) {
        const dx = Math.abs(points[i + 1].x - points[i].x);
        const dy = Math.abs(points[i + 1].y - points[i].y);
        const isHorizontal = dy < 0.01;
        const isVertical = dx < 0.01;
        expect(isHorizontal || isVertical).toBe(true);
      }
    });

    it('should dock endpoints on shape borders (within 1px)', () => {
      const source: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const target: Rect = { left: 300, top: 150, width: 80, height: 60 };

      const points = initialWaypoints(source, target);

      // First point should be on source perimeter
      const first = points[0];
      const distToSourcePerimeter = Math.min(
        Math.abs(first.x - source.left),
        Math.abs(first.x - (source.left + source.width)),
        Math.abs(first.y - source.top),
        Math.abs(first.y - (source.top + source.height))
      );
      expect(distToSourcePerimeter).toBeLessThan(1);

      // Last point should be on target perimeter
      const last = points[points.length - 1];
      const distToTargetPerimeter = Math.min(
        Math.abs(last.x - target.left),
        Math.abs(last.x - (target.left + target.width)),
        Math.abs(last.y - target.top),
        Math.abs(last.y - (target.top + target.height))
      );
      expect(distToTargetPerimeter).toBeLessThan(1);
    });
  });

  describe('cleanWaypoints', () => {
    it('should remove consecutive duplicate points', () => {
      const points: Point[] = [
        { x: 100, y: 100 },
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 }
      ];

      const cleaned = cleanWaypoints(points);

      expect(cleaned).toEqual([
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 }
      ]);
    });

    it('should remove collinear points (3 points on horizontal line)', () => {
      const points: Point[] = [
        { x: 100, y: 100 },
        { x: 150, y: 100 },
        { x: 200, y: 100 }
      ];

      const cleaned = cleanWaypoints(points);

      expect(cleaned).toEqual([
        { x: 100, y: 100 },
        { x: 200, y: 100 }
      ]);
    });

    it('should remove collinear points (3 points on vertical line)', () => {
      const points: Point[] = [
        { x: 100, y: 100 },
        { x: 100, y: 150 },
        { x: 100, y: 200 }
      ];

      const cleaned = cleanWaypoints(points);

      expect(cleaned).toEqual([
        { x: 100, y: 100 },
        { x: 100, y: 200 }
      ]);
    });

    it('should keep orthogonal corners', () => {
      const points: Point[] = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 },
        { x: 300, y: 200 }
      ];

      const cleaned = cleanWaypoints(points);

      expect(cleaned).toEqual(points);
    });

    it('should handle empty array', () => {
      const points: Point[] = [];
      const cleaned = cleanWaypoints(points);
      expect(cleaned).toEqual([]);
    });

    it('should handle single point', () => {
      const points: Point[] = [{ x: 100, y: 100 }];
      const cleaned = cleanWaypoints(points);
      expect(cleaned).toEqual(points);
    });
  });

  describe('segments', () => {
    it('should return segments with correct properties', () => {
      const points: Point[] = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 }
      ];

      const segs = segments(points);

      expect(segs.length).toBe(2);
      expect(segs[0].index).toBe(0);
      expect(segs[0].a).toEqual({ x: 100, y: 100 });
      expect(segs[0].b).toEqual({ x: 200, y: 100 });
      expect(segs[0].orientation).toBe('horizontal');
      expect(segs[0].length).toBeCloseTo(100);

      expect(segs[1].index).toBe(1);
      expect(segs[1].orientation).toBe('vertical');
      expect(segs[1].length).toBeCloseTo(100);
    });

    it('should handle zero-length segment', () => {
      const points: Point[] = [
        { x: 100, y: 100 },
        { x: 100, y: 100 },
        { x: 200, y: 100 }
      ];

      const segs = segments(points);

      expect(segs.length).toBe(2);
      expect(segs[0].length).toBe(0);
      expect(segs[0].orientation).toBe('vertical'); // default when both dx and dy are 0
    });
  });

  describe('segmentBarPosition', () => {
    it('should return center of horizontal segment', () => {
      const segment = {
        index: 0,
        a: { x: 100, y: 150 },
        b: { x: 200, y: 150 },
        orientation: 'horizontal' as const,
        length: 100
      };

      const bar = segmentBarPosition(segment);

      expect(bar.x).toBeCloseTo(150);
      expect(bar.y).toBeCloseTo(150);
    });

    it('should return center of vertical segment', () => {
      const segment = {
        index: 1,
        a: { x: 200, y: 100 },
        b: { x: 200, y: 200 },
        orientation: 'vertical' as const,
        length: 100
      };

      const bar = segmentBarPosition(segment);

      expect(bar.x).toBeCloseTo(200);
      expect(bar.y).toBeCloseTo(150);
    });

    it('should handle zero-length segment (returns point itself)', () => {
      const segment = {
        index: 0,
        a: { x: 100, y: 100 },
        b: { x: 100, y: 100 },
        orientation: 'horizontal' as const,
        length: 0
      };

      const bar = segmentBarPosition(segment);

      expect(bar.x).toBeCloseTo(100);
      expect(bar.y).toBeCloseTo(100);
    });
  });

  describe('waypointsToPath', () => {
    it('should convert waypoints to SVG path with right angles', () => {
      const points: Point[] = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 }
      ];

      const path = waypointsToPath(points);

      expect(path).toBe('M 100 100 L 200 100 L 200 200');
    });

    it('should handle 2-point path', () => {
      const points: Point[] = [
        { x: 100, y: 100 },
        { x: 300, y: 100 }
      ];

      const path = waypointsToPath(points);

      expect(path).toBe('M 100 100 L 300 100');
    });

    it('should return empty string for empty points', () => {
      const points: Point[] = [];
      const path = waypointsToPath(points);
      expect(path).toBe('');
    });
  });

  describe('arrowheadAngle', () => {
    it('should return angle pointing right (0°) for horizontal right segment', () => {
      const points: Point[] = [
        { x: 100, y: 100 },
        { x: 200, y: 100 }
      ];

      const angle = arrowheadAngle(points);

      expect(angle).toBeCloseTo(0);
    });

    it('should return angle pointing down (90°) for vertical down segment', () => {
      const points: Point[] = [
        { x: 100, y: 100 },
        { x: 100, y: 200 }
      ];

      const angle = arrowheadAngle(points);

      expect(angle).toBeCloseTo(90);
    });

    it('should return angle pointing left (180°) for horizontal left segment', () => {
      const points: Point[] = [
        { x: 200, y: 100 },
        { x: 100, y: 100 }
      ];

      const angle = arrowheadAngle(points);

      expect(angle).toBeCloseTo(180);
    });

    it('should return angle pointing up (-90°) for vertical up segment', () => {
      const points: Point[] = [
        { x: 100, y: 200 },
        { x: 100, y: 100 }
      ];

      const angle = arrowheadAngle(points);

      expect(angle).toBeCloseTo(-90);
    });
  });

  describe('repairWaypoints', () => {
    it('should adjust endpoints when shape moves', () => {
      const source: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const target: Rect = { left: 300, top: 100, width: 80, height: 60 };
      const oldWaypoints = initialWaypoints(source, target);

      const newSource = source;
      const newTarget: Rect = { left: 350, top: 180, width: 80, height: 60 };

      const repaired = repairWaypoints(oldWaypoints, newSource, newTarget, 'right', 0.5, 'left', 0.5);

      expect(repaired.length).toBeGreaterThanOrEqual(2);
      expect(repaired.every(p => !isNaN(p.x) && !isNaN(p.y))).toBe(true);
    });

    it('should preserve number of corners when possible', () => {
      const source: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const target: Rect = { left: 300, top: 200, width: 80, height: 60 };
      const oldWaypoints = initialWaypoints(source, target);
      const oldCornerCount = oldWaypoints.length;

      const newSource = source;
      const newTarget: Rect = { left: 350, top: 280, width: 80, height: 60 };

      const repaired = repairWaypoints(oldWaypoints, newSource, newTarget, 'right', 0.5, 'left', 0.5);

      // Corner count should be same or close (within ±2)
      expect(Math.abs(repaired.length - oldCornerCount)).toBeLessThanOrEqual(2);
    });

    it('should maintain orthogonality after repair', () => {
      const source: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const target: Rect = { left: 300, top: 150, width: 80, height: 60 };
      const oldWaypoints = initialWaypoints(source, target);

      const newSource = source;
      const newTarget: Rect = { left: 350, top: 200, width: 80, height: 60 };

      const repaired = repairWaypoints(oldWaypoints, newSource, newTarget, 'right', 0.5, 'left', 0.5);

      for (let i = 0; i < repaired.length - 1; i++) {
        const dx = Math.abs(repaired[i + 1].x - repaired[i].x);
        const dy = Math.abs(repaired[i + 1].y - repaired[i].y);
        const isHorizontal = dy < 0.01;
        const isVertical = dx < 0.01;
        expect(isHorizontal || isVertical).toBe(true);
      }
    });

    it('should dock repaired endpoints on shape borders (within 1px)', () => {
      const source: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const target: Rect = { left: 300, top: 100, width: 80, height: 60 };
      const oldWaypoints = initialWaypoints(source, target);

      const newSource = source;
      const newTarget: Rect = { left: 350, top: 150, width: 80, height: 60 };

      const repaired = repairWaypoints(oldWaypoints, newSource, newTarget, 'right', 0.5, 'left', 0.5);

      // First point should be on source perimeter
      const first = repaired[0];
      const distToSourcePerimeter = Math.min(
        Math.abs(first.x - newSource.left),
        Math.abs(first.x - (newSource.left + newSource.width)),
        Math.abs(first.y - newSource.top),
        Math.abs(first.y - (newSource.top + newSource.height))
      );
      expect(distToSourcePerimeter).toBeLessThan(1);

      // Last point should be on target perimeter
      const last = repaired[repaired.length - 1];
      const distToTargetPerimeter = Math.min(
        Math.abs(last.x - newTarget.left),
        Math.abs(last.x - (newTarget.left + newTarget.width)),
        Math.abs(last.y - newTarget.top),
        Math.abs(last.y - (newTarget.top + newTarget.height))
      );
      expect(distToTargetPerimeter).toBeLessThan(1);
    });
  });

  describe('dockPoint', () => {
    it('should return point on top side at t=0.5', () => {
      const rect: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const point = dockPoint(rect, 'top', 0.5);

      expect(point.x).toBeCloseTo(140);
      expect(point.y).toBeCloseTo(100);
    });

    it('should return point on right side at t=0.5', () => {
      const rect: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const point = dockPoint(rect, 'right', 0.5);

      expect(point.x).toBeCloseTo(180);
      expect(point.y).toBeCloseTo(130);
    });

    it('should return point on bottom side at t=0.3', () => {
      const rect: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const point = dockPoint(rect, 'bottom', 0.3);

      expect(point.x).toBeCloseTo(124);
      expect(point.y).toBeCloseTo(160);
    });

    it('should return point on left side at t=0.7', () => {
      const rect: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const point = dockPoint(rect, 'left', 0.7);

      expect(point.x).toBeCloseTo(100);
      expect(point.y).toBeCloseTo(142);
    });

    it('should clamp t to [0, 1] range', () => {
      const rect: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const point1 = dockPoint(rect, 'top', -0.5);
      const point2 = dockPoint(rect, 'top', 1.5);

      expect(point1.x).toBeCloseTo(100); // t=0
      expect(point2.x).toBeCloseTo(180); // t=1
    });
  });

  describe('moveSegment', () => {
    it('should move interior horizontal segment vertically', () => {
      const source: Rect = { left: 50, top: 80, width: 80, height: 60 };
      const target: Rect = { left: 250, top: 180, width: 80, height: 60 };
      const points: Point[] = [
        { x: 100, y: 100 }, // On source right edge (approximately)
        { x: 200, y: 100 },
        { x: 200, y: 200 },
        { x: 300, y: 200 }  // On target right edge
      ];

      const moved = moveSegment(points, 0, 20, source, target); // Move first segment down by 20px

      expect(moved.length).toBeGreaterThanOrEqual(4);
      // Endpoints should remain on perimeter
      const firstOnPerimeter = Math.min(
        Math.abs(moved[0].x - source.left),
        Math.abs(moved[0].x - (source.left + source.width)),
        Math.abs(moved[0].y - source.top),
        Math.abs(moved[0].y - (source.top + source.height))
      ) < 1;
      expect(firstOnPerimeter).toBe(true);

      // Verify orthogonality
      for (let i = 0; i < moved.length - 1; i++) {
        const dx = Math.abs(moved[i + 1].x - moved[i].x);
        const dy = Math.abs(moved[i + 1].y - moved[i].y);
        expect(dx < 0.01 || dy < 0.01).toBe(true);
      }
    });

    it('should move interior vertical segment horizontally', () => {
      const source: Rect = { left: 50, top: 80, width: 80, height: 60 };
      const target: Rect = { left: 250, top: 180, width: 80, height: 60 };
      const points: Point[] = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 },
        { x: 300, y: 200 }
      ];

      const moved = moveSegment(points, 1, 30, source, target); // Move middle vertical segment right by 30px

      expect(moved.length).toBeGreaterThanOrEqual(4);
      // Verify orthogonality
      for (let i = 0; i < moved.length - 1; i++) {
        const dx = Math.abs(moved[i + 1].x - moved[i].x);
        const dy = Math.abs(moved[i + 1].y - moved[i].y);
        expect(dx < 0.01 || dy < 0.01).toBe(true);
      }
    });

    it('should insert points when moving segment adjacent to anchored endpoint', () => {
      const source: Rect = { left: 80, top: 80, width: 60, height: 60 };
      const target: Rect = { left: 180, top: 80, width: 60, height: 60 };
      const points: Point[] = [
        { x: 140, y: 110 }, // On source right edge
        { x: 180, y: 110 }  // On target left edge
      ];

      const moved = moveSegment(points, 0, 30, source, target); // Move horizontal segment down by 30px

      // Should create U-shape (or bridge) to keep endpoints anchored
      expect(moved.length).toBeGreaterThanOrEqual(4);
      // Endpoints should remain on perimeter
      const firstOnPerimeter = Math.min(
        Math.abs(moved[0].x - source.left),
        Math.abs(moved[0].x - (source.left + source.width)),
        Math.abs(moved[0].y - source.top),
        Math.abs(moved[0].y - (source.top + source.height))
      ) < 1;
      expect(firstOnPerimeter).toBe(true);
    });

    it('should handle zero-length segment', () => {
      const source: Rect = { left: 80, top: 80, width: 60, height: 60 };
      const target: Rect = { left: 180, top: 80, width: 60, height: 60 };
      const points: Point[] = [
        { x: 100, y: 100 },
        { x: 100, y: 100 },
        { x: 200, y: 100 }
      ];

      const moved = moveSegment(points, 0, 20, source, target);

      expect(moved.every(p => !isNaN(p.x) && !isNaN(p.y))).toBe(true);
      expect(moved.length).toBeGreaterThanOrEqual(2);
    });

    it('should maintain orthogonality after move', () => {
      const source: Rect = { left: 80, top: 130, width: 60, height: 60 };
      const target: Rect = { left: 280, top: 230, width: 60, height: 60 };
      const points: Point[] = [
        { x: 100, y: 150 },
        { x: 200, y: 150 },
        { x: 200, y: 250 },
        { x: 300, y: 250 }
      ];

      const moved = moveSegment(points, 1, -40, source, target); // Move vertical segment left

      for (let i = 0; i < moved.length - 1; i++) {
        const dx = Math.abs(moved[i + 1].x - moved[i].x);
        const dy = Math.abs(moved[i + 1].y - moved[i].y);
        const isHorizontal = dy < 0.01;
        const isVertical = dx < 0.01;
        expect(isHorizontal || isVertical).toBe(true);
      }
    });

    it('should produce no NaN coordinates', () => {
      const source: Rect = { left: 0, top: 0, width: 50, height: 50 };
      const target: Rect = { left: 100, top: 100, width: 50, height: 50 };
      const points: Point[] = [
        { x: 25, y: 25 },
        { x: 100, y: 25 },
        { x: 100, y: 100 }
      ];

      const moved = moveSegment(points, 0, 50, source, target);

      moved.forEach(p => {
        expect(isNaN(p.x)).toBe(false);
        expect(isNaN(p.y)).toBe(false);
      });
    });

    it('should be idempotent after cleanWaypoints', () => {
      const source: Rect = { left: 80, top: 80, width: 60, height: 60 };
      const target: Rect = { left: 180, top: 180, width: 60, height: 60 };
      const points: Point[] = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 }
      ];

      const moved = moveSegment(points, 0, 25, source, target);
      const cleaned1 = cleanWaypoints(moved);
      const cleaned2 = cleanWaypoints(cleaned1);

      expect(cleaned1).toEqual(cleaned2);
    });
  });

  describe('moveWaypoint', () => {
    it('should move corner point and adjust neighbors (horizontal then vertical)', () => {
      const source: Rect = { left: 80, top: 80, width: 60, height: 60 };
      const target: Rect = { left: 180, top: 180, width: 60, height: 60 };
      const points: Point[] = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 }
      ];

      const moved = moveWaypoint(points, 1, { x: 250, y: 150 }, source, target);

      expect(moved.length).toBeGreaterThanOrEqual(3);
      // Endpoints should remain on perimeter
      const firstOnPerimeter = Math.min(
        Math.abs(moved[0].x - source.left),
        Math.abs(moved[0].x - (source.left + source.width)),
        Math.abs(moved[0].y - source.top),
        Math.abs(moved[0].y - (source.top + source.height))
      ) < 1;
      expect(firstOnPerimeter).toBe(true);

      // Verify orthogonality
      for (let i = 0; i < moved.length - 1; i++) {
        const dx = Math.abs(moved[i + 1].x - moved[i].x);
        const dy = Math.abs(moved[i + 1].y - moved[i].y);
        expect(dx < 0.01 || dy < 0.01).toBe(true);
      }
    });

    it('should insert point if neighbor is anchored endpoint', () => {
      const source: Rect = { left: 80, top: 80, width: 60, height: 60 };
      const target: Rect = { left: 180, top: 180, width: 60, height: 60 };
      const points: Point[] = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 }
      ];

      const moved = moveWaypoint(points, 1, { x: 250, y: 80 }, source, target);

      expect(moved.length).toBeGreaterThanOrEqual(3);
      // Endpoints should remain on perimeter
      const firstOnPerimeter = Math.min(
        Math.abs(moved[0].x - source.left),
        Math.abs(moved[0].x - (source.left + source.width)),
        Math.abs(moved[0].y - source.top),
        Math.abs(moved[0].y - (source.top + source.height))
      ) < 1;
      expect(firstOnPerimeter).toBe(true);
    });

    it('should maintain orthogonality', () => {
      const source: Rect = { left: 80, top: 80, width: 60, height: 60 };
      const target: Rect = { left: 280, top: 180, width: 60, height: 60 };
      const points: Point[] = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 },
        { x: 300, y: 200 }
      ];

      const moved = moveWaypoint(points, 1, { x: 250, y: 150 }, source, target);

      for (let i = 0; i < moved.length - 1; i++) {
        const dx = Math.abs(moved[i + 1].x - moved[i].x);
        const dy = Math.abs(moved[i + 1].y - moved[i].y);
        const isHorizontal = dy < 0.01;
        const isVertical = dx < 0.01;
        expect(isHorizontal || isVertical).toBe(true);
      }
    });

    it('should produce no NaN coordinates', () => {
      const source: Rect = { left: 80, top: 80, width: 60, height: 60 };
      const target: Rect = { left: 180, top: 180, width: 60, height: 60 };
      const points: Point[] = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 }
      ];

      const moved = moveWaypoint(points, 1, { x: 250, y: 150 }, source, target);

      moved.forEach(p => {
        expect(isNaN(p.x)).toBe(false);
        expect(isNaN(p.y)).toBe(false);
      });
    });
  });

  describe('nearestAnchorSnap', () => {
    it('should return top anchor when within radius', () => {
      const rect: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const point: Point = { x: 140, y: 92 }; // 8px above top anchor

      const anchor = nearestAnchorSnap(rect, point, 14);

      expect(anchor).toEqual({ side: 'top', t: 0.5 });
    });

    it('should return right anchor when within radius', () => {
      const rect: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const point: Point = { x: 188, y: 130 }; // 8px right of right anchor

      const anchor = nearestAnchorSnap(rect, point, 14);

      expect(anchor).toEqual({ side: 'right', t: 0.5 });
    });

    it('should return bottom anchor when within radius', () => {
      const rect: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const point: Point = { x: 140, y: 168 }; // 8px below bottom anchor

      const anchor = nearestAnchorSnap(rect, point, 14);

      expect(anchor).toEqual({ side: 'bottom', t: 0.5 });
    });

    it('should return left anchor when within radius', () => {
      const rect: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const point: Point = { x: 92, y: 130 }; // 8px left of left anchor

      const anchor = nearestAnchorSnap(rect, point, 14);

      expect(anchor).toEqual({ side: 'left', t: 0.5 });
    });

    it('should return null when outside radius', () => {
      const rect: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const point: Point = { x: 140, y: 80 }; // 20px above top anchor (> 14px)

      const anchor = nearestAnchorSnap(rect, point, 14);

      expect(anchor).toBeNull();
    });

    it('should return null when no anchors within radius', () => {
      const rect: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const point: Point = { x: 50, y: 50 }; // Far from all anchors

      const anchor = nearestAnchorSnap(rect, point, 14);

      expect(anchor).toBeNull();
    });

    it('should return nearest anchor when multiple within radius', () => {
      const rect: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const point: Point = { x: 145, y: 105 }; // 5px from top anchor, within radius

      const anchor = nearestAnchorSnap(rect, point, 14);

      expect(anchor).not.toBeNull();
      // Should be either 'top' or 'right', whichever is closer
      expect(['top', 'right']).toContain(anchor?.side);
    });
  });

  describe('moveDock', () => {
    it('should dock to nearest perimeter point when far from anchors', () => {
      const source: Rect = { left: 80, top: 80, width: 60, height: 60 };
      const target: Rect = { left: 300, top: 150, width: 80, height: 60 };
      const points: Point[] = [
        { x: 110, y: 110 },
        { x: 200, y: 110 },
        { x: 200, y: 180 }
      ];
      const pointerPoint: Point = { x: 300, y: 180 }; // On left side of target

      const result = moveDock(points, 'end', source, target, pointerPoint);

      expect(result.side).toBe('left');
      expect(result.t).toBeGreaterThanOrEqual(0.1);
      expect(result.t).toBeLessThanOrEqual(0.9);
      expect(result.points.length).toBeGreaterThanOrEqual(2);

      // Last point should be on target border
      const lastPoint = result.points[result.points.length - 1];
      const distToPerimeter = Math.min(
        Math.abs(lastPoint.x - target.left),
        Math.abs(lastPoint.x - (target.left + target.width)),
        Math.abs(lastPoint.y - target.top),
        Math.abs(lastPoint.y - (target.top + target.height))
      );
      expect(distToPerimeter).toBeLessThan(1);
    });

    it('should snap to anchor when within 14px', () => {
      const source: Rect = { left: 80, top: 80, width: 60, height: 60 };
      const target: Rect = { left: 300, top: 150, width: 80, height: 60 };
      const points: Point[] = [
        { x: 110, y: 110 },
        { x: 200, y: 110 }
      ];
      const anchorPoint: Point = { x: 300, y: 180 }; // Left anchor
      const pointerPoint: Point = { x: 292, y: 182 }; // 10px from anchor

      const result = moveDock(points, 'end', source, target, pointerPoint);

      expect(result.side).toBe('left');
      expect(result.t).toBeCloseTo(0.5, 1); // Snapped to anchor (t=0.5)
    });

    it('should clamp t to [0.1, 0.9]', () => {
      const source: Rect = { left: 80, top: 80, width: 60, height: 60 };
      const target: Rect = { left: 300, top: 150, width: 80, height: 60 };
      const points: Point[] = [
        { x: 110, y: 110 },
        { x: 200, y: 110 }
      ];
      const pointerPoint: Point = { x: 300, y: 145 }; // Near top-left corner

      const result = moveDock(points, 'end', source, target, pointerPoint);

      expect(result.t).toBeGreaterThanOrEqual(0.1);
      expect(result.t).toBeLessThanOrEqual(0.9);
    });

    it('should preserve corners when possible (repairWaypoints)', () => {
      const source: Rect = { left: 80, top: 80, width: 60, height: 60 };
      const target: Rect = { left: 400, top: 150, width: 80, height: 60 };
      const points: Point[] = [
        { x: 110, y: 110 },
        { x: 200, y: 110 },
        { x: 200, y: 180 },
        { x: 300, y: 180 }
      ];
      const pointerPoint: Point = { x: 400, y: 180 };

      const result = moveDock(points, 'end', source, target, pointerPoint);

      // Should preserve at least some of the original corners
      expect(result.points.length).toBeGreaterThanOrEqual(2);
      expect(Math.abs(result.points.length - points.length)).toBeLessThanOrEqual(2);
    });

    it('should handle start endpoint (whichEnd=start)', () => {
      const source: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const target: Rect = { left: 180, top: 80, width: 80, height: 60 };
      const points: Point[] = [
        { x: 140, y: 130 },
        { x: 200, y: 130 },
        { x: 200, y: 110 }
      ];
      const pointerPoint: Point = { x: 140, y: 100 }; // Top side

      const result = moveDock(points, 'start', source, target, pointerPoint);

      expect(result.side).toBe('top');
      expect(result.points.length).toBeGreaterThanOrEqual(2);

      // First point should be on source border
      const firstPoint = result.points[0];
      const distToPerimeter = Math.min(
        Math.abs(firstPoint.x - source.left),
        Math.abs(firstPoint.x - (source.left + source.width)),
        Math.abs(firstPoint.y - source.top),
        Math.abs(firstPoint.y - (source.top + source.height))
      );
      expect(distToPerimeter).toBeLessThan(1);
    });

    it('should produce orthogonal path', () => {
      const source: Rect = { left: 80, top: 80, width: 60, height: 60 };
      const target: Rect = { left: 300, top: 150, width: 80, height: 60 };
      const points: Point[] = [
        { x: 110, y: 110 },
        { x: 200, y: 110 }
      ];
      const pointerPoint: Point = { x: 340, y: 190 };

      const result = moveDock(points, 'end', source, target, pointerPoint);

      for (let i = 0; i < result.points.length - 1; i++) {
        const dx = Math.abs(result.points[i + 1].x - result.points[i].x);
        const dy = Math.abs(result.points[i + 1].y - result.points[i].y);
        const isHorizontal = dy < 0.01;
        const isVertical = dx < 0.01;
        expect(isHorizontal || isVertical).toBe(true);
      }
    });

    it('should produce no NaN coordinates', () => {
      const source: Rect = { left: 0, top: 0, width: 50, height: 50 };
      const target: Rect = { left: 200, top: 0, width: 50, height: 50 };
      const points: Point[] = [
        { x: 25, y: 25 },
        { x: 100, y: 25 }
      ];
      const pointerPoint: Point = { x: 200, y: 25 };

      const result = moveDock(points, 'end', source, target, pointerPoint);

      result.points.forEach(p => {
        expect(isNaN(p.x)).toBe(false);
        expect(isNaN(p.y)).toBe(false);
      });
    });
  });

  describe('normalizeToPerimeter', () => {
    it('should snap endpoints to perimeter when inside shape (user bug case)', () => {
      // Bug case from capture: source (447,756,128,101), target (1233,756,128,101)
      // Points after dragging segment up: [(514,805),(514,665),(1290,665),(1290,805)]
      // 805 is center of source (756 + 101/2), should be 756 (top edge)
      const source: Rect = { left: 447, top: 756, width: 128, height: 101 };
      const target: Rect = { left: 1233, top: 756, width: 128, height: 101 };
      const points: Point[] = [
        { x: 514, y: 805 }, // Inside source (center)
        { x: 514, y: 665 },
        { x: 1290, y: 665 },
        { x: 1290, y: 805 }  // Inside target (center)
      ];

      const normalized = normalizeToPerimeter(points, source, target);

      // First point should be on top edge of source (first segment is vertical going up)
      expect(normalized[0].x).toBeCloseTo(514, 0.5);
      expect(normalized[0].y).toBeCloseTo(756, 0.5);

      // Last point should be on top edge of target
      expect(normalized[normalized.length - 1].x).toBeCloseTo(1290, 0.5);
      expect(normalized[normalized.length - 1].y).toBeCloseTo(756, 0.5);

      // Middle points unchanged
      expect(normalized[1].x).toBeCloseTo(514, 0.5);
      expect(normalized[1].y).toBeCloseTo(665, 0.5);
      expect(normalized[2].x).toBeCloseTo(1290, 0.5);
      expect(normalized[2].y).toBeCloseTo(665, 0.5);
    });

    it('should handle segment shifted outside shape horizontally', () => {
      const source: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const target: Rect = { left: 300, top: 100, width: 80, height: 60 };
      // First vertical segment at x=250 (beyond source.right=180)
      const points: Point[] = [
        { x: 250, y: 130 }, // Outside source
        { x: 250, y: 80 },
        { x: 340, y: 80 },
        { x: 340, y: 130 }
      ];

      const normalized = normalizeToPerimeter(points, source, target);

      // Should re-dock on nearest side (right) and insert bend
      expect(normalized[0].x).toBeCloseTo(180, 0.5); // right edge of source
      expect(normalized[0].y).toBeGreaterThanOrEqual(100);
      expect(normalized[0].y).toBeLessThanOrEqual(160);

      // Should have inserted bend to reach second point
      expect(normalized.length).toBeGreaterThanOrEqual(4);
    });

    it('should handle aligned shapes with bridge (horizontal segments)', () => {
      const source: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const target: Rect = { left: 300, top: 100, width: 80, height: 60 };
      // U-shape going down then across
      const points: Point[] = [
        { x: 140, y: 130 }, // On source (center vertical)
        { x: 140, y: 200 },
        { x: 340, y: 200 },
        { x: 340, y: 130 }
      ];

      const normalized = normalizeToPerimeter(points, source, target);

      // First point: vertical segment going down, source bottom edge
      expect(normalized[0].x).toBeCloseTo(140, 0.5);
      expect(normalized[0].y).toBeCloseTo(160, 0.5); // bottom edge

      // Last point: vertical segment going up, target bottom edge
      expect(normalized[normalized.length - 1].x).toBeCloseTo(340, 0.5);
      expect(normalized[normalized.length - 1].y).toBeCloseTo(160, 0.5);

      // Middle points unchanged
      expect(normalized.some(p => Math.abs(p.y - 200) < 0.5)).toBe(true);
    });

    it('should leave already-docked endpoints unchanged', () => {
      const source: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const target: Rect = { left: 300, top: 100, width: 80, height: 60 };
      // Use non-collinear points (Z-shape) to avoid cleanWaypoints removing middle points
      const points: Point[] = [
        { x: 180, y: 130 }, // On right edge of source
        { x: 250, y: 130 },
        { x: 250, y: 150 },
        { x: 300, y: 150 }  // On left edge of target
      ];

      const normalized = normalizeToPerimeter(points, source, target);

      expect(normalized).toEqual(points);
    });

    it('should remove adjacent point if inside shape', () => {
      const source: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const target: Rect = { left: 300, top: 100, width: 80, height: 60 };
      const points: Point[] = [
        { x: 120, y: 130 }, // Inside source
        { x: 130, y: 130 }, // Also inside source
        { x: 250, y: 130 },
        { x: 300, y: 130 }
      ];

      const normalized = normalizeToPerimeter(points, source, target);

      // Should remove second point and dock first on perimeter
      expect(normalized.length).toBeLessThan(points.length);
      expect(normalized[0].x).toBeCloseTo(180, 0.5); // right edge
      expect(normalized[0].y).toBeCloseTo(130, 0.5);
    });

    it('should handle zero-width rect gracefully', () => {
      const source: Rect = { left: 100, top: 100, width: 0, height: 60 };
      const target: Rect = { left: 300, top: 100, width: 80, height: 60 };
      const points: Point[] = [
        { x: 100, y: 130 },
        { x: 200, y: 130 },
        { x: 300, y: 130 }
      ];

      const normalized = normalizeToPerimeter(points, source, target);

      expect(normalized.every(p => !isNaN(p.x) && !isNaN(p.y))).toBe(true);
      expect(normalized.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle exact corner of shape', () => {
      const source: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const target: Rect = { left: 300, top: 100, width: 80, height: 60 };
      const points: Point[] = [
        { x: 180, y: 100 }, // top-right corner of source
        { x: 250, y: 100 },
        { x: 300, y: 100 }  // top-left corner of target
      ];

      const normalized = normalizeToPerimeter(points, source, target);

      // Corners are on perimeter, should be unchanged
      expect(normalized[0]).toEqual(points[0]);
      expect(normalized[normalized.length - 1]).toEqual(points[points.length - 1]);
    });

    it('should be idempotent (normalizing twice = once)', () => {
      const source: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const target: Rect = { left: 300, top: 100, width: 80, height: 60 };
      const points: Point[] = [
        { x: 140, y: 130 },
        { x: 250, y: 130 },
        { x: 340, y: 130 }
      ];

      const normalized1 = normalizeToPerimeter(points, source, target);
      const normalized2 = normalizeToPerimeter(normalized1, source, target);

      expect(normalized2).toEqual(normalized1);
    });

    it('should produce no NaN coordinates', () => {
      const source: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const target: Rect = { left: 300, top: 100, width: 80, height: 60 };
      const points: Point[] = [
        { x: 140, y: 130 },
        { x: 200, y: 80 },
        { x: 340, y: 130 }
      ];

      const normalized = normalizeToPerimeter(points, source, target);

      normalized.forEach(p => {
        expect(isNaN(p.x)).toBe(false);
        expect(isNaN(p.y)).toBe(false);
      });
    });

    it('should handle vertical segment on left/right edge', () => {
      const source: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const target: Rect = { left: 100, top: 250, width: 80, height: 60 };
      // Vertical alignment, going down
      const points: Point[] = [
        { x: 140, y: 130 }, // Inside source (center)
        { x: 140, y: 200 },
        { x: 140, y: 280 }  // Inside target (center)
      ];

      const normalized = normalizeToPerimeter(points, source, target);

      // First point on bottom edge of source (vertical segment going down)
      expect(normalized[0].x).toBeCloseTo(140, 0.5);
      expect(normalized[0].y).toBeCloseTo(160, 0.5);

      // Last point on top edge of target (vertical segment coming from above)
      expect(normalized[normalized.length - 1].x).toBeCloseTo(140, 0.5);
      expect(normalized[normalized.length - 1].y).toBeCloseTo(250, 0.5);
    });

    it('should handle horizontal segment at y within rect bounds', () => {
      const source: Rect = { left: 100, top: 100, width: 80, height: 60 };
      const target: Rect = { left: 300, top: 100, width: 80, height: 60 };
      const points: Point[] = [
        { x: 140, y: 130 }, // Inside source
        { x: 250, y: 130 }, // Outside
        { x: 340, y: 130 }  // Inside target
      ];

      const normalized = normalizeToPerimeter(points, source, target);

      // First point on right edge (horizontal segment going right)
      expect(normalized[0].x).toBeCloseTo(180, 0.5);
      expect(normalized[0].y).toBeCloseTo(130, 0.5);

      // Last point on left edge (horizontal segment coming from left)
      expect(normalized[normalized.length - 1].x).toBeCloseTo(300, 0.5);
      expect(normalized[normalized.length - 1].y).toBeCloseTo(130, 0.5);
    });
  });
});
