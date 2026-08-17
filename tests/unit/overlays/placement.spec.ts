import { describe, expect, it } from 'vitest';

import { findCornerPlacement, overlaysOverlap } from '../../../src/domain/overlays/placement';
import type { OverlayGeometry } from '../../../src/domain/overlays/types';

const candidate: OverlayGeometry = {
  x: 0,
  y: 0,
  width: 0.44,
  height: 0.1,
};

describe('automatic corner placement', () => {
  it('places top-corner items from the outside inward without overlap', () => {
    const first = findCornerPlacement(candidate, [], 'top-right');
    const second = findCornerPlacement(candidate, first ? [first] : [], 'top-right');

    expect(first).toEqual({ x: 0.53, y: 0.03, width: 0.44, height: 0.1 });
    expect(second).not.toBeNull();
    expect(second!.y).toBeGreaterThan(first!.y);
    expect(overlaysOverlap(first!, second!)).toBe(false);
  });

  it('places bottom-corner items from the outside inward without overlap', () => {
    const first = findCornerPlacement(candidate, [], 'bottom-left');
    const second = findCornerPlacement(candidate, first ? [first] : [], 'bottom-left');

    expect(first).toEqual({ x: 0.03, y: 0.87, width: 0.44, height: 0.1 });
    expect(second).not.toBeNull();
    expect(second!.y).toBeLessThan(first!.y);
    expect(overlaysOverlap(first!, second!)).toBe(false);
  });

  it('skips occupied space and returns null rather than overlapping when a side is full', () => {
    const occupied = [
      { x: 0.03, y: 0, width: 0.44, height: 0.25 },
      { x: 0.03, y: 0.25, width: 0.44, height: 0.25 },
      { x: 0.03, y: 0.5, width: 0.44, height: 0.25 },
      { x: 0.03, y: 0.75, width: 0.44, height: 0.25 },
    ];

    expect(findCornerPlacement(candidate, occupied, 'top-left')).toBeNull();
  });

  it('treats the configured safety gap as part of collision protection', () => {
    const left = { x: 0.03, y: 0.03, width: 0.44, height: 0.1 };
    const nearlyTouching = { x: 0.03, y: 0.135, width: 0.44, height: 0.1 };
    const safelySeparated = { x: 0.03, y: 0.145, width: 0.44, height: 0.1 };

    expect(overlaysOverlap(left, nearlyTouching)).toBe(true);
    expect(overlaysOverlap(left, safelySeparated)).toBe(false);
  });
});
