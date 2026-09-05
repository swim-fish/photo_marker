import { isMapTileUrl } from '../map/layers';
export type PrecacheEntry = Readonly<{ url: string; revision?: string | null }>;

export const SHELL_CACHE_PREFIX = 'photo-marker-shell-';

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function isPrecacheCandidate(rawUrl: string): boolean {
  if (rawUrl.startsWith('blob:') || rawUrl.startsWith('data:')) return false;
  const url = new URL(rawUrl, 'https://photo-marker.invalid');
  if (url.origin !== 'https://photo-marker.invalid') return false;
  return (
    url.pathname !== '/share-target' &&
    !url.pathname.startsWith('/drafts/') &&
    !url.pathname.startsWith('/photos/')
  );
}

export function requiredShellUrls(entries: readonly PrecacheEntry[]): string[] {
  return [
    ...new Set(
      entries
        .filter((entry) => isPrecacheCandidate(entry.url))
        .map((entry) => {
          const pathname = new URL(entry.url, 'https://photo-marker.invalid').pathname;
          return pathname === '/' ? '/index.html' : pathname;
        }),
    ),
  ].sort();
}

export function createShellCacheName(entries: readonly PrecacheEntry[]): string {
  const signature = entries
    .filter((entry) => isPrecacheCandidate(entry.url))
    .map((entry) => `${entry.url}:${entry.revision ?? 'unversioned'}`)
    .sort()
    .join('|');
  return `${SHELL_CACHE_PREFIX}${stableHash(signature)}`;
}

export function hasCompleteShell(
  cachedUrls: readonly string[],
  entries: readonly PrecacheEntry[],
): boolean {
  const cachedPaths = new Set(
    cachedUrls.map((url) => new URL(url, 'https://photo-marker.invalid').pathname),
  );
  return requiredShellUrls(entries).every((url) => cachedPaths.has(url));
}

export function selectOldShellCachesForDeletion(
  currentCacheName: string,
  cacheNames: readonly string[],
  shellComplete: boolean,
): string[] {
  if (!shellComplete) return [];
  return cacheNames.filter(
    (name) => name.startsWith(SHELL_CACHE_PREFIX) && name !== currentCacheName,
  );
}

export function orderedShellCacheNames(
  currentCacheName: string,
  cacheNames: readonly string[],
): string[] {
  return [
    currentCacheName,
    ...cacheNames.filter(
      (name) => name.startsWith(SHELL_CACHE_PREFIX) && name !== currentCacheName,
    ),
  ];
}

export function isRuntimeRequestAllowed(
  rawUrl: string,
  applicationOrigin: string,
  mapPreviewOpenWithConsent: boolean,
): boolean {
  const url = new URL(rawUrl, applicationOrigin);
  if (url.origin === applicationOrigin) {
    return (
      url.pathname === '/' ||
      url.pathname === '/index.html' ||
      url.pathname === '/manifest.webmanifest' ||
      url.pathname === '/serviceWorker.js' ||
      url.pathname === '/registerSW.js' ||
      url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/fonts/') ||
      url.pathname.startsWith('/icons/')
    );
  }
  return mapPreviewOpenWithConsent && isMapTileUrl(url);
}
