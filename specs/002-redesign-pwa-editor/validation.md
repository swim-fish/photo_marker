# Implementation Validation

## Setup — 2026-09-05

- Requirements checklist: 16/16 checked; read-only review gate passed. No extension hooks.
- Stack and ignore files inspected. Private npm package; no npm publication ignore needed.
- `npm run test -- tests/unit/coordinates tests/unit/drafts tests/unit/overlays tests/integration/storage`: 11 files, 105 tests passed.
- Existing desktop Chromium performance test passed with 4032x3024 PNG: preview 469.37 / 381.15 / 293.69 ms; export 1455.37 / 1404.94 / 1414.59 ms.
- This is a three-run desktop PNG characterization, not SC-006's JPEG/device p95 acceptance. Physical Android and 20-run JPEG validation remain release gates.
- Supported target matrix: Android 10+ Chrome, Windows 11 Chrome/Edge; emulation is not physical-device evidence.
- Figma 4:3 design context inspected: ink #18352f, accent #16745c, background #f8faf7, pale #eaf3ec, muted #64766f, white; 8/12/16/24px spacing; control radius 14px, card 18px; Noto Sans TC.
- NLSC catalog reconfirmed EMAP5/PHOTO2 z19 and B5000 z18. Direct capabilities requests in Python and PowerShell failed certificate validation. No TLS bypass used; actual matrix/style/CORS/provider availability remain a release dependency.

## Task evidence

T001: characterization complete with physical/JPEG checks explicitly pending.
T002: design inventory mapped in UI contract and specification.
T003: catalog checked; capabilities failure recorded as permitted external release dependency.

## Foundations and editor increments

- Storage tests first failed on old database name, absent stores/repository, old migration invocation,
  missing nested PNG references and mutable shared asset IDs. After corrections: 5 files / 32 tests pass.
- Independent storage review identified nested-reference and immutable-asset defects; both reproduced
  in tests then fixed. Restore also checks PNG references and reports asset-not-found.
- Editor transaction/shell tests: 3 passed. Corner layout tests: 2 passed, including overflow rejection.
- Redesigned desktop browser suite: 2 passed (real generated JPEG import/download/cancel review;
  manual zero coordinate, canceled current GPS candidate, explicit map consent and layer cancellation).
- Existing tiny orientation JPEG fixture fails browser decoding; new browser fixture uses real canvas
  JPEG bytes. Orientation-specific renderer fixtures remain in their dedicated suites.
- Map suites: 4 files / 9 tests pass. Independent map review exposed missing runtime SW enforcement
  and stale GPS busy state; runtime per-client authorization plus invalidation were implemented.
- RGBA/stepper/rounded-background tests: 3 files / 5 tests pass. Typecheck: zero errors/warnings.
- Implementation routing refinement: Workspace owns the new single-photo flow directly; EditorShell
  replaces legacy SinglePhotoWorkspace/PhotoStatus/DraftStatus view composition. Existing domain import,
  metadata, renderer and export adapters are reused. Focused new tests target the delivered flow,
  rather than retaining old multi-step/batch component APIs. Corner layout is a focused domain module.
- New runtime files use the existing stack; no dependency additions. Source uploads remain absent.

## Remaining release evidence

Real provider capabilities/TLS/CORS, physical-device share and JPEG p95, ten-person usability,
full 19-state responsive visual approval remain pending. Integrated production offline verification
subsequently passed as recorded below.
Task checkboxes for those gates must remain unchecked until evidence exists.

## Final automated verification — 2026-09-05

- `npm test`: 55 files / 234 tests passed. No empty suite used as evidence.
- `npm run typecheck`: zero errors and warnings. `npm run lint`: passed.
- `npm run build`: passed; existing Vite PWA `inlineDynamicImports` deprecation warning only.
- Changed source/test/HTML formatting and `git diff --check`: passed. Docs/specs are excluded by
  the repository Prettier ignore, so their UTF-8/whitespace was checked separately.
- Production browser command: `RUN_OFFLINE_E2E=1`, `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4174`,
  Playwright redesigned-editor, responsive-editing, production-map-policy, desktop/mobile
  offline-workflow and editor-visual suites: 22 passed / 2 intentional opposite-platform skips.
  The latter skips avoid running desktop-only and mobile-only wrappers on the wrong project.
- Additional production map regression: both projects passed center/zoom preservation through
  PHOTO2 and B5000 switches after panning, plus close/open/restart/revoke/cache assertions.
- Vite browser `watermark-renderer.spec.ts`: passed 16 pixel-equivalence combinations (8 orientation
  transforms × preserve/remove metadata modes) between actual worker and fallback canvas paths.
  This uses valid PNG pixels and explicit orientation inputs, not malformed tiny JPEG fixtures.
- Real browser-encoded JPEG plus synthetic EXIF GPS imports as CAPTURE_METADATA at
  25.033000, 121.565400. Export checks retain the source digest internally. Download remains a copy.
- RGBA export pixel fixture: red 255 at alpha .85 over black becomes 216–218 red, zero green/blue,
  opaque output; preview matches. Independent renderer tests verify foreground alpha remains 1.
- PNG upload/reopen and template quota failure/retry/cancel browser journeys passed. Canonical
  templates strip photo data; shared asset bytes cannot be overwritten. Defaults survive cleanup.
- New regression tests initially failed for missing template sanitization, partial RGBA channel
  acceptance, unbounded preview size and cross-photo arrangement reuse, then passed after fixes.
- Old batch/navigation E2E journeys are superseded by the new flow and were not treated as release
  gates. Existing applicable unit/integration/component suites all remain part of `npm test`.

## Independent review disposition

Storage review verified atomic nested PNG references, immutable shared asset IDs, cleanup isolation
and old-storage isolation. Later findings about restore/import completion and canceled/reopened
settings transactions were fixed with generation and transaction-identity guards. Missing default
IDs now produce a visible built-in fallback notice.

Map review identified missing runtime enforcement and worker-memory lifetime defects. The delivered
worker queries the requesting live page on every allowed-path tile request. No controller or no reply
fails closed; close synchronously changes the reply to false. The review confirmed both P1 issues
resolved. Browser tests explicitly stopAllWorkers, then verify allowed tiles still work and revoked
requests return 403. The unused in-memory policy class was removed.

Renderer review identified cross-photo reuse of an arrangement with the same settings fingerprint.
Reuse now additionally requires photo ID and algorithm version, and new imports clear the previous
arrangement. Renderer rejects unsupported versions and incorrect 1/5/10/20 cardinality. Orientation,
background/foreground alpha and normalized preview/export mapping received independent review.

## Performance characterization

Windows desktop Chromium, synthetic patterned 4032×3024 JPEG, 20 runs, 20 repeated text watermarks:

| Measure | p95 |
| --- | ---: |
| Import through bounded rendered preview | 795.45 ms |
| Corner-text edit through updated preview | 451.01 ms |
| Full-size annotated JPEG download | 963.55 ms |

Measured with `RUN_EDITOR_PERF=1` and `tests/e2e/editor-performance.spec.ts`; includes browser journey
overhead. Preview is capped at 1280 px on its long edge and debounced by 80 ms. Export retains raw
source dimensions, subject to upright orientation when metadata is removed. The original baseline
used three PNG runs; different fixture/measurement boundaries mean this is not a direct speedup claim.
The synthetic desktop characterization does not replace representative physical-phone JPEG/PNG
or Windows Edge acceptance. Physical reference-device and PNG-watermark timing gates remain open.

Production lazy Leaflet JS: 43.38 kB gzip; CSS: 6.36 kB gzip, together below the 60 KiB budget.
No new packages or network origins were introduced.

## Visual inspection and requirement audit

Phone screenshots were inspected for editor, templates and RGBA controls. This found a legacy dark
body gradient overriding the new tokens; old global styles were removed and light-background/text
contrast rechecked. Figma semantic colors, typography, radii and three main editor actions are used.
320/768/1280 px automated checks verify >=50×50 px stepper targets, >=24 px gap, no horizontal
scroll, reachable focused RGBA input and heading focus after return. These are browser viewport
checks, not evidence of a physical Android on-screen keyboard or all 19 states on every device.

| Requirements | Delivered implementation / evidence |
| --- | --- |
| FR-001–002 | EditorShell/Workspace; real JPEG + EXIF GPS import and preview/export journeys |
| FR-003–009 | Coordinates, explicit candidate confirmation, three layers, live SW policy; vectors/map/production tests |
| FR-010–011 | cornerLayout/CornerTextEditor/preferences; collision, Unicode, default and reopen tests |
| FR-012–014 | shared RgbaPicker/appearance renderer; partial-input and actual preview/export pixel tests |
| FR-015–017 | seeded arrangements/PNG intake/renderer; 5/10/20 layouts, identity, storage and 16 browser transform comparisons |
| FR-018–020 | sanitized built-ins/custom templates, thumbnails, atomic saves/defaults; two-photo and quota/retry/cancel tests |
| FR-021–022 | review with original size/JPEG quality/format/metadata and truthful download/share result; draft retained |
| FR-023–025 | tokens/shared controls/zh-TW interface and document/manifest language; keyboard and viewport checks |
| FR-026 | fresh photo-marker-v2 schema 1; no old reads/migration/dual-write, no deletion of old data |
| SC-001 | Pending: ten-person first-use evaluation |
| SC-002–005 | Deterministic implemented contracts covered; actual provider dependency remains open |
| SC-006 | Desktop characterization passed target values; physical representative-device gate pending |
| SC-007 | Automated widths/focus passed; physical keyboard and complete device matrix pending |
| SC-008–009 | Production offline, source integrity, current-schema and atomic-storage automated gates passed; physical share pending |
| SC-010 | Main shared controls visually inspected; complete 19-state approval pending |

Implementation routing: planned SinglePhotoWorkspace/PreviewStage/PhotoStatus/DraftStatus/ExportReview
view changes are integrated into the active Workspace + EditorShell. New color/corner/watermark
modules serve the active flow; unused legacy component APIs were not extended. Browser acceptance
covers planned component-boundary cases where integration provides stronger evidence.

## Remaining release constraints and workflow status

55/59 tasks are complete. T034/T055/T056/T057 remain unchecked for actual physical-device keyboard,
Android sharing, representative-device/PNG timing and the ten-user/full-visual approval sessions.
NLSC capabilities/TLS/CORS could not be verified from this environment; the opt-in smoke now requests
exactly one tile per configured layer and never bypasses TLS. Do not claim these gates passed or
publish a production release based only on automation. Validation itself did not create an implementation commit or deployment.

ADR impact: ADR 0002 now documents the implemented state/storage/map decisions; ADR 0001 is partially
superseded. UI-documentation impact: the new UI contract is active, and the old workspace guide is
explicitly historical. `.specify/extensions.yml` was rechecked and is absent; no after_implement hooks.
