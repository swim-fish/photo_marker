import { describe, expect, it } from 'vitest';
import { buildCornerOverlays } from '../../../src/domain/editor/cornerLayout';
import { defaultTemplate, emptyCornerTexts } from '../../../src/domain/templates/types';
import { overlapsAny } from '../../../src/domain/overlays/placement';
describe('corner annotation layout', () => {
  it('places text before coordinates inward in each corner without overlap', () => {
    for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const) {
      const result = buildCornerOverlays(
        'p',
        { width: 1200, height: 900 },
        { ...defaultTemplate, coordinateCorner: corner },
        { ...emptyCornerTexts(), [corner]: '現勘記錄' },
        'WGS84\n25.03, 121.56',
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].role).toBe('freeform');
        expect(overlapsAny(result.value[0], result.value.slice(1))).toBe(false);
      }
    }
  });
  it('rejects text that cannot fit rather than cropping it', () => {
    expect(
      buildCornerOverlays(
        'p',
        { width: 100, height: 100 },
        defaultTemplate,
        { ...emptyCornerTexts(), 'top-left': '超長文字'.repeat(1000) },
        '',
      ).ok,
    ).toBe(false);
  });
});
