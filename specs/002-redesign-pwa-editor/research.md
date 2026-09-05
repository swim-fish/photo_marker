# Research: Figma-Aligned PWA Redesign

Research date: 2026-09-05. Source inspection and two bounded read-only reviews informed these decisions.

## 1. Retain the application and renderer

**Decision**: Keep Svelte/TypeScript/Vite, existing Workspace integrations, domain Result objects,
worker concurrency 1, and Canvas renderer; add focused state/settings modules, not a framework/router.
**Rationale**: Workspace already owns draft/import/batch/export behavior. TextOverlay already accepts
object/string RGBA, but canvasRenderer uses fillRect with no corner radius and has no watermark layer.
**Alternatives**: New application or DOM-only export would duplicate contracts and risk orientation drift.
**Evidence**: src/components/workspace/Workspace.svelte; src/domain/overlays/types.ts;
src/renderer/canvasRenderer.ts; src/infrastructure/platform/renderWorkerClient.ts.

## 2. Direct adoption with one fresh database

**Decision**: Use `photo-marker-v2`, database version 1 / record schema 1, with sessions, revisions,
photos, sharedIntake, preferences, templates and watermarkAssets. One connection owns the schema.
**Rationale**: The user's 2026-09-05 instruction explicitly removes backward compatibility.
One database supports atomic asset-plus-draft/template commits and revision pointer updates.
Old `photo-marker-drafts` data and old consent are neither imported nor modified.
**Alternatives**: Separate settings/draft databases introduce partial cross-database saves without
benefit under this scope. Migration, dual writes and old-client rollback are unnecessary.
localStorage cannot provide the required Blob and multi-record transaction guarantees.
**Evidence**: Existing database.ts/draftRepository.ts provide reusable transaction patterns;
sharedIntake is consumed wholesale, so reusable assets need their own store.
**Review boundary**: Earlier independent storage review examined old-client constraints. That
compatibility premise is superseded by the explicit user instruction; final unified transactions
require implementation tests for abort/quota, source/revision integrity and cleanup isolation.

## 3. Versioned deterministic watermark placement

**Decision**: Store resolved normalized rectangles plus algorithmVersion, fingerprint and seed in the
draft, separate from template preferences. Use 5/10/20 requested copies, max 20, <=200 placement attempts.
**Rationale**: Seed alone would not guarantee stability after algorithm/font changes. Shared resolved
geometry lets preview and export agree under orientation transforms.
**Alternatives**: Random placement on every render would violate stable reopening/export; storing
watermarks as ordinary corner text would break foreground collision and template semantics.
**Limits**: Text <=120 code points; bounded PNG <=2 MiB, <=2048 px/axis. These are explicit initial
implementation limits, subject to focused performance validation, not existing product limits.

## 4. Canonical RGBA and reference-size controls

**Decision**: Use validated RGBA channel objects throughout new storage and rendering, with one background alpha.
Translate UI pixel sizes to existing normalized geometry using a 390px reference, with one-pixel steps.
**Rationale**: Reference-based normalized geometry keeps preview/export sizing consistent. Global alpha must be isolated to watermark operations, not entire boxes.
**Alternatives**: Mixed stored CSS strings add parsing ambiguity; duplicate opacity fields
cause double compositing. Arbitrary CSS color input is unnecessary.

## 5. Explicit map candidates and bounded layer registry

**Decision**: Separate map viewport candidate from confirmed CoordinateRecord; commit on explicit
confirmation only. Add MAP_SELECTION provenance. Use a fixed DOM crosshair, not a draggable marker.
Keep NLSC WMTS origin and candidate layer registry: EMAP5 (standard), PHOTO2 (orthophoto imagery),
B5000 (basic topographic map). Label imagery as "satellite / orthophoto" or explain orthophoto source;
do not falsely claim PHOTO2 is satellite acquisition.
Use common zoom 0–18 for the redesigned switchable map, since B5000 is listed through z18;
this avoids changing zoom during a layer switch.
**Rationale**: Existing MapPreview is read-only; emap5 adapter only exposes destroy. Explicit callbacks
and stale-request guards are required. The same host needs no broader CSP host exception, but the
service-worker allowlist and consent disclosure must recognize exactly the three reviewed paths.
Use consent policy version 2 and the new photo-marker-v2:map-network-consent key; never reuse old
consent. Only the three exact reviewed WMTS paths are allowed, not the whole host.
**Alternatives**: Arbitrary providers/geocoding expand privacy scope; silent provider fallback is rejected.
**Official evidence**:
- [NLSC WMTS catalog](https://maps.nlsc.gov.tw/S09SOA/pro/Wmts_ajax_main.jsp) lists
  EMAP5/PHOTO2 through z19 and B5000 through z18, and the WMTS capabilities endpoint.
- [NLSC data explanation](https://www.nlsc.gov.tw/cp.aspx?n=1547) distinguishes qualifying open data
  from other service terms; do not label all three layers unrestricted open data.
- [NLSC service manual and terms](https://maps.nlsc.gov.tw/downloaddoc/UserManual.pdf) requires
  source/rights notices and allows service limitations.
**Verification boundary**: Catalog evidence supports selection, not guaranteed current tile/CORS
availability or SLA. Before shipping, verify capabilities matrix/style, one bounded tile per layer,
CORS and required attribution/terms. Failure leaves that layer visibly unavailable and blocks
claiming the corresponding layer works; no placeholder tile or silent substitution.
**Evidence in repository**: src/infrastructure/map/emap5.ts; src/domain/map/mapConsent.ts;
src/infrastructure/pwa/serviceWorkerPolicy.ts; index.html; tests/e2e/desktop/real-emap5-smoke.spec.ts.

## 6. Localization and coordinate correctness

**Decision**: Add typed zh-TW messages using English keys/catalog as fallback and remove direct
messages.en bindings in changed user flows. Retain English availability and test stable roles/IDs.
Accept legitimate (0,0); allow null device accuracy with a truthful unavailable label.
**Rationale**: Current i18n/index.ts exposes only English; workingCoordinate.ts rejects (0,0) and
requires current-GPS accuracy. Those conflict with the new specification and need explicit failing tests.
**Alternatives**: Hardcoded Chinese in components or invented accuracy would violate shared semantics.

## Research closure

No unresolved architecture choice remains. Provider smoke, devices, usability targets, and limits are
implementation/release evidence tasks rather than claims already verified. Map/privacy and the original storage proposal received separate read-only reviews. The final storage
choice follows the latest no-compatibility instruction; no application source was modified here.
