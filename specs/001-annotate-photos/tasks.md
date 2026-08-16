# Tasks: Offline Photo Annotation

**Input**: Design documents from `/specs/001-annotate-photos/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`,
`docs/adr/0001-offline-photo-annotation-architecture.md`, and
`docs/ui/photo-annotation-workspace.md`

**Tests**: Required by the project constitution. For every behavior slice, write or update the
focused test, run it, and confirm that it fails for the expected reason before implementation.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated as
an independently reviewable increment. All file paths are repository-relative.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it owns different files and has no dependency on another
  incomplete task in the same group.
- **[Story]**: Maps the task to a user story from `spec.md`.
- Setup, foundational, and cross-cutting tasks intentionally have no story label.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Bootstrap one client-only Svelte/TypeScript PWA and its test/quality toolchain.

- [ ] T001 Create the Svelte 5 and TypeScript application skeleton, dependency scripts, entry point, and English localization catalog in `package.json`, `index.html`, `src/main.ts`, `src/App.svelte`, `src/app.css`, `src/i18n/index.ts`, and `src/i18n/en.ts`
- [ ] T002 Configure Vite, TypeScript, Svelte, Vitest, and browser test environments in `vite.config.ts`, `tsconfig.json`, `svelte.config.js`, and `tests/setup.ts`
- [ ] T003 [P] Configure ESLint and Prettier with zero-warning CI scripts in `eslint.config.js`, `.prettierrc`, and `.prettierignore`
- [ ] T004 [P] Configure Playwright projects for supported mobile and desktop fixtures in `playwright.config.ts` and `tests/e2e/fixtures.ts`
- [ ] T005 [P] Add self-hosted application icons and an approved Taiwan Traditional Chinese-capable font with license records in `static/icons/`, `static/fonts/`, and `THIRD_PARTY_NOTICES.md`
- [ ] T006 Create deterministic, non-sensitive JPEG/PNG/orientation fixtures and fixture helpers in `tests/integration/fixtures/` and `tests/helpers/photoFixtures.ts`

**Checkpoint**: The empty application builds, all quality commands resolve, and the test runners can
execute an intentionally empty suite.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish typed contracts, canonical state, validation, and renderer geometry shared by
all user stories.

**Critical**: No user story implementation begins until this phase is green.

### Foundational tests

- [ ] T007 [P] Write and run failing tests for typed non-sensitive errors and photo/session validation limits in `tests/unit/domain/result.spec.ts` and `tests/unit/photos/photoLimits.spec.ts`
- [ ] T008 [P] Write and run failing tests for normalized overlay clamping, ordering, and oriented-image geometry in `tests/unit/overlays/geometry.spec.ts` and `tests/unit/renderer/layout.spec.ts`
- [ ] T009 [P] Write and run failing reducer tests for editing-session revisions, active-photo selection, and legal state transitions in `tests/unit/drafts/editingSession.spec.ts`

### Foundational implementation

- [ ] T010 Implement typed success/failure results and sanitized diagnostic codes in `src/domain/result.ts` and `src/infrastructure/platform/diagnostics.ts`
- [ ] T011 [P] Implement SourcePhoto, CoordinateRecord, TextOverlay, ExportConfiguration, ExportResult, and EditingSession types in `src/domain/photos/types.ts`, `src/domain/coordinates/types.ts`, `src/domain/overlays/types.ts`, `src/domain/export/types.ts`, and `src/domain/drafts/types.ts`
- [ ] T012 Implement JPEG/PNG count, byte, dimension, pixel-area, and aggregate-storage limit validation in `src/domain/photos/photoLimits.ts`
- [ ] T013 Implement display-oriented normalized geometry, bounds clamping, ordering, and shared layout primitives in `src/domain/overlays/geometry.ts` and `src/renderer/layout.ts`
- [ ] T014 Implement the canonical editing-session reducer and selectors, making T007–T009 green, in `src/domain/drafts/editingSession.ts` and `src/domain/drafts/selectors.ts`

**Checkpoint**: Shared entities and pure domain behavior pass focused tests without browser or Svelte
dependencies.

---

## Phase 3: User Story 1 — Annotate and Export One Photo (Priority: P1) MVP

**Goal**: Import one JPEG/PNG photo, use capture GPS, manual WGS84, or explicit current location, add
and style text overlays, preview, and export a separate copy while preserving the source and the
supported metadata profile.

**Independent Test**: Import one supported photo, add one coordinate overlay and one free-form text
overlay, export it, compare preview/output geometry and metadata behavior, and prove the source hash
is unchanged. Repeat missing-GPS handling with manual WGS84 and explicit `CURRENT GPS` acceptance.

### Tests for User Story 1 — write and observe failure first

- [ ] T015 [P] [US1] Write and run failing import tests for magic bytes, dimensions, EXIF GPS/orientation, malformed metadata, and source SHA-256 identity in `tests/unit/metadata/readMetadata.spec.ts` and `tests/integration/import/singlePhoto.spec.ts`
- [ ] T016 [P] [US1] Write and run failing coordinate tests for capture, manual WGS84 DD, explicit geolocation grant/deny/timeout, accuracy acceptance, and immutable provenance in `tests/unit/coordinates/workingCoordinate.spec.ts`
- [ ] T017 [P] [US1] Write and run failing overlay tests for Unicode content, add/edit/remove/reorder, pointer/keyboard movement parity, and contrast warnings in `tests/unit/overlays/overlayEditor.spec.ts`
- [ ] T018 [P] [US1] Write and run failing renderer tests for EXIF orientations 1–8, bundled-font text, preview/export geometry, worker fallback, and resource cleanup in `tests/unit/renderer/renderPhoto.spec.ts` and `tests/integration/export/orientationFidelity.spec.ts`
- [ ] T019 [P] [US1] Write and run failing export tests for JPEG/PNG MIME verification, default dimensions/quality, safe metadata preserve/remove, unchanged GPS, conflict-safe names, cancellation, and source hash stability in `tests/unit/metadata/writeMetadata.spec.ts` and `tests/integration/export/singlePhoto.spec.ts`
- [ ] T020 [US1] Write and run the failing single-photo component/E2E journey, including empty/loading/error/disabled/success states and keyboard-only completion, in `tests/component/SinglePhotoWorkspace.spec.ts` and `tests/e2e/desktop/single-photo.spec.ts`

### Implementation for User Story 1

- [ ] T021 [US1] Implement bounded JPEG/PNG signature, dimension, orientation, GPS, and supported metadata parsing with `exifr` in `src/infrastructure/metadata/readMetadata.ts` and `src/infrastructure/metadata/metadataProfile.ts`
- [ ] T022 [US1] Implement source digesting and the common single-file import pipeline without source-handle writes in `src/domain/photos/importPhoto.ts` and `src/infrastructure/platform/hashBlob.ts`
- [ ] T023 [US1] Implement capture/manual WGS84 working-coordinate replacement and explicit one-shot geolocation with accuracy review in `src/domain/coordinates/workingCoordinate.ts` and `src/infrastructure/platform/geolocation.ts`
- [ ] T024 [US1] Implement overlay add/edit/remove/reorder, normalized move/resize steps, and contrast status in `src/domain/overlays/overlayEditor.ts`
- [ ] T025 [US1] Implement shared preview/export drawing, explicit orientation transforms, encoder MIME checks, and main-thread fallback in `src/renderer/preview.ts`, `src/renderer/export.ts`, and `src/renderer/canvasRenderer.ts`
- [ ] T026 [US1] Implement sequential worker decode/render/encode and deterministic graphical-resource cleanup in `src/workers/photo-renderer.worker.ts` and `src/infrastructure/platform/renderWorkerClient.ts`
- [ ] T027 [US1] Implement bounds-checked JPEG/PNG supported-metadata attachment and explicit removal without capture-GPS rewriting in `src/infrastructure/metadata/writeMetadata.ts`, making T018–T019 green
- [ ] T028 [US1] Implement export defaults, fallback disclosure, conflict-safe naming, save-picker/download handoff, and accurate `handedOff` results in `src/domain/export/exportPhoto.ts` and `src/infrastructure/platform/saveOutput.ts`
- [ ] T029 [P] [US1] Build accessible empty/import/photo-status UI states in `src/components/workspace/ImportPanel.svelte`, `src/components/workspace/PhotoStatus.svelte`, and `src/components/workspace/StatusRegion.svelte`
- [ ] T030 [P] [US1] Build the provenance/accuracy card and explicit current-location/manual-WGS84 controls in `src/components/coordinate/CoordinateCard.svelte` and `src/components/coordinate/Wgs84Input.svelte`
- [ ] T031 [P] [US1] Build the semantic overlay list, inspector controls, direct-manipulation stage, and explicit zoom controls in `src/components/overlays/OverlayList.svelte`, `src/components/overlays/OverlayInspector.svelte`, and `src/components/workspace/PreviewStage.svelte`
- [ ] T032 [P] [US1] Build export settings, review confirmation, progress, and durable result UI in `src/components/export/ExportSettings.svelte`, `src/components/export/ExportReview.svelte`, and `src/components/export/ExportResults.svelte`
- [ ] T033 [US1] Integrate the single-photo canonical state and UI in `src/App.svelte` and `src/components/workspace/Workspace.svelte`, then make T015–T020 green and visually inspect the approved single-photo fixtures

**Checkpoint**: User Story 1 is a complete independently demonstrable MVP. Do not begin refactoring
until its focused tests are green.

---

## Phase 4: User Story 2 — Select Trustworthy Coordinate Formats (Priority: P2)

**Goal**: Accept and display WGS84 DD/DMS, TWD97, TWD67, MGRS, and Taipower values while preserving
canonical WGS84 and provenance and surfacing zone/coverage/precision decisions.

**Independent Test**: Run all approved reference vectors and unsupported coverage cases, manually
enter one value in every format, switch every display format, and confirm provenance plus any
auto-resolved zone remains visible through export.

### Tests for User Story 2 — write and observe failure first

- [ ] T034 [P] [US2] Copy the approved MIT vector fixture and digest, then write and run failing integrity/vector tests for WGS84, TWD97, TWD67, MGRS, and Taipower in `tests/unit/fixtures/test-vectors.json`, `tests/unit/fixtures/vectors-digest.txt`, and `tests/unit/coordinates/converters.spec.ts`
- [ ] T035 [P] [US2] Write and run failing parser tests for all manual formats and typed malformed/out-of-range/out-of-coverage/unsupported-precision results in `tests/unit/coordinates/parseCoordinateInput.spec.ts`
- [ ] T036 [P] [US2] Write and run failing tests for TWD97 zone auto-resolution visibility, TWD67 zone-121 tolerances, MGRS southwest-corner semantics, and Taipower unsupported cells in `tests/unit/coordinates/coordinateRegressions.spec.ts`
- [ ] T037 [US2] Write and run failing component/E2E tests for format input, display selection, coverage errors, provenance, and export labels in `tests/component/CoordinateInspector.spec.ts` and `tests/e2e/desktop/coordinate-formats.spec.ts`

### Implementation for User Story 2

- [ ] T038 [US2] Vendor only the verified `pwa_map` coordinate/result/type modules with relative imports and add exact MIT/vector attribution in `src/domain/coordinates/converters/`, `src/domain/coordinates/result.ts`, and `THIRD_PARTY_NOTICES.md`
- [ ] T039 [US2] Implement the local coordinate facade, parser, display formatter, coverage checks, and surfaced zone/precision metadata in `src/domain/coordinates/parseCoordinateInput.ts`, `src/domain/coordinates/formatCoordinate.ts`, and `src/domain/coordinates/index.ts`, making T034–T036 green
- [ ] T040 [P] [US2] Build per-format manual input fields and typed validation feedback in `src/components/coordinate/CoordinateInput.svelte` and `src/components/coordinate/CoordinateErrors.svelte`
- [ ] T041 [P] [US2] Build display-format/precision selection and explicit zone/coverage/provenance presentation in `src/components/coordinate/CoordinateFormatSelector.svelte` and `src/components/coordinate/CoordinateCard.svelte`
- [ ] T042 [US2] Integrate all coordinate formats into the overlay/export state in `src/components/workspace/Workspace.svelte` and `src/domain/overlays/coordinateOverlay.ts`, then make T037 green and verify reference output against the approved vectors

**Checkpoint**: User Story 2 passes every approved coordinate vector and never fabricates an
out-of-coverage value.

---

## Phase 5: User Story 3 — Work Offline on Mobile and Desktop (Priority: P2)

**Goal**: Install and reopen the application offline, restore local drafts, retain the universal file
input, and provide the same accessible workflow at supported mobile/desktop sizes. Enable Web Share
Target only after its zero-egress release gate passes.

**Independent Test**: Establish readiness on representative Android Chrome and Windows Chrome/Edge,
disconnect the network, reopen, import/annotate/export, restore and clear a draft, and complete the
workflow with touch and keyboard at documented viewport fixtures.

### Tests for User Story 3 — write and observe failure first

- [ ] T043 [P] [US3] Write and run failing IndexedDB tests for transactional revisions, Blob restoration, additive migration/rollback, export/discard cleanup, persistence denial, and quota failure in `tests/unit/drafts/draftRepository.spec.ts` and `tests/integration/storage/draftRecovery.spec.ts`
- [ ] T044 [P] [US3] Write and run failing PWA tests for manifest identity, precache completeness, readiness handshake, failed-update rollback, and no user photos in Cache Storage in `tests/integration/offline/pwaReadiness.spec.ts`
- [ ] T045 [P] [US3] Write and run failing privacy/share tests for zero user-data network calls and exact local POST interception without `fetch()` forwarding in `tests/integration/offline/localOnly.spec.ts` and `tests/integration/offline/shareTarget.spec.ts`
- [ ] T046 [P] [US3] Write and run failing responsive/accessibility tests for documented states, focus order, drag alternatives, modal focus return, status announcements, and target sizing in `tests/component/AdaptiveWorkspace.spec.ts` and `tests/component/AccessibilityInteractions.spec.ts`
- [ ] T047 [US3] Write and run failing offline mobile/desktop E2E journeys for readiness, file-input fallback, reload restoration, and draft cleanup in `tests/e2e/mobile/offline-workflow.spec.ts` and `tests/e2e/desktop/offline-workflow.spec.ts`

### Implementation for User Story 3

- [ ] T048 [US3] Implement the versioned `idb` schema, additive migrations, transactional Blob/session persistence, quota estimation, and persistence status in `src/infrastructure/storage/database.ts`, `src/infrastructure/storage/migrations.ts`, and `src/infrastructure/storage/draftRepository.ts`
- [ ] T049 [US3] Implement debounced autosave, pointer-up/visibility flush, restore, successful-export cleanup, and explicit discard in `src/domain/drafts/draftService.ts` and `src/components/workspace/DraftRecovery.svelte`
- [ ] T050 [US3] Configure the stable manifest identity, production CSP, atomic application-shell precache, self-hosted assets, update rollback, and readiness message protocol in `vite.config.ts`, `src/infrastructure/pwa/readiness.ts`, and `src/infrastructure/pwa/serviceWorker.ts`
- [ ] T051 [US3] Implement the exact Web Share Target POST handler and build-time disabled-until-validated manifest gate in `src/infrastructure/pwa/shareTarget.ts` and `vite.config.ts`, making T044–T045 green without adding a server upload path
- [ ] T052 [P] [US3] Build persistent offline/draft/storage states and install guidance in `src/components/workspace/OfflineStatus.svelte`, `src/components/workspace/DraftStatus.svelte`, and `src/components/workspace/InstallHelp.svelte`
- [ ] T053 [US3] Implement the documented stacked/two-region/three-region layout, 320 CSS px reflow, pointer-independent controls, visible focus, and non-obscuring sticky regions in `src/app.css` and `src/components/workspace/Workspace.svelte`
- [ ] T054 [US3] Make T043–T047 green, then run and record the focused Android/Windows offline, share-gate, touch, keyboard, viewport, 400% zoom, and screen-reader smoke results in `specs/001-annotate-photos/verification.md`

**Checkpoint**: User Story 3 works offline after explicit readiness. `share_target` remains disabled in
the release manifest unless its physical-device zero-egress result is recorded as PASS.

---

## Phase 6: User Story 4 — Annotate Multiple Photos Efficiently (Priority: P3)

**Goal**: Import up to 20 photos, apply shared overlay/display settings while retaining per-photo
coordinates, review unresolved items, export sequentially, and preserve every successful result when
another item fails.

**Independent Test**: Import 20 valid photos plus one invalid item, apply shared settings, resolve or
omit missing coordinates, export sequentially, and verify per-item success/failure/retry plus unchanged
source hashes and recoverable partial draft state.

### Tests for User Story 4 — write and observe failure first

- [ ] T055 [P] [US4] Write and run failing batch-domain tests for 20-item intake, duplicate identity, per-photo provenance/status, shared-setting copies, unresolved/omit rules, and aggregate storage limits in `tests/unit/photos/batchSession.spec.ts`
- [ ] T056 [P] [US4] Write and run failing sequential-export tests for concurrency 1, resource release, partial failure, retry, successful-result retention, and source hashes in `tests/integration/export/batchExport.spec.ts`
- [ ] T057 [P] [US4] Write and run failing navigator/review/result component tests for mixed Ready/Missing/Invalid/Exported/Failed items in `tests/component/BatchWorkspace.spec.ts`
- [ ] T058 [US4] Write and run the failing 20-valid-plus-1-invalid E2E journey in `tests/e2e/desktop/batch-workflow.spec.ts`

### Implementation for User Story 4

- [ ] T059 [US4] Implement batch import, duplicate-safe item identity, per-photo review state, shared-setting copy semantics, and aggregate quota decisions in `src/domain/photos/batchSession.ts`
- [ ] T060 [US4] Implement the sequential export queue, cancellation boundaries, partial result retention, omission, and retry in `src/domain/export/batchExport.ts`
- [ ] T061 [P] [US4] Build the adaptive photo strip/rail with text-and-icon statuses and per-photo coordinate review in `src/components/workspace/PhotoNavigator.svelte` and `src/components/workspace/PhotoNavigatorItem.svelte`
- [ ] T062 [P] [US4] Build shared-setting application, unresolved/omit review, sequential progress, and partial-result retry UI in `src/components/export/BatchSettings.svelte`, `src/components/export/BatchReview.svelte`, and `src/components/export/BatchResults.svelte`
- [ ] T063 [US4] Integrate batch state, draft persistence, and sequential export into `src/components/workspace/Workspace.svelte`, make T055–T058 green, and record the focused batch reliability baseline in `specs/001-annotate-photos/verification.md`

**Checkpoint**: All four stories are independently evidenced; one bad item never destroys a valid
source, completed output, or retryable draft.

---

## Phase 7: Polish and Cross-Cutting Release Gates

**Purpose**: Close only the documented cross-cutting security, compatibility, performance,
accessibility, documentation, and definition-of-done risks.

- [ ] T064 [P] Write and run failing malformed-segment/fuzz regression tests for metadata bounds, allocation limits, and sanitized diagnostics in `tests/unit/metadata/malformedSegments.spec.ts` and `tests/unit/platform/diagnostics.spec.ts`
- [ ] T065 Implement the minimum bounds/allocation and diagnostic hardening needed to make T064 green in `src/infrastructure/metadata/readMetadata.ts`, `src/infrastructure/metadata/writeMetadata.ts`, and `src/infrastructure/platform/diagnostics.ts`
- [ ] T066 [P] Verify production CSP, absence of runtime CDN/analytics/server APIs, bundled license attribution, and source-photo exclusion from Cache Storage in `vite.config.ts`, `package.json`, and `THIRD_PARTY_NOTICES.md`
- [ ] T067 [P] Reconcile implemented responsive states, keyboard/touch behavior, metadata limitations, migrations, and rollback with `docs/ui/photo-annotation-workspace.md` and `docs/adr/0001-offline-photo-annotation-architecture.md`
- [ ] T068 Run only the focused performance checks—five 4032×3024 JPEG preview/export runs per representative Android and Windows device plus one 20-photo reliability run—and record phase timings/outcomes in `specs/001-annotate-photos/verification.md`
- [ ] T069 Run the focused first-time usability validation with at least 10 representative participants completing the single-photo workflow on supported mobile and desktop environments, verify at least 90% finish each environment without assistance within three minutes, and record anonymized aggregate outcomes in `specs/001-annotate-photos/verification.md`
- [ ] T070 Perform independent role-specific reviews of metadata rewriting, Web Share Target/service-worker privacy, draft migration, preview/export fidelity, and accessibility; resolve every material finding and record outcomes in `specs/001-annotate-photos/verification.md`
- [ ] T071 Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and the relevant Playwright projects, then record outcomes, skipped checks, blockers, remaining risks, ADR impact, and UI-documentation impact in `specs/001-annotate-photos/verification.md`

---

## Dependencies and Execution Order

### Phase dependencies

- Phase 1 (Setup) has no dependency.
- Phase 2 (Foundational) depends on Phase 1 and blocks all user stories.
- Phase 3 (US1) depends on Phase 2 and is the MVP.
- Phase 4 (US2) depends on the US1 working-coordinate and workspace integration points; its converter
  tests and vendoring preparation may start after Phase 2 in disjoint files.
- Phase 5 (US3) depends on the US1 core workflow; its storage/PWA tests may start after Phase 2 in
  disjoint files. US2 and US3 may proceed in parallel after US1.
- Phase 6 (US4) depends on US1, US2, and US3 because it batches the complete coordinate, draft, and
  export behaviors.
- Phase 7 depends on every story selected for release.

### User story graph

```text
Setup -> Foundation -> US1 (MVP) -> US2 ----\
                              \-> US3 -----+-> US4 -> Release gates
```

### Within each story

1. Create and execute all story tests; confirm expected Red failures.
2. Implement pure domain/model behavior before browser adapters.
3. Implement browser adapters before Svelte integration.
4. Make focused tests green before refactoring.
5. Run the story's independent test and record manual/visual evidence where automation is not
   technically meaningful.

## Parallel Opportunities

### Setup and foundation

- T003–T005 own separate configuration/assets after T001.
- T007–T009 are independent failing test groups.
- T011 can proceed alongside T010 after test expectations are agreed.

### User Story 1

- T015–T019 create disjoint failing test suites.
- T029–T032 build disjoint UI components after their corresponding domain services exist.

### User Story 2

- T034–T036 create disjoint coordinate regression suites.
- T040 and T041 own distinct input and display components after T039.

### User Story 3

- T043–T046 create disjoint storage, PWA/privacy, and accessibility suites.
- T052 owns status/help components while T050–T051 implement PWA adapters.

### User Story 4

- T055–T057 create disjoint domain, integration, and component suites.
- T061 and T062 own distinct navigator and export components after T059–T060.

## Parallel Execution Examples

### User Story 1

```text
T015: Import/metadata/source-identity failing tests
T016: Working-coordinate/geolocation failing tests
T017: Overlay behavior failing tests
T018: Renderer/orientation failing tests
T019: Export/metadata/source-safety failing tests
```

### User Story 2

```text
T034: Reference-vector fixture and converter tests
T035: Manual parser result tests
T036: Zone/coverage/precision regression tests
```

### User Story 3

```text
T043: IndexedDB draft and migration tests
T044: PWA readiness/update tests
T045: Local-only/share-target privacy tests
T046: Responsive/accessibility component tests
```

### User Story 4

```text
T055: Batch session tests
T056: Sequential export/partial failure tests
T057: Batch component tests
```

## Implementation Strategy

### MVP first

1. Complete Setup and Foundational phases.
2. Complete User Story 1 through T033.
3. Stop and run its independent test on desktop and the smallest supported mobile viewport.
4. Demonstrate import, coordinate provenance, overlay editing, preview, safe export, and unchanged
   source before expanding scope.

### Incremental delivery

1. US1: one-photo end-to-end value.
2. US2: verified global/Taiwan coordinate formats.
3. US3: installed offline workflow, draft recovery, and adaptive accessibility.
4. US4: reliable 20-photo batching and partial failure.
5. Cross-cutting gates: only focused security, visual, accessibility, compatibility, and performance
   evidence required by the constitution and plan.

## Notes

- Never delete, weaken, skip, or rewrite a test merely to pass a task.
- Do not add maps, cloud services, ZIP packaging, analytics, filters, native wrappers, OPFS, or broad
  imaging WASM without returning to specification/plan review.
- Web Share Target remains off unless its physical-device zero-egress gate passes.
- Performance work is limited to T068; no soak test or broad device benchmark is required.
- Commit after a coherent task or test/implementation group, preserving the Red-Green-Refactor record.
