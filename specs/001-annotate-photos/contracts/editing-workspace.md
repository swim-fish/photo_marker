# Contract: Adaptive Editing Workspace

## Canonical interaction model

One canonical editor state drives the photo navigator, DOM overlay controls, preview renderer, draft,
export review, and export renderer. Only one photo is active at a time. Every photo exposes a text and
icon status: `Ready`, `Missing coordinate`, `Invalid`, `Exported`, or `Failed`.

Canvas MAY render a preview but MUST NOT be the only way to select, understand, move, resize, edit,
or remove an overlay. The semantic overlay list and inspector are the accessible interaction surface.

## Responsive regions

| Width | Layout |
|-------|--------|
| `<768 CSS px` | Status, horizontal photo strip, preview stage, inspector tabs/non-modal drawer, sticky actions |
| `768–1023 CSS px` | Two-region workspace with navigator/stage and inspector |
| `≥1024 CSS px` | Photo rail, preview stage, persistent inspector |

Functional reflow floor is 320 CSS px. Required fixtures are 320×568, 568×320, 1024×768, and
1280×720 at 400% browser zoom. Only the intrinsically two-dimensional image work surface may scroll
in two directions; surrounding controls reflow without blocking overlap. Input mode is detected
independently from viewport width.

## Screens and states

| Screen/state | Required behavior |
|--------------|-------------------|
| Empty | Import CTA, formats/limits, resume/discard draft when present |
| Importing | `n of total`, current filename, cancel, per-item failures without losing successes |
| Editor | Offline/draft status, photo navigator, stage, Coordinate/Overlays/Export tabs, Review export action and disabled reason |
| Export review | Per-item Ready/Omit/Needs resolution, metadata choice, format fallback, explicit confirmation |
| Export progress/result | Per-photo progress, durable successes/failures, retry failed items |
| Map consent | Provider/network disclosure, explicit accept/decline, no request before acceptance |
| Map preview | EMAP5 attribution, persistent online indicator, close/revoke, offline/provider-error isolation |
| Offline not ready | Persistent explanation and recovery action; no false readiness claim |
| Invalid/unsupported | Field/item error, actionable correction/remove/replace, no color-only cue |
| Disabled | Control remains understandable and has an associated reason |
| Success/error | Live announcement plus persistent reviewable summary; errors identify the affected item |

## Coordinate presentation

The coordinate card always shows provenance text, value, selected format, zone/precision/accuracy as
applicable, and validation status. Fixed provenance labels are `Capture metadata`, `CURRENT GPS`, and
`Manual input`. Auto-resolved TM2 zone is visible before export.

An explicit `Preview on map` action opens the consent state when needed and otherwise opens a
contained preview centered on a read-only copy of the accepted coordinate. Map pan/zoom never updates
the coordinate. Decline, offline state, tile failure, close, or consent revocation leaves coordinate,
overlay, draft, and export state unchanged. The online indicator remains visible for the entire time
the map is mounted, and revocation is reachable from the preview and settings.

## Overlay interaction

- Pointer drag/resize is a convenience, not the sole method.
- Inspector controls provide numeric position/size, move directions, resize/text-size steps, and remove.
- Default movement is 1%; accelerated (`Shift+Arrow`) movement is 5%; all results clamp to image bounds.
- Direct, step-button, and keyboard operations update the same normalized geometry.
- Interactive target design is 44×44 CSS px and must meet WCAG 2.2 AA minimum sizing/spacing.
- Low contrast produces a warning and safe presets; the app does not silently change user colors.
- Pinch/gesture is never the only zoom method, and `touch-action` restrictions are limited to active
  stage handles so browser/page zoom remains available.

## Keyboard, focus, and announcements

- `Tab`/`Shift+Tab` move among regions and controls; arrows operate only within a documented composite
  or the selected overlay. Focus and selection have distinct visible styles.
- Opening a consequential confirmation modal moves and traps focus; Escape closes it and focus returns
  to the invoking control.
- Sticky controls and drawers never fully obscure the focused element; focus is scrolled into view.
- Progress/success uses a polite live region. Immediate actionable failure may use `alert` but does
  not steal focus.
- Native controls are preferred and every field/error/disabled reason has a programmatic relationship.

## Focused validation

Run the single-photo happy path with touch and keyboard-only input; validate pointer, tap-only, and
keyboard overlay manipulation; inspect the four viewport/zoom fixtures; perform one desktop and one
mobile screen-reader smoke path; run a 20-photo navigator/result scenario with one invalid item; and
inspect map consent, open, offline, provider-error, close, and revoke states without coordinate
mutation. Visual inspection is required for preview/export equivalence and all documented states.
