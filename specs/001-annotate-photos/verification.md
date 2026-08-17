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

## Phase 7 — Cross-Cutting Release Hardening

**Scope**: T064–T067 and T070–T074. T068 and T069 remain external release gates; the local portion of
T068 includes one final 20-photo reliability comparison only.

### Red-Green-Refactor evidence

- RED — the first malformed-segment/allocation/diagnostic run showed oversized metadata reads and
  rendered outputs allocating bytes before rejection, and an untrusted diagnostic string echoed a
  path, coordinate, and annotation. GREEN — bounded reads/writes and sanitized diagnostics pass.
- RED — the first full regression exposed five failures because sanitization also replaced valid
  stable typed codes. GREEN — safe kebab-case typed codes retain their contract while free text is
  normalized to `unknown-error`.
- RED — new oversized-dimension, invalid TIFF offset, final attachment-size, and no-renderer cases
  returned the wrong result or passed. GREEN — dimensions are rejected before decode, linked TIFF
  offsets are bounds checked, combined allocations are bounded, and export fails closed without a
  real Canvas path.
- RED — a controlled draft save race lost revision 2 behind an in-flight revision 1, and a controlled
  batch checkpoint allowed item 2 to start before item 1 was durable. GREEN — the draft service drains
  the newest pending revision and the sequential queue awaits each local checkpoint.
- RED — desktop browser regression found the accessible overlay text present but visually collapsed
  with the 4×3 deterministic fixture after fidelity styling. GREEN — the responsive preview now
  scales the image work surface, derives text/padding from its rendered dimensions, and the six
  desktop journeys pass.

### Independent review findings and primary dispositions

| Review | Finding | Disposition |
| --- | --- | --- |
| T070 metadata | Declared dimensions reached browser decode before pixel limits | Fixed with pre-decode dimension/area validation and a decoder-not-called regression fixture |
| T070 metadata | The 64 MiB bound covered rendered bytes but not the attached result | Fixed with overflow-safe combined-length checks before allocation |
| T070 metadata | EXIF/`eXIf` internal offsets were not characterized | Fixed with bounded TIFF/IFD/value/pointer validation and JPEG/PNG invalid-offset fixtures |
| T070 metadata | Missing Canvas could relabel source bytes or create a blank PNG | Fixed; export now returns `encode-failed`, while focused tests inject an explicit verified renderer seam |
| T071 platform | An incomplete current shell had no retained-shell fetch fallback | Fixed with current-then-retained shell lookup; old caches are deleted only after current completeness |
| T071 platform | Enabled Web Share Target intake was not bounded or consumed by the editor | Fixed with count/MIME/size/magic checks and startup consumption through common import validation; physical zero-egress remains blocked |
| T071 platform | Sanitization broke valid typed diagnostic codes | Fixed with safe stable-code preservation and free-text normalization; full regression is green |
| T072 UX | In-flight autosave could drop the newest revision | Fixed with a single draining save promise and controlled race test |
| T072 UX | Incompatible/migration-failed drafts were silent | Fixed with distinct typed migration failure, preserved records, visible guidance, and Retry |
| T072 UX | DOM preview omitted font size/family/padding/line height | Fixed with rendered-stage measurement and the same normalized style values; desktop/mobile visually inspected |
| T072 UX | Batch review omitted per-photo configuration readiness | Fixed with shared format/dimension/quality/name/metadata validation and disabled confirmation |
| T072 UX | Partial results were durable only after the queue ended | Fixed; every result is merged and transactionally checkpointed before the next item starts |
| T072 UX | Invalid intake lacked an item-level recovery action | Fixed with item-level Remove while retaining accepted photos; replacement remains available through import |
| T072 UX | Review dialogs lacked complete focus return/trapping | Fixed for batch and single review with Escape, Tab containment, `aria-modal`, and invoker focus return |
| T072 UX | Overlay hit target/touch policy conflicted with the implemented interaction | Fixed with a 44 px effective selection target, no blanket `touch-action` restriction, and docs aligned to tap/inspector/keyboard controls |
| T072 performance | Evidence is not representative-device release evidence | Confirmed blocker under T068; no release claim is made |

The primary review found no source-Blob mutation path after these changes. Capture GPS remains copied
unchanged only within the supported same-format profile, and the orientation 1–8 transform suites
remain green.

### Final automated and browser checks

| Check | Outcome |
| --- | --- |
| Malformed metadata/diagnostic focused run | PASS — bounded corpus, dimension, TIFF offset, allocation, and sanitization cases |
| Full Vitest regression suite | PASS — 35 files, 189 tests |
| TypeScript/Svelte typecheck | PASS — 0 errors, 0 warnings |
| ESLint | PASS — 0 warnings |
| Prettier format check | PASS — all matched files formatted |
| Production build | PASS — 12 precache entries, 1,539.29 KiB; app 132.30 KiB gzip; service worker 3.59 KiB gzip; Leaflet 43.38 KiB gzip |
| Production privacy policy build test | PASS — enforced CSP, no runtime CDN/analytics/upload API, NLSC-only image exception, no tile/user-content cache, required notices |
| Desktop primary regression | PASS — 6 journeys covering single photo, coordinate/map isolation, multi-photo recovery, and 20+1 batch |
| Production offline regression | PASS — desktop Chrome and Pixel 5 emulation; 2 opposite-project skips by scope |

The final local 20-valid-plus-1-invalid journey completed in **3.9 seconds** of Playwright test time,
versus the T063 diagnostic baseline of **3.6 seconds**. The 8.3% difference is below the 10%
investigation threshold, with no crash, lost result, or source mutation. This is still a workstation
PNG diagnostic and does not satisfy the representative-device part of T068.

### Focused visual and interaction inspection

- PASS — 1440×900 and 393×852 production layouts show a scaled photo, visible normalized overlay
  typography/background/padding, inspector controls, and no document-level horizontal overflow.
- PASS — measured desktop overlay was 576×64.34 CSS px with a 20.48 px computed font; measured mobile
  overlay was 241.19×27.63 CSS px with an 8.79 px computed font. Both contained visible text and kept
  normalized geometry.
- PASS — keyboard-only export, map consent/close/revoke isolation, batch modal decision flow, and
  item-level invalid removal remain reachable in the focused component/browser coverage.

### Skipped checks, blockers, and remaining risks

- T054 remains open: physical Android Chrome and Windows Edge installed-PWA validation, real touch,
  browser 400% zoom, and desktop/mobile screen-reader smoke were unavailable.
- T068 remains open: no representative Android and Windows devices were available for five final
  4032×3024 JPEG preview/export runs. No long benchmark or soak suite was run.
- T069 remains open: no pool of at least 10 representative first-time participants was available, so
  the 90%-within-three-minutes criterion is unverified.
- Web Share Target remains disabled in the default manifest. Android support cannot be released until
  a physical device proves local POST interception with zero fallback egress, or an approved spec and
  platform-matrix revision removes that claim.
- The retained-shell fallback is automated at policy and production-offline levels; interrupted
  installed-PWA update behavior still requires the T054 physical-device check.
- Vite emits a non-blocking plugin deprecation warning for `inlineDynamicImports`; the production
  build and policy assertions pass.

The feature is therefore **not release-complete** while T054, T068, and T069 remain open. All locally
executable implementation and verification tasks are complete and green.

**ADR impact: amended.** ADR-0001 now records pre-decode limits, bounded TIFF offset validation,
fail-closed rendering, combined output allocation limits, and retained-shell fallback behavior. These
clarify the approved security/compatibility boundary without adding a dependency or backend.

**UI documentation impact: amended.** `docs/ui/photo-annotation-workspace.md` now reflects actual
metadata/output failures, additive recovery behavior, awaited partial-result checkpoints, share-intake
validation, scaled preview fidelity, 44 px effective targets, and the implemented tap/inspector/
keyboard interaction rather than claiming an unimplemented direct-drag path.

## 2026-08-17 Guided Four-Corner Editing Verification

### Red-Green-Refactor evidence

- RED — `tests/unit/overlays/placement.spec.ts` and `tests/component/EditingSteps.spec.ts` failed
  because corner placement and four-step UI modules did not exist.
- GREEN — deterministic outer-inward placement, collision rejection, four-step navigation,
  single/multiple coordinate formats, and independent coordinate/text corners made all 7 focused
  tests pass.
- REFACTOR — the former long three-column/tab workspace was replaced with one active step page and a
  fixed Previous/Next bar; typecheck and lint remained green after removing legacy styles.

### Checks and outcomes

| Check | Outcome |
| --- | --- |
| Focused placement/component tests | PASS — 2 files, 7 tests |
| Full Vitest regression suite | PASS — 38 files, 199 tests |
| Responsive interaction Playwright | PASS — 9 tests across desktop Chrome and Pixel 5 emulation; 3 intentional project-scope skips |
| Single-photo keyboard and coordinate/map journeys | PASS — 5 desktop journeys |
| Batch export and draft recovery journeys | PASS — 2 desktop journeys, including 20 valid plus 1 invalid item |
| Provided JPEG visual workflow | PASS — 375×812, 768×1024, and 1280×800; no horizontal overflow or overlay intersection |
| TypeScript/Svelte typecheck | PASS — 0 errors, 0 warnings |
| ESLint | PASS — 0 warnings |
| Prettier format check | PASS — all matched files formatted |
| Production build | PASS — 12 precache entries, 1,558.87 KiB; service worker 3.59 KiB gzip; Leaflet 43.38 KiB gzip |

No prolonged performance test was run because this interaction/layout change does not alter the
image decode, renderer, encoder, or batch-processing path. Existing T068 representative-device work
remains separately open. Physical touch, installed-PWA, and screen-reader checks remain covered by
the existing T054 blocker; emulation is not reported as physical-device evidence.

**ADR impact: amended.** ADR-0001 now records the four-step application flow, deterministic
four-corner packing, collision rejection, additive optional overlay fields, legacy defaults, and
rollback behavior.

**UI documentation impact: amended.** `docs/ui/photo-annotation-workspace.md` now defines the active
step layout, fixed navigation, single/multiple coordinate selection, four-corner outer-inward
placement, collision handling, responsive fixtures, and collapsed precise-adjustment controls.
