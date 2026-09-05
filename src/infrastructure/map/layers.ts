export const MAP_LAYERS = [
  { id: 'EMAP5', label: '標準地圖', detail: '臺灣通用電子地圖（含等高線）' },
  { id: 'PHOTO2', label: '衛星／正射影像', detail: 'NLSC 正射影像，非即時衛星影像' },
  { id: 'B5000', label: '地形圖', detail: '1/5000 基本地形圖' },
] as const;
export type MapLayerId = (typeof MAP_LAYERS)[number]['id'];
export const MAP_MIN_ZOOM = 0;
export const MAP_MAX_ZOOM = 18;
export function layerUrl(id: MapLayerId): string {
  if (!MAP_LAYERS.some((layer) => layer.id === id)) throw new Error('Unknown map layer.');
  return `https://wmts.nlsc.gov.tw/wmts/${id}/default/GoogleMapsCompatible/{z}/{y}/{x}`;
}
