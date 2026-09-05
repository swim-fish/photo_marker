# Redesigned Photo Editor UI Contract

**Status**: Planned; implements specs/002-redesign-pwa-editor. The existing
[workspace guide](photo-annotation-workspace.md) remains the deployed baseline until implementation.
**Reference**: [Figma](https://www.figma.com/design/NCRix4fCkTgdk8538hrjJV/Photo-Marker), 19 frames
inspected 2026-09-05.

## Navigation and safe state

Import opens the photo-focused editor. Coordinates, four-corner text, templates and export are direct
actions; each settings view has a clear return/apply/cancel path. Preserve active photo identity and
confirmed state; preview pending settings without applying them on cancel. The new single-photo
interface replaces the old navigation; batch UI is outside this feature. Export review keeps actual format/metadata defaults, not Figma sample values.

## Shared appearance and accessibility

Use Noto Sans TC, shared semantic colors, type styles, spacing and radii. Default UI language is
Taiwan Traditional Chinese; retain English message keys/fallback. Primary controls have >=44px targets.
Numeric minus/plus targets are >=50x50px and >=24px apart edge-to-edge; map zoom lives on opposite sides
of its row. Reflow at 320px rather than shrinking hit areas. Provide names, visible focus, one keyboard
activation per action, non-color-only selected states, and reachable controls with an on-screen keyboard.
Button, NumberStepper, RgbaPicker, field, photo preview and corner controls share definitions.

## Location and maps

Capture metadata, manual entry, map selection and CURRENT GPS remain distinguishable on export.
Map panning changes a candidate under a fixed centered crosshair. Confirm commits; cancel/layer change
does not. Layer menu exposes standard, imagery (describe PHOTO2 orthophoto accurately), and terrain,
with selected/loading/unavailable states. Preserve online indicator, consent/revocation and attribution.
Maps stay optional; offline/manual entry and coordinate omission remain usable.
Current-device location needs confirmation and shows actual accuracy or unavailable, never a made-up value.

## Corner text, color and watermarks

Save four corner defaults independently; new imports use defaults, existing drafts do not reapply them.
Text and coordinate labels stack inward without intersections. Offer WGS84, TWD97 and MGRS with one selected format.
RGBA includes hue, saturation/value, alpha, RGB fields and fractional RGBA notation. Alpha modifies
background only, synchronized with the opacity row; invalid/partial values retain last applied color.
Color picking has numeric keyboard alternatives.

Watermark modes are single-position (four corners/center) and random repeated text (low/medium/high).
Repeat layout remains stable through unrelated editing, reopening and export. Watermarks sit below
foreground labels. PNG is single-position only; disabled/empty text produces no watermark.
Templates store style/format/layout/watermark preferences, never photo location or capture metadata,
and do not overwrite edited corner-text content on apply.

## New-version storage

Start fresh in photo-marker-v2; do not import or mutate old drafts, templates, settings or consent.
Save new assets and referencing drafts/templates atomically. Recover committed new-version drafts;
no migration, old UI or downgrade support is required.

## Errors, recovery and acceptance

Show explicit invalid input, missing GPS, unavailable layer, denied permission, storage failure,
export failure, disabled and handoff states. Download started is not a claim of photo-library save.
Apply/cancel, storage rollback, stale callbacks and failed share must not lose work.
Validate all new Figma states, landscape/portrait orientation, 320px phone, tablet, desktop and
keyboard-only use. Implementation updates this document and the baseline guide together when behavior
is delivered; Figma illustrations and prototype links are not substitutes for application validation.
