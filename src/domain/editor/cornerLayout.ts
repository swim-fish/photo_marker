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
  const fontSize = appearance.fontSize * dimensions.height;
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
    const lines: string[] = [];
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
    const width = (Math.max(...lines.map(widthOf), fontSize) + padding * 2) / dimensions.width;
    const height = (lines.length * fontSize * 1.5 + padding * 2) / dimensions.height;
    if (height > 0.9 || width > 0.44) return failure('invalid-layout');
    const placement = findCornerPlacement({ x: 0, y: 0, width, height }, overlays, entry.corner);
    if (!placement) return failure('invalid-layout');
    overlays.push(
      createOverlay({
        id: `${photoId}-${entry.coordinate ? 'coordinate' : entry.corner}`,
        photoId,
        role: entry.coordinate ? 'coordinate' : 'freeform',
        content: lines.join('\n'),
        fontFamily: 'Noto Sans TC',
        ...appearance,
        lineHeight: 1.5,
        order: overlays.length,
        placementCorner: entry.corner,
        ...placement,
      }),
    );
  }
  return success(overlays);
}
