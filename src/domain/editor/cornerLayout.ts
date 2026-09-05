import { coordinateParts } from '../coordinates/presentation';
import { failure, success, type Result } from '../result';
import { createOverlay } from '../overlays/overlayEditor';
import { findCornerPlacement } from '../overlays/placement';
import type { OverlayCorner, TextOverlay } from '../overlays/types';
import type { AnnotationTemplate, CornerTexts } from '../templates/types';
export function buildCornerOverlays(
  photoId: string,
  dimensions: { width: number; height: number },
  template: AnnotationTemplate,
  texts: CornerTexts,
  coordinateText: string,
  measure?: (text: string, fontSize: number) => number,
): Result<TextOverlay[], 'invalid-layout'> {
  const overlays: TextOverlay[] = [];
  const appearance = template.appearance;
  let fontSize = appearance.fontSize * dimensions.height;
  const padding = appearance.padding * Math.min(dimensions.width, dimensions.height);
  const maxWidth = 0.44 * dimensions.width;
  const widthOf = (text: string) =>
    measure
      ? measure(text, fontSize)
      : [...text].reduce((sum, char) => sum + (char.charCodeAt(0) > 255 ? 1 : 0.62) * fontSize, 0);
  const entries: { corner: OverlayCorner; text: string; coordinate: boolean }[] = Object.entries(
    texts,
  ).map(([corner, text]) => ({ corner: corner as OverlayCorner, text, coordinate: false }));
  if (coordinateText)
    entries.push({ corner: template.coordinateCorner, text: coordinateText, coordinate: true });
  for (const entry of entries) {
    if (!entry.text) continue;
    fontSize = appearance.fontSize * dimensions.height;
    const singleLine =
      entry.coordinate &&
      (template.coordinateFormat === 'MGRS' || template.coordinateWrap === 'nowrap');
    const widthLimit = entry.coordinate && singleLine ? 0.94 : 0.44;
    const available = widthLimit * dimensions.width;
    let lines: string[] = [];
    if (entry.coordinate) {
      const text = singleLine ? entry.text.replace(/\r?\n/g, ' ') : entry.text;
      lines =
        !singleLine && widthOf(text) + padding * 2 > maxWidth
          ? coordinateParts(text, template.coordinateFormat)
          : [text];
      lines = lines.flatMap((line) => line.split(/\r?\n/));
      // Reserve a small pixel margin before rounding geometry for the raster renderer.
      const measured = Math.max(...lines.map(widthOf));
      const innerWidth = available - padding * 2 - 2;
      if (innerWidth <= 0) return failure('invalid-layout');
      if (measured > innerWidth) fontSize *= innerWidth / measured;
      if (fontSize < 1) return failure('invalid-layout');
    } else
      for (const line of entry.text.split(/\r?\n/)) {
        let current = '';
        for (const char of line) {
          if (widthOf(char) + padding * 2 > maxWidth) return failure('invalid-layout');
          if (widthOf(current + char) + padding * 2 > maxWidth && current) {
            lines.push(current);
            current = '';
          }
          current += char;
          if (lines.length > 100) return failure('invalid-layout');
        }
        lines.push(current);
      }
    const width =
      Math.ceil(
        ((Math.max(...lines.map(widthOf), fontSize) + padding * 2 + (entry.coordinate ? 1 : 0)) /
          dimensions.width) *
          1000,
      ) / 1000;
    const height =
      Math.ceil(((lines.length * fontSize * 1.5 + padding * 2) / dimensions.height) * 1000) / 1000;
    if (height > 0.9 || width > widthLimit) return failure('invalid-layout');
    const placement = findCornerPlacement(
      { x: 0, y: 0, width, height },
      overlays,
      entry.corner,
      widthLimit,
    );
    if (!placement) return failure('invalid-layout');
    overlays.push(
      createOverlay({
        id: `${photoId}-${entry.coordinate ? 'coordinate' : entry.corner}`,
        photoId,
        role: entry.coordinate ? 'coordinate' : 'freeform',
        content: lines.join('\n'),
        fontFamily: 'Noto Sans TC',
        ...appearance,
        fontSize: fontSize / dimensions.height,
        lineHeight: 1.5,
        order: overlays.length,
        placementCorner: entry.corner,
        ...placement,
      }),
    );
  }
  return success(overlays);
}
