import type { CoordinateDisplayFormat, CoordinateZone, Wgs84Coordinate } from './types';
import {
  coverageOf,
  formatMGRS,
  formatTaipower,
  formatTWD67TM2,
  formatTWD97TM2,
  formatWGS84DD,
  formatWGS84DMS,
  makeWGS84DD,
  wgs84DdToDms,
  wgs84ToMGRS,
  wgs84ToTaipower,
  wgs84ToTwd67,
  wgs84ToTwd97,
} from './converters';
import type { MGRSPrecision, TaipowerPrecision, WGS84DD } from './converters/types';
import type { CoordinateResult } from './result';
import { coordinateFailure } from './result';
import type { ParsedCoordinate } from './parseCoordinateInput';

export type FormatCoordinateOptions = Readonly<{
  zone?: CoordinateZone | null;
  precision?: number | null;
  asciiDms?: boolean;
  secondsDecimals?: number;
}>;

export type FormattedCoordinate = Readonly<{
  text: string;
  format: CoordinateDisplayFormat;
  zone: CoordinateZone | null;
  zoneAutoResolved: boolean;
  precision: number | null;
  coverageStatus: 'available' | 'outOfCoverage' | 'unsupportedPrecision';
}>;

type CoordinateInput = Wgs84Coordinate | ParsedCoordinate;

function canonical(input: CoordinateInput): WGS84DD | null {
  const value = 'coordinate' in input ? input.coordinate : input;
  const result = makeWGS84DD(value.latitude, value.longitude);
  return result.ok ? result.value : null;
}

function failure(
  code: 'malformed' | 'out-of-range' | 'out-of-coverage' | 'unsupported-precision',
  messageKey: string,
  format: CoordinateDisplayFormat,
  zone?: CoordinateZone,
): CoordinateResult<never> {
  return coordinateFailure(code, messageKey, format, zone);
}

function metadata(
  input: CoordinateInput,
  format: CoordinateDisplayFormat,
  zone: CoordinateZone | null,
  precision: number | null,
): FormattedCoordinate {
  const previous = 'coordinate' in input ? input : undefined;
  return {
    text: '',
    format,
    zone,
    zoneAutoResolved: previous?.zoneAutoResolved === true && previous.zone === zone ? true : false,
    precision,
    coverageStatus: 'available',
  };
}

function withText(
  input: CoordinateInput,
  format: CoordinateDisplayFormat,
  options: FormatCoordinateOptions,
  text: string,
  zone: CoordinateZone | null = null,
  precision: number | null = null,
): CoordinateResult<FormattedCoordinate> {
  return {
    ok: true,
    value: { ...metadata(input, format, zone, precision), text },
  };
}

export function formatCoordinate(
  input: CoordinateInput,
  format: CoordinateDisplayFormat,
  options: FormatCoordinateOptions = {},
): CoordinateResult<FormattedCoordinate> {
  const coordinate = canonical(input);
  if (!coordinate) return failure('out-of-range', 'errors.invalidCanonicalCoordinate', format);
  const inputMetadata = 'coordinate' in input ? input : undefined;
  switch (format) {
    case 'WGS84_DD':
      return withText(input, format, options, formatWGS84DD(coordinate));
    case 'WGS84_DMS':
      return withText(
        input,
        format,
        options,
        formatWGS84DMS(wgs84DdToDms(coordinate), {
          ascii: options.asciiDms,
          secDecimals: options.secondsDecimals,
        }),
      );
    case 'TWD97_TM2': {
      const zone = options.zone ?? inputMetadata?.zone ?? (coordinate.lon >= 120 ? 121 : 119);
      const value = wgs84ToTwd97(coordinate, zone);
      if (coverageOf('twd97-tm2', coordinate) !== 'ok') {
        return failure('out-of-coverage', 'errors.twd97.coverage', format, zone);
      }
      return withText(input, format, options, formatTWD97TM2(value), zone);
    }
    case 'TWD67_TM2': {
      const zone = options.zone ?? 121;
      if (zone !== 121) return failure('out-of-coverage', 'errors.twd67.zone', format, zone);
      const value = wgs84ToTwd67(coordinate);
      if (coverageOf('twd67-tm2', coordinate) !== 'ok') {
        return failure('out-of-coverage', 'errors.twd67.coverage', format, zone);
      }
      return withText(input, format, options, formatTWD67TM2(value), zone);
    }
    case 'MGRS': {
      const precisionValue = options.precision ?? inputMetadata?.precision ?? 5;
      if (![1, 2, 3, 4, 5].includes(precisionValue)) {
        return failure('unsupported-precision', 'errors.mgrsPrecision', format);
      }
      if (coverageOf('mgrs', coordinate) !== 'ok') {
        return failure('out-of-coverage', 'errors.mgrs.coverage', format);
      }
      const value = wgs84ToMGRS(coordinate, precisionValue as MGRSPrecision);
      return withText(input, format, options, formatMGRS(value), null, precisionValue);
    }
    case 'TAIPOWER': {
      const precisionValue = options.precision ?? inputMetadata?.precision ?? 9;
      if (precisionValue !== 9 && precisionValue !== 11) {
        return failure('unsupported-precision', 'errors.taipowerPrecision', format);
      }
      if (coverageOf('taipower', coordinate) !== 'ok') {
        return failure('out-of-coverage', 'errors.taipower.outerIsland', format);
      }
      const value = wgs84ToTaipower(coordinate, precisionValue as TaipowerPrecision);
      if (!value.ok) {
        return failure(value.error.category, value.error.messageKey, format);
      }
      return withText(input, format, options, formatTaipower(value.value), null, precisionValue);
    }
  }
}
