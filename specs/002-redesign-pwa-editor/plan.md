# Implementation Plan: Figma-Aligned PWA Photo Editor Redesign

**Branch**: `master` (actual checkout; setup script reports feature identifier `002-redesign-pwa-editor`)
| **Date**: 2026-09-05 | **Spec**: [spec.md](spec.md)

**Input**: `specs/002-redesign-pwa-editor/spec.md`

## Summary

Adopt the redesigned version directly in the client-only Svelte application. Reuse useful Workspace,
coordinate conversion, worker rendering and export helpers; replace old UI and persistence contracts.
Isolate focused editor-view state and settings transactions without an old-client compatibility layer.
Introduce explicit map candidates, persisted annotation preferences/templates, stable watermark
arrangements, RGBA controls, and reusable accessible UI primitives. The 19 Figma frames describe
states, not 19 sequential steps.

## Technical Context

**Language/Version**: TypeScript 5.9.3; Svelte 5.56.9; Node >=20.19.
**Primary Dependencies**: Existing Vite 8.2.1, Leaflet 1.9.4, idb 8.0.3, exifr 7.1.3,
proj4 2.21.0, mgrs 2.2.0, Workbox 7.4.1. No new runtime dependency planned.
**Storage**: New `photo-marker-v2` IndexedDB, database version 1 and record schema 1; one database
for drafts, source Blobs, preferences, templates and assets. No old-data reads or migration.
**Testing**: Vitest 4.1.10 with jsdom/fake-indexeddb, Testing Library Svelte, Playwright 1.62.1.
**Target Platform**: Baseline Android 10+ Chrome and Windows 11 Chrome/Edge release matrix.
Phone width >=320 logical pixels; tablet/desktop responsive layouts. Physical-device sharing gates remain.
**Project Type**: Installable client-only PWA; no server, account, telemetry, or runtime CDN.
**Performance Goals**: 12 MP JPEG p95 import <=3 s, valid edit preview <=500 ms, export <=15 s;
worker concurrency 1; lazy map bundle retains 60 KiB gzip budget.
**Constraints**: Offline core; consent-only map networking; unchanged source bytes and supported
metadata defaults; 1–20 photos, <=13 MP, <=8192 pixels/axis, <=32 MiB source/file remain unchanged.
**Scale/Scope**: Seven user stories, 19 reference frames, local preferences and templates.
No new batch interface, tile cache, geocoder, cloud backup, or repeated image watermarks.

## Constitution Check

| Gate | Before research | After design / required implementation evidence |
| --- | --- | --- |
| I: narrow scope | Pass: extend current modules | Pass: no framework replacement, no coordinate formula changes |
| II: regression/TDD | Pass: test-first tasks required by constitution | Tests precede behavior changes, including atomic saves, map commits and compositing |
| III: proportional verification | Pass: documentation-only planning | Focused suites plus relevant build/lint/typecheck, visual and device release gates in quickstart |
| IV: consistent UX | Pass: Figma reference and English UI documentation reviewed | Shared tokens/controls, zh-TW catalog, keyboard alternatives; proposed UI contract added |
| V: ADR/documentation | Material storage/map/render boundaries identified | ADR 0002 proposed; ADR 0001 retained as deployed baseline, related UI documentation links added |
| VI: performance/compatibility | Existing budgets and versions inspected | Bounded repetition, new-version recovery, source/metadata/orientation regression tasks defined |
| VII: independent judgment | Bounded read-only map/storage research delegated | Research findings incorporated; independent scopes do not write application files |
| VIII: exceptions | User explicitly waived backward compatibility | New-version storage/UI replace old contracts; constitution otherwise applies. Feature and provider checks remain release gates |

The plan is ready for implementation sequencing; this does not certify that application behavior or
release gates have already passed. No architecture acceptance status is fabricated.

## Project Structure

### Documentation (this feature)

```text
specs/002-redesign-pwa-editor/
  spec.md
  plan.md
  research.md
  data-model.md
  contracts/editor-contracts.md
  quickstart.md
  tasks.md
  checklists/requirements.md
docs/adr/0002-redesigned-editor-state-and-presets.md
docs/ui/redesigned-photo-editor.md
```

### Source Code (repository root)

Existing integration points:

- `src/components/workspace/Workspace.svelte`: canonical session, import and export wiring.
- `src/components/workspace/PreviewStage.svelte`, `src/components/overlays/`,
  `src/components/coordinate/`, `src/components/export/`: retain existing domain integrations.
- `src/domain/coordinates/`, `src/domain/drafts/`, `src/domain/overlays/`,
  `src/infrastructure/storage/`, `src/infrastructure/map/emap5.ts`.
- `src/renderer/canvasRenderer.ts`, `preview.ts`, `export.ts`, `renderPhoto.ts`,
  `src/infrastructure/platform/renderWorkerClient.ts`, `src/workers/photo-renderer.worker.ts`.

New focused modules:

- `src/domain/editor/editorState.ts`: view stack and apply/cancel state.
- `src/domain/map/mapSelection.ts`: pending candidate independent from accepted coordinate.
- `src/domain/overlays/color.ts`: validated canonical RGBA objects.
- `src/domain/watermarks/{types,layout}.ts`: configuration and deterministic bounded placement.
- `src/domain/templates/{types,templateService}.ts`: preferences/defaults and template semantics.
- `src/infrastructure/storage/preferencesRepository.ts`: templates/defaults/assets.
- `src/infrastructure/map/layers.ts`: fixed, reviewed layer registry.
- `src/components/ui/{Button,NumberStepper,RgbaPicker}.svelte`,
  `src/components/workspace/EditorShell.svelte`, `src/components/map/MapLayerPicker.svelte`,
  `src/components/overlays/CornerTextEditor.svelte`,
  `src/components/watermarks/WatermarkEditor.svelte`,
  `src/components/templates/TemplatePicker.svelte`.
- `src/styles/tokens.css`, `src/i18n/zh-TW.ts`.

**Structure Decision**: Keep existing directories and pure domain boundaries. New files are proposed
targets, not claims that they already exist. Do not duplicate Workspace state in a new global store.

## Delivery and Verification

Setup/new-version foundations -> US1 -> US2 -> US3 -> US7 -> US4 -> US5 -> US6 -> integrated gates.
US1 is the first runnable increment; all stories remain required for feature completion.
US7's shared primitives are introduced early as foundations and verified in its story phase.
US6 depends on completed color/watermark contracts, not duplicate implementations.

Use [research.md](research.md), [data-model.md](data-model.md),
[contracts/editor-contracts.md](contracts/editor-contracts.md), and [quickstart.md](quickstart.md).
The tasks command generates the execution checklist after these artifacts exist.

## Complexity Tracking

The user-authorized compatibility exception removes migration, dual-write and downgrade work.
A fresh unified database enables atomic draft/asset/template writes; explicit per-photo watermark
state preserves exact preview/export placement. Older storage is left untouched.
