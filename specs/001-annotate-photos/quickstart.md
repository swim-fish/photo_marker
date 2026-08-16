# Quickstart and Focused Verification

This guide describes the expected development and verification workflow after implementation tasks
bootstrap the Svelte/Vite application. It intentionally avoids soak tests and broad performance suites.

## Prerequisites

- Current active LTS Node.js and npm.
- Current stable Chrome; current stable Edge for the Windows release check.
- One representative Android 10+ device with current stable Chrome.
- HTTPS for install, service worker, geolocation, Web Share Target, and advanced file APIs. Localhost
  is sufficient for most development checks; share/install release checks use the deployment origin.
- Approved JPEG/PNG fixtures, coordinate vectors from `pwa_map`, and no sensitive real-world photos.

## Install and run

```powershell
npm install
npm run dev
```

Open the local URL shown by Vite. Before offline testing, use the app's readiness status to confirm
that the current shell is cached and the draft database opens.

## Test-first development loop

For every behavior slice:

1. Add or update the smallest focused test.
2. Run it and record that it fails for the expected reason.
3. Implement the smallest coherent change.
4. Re-run the focused test, then refactor only while it stays green.

Example focused commands after scripts exist:

```powershell
npm test -- tests/unit/coordinates
npm test -- tests/unit/metadata
npx playwright test tests/e2e/mobile/single-photo.spec.ts
```

Do not weaken or skip a failing test to make implementation pass. When automation is not meaningful,
record the reason and the explicit manual evidence.

## Required pre-handoff checks

```powershell
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The final implementation may split E2E projects so only relevant desktop/mobile fixtures run during
development. Before release, the applicable matrix below must pass.

## Focused release matrix

| Risk | Minimum evidence |
|------|------------------|
| Coordinates | Approved vectors and typed out-of-coverage cases; TWD67 and Taipower regressions |
| Source immutability | SHA-256 unchanged after export, cancel, retry, and partial batch failure |
| Orientation/fidelity | EXIF 1–8 plus Traditional Chinese, multiline, emoji, overlap, colors, and edges |
| Metadata | JPEG/PNG same-format preserve/remove; format-change disclosure; malformed segment bounds |
| Offline/PWA | Precache completeness, airplane-mode reopen, failed-update rollback, IndexedDB open |
| Privacy | Connected/offline zero user-data requests; share-target POST intercepted without forwarding |
| Drafts | Reload/reopen, export cleanup, discard, partial export, persistence denied, quota failure, migration |
| Accessibility/UI | Touch, keyboard-only, drag alternatives, 320×568, 568×320, 1024×768, 400% zoom, screen-reader smoke |
| Performance | Five runs of one 4032×3024 JPEG per representative Android/Windows device; every preview <3 s and export <15 s |
| Batch reliability | One 20-valid-plus-1-invalid run per representative device; sequential processing, explicit failure, no crash/data loss |

Record only decode, first usable preview, render, encode, metadata attachment, save handoff, and total
duration through User Timing. The 20-photo run establishes a baseline and reliability result; no
prolonged or full-device-matrix benchmark is required.

## Manual platform checks

### Android Chrome

- Install and reopen in airplane mode.
- Import through file input.
- If enabled for the release, share one and multiple photos from the system Photos app and confirm no
  network forwarding.
- Exercise current-location grant, denial, timeout, accuracy review, and manual fallback.
- Restore a draft and export through the available browser/OS handoff.

### Windows 11 Chrome and Edge

- Install, reopen offline, and complete the workflow using keyboard only.
- Import multiple files; test save picker and forced download fallback.
- Restore a draft and verify browser-controlled download results are not overstated as filesystem confirmation.

## Completion report template

```text
Checks performed: <command/scenario and PASS/FAIL>
Skipped/inapplicable checks: <check and reason>
Remaining risks: <risk or none>
ADR impact: <updated ADR or "none" with reason>
UI documentation impact: <updated docs/ui file or no-visible-impact assessment>
```

Work is not complete while any applicable check is failing or omitted without an explicit blocker.
