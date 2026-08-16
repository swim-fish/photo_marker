# Implementation Plan: Offline Photo Annotation

**Branch**: `001-annotate-photos` | **Date**: 2026-08-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-annotate-photos/spec.md`

## Summary

Build a client-only, installable PWA that imports JPEG and PNG photos, derives or accepts a
coordinate, places accessible text overlays, and exports separate annotated copies without changing
the originals. The implementation uses Svelte and TypeScript, an offline application shell,
IndexedDB drafts, a shared Canvas renderer that runs full-resolution work sequentially in a worker,
and a narrowly vendored coordinate core from the MIT-licensed `pwa_map` project. The supported MVP
is current stable Chrome on Android 10+ and current stable Chrome or Edge on Windows 11; advanced
file, share, and worker APIs are capability-detected and retain documented fallbacks.

## Technical Context

**Language/Version**: TypeScript 5.x, Svelte 5, modern ECMAScript modules

**Primary Dependencies**: Vite, Svelte, `vite-plugin-pwa`/Workbox, `idb`, `exifr`, `proj4`, `mgrs`

**Storage**: IndexedDB for source Blobs and versioned drafts; Cache Storage only for application assets

**Testing**: Vitest, Testing Library, Playwright, `svelte-check`, ESLint, Prettier

**Target Platform**: Installed PWA on Android 10+ Chrome and Windows 11 Chrome/Edge; HTTPS required

**Project Type**: Client-only responsive web application/PWA; no backend or account service

**Performance Goals**: A 12 MP JPEG produces a usable preview within 3 seconds and exports within
15 seconds on each representative supported device; a 20-photo batch plus one invalid item completes
without crash or loss of successful results

**Constraints**: Local-only user-data processing; offline after readiness; JPEG/PNG only; maximum
20 photos, 13 MP, 8192 px on either axis, and 32 MiB compressed per photo; aggregate accepted bytes
must not exceed the lesser of 640 MiB or 80% of currently reported storage headroom; source files
remain byte-for-byte unchanged; full-resolution processing concurrency is 1

**Scale/Scope**: One adaptive editing workspace, one active photo at a time, 1–20 photos per draft,
six coordinate representations, multiple text overlays, and per-photo export results

## Supported Platform and Capability Matrix

| Tier | Environment | Required behavior |
|------|-------------|-------------------|
| Supported | Android 10+ with current stable Chrome | Install, offline shell, file input, local draft recovery, explicit geolocation, annotation, export fallback; Web Share Target is enabled only after physical-device release validation |
| Supported | Windows 11 with current stable Chrome | Install, offline shell, file input, draft recovery, explicit geolocation, annotation, save picker when available, download fallback |
| Supported | Windows 11 with current stable Edge | Same core workflow with capability-detected file and share enhancements |
| Best effort | macOS 12+ Chromium, non-Chrome Android browsers | Core file-input/download flow only; no release guarantee until separately tested |
| Deferred | iOS/iPadOS, Safari, Firefox installed-app workflow | Requires a separate installation, storage, share, and save validation matrix |

“Current stable” is evaluated at release time. Private/incognito browsing is unsupported for draft
recovery. The in-app file input is always available and no essential workflow depends solely on Web
Share Target, File System Access, Web Share, or OffscreenCanvas.

## Constitution Check

### Pre-research gate

| Principle | Plan evidence | Status |
|-----------|---------------|--------|
| I. Scope discipline | Client-only PWA, JPEG/PNG, one workspace, no backend, map, cloud, ZIP, filters, or speculative shared package | PASS |
| II. TDD | Tasks must begin with failing unit/integration/interaction tests for each behavior slice; coordinate vectors and source-file hashes provide regression characterization | PASS |
| III. Verification | Focused tests during work, then relevant test/type/lint/format/build checks; only the specified 12 MP and 20-item measurements | PASS |
| IV. UX consistency | [photo-annotation-workspace.md](../../docs/ui/photo-annotation-workspace.md) defines adaptive layout, states, keyboard/touch alternatives, focus, and accessibility | PASS |
| V. Architecture docs | [ADR-0001](../../docs/adr/0001-offline-photo-annotation-architecture.md) records architecture, dependencies, persistence, privacy, rendering, and rollback | PASS |
| VI. Performance/reliability | Numeric budgets, sequential processing, storage limits, versioned migrations, compatibility fallbacks, and rollback are defined | PASS |
| VII. Delegation | Phase 0 used bounded read-only research roles; primary agent owns decisions and all artifact writes; implementation review is risk-scoped | PASS |
| VIII. Governance | No constitutional deviation is requested; unresolved material findings block implementation/release | PASS |

### Post-design gate

The Phase 1 model and contracts preserve the specification's public behavior, make local-only and
metadata boundaries verifiable, define additive draft migrations, and expose rather than hide
fallbacks or partial failures. No constitution exception or complexity waiver is required. High-risk
implementation slices—metadata rewriting, Web Share Target interception, service-worker updates,
draft migration, and preview/export fidelity—require independent role-specific review before release.

## Architecture and Delivery Approach

1. Bootstrap one Svelte/Vite PWA with self-hosted assets, a stable manifest identity, an atomic
   precache, a cached navigation fallback, and an explicit offline-readiness handshake.
2. Import all sources through one validated `File` contract. The file input is universal; Web Share
   Target is an enhancement whose POST is intercepted locally and never forwarded. Disable the
   manifest share target if zero-egress interception cannot be demonstrated.
3. Parse metadata and coordinate candidates from bounded Blob ranges. Keep WGS84 as the canonical
   location and vendor only the verified, UI-independent `pwa_map` coordinate modules with required
   MIT notices and vectors.
4. Persist compressed sources and canonical editor state transactionally in IndexedDB. Storage
   persistence is requested but never promised; quota or eviction risk is visible to the user.
5. Use normalized display-oriented overlay geometry and one layout/text-measurement implementation
   for DOM-accessible editing, preview, and export. Full-resolution decode/render/encode runs one
   photo at a time in a worker, with the same renderer on the main thread as a capability fallback.
6. Preserve the documented safe metadata profile only for same-format export. Structural or unsafe
   metadata is excluded, and any unavailable preservation mode blocks until the user explicitly
   chooses metadata removal; no silent stripping or GPS rewrite is permitted.
7. Hand each output to a save picker when supported, otherwise to a browser download (or supported
   system share). Report the handoff accurately and never overwrite or mutate the source handle.

### Privacy interpretation

FR-004 and SC-009 are implemented as a prohibition on application-controlled transmission of photo
pixels, metadata, coordinates, and annotations. Browser or operating-system location services may
derive `CURRENT GPS` using implementation-specific network signals; the application cannot control
or claim otherwise. It calls geolocation only from an explicit action, never watches location, and
does not place the result in any application network request.

## Project Structure

### Documentation (this feature)

```text
specs/001-annotate-photos/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── coordinates.md
│   ├── draft-lifecycle.md
│   ├── editing-workspace.md
│   ├── photo-import-export.md
│   └── platform-offline-privacy.md
└── tasks.md                         # Created by $speckit-tasks, not this plan
```

### Source Code (repository root)

```text
src/
├── App.svelte
├── app.css
├── components/
│   ├── workspace/
│   ├── coordinate/
│   ├── overlays/
│   └── export/
├── domain/
│   ├── coordinates/
│   │   ├── converters/
│   │   ├── parseCoordinateInput.ts
│   │   ├── result.ts
│   │   └── types.ts
│   ├── photos/
│   ├── overlays/
│   ├── drafts/
│   └── export/
├── infrastructure/
│   ├── metadata/
│   ├── storage/
│   ├── platform/
│   └── pwa/
├── renderer/
│   ├── layout.ts
│   ├── preview.ts
│   └── export.ts
├── workers/
│   └── photo-renderer.worker.ts
└── types/

static/
├── icons/
└── fonts/

tests/
├── unit/
│   ├── coordinates/
│   ├── metadata/
│   ├── overlays/
│   └── drafts/
├── component/
├── integration/
│   ├── fixtures/
│   ├── offline/
│   └── export/
└── e2e/
    ├── mobile/
    └── desktop/

docs/
├── adr/
└── ui/
```

**Structure Decision**: Use one frontend project because all required processing is local and the
mobile and desktop experiences share one adaptive state model. Domain code stays independent of
Svelte; browser adapters own storage, metadata, file APIs, and PWA behavior. The renderer is shared
between preview and export, while accessible interaction remains in DOM components.

## Complexity Tracking

No constitutional violations require justification.
