import { describe, expect, test, vi } from 'vitest';

import { createWebAppManifest } from '../../../src/infrastructure/pwa/manifest';
import { establishOfflineReadiness } from '../../../src/infrastructure/pwa/readiness';
import {
  createShellCacheName,
  hasCompleteShell,
  selectOldShellCachesForDeletion,
} from '../../../src/infrastructure/pwa/serviceWorkerPolicy';

describe('PWA readiness contract', () => {
  test('keeps the installed-app identity stable and gates share target separately', () => {
    const disabled = createWebAppManifest(false);
    expect(disabled).toMatchObject({ id: '/photo-marker/', start_url: '/', scope: '/' });
    expect(disabled).not.toHaveProperty('share_target');

    const enabled = createWebAppManifest(true);
    expect(enabled.share_target).toEqual({
      action: '/share-target',
      method: 'POST',
      enctype: 'multipart/form-data',
      params: { files: [{ name: 'photos', accept: ['image/jpeg', 'image/png'] }] },
    });
  });

  test('requires secure context, a complete active shell, and an open database', async () => {
    const openDatabase = vi.fn().mockResolvedValue(undefined);
    const result = await establishOfflineReadiness({
      isSecureContext: true,
      requestWorkerReport: vi.fn().mockResolvedValue({ version: 'build-a', shellComplete: true }),
      openDatabase,
    });
    expect(result).toEqual({ status: 'ready', workerVersion: 'build-a' });
    expect(openDatabase).toHaveBeenCalledOnce();

    await expect(
      establishOfflineReadiness({
        isSecureContext: false,
        requestWorkerReport: vi.fn(),
        openDatabase,
      }),
    ).resolves.toEqual({ status: 'not-ready', reason: 'insecure-context' });
  });

  test('uses revision-specific atomic caches and retains the prior cache on failed updates', () => {
    const first = [
      { url: '/index.html', revision: 'a' },
      { url: '/assets/app.js', revision: 'b' },
    ];
    const second = [
      { url: '/index.html', revision: 'a' },
      { url: '/assets/app.js', revision: 'c' },
    ];
    const firstName = createShellCacheName(first);
    const secondName = createShellCacheName(second);
    expect(firstName).not.toBe(secondName);
    expect(hasCompleteShell(['/index.html'], first)).toBe(false);
    expect(selectOldShellCachesForDeletion(secondName, [firstName, secondName], false)).toEqual([]);
    expect(selectOldShellCachesForDeletion(secondName, [firstName, secondName], true)).toEqual([
      firstName,
    ]);
  });
});
