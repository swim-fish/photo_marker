# Contract: Platform, Offline Readiness, and Local-Only Processing

## Supported release environments

- Android 10+ with current stable Google Chrome, installed PWA.
- Windows 11 with current stable Google Chrome or Microsoft Edge, installed PWA.
- “Current stable” is evaluated and recorded at release time.
- Other browsers/operating systems are best effort or deferred until their own release matrix passes.

The universal workflow uses file input and Blob download. Web Share Target, File System Access, Web
Share, OffscreenCanvas, and storage persistence are progressive enhancements.

## Offline readiness

The app may show `offline-ready` only when all conditions hold:

1. HTTPS/secure context requirements are met.
2. `navigator.serviceWorker.ready` resolves to the active current-version worker.
3. The worker reports that every required hashed asset, font, coordinate definition, and worker file
   is in the current atomic precache.
4. The current IndexedDB schema opens successfully.

If readiness is absent, the persistent UI explains the missing step and does not lose accepted files
or claim offline capability. A failed update leaves the prior complete cache operational and does not
delete it until the new version activates successfully.

## Local-only boundary

During import, edit, preview, draft persistence, and export:

- Application code MUST NOT place photo pixels, metadata, coordinates, or annotation content in
  `fetch`, XHR, WebSocket, beacon, URL/query, telemetry, analytics, or remote logging.
- All runtime dependencies, fonts, icons, workers, and coordinate data are self-hosted and precached.
- User photos are held in memory/IndexedDB only, never Cache Storage.
- Production CSP denies application connections (`connect-src 'none'`) and permits only necessary
  self/blob/data image, font, and worker sources.
- Diagnostic records contain stable codes and non-sensitive timing only.

Browser/OS geolocation may use implementation-specific network signals. The app calls
`getCurrentPosition()` only from the explicit current-location action, uses no background watch, and
never transmits the result in an application-controlled request.

## Web Share Target gate

- Match only the exact manifest action and POST method.
- Accept only declared JPEG/PNG multipart fields, then apply normal content validation.
- Persist accepted Files to IndexedDB before returning a local 303 redirect to the editor.
- The service worker handler MUST NOT call `fetch()` or forward the request.
- The deployment origin MUST have no upload handler at that action path.
- Enable `share_target` only after a physical Android test demonstrates interception and zero network
  egress for one and multiple photos. Otherwise remove it from the manifest while retaining file input.

## Verification boundary

Connected and offline browser tests monitor fetch, XHR, WebSocket, beacon, navigation, and service
worker requests for user content. Tests cover airplane-mode reopen, cache completeness, failed-update
rollback, explicit geolocation grant/deny/timeout, and share-target interception. Claims are limited
to application-controlled traffic; no claim is made about the OS location provider.
