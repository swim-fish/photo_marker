// Source catalogue adapted from swim-fish/pwa_map at a8fb5b8 (MIT).
export type MapLayerId =
  | 'osm-standard'
  | 'nlsc-emap5'
  | 'google-hybrid'
  | 'google-satellite'
  | 'google-terrain'
  | 'google-roadmap';
export type MapOverlayId = 'google-road-overlay';
export type MapSource = Readonly<{
  id: MapLayerId | MapOverlayId;
  label: string;
  group: 'other' | 'nlsc' | 'google';
  url: string;
  maxNativeZoom: number;
  attribution: string;
  attributionUrl: string;
}>;
const google = (id: MapLayerId | MapOverlayId, label: string, code: string): MapSource => ({
  id,
  label,
  group: 'google',
  url: `https://mt1.google.com/vt/lyrs=${code}&x={x}&y={y}&z={z}${code === 's' ? '' : '&hl=zh-TW'}`,
  maxNativeZoom: 20,
  attribution: '© Google',
  attributionUrl: 'https://www.google.com/intl/zh-TW/help/terms_maps/',
});
export const MAP_LAYERS: readonly MapSource[] = [
  {
    id: 'osm-standard',
    label: 'OpenStreetMap',
    group: 'other',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxNativeZoom: 19,
    attribution: '© OpenStreetMap contributors',
    attributionUrl: 'https://www.openstreetmap.org/copyright',
  },
  {
    id: 'nlsc-emap5',
    label: '臺灣通用電子地圖',
    group: 'nlsc',
    url: 'https://wmts.nlsc.gov.tw/wmts/EMAP5/default/GoogleMapsCompatible/{z}/{y}/{x}',
    maxNativeZoom: 19,
    attribution: '內政部國土測繪中心 NLSC',
    attributionUrl: 'https://maps.nlsc.gov.tw/S09SOA/',
  },
  google('google-hybrid', 'Google 衛星混合', 'y'),
  google('google-satellite', 'Google 衛星', 's'),
  google('google-terrain', 'Google 地形', 'p'),
  google('google-roadmap', 'Google 道路', 'm'),
];
export const MAP_OVERLAYS: readonly MapSource[] = [
  google('google-road-overlay', 'Google 路網疊加層', 'h'),
];
export const DEFAULT_BASEMAP: MapLayerId = 'osm-standard';
export const MAP_MIN_ZOOM = 0;
export const MAP_MAX_ZOOM = 20;
export function mapSource(id: MapLayerId | MapOverlayId): MapSource {
  const source = [...MAP_LAYERS, ...MAP_OVERLAYS].find((source) => source.id === id);
  if (!source) throw new Error('Unknown map source.');
  return source;
}
export function layerUrl(id: MapLayerId | MapOverlayId): string {
  return mapSource(id).url;
}
export function wheelZoomDelta(deltaY: number): number {
  return Number.isFinite(deltaY) ? Math.max(-1, Math.min(1, -deltaY / 100)) : 0;
}
export function isMapTileUrl(url: URL): boolean {
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash
  )
    return false;
  let match: RegExpExecArray | null, z: number, x: number, y: number, max: number;
  if (url.hostname === 'tile.openstreetmap.org') {
    match = /^\/(\d+)\/(\d+)\/(\d+)\.png$/.exec(url.pathname);
    if (!match) return false;
    [z, x, y] = match.slice(1).map(Number);
    max = 19;
  } else if (url.hostname === 'wmts.nlsc.gov.tw') {
    match = /^\/wmts\/EMAP5\/default\/GoogleMapsCompatible\/(\d+)\/(\d+)\/(\d+)$/.exec(
      url.pathname,
    );
    if (!match) return false;
    [z, y, x] = match.slice(1).map(Number);
    max = 19;
  } else if (url.hostname === 'mt1.google.com') {
    match = /^\/vt\/lyrs=([yspmh])&x=(\d+)&y=(\d+)&z=(\d+)(&hl=zh-TW)?$/.exec(url.pathname);
    if (!match || (match[1] !== 's') !== Boolean(match[5])) return false;
    [x, y, z] = match.slice(2, 5).map(Number);
    max = 20;
  } else return false;
  return z >= 0 && z <= max && x >= 0 && y >= 0 && x < 2 ** z && y < 2 ** z;
}
