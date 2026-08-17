import { describe, expect, test } from 'vitest';
import { formatCoordinate } from '../../../src/domain/coordinates/formatCoordinate';
import { parseCoordinateInput } from '../../../src/domain/coordinates/parseCoordinateInput';

describe('parseCoordinateInput', () => {
  test.each([
    ['WGS84_DD', '25.033611, 121.564472', 25.033611, 121.564472],
    ['WGS84_DD', 'N 25.033611, E 121.564472', 25.033611, 121.564472],
    ['WGS84_DMS', '25°2′1″ N, 121°33′52.099″ E', 25.033611, 121.564472],
  ] as const)('%s accepts valid WGS84 input', (format, raw, latitude, longitude) => {
    const result = parseCoordinateInput(raw, { format });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.latitude).toBeCloseTo(latitude, 5);
      expect(result.value.longitude).toBeCloseTo(longitude, 5);
      expect(result.value.inputFormat).toBe(format);
    }
  });

  test('accepts TWD97 without a zone and surfaces the inferred zone', () => {
    const result = parseCoordinateInput('306962.887, 2769619.124', { format: 'TWD97_TM2' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.zone).toBe(121);
      expect(result.value.zoneAutoResolved).toBe(true);
      expect(result.value.latitude).toBeCloseTo(25.033611, 4);
    }
  });

  test('accepts explicit TWD97 zone 119', () => {
    const result = parseCoordinateInput('307778.298, 2606963.573', {
      format: 'TWD97_TM2',
      zone: 119,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.zone).toBe(119);
  });

  test('accepts TWD67 zone 121 and normalizes to WGS84', () => {
    const result = parseCoordinateInput('306132.271, 2769822.821', { format: 'TWD67_TM2' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.zone).toBe(121);
      expect(result.value.latitude).toBeCloseTo(25.033611, 4);
      expect(result.value.longitude).toBeCloseTo(121.564472, 4);
    }
  });

  test('accepts MGRS precision five and records precision', () => {
    const result = parseCoordinateInput('51RUH5517069437', { format: 'MGRS' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.precision).toBe(5);
      expect(result.value.latitude).toBeLessThan(25.033611);
      expect(result.value.longitude).toBeLessThan(121.564472);
    }
  });

  test('accepts Taipower 9-character input and records precision', () => {
    const result = parseCoordinateInput('B7039 BD32', { format: 'TAIPOWER' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.precision).toBe(9);
  });

  test('rejects a DMS sign that contradicts its hemisphere', () => {
    const result = parseCoordinateInput('-25°2′1″ N, 121°33′52.099″ E', {
      format: 'WGS84_DMS',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('malformed');
  });

  test.each(['TWD97_TM2', 'TWD67_TM2'] as const)(
    'rejects trailing non-numeric content in %s values',
    (format) => {
      const result = parseCoordinateInput('306962.887m, 2769619.124', { format });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('malformed');
    },
  );

  test.each([
    ['WGS84_DD', 'not a coordinate', 'malformed'],
    ['WGS84_DD', '95, 121', 'out-of-range'],
    ['WGS84_DMS', '25°61′1″ N, 121°33′52″ E', 'out-of-range'],
    ['TWD97_TM2', '306962.887', 'malformed'],
    ['MGRS', '51RUH55170', 'unsupported-precision'],
    ['TAIPOWER', 'Y1234 AB56', 'out-of-coverage'],
  ] as const)('%s returns typed %s failure', (format, raw, code) => {
    const result = parseCoordinateInput(raw, { format });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(code);
  });

  test('does not fabricate a coordinate for unsupported Taipower cells', () => {
    const result = parseCoordinateInput('I0000 AA00', { format: 'TAIPOWER' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('out-of-coverage');
    }
  });

  test('formats the canonical coordinate with visible format metadata', () => {
    const parsed = parseCoordinateInput('25.033611, 121.564472', { format: 'WGS84_DD' });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const formats = [
      ['WGS84_DD', '25.033611, 121.564472'],
      ['WGS84_DMS', '25° 02′ 01.000″ N, 121° 33′ 52.099″ E'],
      ['TWD97_TM2', 'E 306962.887, N 2769619.124 (zone 121)'],
      ['TWD67_TM2', 'E 306132.271, N 2769822.821'],
      ['MGRS', '51R UH 55170 69437'],
      ['TAIPOWER', 'B7039 BD32'],
    ] as const;
    for (const [format, text] of formats) {
      const result = formatCoordinate(parsed.value, format);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.format).toBe(format);
        expect(result.value.text).toBe(text);
      }
    }
  });

  test('reports Taiwan-specific display coverage without replacing WGS84', () => {
    const result = formatCoordinate({ latitude: 30, longitude: 130 }, 'TAIPOWER');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('out-of-coverage');
  });

  test('carries rounded DMS seconds into minutes instead of displaying 60 seconds', () => {
    const latitude = 12 + 34 / 60 + 59.9996 / 3600;
    const result = formatCoordinate({ latitude, longitude: 121 }, 'WGS84_DMS');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.text).toContain('12° 35′ 00.000″ N');
      expect(result.value.text).not.toContain('60.000″');
    }
  });
});
