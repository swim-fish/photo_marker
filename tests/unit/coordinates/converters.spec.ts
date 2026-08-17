import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import vectorsFile from '../fixtures/test-vectors.json';
import {
  formatMGRS,
  formatTaipower,
  makeWgs84,
  parseMGRS,
  twd67ToTwd97,
  twd97ToTwd67,
  twd97ToWgs84,
  taipowerToTwd67,
  wgs84ToMGRS,
  wgs84ToTaipower,
  wgs84ToTwd67,
  wgs84ToTwd97,
} from '../../../src/domain/coordinates/converters';
import type { Easting, Northing } from '../../../src/domain/coordinates/converters/types';

type Vector = {
  id: string;
  direction: string;
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
  tolerance: { value: number; unit: string };
};

const vectors = (vectorsFile as { vectors: Vector[] }).vectors;
const fixturePath = resolve(process.cwd(), 'tests/unit/fixtures/test-vectors.json');
const digestPath = resolve(process.cwd(), 'tests/unit/fixtures/vectors-digest.txt');

describe('approved coordinate fixture integrity', () => {
  test('matches the pinned SHA-256 digest', () => {
    const digest = createHash('sha256').update(readFileSync(fixturePath)).digest('hex');
    const expected = readFileSync(digestPath, 'utf8').trim().split(/\s+/)[0];
    expect(digest).toBe(expected);
  });

  test('retains the approved MIT reference metadata', () => {
    expect(vectorsFile.version).toBe('2.0.0');
    expect(vectorsFile.license).toBe('MIT');
    expect(vectorsFile.attribution).toContain('TacMap TW contributors');
  });
});

describe('WGS84 and TM2 converters', () => {
  test.each(vectors.filter((vector) => vector.direction === 'WGS84_TO_TM2'))(
    '$id matches the approved TM2 vector',
    (vector) => {
      const input = vector.input as { lat: number; lon: number };
      const expected = vector.expected as { easting: number; northing: number; zone: string };
      const result = wgs84ToTwd97(
        makeWgs84(input.lat, input.lon),
        Number(expected.zone) as 119 | 121,
      );
      expect(result.zone).toBe(Number(expected.zone));
      expect(result.easting).toBeCloseTo(expected.easting, 1);
      expect(result.northing).toBeCloseTo(expected.northing, 1);
      expect(twd97ToWgs84(result).lat).toBeCloseTo(input.lat, 5);
      expect(twd97ToWgs84(result).lon).toBeCloseTo(input.lon, 5);
    },
  );

  test.each(vectors.filter((vector) => vector.direction === 'TWD97_TO_TWD67'))(
    '$id matches the four-parameter TWD67 vector',
    (vector) => {
      const input = vector.input as { easting: number; northing: number };
      const expected = vector.expected as { easting: number; northing: number };
      const result = twd97ToTwd67({
        kind: 'twd97-tm2',
        easting: input.easting as Easting,
        northing: input.northing as Northing,
        zone: 121,
      });
      expect(result.easting).toBeCloseTo(expected.easting, 0);
      expect(result.northing).toBeCloseTo(expected.northing, 0);
      const inverse = twd67ToTwd97(result);
      expect(inverse.easting).toBeCloseTo(input.easting, -1);
      expect(inverse.northing).toBeCloseTo(input.northing, -1);
    },
  );

  test('converts WGS84 to TWD67 through the zone-121 transform', () => {
    const result = wgs84ToTwd67(makeWgs84(25.033611, 121.564472));
    expect(result.easting).toBeCloseTo(306132.271, 0);
    expect(result.northing).toBeCloseTo(2769822.821, 0);
  });
});

describe('MGRS converters', () => {
  test.each(vectors.filter((vector) => vector.direction === 'WGS84_TO_MGRS'))(
    '$id matches the approved MGRS vector',
    (vector) => {
      const input = vector.input as { lat: number; lon: number; precision: 1 | 2 | 3 | 4 | 5 };
      const expected = vector.expected as { mgrs: string };
      const result = wgs84ToMGRS(makeWgs84(input.lat, input.lon), input.precision);
      expect(formatMGRS(result).replace(/\s+/g, '')).toBe(expected.mgrs);
    },
  );

  test('parses an MGRS value and exposes southwest cell-corner semantics', () => {
    const result = parseMGRS('51RUH5517069437');
    expect(result.precision).toBe(5);
    expect(result.southwest).toEqual({
      latitude: expect.any(Number),
      longitude: expect.any(Number),
    });
    expect(result.semantics).toBe('southwest-cell-corner');
  });
});

describe('Taipower converters', () => {
  test.each(vectors.filter((vector) => vector.direction === 'WGS84_TO_TAIPOWER'))(
    '$id matches the approved Taipower prefix',
    (vector) => {
      const input = vector.input as { lat: number; lon: number; form: '9' | '11' };
      const expected = vector.expected as { code: string };
      const result = wgs84ToTaipower(makeWgs84(input.lat, input.lon), Number(input.form) as 9 | 11);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(formatTaipower(result.value).slice(0, 7)).toBe(expected.code.slice(0, 7));
    },
  );

  test('decodes Taipower into the TWD67 grid', () => {
    const result = taipowerToTwd67({
      kind: 'taipower',
      region: 'L',
      subRegion: '0593',
      hundredMeter: 'BA',
      tenMeter: '86',
      oneMeter: null,
      precision: 9,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.easting).toBeGreaterThan(250_000);
      expect(result.value.easting).toBeLessThan(260_000);
    }
  });
});
