import {
  ddToDms,
  dmsToDd,
  formatWGS84DD,
  formatWGS84DMS,
  makeLat,
  makeLon,
  makeWGS84DD,
  wgs84DdToDms,
} from './wgs84';
import { formatTWD67TM2, twd67ToTwd97, twd67ToWgs84, twd97ToTwd67, wgs84ToTwd67 } from './twd67';
import { formatTWD97TM2, registerTwd97Projections, twd97ToWgs84, wgs84ToTwd97 } from './twd97';
import { formatMGRS, mgrsToWgs84, parseMGRS, wgs84ToMgrs } from './mgrs';
import {
  formatTaipower,
  taipowerToTwd67,
  taipowerToWgs84,
  twd67ToTaipower,
  wgs84ToTaipower,
} from './taipower';
import { coverageOf } from './coverage';
import type {
  DMSPart,
  MGRSPrecision,
  MGRSValue,
  TaipowerCode,
  TaipowerPrecision,
  TWD67TM2,
  TWD97TM2,
  WGS84DD,
  Zone,
} from './types';
import type { ParsedMGRS } from './mgrs';

export type {
  DMSPart,
  MGRSPrecision,
  MGRSValue,
  ParsedMGRS,
  TaipowerCode,
  TaipowerPrecision,
  TWD67TM2,
  TWD97TM2,
  WGS84DD,
  Zone,
};
export {
  coverageOf,
  ddToDms,
  dmsToDd,
  formatMGRS,
  formatTaipower,
  formatTWD67TM2,
  formatTWD97TM2,
  formatWGS84DD,
  formatWGS84DMS,
  makeLat,
  makeLon,
  makeWGS84DD,
  mgrsToWgs84,
  parseMGRS,
  registerTwd97Projections,
  taipowerToTwd67,
  taipowerToWgs84,
  twd67ToTaipower,
  twd67ToTwd97,
  twd67ToWgs84,
  twd97ToTwd67,
  twd97ToWgs84,
  wgs84DdToDms,
  wgs84ToTwd67,
  wgs84ToTwd97,
  wgs84ToTaipower,
};
export function makeWgs84(latitude: number, longitude: number): WGS84DD {
  const result = makeWGS84DD(latitude, longitude);
  if (!result.ok) {
    throw new RangeError(result.error.messageKey);
  }
  return result.value;
}

export function wgs84ToMGRS(coordinate: WGS84DD, precision: MGRSPrecision = 5): MGRSValue {
  return wgs84ToMgrs(coordinate, precision);
}

export function initializeCoordinateCore(): void {
  registerTwd97Projections();
}
