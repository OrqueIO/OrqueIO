import { Point, Rect, Side, sideAndTToPoint } from './migration-waypoints';

export function checkRouteInvariants(
  points: Point[],
  startSide: Side,
  endSide: Side,
  rect0: Rect,
  rect1: Rect,
  bend?: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (points.length < 2) {
    errors.push('Points array too short');
    return { valid: false, errors };
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = Math.abs(p2.x - p1.x);
    const dy = Math.abs(p2.y - p1.y);
    if (dx > 0.5 && dy > 0.5) {
      errors.push(`Segment ${i} not orthogonal: (${p1.x},${p1.y}) → (${p2.x},${p2.y})`);
    }
  }

  const p0 = points[0];
  const expected0 = sideAndTToPoint(rect0, startSide, 0.5);
  if (Math.abs(p0.x - expected0.x) > 1 || Math.abs(p0.y - expected0.y) > 1) {
    errors.push(`First point (${p0.x},${p0.y}) not on rect0 ${startSide} perimeter (expected around ${expected0.x},${expected0.y})`);
  }


  const pN = points[points.length - 1];
  const expected1 = sideAndTToPoint(rect1, endSide, 0.5);
  if (Math.abs(pN.x - expected1.x) > 1 || Math.abs(pN.y - expected1.y) > 1) {
    errors.push(`Last point (${pN.x},${pN.y}) not on rect1 ${endSide} perimeter (expected around ${expected1.x},${expected1.y})`);
  }

  if (points.length >= 2) {
    const p0Pt = points[0];
    const p1Pt = points[1];

    if (startSide === 'top') {
      if (p1Pt.y > p0Pt.y + 0.5) {
        errors.push(`Top anchor but first leg goes DOWN: p0.y=${p0Pt.y}, p1.y=${p1Pt.y}`);
      }
    } else if (startSide === 'bottom') {
      if (p1Pt.y < p0Pt.y - 0.5) {
        errors.push(`Bottom anchor but first leg goes UP: p0.y=${p0Pt.y}, p1.y=${p1Pt.y}`);
      }
    } else if (startSide === 'right') {
      if (p1Pt.x < p0Pt.x - 0.5) {
        errors.push(`Right anchor but first leg goes LEFT: p0.x=${p0Pt.x}, p1.x=${p1Pt.x}`);
      }
    } else if (startSide === 'left') {
      if (p1Pt.x > p0Pt.x + 0.5) {
        errors.push(`Left anchor but first leg goes RIGHT: p0.x=${p0Pt.x}, p1.x=${p1Pt.x}`);
      }
    }
  }

  if (points.length >= 2) {
    const pNPt = points[points.length - 1];
    const pNm1Pt = points[points.length - 2];

    if (endSide === 'top') {
      if (pNm1Pt.y > pNPt.y + 0.5) {
        errors.push(`Top anchor but last leg comes from BELOW: pN.y=${pNPt.y}, pNm1.y=${pNm1Pt.y}`);
      }
    } else if (endSide === 'bottom') {
      if (pNm1Pt.y < pNPt.y - 0.5) {
        errors.push(`Bottom anchor but last leg comes from ABOVE: pN.y=${pNPt.y}, pNm1.y=${pNm1Pt.y}`);
      }
    } else if (endSide === 'right') {
      if (pNm1Pt.x < pNPt.x - 0.5) {
        errors.push(`Right anchor but last leg comes from LEFT: pN.x=${pNPt.x}, pNm1.x=${pNm1Pt.x}`);
      }
    } else if (endSide === 'left') {
      if (pNm1Pt.x > pNPt.x + 0.5) {
        errors.push(`Left anchor but last leg comes from RIGHT: pN.x=${pNPt.x}, pNm1.x=${pNm1Pt.x}`);
      }
    }
  }

  if (bend !== undefined) {
    const ANCHOR_MARGIN = 8;

    if (startSide === 'top' && bend > rect0.top + ANCHOR_MARGIN) {
      errors.push(`StartSide=top but bend=${bend} is not above rect0.top=${rect0.top}`);
    }
    if (startSide === 'bottom' && bend < rect0.top + rect0.height - ANCHOR_MARGIN) {
      const bottom0 = rect0.top + rect0.height;
      errors.push(`StartSide=bottom but bend=${bend} is not below rect0.bottom=${bottom0}`);
    }
    if (endSide === 'top' && bend > rect1.top + ANCHOR_MARGIN) {
      errors.push(`EndSide=top but bend=${bend} is not above rect1.top=${rect1.top}`);
    }
    if (endSide === 'bottom' && bend < rect1.top + rect1.height - ANCHOR_MARGIN) {
      const bottom1 = rect1.top + rect1.height;
      errors.push(`EndSide=bottom but bend=${bend} is not below rect1.bottom=${bottom1}`);
    }
  }

  return { valid: errors.length === 0, errors };
}