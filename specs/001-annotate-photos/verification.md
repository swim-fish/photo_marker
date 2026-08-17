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

## Phase 4 — Trusted Coordinate Formats and Optional Map Preview

**Scope**: T034–T042, WGS84 DD/DMS, TWD97, TWD67, MGRS, and Taipower input/display; canonical
WGS84 preservation; surfaced provenance, zone, coverage, and precision; and an explicitly consented
NLSC EMAP5 preview that does not mutate the working coordinate.

### Red-Green-Refactor evidence

- RED — coordinate vector, parser, and regression suites failed first because the facade/converter
  modules did not exist; map and coordinate component suites likewise failed before their modules
  were added.
- GREEN — after resolving independent-review regressions, the coordinate core reached 3 files and
  66 passing tests; the combined focused Phase 4 run reached 6 files and 76 passing tests.
  Refactoring then centralized export-overlay formatting while those characterization tests remained
  green.
- The approved vector fixture remains byte-identical with SHA-256
  `3f13e394dc26d6ff83278558d703a631553607d63ea55f3dc44ee52348c3cba8` and is intentionally
  excluded from Prettier so formatting cannot invalidate the pinned digest.

### Automated and provider checks

| Check | Outcome |
| --- | --- |
| Focused coordinate/map unit and component suites | PASS — 6 files, 76 tests |
| Desktop coordinate and consent E2E | PASS — 2 journeys; 2 mobile-project skips by test scope |
| Full Vitest regression suite | PASS — 21 files, 130 tests |
| TypeScript/Svelte typecheck | PASS — 0 errors, 0 warnings |
| ESLint | PASS — 0 warnings |
| Prettier | PASS; pinned vector fixture explicitly excluded |
| Production build | PASS |
| Leaflet lazy-load budget | PASS — JS 43.38 KiB gzip and CSS 6.36 KiB gzip; neither is linked by production `index.html` |
| Windows Chrome real EMAP5 smoke | PASS — tile HTTP response, image MIME, wildcard CORS, rendered preview, and permanent attribution |

The real-provider smoke is opt-in through `RUN_REAL_EMAP5=1`; CI skips it so NLSC availability
cannot make deterministic CI fail. The fixed test coordinate is public sample data. No source photo,
coordinate literal, custom header, analytics request, bulk prefetch, or tile-cache route is sent to
NLSC; the required WMTS tile indices necessarily reveal the approximate viewed map area, as the
consent disclosure states. Before consent, after close, and after revocation, the deterministic E2E
observed zero new provider requests.

### Visual and interaction inspection

- PASS — desktop Chrome rendered the real EMAP5 layer, fixed center marker, online state, close and
  revoke controls, and permanent NLSC attribution without changing the manual coordinate.
- PASS — the 320 CSS px coordinate card reflowed to one column; native fields and selects remained
  within the viewport, and keyboard focus on display format remained above the sticky action region.
- PASS — offline and provider-error component states expose a local explanation and retry behavior;
  the map instance is torn down when the preview closes, consent is revoked, the coordinate changes,
  or the browser becomes offline.

### Independent review disposition

A read-only coordinate/privacy review reported three P2 coordinate findings and no material map
privacy or teardown finding. All three coordinate findings were resolved before handoff:

- DMS input now rejects a negative degree sign that contradicts `N` or `E`.
- TWD97/TWD67 numeric tokens now reject trailing non-numeric content instead of accepting a
  `parseFloat` prefix.
- DMS formatting now carries rounded `60.000″` into minutes/degrees.

Four regression assertions were observed failing for the expected reasons before implementation;
all pass in the final 66-test coordinate core run.

### Skipped checks and remaining risks

- Android physical-device EMAP5 rendering was not repeated because the required one-platform
  Android/Windows smoke passed on Windows. Phase 5 release validation still owns representative
  Android and installed-PWA behavior.
- EMAP5 is an external online service and can be unavailable independently of the application. The
  local coordinate workflow remains usable and unchanged when this occurs.
- Offline installation, draft recovery, share-target isolation, screen reader, 400% zoom, and full
  physical-device validation remain assigned to T043–T054 and the final release gates.
- No image-pipeline performance benchmark was rerun because Phase 4 does not change decode, preview,
  render, or export behavior. Only the specified Leaflet lazy-load bundle budget was measured.

**ADR impact: none.** The implementation follows ADR-0001's approved vendored coordinate core,
Leaflet dependency, EMAP5 consent boundary, teardown behavior, and canonical WGS84 model. No new
architecture decision, public contract, migration, security boundary, or performance tradeoff was
introduced.

**UI documentation impact: none.** The implemented format controls, surfaced coordinate metadata,
map disclosure, online/offline/provider-error states, permanent attribution, responsive reflow, and
focus behavior match the English requirements already documented in
`docs/ui/photo-annotation-workspace.md`.
