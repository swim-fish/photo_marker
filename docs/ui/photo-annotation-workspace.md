# Photo Annotation Workspace

## Purpose and scope

This document defines the responsive layout, interaction, accessibility, and state behavior for the
offline photo annotation workflow. Mobile and desktop use one adaptive workspace and one canonical
editor state. It covers import, coordinate review, text overlays, draft status, export review, and
per-photo results. It does not define maps, filters, cloud flows, or separate platform-specific UIs.

## Information architecture

The workspace contains these ordered regions:

1. Application status: offline readiness and local-draft persistence.
2. Photo navigator: active photo, position in batch, and per-photo status.
3. Preview stage: oriented image, overlays, and explicit zoom controls.
4. Inspector: Coordinate, Overlays, and Export settings.
5. Primary actions: Review export, Export, Retry, or contextual recovery.

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
spacing requirements. Sticky actions and drawers must not fully obscure the focused control.

## Screen contracts

### Empty workspace

- Show a primary `Import photos` action, JPEG/PNG support, 1–20 limit, and local-only statement.
- When a restorable draft exists, show `Resume draft` as the primary recovery action and a distinct
  destructive `Discard draft` action with confirmation.
- Never present an unexplained empty canvas.

### Import and decode

- Show `n of total`, the current filename, and cancel.
- Keep successful items if one item is unsupported, corrupt, or over limit.
- Associate the failure with the affected item and offer remove/replace.
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
- Enable Export only when each item is resolved or explicitly omitted.
- Use a modal for consequential fallback, overwrite, or discard confirmation. Move focus into it, keep
  focus within it, close with Escape, and return focus to the invoker.

### Export progress and result

- Show per-photo progress and a durable result list.
- Preserve successful results when another photo fails; offer Retry only for failed items.
- Use polite live regions for progress/success. Immediate actionable failure may use `alert` without
  moving focus.
- Describe browser download as “handed to the browser,” not as a confirmed filesystem path.

## State matrix

| State | Visible and programmatic behavior |
|-------|-----------------------------------|
| Loading | Stable layout, busy label, readable progress |
| Empty | Explanation and next action |
| Invalid coordinate | Field error, photo badge, correction guidance; never color-only |
| Unsupported format | Item error plus remove/replace; accepted items remain |
| Offline not ready | Persistent banner and recovery step; no false readiness claim |
| Disabled | Visible control and linked reason; focus is retained when safe |
| Saving locally | Status region announces progress without interrupting input |
| Storage warning/error | Explain best-effort/denied/quota state and whether current memory state remains |
| Success | Live announcement plus persistent summary |
| Error | Affected item, safe error code/message, retry action; no sensitive content in logs |

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

The overlay list is the semantic selection surface. Each row has an accessible name, role/content
summary, selected state, and remove action. The inspector provides content, role, normalized/numeric
position and size, text size, text/background color, ordering, and contrast status.

Pointer drag and resize are accelerators only. Equivalent single-pointer and keyboard controls include:

- Move up/down/left/right buttons.
- Numeric position and size fields.
- Increase/decrease size controls.
- Remove and reorder controls.
- Arrow movement at 1% and `Shift+Arrow` at 5%.

All paths update the same normalized state and clamp overlays inside image bounds. Focus and selection
use distinct indicators visible on light and dark photos. Resize handles may look smaller but retain a
44 px effective hit area. Pinch is not the only zoom method. Limit `touch-action` restrictions to the
actively manipulated stage/handle so page pan and browser zoom remain available.

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

## Focused visual and accessibility validation

- Inspect empty, loading, invalid-coordinate, unsupported-format, offline-not-ready, disabled,
  storage-warning, export-failure, success, and partial-batch states.
- Complete one single-photo path with touch and one with keyboard only.
- Compare pointer drag, tap-only move/resize, and keyboard move/resize output positions.
- Inspect 320×568, 568×320, 1024×768, and 400% zoom for reflow, target size, and focus obstruction.
- Run one desktop browser/screen-reader and one supported mobile browser/screen-reader smoke path for
  names, provenance, errors, progress, and modal focus.
- Compare approved preview/export fixtures including Traditional Chinese, multiline, emoji, overlap,
  colors, orientations, and image edges.
- Run one 20-photo-plus-invalid navigator/export-result scenario. No broad or prolonged performance
  suite is part of UI validation.
