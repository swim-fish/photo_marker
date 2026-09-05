import type { OverlayCorner } from '../overlays/types';
import { defaultWatermark, type WatermarkConfig } from '../watermarks/types';

export type CanonicalColor = Readonly<{ red: number; green: number; blue: number; alpha: number }>;
export type CornerTexts = Record<OverlayCorner, string>;
export type EditorAppearance = Readonly<{
  fontSize: number;
  textColor: CanonicalColor;
  backgroundColor: CanonicalColor;
  padding: number;
  cornerRadius: number;
}>;
export type EditorCoordinateFormat = 'WGS84_DD' | 'TWD97_TM2' | 'MGRS';
export type AnnotationTemplate = Readonly<{
  id: string;
  version: 1;
  name: string;
  appearance: EditorAppearance;
  coordinateFormat: EditorCoordinateFormat;
  coordinateCorner: OverlayCorner;
  zone: 119 | 121;
  precision: number;
  watermark: WatermarkConfig;
  defaultTexts?: CornerTexts;
}>;
export type EditorPreferences = Readonly<{
  version: 1;
  defaultTemplateId?: string;
  cornerTexts: CornerTexts;
}>;
export const emptyCornerTexts = (): CornerTexts => ({
  'top-left': '',
  'top-right': '',
  'bottom-left': '',
  'bottom-right': '',
});
export const defaultTemplate: AnnotationTemplate = {
  id: 'outdoor',
  version: 1,
  name: '戶外紀錄',
  appearance: {
    fontSize: 14 / 390,
    textColor: { red: 255, green: 255, blue: 255, alpha: 1 },
    backgroundColor: { red: 24, green: 53, blue: 47, alpha: 0.85 },
    padding: 8 / 390,
    cornerRadius: 6 / 390,
  },
  coordinateFormat: 'WGS84_DD',
  coordinateCorner: 'bottom-left',
  zone: 121,
  precision: 5,
  watermark: defaultWatermark,
};
