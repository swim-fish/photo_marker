import type { Wgs84Coordinate } from '../../domain/coordinates/types';
import { layerUrl, MAP_MAX_ZOOM, type MapLayerId } from './layers';
export const EMAP5_PROVIDER_ID = 'nlsc-emap5' as const;
export const EMAP5_TILE_URL = layerUrl('EMAP5');
export const EMAP5_SERVICE_URL = 'https://maps.nlsc.gov.tw/S09SOA/';
export const EMAP5_INITIAL_ZOOM = 16;
export const EMAP5_MAX_ZOOM = MAP_MAX_ZOOM;
export type Emap5PreviewOptions = Readonly<{
  onTileError?: () => void;
  onTileLoad?: () => void;
  onMoving?: () => void;
  onCenterChanged?: (center: Wgs84Coordinate) => void;
  onZoomChanged?: (zoom: number) => void;
  canLoad?: () => boolean;
}>;
export type Emap5PreviewHandle = Readonly<{
  destroy: () => void;
  setLayer?: (layer: MapLayerId) => void;
  zoomBy?: (delta: number) => void;
  panBy?: (x: number, y: number) => void;
}>;
export type CreateEmap5Preview = (
  container: HTMLElement,
  center: Wgs84Coordinate,
  options?: Emap5PreviewOptions,
) => Promise<Emap5PreviewHandle>;
export const createEmap5Preview: CreateEmap5Preview = async (container, center, options = {}) => {
  const L = await import('leaflet');
  await import('leaflet/dist/leaflet.css');
  if (options.canLoad && !options.canLoad()) return { destroy: () => undefined };
  const map = L.map(container, {
    attributionControl: false,
    zoomControl: false,
    center: [center.latitude, center.longitude],
    zoom: 16,
    minZoom: 0,
    maxZoom: 18,
  });
  let tiles: import('leaflet').TileLayer | null = null;
  let destroyed = false;
  let layerGeneration = 0;
  function settled(): void {
    const p = map.getCenter();
    options.onCenterChanged?.({
      latitude: p.lat,
      longitude: ((((p.lng + 180) % 360) + 360) % 360) - 180,
    });
    options.onZoomChanged?.(map.getZoom());
  }
  map.on('movestart zoomstart', () => options.onMoving?.());
  map.on('moveend zoomend', settled);
  function setLayer(id: MapLayerId): void {
    if (destroyed || (options.canLoad && !options.canLoad())) return;
    if (tiles) {
      tiles.off();
      map.removeLayer(tiles);
    }
    const currentLayer = ++layerGeneration;
    let failed = false;
    tiles = L.tileLayer(layerUrl(id), {
      tileSize: 256,
      minZoom: 0,
      maxZoom: 18,
      maxNativeZoom: 18,
      crossOrigin: 'anonymous',
      referrerPolicy: 'no-referrer',
      detectRetina: false,
      updateWhenIdle: true,
      keepBuffer: 0,
    });
    tiles.on('tileerror', () => {
      if (!destroyed && currentLayer === layerGeneration) {
        failed = true;
        options.onTileError?.();
      }
    });
    tiles.on('load', () => {
      if (!destroyed && currentLayer === layerGeneration && !failed) options.onTileLoad?.();
    });
    tiles.addTo(map);
  }
  setLayer('EMAP5');
  const observer =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => {
          if (!destroyed) {
            const center = map.getCenter();
            map.invalidateSize({ pan: false });
            map.setView(center, map.getZoom(), { animate: false });
          }
        })
      : null;
  observer?.observe(container);
  return {
    setLayer,
    zoomBy: (delta) => map.setZoom(Math.min(18, Math.max(0, map.getZoom() + delta))),
    panBy: (x, y) => map.panBy([x, y]),
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      observer?.disconnect();
      tiles?.off();
      map.remove();
      container.replaceChildren();
    },
  };
};
