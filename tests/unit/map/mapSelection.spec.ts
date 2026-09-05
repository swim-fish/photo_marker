import { describe, expect, it } from 'vitest';
import { MapSelection } from '../../../src/domain/map/mapSelection';
import { replaceWorkingCoordinate } from '../../../src/domain/coordinates/workingCoordinate';
import { isRuntimeRequestAllowed } from '../../../src/infrastructure/pwa/serviceWorkerPolicy';
describe('location candidates', () => {
  it('ignores stale requests and never confirms an unsettled map', () => {
    const state = new MapSelection({ latitude: 25, longitude: 121 });
    const old = state.startRequest();
    state.cancel();
    expect(state.resolve(old, { latitude: 30, longitude: 120 })).toBe(false);
    state.move();
    expect(state.confirm()).toBeNull();
    state.settle({ latitude: 0, longitude: 0 });
    expect(state.confirm()).toEqual({ latitude: 0, longitude: 0 });
  });
  it('accepts a valid zero coordinate and unknown current accuracy', () => {
    expect(
      replaceWorkingCoordinate(null, {
        id: 'c',
        photoId: 'p',
        latitude: 0,
        longitude: 0,
        provenance: 'CURRENT_GPS',
        inputFormat: 'DEVICE_WGS84',
        displayFormat: 'WGS84_DD',
        accuracyMeters: null,
        acquiredAt: '2026-09-05T00:00:00Z',
      }).ok,
    ).toBe(true);
  });
  it('allows only three exact tile paths with consent', () => {
    for (const layer of ['EMAP5', 'PHOTO2', 'B5000']) {
      const url = `https://wmts.nlsc.gov.tw/wmts/${layer}/default/GoogleMapsCompatible/16/28000/54000`;
      expect(isRuntimeRequestAllowed(url, 'https://local.test', true)).toBe(true);
      expect(isRuntimeRequestAllowed(url, 'https://local.test', false)).toBe(false);
    }
    expect(
      isRuntimeRequestAllowed('https://wmts.nlsc.gov.tw/private', 'https://local.test', true),
    ).toBe(false);
  });
});
