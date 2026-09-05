import { validColor } from '../overlays/color';
import { defaultTemplate, type AnnotationTemplate } from './types';

const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
export function sanitizeTemplate(input: unknown): AnnotationTemplate | null {
  if (!input || typeof input !== 'object') return null;
  const t = input as AnnotationTemplate;
  const a = t.appearance,
    w = t.watermark;
  if (
    t.version !== 1 ||
    typeof t.id !== 'string' ||
    !t.id.trim() ||
    typeof t.name !== 'string' ||
    !t.name.trim() ||
    [...t.name.trim()].length > 80 ||
    !a ||
    !w
  )
    return null;
  if (
    !['WGS84_DD', 'TWD97_TM2', 'MGRS'].includes(t.coordinateFormat) ||
    !corners.includes(t.coordinateCorner) ||
    (t.coordinateWrap !== undefined && !['auto', 'nowrap'].includes(t.coordinateWrap)) ||
    ![119, 121].includes(t.zone) ||
    !Number.isInteger(t.precision) ||
    t.precision < 0 ||
    t.precision > 5
  )
    return null;
  if (
    !a.textColor ||
    !a.backgroundColor ||
    !validColor(a.textColor) ||
    !validColor(a.backgroundColor) ||
    !Number.isFinite(a.fontSize) ||
    a.fontSize < 8 / 390 ||
    a.fontSize > 96 / 390 ||
    ![a.padding, a.cornerRadius].every((n) => Number.isFinite(n) && n >= 0 && n <= 40 / 390)
  )
    return null;
  if (
    typeof w.enabled !== 'boolean' ||
    !['text', 'image'].includes(w.kind) ||
    typeof w.text !== 'string' ||
    [...w.text].length > 120 ||
    !Number.isFinite(w.opacity) ||
    w.opacity < 0 ||
    w.opacity > 1 ||
    !['single', 'repeat'].includes(w.mode) ||
    ![...corners, 'center'].includes(w.singlePosition) ||
    !['low', 'medium', 'high'].includes(w.density) ||
    (w.kind === 'image' && w.mode !== 'single') ||
    (w.assetId !== undefined && typeof w.assetId !== 'string')
  )
    return null;
  if (
    t.defaultTexts !== undefined &&
    (!t.defaultTexts ||
      typeof t.defaultTexts !== 'object' ||
      corners.some(
        (corner) => typeof t.defaultTexts![corner as keyof typeof t.defaultTexts] !== 'string',
      ))
  )
    return null;
  const color = (value: typeof a.textColor) => ({
    red: value.red,
    green: value.green,
    blue: value.blue,
    alpha: value.alpha,
  });
  return {
    id: t.id,
    version: 1,
    name: t.name.trim(),
    ...(t.defaultTexts
      ? {
          defaultTexts: {
            'top-left': t.defaultTexts['top-left'],
            'top-right': t.defaultTexts['top-right'],
            'bottom-left': t.defaultTexts['bottom-left'],
            'bottom-right': t.defaultTexts['bottom-right'],
          },
        }
      : {}),
    coordinateFormat: t.coordinateFormat,
    coordinateCorner: t.coordinateCorner,
    coordinateWrap: t.coordinateWrap ?? 'auto',
    zone: t.zone,
    precision: t.precision,
    appearance: {
      fontSize: a.fontSize,
      textColor: color(a.textColor),
      backgroundColor: color(a.backgroundColor),
      padding: a.padding,
      cornerRadius: a.cornerRadius,
    },
    watermark: {
      enabled: w.enabled,
      kind: w.kind,
      text: w.text,
      ...(w.assetId ? { assetId: w.assetId } : {}),
      opacity: w.opacity,
      mode: w.mode,
      singlePosition: w.singlePosition,
      density: w.density,
    },
  };
}
export function applyTemplate<T extends { template: AnnotationTemplate }>(
  template: unknown,
  current: T,
): T | null {
  const clean = sanitizeTemplate(template);
  return clean
    ? {
        ...current,
        template: clean,
        ...(clean.defaultTexts ? { texts: { ...clean.defaultTexts } } : {}),
      }
    : null;
}
export const builtinTemplates: readonly AnnotationTemplate[] = [
  defaultTemplate,
  {
    ...defaultTemplate,
    id: 'survey',
    name: '現場測繪',
    coordinateFormat: 'TWD97_TM2',
    appearance: {
      ...defaultTemplate.appearance,
      backgroundColor: { red: 15, green: 23, blue: 42, alpha: 0.85 },
      cornerRadius: 0,
    },
  },
  {
    ...defaultTemplate,
    id: 'minimal',
    name: '簡約標記',
    appearance: {
      ...defaultTemplate.appearance,
      backgroundColor: { red: 0, green: 0, blue: 0, alpha: 0.35 },
      padding: 4 / 390,
    },
  },
];
