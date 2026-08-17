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

## Phase 5 — Offline Draft Recovery and Installable Shell

**Scope**: T043–T053, including transactional IndexedDB drafts, reload recovery and cleanup,
install/offline/storage states, an atomic application-shell cache, local-only request policy, and a
build-time-disabled Web Share Target gate. T054 remains open for representative physical-device and
assistive-technology release validation.

### Red-Green-Refactor evidence

- RED — storage, PWA-policy, share-target, and adaptive-status suites first failed because their
  modules did not exist. The editing-session `touch` characterization also failed before draft
  revision support was added.
- RED — the first production offline journey exposed an IndexedDB `TransactionInactiveError` while
  saving photo bytes; Blob bytes are now prepared before the transactional write begins.
- RED — a delayed Web Share Target file read reproduced the same inactive-transaction class in the
  actual share-intake repository. Shared bytes and records are now prepared before its write
  transaction opens.
- RED — the next offline journey restored `index.html` but failed to load module/CSS assets because
  request-object matching did not reliably select the precached response. Same-origin application
  shell lookups now use exact cached pathnames with `Vary` ignored; user content and map tiles remain
  outside Cache Storage.
- GREEN — the focused Phase 5 suite passes 8 files and 34 tests, and both scoped production offline
  journeys pass after the smallest fixes above.

### Automated checks

| Check | Outcome |
| --- | --- |
| Focused draft/storage/PWA/privacy/adaptive suites | PASS — 8 files, 34 tests |
| Production offline E2E | PASS — desktop Chrome and Pixel 5 emulation; 2 opposite-project skips by test scope |
| Offline behavior | PASS — controlled worker, complete shell cache, disconnected reload, draft resume, local export, and post-export cleanup |
| Default Web Share Target gate | PASS — production manifest omits `share_target` |
| Explicitly enabled manifest build | PASS — exact local POST `/share-target`, `photos` field, and JPEG/PNG accept list emitted |
| Production CSP and cache boundary | PASS — `connect-src 'none'`; NLSC only in `img-src`; no source photo or map tile in the shell cache |
| Full Vitest regression suite | PASS — 28 files, 159 tests |
| TypeScript/Svelte typecheck | PASS — 0 errors, 0 warnings |
| ESLint and Prettier | PASS — 0 lint warnings; all matched files formatted |
| Production build | PASS — 12 shell entries, 1,511.01 KiB total; custom service worker 3.37 KiB gzip |

### Visual and interaction inspection

- PASS — 1440×900 desktop empty/offline-ready state retains a clear status hierarchy, install help,
  and local import action.
- PASS — 393×852 mobile draft recovery presents the source name, limitation text, initial focus,
  resume/discard/later actions, and a non-obscured underlying workspace.
- PASS — 320 CSS px empty state has no horizontal document overflow; its import target measures 53
  CSS px high. Keyboard focus containment, Escape, destructive confirmation, and focus return pass
  the component interaction suite.

### Skipped checks and remaining release blockers

- T054 is intentionally not marked complete. Physical Android Chrome and Windows Edge installed-PWA
  validation, real touch behavior, browser 400% zoom, and screen-reader smoke were not available in
  this workspace.
- Web Share Target remains disabled by default. It must not be enabled for a supported Android
  release until a physical-device test proves the POST is intercepted locally with zero fallback
  egress, or an approved specification/platform-matrix revision removes that support claim.
- Chromium network emulation does not update `navigator.onLine`; the E2E separately dispatches the
  standard `offline` event to validate the status announcement, while the actual shell reload and
  export still run with browser networking disabled.
- No extended performance test was run. Phase 5 does not alter image rendering, and its only new
  measurable build path is the small application-shell/service-worker output recorded above.

**ADR impact: none.** The implementation follows ADR-0001's approved IndexedDB, custom service
worker, local-only processing boundary, stable manifest identity, and gated Web Share Target design.
No new dependency strategy, public contract, migration policy, security boundary, or performance
tradeoff was introduced.

**UI documentation impact: none.** The implemented offline readiness, saving/storage failures,
recovery dialog, install guidance, and adaptive layouts match the English states and behavior already
documented in `docs/ui/photo-annotation-workspace.md`.

## Phase 6 — Batch Annotation and Sequential Export

**Scope**: T055–T063, including 1–20 editable photos, explicit invalid intake results, duplicate-safe
identity, shared-setting copies, independent coordinate decisions, sequential export, partial result
retention/retry, and additive batch draft recovery.

### Red-Green-Refactor evidence

- RED — batch session and export suites first failed because `batchSession.ts` and `batchExport.ts`
  did not exist; navigator/settings/review/results tests likewise failed before their components were
  added.
- RED — the first 20-valid-plus-1-invalid browser run classified the final invalid file as
  `over-limit`, because the accepted-count check ran before format validation. Intake now validates
  first and applies the 20-item limit only to otherwise valid photos, preserving the actual
  `unsupported-format` result.
- GREEN — the focused batch/domain/export/component/storage run passes 4 files and 20 tests. The
  20+1 browser journey and a separate multi-photo draft reload journey both pass.

### Automated and browser checks

| Check | Outcome |
| --- | --- |
| Batch session/export/component tests plus additive draft recovery | PASS — 4 files, 20 tests |
| 20 valid + 1 invalid desktop journey | PASS — 20 `handedOff`, 1 explicit `unsupported-format`, no crash or source loss |
| Multi-photo draft reload | PASS — 2 photos and copied shared title restored |
| Desktop single-photo/coordinate/batch regression | PASS — 6 journeys |
| Production offline desktop/mobile regression | PASS — 2 scoped journeys; 2 opposite-project skips |
| Full Vitest regression suite | PASS — 31 files, 173 tests |
| TypeScript/Svelte typecheck | PASS — 0 errors, 0 warnings |
| ESLint and Prettier | PASS — 0 lint warnings; all matched files formatted |
| Production build | PASS — 12 shell entries, 1,533.49 KiB; app 130.94 KiB gzip; service worker 3.37 KiB gzip |

### First-functional batch reliability baseline

One desktop Chrome run against the local Vite application completed intake, copied title/team
settings, 20 explicit coordinate-free decisions, 20 sequential output handoffs, and one invalid
result in **3.6 seconds** of Playwright test time. This is a diagnostic first-functional baseline, not
a representative-device performance claim. Per the approved plan, no arbitrary batch-duration gate,
soak test, or broad benchmark was added; the measured criterion is sequential completion without
crash or result loss.

Chrome emitted only a subset of automatic download events in an earlier run while the application
recorded all 20 browser handoffs. This is consistent with the documented `handedOff` contract: it
means the Blob was offered to the browser/OS, not that a filesystem path was written. Users may need
to allow multiple downloads. The UI and results do not claim confirmed disk writes.

### Visual and interaction inspection

- PASS — 1440×900 production layout shows the vertical photo rail, active/missing/invalid text and
  icons, explicit failure code, preview, inspector, and import fallback without overlap.
- PASS — 393×852 production layout has no horizontal document overflow. The navigator becomes a
  horizontally scrollable strip, while preview, tabs, coordinate controls, and the primary action
  remain reachable.
- PASS — the review dialog blocks export until every missing coordinate is resolved, explicitly
  omitted, or approved for coordinate-free export. Shared values are copied per photo rather than
  sharing mutable overlay records.

### Remaining risks

- The final representative-device 20-photo comparison remains assigned to T068. This phase used the
  small deterministic PNG fixture and did not repeat the 12 MP single-photo performance scenario.
- Physical-device multi-download permissions and actual filesystem results remain browser/OS-owned;
  output status intentionally stops at `handedOff`.
- T054's physical Android/Windows, Web Share Target, 400% zoom, and screen-reader release blockers
  remain unchanged.

**ADR impact: none.** Batch session, sequential concurrency-one export, additive draft fields, and
handoff semantics were already approved in ADR-0001 and the data model. No new architecture,
dependency strategy, public contract, migration policy, security boundary, or performance tradeoff
was introduced.

**UI documentation impact: none.** The photo strip/rail, text-and-icon statuses, shared-setting copy
semantics, unresolved decisions, partial results, retry, responsive behavior, and browser-handoff
wording match `docs/ui/photo-annotation-workspace.md`.
