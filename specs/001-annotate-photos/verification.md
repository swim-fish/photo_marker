# Verification Record: Offline Photo Annotation

This document accumulates risk-proportional verification evidence for feature
`001-annotate-photos`. Release-only checks remain pending until their owning task is complete.

## Phase 3 — Single-Photo Vertical Slice

**Scope**: T015–T033, one local JPEG/PNG import, WGS84 working-coordinate selection, text-overlay
editing, preview, separate-copy export, supported metadata handling, and source immutability.

### Automated checks

| Check | Outcome |
| --- | --- |
| Focused US1 unit and integration tests | PASS — 9 files, 33 tests |
| Single-photo component tests | PASS — 1 file, 5 tests |
| Render worker client regression test | PASS — 1 test |
| Full Vitest suite after formatting | PASS — 15 files, 54 tests |
| Desktop single-photo E2E | PASS — 2 journeys, including keyboard-only completion and blocked external requests |
| 4032×3024 first-functional baseline | PASS — 3 desktop Chrome runs |
| TypeScript/Svelte typecheck | PASS |
| ESLint with zero warnings | PASS |
| Production build | PASS |

Later sections may supersede these counts as the suite grows.

### First-functional performance baseline

Measured on the development Windows workstation with Playwright Desktop Chrome against the local
Vite server. The deterministic input was a generated 4032×3024 PNG with two text overlays; export
produced a full-resolution PNG. Timings are end-to-end browser measurements and are diagnostic
baselines, not supported-device release claims.

| Run | Preview ready | Export handed off |
| ---: | ---: | ---: |
| 1 | 405 ms | 1,375 ms |
| 2 | 363 ms | 1,359 ms |
| 3 | 333 ms | 1,369 ms |
| **Median** | **363 ms** | **1,369 ms** |

No unexplained regression can be assessed yet because this is the first-functional baseline. T068
owns the focused five-run Android and Windows JPEG comparison; no soak or broad benchmark was run.

### Visual and interaction inspection

- PASS — 1280px desktop empty state and three-region editing layout inspected.
- PASS — 320px empty and editing states inspected with no horizontal document overflow.
- PASS — compact viewport retains visible tabs, zoom controls, manual-coordinate controls, disabled
  reason, and keyboard alternatives.
- PASS — export review moves focus into the dialog, traps forward/reverse Tab traversal, supports
  Escape, and presents a durable export result after completion.

### Skipped checks and remaining risks

- Android physical-device, Windows Edge, installed/offline PWA, Web Share Target, screen reader,
  400% zoom, and real-device touch checks are not Phase 3 gates; T054 and T068–T074 own them.
- The baseline is desktop Chrome only and uses a PNG source. Representative-device JPEG comparison
  remains pending under T068.
- Phase 3 is an independently demonstrable vertical slice, not a release-ready supported build.

**ADR impact: none.** Implementation follows the architecture already approved in ADR-0001; no
dependency strategy, public contract, data model, migration, security boundary, or performance
tradeoff changed.

**UI documentation impact: none.** The implemented empty, loading, error, disabled, editing, review,
and success states match `docs/ui/photo-annotation-workspace.md`; later adaptive/offline and map
states remain assigned to their owning phases.
