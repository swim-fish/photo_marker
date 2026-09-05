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

## 2026-09-05 map and orientation amendment

This amendment supersedes the earlier three-NLSC-layer contract. The map catalogue and
centered zoom behavior follow swim-fish/pwa_map commit
`a8fb5b88de8f77f5cba517448d4911d3cccb2fc5`.

- Default: OpenStreetMap. Alternative basemaps: NLSC EMAP5, Google hybrid,
  satellite, terrain and roadmap. Google road overlay is independent and survives basemap changes.
- Drag to select the central crosshair. Buttons zoom by one level; wheel input uses
  `clamp(-deltaY / 100, -1, 1)` around the current center. Pinch and double-click also
  retain the center. View zoom is 0–20; native OSM/NLSC tiles stop at 19 and Google at 20.
  Zoom buttons retain 50px minimum targets and 24px separation. Reduced motion disables zoom animation.
- Provider attribution remains visible inside the map. Overlay failure warns without disabling
  a successfully loaded basemap. Switching a basemap preserves the candidate and zoom.
- Consent policy 3 discloses all providers; previous NLSC-only consent does not authorize them.
  A live open-map permission is required for every external request, including after worker restart.
  Exact tile hosts and paths are allowlisted. No tile is stored in CacheStorage or prefetched.
  OSM uses its canonical tile host, normal HTTP caching and an origin-only Referer, following
  https://operations.osmfoundation.org/policies/tiles/ . Other sources retain no-store/no-referrer.
- Browser JPEG decoding already applies EXIF orientation. Preview and baked exports draw this
  upright bitmap once. Metadata-preserving exports transform back to raw coordinates before
  retaining EXIF, avoiding double rotation and dimension distortion. Original bytes remain unchanged.

Verification uses mocked provider tiles, not live provider availability. Real EXIF 1–8 JPEG
fixtures are checked in desktop and mobile Chromium. Physical iOS/Safari verification remains pending.

### Verification for the amendment

- 239 unit/component/integration tests passed (57 files).
- 12 production browser journeys passed across desktop/mobile Chromium, including
  overlay persistence, attribution, centered fractional/button zoom, live permission after
  worker restart, revocation and absence of provider tiles from CacheStorage.
- Two browser EXIF 1–8 regression journeys passed. Preview dimensions/colors and raw-preserving
  export pixels are checked against real JPEG orientation tags.
- Typecheck: zero errors/warnings. ESLint and production build passed; diff whitespace check passed.
- Desktop/mobile mock-tile screenshots inspected. Mobile wheel uses a deterministic DOM event
  because Chromium device emulation rescales native wheel input; desktop uses native wheel input.
- Regression found and fixed: removing all Leaflet layer listeners before removing the layer
  suppressed its internal cleanup hook, leaving stale zoom handlers. Removal now precedes listener cleanup.
- Physical devices and actual provider availability were not verified in this change.

## Template content editing (2026-09-05)

Templates now optionally include explicit `defaultTexts` for all four corners. The template page
reuses CornerTextEditor and WatermarkEditor to edit text, single/repeated text watermarks, and
single PNG watermarks. Save creates a custom template; Update replaces the selected custom record
without changing its ID or default selection. Built-ins remain copyable via Save.

Applying a template with explicit defaults replaces the four corner texts and watermark settings,
while retaining photo coordinates. Templates without explicit defaults preserve current text;
new photos using those templates inherit global corner preferences. Explicit empty strings clear
corners. Saving a template is persistent independently of canceling its application to the photo.
PNG assets and templates use the existing atomic storage transaction.

Regression coverage: a failing unit test first demonstrated missing persistence/application of
corner defaults. All 240 unit/component/integration tests pass, along with 10 existing editor
browser journeys and four new desktop/mobile journeys for create/update/default reload and PNG
watermarks. Typecheck, lint and production build pass. Mobile template controls were visually
inspected. A related import bug was fixed by snapshotting Svelte state before copying the selected
custom default template; structuredClone cannot clone reactive proxies.

## Figma template edit entry (2026-09-05)

The selected template name now has a right-side Edit button. New and existing presets open
TemplateEditor, matching Figma frame 121:288. Corner defaults, appearance, coordinate layout and
watermark settings open focused subviews. Done retains the subview draft; Cancel/Back restores
its checkpoint. Canceling the editor discards all unsaved edits. Saving persists the preset and
returns to template selection; applying it to the current photo remains a separate action.

Existing built-in IDs can have local saved overrides, so the displayed preset remains editable
without duplicate list entries. New creates a fresh ID. The shared palette, stepper, corner text
and watermark components are reused. The editor suppresses the photo preview so the settings
remain near the top, consistent with the Figma design.

Final verification: 18 production desktop/mobile browser journeys passed, including six template
journeys for create/update/reload, nested cancellation and PNG persistence. EXIF 1–8 browser
regressions were verified during the preceding orientation change. The complete unit suite was
rerun after a transient pre-existing batch-export timer assertion failure; its focused rerun also
passed. Screenshots of the selected template and editor were inspected.
