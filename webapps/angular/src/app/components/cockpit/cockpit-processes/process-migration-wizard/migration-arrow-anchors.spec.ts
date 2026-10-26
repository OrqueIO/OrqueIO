import { describe, it, expect } from 'vitest';
import {
  Anchor,
  Point,
  Rect,
  anchorPoint,
  nearestAnchor,
  anchorDirection,
  buildArrowPath
} from './migration-arrow-anchors';

describe('migration-arrow-anchors - Pure Functions', () => {
  describe('anchorPoint', () => {
    const rect: Rect = { left: 100, top: 200, width: 120, height: 80 };

    it('should return top center', () => {
      const point = anchorPoint(rect, 'top');
      expect(point).toEqual({ x: 160, y: 200 });
    });

    it('should return right center', () => {
      const point = anchorPoint(rect, 'right');
      expect(point).toEqual({ x: 220, y: 240 });
    });

    it('should return bottom center', () => {
      const point = anchorPoint(rect, 'bottom');
      expect(point).toEqual({ x: 160, y: 280 });
    });

    it('should return left center', () => {
      const point = anchorPoint(rect, 'left');
      expect(point).toEqual({ x: 100, y: 240 });
    });

    it('should handle rect with width 0', () => {
      const narrowRect: Rect = { left: 50, top: 50, width: 0, height: 100 };
      const point = anchorPoint(narrowRect, 'top');
      expect(point).toEqual({ x: 50, y: 50 });
    });

    it('should handle rect at different positions', () => {
      const rect2: Rect = { left: 500, top: 300, width: 80, height: 60 };
      expect(anchorPoint(rect2, 'right')).toEqual({ x: 580, y: 330 });
      expect(anchorPoint(rect2, 'bottom')).toEqual({ x: 540, y: 360 });
    });
  });

  describe('nearestAnchor', () => {
    const rect: Rect = { left: 100, top: 200, width: 120, height: 80 };

    it('should return top when point is above rect', () => {
      const point: Point = { x: 160, y: 150 };
      expect(nearestAnchor(rect, point)).toBe('top');
    });

    it('should return right when point is to the right', () => {
      const point: Point = { x: 300, y: 240 };
      expect(nearestAnchor(rect, point)).toBe('right');
    });

    it('should return bottom when point is below', () => {
      const point: Point = { x: 160, y: 350 };
      expect(nearestAnchor(rect, point)).toBe('bottom');
    });

    it('should return left when point is to the left', () => {
      const point: Point = { x: 50, y: 240 };
      expect(nearestAnchor(rect, point)).toBe('left');
    });

    it('should handle corner case - top-right corner (tiebreaker: right)', () => {
      const point: Point = { x: 220, y: 200 };
      expect(nearestAnchor(rect, point)).toBe('right');
    });

    it('should handle corner case - bottom-right corner (tiebreaker: right)', () => {
      const point: Point = { x: 220, y: 280 };
      expect(nearestAnchor(rect, point)).toBe('right');
    });

    it('should handle corner case - bottom-left corner', () => {
      const point: Point = { x: 100, y: 280 };
      expect(nearestAnchor(rect, point)).toBe('left');
    });

    it('should handle corner case - top-left corner (tiebreaker: left)', () => {
      const point: Point = { x: 100, y: 200 };
      expect(nearestAnchor(rect, point)).toBe('left');
    });

    it('should be deterministic when top and bottom equidistant', () => {
      const point: Point = { x: 160, y: 240 };
      expect(nearestAnchor(rect, point)).toBe('bottom');
    });
  });

  describe('anchorDirection', () => {
    it('should return upward vector for top', () => {
      expect(anchorDirection('top')).toEqual({ x: 0, y: -1 });
    });

    it('should return rightward vector for right', () => {
      expect(anchorDirection('right')).toEqual({ x: 1, y: 0 });
    });

    it('should return downward vector for bottom', () => {
      expect(anchorDirection('bottom')).toEqual({ x: 0, y: 1 });
    });

    it('should return leftward vector for left', () => {
      expect(anchorDirection('left')).toEqual({ x: -1, y: 0 });
    });
  });

  describe('buildArrowPath', () => {
    describe('Legacy algorithm (right → left)', () => {
      it('should match existing algorithm for horizontal arrow (dy < 40)', () => {
        const start: Point = { x: 200, y: 140 };
        const end: Point = { x: 640, y: 150 };

        const path = buildArrowPath(start, 'right', end, 'left');

        const dx = 640 - 200;
        const dipY = Math.max(140, 150) + 40;
        const cp1x = 200 + dx * 0.25;
        const cp2x = 200 + dx * 0.75;

        expect(path).toBe(`M 200 140 C 310 190, 530 190, 640 150`);
      });

      it('should match existing algorithm for vertical arrow (dy >= 40)', () => {
        const start: Point = { x: 200, y: 100 };
        const end: Point = { x: 640, y: 300 };

        const path = buildArrowPath(start, 'right', end, 'left');

        const dx = 640 - 200;
        const offset = Math.min(Math.abs(dx) * 0.5, 150);
        const cp1x = 200 + 150;
        const cp2x = 640 - 150;

        expect(path).toBe(`M 200 100 C 350 100, 490 300, 640 300`);
      });

      it('should match existing path for typical case (non-regression test)', () => {
        const start: Point = { x: 200, y: 140 };
        const end: Point = { x: 640, y: 360 };

        const oldPath = buildArrowPath(start, 'right', end, 'left');
        const dx = 440;
        const dy = 220;
        const offset = Math.min(Math.abs(dx) * 0.5, 150);

        expect(oldPath).toBe(`M 200 140 C 350 140, 490 360, 640 360`);
      });

      it('should not differ by more than 2px from legacy code (tolerance test)', () => {
        const start: Point = { x: 200, y: 140 };
        const end: Point = { x: 640, y: 360 };
        const newPath = buildArrowPath(start, 'right', end, 'left');
        const match = newPath.match(/M ([\d.]+) ([\d.]+) C ([\d.]+) ([\d.]+), ([\d.]+) ([\d.]+), ([\d.]+) ([\d.]+)/);
        expect(match).toBeTruthy();

        if (match) {
          const [, mx, my, cp1x, cp1y, cp2x, cp2y, ex, ey] = match.map(Number);
          const expectedCp1x = 350;
          const expectedCp1y = 140;
          const expectedCp2x = 490;
          const expectedCp2y = 360;

          expect(Math.abs(cp1x - expectedCp1x)).toBeLessThanOrEqual(2);
          expect(Math.abs(cp1y - expectedCp1y)).toBeLessThanOrEqual(2);
          expect(Math.abs(cp2x - expectedCp2x)).toBeLessThanOrEqual(2);
          expect(Math.abs(cp2y - expectedCp2y)).toBeLessThanOrEqual(2);
        }
      });
    });

    describe('New algorithm (custom anchors)', () => {
      it('should build path with perpendicular control points for top → bottom', () => {
        const start: Point = { x: 160, y: 200 };
        const end: Point = { x: 540, y: 360 };
        const path = buildArrowPath(start, 'top', end, 'bottom');

        expect(path).toBe(`M 160 200 C 160 120, 540 440, 540 360`);
      });

      it('should build path with perpendicular control points for left → right', () => {
        const start: Point = { x: 100, y: 240 };
        const end: Point = { x: 580, y: 330 };
        const path = buildArrowPath(start, 'left', end, 'right');

        expect(path).toBe(`M 100 240 C 20 240, 660 330, 580 330`);
      });

      it('should limit control distance to 80 for long distances', () => {
        const start: Point = { x: 100, y: 100 };
        const end: Point = { x: 500, y: 500 };
        const path = buildArrowPath(start, 'top', end, 'bottom');

        expect(path).toBe(`M 100 100 C 100 20, 500 580, 500 500`);
      });

      it('should use 40% of distance for short distances', () => {
        const start: Point = { x: 100, y: 100 };
        const end: Point = { x: 150, y: 100 };
        const path = buildArrowPath(start, 'right', end, 'bottom');

        expect(path).toBe(`M 100 100 C 120 100, 150 120, 150 100`);
      });

      it('should handle all 4 anchor combinations', () => {
        const start: Point = { x: 100, y: 100 };
        const end: Point = { x: 200, y: 200 };
        const path1 = buildArrowPath(start, 'top', end, 'bottom');
        expect(path1).toContain('M 100 100');
        const path2 = buildArrowPath(start, 'right', end, 'left');
        expect(path2).toContain('M 100 100');
        const path3 = buildArrowPath(start, 'bottom', end, 'top');
        expect(path3).toContain('M 100 100');
        const path4 = buildArrowPath(start, 'left', end, 'right');
        expect(path4).toContain('M 100 100');
      });
    });
  });
});
