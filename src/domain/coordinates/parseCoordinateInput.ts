import type {
  CoordinateDisplayFormat,
  CoordinateInputFormat,
  CoordinateZone,
  Wgs84Coordinate,
} from './types';
import {
  coverageOf,
  dmsToDd,
  makeWGS84DD,
  mgrsToWgs84,
  parseMGRS,
  taipowerToWgs84,
  twd67ToWgs84,
  twd97ToWgs84,
} from './converters';
import type { DMSPart, Easting, Northing, TaipowerCode } from './converters/types';
import type { CoordinateFailure, CoordinateResult } from './result';
import { coordinateFailure } from './result';

export type CoordinateInputFormatOptions = Readonly<{
  format: CoordinateInputFormat;
  zone?: CoordinateZone | null;
}>;

export type ParsedCoordinate = Readonly<{
  coordinate: Wgs84Coordinate;
  latitude: number;
  longitude: number;
  inputFormat: CoordinateInputFormat;
  displayFormat: CoordinateDisplayFormat;
  zone: CoordinateZone | null;
  zoneAutoResolved: boolean;
  precision: number | null;
  coverageStatus: 'available' | 'outOfCoverage' | 'unsupportedPrecision';
  semantics?: 'southwest-cell-corner';
}>;

type ParseFailure = CoordinateResult<never>;

function fail(
  code: CoordinateFailure['code'],
  messageKey: string,
  format: CoordinateInputFormat,
  zone?: CoordinateZone,
): ParseFailure {
  return coordinateFailure(code, messageKey, format, zone);
}

function success(
  coordinate: { latitude: number; longitude: number },
  format: CoordinateInputFormat,
  options: Readonly<{
    zone?: CoordinateZone | null;
    zoneAutoResolved?: boolean;
    precision?: number | null;
    semantics?: 'southwest-cell-corner';
  }> = {},
): CoordinateResult<ParsedCoordinate> {
  return {
    ok: true,
    value: {
      coordinate,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      inputFormat: format,
      displayFormat: format === 'DEVICE_WGS84' ? 'WGS84_DD' : format,
      zone: options.zone ?? null,
      zoneAutoResolved: options.zoneAutoResolved ?? false,
      precision: options.precision ?? null,
      coverageStatus: 'available',
      ...(options.semantics ? { semantics: options.semantics } : {}),
    },
  };
}

function parsePair(raw: string): [string, string] | null {
  const match = raw.trim().match(/^([^,;]+)[,;]([^,;]+)$/);
  if (!match) return null;
  return [match[1].trim(), match[2].trim()];
}

const DECIMAL_TOKEN = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;

function parseDecimalToken(raw: string): number | null {
  if (!DECIMAL_TOKEN.test(raw)) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function makeCoordinate(
  latitude: number,
  longitude: number,
  format: CoordinateInputFormat,
): CoordinateResult<{ latitude: number; longitude: number }> {
  const result = makeWGS84DD(latitude, longitude);
  if (!result.ok) {
    return fail(result.error.category, result.error.messageKey, format);
  }
  return {
    ok: true,
    value: { latitude: result.value.lat, longitude: result.value.lon },
  };
}

function parseHemisphereNumber(value: string, axis: 'latitude' | 'longitude'): number | null {
  const trimmed = value.trim().toUpperCase();
  const match = trimmed.match(/^([NSEW])?\s*(-?\d+(?:\.\d+)?)\s*([NSEW])?$/);
  if (!match) return null;
  const prefix = match[1];
  const suffix = match[3];
  if (prefix && suffix && prefix !== suffix) return null;
  const hemisphere = prefix ?? suffix;
  const number = Number.parseFloat(match[2]);
  if (!Number.isFinite(number)) return null;
  if (!hemisphere) return number;
  const valid =
    axis === 'latitude'
      ? hemisphere === 'N' || hemisphere === 'S'
      : hemisphere === 'E' || hemisphere === 'W';
  if (!valid || (number < 0 && (hemisphere === 'N' || hemisphere === 'E'))) return null;
  const magnitude = Math.abs(number);
  return hemisphere === 'S' || hemisphere === 'W' ? -magnitude : magnitude;
}

function parseWgs84Dd(
  raw: string,
  format: CoordinateInputFormat,
): CoordinateResult<ParsedCoordinate> {
  const pair = parsePair(raw);
  if (!pair) return fail('malformed', 'errors.noSeparator', format);
  const latitude = parseHemisphereNumber(String(pair[0]), 'latitude');
  const longitude = parseHemisphereNumber(String(pair[1]), 'longitude');
  if (latitude === null || longitude === null)
    return fail('malformed', 'errors.invalidNumber', format);
  if (Math.abs(latitude) > 90) return fail('out-of-range', 'errors.latOutOfRange', format);
  if (Math.abs(longitude) > 180) return fail('out-of-range', 'errors.lonOutOfRange', format);
  const coordinate = makeCoordinate(latitude, longitude, format);
  if (!coordinate.ok) return coordinate;
  return success(coordinate.value, format);
}

const DMS_SIDE =
  /^\s*([NSEW])?\s*(-?\d+)\s*[°d]\s*(\d+)\s*['′]\s*(\d+(?:\.\d+)?)\s*["″]\s*([NSEW])?\s*$/i;

function parseDmsSide(
  raw: string,
  axis: 'latitude' | 'longitude',
): DMSPart | 'malformed' | 'out-of-range' {
  const match = DMS_SIDE.exec(raw);
  if (!match) return 'malformed';
  const prefix = match[1]?.toUpperCase();
  const suffix = match[5]?.toUpperCase();
  if (prefix && suffix && prefix !== suffix) return 'malformed';
  const hemisphere = prefix ?? suffix;
  const allowed = axis === 'latitude' ? ['N', 'S'] : ['E', 'W'];
  if (!hemisphere || !allowed.includes(hemisphere)) return 'malformed';
  if (match[2].startsWith('-') && (hemisphere === 'N' || hemisphere === 'E')) return 'malformed';
  const deg = Math.abs(Number.parseInt(match[2], 10));
  const min = Number.parseInt(match[3], 10);
  const sec = Number.parseFloat(match[4]);
  if (min >= 60 || sec >= 60) return 'out-of-range';
  if ((axis === 'latitude' && deg > 90) || (axis === 'longitude' && deg > 180))
    return 'out-of-range';
  if (deg === (axis === 'latitude' ? 90 : 180) && (min !== 0 || sec !== 0)) return 'out-of-range';
  return { deg, min, sec, hemisphere: hemisphere as DMSPart['hemisphere'] };
}

function splitDms(raw: string): [string, string] | null {
  const comma = raw.split(',').map((part) => part.trim());
  if (comma.length === 2 && comma[0] && comma[1]) return [comma[0], comma[1]];
  const matches = raw.match(
    /(?:[NSEW]\s*)?-?\d+\s*[°d]\s*\d+\s*['′]\s*\d+(?:\.\d+)?\s*["″]\s*[NSEW]/gi,
  );
  return matches && matches.length === 2 ? [matches[0], matches[1]] : null;
}

function parseWgs84Dms(
  raw: string,
  format: CoordinateInputFormat,
): CoordinateResult<ParsedCoordinate> {
  const pair = splitDms(raw);
  if (!pair) return fail('malformed', 'errors.dmsPair', format);
  const latitudePart = parseDmsSide(pair[0], 'latitude');
  const longitudePart = parseDmsSide(pair[1], 'longitude');
  if (latitudePart === 'out-of-range' || longitudePart === 'out-of-range') {
    return fail('out-of-range', 'errors.dmsOutOfRange', format);
  }
  if (latitudePart === 'malformed' || longitudePart === 'malformed') {
    return fail('malformed', 'errors.dmsMalformed', format);
  }
  const latitude = dmsToDd(latitudePart);
  const longitude = dmsToDd(longitudePart);
  const coordinate = makeCoordinate(latitude, longitude, format);
  if (!coordinate.ok) return coordinate;
  return success(coordinate.value, format);
}

function parseTm2(
  raw: string,
  format: 'TWD97_TM2' | 'TWD67_TM2',
  requestedZone?: CoordinateZone | null,
): CoordinateResult<ParsedCoordinate> {
  const pair = parsePair(raw.replace(/\b(?:TWD97|TWD67)\b/i, '').trim());
  if (!pair) return fail('malformed', 'errors.tm2Pair', format);
  const easting = parseDecimalToken(pair[0]);
  const northing = parseDecimalToken(pair[1]);
  if (easting === null || northing === null) {
    return fail('malformed', 'errors.tm2Pair', format);
  }
  if (easting < 0 || northing < 0 || easting > 1_000_000 || northing > 4_000_000) {
    return fail('out-of-range', 'errors.tm2OutOfRange', format);
  }
  if (format === 'TWD67_TM2') {
    if (requestedZone !== undefined && requestedZone !== null && requestedZone !== 121) {
      return fail('out-of-coverage', 'errors.twd67.zone', format, requestedZone);
    }
    const coordinate = twd67ToWgs84({
      kind: 'twd67-tm2',
      easting: easting as Easting,
      northing: northing as Northing,
    });
    if (coverageOf('twd67-tm2', coordinate) !== 'ok') {
      return fail('out-of-coverage', 'errors.twd67.coverage', format, 121);
    }
    return success({ latitude: coordinate.lat, longitude: coordinate.lon }, format, { zone: 121 });
  }

  if (requestedZone !== undefined && requestedZone !== null) {
    const coordinate = twd97ToWgs84({
      kind: 'twd97-tm2',
      easting: easting as Easting,
      northing: northing as Northing,
      zone: requestedZone,
    });
    if (coverageOf('twd97-tm2', coordinate) !== 'ok') {
      return fail('out-of-coverage', 'errors.twd97.coverage', format, requestedZone);
    }
    return success({ latitude: coordinate.lat, longitude: coordinate.lon }, format, {
      zone: requestedZone,
    });
  }

  const candidates = ([119, 121] as const)
    .map((zone) => {
      const coordinate = twd97ToWgs84({
        kind: 'twd97-tm2',
        easting: easting as Easting,
        northing: northing as Northing,
        zone,
      });
      return { zone, coordinate };
    })
    .filter(({ coordinate }) => coverageOf('twd97-tm2', coordinate) === 'ok');
  if (candidates.length === 0) return fail('out-of-coverage', 'errors.twd97.bothZonesFail', format);
  const preferred =
    candidates
      .filter(({ zone, coordinate }) => zone === (coordinate.lon >= 120 ? 121 : 119))
      .sort(({ zone: left }, { zone: right }) => right - left)[0] ?? candidates[0];
  if (!preferred) return fail('ambiguous-zone', 'errors.twd97.ambiguousZone', format);
  return success(
    { latitude: preferred.coordinate.lat, longitude: preferred.coordinate.lon },
    format,
    { zone: preferred.zone, zoneAutoResolved: true },
  );
}

function parseMgrs(raw: string, format: CoordinateInputFormat): CoordinateResult<ParsedCoordinate> {
  const compact = raw.replace(/\s+/g, '').toUpperCase();
  const shape = /^\d{1,2}[A-HJ-NP-Z][A-HJ-NP-Z]{2}(\d*)$/;
  if (!shape.test(compact)) return fail('malformed', 'errors.mgrsMalformed', format);
  const shapeMatch = compact.match(/^(\d{1,2}[A-HJ-NP-Z])([A-HJ-NP-Z]{2})(\d*)$/);
  if (!shapeMatch) return fail('malformed', 'errors.mgrsMalformed', format);
  const digits = shapeMatch[3];
  if (digits.length === 0 || digits.length % 2 !== 0 || digits.length / 2 > 5) {
    return fail('unsupported-precision', 'errors.mgrsPrecision', format);
  }
  let parsed: ReturnType<typeof parseMGRS>;
  try {
    parsed = parseMGRS(compact);
  } catch {
    return fail('malformed', 'errors.mgrsMalformed', format);
  }
  const coordinate = mgrsToWgs84(parsed);
  if (coverageOf('mgrs', coordinate) !== 'ok') {
    return fail('out-of-coverage', 'errors.mgrs.coverage', format);
  }
  return success({ latitude: coordinate.lat, longitude: coordinate.lon }, format, {
    precision: parsed.precision,
    semantics: 'southwest-cell-corner',
  });
}

function parseTaipower(
  raw: string,
  format: CoordinateInputFormat,
): CoordinateResult<ParsedCoordinate> {
  const match = raw
    .trim()
    .toUpperCase()
    .match(/^([A-Z])(\d{4})\s+([A-J]{2})(\d{2})(\d{2})?$/);
  if (!match) return fail('malformed', 'errors.taipowerMalformed', format);
  const tail = match[5] ? 6 : 4;
  const code: TaipowerCode = {
    kind: 'taipower',
    region: match[1],
    subRegion: match[2],
    hundredMeter: match[3],
    tenMeter: match[4],
    oneMeter: match[5] ?? null,
    precision: tail === 6 ? 11 : 9,
  };
  const converted = taipowerToWgs84(code);
  if (!converted.ok) return fail(converted.error.category, converted.error.messageKey, format);
  const coverage = coverageOf('taipower', converted.value);
  if (coverage !== 'ok') return fail('out-of-coverage', 'errors.taipower.outerIsland', format);
  return success({ latitude: converted.value.lat, longitude: converted.value.lon }, format, {
    precision: code.precision,
  });
}

export function parseCoordinateInput(
  raw: string,
  options: CoordinateInputFormatOptions,
): CoordinateResult<ParsedCoordinate> {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return fail('malformed', 'errors.emptyInput', options.format);
  }
  switch (options.format) {
    case 'WGS84_DD':
    case 'DEVICE_WGS84':
      return parseWgs84Dd(raw, options.format);
    case 'WGS84_DMS':
      return parseWgs84Dms(raw, options.format);
    case 'TWD97_TM2':
    case 'TWD67_TM2':
      return parseTm2(raw, options.format, options.zone);
    case 'MGRS':
      return parseMgrs(raw, options.format);
    case 'TAIPOWER':
      return parseTaipower(raw, options.format);
  }
}
