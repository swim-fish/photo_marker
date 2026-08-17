# Photo Annotation Workspace

## Purpose and scope

This document defines the responsive layout, interaction, accessibility, and state behavior for the
offline photo annotation workflow. Mobile and desktop use one adaptive workspace and one canonical
editor state. It covers import, coordinate review, text overlays, draft status, export review, and
per-photo results and the contained online map preview. It does not define general-purpose map
browsing, offline maps, filters, cloud flows, or separate platform-specific UIs.

## Information architecture

The workspace contains these ordered regions:

1. Application status: offline readiness and local-draft persistence.
2. Photo navigator: active photo, position in batch, and per-photo status.
3. Preview stage: oriented image, overlays, and explicit zoom controls.
4. Inspector: Coordinate, Overlays, and Export settings.
5. Primary actions: Review export, Export, Retry, or contextual recovery.
6. Optional map preview: consent-gated EMAP5 context for the accepted coordinate.

Only one photo is active at a time. The navigator shows filename, index, and both icon and text status:
`Ready`, `Missing coordinate`, `Invalid`, `Exported`, or `Failed`. Shared batch settings populate
per-photo values; each coordinate provenance and validation result remains independently reviewable.

## Responsive layout

| Viewport | Region arrangement |
|----------|--------------------|
| `<768 CSS px` | Vertical status, horizontal photo strip, preview stage, inspector tabs/non-modal drawer, sticky actions |
| `768–1023 CSS px` | Two regions: navigator/stage plus inspector |
| `≥1024 CSS px` | Three regions: photo rail, preview stage, persistent inspector |

The functional reflow floor is 320 CSS px. Required visual fixtures are 320×568 portrait, 568×320
landscape, 1024×768 desktop, and 1280×720 at 400% browser zoom. Surrounding controls do not create
two-dimensional page scrolling or blocking overlap. The image work surface may pan in two dimensions
when zoom makes that necessary. Pointer capability is detected independently from viewport width.

Interactive targets are designed at 44×44 CSS px and must never fall below WCAG 2.2 AA target-size or
spacing requirements. Only the mobile arrangement uses a sticky primary action; tablet and desktop
actions remain in normal flow. Sticky actions and drawers must not obscure the focused control.

## Screen contracts

### Empty workspace

- Show a primary `Import photos` action, JPEG/PNG support, 1–20 limit, and local-only statement.
- Keep the empty header, status, and import regions content-sized and aligned to the start of the
  workspace instead of stretching them to fill a tall viewport.
- When a restorable draft exists, show `Resume draft` as the primary recovery action and a distinct
  destructive `Discard draft` action with confirmation.
- Never present an unexplained empty canvas.

### Import and decode

- Show `n of total`, the current filename, and cancel.
- State the enforced per-photo limits: JPEG/PNG, 32 MiB compressed, 13 MP, and 8192 px per axis.
- Keep successful items if one item is unsupported, corrupt, or over limit.
- Associate the failure with the affected item and offer remove/replace.
- Present a localized, user-safe failure message; do not expose internal diagnostic codes as the
  visible error text.
- Preserve selected Files if offline readiness is incomplete and explain the missing readiness step.

### Editor

- Header exposes offline readiness and `Saving…`, `Saved locally`, or actionable storage failure.
- Navigator exposes the active photo and every per-photo review state.
- Stage shows an oriented preview and visual overlay selection without becoming the sole control.
- Inspector tabs are `Coordinate`, `Overlays`, and `Export settings`.
- `Review export` remains visible. If disabled, a persistent reason is linked with `aria-describedby`.

### Export review

- List each photo as `Ready`, `Omit`, or `Needs resolution`.
- Show format, dimensions, quality, metadata choice, and any fallback/loss disclosure.
- Same-format preservation is limited to the documented metadata profile. If preservation fails its
  structural checks, keep export blocked until the user explicitly selects metadata removal; never
  silently strip metadata. A rendered output over the 64 MiB allocation ceiling remains blocked and
  is not bypassed by metadata removal.
- Enable Export only when each item is resolved or explicitly omitted.
- Use a modal for consequential fallback, overwrite, or discard confirmation. Move focus into it, keep
  focus within it, close with Escape, and return focus to the invoker.

### Export progress and result

- Show per-photo progress and a durable result list.
- Checkpoint each completed, omitted, or failed item into the local draft before the queue advances,
  so recovery does not repeat an already handed-off item after an interruption.
- Preserve successful results when another photo fails; offer Retry only for failed items.
- Use polite live regions for progress/success. Immediate actionable failure may use `alert` without
  moving focus.
- Describe browser download as “handed to the browser,” not as a confirmed filesystem path.

### Online map consent and preview

- `Preview on map` first presents a disclosure naming NLSC and explaining that tile requests reveal
  the viewed area; it states that photo, annotation, draft, and coordinate values are not sent.
- Accept and Decline are explicit. Decline returns focus to the invoker and leaves editing/export
  usable. Saved consent skips the disclosure only after another explicit open action.
- The contained preview uses EMAP5, an accepted-coordinate marker, zoom controls, Retry, Close, and
  Revoke consent. Pan/zoom never changes the working coordinate or provenance.
- A persistent `Online map` indicator and the linked attribution `Data source: National Land
  Surveying and Mapping Center (NLSC), Taiwan e-Map (contours and house numbers)` remain visible
  while mounted.
- Offline and provider failures show `Map unavailable` with Retry/Close; they never replace the
  editor or disable export. Revocation closes the map and explains that provider logs or browser HTTP
  cache cannot be retroactively removed.

## State matrix

| State | Visible and programmatic behavior |
|-------|-----------------------------------|
| Loading | Stable layout, busy label, readable progress |
| Empty | Explanation and next action |
| Invalid coordinate | Field error, photo badge, correction guidance; never color-only |
| Unsupported format | Item error plus remove/replace; accepted items remain |
| Metadata preservation unavailable | Explain the profile limitation and offer explicit metadata removal; do not silently continue |
| Rendered output over allocation ceiling | Keep export blocked and suggest reducing output size; metadata removal does not bypass the ceiling |
| Offline not ready | Persistent banner and recovery step; no false readiness claim |
| Disabled | Visible control and linked reason; focus is retained when safe |
| Saving locally | Status region announces progress without interrupting input |
| Storage warning/error | Explain best-effort/denied/quota state and whether current memory state remains |
| Success | Live announcement plus persistent summary |
| Error | Affected item, safe error code/message, retry action; no sensitive content in logs |
| Map consent required | Provider/network disclosure with explicit accept/decline |
| Map online | Visible online indicator, attribution, marker, zoom, close, and revoke |
| Map unavailable | Offline/provider reason, Retry/Close, core workflow remains enabled |

## Coordinate interaction

The coordinate card always shows:

- Provenance text: `Capture metadata`, `CURRENT GPS`, or `Manual input`.
- Coordinate value and selected format.
- TWD97/TWD67 zone, including auto-resolved zone disclosure.
- MGRS/Taipower precision and coverage state when applicable.
- Accuracy and acquisition time for `CURRENT GPS`.
- Validation or out-of-coverage status.

Manual entry supports WGS84 DD/DMS, TWD97, TWD67, MGRS, and Taipower. An invalid replacement keeps
the prior accepted coordinate. `Use current location` is a separate explicit action; denial, timeout,
unavailable location, or rejected accuracy leaves the current coordinate untouched and offers manual
entry. The app never presents processing location as capture metadata.

## Overlay interaction

The overlay list remains the semantic selection surface. Each row has an accessible name,
role/content summary, selected state, and remove action. Selecting text on the photo opens a quick
editor directly below the preview. The quick editor exposes the text, text color, background color,
and clearly labelled `A−`/`A+` text-size controls. A tap or click that does not become a drag moves
focus to the text field so editing can begin immediately.

Touch, pen, and mouse users drag selected text directly on the photo. Movement begins only after a
4 CSS px threshold so an ordinary tap remains an edit action. The pointer delta is converted to the
same normalized coordinates used by export, and the result is clamped inside the image. The existing
inspector remains available for precise numeric position and box-size adjustments. Equivalent
keyboard and explicit-button controls include:

- Move up/down/left/right buttons.
- Numeric position and size fields.
- Increase/decrease size controls.
- Remove and reorder controls.
- Arrow movement at 1% and `Shift+Arrow` at 5%.

All paths update the same normalized state and clamp overlays inside image bounds. Focus and selection
use distinct indicators visible on light and dark photos. Overlay selection retains a 44 px effective
hit area without changing normalized output geometry. Direct-drag targets use `touch-action: none`
only within the overlay hit area; page pan and browser zoom remain available elsewhere, and explicit
zoom buttons remain available.

Low text/background contrast shows a warning and offers safe presets. User colors are not silently
changed. Preview and export use the same bundled fonts and renderer geometry; Unicode, Taiwan
Traditional Chinese, multiline text, and emoji remain visible when supported by the bundled font set.

## Keyboard and focus order

`Tab` and `Shift+Tab` move through application status, photo navigator, stage controls, inspector tabs
and fields, then primary actions. Arrow keys move within documented composite widgets or manipulate
the selected overlay; they do not unexpectedly change unrelated fields. Native controls are preferred.

On photo change, keep focus on the invoking navigator item unless an error requires a linked message.
On modal close, return focus to the invoker. On validation failure, keep focus in context and connect
the field to its error. When a drawer or sticky region changes size, scroll the focused element into
view. Status messages do not steal focus.

## Localization and content

UI strings use the project's localization model from the first implementation. Fixed provenance and
status concepts use translation keys; `CURRENT GPS` remains the mandated English provenance token in
stored/exported data and may include a localized explanatory label in the interface. Error messages
state the affected item, cause, and available action without exposing local paths, coordinates, image
content, or metadata in diagnostics.

## Persisted state and recovery

Draft records are versioned and committed transactionally. Batch decisions, invalid intake results,
and partial export results are additive optional fields, so a single-photo draft that lacks them
restores with the original behavior. A draft from a newer unsupported record version remains intact
and is reported as incompatible instead of being rewritten or deleted. Completing export or
confirming discard removes the corresponding session, revision, and source-photo records together.

Application-shell updates do not cache source photos or map tiles. The previous complete shell cache
is kept until the replacement shell is complete, and fetch fallback can serve it if a replacement
cache becomes incomplete; an incomplete current update must not be reported as offline ready. Web
Share Target remains absent from the default release manifest until physical-device zero-egress
validation is complete. When explicitly enabled, shared intake validates count, MIME, byte size, and
magic bytes before local persistence, then startup consumes it through the common import validation.

## Focused visual and accessibility validation

- Inspect empty, loading, invalid-coordinate, unsupported-format, offline-not-ready, disabled,
  storage-warning, export-failure, success, and partial-batch states.
- Complete one single-photo path with touch and one with keyboard only.
- Compare tap/click inspector and keyboard move/resize output positions.
- Inspect 320×568, 568×320, 1024×768, and 400% zoom for reflow, target size, and focus obstruction.
- Run one desktop browser/screen-reader and one supported mobile browser/screen-reader smoke path for
  names, provenance, errors, progress, and modal focus.
- Compare approved preview/export fixtures including Traditional Chinese, multiline, emoji, overlap,
  colors, orientations, and image edges.
- Run one 20-photo-plus-invalid navigator/export-result scenario. No broad or prolonged performance
  suite is part of UI validation.
- Inspect map consent, saved-consent reopen, online indicator, attribution, offline/provider failure,
  Retry/Close, and revocation at the narrow and desktop fixtures; confirm focus return and no
  coordinate/provenance change.
