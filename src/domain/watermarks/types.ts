import type { OverlayCorner, OverlayGeometry } from '../overlays/types';

export type WatermarkConfig = Readonly<{
  enabled: boolean;
  kind: 'text' | 'image';
  text: string;
  assetId?: string;
  opacity: number;
  mode: 'single' | 'repeat';
  singlePosition: OverlayCorner | 'center';
  density: 'low' | 'medium' | 'high';
}>;
export type WatermarkArrangement = Readonly<{
  photoId: string;
  algorithmVersion: 1;
  configFingerprint: string;
  seed: number;
  rectangles: readonly OverlayGeometry[];
}>;
export type WatermarkAsset = Readonly<{
  id: string;
  version: 1;
  mime: 'image/png';
  blob: Blob;
  sourceBytes: ArrayBuffer;
  width: number;
  height: number;
  digest: string;
}>;
export const defaultWatermark: WatermarkConfig = {
  enabled: false,
  kind: 'text',
  text: '',
  opacity: 0.25,
  mode: 'single',
  singlePosition: 'bottom-right',
  density: 'medium',
};

export type WatermarkRenderLayer = Readonly<{
  config: WatermarkConfig;
  arrangement: WatermarkArrangement;
  assets: readonly WatermarkAsset[];
}>;
