import type { WatermarkArrangement, WatermarkConfig } from './types';
function hash(text: string): number {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}
export function arrangeWatermark(
  photoId: string,
  aspect: number,
  config: WatermarkConfig,
  imageAspect = 1,
): WatermarkArrangement | null {
  if (
    !Number.isFinite(aspect) ||
    aspect <= 0 ||
    [...config.text].length > 120 ||
    (config.kind === 'image' && config.mode === 'repeat')
  )
    return null;
  const configFingerprint = JSON.stringify([
    config.kind,
    config.text,
    config.assetId,
    config.mode,
    config.mode === 'single' ? config.singlePosition : config.density,
    aspect,
    imageAspect,
  ]);
  const seed = hash(photoId + configFingerprint);
  let randomState = seed;
  const random = () => {
    randomState = (Math.imul(1664525, randomState) + 1013904223) >>> 0;
    return randomState / 4294967296;
  };
  const base = { photoId, algorithmVersion: 1 as const, configFingerprint, seed };
  if (config.kind === 'text' && !config.text.trim()) return { ...base, rectangles: [] };
  const height = config.kind === 'image' ? Math.min(0.22, (0.24 * aspect) / imageAspect) : 0.045;
  const width =
    config.kind === 'image'
      ? (height / aspect) * imageAspect
      : Math.max(
          0.04,
          ([...config.text].reduce((sum, char) => sum + (char.charCodeAt(0) > 255 ? 1 : 0.65), 0) *
            0.025) /
            aspect +
            0.015,
        );
  if (width > 0.9 || height > 0.9) return null;
  if (config.mode === 'single') {
    const position = config.singlePosition;
    return {
      ...base,
      rectangles: [
        {
          x:
            position === 'center'
              ? (1 - width) / 2
              : position.endsWith('left')
                ? 0.03
                : 0.97 - width,
          y:
            position === 'center'
              ? (1 - height) / 2
              : position.startsWith('top')
                ? 0.03
                : 0.97 - height,
          width,
          height,
        },
      ],
    };
  }
  const count = { low: 5, medium: 10, high: 20 }[config.density];
  const columns = Math.ceil(Math.sqrt(count)),
    rows = Math.ceil(count / columns);
  const cellWidth = 0.94 / columns,
    cellHeight = 0.94 / rows;
  if (width + 0.01 > cellWidth || height + 0.01 > cellHeight) return null;
  return {
    ...base,
    rectangles: Array.from({ length: count }, (_, index) => ({
      x: 0.03 + (index % columns) * cellWidth + random() * (cellWidth - width),
      y: 0.03 + Math.floor(index / columns) * cellHeight + random() * (cellHeight - height),
      width,
      height,
    })),
  };
}

export function resolveWatermarkArrangement(
  generated: WatermarkArrangement,
  stored: WatermarkArrangement | null,
): WatermarkArrangement {
  return stored?.photoId === generated.photoId &&
    stored.algorithmVersion === generated.algorithmVersion &&
    stored.configFingerprint === generated.configFingerprint
    ? stored
    : generated;
}
