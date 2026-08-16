# Phase 0 Research: Offline Photo Annotation

## 1. Platform baseline and progressive enhancement

**Decision**: Release-gate Android 10+ current Chrome and Windows 11 current Chrome/Edge as installed
PWAs. Use file input and Blob download as universal paths; capability-detect Web Share Target, File
System Access, Web Share, and worker rendering. Treat other platforms as best effort or deferred.

**Rationale**: This is the smallest matrix that satisfies mobile and desktop installation plus the
Android photo-share workflow without making limited-availability APIs single points of failure.

**Alternatives considered**: A Baseline-only browser app omits the requested installed share flow.
Safari/Firefox release guarantees materially expand validation. A native wrapper adds packaging and
platform code without a demonstrated need.

## 2. Application stack

**Decision**: Use a client-only Svelte/TypeScript/Vite application with locally bundled dependencies,
`vite-plugin-pwa`/Workbox, Vitest, Testing Library, Playwright, ESLint, Prettier, and `svelte-check`.

**Rationale**: The reference coordinate project already uses the same web toolchain, Svelte supports
one adaptive component hierarchy, and no approved requirement needs a backend.

**Alternatives considered**: A server application violates offline/local-only goals. Multiple native
clients duplicate behavior. A framework-independent custom UI would add accessibility and state
management work without reducing scope.

## 3. Offline readiness and privacy boundary

**Decision**: Precache the complete application shell and workers with atomic service-worker updates.
Declare offline readiness only after an active worker confirms the current cache and IndexedDB opens.
Use self-hosted assets and a production CSP including `connect-src 'none'`. Cache Storage never holds
user photos. Web Share Target handles only the exact POST action locally and never calls `fetch()`;
it remains disabled unless zero network egress is proven.

FR-004 and SC-009 govern application-controlled traffic. Explicit browser geolocation may itself use
OS/network-derived signals, but the application never transmits its result or user content.

**Rationale**: Installed does not mean offline-ready, and share-target POST delivery is a material
privacy boundary. Structural isolation is more reliable than relying on convention.

**Alternatives considered**: Runtime CDN assets break offline guarantees. Forwarding share POSTs to
a server transmits photos. An absolute claim about the OS location provider is not technically
verifiable by the application.

## 4. File intake, limits, and output handoff

**Decision**: Accept JPEG/PNG `File` objects through one validation contract. Limits are 20 items,
13 MP, 8192 px per axis, and 32 MiB compressed per item; total bytes cannot exceed `min(640 MiB,
80% of reported storage headroom)`. Validate MIME declaration, extension, magic bytes, dimensions,
and decodability. Export first through `showSaveFilePicker()` when available and directly activated,
then through a conflict-safe Blob download or supported Web Share. Do not add ZIP output.

**Rationale**: The limits cover representative 4032×3024 field photos while bounding storage and
decode risk. Browser-controlled download destinations cannot truthfully be reported as confirmed
filesystem writes.

**Alternatives considered**: `showOpenFilePicker()` adds no essential behavior. Unbounded sources risk
crash. ZIP packaging adds a dependency and workflow that the specification does not request.

## 5. Rendering, orientation, and batch memory

**Decision**: Use `createImageBitmap` with explicit orientation handling and a shared 2D Canvas layout
implementation. Keep overlay geometry normalized to the display-oriented image. Run full-resolution
decode/render/encode sequentially in a dedicated worker with OffscreenCanvas; use the same renderer
on the main thread as a capability fallback. Generate bounded previews and release ImageBitmap,
object URL, and canvas resources after each item.

**Rationale**: One 12 MP RGBA surface is roughly 49 MB before intermediate buffers. Concurrency 1 and
decode-at-export bound memory, while a shared renderer prevents preview/export drift and keeps the UI
responsive.

**Alternatives considered**: `wasm-vips` adds an early-stage ~15 MB runtime and cross-origin-isolation
requirements. ImageMagick WASM is broader than JPEG/PNG annotation needs. Main-thread-only rendering
is retained only as fallback due to jank risk.

## 6. Metadata parsing and preservation

**Decision**: Use `exifr` for bounded Blob-based GPS/orientation reads and a small format-specific
writer for an explicit safe profile:

- JPEG→JPEG: EXIF APP1, XMP APP1, IPTC APP13, and JFIF density.
- PNG→PNG: `eXIf`, `tEXt`/`zTXt`/`iTXt`, and `pHYs`.
- Exclude ICC profiles, MPF, embedded thumbnails, unknown application segments, and unsafe or stale
  structural offsets.

Preserve supported metadata only for same-format output, never rewrite embedded GPS when the visible
coordinate changes, bounds-check every segment, and disclose format-change loss. If preservation
fails, block that mode and require an explicit choice to remove supported source metadata; never
strip silently. Browser-added technical headers are not treated as preserved source metadata.

**Rationale**: Canvas does not preserve metadata. Opaque ICC, MPF, and thumbnail copying can mislabel
converted pixels, retain stale previews, or contain invalid offsets. The explicit profile makes
“supported metadata” objectively testable.

**Alternatives considered**: Copying every segment is unsafe. Stripping everything violates the
default. A full imaging WASM stack is disproportionate before a focused limitation is measured.

## 7. Draft storage and migration

**Decision**: Store source Blobs and versioned canonical state transactionally in IndexedDB through
`idb`. Request persistence after meaningful user action, estimate quota before intake, handle denied
persistence and `QuotaExceededError`, and label drafts as local recovery rather than durable backup.
Save completed interactions; debounce drag writes and flush on pointer release. Keep previews and
outputs regenerable.

**Rationale**: IndexedDB supports Blobs and atomic structured transactions. Browser storage remains
evictable or user-clearable, so the UI must not promise permanent archival.

**Alternatives considered**: OPFS plus IndexedDB introduces cross-store consistency and orphan
cleanup without a measured bottleneck. Cache Storage is for app assets, not user data.

## 8. Coordinate reuse

**Decision**: Vendor the narrow TypeScript coordinate core from `pwa_map`, translating local aliases
and retaining `proj4` and `mgrs`. Include WGS84, TWD97, TWD67, MGRS, Taipower, coverage, zone,
parser/result/types, reference vectors, and MIT attribution in `THIRD_PARTY_NOTICES.md`. Exclude map,
Svelte UI, Go-To composition, and unrelated application code.

Preserve these verified constraints:

- TWD67 uses its four-parameter zone-121 transform; replacing it with EPSG:3828 risks ~400 m error.
- TWD97 zone inference surfaces `zoneAutoResolved` and the selected 119/121 zone.
- MGRS precision is 1–5 and inverse represents the southwest cell corner.
- Taipower supports only verified mainland cells; outer islands and unsupported letters return
  out-of-coverage.

**Rationale**: The core is deterministic and independent of DOM, maps, storage, and networking. A
local copy keeps this app offline and permits a smaller public API while retaining proven vectors.

**Alternatives considered**: Depending on the private `pwa_map` app imports inappropriate surface and
no stable package API. A shared package is premature with only one new consumer. Reimplementation
risks known coordinate regressions.

## 9. Adaptive and accessible workspace

**Decision**: Use one canonical editor state and adaptive workspace. Below 768 px, stack photo strip,
stage, inspector tabs/drawer, and sticky actions; 768–1023 px uses two regions; 1024 px and above uses
photo rail, stage, and inspector. The functional floor is 320 CSS px. Canvas is never the only
interaction surface: a semantic overlay list and inspector provide numeric, single-pointer, and
keyboard move/resize alternatives. Target sizes are 44×44 CSS px by design and never below WCAG 2.2
AA requirements.

**Rationale**: One flow avoids mobile/desktop divergence. DOM controls provide accessible names,
errors, selection, focus, and dragging alternatives while normalized geometry preserves layout.

**Alternatives considered**: Canvas-only editing is not sufficiently accessible. A per-photo wizard
is costly for 20 items. Shrinking a desktop three-pane layout fails narrow reflow.

## 10. Focused verification

**Decision**: Use test-first slices and only risk-proportional checks. Performance validation is five
runs of one approved 4032×3024 JPEG on one representative Android device and one representative
Windows device; every run must meet the 3-second preview and 15-second export budgets. Run one
20-photo-plus-invalid baseline per representative device, record phase timings, and verify sequential
processing/no crash rather than imposing an arbitrary batch-duration gate. Do not run soak tests or
a broad device benchmark suite.

Focused release checks also cover EXIF orientations 1–8, supported metadata preserve/remove, source
hash stability, coordinate vectors, offline readiness/reopen, share-target zero egress, draft
migration/recovery, quota/persistence denial, keyboard/touch interaction, 320×568, 568×320, 1024×768,
400% zoom, and one desktop/mobile screen-reader smoke path.

**Rationale**: These checks directly cover the specified risks and measurable outcomes without
long-running performance work that would not improve the initial decision.

**Alternatives considered**: Broad benchmarks and soak tests are disproportionate. A single timing
run is too noisy to validate the stated budgets.

## Primary references

- [MDN Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Chrome Web Share Target](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target)
- [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [MDN Geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition)
- [MDN createImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap)
- [MDN OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- `pwa_map/src/coord` in the reference repository, plus its coordinate tests, vectors, and ADRs
