import type { Wgs84Coordinate } from '../../domain/coordinates/types';
import {
  DEFAULT_BASEMAP,
  layerUrl,
  mapSource,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  wheelZoomDelta,
  type MapLayerId,
  type MapOverlayId,
} from './layers';
export const EMAP5_PROVIDER_ID = 'nlsc-emap5' as const;
export const EMAP5_TILE_URL = layerUrl('nlsc-emap5');
export const EMAP5_SERVICE_URL = 'https://maps.nlsc.gov.tw/S09SOA/';
export const EMAP5_INITIAL_ZOOM = 16;
export const EMAP5_MAX_ZOOM = MAP_MAX_ZOOM;
export type Emap5PreviewOptions = Readonly<{
  onTileError?: () => void;
  onTileLoad?: () => void;
  onOverlayError?: () => void;
  onOverlayLoad?: () => void;
  onMoving?: () => void;
  onCenterChanged?: (center: Wgs84Coordinate) => void;
  onZoomChanged?: (zoom: number) => void;
  canLoad?: () => boolean;
}>;
export type Emap5PreviewHandle = Readonly<{
  destroy: () => void;
  setLayer?: (layer: MapLayerId) => void;
  setOverlay?: (enabled: boolean) => void;
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
    zoom: EMAP5_INITIAL_ZOOM,
    minZoom: MAP_MIN_ZOOM,
    maxZoom: MAP_MAX_ZOOM,
    scrollWheelZoom: false,
    touchZoom: 'center',
    doubleClickZoom: 'center',
    zoomSnap: 0,
  });
  let destroyed = false;
  const slots: {
    base: import('leaflet').TileLayer | null;
    overlay: import('leaflet').TileLayer | null;
  } = { base: null, overlay: null };
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
  function replace(slot: 'base' | 'overlay', id: MapLayerId | MapOverlayId | null): void {
    if (destroyed || (options.canLoad && !options.canLoad())) return;
    const old = slots[slot];
    if (old) {
      map.removeLayer(old);
      old.off();
      slots[slot] = null;
    }
    if (!id) return;
    const source = mapSource(id);
    let failed = false;
    const tiles = L.tileLayer(source.url, {
      tileSize: 256,
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      maxNativeZoom: source.maxNativeZoom,
      crossOrigin: 'anonymous',
      referrerPolicy: id === 'osm-standard' ? 'strict-origin' : 'no-referrer',
      detectRetina: false,
      updateWhenIdle: true,
      keepBuffer: 0,
      zIndex: slot === 'base' ? 1 : 2,
    });
    slots[slot] = tiles;
    tiles.on('tileerror', () => {
      if (!destroyed && slots[slot] === tiles) {
        failed = true;
        (slot === 'base' ? options.onTileError : options.onOverlayError)?.();
      }
    });
    tiles.on('load', () => {
      if (!destroyed && slots[slot] === tiles && !failed)
        (slot === 'base' ? options.onTileLoad : options.onOverlayLoad)?.();
    });
    tiles.addTo(map);
  }
  function zoomBy(delta: number, animate: boolean): void {
    if (destroyed || !Number.isFinite(delta) || Math.abs(delta) < 1e-6) return;
    const zoom = Math.min(MAP_MAX_ZOOM, Math.max(MAP_MIN_ZOOM, map.getZoom() + delta));
    map.setView(map.getCenter(), zoom, { animate });
  }
  const wheel = (event: WheelEvent) => {
    event.preventDefault();
    zoomBy(wheelZoomDelta(event.deltaY), false);
  };
  container.addEventListener('wheel', wheel, { passive: false });
  replace('base', DEFAULT_BASEMAP);
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
    setLayer: (id) => replace('base', id),
    setOverlay: (enabled) => replace('overlay', enabled ? 'google-road-overlay' : null),
    zoomBy: (delta) =>
      zoomBy(delta, !window.matchMedia('(prefers-reduced-motion: reduce)').matches),
    panBy: (x, y) => map.panBy([x, y]),
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      observer?.disconnect();
      container.removeEventListener('wheel', wheel);
      map.remove();
      slots.base?.off();
      slots.overlay?.off();
      container.replaceChildren();
    },
  };
};
