import { describe, expect, it } from 'vitest';

import {
  grantMapConsent,
  MAP_CONSENT_POLICY_VERSION,
  MAP_CONSENT_STORAGE_KEY,
  readMapConsent,
  revokeMapConsent,
} from '../../../src/domain/map/mapConsent';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe('versioned map network consent', () => {
  it('starts unknown and persists only provider consent metadata', () => {
    const storage = memoryStorage();
    expect(readMapConsent(storage)).toMatchObject({
      policyVersion: MAP_CONSENT_POLICY_VERSION,
      providerId: 'pwa-map-sources',
      status: 'unknown',
    });

    const granted = grantMapConsent(storage, new Date('2026-08-17T00:00:00.000Z'));
    expect(granted).toMatchObject({ status: 'granted', grantedAt: '2026-08-17T00:00:00.000Z' });
    expect(storage.getItem(MAP_CONSENT_STORAGE_KEY)).not.toMatch(
      /latitude|longitude|photo|annotation/i,
    );
    expect(readMapConsent(storage)).toEqual(granted);
  });

  it('invalidates stale policy versions and malformed storage', () => {
    const storage = memoryStorage();
    storage.setItem(
      MAP_CONSENT_STORAGE_KEY,
      JSON.stringify({
        policyVersion: MAP_CONSENT_POLICY_VERSION - 1,
        providerId: 'pwa-map-sources',
        status: 'granted',
        grantedAt: '2026-08-17T00:00:00.000Z',
        revokedAt: null,
      }),
    );
    expect(readMapConsent(storage).status).toBe('unknown');

    storage.setItem(MAP_CONSENT_STORAGE_KEY, '{not-json');
    expect(readMapConsent(storage).status).toBe('unknown');
  });

  it('persists revocation and requires a later explicit grant', () => {
    const storage = memoryStorage();
    grantMapConsent(storage, new Date('2026-08-17T00:00:00.000Z'));
    const revoked = revokeMapConsent(storage, new Date('2026-08-17T01:00:00.000Z'));

    expect(revoked).toMatchObject({
      status: 'revoked',
      grantedAt: null,
      revokedAt: '2026-08-17T01:00:00.000Z',
    });
    expect(readMapConsent(storage)).toEqual(revoked);
  });
});
