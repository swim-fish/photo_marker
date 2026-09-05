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


## Figma visual alignment and draft disposal (2026-09-05)

Authoritative design: Photo Marker, file `NCRix4fCkTgdk8538hrjJV`, frames `4:3`, `4:4`,
`4:8`, `121:288`, `121:317`, `121:339`, and `131:333`. The implementation uses Svelte
components and the existing palette instead of copying the generated React reference.

- The shared shell uses a 390px maximum width, 24px gutters (16px at 320px), 22px title,
  and 12px subtitle. The first content starts at 128px for a single-line subtitle. A real
  Back control occupies the top navigation area; the fictional phone clock is omitted.
- Template selection uses three horizontal thumbnail cards, a right-side Edit action,
  and Apply / Create / Set default actions in that order. Extra saved presets scroll
  horizontally. Thumbnail photographs come from the selected photo.
- `SettingRow`, `.pm-field`, `.pm-setting`, `CornerPlacement`, and Button share the design
  palette and spacing. Setting cards have 78px minimum height, white backgrounds and
  14px radii. Template corner fields are a single vertical column. Long values wrap or
  grow; controls retain keyboard focus indicators.
- Template watermark editing uses a 180px preview, single/repeat segments, a text card,
  PNG file action, and a collapsible position/density/opacity card. The preview renders
  the real photo and watermark through the existing worker and deterministic layout.
  Text and PNG remain supported; PNG replaces the text field until text mode is chosen.
- The coordinate screen provides three format buttons, complete formatted output, and
  four corner controls over a photo. Position source controls expand on request and
  start expanded for a photo without GPS. TWD97 exposes the zone; MGRS exposes precision.
  Coordinates never use ellipsis or a fixed-height clipping container. A narrow screen
  wraps the complete value and grows vertically. Export layout retains every character
  and rejects content that cannot fit instead of cropping it.
- Preview frames use `object-fit: contain` for rendered annotations. This intentionally
  differs from the design's cropped sample photo so coordinates and corner text stay
  visible with portrait, panoramic, or differently proportioned photos. Placement-only
  backgrounds and thumbnails can crop. The offline status footer and extra source/
  cancellation controls remain real application controls beyond the static mockup.
- Noto Sans TC 500 and 700 are now self-hosted alongside 400. The production precache
  grows from approximately 1.58 MiB to 3.52 MiB; all weights remain available offline.

The template editor can save a preset as the next-import default. Template, referenced
PNG assets, and default selection commit in one IndexedDB transaction. A failed save
rolls back all three. An already-default template displays a checked, disabled selection;
choose another preset to change that default. Canceling the photo application does not
undo a separately saved template.

### Discard draft

The active editor and the welcome-page recovery card expose Discard draft. A modal
confirmation describes the local editing data being removed, initially focuses the
non-destructive action, and blocks duplicate confirmation while deleting. Cancel/Escape
retains the draft. Confirm drains queued autosaves before deleting that session's
revisions and photo records in one transaction. Failure aborts the transaction, retains
in-memory work, and permits retry. Success releases object URLs, resets the file input,
returns to import, and discovers any other remaining draft. The same source photo can
be selected again. Original files, exports, global defaults, saved templates, and shared
watermark assets are retained.

### Verification

- Red-first tests covered missing discard entry points, atomic default selection, and
  a mid-discard synchronous failure that previously left partial deletion behind.
- 244 unit/component/integration tests passed across 58 files.
- 34 distinct production desktop/mobile Chromium journeys passed across focused runs:
  template creation/edit/default/reload, nested cancellation, PNG assets, quota failure,
  discard/cancel/recovery/failure, 320px/390px coordinate layouts, rendered page states,
  export, map permission, and offline recovery/export. Platform-mismatched duplicate
  offline tests are intentionally skipped.
- Figma-reference-photo screenshots of template selection/editor/corners, single/repeated
  watermarks and coordinate settings were inspected at 390px, plus 320px coordinate
  screenshots. Native rendering evidence is in ignored `build/figma-aligned-*.png`; the
  reference image is an inspection fixture, not a bundled application asset.
- Visual changes were checked with real screenshots and existing workflow tests rather
  than synthetic CSS-only unit failures. Behavior tests were updated where the design
  intentionally moved Cancel to Back or PNG selection to its direct file action.
- Five repeated-watermark preview updates on the reference photo took 158–167ms on the
  local Chromium host. This is a focused desktop
  measurement, not a physical-phone performance claim; no long performance suite was
  rerun because the export renderer and layout algorithms are unchanged.
- Typecheck, ESLint, changed-file formatting, production build and diff whitespace checks
  passed. Physical iOS/Safari checks remain pending; Chromium device emulation is not
  a substitute for those checks.

ADR impact: none. This change reuses the existing worker, deterministic rendering,
IndexedDB stores and transaction strategy; it adds no schema, dependency or migration.


## Coordinate wrapping and precision labels (2026-09-05)

The coordinate page and template coordinate subview share `CoordinateOptions`. Users
choose Allow wrapping or Force single line. Auto wrapping breaks only between complete
latitude/longitude values for WGS84 and X/easting / Y/northing values for TWD97. MGRS is
always single line and disables the wrapping selector without erasing the preference
for other formats. `CoordinateReadout` uses the same semantic boundaries in the editor
summary; a long atomic value shrinks to fit rather than overflowing or splitting digits.

Photo layout can widen a single-line coordinate up to the safe image width and reduce
its font size when needed. It searches inward from the selected corner while checking
all four freeform text boxes; occupied opposite corners cannot obscure a wide coordinate.
Coordinates and other text keep a safety gap. If no valid layout exists, application or
export reports an error. Restored and exported layouts are rebuilt from current canonical
settings so stale cached geometry cannot override the new policy.

MGRS precision labels show digits per axis and cell width by height:

| Digits per axis | Cell dimensions |
| --- | --- |
| 0 | 100,000 × 100,000 m |
| 1 | 10,000 × 10,000 m |
| 2 | 1,000 × 1,000 m |
| 3 | 100 × 100 m |
| 4 | 10 × 10 m |
| 5 | 1 × 1 m |

These are grid dimensions, not administrative boundaries or claimed GPS accuracy.
Reference: [NGA MGRS coordinate systems](https://earth-info.nga.mil/?action=coordsys&dir=coordsys).
The stored numeric precision and conversion algorithm remain unchanged.

Verification adds red-first layout and template-sanitization regressions, browser checks
for wrap controls, narrow readouts, all precision labels, persistence and nested cancel,
and visual inspection of real photo annotations with all four corners populated. Browser
photo-editing fixtures now use a deterministic 1200×900 PNG instead of the 4×3 PNG codec
fixture: a four-pixel image cannot contain readable full coordinates. The tiny fixture
remains in codec/watermark tests, and an impossible-coordinate-layout rejection is tested.
A re-import race exposed by the larger fixture was fixed by disabling editor tools until
intake completes. Source bytes are still immutable.

ADR impact: none. This extends presentation settings and the existing placement search;
no new storage schema, conversion library, rendering backend or migration is introduced.


Final checks for the coordinate amendment: 250 unit/component/integration tests passed,
plus 26 distinct desktop/mobile Chromium journeys across the coordinate, editor, template
and offline suites. Platform-mismatched offline duplicates were skipped intentionally.
Typecheck reported zero errors/warnings; ESLint, formatting and production build passed.
Screenshots and persisted geometry were inspected with every corner populated for WGS84
and TWD97 auto/single-line modes and MGRS. No coordinate box intersected another text box.
Physical iOS/Safari validation remains pending. UI documentation and data-model notes are
updated; no long performance characterization was necessary for this bounded layout change.
