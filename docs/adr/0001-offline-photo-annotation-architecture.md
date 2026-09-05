# ADR 0001: Offline Photo Annotation Architecture

> Partially superseded by [ADR 0002](0002-redesigned-editor-state-and-presets.md) for active navigation,
> map selection and new-version persistence. Local-only processing, source immutability and the
> existing metadata preservation boundary still apply.


- **Status**: Accepted
- **Date**: 2026-08-16
- **Decision owners**: Photo Marker project
- **Related specification**: `specs/001-annotate-photos/spec.md`

## Context

Photo Marker must run as an installable offline application on a supported phone and computer. It
imports up to 20 JPEG/PNG photos, reads or accepts coordinates, optionally previews the accepted
coordinate on NLSC EMAP5 after network consent, adds accessible text overlays,
preserves a documented metadata profile, saves local drafts, and exports new images without changing
the sources or transmitting user content. The implementation must remain small, responsive for a
representative 12 MP photo, compatible with browser storage/update constraints, and consistent with
the verified Taiwan coordinate behavior in the MIT-licensed `pwa_map` project.

The decisions are cross-cutting: application topology, dependency strategy, renderer separation,
persisted schema, privacy boundary, service-worker updates, metadata compatibility, performance, and
rollback. They therefore require an ADR rather than an execution log.

## Decision

### 1. One client-only adaptive PWA

Use one Svelte/TypeScript/Vite application with no backend, account, telemetry, or runtime CDN. The
release-gated MVP is an installed PWA on Android 10+ current Chrome and Windows 11 current Chrome/Edge.
The same canonical state and component hierarchy adapts across mobile and desktop; advanced browser
APIs remain capability-detected enhancements.

The manifest `id`, deployment origin, service-worker scope, and IndexedDB name are persisted public
contracts. Changes require a migration/rollback plan because they can orphan installations or drafts.

### 2. Offline shell and local-only security boundary

Precache all required code, fonts, icons, coordinate data, and workers. Declare offline readiness only
after an active current-version service worker confirms a complete atomic cache and IndexedDB opens.
Keep the prior cache operational until the new version activates successfully.

Store user photos only in memory and IndexedDB, never in Cache Storage. Bundle dependencies locally,
keep `connect-src 'none'`, and allow `https://wmts.nlsc.gov.tw` only in `img-src` for the consented
EMAP5 preview. Diagnostics contain only stable codes and non-sensitive phase timings. Application
code must never put photo pixels, metadata, coordinates, or annotations into network requests.

Web Share Target is a release-gated enhancement. Its exact POST action is intercepted by the service
worker, never forwarded, and enabled only after a physical-device test proves zero network egress.
Failure blocks the supported Android release unless the specification/platform matrix is revised;
file input is not a substitute for that release requirement. Explicit geolocation may depend on OS/browser network-derived
signals, but Photo Marker never requests it automatically, watches it, or transmits the result.

### 3. Transactional IndexedDB drafts

Use IndexedDB via the small typed `idb` wrapper for versioned sessions and compressed source Blobs.
Use Cache Storage only for build assets. Request persistent storage after meaningful user action and
handle denial, eviction, user clearing, private mode, and quota exhaustion as normal limitations.
“Saved locally” is displayed only after transaction completion; the product promises recoverability
under supported non-private conditions, not permanent archival.

Migrations are additive and transactional. Old data is not deleted until commit, unknown newer data
is preserved, and export/discard cleanup is transactional. OPFS is deferred unless the focused batch
baseline demonstrates an IndexedDB bottleneck.

### 4. Accessible DOM interaction, deterministic overlay placement, and a shared Canvas renderer

Use DOM components for overlay selection, forms, errors, focus, keyboard controls, and single-pointer
drag alternatives. Keep geometry normalized to the display-oriented image. Use one pure layout and
text-measurement implementation for preview and export.

Use a four-step `Photo` → `Coordinate` → `Text` → `Export` application flow with only the active step
rendered in the content area. Coordinate formats may be selected singly or multiply. Coordinate and
text groups each select one of four corners; new items are packed from the outer edge inward with a
normalized safety gap. Reject additions, corner changes, drags, keyboard movements, or numeric edits
that would overlap another overlay, retaining the previous valid geometry. Persist optional
`placementCorner` and `coordinateFormat` fields on overlays; their absence restores legacy drafts
with bottom-left coordinates and top-right text defaults, so record schema version 1 remains
backward compatible.

Perform full-resolution decode/render/encode sequentially in a dedicated worker with
`createImageBitmap` and OffscreenCanvas. Use the same renderer on the main thread if worker canvas is
unavailable. Decode bounded previews and release graphical resources before advancing. Concurrency
remains 1 until a later measurement and plan justify change.

Same-format metadata-preserving export renders at raw encoded dimensions, inverse-maps normalized
display geometry through EXIF orientation, and retains that orientation. Format change or metadata
removal bakes orientation into upright display pixels and discloses the dimension/orientation change.

### 5. Explicit metadata compatibility profile

Use `exifr` for bounded Blob-based GPS/orientation reads and a small bounds-checked writer for:

- JPEG→JPEG: EXIF APP1, XMP APP1, IPTC APP13, and JFIF density.
- PNG→PNG: `eXIf`, `tEXt`/`zTXt`/`iTXt`, and `pHYs`.

Do not preserve ICC profiles, MPF, embedded thumbnails, unknown application segments, or invalid
structural offsets in the MVP. Preserve capture GPS unchanged; a visible manual/current coordinate
does not rewrite it. Format changes disclose metadata loss. If preservation cannot be completed, the
mode is blocked until the user explicitly selects metadata removal; silent stripping is prohibited.
Reject metadata reads before allocation when the source exceeds the public 32 MiB file limit, and
reject metadata rewriting before allocation when the rendered output exceeds 64 MiB. The output bound
is an internal safety ceiling, not a promise that every smaller image can be encoded on every device.
Validate TIFF byte order, IFD entry bounds, supported value offsets, and linked EXIF/GPS directories
before preserving JPEG EXIF or PNG `eXIf`. Reject declared dimensions before browser decode. If no
real Canvas/OffscreenCanvas render path exists, export fails closed rather than relabeling source bytes
or generating a blank image.

### 6. Vendor the verified coordinate core

Copy only the UI-independent TypeScript coordinate modules, result/types, and relevant test vectors
from `pwa_map`; retain `proj4` and `mgrs` plus all MIT notices in `THIRD_PARTY_NOTICES.md`. Do not depend
on the private source application and do not create a shared package until a second coordinated
consumer/release need exists.

Retain the verified TWD67 four-parameter zone-121 transform, surfaced TWD97 zone resolution, MGRS
precision semantics, and mainland-only Taipower coverage. Formula or coverage changes require updated
vectors and ADR assessment.

### 7. Consent-gated EMAP5 preview

Use locally bundled, dynamically imported `leaflet@1.9.4` for one raster WMTS preview after explicit,
versioned origin-local consent and an open action. Use only NLSC `EMAP5` at
`https://wmts.nlsc.gov.tw/wmts/EMAP5/default/GoogleMapsCompatible/{z}/{y}/{x}` (256 px, z0–19), with
anonymous image loading and no-referrer policy. Keep a permanent online indicator and NLSC source
attribution while mounted. The map receives a read-only coordinate copy; it never writes coordinate,
provenance, draft, overlay, or export state.

Do not precache/runtime-cache/bulk-download tiles or silently switch providers. Offline state,
provider error, decline, close, and revocation tear down or avoid the map and leave the core workflow
usable. `EMAP5` follows NLSC service terms and is not the distinct `EMAP5_OPENDATA` layer. Leaflet's
BSD-2-Clause notice and the NLSC terms/source notice belong in `THIRD_PARTY_NOTICES.md`. The lazy
Leaflet JavaScript plus CSS remains outside initial startup chunks and within 60 KiB gzip.

### 8. Bounded inputs and progressive output handoff

Support JPEG/PNG, 1–20 photos, at most 13 MP, 8192 px per axis, and 32 MiB compressed per file. Total
accepted bytes are at most the lesser of 640 MiB and 80% of reported storage headroom. Validate magic
bytes, dimensions, decodability, and untrusted segment lengths before allocation.

Prefer a directly activated save picker where supported; otherwise hand off a conflict-safe Blob
download or supported Web Share. Never overwrite a source handle. “Handed off” does not overclaim
that the browser wrote a specific path. ZIP packaging is out of scope.

## Consequences

### Positive

- The core workflow has no server dependency and can be verified offline.
- One state model and renderer reduce mobile/desktop and preview/export drift.
- Sequential processing and explicit limits bound common memory failures.
- DOM interaction remains accessible while Canvas supplies pixel fidelity.
- Four-corner packing makes common annotation placement predictable without requiring drag gestures.
- Metadata and coordinate claims are narrow, documented, and testable.
- Vendoring reuses proven Taiwan coordinate behavior without importing a map application.
- The map dependency is proportionate to a single raster preview and stays outside the offline core.

### Costs and risks

- Browser storage can still be evicted or cleared; the UI must keep that limitation visible.
- Worker font/render behavior and Web Share Target require physical-device release checks.
- Bounds-checked metadata rewriting is a security- and compatibility-sensitive implementation slice.
- Large or heavily annotated photos can exhaust a chosen corner; the UI must preserve prior geometry
  and request another corner instead of silently overlapping or shrinking text.
- Excluding ICC may change color appearance for some sources; copying it after browser conversion could
  be worse because it may mislabel output pixels. This limitation must be disclosed.
- Sequential batch export favors reliability over throughput.
- iOS/Safari and Firefox installed-app support are deferred.
- NLSC availability and terms provide no app-controlled SLA; preview failure must remain isolated.

## Compatibility, migration, and rollback

- Persisted records carry schema and record versions; migrations are additive and transactional.
- The initial batch fields are additive optional fields in record schema version 1. Their absence
  restores single-photo defaults; unknown newer records are preserved and reported as incompatible.
- Overlay corner and coordinate-format fields are additive and optional. Legacy overlays infer the
  coordinate record's display format and the documented bottom-left/top-right defaults.
- A service-worker install completes only after its precache succeeds. Old shell caches are deleted
  only after the current cache is complete; asset/navigation lookup can fall back to the retained
  prior shell cache if the current cache later becomes incomplete. The supported Android release may
  remove `share_target` only with an approved specification and supported-matrix revision.
- A Leaflet/NLSC regression disables only the optional preview; it does not change the coordinate or
  offline core. No alternative provider is selected silently.
- Worker-rendering regressions fall back to the same renderer on the main thread.
- Metadata regressions disable preservation for affected files and request explicit removal; they do
  not silently strip or corrupt metadata.
- Dependency versions are pinned by the lockfile. Coordinate vector regressions block upgrades of
  `proj4`, `mgrs`, or vendored formulas.
- Input limits or metadata-profile changes are public behavior and require specification/plan review.

## Verification

Use Red-Green-Refactor for behavior slices. Required focused evidence includes coordinate vectors,
malformed metadata bounds, EXIF orientations 1–8, source SHA-256 stability, preview/export fixtures,
draft migration/recovery, offline update rollback, Web Share Target zero egress, keyboard/touch and
screen-reader smoke paths, EMAP5 consent/network isolation, a three-run first-functional 12 MP
baseline followed by five final runs per representative Android/Windows device, and first/final
20-photo-plus-invalid reliability runs. Final medians must not regress over 10% without explanation
and approval. No soak test or broad benchmark suite is required.

## Alternatives rejected

- **Backend or cloud processing**: conflicts with offline/local-only requirements.
- **Separate mobile and desktop clients**: duplicates behavior and migration work.
- **Canvas-only editor**: cannot reliably provide the required accessible interaction surface.
- **WASM imaging stack initially**: adds runtime, isolation, and attack surface before a measured need.
- **OPFS plus IndexedDB initially**: adds cross-store migration/orphan complexity without evidence.
- **Direct dependency on `pwa_map`**: it is a private map application without a stable library API.
- **Immediate shared coordinate package**: premature without a second coordinated package consumer.
- **MapLibre for the raster preview**: WebGL, worker, vector, and style-system scope is unnecessary.
- **EMAP5_OPENDATA substitution**: it is a different, lower-zoom layer and cannot silently replace the
  specified EMAP5 source merely because its open-data license is clearer.
