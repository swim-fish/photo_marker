# Tasks: Figma-Aligned PWA Photo Editor Redesign

**Input**: `specs/002-redesign-pwa-editor/` spec, plan, research, data model and contracts.
**Tests**: Required by constitution II (Red-Green-Refactor), which takes precedence over optional
test examples in the task template. Write failing behavior tests first and record the expected failure.
**Organization**: Story phases are ordered P1 before P2; IDs preserve specification story identity
(US7 therefore precedes US4). All tasks below are unstarted.
**Paths**: Repository-relative. New paths are intentional implementation targets.
**[P]**: Only the marked, disjoint tasks within the same phase may run together after prior phases;
they do not authorize concurrent edits to Workspace, renderer, storage or shared test files.

## Phase 1: Setup

**Goal**: Confirm baseline and validation inputs without replacing project tooling.

- [ ] T001 Record supported devices, current focused test results and 12MP preview/export baseline in `specs/002-redesign-pwa-editor/validation.md`; use existing `package.json` scripts and record skips rather than treating empty suites as passes.
- [ ] T002 [P] Record the 19-frame design reference, tokens, view/state inventory and requirement-to-screen mapping in `docs/ui/redesigned-photo-editor.md`; preserve explicit metadata/format/provenance decisions.
- [ ] T003 [P] Verify current NLSC capabilities, terms and candidate EMAP5/PHOTO2/B5000 matrix/style identifiers, common zoom 0–18 and attribution in `specs/002-redesign-pwa-editor/research.md`; record provider failures as release dependencies, never substitute a layer silently.

**Checkpoint**: Complete this phase before dependent work.

## Phase 2: Foundational

**Goal**: Establish new-version storage, shared types and controls before integrating stories.

- [ ] T004 [P] Add failing fresh-database/current-schema roundtrip, unknown-newer rejection and old-storage isolation tests in `tests/unit/drafts/draftRepository.spec.ts` and `tests/integration/storage/draftRecovery.spec.ts`; verify failures before changing persistence.
- [ ] T005 [P] Add failing atomic asset-plus-draft/template save, quota/abort, shared-PNG and session-cleanup isolation tests in `tests/integration/storage/preferences.spec.ts`; use separate fixtures from draft test ownership.
- [ ] T006 Define canonical version-1 preferences/template/watermark types in `src/domain/templates/types.ts` and `src/domain/watermarks/types.ts`, and new draft records in `src/infrastructure/storage/draftRepository.ts`, following `data-model.md` without old-format adapters.
- [ ] T007 Implement the unified `photo-marker-v2` database and all seven stores in `src/infrastructure/storage/database.ts`; update `src/infrastructure/storage/draftRepository.ts`, `src/infrastructure/storage/migrations.ts` and `src/infrastructure/storage/preferencesRepository.ts` to share its connection, validate only current schemas, atomically save assets/references/revision pointers, and bypass old migration/read paths. Do not mutate old storage or garbage-collect assets.
- [ ] T008 Introduce Figma semantic tokens in `src/styles/tokens.css`, wire `src/app.css`, and create `src/components/ui/Button.svelte`; add typed `src/i18n/zh-TW.ts` with locale/fallback selection in `src/i18n/index.ts` and keep existing English keys.

**Checkpoint**: Complete this phase before dependent work.

## Phase 3: US1 — Quickly Mark and Save a Photo (P1, MVP)

**Goal**: Deliver the first complete import/editor/review/handoff path.

**Independent Test**: Import a GPS fixture, cancel a settings view, review and hand off a copy; verify source digest and recovery on failure.

- [ ] T009 [P] [US1] Add failing view-stack, stale-photo and apply/cancel tests in `tests/unit/editor/editorState.spec.ts`, including reviewing-to-editing and canceled-export transitions.
- [ ] T010 [P] [US1] Add failing redesigned navigation/import/handoff tests in `tests/component/SinglePhotoWorkspace.spec.ts` and `tests/integration/export/singlePhoto.spec.ts`, preserving source-format/metadata defaults and truthful canceled-share outcomes.
- [ ] T011 [US1] Implement transient view transactions in `src/domain/editor/editorState.ts` and legal return/cancel transitions in `src/domain/drafts/editingSession.ts`; commit only validated applied state once.
- [ ] T012 [US1] Create `src/components/workspace/EditorShell.svelte` and integrate focused views in `src/components/workspace/Workspace.svelte` and `src/components/workspace/SinglePhotoWorkspace.svelte`; implement the new import/share flow and remove old navigation/format adapters from the active editor.
- [ ] T013 [US1] Connect real photo preview, provenance and draft feedback in `src/components/workspace/PreviewStage.svelte`, `src/components/workspace/PhotoStatus.svelte` and `src/components/workspace/DraftStatus.svelte`; replace changed direct English bindings with locale selection.
- [ ] T014 [US1] Wire review/return/next-photo and supported save/share results in `src/components/export/ExportReview.svelte`, `src/components/export/ExportResults.svelte` and `src/infrastructure/platform/saveOutput.ts`; cancellation/failure must not trigger draft cleanup.
- [ ] T015 [US1] Run US1 acceptance tests and add the initial GPS-photo journey to `tests/e2e/redesigned-editor.spec.ts`; record expected-red then green results in `specs/002-redesign-pwa-editor/validation.md`.

**Checkpoint**: Story acceptance and focused regressions pass; completed story behavior remains intact.

## Phase 4: US2 — Confirm a Trustworthy Location (P1)

**Goal**: Provide explicit map-center/current-location confirmation and safe layer switching.

**Independent Test**: Pan, switch layers and cancel with a missing-GPS fixture; separately confirm map/current GPS and deny permission.

- [ ] T016 [P] [US2] Add failing candidate/commit/cancel/stale-result, zero-coordinate and missing-accuracy tests in `tests/unit/map/mapSelection.spec.ts` and `tests/unit/coordinates/workingCoordinate.spec.ts`.
- [ ] T017 [P] [US2] Add failing layer/consent/revoke/no-egress tests in `tests/component/MapPreview.spec.ts` and `tests/integration/offline/localOnly.spec.ts`; test zoom/center preservation and no loading before consent.
- [ ] T018 [US2] Add MAP_SELECTION provenance and valid zero/null-accuracy handling in `src/domain/coordinates/types.ts`, `src/domain/coordinates/workingCoordinate.ts`, `src/domain/overlays/coordinateOverlay.ts` and `src/infrastructure/platform/geolocation.ts`; preserve capture metadata.
- [ ] T019 [US2] Implement candidate state/request cancellation in `src/domain/map/mapSelection.ts`; update `src/domain/map/types.ts` and fresh policy-v2 consent under `photo-marker-v2:map-network-consent` in `src/domain/map/mapConsent.ts` without broadening network scope.
- [ ] T020 [US2] Create fixed layer registry in `src/infrastructure/map/layers.ts`, extend `src/infrastructure/map/emap5.ts` with settled-center callbacks and layer switching, and update exact consented tile allowlist in `src/infrastructure/pwa/serviceWorkerPolicy.ts`; enforce common zoom 0–18 and only EMAP5/PHOTO2/B5000 `/default/GoogleMapsCompatible/{z}/{y}/{x}` paths; no cache or new origin.
- [ ] T021 [US2] Add `src/components/map/MapLayerPicker.svelte` and centered non-draggable crosshair, pan/zoom alternatives, online indicator and attribution in `src/components/map/MapPreview.svelte` and `src/components/map/MapConsent.svelte`; disable confirmation during movement, enforce zoom 0–18 and label PHOTO2 衛星／正射影像.
- [ ] T022 [US2] Integrate missing-GPS alternatives and explicit map/device confirmation in `src/components/workspace/Workspace.svelte` and `src/components/coordinate/CoordinateCard.svelte`, retaining offline manual input and source-specific labels.
- [ ] T023 [US2] Extend opt-in `tests/e2e/desktop/real-emap5-smoke.spec.ts` to one bounded request per configured layer and add deterministic map/location scenarios to `tests/e2e/redesigned-editor.spec.ts`; record real-provider availability separately in `specs/002-redesign-pwa-editor/validation.md`.

**Checkpoint**: Story acceptance and focused regressions pass; completed story behavior remains intact.

## Phase 5: US3 — Coordinate Format and Four-Corner Text (P1)

**Goal**: Retain coordinate correctness and reuse independent corner defaults.

**Independent Test**: Cycle the three supported formats and every corner, reject collisions, restore a draft, and import a second photo.

- [ ] T024 [P] [US3] Add failing same-corner text-before-coordinate and WGS84/TWD97/MGRS selection/restore tests in `tests/unit/overlays/placement.spec.ts` and `tests/unit/coordinates/coordinateRegressions.spec.ts`.
- [ ] T025 [P] [US3] Add failing per-corner default/new-import-only tests in `tests/integration/storage/cornerDefaults.spec.ts` and independent corner edits in `tests/component/CornerTextEditor.spec.ts`.
- [ ] T026 [US3] Implement default loading/saving and new-import-only application in `src/domain/templates/templateService.ts` and `src/components/workspace/Workspace.svelte`; do not reapply defaults during draft restoration.
- [ ] T027 [US3] Implement `src/components/overlays/CornerTextEditor.svelte` and connect `src/components/overlays/CornerPicker.svelte`, preserving other corner values, Unicode, line breaks and literal date defaults.
- [ ] T028 [US3] Update `src/components/coordinate/CoordinateFormatSelector.svelte`, `src/components/overlays/CoordinateOverlayOptions.svelte` and `src/domain/overlays/placement.ts` for single WGS84/TWD97/MGRS selection and collision-safe inward ordering; retain invalid-layout rollback.
- [ ] T029 [US3] Run coordinate vectors, corner/default recovery and add US3 scenarios to `tests/e2e/redesigned-editor.spec.ts`; document layout/provenance evidence in `specs/002-redesign-pwa-editor/validation.md`.

**Checkpoint**: Story acceptance and focused regressions pass; completed story behavior remains intact.

## Phase 6: US7 — Safe Small-Screen Operation (P1)

**Goal**: Ship reusable separated steppers and accessible responsive controls.

**Independent Test**: Use keyboard and touch at 320px, trigger +/- once, hit limits and keep apply/cancel visible.

- [ ] T030 [P] [US7] Add failing one-activation, boundary/disabled and step-size tests in `tests/component/NumberStepper.spec.ts`.
- [ ] T031 [P] [US7] Add failing 320px target/gap, focus and keyboard-only tests in `tests/component/AccessibilityInteractions.spec.ts` and `tests/e2e/responsive-editing.spec.ts`.
- [ ] T032 [US7] Build `src/components/ui/NumberStepper.svelte` with >=50x50 targets, >=24px gap, explicit label/value/limits and native activation; add responsive rules to `src/styles/tokens.css` without duplicate key handlers.
- [ ] T033 [US7] Adopt NumberStepper/reference-pixel sizing in `src/components/overlays/OverlayInspector.svelte` and opposite-side zoom controls in `src/components/map/MapPreview.svelte`; keep focused fields reachable and changed UI localized.
- [ ] T034 [US7] Inspect phone/tablet/desktop and on-screen-keyboard cases against `docs/ui/redesigned-photo-editor.md`; record target rectangles, focus results and shared-control state evidence in `specs/002-redesign-pwa-editor/validation.md`.

**Checkpoint**: Story acceptance and focused regressions pass; completed story behavior remains intact.

## Phase 7: US4 — RGBA Text-Box Appearance (P2)

**Goal**: Provide canonical color entry and background-only alpha.

**Independent Test**: Set 24/53/47/.85, test alpha endpoints and malformed values, cancel/apply and compare exported pixels.

- [ ] T035 [P] [US4] Add failing color-string/channel/partial-input and alpha-alias tests in `tests/unit/overlays/color.spec.ts`.
- [ ] T036 [P] [US4] Add failing rounded-background/foreground-opacity/orientation pixel tests in `tests/unit/renderer/renderPhoto.spec.ts` and `tests/component/RgbaPicker.spec.ts`.
- [ ] T037 [US4] Implement canonical color parsing/validation in `src/domain/overlays/color.ts`, normalized radius in `src/domain/overlays/types.ts`, and validated appearance edits in `src/domain/overlays/overlayEditor.ts` using canonical RGBA objects without legacy-string adapters.
- [ ] T038 [US4] Build `src/components/ui/RgbaPicker.svelte` with hue/SV/alpha and numeric alternatives; integrate pending apply/cancel and shared opacity in `src/components/overlays/OverlayInspector.svelte`.
- [ ] T039 [US4] Extend `src/renderer/canvasRenderer.ts` and preview rendering in `src/renderer/preview.ts` for matching rounded background and alpha compositing; preserve foreground opacity and raw/display orientation mapping.
- [ ] T040 [US4] Add RGBA apply/cancel/draft/export cases to `tests/e2e/redesigned-editor.spec.ts` and record pixel/layout evidence in `specs/002-redesign-pwa-editor/validation.md`.

**Checkpoint**: Story acceptance and focused regressions pass; completed story behavior remains intact.

## Phase 8: US5 — Single and Repeated Watermarks (P2)

**Goal**: Persist bounded stable arrangements and render them below labels.

**Independent Test**: Render single and 5/10/20 repeated text plus PNG, reopen unchanged draft, compare worker/fallback export through EXIF 1–8.

- [ ] T041 [P] [US5] Add failing bounded/stable layout and impossible-content tests in `tests/unit/watermarks/layout.spec.ts`.
- [ ] T042 [P] [US5] Add failing asset persistence and orientation/render-payload tests in `tests/integration/storage/watermarkRecovery.spec.ts` and `tests/integration/export/watermarks.spec.ts`.
- [ ] T043 [US5] Implement seeded normalized arrangements in `src/domain/watermarks/layout.ts` using version/fingerprint, 5/10/20 requested counts and <=200 attempts; retain previous valid layout on insufficient space.
- [ ] T044 [US5] Implement validated PNG intake and atomic asset-plus-referencing-record saves in `src/infrastructure/storage/preferencesRepository.ts`; integrate per-photo configuration/arrangement snapshots with `src/infrastructure/storage/draftRepository.ts` and `src/domain/drafts/draftService.ts`.
- [ ] T045 [US5] Build `src/components/watermarks/WatermarkEditor.svelte` with enable/text/opacity, single positions, repeat density, mode memory and PNG single-only selection; integrate transactions in `src/components/workspace/Workspace.svelte`.
- [ ] T046 [US5] Extend `src/infrastructure/platform/renderWorkerClient.ts`, `src/workers/photo-renderer.worker.ts`, `src/renderer/renderPhoto.ts`, `src/renderer/canvasRenderer.ts`, `src/renderer/preview.ts`, `src/renderer/export.ts` and `src/domain/export/exportPhoto.ts` to transport assets/config/arrangements, render below labels and release resources in worker and fallback paths.
- [ ] T047 [US5] Run US5 layout/recovery/orientation cases and add watermark journey to `tests/e2e/redesigned-editor.spec.ts`; record stability and focused high-density timing in `specs/002-redesign-pwa-editor/validation.md`.

**Checkpoint**: Story acceptance and focused regressions pass; completed story behavior remains intact.

## Phase 9: US6 — Reusable Templates (P2)

**Goal**: Save/apply templates without transferring photo coordinates or overwriting edited text.

**Independent Test**: Switch/customize/default a template, reopen and apply to another photo; verify RGBA/watermark/format restoration and isolation.

- [ ] T048 [P] [US6] Add failing template sanitization/apply/cancel/default and photo-data isolation tests in `tests/unit/templates/templateService.spec.ts`.
- [ ] T049 [P] [US6] Add failing template/default/PNG-sharing persistence and storage-error UI tests in `tests/integration/storage/templatePersistence.spec.ts` and `tests/component/TemplatePicker.spec.ts`.
- [ ] T050 [US6] Implement built-in presets and atomic validated apply/save/default operations in `src/domain/templates/templateService.ts`; resolve active-photo coordinates instead of storing rendered location strings or copying current corner text into a template.
- [ ] T051 [US6] Extend `src/infrastructure/storage/preferencesRepository.ts` for committed named-template/default operations, asset-not-found/quota handling and shared PNG retention; ensure export/discard never clears presets.
- [ ] T052 [US6] Build `src/components/templates/TemplatePicker.svelte` with distinguishable thumbnails and focused template customization, and integrate new-import default application in `src/components/workspace/Workspace.svelte` without overwriting current photo content/location.
- [ ] T053 [US6] Add two-photo template/default and cancellation cases to `tests/e2e/redesigned-editor.spec.ts`; verify restored RGBA, watermark arrangement preferences and new-version settings in `specs/002-redesign-pwa-editor/validation.md`.

**Checkpoint**: Story acceptance and focused regressions pass; completed story behavior remains intact.

## Phase 10: Polish and Cross-Cutting Acceptance

**Goal**: Verify all stories together and reconcile documentation with delivered behavior.

- [ ] T054 Run full relevant Vitest suites, build/typecheck/lint and changed-file formatting using `package.json`; record commands/counts/results and fix relevant failures in `specs/002-redesign-pwa-editor/validation.md`.
- [ ] T055 Execute production offline/no-egress, new-version draft recovery, share and orientation gates using `tests/integration/offline/productionPolicy.spec.ts`, `tests/e2e/offlineJourney.ts` and `tests/e2e/redesigned-editor.spec.ts`; record physical Android sharing evidence in `specs/002-redesign-pwa-editor/validation.md`. Old batch UI is not a release gate.
- [ ] T056 Measure baseline/final p95 timings and lazy-map gzip budget per `specs/002-redesign-pwa-editor/quickstart.md`; record 20 focused runs/device and any bounded corrective work in `specs/002-redesign-pwa-editor/validation.md`.
- [ ] T057 Conduct the focused 10-user usability evaluation and all 19-state responsive visual checks from `specs/002-redesign-pwa-editor/spec.md`; record actual outcomes and unresolved findings in `specs/002-redesign-pwa-editor/validation.md`, never infer success from automation.
- [ ] T058 Reconcile delivered behavior in `docs/ui/photo-annotation-workspace.md`, `docs/ui/redesigned-photo-editor.md`, `docs/adr/0001-offline-photo-annotation-architecture.md` and `docs/adr/0002-redesigned-editor-state-and-presets.md`; mark partial supersession/status only when justified and update `THIRD_PARTY_NOTICES.md` with verified layer attribution.
- [ ] T059 Audit every FR/SC and independent storage/map findings against `specs/002-redesign-pwa-editor/tasks.md` and `specs/002-redesign-pwa-editor/validation.md`; preserve failed/unrun gates as incomplete and document remaining release constraints before handoff.

**Checkpoint**: Complete this phase before dependent work.

## Dependencies and Execution Order

```text
Setup -> Foundation -> US1 -> US2 -> US3 -> US7 -> US4 -> US5 -> US6 -> Polish
```

The order above is the conservative shared-file integration order, not a claim that every domain
unit depends on every earlier story. After foundation, US2 and US3 pure test work may be designed
independently, but Workspace/storage integration remains serialized. US6 requires US3 defaults,
US4 appearance and US5 watermark semantics. US7 uses US1's shell; its controls are reused by US4/US5.

Within each phase: finish its tests first, observe expected failures, then perform implementation
tasks in listed order, then run its independent check. A failing prior gate blocks dependent work.
No [P] implementation task shares ownership of a source file with another concurrently running task.

## Parallel Examples per Story

| Story | Disjoint tasks eligible together after prior-phase gates |
| --- | --- |
| US1 | T009 and T010 (different test files); implementations remain sequential |
| US2 | T016 and T017 (different test files); implementations remain sequential |
| US3 | T024 and T025 (different test files); implementations remain sequential |
| US7 | T030 and T031 (different test files); implementations remain sequential |
| US4 | T035 and T036 (different test files); implementations remain sequential |
| US5 | T041 and T042 (different test files); implementations remain sequential |
| US6 | T048 and T049 (different test files); implementations remain sequential |

## Requirement Coverage

| Requirements | Primary story / final evidence |
| --- | --- |
| FR-001–002, FR-021–022, FR-026 | US1; new-storage isolation and final offline/share/recovery gates |
| FR-003, FR-005–009 | US2; provider/consent checks |
| FR-004, FR-010–011 | US3; vector/corner/default checks |
| FR-012–014 | US4; RGBA and renderer checks |
| FR-015–017 | US5; layout/assets/orientation checks |
| FR-018–020 | US6; persistence/isolation checks |
| FR-023–025 | US7 and shared foundations; final visual/localization review |
| SC-001–010 | Story checkpoints plus final performance, usability, offline, new-version recovery and visual gates |

## Implementation Strategy

MVP: Setup + Foundation + US1, delivering real import, preview, review and output handoff.
This is an incremental demonstration boundary, not completion of all feature requirements.
Then add location/corners/safe controls, RGBA, watermarks and templates in that order.
Do not implement from static Figma screenshots alone; use the contracts for apply/cancel, actual
location, persistence, compositing and error behavior. Do not commit synthetic test evidence.
No deployment, production writes or Git commits are implied by this planning checklist.

## Planning Validation

59 tasks, all unchecked; Setup: 3; Foundation: 5; US1: 7; US2: 8; US3: 6; US7: 5; US4: 6; US5: 7; US6: 6; Polish: 6.
All tasks include concrete file paths. Extension hooks are absent for both planning and tasks.
Runtime tests and release checks listed here remain work to perform during implementation.
