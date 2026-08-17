/// <reference lib="webworker" />

import { persistSharedFiles } from '../storage/draftRepository';
import { handleShareTargetRequest, SHARE_TARGET_ACTION } from './shareTarget';
import {
  createShellCacheName,
  hasCompleteShell,
  isPrecacheCandidate,
  orderedShellCacheNames,
  requiredShellUrls,
  selectOldShellCachesForDeletion,
  type PrecacheEntry,
} from './serviceWorkerPolicy';

declare const self: ServiceWorkerGlobalScope & {
  readonly __WB_MANIFEST: readonly PrecacheEntry[];
};

const manifest = self.__WB_MANIFEST.filter((entry) => isPrecacheCandidate(entry.url));
const shellUrls = requiredShellUrls(manifest);
const shellCacheName = createShellCacheName(manifest);

async function shellComplete(): Promise<boolean> {
  const cache = await caches.open(shellCacheName);
  return hasCompleteShell(
    (await cache.keys()).map((request) => request.url),
    manifest,
  );
}

async function matchAvailableShell(pathname: string): Promise<Response | undefined> {
  const names = orderedShellCacheNames(shellCacheName, await caches.keys());
  for (const name of names) {
    const response = await (await caches.open(name)).match(pathname, { ignoreVary: true });
    if (response) return response;
  }
  return undefined;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(shellCacheName)
      .then((cache) => cache.addAll(shellUrls.map((url) => new Request(url, { cache: 'reload' })))),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const complete = await shellComplete();
      const oldCaches = selectOldShellCachesForDeletion(
        shellCacheName,
        await caches.keys(),
        complete,
      );
      await Promise.all(oldCaches.map((name) => caches.delete(name)));
      if (complete) await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
    return;
  }
  if (event.data?.type !== 'PHOTO_MARKER_READINESS') return;
  const port = event.ports[0];
  if (!port) return;
  event.waitUntil(
    shellComplete()
      .then((complete) => port.postMessage({ version: shellCacheName, shellComplete: complete }))
      .catch(() => port.postMessage({ version: shellCacheName, shellComplete: false })),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method === 'POST' &&
    url.origin === self.location.origin &&
    url.pathname === SHARE_TARGET_ACTION
  ) {
    event.respondWith(
      handleShareTargetRequest(request, { persist: persistSharedFiles })
        .then((response) => response ?? new Response('Not found.', { status: 404 }))
        .catch(() => new Response('Shared photos could not be saved locally.', { status: 507 })),
    );
    return;
  }

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await matchAvailableShell('/index.html');
        return cached ?? new Response('Offline application shell unavailable.', { status: 503 });
      }),
    );
    return;
  }

  event.respondWith(matchAvailableShell(url.pathname).then((cached) => cached ?? fetch(request)));
});
