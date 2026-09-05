import { describe, expect, it } from 'vitest';
import { arrangeWatermark } from '../../../src/domain/watermarks/layout';
import { defaultWatermark } from '../../../src/domain/watermarks/types';
describe('stable bounded watermark placement', () => {
  it('places one or 5/10/20 bounded copies and ignores opacity when arranging', () => {
    const config = { ...defaultWatermark, enabled: true, text: '現勘' };
    expect(arrangeWatermark('p', 4 / 3, config)?.rectangles).toHaveLength(1);
    for (const [density, count] of [
      ['low', 5],
      ['medium', 10],
      ['high', 20],
    ] as const) {
      const repeated = { ...config, mode: 'repeat' as const, density };
      const arrangement = arrangeWatermark('p', 4 / 3, repeated);
      expect(arrangement?.rectangles).toHaveLength(count);
      expect(arrangeWatermark('p', 4 / 3, { ...repeated, opacity: 0.9 })).toEqual(arrangement);
      expect(
        arrangement?.rectangles.every(
          (r) => r.x >= 0.03 && r.y >= 0.03 && r.x + r.width <= 0.97 && r.y + r.height <= 0.97,
        ),
      ).toBe(true);
    }
  });
  it('rejects impossible long repetition and repeated PNG', () => {
    expect(
      arrangeWatermark('p', 1, {
        ...defaultWatermark,
        text: '長'.repeat(120),
        mode: 'repeat',
        density: 'high',
      }),
    ).toBeNull();
    expect(
      arrangeWatermark('p', 1, { ...defaultWatermark, kind: 'image', mode: 'repeat' }),
    ).toBeNull();
  });
});
