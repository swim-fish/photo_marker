import type { Wgs84Coordinate } from '../../domain/coordinates/types';

export const EMAP5_PROVIDER_ID = 'nlsc-emap5' as const;
export const EMAP5_TILE_URL =
  'https://wmts.nlsc.gov.tw/wmts/EMAP5/default/GoogleMapsCompatible/{z}/{y}/{x}';
export const EMAP5_SERVICE_URL = 'https://maps.nlsc.gov.tw/S09SOA/';
export const EMAP5_INITIAL_ZOOM = 16;
export const EMAP5_MAX_ZOOM = 19;

export type Emap5PreviewOptions = Readonly<{
  onTileError?: () => void;
  onTileLoad?: () => void;
}>;

export type Emap5PreviewHandle = Readonly<{
  destroy: () => void;
}>;

export type CreateEmap5Preview = (
  container: HTMLElement,
  center: Wgs84Coordinate,
  options?: Emap5PreviewOptions,
) => Promise<Emap5PreviewHandle>;

export const createEmap5Preview: CreateEmap5Preview = async (container, center, options = {}) => {
  const L = await import('leaflet');
  await import('leaflet/dist/leaflet.css');

  const map = L.map(container, {
    attributionControl: false,
    center: [center.latitude, center.longitude],
    zoom: EMAP5_INITIAL_ZOOM,
    minZoom: 0,
    maxZoom: EMAP5_MAX_ZOOM,
  });
  const tiles = L.tileLayer(EMAP5_TILE_URL, {
    tileSize: 256,
    minZoom: 0,
    maxZoom: EMAP5_MAX_ZOOM,
    maxNativeZoom: EMAP5_MAX_ZOOM,
    crossOrigin: 'anonymous',
    referrerPolicy: 'no-referrer',
    detectRetina: false,
    updateWhenIdle: true,
    keepBuffer: 1,
  });
  if (options.onTileError) tiles.on('tileerror', options.onTileError);
  if (options.onTileLoad) tiles.on('tileload', options.onTileLoad);
  tiles.addTo(map);
  L.circleMarker([center.latitude, center.longitude], {
    radius: 7,
    color: '#f8fafc',
    weight: 3,
    fillColor: '#1d4ed8',
    fillOpacity: 1,
    interactive: false,
  }).addTo(map);

  let destroyed = false;
  return {
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      map.remove();
      container.replaceChildren();
    },
  };
};
