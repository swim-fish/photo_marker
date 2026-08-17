# Feature Specification: Offline Photo Annotation

**Feature Branch**: `N/A (no before_specify hook configured)`

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "Create an offline installable Photo Marker application for mobile and
desktop. Users import or share photos, use embedded GPS or manual coordinates, add a title and other
configurable text boxes, preview the result, and save a new annotated image without changing the
original. Coordinate conversion behavior should be consistent with the pwa_map reference project."

## Clarifications

### Session 2026-08-16

- Q: Which coordinate formats should manual coordinate entry accept? → A: All supported formats:
  WGS84 DD/DMS, TWD97, TWD67, MGRS, and Taipower.
- Q: What should the default source-metadata behavior be when exporting an annotated photo? → A:
  Preserve all supported source metadata by default and allow the user to remove it.
- Q: What should happen to an unexported editing session after reload or reopening the app? → A:
  Automatically save a local draft, restore it, and retain it until successful export or explicit
  discard.
- Q: How should the default export format, dimensions, and quality be selected? → A: Preserve the
  source format and pixel dimensions when supported, with user-adjustable format or quality.
- Q: Should a user be able to select the device's current location when EXIF GPS is unavailable? →
  A: Yes, only after explicit user action, with provenance permanently labeled `CURRENT GPS`.
- Q: How should export handle pixel dimensions and EXIF orientation? → A: For same-format export
  with metadata preservation, retain the source's raw encoded dimensions and orientation metadata
  and map overlays into the raw pixel orientation; when changing format or removing metadata, bake
  orientation into the pixels and disclose any dimension or orientation normalization.
- Q: What happens if Android Web Share Target fails physical-device zero-egress validation? → A:
  Block the Android supported release until the failure is corrected, or formally revise the
  supported-platform matrix; in-app file selection alone does not satisfy installed-app sharing.
- Q: Does the no-transmission requirement include network activity performed internally by the
  browser or operating-system location provider? → A: It applies to application-controlled traffic:
  Photo Marker must not transmit user content or accepted location results, while platform location
  services may use implementation-specific network signals outside the application's control and
  verification boundary.
- Q: Should the first release include a geographic map preview? → A: Yes, as an explicit opt-in
  online feature using NLSC `EMAP5` as the default basemap. It is not part of the core offline
  workflow, must make no tile request before disclosure and consent, and must leave editing usable
  when declined, offline, or unavailable.
- Q: How long should online map-preview consent remain valid? → A: Persist it locally for the same
  device and application origin until the user revokes it; show an online indicator whenever the map
  is open, and require new consent after revocation.

### Session 2026-08-17

- Q: How should the editing workspace avoid becoming a long scrolling page? → A: Use a four-step
  `Photo` → `Coordinate` → `Text` → `Export` application flow with Previous/Next navigation and only
  the active step page visible.
- Q: How should coordinate and text overlays be placed? → A: Coordinate formats may be selected
  singly or multiply; coordinate and text groups independently choose one of four corners, and items
  in the same corner are packed from the outside edge inward.
- Q: What should happen when a placement or manual adjustment would overlap another text box? → A:
  Keep the previous valid geometry and show an actionable message; drag remains an optional fine
  adjustment rather than the primary placement method.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Annotate and Export One Photo (Priority: P1)

A user imports a photo, confirms its embedded capture coordinate or enters a coordinate manually,
adds a title and other text boxes, positions and styles those overlays, previews the result, and
saves an annotated copy while retaining the original photo unchanged.

**Why this priority**: This is the smallest complete workflow that delivers the product's primary
value: turning an existing photo into a clearly identified, location-marked output.

**Independent Test**: Import one supported photo, add one coordinate overlay and one custom text
overlay, export the result, and verify that the output matches the preview and the source file is
unchanged.

**Acceptance Scenarios**:

1. **Given** a supported photo containing valid embedded GPS data, **When** the user imports it,
   **Then** the application presents that coordinate as the default candidate and identifies its
   source as capture metadata.
2. **Given** a photo without valid embedded GPS data, **When** the user imports it, **Then** the
   application reports that no capture coordinate is available and offers manual entry or an
   explicit action to use the device's current location without assigning either automatically.
3. **Given** the user explicitly chooses the device's current location and grants permission,
   **When** a valid location is obtained, **Then** the application uses it as the working coordinate
   and identifies its provenance as `CURRENT GPS`, never as capture metadata.
4. **Given** a valid coordinate and one or more configured text boxes, **When** the user previews the
   photo, **Then** every visible overlay reflects the selected content, size, position, text color,
   and background color.
5. **Given** a completed preview, **When** the user exports the photo, **Then** a separate annotated
   image is saved and the original photo remains byte-for-byte unchanged.
6. **Given** the user cancels before confirming export, **When** the editing session closes, **Then**
   no output is created and the original remains unchanged.
7. **Given** the user has not changed the metadata option, **When** the user exports the photo,
   **Then** supported source metadata is preserved without changing its values; selecting metadata
   removal excludes it from the new output.
8. **Given** the source format is supported for export, **When** the user keeps the default export
   settings and preserves metadata, **Then** the new image uses the source format, raw encoded pixel
   dimensions, and source orientation metadata without unexpected rotation; changing format or
   removing metadata may normalize orientation and dimensions only after disclosure, and the user
   may choose a different supported format or quality before confirming export.
9. **Given** a photo is imported, **When** the user edits it, **Then** only one of the four named
   application steps is visible and Previous/Next remains available without document-length
   scrolling through the other steps.
10. **Given** several coordinate formats or text items use one corner, **When** an item is added or
    the corner changes, **Then** items are placed from the outer edge inward with no overlap.
11. **Given** a drag, keyboard move, numeric edit, or resize would overlap another text box, **When**
    the user completes the action, **Then** the previous geometry is retained and the app explains
    how to choose another corner or remove an item.

---

### User Story 2 - Select Trustworthy Coordinate Formats (Priority: P2)

A user chooses how the selected location is shown on the photo. The application can present common
global and Taiwan-specific coordinate formats while retaining whether the underlying location came
from photo metadata or manual entry.

**Why this priority**: Field photos are useful only when their displayed location is understandable,
accurate, and not confused with the location where the photo was processed.

**Independent Test**: Use approved reference coordinates to select each supported display format,
compare the displayed value with its reference vector, and verify that the coordinate source remains
visible throughout editing and export.

**Acceptance Scenarios**:

1. **Given** a valid WGS84 coordinate, **When** the user selects WGS84 decimal degrees, WGS84
   degrees-minutes-seconds, TWD97 TM2, TWD67 TM2, MGRS, or Taipower format, **Then** the application
   displays the corresponding converted value with the selected precision and required zone label.
2. **Given** a TWD97 coordinate whose zone is not explicitly supplied, **When** the application can
   resolve zone 119 or 121, **Then** it identifies the selected zone instead of silently hiding the
   decision.
3. **Given** a location outside a supported Taipower or Taiwan-specific coverage area, **When** the
   user selects that format, **Then** the application reports that the format is unavailable for the
   location and preserves the valid underlying WGS84 coordinate.
4. **Given** a manually entered coordinate, **When** the user exports the photo, **Then** the visible
   coordinate is identified as manual and is not represented as the photo's original capture GPS.
5. **Given** a valid manual coordinate in any supported coordinate format, **When** the user submits
   it, **Then** the application accepts it, identifies the entered format, and normalizes it to the
   canonical working location without losing source provenance.
6. **Given** a valid working coordinate, **When** the user explicitly opens the online map preview
   and accepts its network disclosure, **Then** the application centers the default NLSC `EMAP5`
   basemap on that coordinate without changing the coordinate or its provenance.
7. **Given** the user declines online map access, the device is offline, or the map service is
   unavailable, **When** the user returns to coordinate editing, **Then** the valid coordinate and
   every non-map workflow remain available without a fabricated map result.
8. **Given** the user previously consented on the same device and application origin, **When** the
   user opens map preview again, **Then** the application may load `EMAP5` without repeating the
   disclosure, shows a persistent online indicator while the map is open, and provides a way to
   revoke consent; after revocation, no new map request occurs until consent is granted again.

---

### User Story 3 - Work Offline on Mobile and Desktop (Priority: P2)

A user installs or opens the application on a supported phone or computer and completes the core
photo-marking workflow without a network connection after offline readiness has been established.
The same task remains understandable with touch, mouse, or keyboard input.

**Why this priority**: The intended field workflow may occur where connectivity is unavailable, and
users need consistent access from both mobile and desktop devices.

**Independent Test**: Establish offline readiness on one supported mobile environment and one
supported desktop environment, disconnect the network, then import, annotate, preview, and export a
photo successfully on each environment.

**Acceptance Scenarios**:

1. **Given** the application has confirmed offline readiness, **When** network access is removed,
   **Then** photo import, coordinate selection, annotation, preview, and export continue to work.
2. **Given** the application has not yet established offline readiness, **When** the user attempts to
   work offline, **Then** the application explains the limitation without losing selected photos or
   claiming that offline use is ready.
3. **Given** a narrow touch screen or a desktop window, **When** the user performs the primary
   workflow, **Then** required controls remain visible, operable, and free from blocking overlap.
4. **Given** a supported platform that cannot receive photos from its system share surface, **When**
   the user opens the application, **Then** the user can import the same photos through the in-app
   selection flow.
5. **Given** an unexported editing session, **When** the application reloads or is reopened on the
   same device, **Then** the application restores the locally saved draft.
6. **Given** an active or restored draft, **When** export succeeds or the user explicitly discards
   it, **Then** the draft is no longer available for restoration.
7. **Given** Android Chrome is classified as a supported installed-PWA environment, **When** the
   release is validated, **Then** Web Share Target accepts one or more photos through the common
   import workflow with zero application-controlled network egress; a failed gate blocks that
   supported release or requires an approved supported-matrix revision.

---

### User Story 4 - Annotate Multiple Photos Efficiently (Priority: P3)

A user selects multiple photos, applies common title, team, coordinate-format, and text-style
settings, reviews per-photo coordinates, and exports a separate annotated copy for every successful
item.

**Why this priority**: Batch processing reduces repetitive field-work effort but builds on the
single-photo workflow and can be delivered after that workflow is reliable.

**Independent Test**: Import a mixed batch containing photos with GPS, photos without GPS, and one
invalid file; configure shared overlays, resolve each photo requiring manual input, export the batch,
and verify an explicit result for every item.

**Acceptance Scenarios**:

1. **Given** multiple valid photos, **When** the user applies common overlay settings, **Then** those
   settings are applied consistently while each photo retains its own coordinate record.
2. **Given** some photos lack GPS, **When** the user reviews the batch, **Then** each affected photo is
   clearly identified and may receive its own manual coordinate before export.
3. **Given** one item fails to decode or export, **When** batch processing finishes, **Then** other
   valid items remain available and the result identifies each success and failure without modifying
   any original.
4. **Given** an unresolved photo in the batch, **When** the user starts export, **Then** the application
   requires the user to resolve, explicitly omit, or export that item without a coordinate rather
   than silently assigning a location.

### Edge Cases

- A photo contains missing, malformed, out-of-range, or zero-valued GPS metadata.
- Device-location permission is denied, the position is unavailable, or the reported accuracy is
  insufficient for the user to accept it.
- A photo's orientation metadata differs from its stored pixel orientation, including values that
  swap the displayed width and height relative to the raw encoded dimensions.
- A manual coordinate is incomplete, outside valid latitude or longitude bounds, ambiguous between
  TM2 zones, or incompatible with the selected coordinate format.
- A Taipower coordinate falls in an unsupported letter cell or outer-island coverage area.
- A photo is corrupt, password-protected, empty, too large for the supported limit, or uses an
  unsupported format.
- User text is empty, contains long unbroken content, multiple lines, emoji, or Taiwan Traditional
  Chinese characters.
- A text box is moved partly outside the image, overlaps another box, or becomes unreadable against
  the selected background.
- The user rotates the device or resizes the desktop window while editing.
- The output name already exists, storage permission is denied, available storage is insufficient,
  or the save operation is canceled.
- Connectivity disappears before offline readiness is established or while no remote transmission
  should be occurring.
- The user opens online map preview while offline, declines its disclosure, or the NLSC `EMAP5`
  service is unavailable, slow, rate-limited, or returns an error.
- The user revokes saved map-network consent while a preview is open or before reopening it.
- Web Share Target interception is unavailable, forwards a request, or otherwise fails its
  physical-device zero-egress release gate.
- A batch contains duplicate photos, mixed dimensions and orientations, or a partial export failure.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product MUST provide an installable application experience on at least one
  supported mobile environment and one supported desktop environment.
- **FR-002**: The supported browser and operating-system matrix, supported photo formats, maximum
  source dimensions, and batch-size limit MUST be documented before implementation planning is
  approved.
- **FR-003**: After offline readiness is confirmed, the application MUST perform photo import,
  coordinate handling, annotation, preview, and export without network access.
- **FR-004**: The application MUST process photo pixels, metadata, coordinates, and annotation
  content locally and MUST NOT place them in any application-controlled network request as part of
  the core workflow. Browser or operating-system services may use implementation-specific network
  signals to obtain an explicitly requested device location, but the application MUST NOT transmit
  the accepted location result and MUST disclose that platform activity is outside its control and
  verification boundary. The separately initiated online map preview is outside the core workflow
  and may request map tiles only after the disclosure and consent required by FR-030.
- **FR-005**: Users MUST be able to select one or more supported photos from within the application.
- **FR-006**: On supported platforms that expose an installed-app share flow, users MUST be able to
  send one or more photos into the same import workflow; in-app selection MUST remain available as a
  fallback but MUST NOT substitute for installed-app sharing when classifying such a platform as
  supported. Android Chrome support MUST be release-blocked unless physical-device validation proves
  that Web Share Target handles one and multiple photos without application-controlled network
  egress; alternatively, the supported-platform matrix MUST be revised through an approved
  specification change.
- **FR-007**: The application MUST preserve each source photo without modification and MUST create a
  separate output for every completed export.
- **FR-008**: The application MUST interpret photo orientation consistently so preview and export do
  not unexpectedly rotate or mirror the image. Same-format export with metadata preservation MUST
  retain the source's raw encoded dimensions and orientation metadata while mapping annotations into
  the raw pixel orientation; a format change or metadata removal MUST bake orientation into the
  output pixels and disclose any resulting dimension or orientation normalization.
- **FR-009**: The application MUST read valid embedded capture GPS when present and MUST distinguish
  it from current-device and manually entered coordinates.
- **FR-010**: Users MUST be able to enter or replace a photo's working coordinate manually using
  WGS84 decimal degrees, WGS84 degrees-minutes-seconds, TWD97 TM2, TWD67 TM2, MGRS, or supported
  Taipower input, subject to each format's zone, precision, and coverage validation.
- **FR-011**: The application MUST allow the user to request the processing device's current location
  through an explicit action, MUST obtain permission before access, MUST label an accepted result as
  `CURRENT GPS`, and MUST NOT request or assign it automatically when capture GPS is missing or
  invalid.
- **FR-012**: The application MUST retain coordinate provenance throughout the editing session and
  MUST label visible or exported coordinates as capture metadata, `CURRENT GPS`, or manual input as
  applicable.
- **FR-013**: The application MUST support display of WGS84 decimal degrees, WGS84
  degrees-minutes-seconds, TWD97 TM2 zones 119 and 121, TWD67 TM2 zone 121, MGRS precision levels 1
  through 5, and supported mainland Taipower formats.
- **FR-014**: Coordinate conversions MUST match the approved reference vectors within each vector's
  declared tolerance and MUST return an explicit unavailable or out-of-coverage result instead of a
  fabricated coordinate.
- **FR-015**: When the application resolves an ambiguous TM2 zone, it MUST display the resolved zone
  to the user before export.
- **FR-016**: Users MUST be able to add one or more text overlays, including a title, a team label, a
  coordinate label, and free-form text.
- **FR-017**: For each text overlay, users MUST be able to edit its content, position, size, text
  color, and background color, and MUST be able to remove the overlay.
- **FR-018**: The application MUST keep required overlay controls usable with touch, mouse, and
  keyboard input on supported mobile and desktop viewport sizes.
- **FR-019**: The application MUST provide a preview that represents the exported image's crop,
  orientation, overlay content, relative position, color, and size.
- **FR-020**: Export MUST preserve all supported source metadata by default, including source
  orientation for same-format metadata-preserving output, and MUST allow users to remove supported
  metadata before export; changing the visible coordinate MUST NOT silently rewrite capture GPS
  metadata.
- **FR-021**: Export MUST use a conflict-safe output name or obtain explicit confirmation before
  replacing an existing output file.
- **FR-022**: Batch editing MUST allow shared overlay settings while retaining independently
  reviewable coordinate provenance and validation status for each photo.
- **FR-023**: A partial batch failure MUST NOT discard successful outputs or prevent the user from
  identifying and retrying failed items.
- **FR-024**: The application MUST define and present distinct loading, empty, invalid-coordinate,
  unsupported-format, offline-not-ready, export-failure, disabled, and success states.
- **FR-025**: The primary workflow MUST remain operable without color-only cues and MUST provide
  accessible names, focus order, and visible focus state for interactive controls.
- **FR-026**: User-entered annotation text MUST preserve Unicode content in preview and export.
- **FR-027**: Closing or canceling an unfinished session MUST NOT modify source photos or create an
  output without explicit export confirmation.
- **FR-028**: The application MUST automatically save each unexported editing session as a local-only
  draft, MUST restore it after reload or reopening on the same device, and MUST remove the draft
  after successful export or explicit user discard.
- **FR-029**: Export MUST preserve the source photo's format and raw encoded pixel dimensions by
  default when that format and metadata preservation are supported, MUST allow the user to select
  another supported format or quality, and MUST disclose any required format, dimension,
  orientation, metadata, or quality fallback before export confirmation.
- **FR-030**: The application MUST offer an optional online map preview for a valid working
  coordinate, MUST use NLSC `EMAP5` as the default basemap, MUST disclose before activation that map
  requests reveal the viewed geographic area and ordinary network information to the map service,
  MUST obtain explicit user consent before the first request, and MUST NOT load map resources during
  startup, import, coordinate entry, draft restoration, or any other non-map workflow.
- **FR-031**: Online map preview MUST NOT change coordinate values or provenance, MUST remain
  non-essential to import, editing, offline use, and export, and MUST return an explicit unavailable
  state without losing work when consent is declined, the device is offline, or the service fails.
- **FR-032**: Map-network consent MUST be stored locally for the same device and application origin,
  MUST remain independent of photo and draft content, MUST be revocable through the interface, and
  MUST be accompanied by a visible online indicator whenever map preview is open. Revocation MUST
  prevent every subsequent map-resource request and MUST require new consent before another preview.
- **FR-033**: The editor MUST use a four-step `Photo`, `Coordinate`, `Text`, and `Export` application
  flow, MUST render only the active step page, and MUST keep Previous/Next navigation available at
  supported mobile, tablet, and desktop viewport sizes without obscuring focused controls.
- **FR-034**: Users MUST be able to show either one coordinate format or multiple supported formats,
  and MUST be able to choose one of four corners independently for coordinate overlays and text
  overlays. Items assigned to the same corner MUST be placed from the outside edge inward.
- **FR-035**: Every overlay addition, format or corner change, drag, keyboard move, numeric position
  edit, and resize MUST preserve non-overlapping geometry. An unavailable placement MUST retain the
  previous valid geometry and expose an actionable, localized status message.

### Key Entities

- **Source Photo**: An immutable user-selected photo, including its file identity, pixel dimensions,
  orientation, supported-format status, and optional source metadata.
- **Editing Session**: The local draft state for one or more source photos, selected settings, review
  status, and unsaved changes; it persists until successful export or explicit discard.
- **Coordinate Record**: The working WGS84 location, its capture-metadata, `CURRENT GPS`, or manual
  provenance, validity, selected display format, precision, applicable zone, and coverage status.
- **Text Overlay**: User-visible annotation content with a semantic role, relative position, size,
  text color, background color, ordering, optional placement corner, optional coordinate format, and
  removal state.
- **Export Configuration**: Output naming, format, pixel dimensions, quality, required fallback, and
  the user's metadata-retention choice.
- **Export Result**: The per-photo success, omission, cancellation, or failure outcome and any saved
  output identity.
- **Map Network Consent**: A local, origin-scoped preference recording whether the user accepted the
  online map disclosure; it contains no photo, coordinate, or annotation content and persists until
  revocation.

### Scope Boundaries

- The feature includes photo selection, supported platform share intake, GPS extraction, explicit
  current-device location selection, manual coordinate entry, coordinate formatting, text
  annotation, photo preview, an explicitly initiated online coordinate map preview, local export,
  and batch status.
- The feature does not include general-purpose map browsing, offline map packages, basemap switching,
  route planning, cloud upload, account sync, collaborative editing, video annotation,
  general-purpose photo filters, or destructive editing.
- Background location access, automatic current-location substitution, and representing processing
  location as capture metadata are excluded from the initial scope.
- Platform-specific native sharing behavior is required only where the supported environment makes
  it available; the in-app import flow is the universal fallback for environments outside that
  capability, but it does not satisfy the Android supported-release Web Share Target gate.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of first-time test participants can import, annotate, preview, and export
  one photo without assistance in under three minutes on both a supported mobile environment and a
  supported desktop environment.
- **SC-002**: After offline readiness is confirmed, 100% of the primary workflow acceptance tests
  pass with network access disabled.
- **SC-003**: For every approved coordinate reference vector, each supported conversion matches the
  vector's declared tolerance and an unsupported coverage case never produces a plausible-looking
  coordinate.
- **SC-004**: In all export and cancellation tests, the source photo remains byte-for-byte unchanged.
- **SC-005**: For supported 12-megapixel JPEG photos on representative supported mobile and desktop
  devices, the first usable preview appears within three seconds and a single confirmed export
  completes within fifteen seconds in at least 95% of focused test runs.
- **SC-006**: Preview-to-export comparison confirms that overlay content, order, color, and relative
  placement remain visually equivalent for 100% of approved layout fixtures.
- **SC-007**: In a batch containing 20 supported photos and one invalid item, every valid item can be
  reviewed and exported, and the invalid item receives an explicit failure result without data loss.
- **SC-008**: All primary workflow controls can be completed using touch and using keyboard-only
  input, with no blocking overlap at the minimum supported mobile and desktop viewport sizes.
- **SC-009**: No application-controlled network request transmits photo, coordinate, metadata, or
  annotation content during the core workflow in offline and connected verification scenarios;
  browser or operating-system location-provider activity and the explicitly consented online map
  preview are outside this assertion.
- **SC-010**: In 100% of approved recovery tests, an unexported local draft is restored after reload
  or reopening, and no restorable draft remains after successful export or explicit discard.
- **SC-011**: In 100% of permission and missing-EXIF scenarios, current-device location is neither
  requested nor assigned without explicit user action, and every accepted result is labeled
  `CURRENT GPS`.
- **SC-012**: In connected and offline verification, the application makes zero map-resource
  requests before explicit map-preview consent; after consent it requests only the documented map
  resources needed for the current preview, and decline, offline use, or service failure leaves the
  working coordinate and every core workflow available. After consent is revoked, zero subsequent
  map-resource requests occur until the user grants consent again.
- **SC-013**: In approved phone, tablet, and desktop fixtures, all four corner choices and at least
  two same-corner items remain inside the image and have zero intersecting overlay rectangles; every
  attempted intersecting manual adjustment retains the prior rectangle.

## Assumptions

- The first release targets personal or field-work use without accounts, cloud storage, or server
  processing.
- The application can verify only its own requests and data flows; it cannot verify whether the
  browser or operating system uses network-derived signals for an explicitly requested location.
- NLSC `EMAP5` availability, access terms, and service limits are external dependencies that MUST be
  confirmed during planning; map preview remains optional and unavailable offline.
- Map-network consent is an origin-scoped local preference rather than draft or photo data and
  persists on the same device until the user revokes it or clears site data.
- JPEG and PNG are the minimum required input and output formats. Additional formats may be added
  only when the supported-platform matrix can decode and export them consistently.
- Source metadata is preserved by default in the exported copy unless the user chooses removal;
  manual visible coordinates do not alter capture GPS metadata.
- Same-format metadata-preserving export retains raw encoded dimensions and source orientation;
  format changes or metadata removal produce visually upright pixels and disclose normalization.
- WGS84 is the canonical working location. Manual inputs in other supported formats are normalized
  to WGS84, and other displayed coordinate formats are derived from that location.
- Coordinate format definitions, tolerances, test vectors, and known limitations are based on the
  MIT-licensed pwa_map reference project's approved coordinate artifacts. Reuse must retain required
  licence and attribution notices.
- TWD67 support is limited to TM2 zone 121. Taipower support is limited to its verified mainland
  coverage; unsupported outer-island regions return an explicit out-of-coverage result.
- Common overlay settings may be applied across a batch, but users remain responsible for reviewing
  each photo whose coordinate is missing, invalid, or manually supplied.
- The supported-platform matrix and representative verification devices will be selected during
  planning. Performance verification will use the focused scenarios in SC-005 and SC-007 rather
  than an exhaustive long-running benchmark suite.
- Android Chrome may be classified as supported only after its Web Share Target zero-egress gate
  passes; failure requires correction or an approved supported-matrix revision before release.
