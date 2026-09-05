import { describe, expect, it } from 'vitest';
import { buildCornerOverlays } from '../../../src/domain/editor/cornerLayout';
import { defaultTemplate, emptyCornerTexts } from '../../../src/domain/templates/types';
import { formatCoordinate } from '../../../src/domain/coordinates/formatCoordinate';
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

it('preserves every coordinate character in all corners and photo orientations', () => {
  for (const format of ['WGS84_DD', 'TWD97_TM2', 'MGRS'] as const) {
    const formatted = formatCoordinate({ latitude: 25.033123, longitude: 121.565456 }, format, {
      zone: 121,
      precision: 5,
    });
    expect(formatted.ok).toBe(true);
    if (!formatted.ok) continue;
    const content = `照片 GPS: ${formatted.value.text}`;
    for (const dimensions of [
      { width: 900, height: 1600 },
      { width: 1600, height: 900 },
    ]) {
      for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const) {
        const result = buildCornerOverlays(
          'p',
          dimensions,
          { ...defaultTemplate, coordinateFormat: format, coordinateCorner: corner },
          emptyCornerTexts(),
          content,
        );
        expect(result.ok).toBe(true);
        if (!result.ok) continue;
        const overlay = result.value[0];
        expect(overlay.content.replaceAll('\n', '')).toBe(content.replaceAll('\n', ''));
        expect(overlay.x).toBeGreaterThanOrEqual(0);
        expect(overlay.y).toBeGreaterThanOrEqual(0);
        expect(overlay.x + overlay.width).toBeLessThanOrEqual(1);
        expect(overlay.y + overlay.height).toBeLessThanOrEqual(1);
      }
    }
  }
});

for (const [format, content, lines] of [
  ['WGS84_DD', '照片 GPS: 25.033123, 121.565456', ['照片 GPS: 25.033123,', ' 121.565456']],
  [
    'TWD97_TM2',
    '照片 GPS: E 307062.413, N 2769565.485 (zone 121)',
    ['照片 GPS: E 307062.413,', ' N 2769565.485 (zone 121)'],
  ],
] as const) {
  it(`wraps ${format} only between complete coordinate components`, () => {
    const result = buildCornerOverlays(
      'p',
      { width: 900, height: 1600 },
      { ...defaultTemplate, coordinateFormat: format },
      emptyCornerTexts(),
      content,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value[0].content.split('\n')).toEqual(lines);
  });
}
it('fits single-line coordinates without colliding with any of the four text boxes', () => {
  for (const format of ['WGS84_DD', 'TWD97_TM2', 'MGRS'] as const) {
    for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const) {
      const result = buildCornerOverlays(
        'p',
        { width: 900, height: 1600 },
        {
          ...defaultTemplate,
          coordinateFormat: format,
          coordinateCorner: corner,
          coordinateWrap: 'nowrap',
        },
        {
          'top-left': '調查員',
          'top-right': '日期',
          'bottom-left': '紀錄',
          'bottom-right': '地點',
        },
        format === 'MGRS' ? '照片 GPS: 51R TG 55034 69891' : '照片 GPS: 25.033123, 121.565456',
      );
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      const coordinate = result.value.find((o) => o.role === 'coordinate')!;
      expect(coordinate.content).not.toContain('\n');
      for (const overlay of result.value)
        expect(
          overlapsAny(
            overlay,
            result.value.filter((o) => o.id !== overlay.id),
          ),
        ).toBe(false);
    }
  }
});
it('keeps MGRS on one line even when wrapping is allowed', () => {
  const result = buildCornerOverlays(
    'p',
    { width: 900, height: 1600 },
    { ...defaultTemplate, coordinateFormat: 'MGRS' },
    emptyCornerTexts(),
    '照片 GPS: 51R TG 55034 69891',
  );
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.value[0].content).toBe('照片 GPS: 51R TG 55034 69891');
});

it('rejects a photo too small to render a complete single-line coordinate', () => {
  expect(
    buildCornerOverlays(
      'tiny',
      { width: 4, height: 3 },
      { ...defaultTemplate, coordinateFormat: 'MGRS' },
      emptyCornerTexts(),
      '照片 GPS: 51R TG 55034 69891',
    ).ok,
  ).toBe(false);
});
