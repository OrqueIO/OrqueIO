/**
 * Tests for orthogonal arrow routing functions (pure logic, no Angular).
 *
 * Tests cover:
 * - sidePoint(rect, side, t)
 * - buildOrthogonalRoute(startRect, startSide, startT, endRect, endSide, endT, midOffset)
 * - routeToPath(points)
 * - midSegment(points)
 * - nearestPerimeterPoint(rect, point)
 *
 * All functions are pure (no side effects) and work with simple data structures.
 */

import { describe, it, expect } from 'vitest';
import {
  sidePoint,
  buildOrthogonalRoute,
  routeToPath,
  midSegment,
  nearestPerimeterPoint,
  Point,
  Rect,
  Side
} from './migration-arrow-route';

describe('migration-arrow-route - Pure Functions', () => {
  describe('sidePoint()', () => {
    const rect: Rect = { left: 100, top: 50, width: 200, height: 100 };

    it('should return point at t=0.5 (middle) of top side', () => {
      const point = sidePoint(rect, 'top', 0.5);
      expect(point).toEqual({ x: 200, y: 50 });
    });

    it('should return point at t=0.1 of right side', () => {
      const point = sidePoint(rect, 'right', 0.1);
      expect(point).toEqual({ x: 300, y: 60 });
    });

    it('should return point at t=0.9 of bottom side', () => {
      const point = sidePoint(rect, 'bottom', 0.9);
      expect(point).toEqual({ x: 280, y: 150 });
    });

    it('should return point at t=0.5 of left side', () => {
      const point = sidePoint(rect, 'left', 0.5);
      expect(point).toEqual({ x: 100, y: 100 });
    });

    it('should clamp t to [0.1, 0.9]', () => {
      const p1 = sidePoint(rect, 'top', 0.05);
      const p2 = sidePoint(rect, 'top', 0.1);
      expect(p1).toEqual(p2);

      const p3 = sidePoint(rect, 'top', 0.95);
      const p4 = sidePoint(rect, 'top', 0.9);
      expect(p3).toEqual(p4);
    });

    it('should handle zero-width rect', () => {
      const zeroRect: Rect = { left: 100, top: 50, width: 0, height: 100 };
      const point = sidePoint(zeroRect, 'top', 0.5);
      expect(point.x).toBe(100);
      expect(point.y).toBe(50);
      expect(isNaN(point.x)).toBe(false);
      expect(isNaN(point.y)).toBe(false);
    });
  });

  describe('buildOrthogonalRoute() - right→left (H-V-H)', () => {
    it('should build 3-segment route: H-V-H with target to the right', () => {
      const startRect: Rect = { left: 50, top: 50, width: 100, height: 80 };
      const endRect: Rect = { left: 300, top: 100, width: 100, height: 80 };

      const points = buildOrthogonalRoute(startRect, 'right', 0.5, endRect, 'left', 0.5, null);

      points.forEach(p => {
        expect(isNaN(p.x)).toBe(false);
        expect(isNaN(p.y)).toBe(false);
      });

      for (let i = 0; i < points.length - 1; i++) {
        const dx = Math.abs(points[i + 1].x - points[i].x);
        const dy = Math.abs(points[i + 1].y - points[i].y);
        const isOrthogonal = dx < 0.01 || dy < 0.01;
        expect(isOrthogonal).toBe(true);
      }

      expect(points.length).toBe(4);

      expect(points[0].x).toBe(150);
      expect(points[0].y).toBe(90);
      expect(points[3].x).toBe(300);
      expect(points[3].y).toBe(140);

      for (let i = 0; i < points.length - 1; i++) {
        expect(points[i + 1].x).toBeGreaterThanOrEqual(points[i].x - 0.01);
      }
    });

    it('should use midOffset to shift vertical segment', () => {
      const startRect: Rect = { left: 50, top: 50, width: 100, height: 80 };
      const endRect: Rect = { left: 300, top: 100, width: 100, height: 80 };

      const pointsNoOffset = buildOrthogonalRoute(startRect, 'right', 0.5, endRect, 'left', 0.5, null);
      const pointsWithOffset = buildOrthogonalRoute(startRect, 'right', 0.5, endRect, 'left', 0.5, 50);

      const midXNoOffset = pointsNoOffset[1].x;
      const midXWithOffset = pointsWithOffset[1].x;
      expect(midXWithOffset - midXNoOffset).toBeCloseTo(50, 0.1);
      expect(pointsWithOffset[0]).toEqual(pointsNoOffset[0]);
      expect(pointsWithOffset[3]).toEqual(pointsNoOffset[3]);
    });
  });

  describe('buildOrthogonalRoute() - top→bottom (V-H-V)', () => {
    it('should build V-H-V route with target below', () => {
      const startRect: Rect = { left: 100, top: 50, width: 100, height: 60 };
      const endRect: Rect = { left: 150, top: 200, width: 100, height: 60 };
      const points = buildOrthogonalRoute(startRect, 'top', 0.5, endRect, 'bottom', 0.5, null);

      points.forEach(p => {
        expect(isNaN(p.x)).toBe(false);
        expect(isNaN(p.y)).toBe(false);
      });

      for (let i = 0; i < points.length - 1; i++) {
        const dx = Math.abs(points[i + 1].x - points[i].x);
        const dy = Math.abs(points[i + 1].y - points[i].y);
        expect(dx < 0.01 || dy < 0.01).toBe(true);
      }

      expect(points.length).toBe(4);
      expect(points[0].y).toBe(50);
      expect(points[3].y).toBe(260);
    });
  });

  describe('buildOrthogonalRoute() - perpendicular sides (right→top)', () => {
    it('should build L-shape (2 segments) when possible', () => {
      const startRect: Rect = { left: 50, top: 50, width: 100, height: 80 };
      const endRect: Rect = { left: 200, top: 0, width: 100, height: 40 };
      const points = buildOrthogonalRoute(startRect, 'right', 0.5, endRect, 'top', 0.5, null);

      points.forEach(p => {
        expect(isNaN(p.x)).toBe(false);
        expect(isNaN(p.y)).toBe(false);
      });

      for (let i = 0; i < points.length - 1; i++) {
        const dx = Math.abs(points[i + 1].x - points[i].x);
        const dy = Math.abs(points[i + 1].y - points[i].y);
        expect(dx < 0.01 || dy < 0.01).toBe(true);
      }

      expect(points.length).toBeGreaterThanOrEqual(3);
      expect(points.length).toBeLessThanOrEqual(4);
    });

    it('should build 3 segments when L-shape would backtrack', () => {
      const startRect: Rect = { left: 200, top: 50, width: 100, height: 80 };
      const endRect: Rect = { left: 50, top: 0, width: 100, height: 40 };

      const points = buildOrthogonalRoute(startRect, 'right', 0.5, endRect, 'top', 0.5, null);

      points.forEach(p => {
        expect(isNaN(p.x)).toBe(false);
        expect(isNaN(p.y)).toBe(false);
      });

      expect(points.length).toBe(5);
    });
  });

  describe('buildOrthogonalRoute() - sample side combinations', () => {
    function testCombination(startSide: Side, endSide: Side, scenario: string) {
      const startRect: Rect = { left: 50, top: 50, width: 100, height: 80 };
      const endRect: Rect = scenario === 'distant'
        ? { left: 300, top: 200, width: 100, height: 80 }
        : { left: 150, top: 120, width: 100, height: 80 };

      const points = buildOrthogonalRoute(startRect, startSide, 0.5, endRect, endSide, 0.5, null);

      points.forEach(p => {
        expect(isNaN(p.x)).toBe(false);
        expect(isNaN(p.y)).toBe(false);
      });

      for (let i = 0; i < points.length - 1; i++) {
        const dx = Math.abs(points[i + 1].x - points[i].x);
        const dy = Math.abs(points[i + 1].y - points[i].y);
        expect(dx < 0.01 || dy < 0.01).toBe(true);
      }

      for (let i = 0; i < points.length - 1; i++) {
        const dist = Math.sqrt(
          (points[i + 1].x - points[i].x) ** 2 +
          (points[i + 1].y - points[i].y) ** 2
        );
        expect(dist).toBeGreaterThan(0.01);
      }

      const firstSegmentLen = Math.sqrt(
        (points[1].x - points[0].x) ** 2 +
        (points[1].y - points[0].y) ** 2
      );
      expect(firstSegmentLen).toBeGreaterThanOrEqual(11.9);
    }

    it('should handle right→left distant', () => {
      testCombination('right', 'left', 'distant');
    });

    it('should handle right→top distant', () => {
      testCombination('right', 'top', 'distant');
    });

    it('should handle right→bottom overlapping', () => {
      testCombination('right', 'bottom', 'overlapping');
    });

    it('should handle left→right distant', () => {
      testCombination('left', 'right', 'distant');
    });

    it('should handle top→bottom distant', () => {
      testCombination('top', 'bottom', 'distant');
    });

    it('should handle top→left overlapping', () => {
      testCombination('top', 'left', 'overlapping');
    });

    it('should handle bottom→top distant', () => {
      testCombination('bottom', 'top', 'distant');
    });

    it('should handle bottom→right overlapping', () => {
      testCombination('bottom', 'right', 'overlapping');
    });

    it('should handle same side: right→right', () => {
      testCombination('right', 'right', 'distant');
    });

    it('should handle same side: top→top', () => {
      testCombination('top', 'top', 'distant');
    });
  });

  describe('routeToPath()', () => {
    it('should convert points to SVG path with sharp angles', () => {
      const points: Point[] = [
        { x: 100, y: 50 },
        { x: 200, y: 50 },
        { x: 200, y: 150 },
        { x: 300, y: 150 }
      ];

      const path = routeToPath(points);

      expect(path).toBe('M 100 50 L 200 50 L 200 150 L 300 150');
    });

    it('should handle single point', () => {
      const points: Point[] = [{ x: 100, y: 50 }];
      const path = routeToPath(points);
      expect(path).toBe('M 100 50');
    });

    it('should handle two points', () => {
      const points: Point[] = [{ x: 100, y: 50 }, { x: 200, y: 50 }];
      const path = routeToPath(points);
      expect(path).toBe('M 100 50 L 200 50');
    });
  });

  describe('midSegment()', () => {
    it('should return middle segment for H-V-H route', () => {
      const points: Point[] = [
        { x: 100, y: 90 },
        { x: 225, y: 90 },
        { x: 225, y: 140 },
        { x: 300, y: 140 }
      ];

      const mid = midSegment(points);

      expect(mid.index).toBe(1);
      expect(mid.center.x).toBe(225);
      expect(mid.center.y).toBe(115);
      expect(mid.orientation).toBe('vertical');
    });

    it('should return middle segment for V-H-V route', () => {
      const points: Point[] = [
        { x: 150, y: 50 },
        { x: 150, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 }
      ];

      const mid = midSegment(points);

      expect(mid.index).toBe(1);
      expect(mid.center.x).toBe(175);
      expect(mid.center.y).toBe(100);
      expect(mid.orientation).toBe('horizontal');
    });

    it('should handle 2-segment L-shape (return first segment)', () => {
      const points: Point[] = [
        { x: 100, y: 90 },
        { x: 250, y: 90 },
        { x: 250, y: 40 }
      ];

      const mid = midSegment(points);

      expect(mid.index).toBe(0);
    });
  });

  describe('nearestPerimeterPoint()', () => {
    const rect: Rect = { left: 100, top: 50, width: 200, height: 100 };

    it('should find nearest point on top side', () => {
      const point: Point = { x: 150, y: 30 };
      const result = nearestPerimeterPoint(rect, point);

      expect(result.side).toBe('top');
      expect(result.t).toBeGreaterThanOrEqual(0.1);
      expect(result.t).toBeLessThanOrEqual(0.9);
    });

    it('should find nearest point on right side', () => {
      const point: Point = { x: 320, y: 100 };
      const result = nearestPerimeterPoint(rect, point);

      expect(result.side).toBe('right');
      expect(result.t).toBeCloseTo(0.5, 0.05);
    });

    it('should clamp t to [0.1, 0.9]', () => {
      const point: Point = { x: 110, y: 30 };
      const result = nearestPerimeterPoint(rect, point);

      expect(result.t).toBeGreaterThanOrEqual(0.1);
      expect(result.t).toBeLessThanOrEqual(0.9);
    });

    it('should have deterministic tiebreaker when equidistant', () => {
      const point: Point = { x: 100, y: 50 };
      const result = nearestPerimeterPoint(rect, point);

      expect(result.side).toBeDefined();
      expect(['top', 'left']).toContain(result.side);
    });
  });
});
