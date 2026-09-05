# Quickstart Validation: Redesigned Editor

This is an implementation acceptance guide, not a report of tests already passed.
Run from the repository root in PowerShell. Node >=20.19 and installed project dependencies are required.
Use the existing lockfile; if dependencies are absent, run npm ci. Install Playwright Chromium as needed.

## Fast feedback

```powershell
npm run dev -- --host 127.0.0.1
npm run test -- tests/unit/coordinates tests/unit/drafts tests/unit/overlays
npm run test -- tests/unit/watermarks tests/unit/templates tests/unit/map
npm run test -- tests/component
npm run typecheck
npm run lint
npm run build
```

New test paths above are delivered by tasks.md; do not accept an empty test selection as evidence.
Run affected tests once before implementation to record expected failures, then after changes.
Existing Vitest config is in vite.config.ts; there is no separate vitest.config.ts.

## Browser journeys

```powershell
$env:PLAYWRIGHT_START_SERVER = '1'
npm run test:e2e -- tests/e2e/redesigned-editor.spec.ts --project=mobile-chrome
npm run test:e2e -- tests/e2e/redesigned-editor.spec.ts --project=desktop-chrome
```

Use fixtures and mocked map tiles/location by default. Explicitly include 320px viewport and
keyboard-only checks, beyond the default Pixel 5 emulation. Development-server success does not
prove offline behavior; production checks must follow existing offlineJourney.ts and
tests/integration/offline/productionPolicy.spec.ts.

## Acceptance scenarios

| Story | Scenario | Expected evidence |
| --- | --- | --- |
| US1 | Import GPS photo, visit/cancel settings, save/share, cancel/fail and retry | Correct source/provenance; draft retained on failure; truthful handoff; unchanged source digest |
| US2 | No GPS, pan/zoom, switch three layers, cancel/confirm, deny/stale location | Candidate never commits implicitly; no traffic before consent/after revoke; layer zoom/center stable |
| US3 | WGS84/TWD97/MGRS, zero coordinates, all corners, long Unicode, default and restore | Reference vector tolerances retained; no foreground intersections; new-version format/labels restore |
| US7 | Stepper at limits, Enter/Space, 320px and on-screen keyboard | One action once; >=50x50 targets, >=24px gaps; reachable apply/cancel and visible focus |
| US4 | RGBA 24/53/47/.85; alpha 0/1, malformed/partial inputs and cancel | All fields agree; background only; no duplicate alpha; PNG export pixel comparison |
| US5 | Single/5/10/20 repeated text, reopen, PNG, EXIF orientations 1..8 | Stable rectangles, bounded failures, watermark below labels, fallback/worker agreement |
| US6 | Save/apply/default template across two photos, quota, missing asset, reopen | No location/text replacement; committed settings/assets survive export/discard |

Storage acceptance must cover fresh database creation, current-schema roundtrip, unknown-newer
rejection without mutation, atomic asset/draft/template aborts, quota errors, two templates sharing
a PNG, revision-pointer integrity and session-cleanup isolation. Seed older storage and verify it is
neither imported nor mutated. Contracts and data-model.md define exact semantics.

## Focused performance and release checks

Record baseline and final timings for at least 20 representative 12MP JPEG runs on each supported
reference phone and desktop in validation.md: import <=3s p95, valid edit <=500ms p95, export <=15s p95.
Include high-density text watermark and PNG asset scenarios; separately report capability fallback.
Use approved local fixtures, not user photos, in committed evidence. Verify lazy map chunk <=60KiB gzip.
A focused 10-user usability session checks spec SC-001; record actual results, not inferred test claims.

Actual-provider checks are opt-in: extend tests/e2e/desktop/real-emap5-smoke.spec.ts to all configured
layers under the existing RUN_REAL_EMAP5=1 switch.
Verify current capabilities, CORS, source attribution and one visible tile/layer; no crawl/bulk download.
Keep external availability failures separate from deterministic failures and block unsupported claims.

Verify physical Android sharing, zero-egress and the new release platform matrix.
Review Figma frames and docs/ui/redesigned-photo-editor.md at phone/tablet/desktop widths.
Finish with relevant broader unit/integration suites, build/typecheck/lint and changed-file formatting.
Record skipped checks and their reasons in validation.md; no automatic acceptance when a suite is empty.
