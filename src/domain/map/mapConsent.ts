import type { MapNetworkConsent } from './types';

export const MAP_CONSENT_POLICY_VERSION = 3;
export const MAP_CONSENT_STORAGE_KEY = 'photo-marker-v2:map-network-consent';

function unknownConsent(): MapNetworkConsent {
  return {
    policyVersion: MAP_CONSENT_POLICY_VERSION,
    status: 'unknown',
    providerId: 'pwa-map-sources',
    grantedAt: null,
    revokedAt: null,
  };
}

function isStoredConsent(value: unknown): value is MapNetworkConsent {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<MapNetworkConsent>;
  return (
    candidate.policyVersion === MAP_CONSENT_POLICY_VERSION &&
    candidate.providerId === 'pwa-map-sources' &&
    (candidate.status === 'unknown' ||
      candidate.status === 'granted' ||
      candidate.status === 'revoked') &&
    (candidate.grantedAt === null || typeof candidate.grantedAt === 'string') &&
    (candidate.revokedAt === null || typeof candidate.revokedAt === 'string')
  );
}

function persist(storage: Storage, consent: MapNetworkConsent): MapNetworkConsent {
  try {
    storage.setItem(MAP_CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // The current in-memory decision remains usable when preference storage is unavailable.
  }
  return consent;
}

export function readMapConsent(storage: Storage): MapNetworkConsent {
  try {
    const encoded = storage.getItem(MAP_CONSENT_STORAGE_KEY);
    if (!encoded) return unknownConsent();
    const parsed: unknown = JSON.parse(encoded);
    return isStoredConsent(parsed) ? parsed : unknownConsent();
  } catch {
    return unknownConsent();
  }
}

export function grantMapConsent(storage: Storage, now = new Date()): MapNetworkConsent {
  return persist(storage, {
    policyVersion: MAP_CONSENT_POLICY_VERSION,
    status: 'granted',
    providerId: 'pwa-map-sources',
    grantedAt: now.toISOString(),
    revokedAt: null,
  });
}

export function revokeMapConsent(storage: Storage, now = new Date()): MapNetworkConsent {
  return persist(storage, {
    policyVersion: MAP_CONSENT_POLICY_VERSION,
    status: 'revoked',
    providerId: 'pwa-map-sources',
    grantedAt: null,
    revokedAt: now.toISOString(),
  });
}
