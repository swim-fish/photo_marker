import type { EditorCoordinateFormat } from '../templates/types';

/** Preserve all characters and break only between complete coordinate components. */
export function coordinateParts(text: string, format: EditorCoordinateFormat): string[] {
  if (format === 'MGRS') return [text];
  const comma = text.indexOf(',');
  return comma < 0 ? [text] : [text.slice(0, comma + 1), text.slice(comma + 1)];
}

/** MGRS precision is the number of digits per axis, not a GPS accuracy estimate. */
export const mgrsPrecisionOptions = [0, 1, 2, 3, 4, 5].map((precision) => {
  const meters = 10 ** (5 - precision);
  const length = meters.toLocaleString('en-US');
  return { precision, meters, label: `${precision} 位／軸 · ${length} × ${length} m` };
});
