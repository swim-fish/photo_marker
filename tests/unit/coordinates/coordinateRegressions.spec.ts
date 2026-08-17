import { describe, expect, test } from 'vitest';
import {
  parseCoordinateInput,
  twd67ToTwd97,
  twd97ToTwd67,
  wgs84ToTwd97,
  makeWgs84,
  parseMGRS,
  taipowerToTwd67,
} from '../../../src/domain/coordinates';

describe('coordinate regressions', () => {
  test('TWD97 auto-resolution remains visible for zone 121', () => {
    const result = parseCoordinateInput('306962.887, 2769619.124', { format: 'TWD97_TM2' });
    expect(result.ok).toBe(true);
    if (result.ok)
      expect({ zone: result.value.zone, auto: result.value.zoneAutoResolved }).toEqual({
        zone: 121,
        auto: true,
      });
  });

  test('TWD67 four-parameter transform stays within the approved 3 m / 6 m tolerances', () => {
    const tm97 = wgs84ToTwd97(makeWgs84(25.033611, 121.564472), 121);
    const tm67 = twd97ToTwd67(tm97);
    expect(tm67.easting).toBeCloseTo(306132.271, 0);
    expect(tm67.northing).toBeCloseTo(2769822.821, 0);
    const back = twd67ToTwd97(tm67);
    expect(Math.abs(back.easting - tm97.easting)).toBeLessThanOrEqual(6);
    expect(Math.abs(back.northing - tm97.northing)).toBeLessThanOrEqual(6);
  });

  test('MGRS inverse returns the southwest cell corner, never the center', () => {
    const value = parseMGRS('51RUH5517069437');
    expect(value.semantics).toBe('southwest-cell-corner');
    const result = parseCoordinateInput('51RUH5517069437', { format: 'MGRS' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.latitude).toBe(value.southwest.latitude);
      expect(result.value.longitude).toBe(value.southwest.longitude);
    }
  });

  test.each(['Y', 'Z', 'I', 'S', 'X'] as const)(
    'Taipower unsupported cell %s is typed out-of-coverage',
    (region) => {
      const result = taipowerToTwd67({
        kind: 'taipower',
        region,
        subRegion: '0000',
        hundredMeter: 'AA',
        tenMeter: '00',
        oneMeter: null,
        precision: 9,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('out-of-coverage');
    },
  );
});
