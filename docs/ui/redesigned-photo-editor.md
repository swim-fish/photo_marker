# Redesigned Photo Editor UI Contract

**Status**: Implemented in the working tree; release acceptance remains pending the external and
physical-device gates in `specs/002-redesign-pwa-editor/validation.md`. This is the active interface;
[the previous workspace guide](photo-annotation-workspace.md) is historical.
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

## Design token reference

Figma editor 4:3: background #f8faf7, ink #18352f, accent #16745c, pale #eaf3ec,
muted #64766f and white. Use 8/12/16/24px spacing, 14px control radius, 18px card radius,
22px bold titles, 15px medium action text and 12px captions with 1.5 line height.
The 19-frame inventory and requirement mapping are in spec.md's Design Reference and Traceability.
View states include import, editor, coordinates/missing GPS, map/layers/device candidate, corner text,
defaults, appearance/RGBA, single/repeated watermark, templates/customization, export and outcome.

## Delivered implementation

`Workspace.svelte` owns a single applied settings transaction and the focused views. `EditorShell`,
`Button`, `NumberStepper`, `RgbaPicker`, `CornerTextEditor`, `WatermarkEditor` and `TemplatePicker`
provide shared composition. The previous batch/navigation components are not mounted by App.
Back and Cancel leave pending settings; Apply validates and commits the whole pending transaction.
Defaults are saved explicitly and only affect a later import. Text-style and RGBA controls share one
view, while default-text confirmation is inline rather than a separate screen.

Preview uses at most 1280 pixels on its longest edge with an 80 ms edit debounce; exports retain full
source dimensions. Both paths load the packaged Noto Sans TC face and use the same normalized layout.
JPEG quality is adjustable; the supported output size is the original size. Format conversion requires
explicit metadata removal. PNG watermark limit: 2 MiB / 2048 by 2048 pixels. Repeat counts: 5/10/20.
Template thumbnails show placement, appearance and watermark preferences without photo content.

The production worker checks every external tile against the exact three-layer matrix allowlist and
asks the requesting live page whether its map is currently open with consent. Missing controller,
missing client, invalid ACK or unanswered query fail closed. Consent is fresh policy 2; authorization
is never persisted as a long-lived worker lease and survives worker restart via the live-page query.
Offline readiness, draft persistence failure and download/share handoff messages reflect actual results.

Automated screenshots cover the main phone views and 320/768/1280 px style controls. Full 19-state
approval across the device matrix and physical on-screen-keyboard inspection remain release work.
