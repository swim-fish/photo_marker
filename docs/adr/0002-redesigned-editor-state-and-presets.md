# ADR 0002: Redesigned Editor State and Local Presets

- **Status**: Accepted for implementation; external release gates pending
- **Date**: 2026-09-05
- **Related specification**: specs/002-redesign-pwa-editor/spec.md
- **Relationship**: Supersedes conflicting ADR 0001 navigation,
  map and persistence contracts for the new version. The old ADR remains historical evidence.

## Context

The Figma design adds focused settings, map-center confirmation, layers, templates and watermarks.
The user explicitly requests direct new-version adoption without backward compatibility. Preview and
export must agree; reusable presets must not copy capture coordinates or photo metadata.

## Decision

1. Reuse the client-only Svelte stack, useful Workspace helpers and shared Canvas renderer.
   Separate transient view/settings/candidate state from committed draft state. Explicit Apply/Confirm
   commits; Cancel and stale asynchronous responses do not.
2. Use a fresh `photo-marker-v2` IndexedDB, database version 1 / record schema 1. Store sessions,
   revisions, photos, sharedIntake, preferences, templates and watermarkAssets in separate stores
   within this database. All repositories share database.ts schema/connection ownership.
3. Save assets and referencing drafts/templates in one transaction, with source records, revision
   N+1 and sessions.latestRevision committed together when involved. Validate/decode before opening
   transactions; success requires transaction completion. Abort/quota preserves previous committed
   state and current in-memory edits. Session cleanup never clears reusable settings/assets.
4. Persist resolved normalized per-photo watermark rectangles with an algorithm version. Render source,
   watermark, then foreground labels through EXIF-aware transforms with independent alpha.
   Bound repeated copies and placement attempts; defer asset garbage collection.
5. Map candidates require confirmation. Use three fixed NLSC layers with exact path allowlisting,
   common zoom 0–18 and policy-2 consent under a fresh new-version key. No tile caching or geocoder.
6. Offer WGS84, TWD97 and MGRS with one selected format. Use canonical RGBA objects, shared control
   tokens and typed zh-TW messages. Keep source-format/metadata defaults as product policies.

## Alternatives

Separate settings storage prevents atomic cross-store saves and is unnecessary without old-client
support. Migration/dual-write adapters add no required behavior. A framework rewrite duplicates useful
render/import logic. Recomputing random placement on render fails stable export.

## New-version boundary

No old-draft/template/settings/consent reads, migrations, old UI, extra-format controls or downgrade
support. Leave older databases untouched; first launch starts fresh. Reject unknown newer schemas
without mutation. This records the user-authorized exception to compatibility expectations without
changing the constitution. It does not authorize deletion of existing user data.

## Validation and consequences

Earlier independent reviews informed map/privacy and identified storage constraints; the user then
removed the old-client premise. Validate the final unified database with transaction-abort, quota,
source/revision recovery, shared-asset and cleanup-isolation tests. Validate EXIF orientations,
alpha pixels, stable watermark restore, no-egress/consent, provider availability and performance.
Users cannot resume old-version drafts in the new application. Fresh consent is required for maps.
The working tree implements this decision. Automated storage, renderer, no-egress, recovery and
browser evidence is recorded in `specs/002-redesign-pwa-editor/validation.md`; physical-device,
provider and usability acceptance remains pending.

Rendering uses a bounded preview surface while preserving original export size. A packaged font is
loaded in both worker and fallback contexts. Shared PNG IDs are immutable: new bytes require a new
ID. Stored watermark arrangements are reused only for the same photo, algorithm and fingerprint.

Service-worker authorization is a per-request query to the live requesting page, after exact URL
and matrix-bound checks. A worker restart therefore cannot lose a durable authorization lease, and
closing the map synchronously changes the page response to denied. There is no tile cache, global
permission flag, or long-lived stored network lease. Production tests restart the worker and verify
closed/open/restarted/revoked request outcomes.

## Amendment: pwa_map sources and browser EXIF decoding (2026-09-05)

The user requested the current pwa_map map catalogue and zoom interaction. Replace the former
three-NLSC-source restriction with six basemaps and one independent Google road overlay as
specified in `docs/ui/redesigned-photo-editor.md`. Retain Leaflet; reproducing the centered
interaction does not require a second map engine. Consent policy 3 and exact CSP/tile allowlists
cover the expanded providers. Only OpenStreetMap uses normal browser HTTP caching and an
origin-only Referer; tile CacheStorage remains prohibited.

Real JPEG fixtures showed Chromium applies EXIF orientation even with imageOrientation:none.
The renderer now explicitly consumes browser-oriented decoding, draws preview/baked output
once, and inversely maps metadata-preserving output to raw pixels. This supersedes any assumption
that createImageBitmap yields raw JPEG pixels. Source bytes and metadata export contracts are retained.

## Amendment: reusable template content (2026-09-05)

Following the user request, template presets may explicitly contain four corner default strings
in `defaultTexts`, alongside the existing watermark configuration. This supersedes the earlier
blanket exclusion of corner content from templates. The sanitizer copies only these four fields;
photo identifiers and coordinates remain excluded. Explicit defaults replace corner text when
applied and take precedence over global defaults on import. Absence means inherit/preserve text.
Custom updates retain the existing template ID and atomic asset storage contract.

The Figma follow-up moves template editing into its own transaction and nested checkpoint views.
The right-side Edit action opens the selected preset. Local saved overrides of built-in IDs take
precedence during list loading; new presets receive fresh IDs. Canceling editing leaves the
preset and photo unchanged, while successful Save returns to template selection before Apply.
