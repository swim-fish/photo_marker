# Feature Specification: Figma-Aligned PWA Photo Editor Redesign

**Feature Branch**: `N/A (no before_specify hook configured; current branch: master)`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "Specify the PWA redesign from the current Photo Marker Figma pages.
Make photo selection, GPS annotation, four-corner text, and template switching simple and fast.
Support WGS84, TWD97, and MGRS; map-center location selection with a crosshair and switchable layers;
explicit current-device location; reusable corner text; single-position or randomly repeated text
watermarks; RGBA text-box backgrounds; and separated minus/plus controls. Keep colors and components
modular and reusable. Adopt the new version directly; backward compatibility is not required."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quickly Mark and Save a Photo (Priority: P1)

A phone user selects a photo, sees its preview with available capture GPS and saved annotation
preferences, makes any necessary adjustments, and saves an annotated copy.

**Why this priority**: This is the shortest complete journey that delivers the product's value.

**Independent Test**: Select a supported photo with capture GPS, use the default annotation settings,
open export review, and save a copy while verifying the source remains unchanged.

**Acceptance Scenarios**:

1. **Given** a supported photo with valid GPS, **When** it is selected, **Then** the editor shows a
   correctly oriented preview, capture-GPS provenance, and applicable saved defaults without
   requesting device location or loading a map.
2. **Given** the editor, **When** the user opens coordinate, corner-text, or template settings and
   returns, **Then** photo content and confirmed settings remain intact; only the active view is
   presented rather than a page containing all settings.
3. **Given** the user chooses save, **When** export review opens, **Then** the user can review the
   annotated image and supported output and metadata settings before starting export.
4. **Given** export starts, **When** a download is handed to the browser, **Then** the app reports
   that download has started rather than claiming that the operating system saved it to the photo
   library; an available share action can be used instead.
5. **Given** an export failure or canceled share action, **When** the user returns, **Then** the
   current work remains recoverable and retry is available; neither case is reported as success.
6. **Given** a draft saved by the new version, **When** the editor reopens, **Then** its committed
   annotations and original photo content are restored. A first launch with only older-version data
   starts a fresh workspace and does not import or alter that data.

---

### User Story 2 - Confirm a Trustworthy Location (Priority: P1)

A user recovers a missing location by placing the intended capture site under the map's center
crosshair or explicitly confirming the phone's current location.

**Why this priority**: A plausible but incorrect coordinate makes a field record unreliable.

**Independent Test**: Start with a GPS-free photo and complete map selection, cancel map selection,
confirm current location, and deny location access as separate cases.

**Acceptance Scenarios**:

1. **Given** missing or invalid capture GPS, **When** import completes, **Then** the app offers map
   selection, explicit current location, and continuing without a coordinate; existing manual
   coordinate entry remains accessible without requiring map access.
2. **Given** map-network consent, **When** the user opens the map, pans it, or changes zoom, **Then**
   the crosshair stays at the center of the unobscured map area and the displayed candidate
   coordinate follows the geographic point beneath it.
3. **Given** a map candidate, **When** the user confirms it, **Then** it becomes the working
   coordinate with map-selection provenance; panning, opening a layer menu, and canceling alone
   do not change the previously confirmed coordinate.
4. **Given** the layer menu, **When** standard map, satellite imagery, or terrain is selected,
   **Then** the selected available layer is identified and the geographic center, zoom, candidate
   coordinate, and confirmed coordinate remain unchanged. A failed layer is reported as unavailable
   without silently showing a different layer as selected.
5. **Given** explicit current-location action and permission, **When** a result is available,
   **Then** the app shows the coordinate and reported accuracy, warns it may differ from the capture
   site, and requires confirmation before using it. The accepted provenance remains `CURRENT GPS`.
6. **Given** denied permission, timeout, missing accuracy, offline maps, or revoked map consent,
   **When** location cannot be obtained or a map cannot load, **Then** the app explains the state,
   retains existing work, and offers a usable non-map path without inventing a location or accuracy.

---

### User Story 3 - Choose Coordinate Format and Four-Corner Text (Priority: P1)

A user selects a familiar coordinate format and independently assigns coordinates and text to the
photo's corners, then saves frequently used text for future photos.

**Why this priority**: Readable coordinates and reusable labels are the main annotation operations.

**Independent Test**: With a known location, switch all three prominent formats, exercise each corner,
add same-corner text, and import a second photo to verify saved text defaults.

**Acceptance Scenarios**:

1. **Given** a confirmed location, **When** WGS84, TWD97, or MGRS is selected, **Then** only its
   representation changes; the location and provenance do not. Applicable zone and precision are
   visible, and out-of-coverage values are not fabricated.
2. **Given** a coordinate overlay, **When** any of the four corners is selected, **Then** its preview
   and exported relative placement agree. The new editor offers one selected format at a time.
3. **Given** coordinate and text items in the same corner, **When** an item is added or edited,
   **Then** they stack inward without overlap, with corner text preceding coordinates; invalid
   placement retains the previous valid state and explains how to resolve the conflict.
4. **Given** text in multiple corners, **When** one corner is edited or cleared, **Then** the other
   corners and coordinate content remain unchanged, including Unicode and line breaks.
5. **Given** corner text is saved as a default, **When** a new photo is imported or the app reopens,
   **Then** the saved local default remains available and applies to new imports. Changing a default
   does not overwrite already edited photos. Literal date text remains literal unless explicitly edited.

---

### User Story 4 - Style Text Boxes with RGBA Colors (Priority: P2)

A user chooses a text-box background visually or numerically and controls its transparency without
making the foreground text translucent.

**Why this priority**: Photos vary in brightness, so labels must remain adjustable and readable.

**Independent Test**: Set a known RGBA value, change alpha between its limits, and compare the preview,
restored draft, template, and export against that same value.

**Acceptance Scenarios**:

1. **Given** a selected text box, **When** the user changes hue, saturation/brightness, a channel
   field, or the RGBA value, **Then** the picker, channel values, and background preview agree.
2. **Given** R, G, and B values of 24, 53, and 47 and A of 85%, **When** applied, **Then** the value
   is equivalent to `rgba(24, 53, 47, 0.85)`; alpha affects only the background, not foreground text.
3. **Given** alpha of 0% or 100%, **When** previewed and exported, **Then** the background is fully
   transparent or fully opaque respectively, while the text retains its selected appearance.
4. **Given** an empty, malformed, or out-of-range channel/value, **When** application is attempted,
   **Then** the app identifies the invalid field and retains the last valid applied color.
5. **Given** the separate background-opacity setting, **When** it or the picker's A value changes,
   **Then** the other displays the same value; opacity is not applied twice.
6. **Given** pending edits, **When** the user cancels the settings view, **Then** its last applied
   appearance returns; applying changes makes the same appearance available in export and drafts.

---

### User Story 5 - Apply a Single or Randomly Repeated Text Watermark (Priority: P2)

A user adds a watermark once at a chosen location or repeats it across the photo in an irregular
arrangement.

**Why this priority**: Both attribution and broad photo marking should be reusable rather than
requiring users to manually place many text boxes.

**Independent Test**: Configure identical watermark content in both modes, change position/density
and opacity, and verify that exported copies reproduce each preview.

**Acceptance Scenarios**:

1. **Given** an enabled text watermark, **When** single-position mode is chosen, **Then** exactly one
   watermark is shown at the selected corner or center, and content and opacity remain editable.
2. **Given** random-repeat mode, **When** applied, **Then** multiple copies of the same text are
   irregularly distributed across the photo, remain within its bounds, and use the selected density
   and opacity rather than one fixed position.
3. **Given** a confirmed repeated arrangement, **When** unrelated settings change, the draft
   reopens, or the image exports, **Then** the arrangement does not unexpectedly reshuffle.
4. **Given** mode switching, **When** the user switches between single and repeat, **Then** content
   and opacity persist and each mode's last position or density is restored.
5. **Given** disabled or blank watermark content, **When** previewing or exporting, **Then** no
   watermark is drawn and other photo annotations are unchanged.
6. **Given** an optional transparent PNG watermark, **When** selected, **Then** it is available as
   a single-position image watermark. Random-repeat scope is text; invalid images leave the
   previous valid watermark intact.

---

### User Story 6 - Reuse and Customize Templates (Priority: P2)

A user switches among recognizable presets or saves a personal template containing preferred
annotation appearance, coordinate display, corner assignments, and watermark configuration.

**Why this priority**: Reusing settings reduces the work needed for the next photo.

**Independent Test**: Save a custom template, apply another template to the same photo, restore the
saved template, reopen the app, and use it on a second photo with different GPS.

**Acceptance Scenarios**:

1. **Given** template choices, **When** a template is selected for preview, **Then** its thumbnail,
   selected state, and photo preview identify the selected appearance; cancel restores the last
   applied template.
2. **Given** an edited photo, **When** a template is applied, **Then** styles, format, corner layout,
   and watermark settings change while confirmed location, provenance, and user-written corner
   text remain intact.
3. **Given** a custom template is saved, **When** it is reopened or applied later, **Then** its RGBA
   values, text size/color, box radius/padding, coordinate format/zone/precision/placement, and
   watermark mode/content/position/density/opacity remain available.
4. **Given** a template is selected as default, **When** another photo is imported, **Then** the
   default appearance and separately saved corner-text defaults apply to that new photo's own
   location; templates never transfer an earlier photo's location or source metadata.

---

### User Story 7 - Operate Safely on Small Screens (Priority: P1)

A user can identify and reach controls without accidentally triggering the opposite numeric or map
zoom action, using touch, keyboard, or a pointing device.

**Why this priority**: Fast editing depends on avoiding corrections caused by crowded controls.

**Independent Test**: Exercise the size stepper, map zoom, picker, and navigation at the minimum
supported phone width and with keyboard-only input.

**Acceptance Scenarios**:

1. **Given** a minus/plus pair, **When** displayed, **Then** each has a distinct hit area at least
   50 by 50 logical pixels and an edge-to-edge gap of at least 24 logical pixels; these dimensions
   do not shrink on supported viewports. Map zoom controls occupy opposite sides of the control row.
2. **Given** a focused numeric editor, **When** one minus/plus action occurs, **Then** only the
   associated value changes by its displayed increment; the opposite action is not triggered, and
   reaching a limit disables the corresponding action without discarding the value.
3. **Given** keyboard-only use or an open on-screen keyboard, **When** editing and navigating,
   **Then** controls have accessible names and visible focus, focused inputs and apply/cancel
   actions remain reachable, and no operation requires a drag-only gesture.
4. **Given** a shared visual style or control, **When** its design-system definition is updated,
   **Then** the related screens use the same updated colors, typography, spacing, and states
   without unintended one-off variations.

### Edge Cases

- Unsupported/corrupt photos and absent or malformed GPS produce actionable states while preserving
  any existing draft; canceling file selection does not discard current work.
- A legitimate zero latitude/longitude is not treated as missing GPS. Out-of-coverage formats leave
  the confirmed location intact.
- A layer change, menu opening, viewport resize, map drag in progress, or map failure cannot commit
  a candidate implicitly. Selection reflects the settled center when the user confirms.
- Map consent revoked while a layer is open prevents subsequent map requests. An unavailable layer
  does not erase the confirmed coordinate or falsely indicate successful loading.
- Long multilingual labels, multiline content, very small photos, and portrait/landscape rotation
  cannot silently crop required annotations; invalid layouts retain the last valid arrangement.
- Repeated watermarks are a separate background marking layer. Coordinate and corner-text labels
  remain above it, and coordinate/text collision rules still apply to those foreground labels.
  Density or long content that cannot fit produces a message or a disclosed lower-density result,
  never clipped watermark text or an unbounded number of copies.
- Alpha at zero, fractional alpha, incomplete typing, and cancel/apply cycles retain consistent
  background opacity. Changing it does not change text or watermark opacity.
- Storage-full/unavailable states disclose that defaults, templates, or draft changes were not
  saved; the current usable edit remains available for export.
- Export cancel/failure, unsupported sharing, and interruption retain recoverable work. A browser
  download handoff is distinguished from confirmed file-system or photo-library persistence.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The primary experience MUST use a photo-focused editor with direct coordinate, corner
  text, template, and export actions matching the referenced Figma redesign. Secondary views MUST
  preserve work and support return/apply/cancel without showing every settings page simultaneously.
- **FR-002**: Import MUST preview supported photos with correct orientation, expose valid capture
  GPS, apply saved defaults for new photos, and offer recovery from unsupported input without
  automatically opening a map or requesting device location.
- **FR-003**: Missing/invalid GPS MUST offer map selection, explicit current location, and coordinate
  omission; existing manual entry MUST remain usable independently of online maps.
- **FR-004**: WGS84, TWD97, and MGRS MUST be prominent display choices. Changing representation MUST
  preserve the working location and provenance, expose relevant zone/precision, and reject invalid
  coverage. Only these three formats are required, with one selected display format at a time.
- **FR-005**: Capture GPS, map-selected, manual-entry, and current-device locations MUST remain
  distinguishable in editing and visible coordinate export; current-device provenance MUST retain
  `CURRENT GPS`. Annotation changes MUST NOT silently rewrite capture metadata.
- **FR-006**: The map MUST show a fixed center crosshair and a candidate coordinate corresponding
  to the geographic center of the unobscured map area. Only explicit confirmation MUST replace the
  working coordinate; cancellation MUST preserve its former value and provenance.
- **FR-007**: The map MUST provide an identifiable layer button and choices for standard map,
  satellite imagery, and terrain, with loading, selected, and unavailable states. Switching layers
  MUST preserve center, zoom, candidate, and confirmed location.
- **FR-008**: Device location MUST require explicit action and confirmation, display reported
  accuracy when available, and explain capture-site ambiguity. Failure MUST expose alternatives
  without inventing accuracy or changing existing coordinates.
- **FR-009**: Map activation and layer requests MUST retain explicit network disclosure, locally
  persisted revocable consent, and an online indicator. Decline, revocation, or unavailability MUST
  leave local editing/export and manual entry usable; changing layer does not authorize sending
  photo, annotation, or metadata content.
- **FR-010**: Coordinates and each corner's text MUST independently support all four corners.
  Same-corner foreground labels MUST stack inward without intersection, with text before
  coordinates. Invalid additions or edits MUST keep the previous valid layout and explain recovery.
- **FR-011**: Corner text MUST support Unicode, line breaks, independent editing and clearing, and
  locally saved per-corner defaults that persist across reopening and affect new imports only.
- **FR-012**: Text-box appearance MUST include foreground color, size, background RGBA, radius, and
  padding, with an applied preview consistent with export.
- **FR-013**: Background color selection MUST offer hue, saturation/brightness, alpha, individual
  channels, and RGBA value entry. RGB channels MUST accept integers 0–255; alpha MUST accept 0–100%
  in the A field and 0–1 in RGBA notation, with at least 1-percentage-point precision.
- **FR-014**: All valid color representations and the separate background-opacity control MUST stay
  synchronized. Alpha MUST apply once to the background only; invalid edits MUST identify the field
  and retain the last valid applied value. Cancel MUST restore the last applied appearance.
- **FR-015**: Text watermarks MUST support enable/disable, editable content and opacity, single-position
  placement, and randomly repeated placement. Mode switching MUST retain content/opacity and
  restore mode-specific position/density.
- **FR-016**: Single-position text watermarks MUST support top-left, top-right, bottom-left,
  bottom-right, and center. Random-repeat MUST distribute multiple copies irregularly inside the
  image, with selectable density and stable preview/draft/export placement for unchanged settings.
- **FR-017**: Watermarks MUST render below coordinate and corner-text labels. Blank/disabled
  watermarks MUST produce no output. A layout that cannot fit MUST be reported rather than silently
  clipping content. Transparent PNG MUST remain available for single-position image watermarking.
- **FR-018**: Template selection MUST provide distinguishable previews, an identifiable selection,
  apply/cancel, a custom-template save action, and a locally persisted default-template choice.
- **FR-019**: Templates MUST preserve text-box appearance including RGBA, coordinate display settings
  and corner, and watermark configuration. They MUST NOT contain source photo content, capture
  metadata, or a photo's actual location. Applying one MUST preserve current corner-text content,
  confirmed location, and provenance.
- **FR-020**: New-photo defaults MUST combine the selected default template with separately saved
  corner text and the new photo's own location. Template/default/draft save failures MUST be disclosed
  without falsely reporting persistence or discarding the current edit.
- **FR-021**: Export review MUST show an accurate annotated preview and supported format, size,
  quality, and metadata options. A separate output MUST preserve the source unchanged and maintain
  coordinate/text/watermark content, RGBA compositing, and relative placement.
- **FR-022**: Download and supported share actions MUST provide truthful progress, cancellation,
  failure, and handoff states, retry or fallback, and return/next-photo actions. Core offline,
  supported source-format/metadata defaults, orientation behavior, and draft recovery MUST retain
  the new-version product policies identified below.
- **FR-023**: Minus and plus MUST be separate controls with minimum 50 by 50 logical-pixel hit areas
  and at least 24 logical pixels between their edges. Text-size controls MUST expose a current value
  and 1-pixel increment; map zoom controls MUST be separated on opposite sides of their row.
- **FR-024**: Controls MUST expose keyboard operation, accessible names, visible focus and selected/
  disabled states independent of color. Primary touch targets MUST be at least 44 by 44 logical
  pixels; focused fields and confirmation actions MUST remain reachable on supported viewports.
- **FR-025**: The redesign MUST use shared color, typography, spacing, radius, and reusable control
  definitions. Normal, selected, disabled, loading, empty, validation-error, and success appearances
  MUST remain consistent across screens; illustrative map/photo assets MUST NOT substitute for real
  user data or functional controls in the delivered application.
- **FR-026**: The app MUST directly use the new version and its canonical data model. New-version
  drafts MUST recover committed source content and annotations after reopening or a failed save.
  Older-version drafts, settings, consent and templates MUST NOT be read or migrated; old storage
  MUST remain untouched. No backward reader, dual write, old UI or downgrade support is required.

### Key Entities

- **Photo Editing Draft**: Immutable source photo reference, confirmed location/provenance, coordinate
  presentation, corner annotations, watermark arrangement, applied appearance, and export choices.
- **Location Candidate**: Uncommitted map-center or current-device point, source, validity, optional
  accuracy, and relationship to a separately confirmed working location.
- **Map View Preference**: Selected layer and view state, distinct from map-network consent and from
  a photo's confirmed location.
- **Corner Text Defaults**: Four independently saved local text values applied to new photo imports.
- **Text-Box Appearance**: Foreground color, size, background RGBA with one alpha value, radius,
  padding, and placement rules.
- **Watermark Configuration**: Enabled state, text or supported image, mode, opacity, single position,
  repeat density, and a per-photo arrangement retained with the draft rather than actual photo data
  in a reusable template.
- **Annotation Template**: Named, locally reusable display/style/watermark settings and optional
  default status, separate from actual photo coordinates and per-corner text defaults.
- **Export Outcome**: Progress, failure, canceled operation, download/share handoff, and available
  follow-up actions without an unsupported claim of photo-library persistence.

### Design Reference and Traceability

The inspected design is [Photo Marker](https://www.figma.com/design/NCRix4fCkTgdk8538hrjJV/Photo-Marker),
page `0:1`, inspected on 2026-09-05. It contains 19 phone frames at this snapshot. This specification
defines behavior beyond the illustrative prototype links; examples are not live location evidence.

| Design area | Figma node IDs | Stories / requirements |
| --- | --- | --- |
| Start, editor, export, completion | 4:2, 4:3, 4:10, 63:72 | US1; FR-001–002, FR-021–022, FR-026 |
| Coordinate formats | 4:4, 82:139, 82:162 | US3; FR-004–005, FR-010 |
| Missing GPS, map, current location | 4:5, 4:6, 63:71 | US2; FR-003, FR-005–009 |
| Layer selector | 113:199 | US2; FR-006–009 |
| Corner text and defaults | 4:7, 63:68 | US3; FR-010–011 |
| Text-box style and RGBA picker | 63:69, 113:244 | US4, US7; FR-012–014, FR-023–024 |
| Single and repeated watermark | 63:70, 112:185 | US5; FR-015–017 |
| Templates and customization | 4:8, 4:9 | US6; FR-018–020 |
| Shared design definitions | 23:20 | US7; FR-023–025 |

### Scope Boundaries and New-Version Policy

The user explicitly requested direct adoption of the new version without backward compatibility on
2026-09-05. This specification supersedes conflicting behavior in
[001 Offline Photo Annotation](../001-annotate-photos/spec.md) for the redesigned application.

| Area | New-version policy |
| --- | --- |
| Navigation | Photo-focused editor and direct settings replace the old sequential interface. |
| Persistence | Fresh new-version storage; no old-draft/template/settings import, migration, dual write or downgrade support. Leave older storage untouched. |
| Coordinates | WGS84, TWD97 and MGRS, one selected format; extra formats and old multi-format controls are outside scope. Preserve truthful capture/manual/map/device provenance. |
| Maps | Explicit center confirmation, three selectable layers and fresh informed consent; no implicit location assignment. |
| Rendering | Foreground labels must not intersect; watermarks are a separate background layer. Source bytes and orientation remain correct. |
| Export | Preserve supported source format, dimensions and metadata by default as a product policy. Figma JPG/GPS-off examples are selectable values, not changed defaults. |
| Release capabilities | Local/offline editing, new-version draft recovery, responsive desktop use and truthful download/share outcomes remain required. Old batch UI and old-client behavior are not acceptance gates. |

In scope: redesigned single-photo navigation, coordinate/source review, explicit map-center selection,
layer switching, per-corner text defaults, reusable templates, RGBA box styling, text watermark modes,
single-position PNG watermarks, safer numeric controls, and export review.

Out of scope: cloud accounts/sync, photo upload, route planning, offline map downloads, a general photo
filter editor, video annotation, automatic background location, randomly repeated image watermarks,
and batch-management UI. Existing code may be reused where useful without retaining old interfaces
or persisted representations. This planning change does not delete existing application data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of first-time participants in a focused evaluation of at least 10 users
  can select a GPS-tagged photo, confirm annotations using a saved preset, and initiate export
  without assistance within 60 seconds, excluding operating-system picker interaction and file
  transfer time. The new unsaved/custom annotation journey remains completable within 3 minutes.
- **SC-002**: All acceptance fixtures for map confirmation, cancellation, layer switching, GPS denial,
  and provenance preserve the expected confirmed location; there are zero silent substitutions of
  device location or map candidates.
- **SC-003**: All approved coordinate vectors meet their existing tolerance, and every supported
  corner/format fixture remains inside the photo without foreground-label intersections.
- **SC-004**: In all approved RGBA fixtures, channel representations agree, alpha endpoints behave
  correctly, text opacity stays unchanged, and exported backgrounds match the applied preview.
- **SC-005**: In all approved watermark fixtures, single mode renders one copy, repeat mode renders
  a stable multiple-copy arrangement, and reopening/exporting unchanged settings preserves that
  arrangement. Every template/default restoration fixture preserves required settings without
  copying a previous photo's location.
- **SC-006**: On representative supported devices with 12-megapixel JPEG input, at least 95% of
  focused runs show a usable import preview within 3 seconds, show an updated annotation preview
  within 500 milliseconds of a valid settings change, and complete export within 15 seconds.
- **SC-007**: Across approved phone (including 320-logical-pixel width), tablet, desktop, and
  keyboard-only fixtures, every primary action is reachable without blocking overlap; every
  minus/plus pair meets its target-size and separation requirements.
- **SC-008**: All core local editing/export acceptance fixtures pass after offline readiness with
  networking disabled. There are zero map requests before consent or after revocation, and zero
  application-controlled photo/annotation uploads.
- **SC-009**: Every source-immutability, new-version draft recovery, atomic-save failure and
  export-failure fixture passes without lost committed content. Old-storage isolation fixtures
  confirm that the new app neither imports nor mutates older-version data.
- **SC-010**: Design review finds zero unapproved variations from shared definitions for repeated
  controls in the redesigned screens; normal, selected, disabled, and error states are identifiable.

## Assumptions

- The most recent user instructions in this conversation govern the new design. This English
  specification records them for planning; user-facing interface text remains Taiwan Traditional
  Chinese and follows the established localization model.
- The 19-frame design is a reference snapshot, not 19 mandatory navigation steps. Phone dimensions
  illustrate layout intent; narrower supported screens may reflow while preserving touch spacing.
- Single watermark placement defaults to bottom-right, with four corners and center available.
  Random text repetition defaults to medium density and provides low/medium/high choices with
  monotonically increasing copy counts for the same image/content. Counts and maximum safe text
  sizes will be set against representative photo sizes during planning.
- A repeated arrangement remains stable unless its content, density, mode-specific layout, or photo
  changes. Templates save repeat preferences; drafts save the resulting per-photo arrangement.
  An explicit reshuffle control is not required for this feature.
- The picker and background-opacity row edit one alpha value. RGBA uses RGB integers 0–255 and
  fractional alpha 0–1; the separate A channel displays percent. No additional color-space support
  is required.
- Existing supported metadata-preserving export remains the default. Visible annotation coordinates
  and capture metadata are separate; the redesign does not add automatic metadata replacement.
- The standard map keeps the baseline default. Available licensed satellite/terrain sources and
  any additional disclosure needs are planning dependencies; failed availability must be resolved
  or explicitly presented, never disguised by an unrelated layer. Place/coordinate search retains
  manual coordinate entry; external place-name lookup is not required until its privacy boundary
  and provider are explicitly approved in planning.
- Saved defaults/templates remain local to the same device and application origin. Storage clearing
  can remove them; cloud backup, synchronization, and template import/export are outside this scope.
- Date strings in Figma are examples rather than automatic date tokens. Watermark opacity is
  separate from text-box alpha, and photo examples are not evidence of their displayed coordinates.
- Implementation planning must define new-version persistence, atomic saves and map-service
  boundaries, and update the English ADR/UI guidance. The user explicitly waived backward
  compatibility on 2026-09-05; the new version starts with fresh local settings and consent.

## 2026-09-05 follow-up amendment

The user's subsequent pwa_map request supersedes the original three-NLSC-basemap contract:
use OpenStreetMap by default, NLSC EMAP5 and four Google basemaps, with an independent Google
road overlay and center-anchored zoom. Consent policy 3 covers these providers. See
`docs/ui/redesigned-photo-editor.md` and ADR 0002 for the current behavior and validation.
Real EXIF photo orientation must be applied exactly once in previews and exported copies;
metadata-preserving output must retain the corresponding raw pixel orientation.

## Template content follow-up (2026-09-05)

The template editor must support saving and updating explicit four-corner default text and
watermark settings. Applying explicit defaults replaces corner text while preserving the photo
coordinate. New photos use the selected default template content. Text watermarks support single
position or random repetition; PNG watermarks retain single-position behavior. This supersedes
the previous exclusion of corner text from reusable templates.

Template editing follows Figma frame 121:288: a right-side Edit button beside the selected
preset opens an independent editor; corner defaults and watermarks are focused subviews with
Done/Cancel checkpoints. Save returns to selection and Cancel discards unsaved preset changes.
