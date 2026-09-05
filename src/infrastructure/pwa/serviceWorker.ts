/// <reference lib="webworker" />
import { isRuntimeRequestAllowed } from './serviceWorkerPolicy';

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

async function liveMapPermission(clientId: string): Promise<boolean> {
  const client = await self.clients.get(clientId);
  if (!client) return false;
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const finish = (allowed: boolean) => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(allowed);
    };
    const timer = setTimeout(() => finish(false), 1500);
    channel.port1.onmessage = (event) => finish(event.data?.enabled === true);
    try {
      client.postMessage({ type: 'PHOTO_MARKER_MAP_QUERY' }, [channel.port2]);
    } catch {
      finish(false);
    }
  });
}

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
  if (event.data?.type === 'PHOTO_MARKER_MAP_NETWORK') {
    event.ports[0]?.postMessage({ acknowledged: true });
    return;
  }
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

  if (url.origin !== self.location.origin) {
    event.respondWith(
      (async () => {
        if (
          request.method === 'GET' &&
          isRuntimeRequestAllowed(url.href, self.location.origin, true) &&
          (await liveMapPermission(event.clientId))
        ) {
          return fetch(request, {
            cache: 'no-store',
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
          });
        }
        return new Response('Network request is not authorized.', { status: 403 });
      })(),
    );
    return;
  }
  if (request.method !== 'GET') return;
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
