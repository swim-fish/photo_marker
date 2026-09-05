# ADR 0002: Redesigned Editor State and Local Presets

- **Status**: Proposed
- **Date**: 2026-09-05
- **Related specification**: specs/002-redesign-pwa-editor/spec.md
- **Relationship**: On implementation acceptance, supersedes conflicting ADR 0001 navigation,
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
This ADR is proposed design; application implementation and release evidence are still pending.
