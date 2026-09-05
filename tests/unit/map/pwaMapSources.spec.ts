import { describe, expect, it } from 'vitest';
import {
  MAP_LAYERS,
  MAP_OVERLAYS,
  DEFAULT_BASEMAP,
  layerUrl,
} from '../../../src/infrastructure/map/layers';
import { isRuntimeRequestAllowed } from '../../../src/infrastructure/pwa/serviceWorkerPolicy';
describe('pwa_map source catalogue and boundary', () => {
  it('uses the six upstream basemaps and independent road overlay', () => {
    expect(DEFAULT_BASEMAP).toBe('osm-standard');
    expect(MAP_LAYERS.map((x) => x.id)).toEqual([
      'osm-standard',
      'nlsc-emap5',
      'google-hybrid',
      'google-satellite',
      'google-terrain',
      'google-roadmap',
    ]);
    expect(MAP_OVERLAYS.map((x) => x.id)).toEqual(['google-road-overlay']);
    expect(layerUrl('google-road-overlay')).toContain('lyrs=h');
  });
  it('allows exact configured tiles only with consent and valid matrix bounds', () => {
    const urls = [
      'https://tile.openstreetmap.org/19/0/0.png',
      'https://wmts.nlsc.gov.tw/wmts/EMAP5/default/GoogleMapsCompatible/19/0/0',
      'https://mt1.google.com/vt/lyrs=y&x=0&y=0&z=20&hl=zh-TW',
      'https://mt1.google.com/vt/lyrs=s&x=0&y=0&z=20',
    ];
    for (const url of urls) {
      expect(isRuntimeRequestAllowed(url, 'https://local', true)).toBe(true);
      expect(isRuntimeRequestAllowed(url, 'https://local', false)).toBe(false);
    }
    for (const url of [
      urls[0] + '?secret=x',
      urls[2] + '&key=secret',
      'https://mt1.google.com/vt/lyrs=y&x=1&y=0&z=0&hl=zh-TW',
      'https://tile.openstreetmap.org/20/0/0.png',
      'https://wmts.nlsc.gov.tw/wmts/PHOTO2/default/GoogleMapsCompatible/0/0/0',
    ])
      expect(isRuntimeRequestAllowed(url, 'https://local', true)).toBe(false);
  });
});
