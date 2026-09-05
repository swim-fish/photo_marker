# Editor, Persistence, Rendering, and Map Contracts

## C1. Editor navigation and transactions (US1, US7)

Views: import, editor, coordinate, map, cornerText, templates, templateEdit, textStyle, rgba,
watermark, defaults, exportReview, exportResult. View state is separate from session status.
Opening settings copies current settings with photoId/baseRevision. Preview may use pending values;
Apply validates and commits one revision; Cancel/Back restores applied state. Photo changes invalidate
pending operations. Export consumes applied state only; returning from review restores editing.
Existing session transition restrictions must be extended/tested for reviewing -> editing and canceled
export -> reviewing. Persist only meaningful applied data, not an open settings panel.

New import/share entry points use Workspace without an old-interface adapter. Show source/provenance on overlays even
where Figma examples omit it. Export settings preserve source-format/metadata defaults.
Only completed save or successful download handoff is success; canceled/failed share retains the draft.

## C2. Location and network (US2, US3)

Map adapter emits candidateChanged({latitude,longitude}) after settled movement; it does not call
replaceWorkingCoordinate. Confirm reads the current settled center and emits confirmCandidate.
Disable confirmation during pan animation or while no valid candidate exists. Cancel emits no mutation.
A fixed DOM crosshair is centered inside the actual map viewport, excluding side panels; resizing
recomputes viewport geometry, preserving the geographic candidate. A modal layer sheet overlays the
map without shifting its candidate. Keyboard pan/manual coordinate entry provide drag alternatives.

Layer changes preserve center, zoom and candidate. Registry entries define id, URL template, zoom
range, attribution and error state; no arbitrary URL input. Consent is checked before every mount/layer
change; close/offline/revoke removes layers and ignores late callbacks. No tile caching/prefetch.
Use common zoom 0–18 in both registry and adapter. Allow only
`https://wmts.nlsc.gov.tw/wmts/{EMAP5|PHOTO2|B5000}/default/GoogleMapsCompatible/{z}/{y}/{x}`
tile paths with valid numeric tile coordinates; no host-wide wildcard. Label PHOTO2 as 衛星／正射影像.
Map disclosure covers all three layers. Use policy version 2 at the new
`photo-marker-v2:map-network-consent` key; old consent never authorizes the new version.
Future policy-scope expansion requires fresh consent. Device position is requested once on explicit action and confirmed separately.
A location result without accuracy displays "unavailable"; finite coordinates including (0,0) remain valid.

## C3. RGBA and controls (US4, US7)

Canonical channels follow data-model.md. Input may be temporarily incomplete; parsing/validation
must not coerce blank to zero. All valid controls edit the same pending color; Apply commits.
Never use a parent opacity/globalAlpha that fades foreground text with its background.
The text-box alpha row and picker A field are aliases, not multiplied opacity sources.

Button target >=44x44; minus/plus >=50x50 and edge gap >=24 logical px at every breakpoint.
Use 56x50 buttons in the text-size stepper, 64x50 map buttons on opposite sides; wrap rows at 320
rather than reduce gaps. Native button activation must not be duplicated by custom Enter/Space handlers.
Expose numeric label/value/min/max/step; +/- changes once; limits disable the appropriate action.
Color plane/sliders have accessible numeric equivalents, names and visible focus.

## C4. Watermark render payload (US5)

Extend WorkerRenderOptions and preview/export inputs with validated watermark configuration,
arrangement and required PNG Blob assets. No DOM nodes or object URLs cross the worker boundary.
One shared canvas path paints source -> watermark layer -> foreground overlays. Save/restore alpha
around each layer; radius uses a rounded rectangle path with equivalent fallback where needed.
Use layout.ts orientation transforms for every new rectangle, including raw-orientation metadata
preserving export. Main-thread fallback must produce the same result.
Return explicit invalid-layout/invalid-asset failures; release decoded assets on success/error/cancel.

## C5. Preferences and templates (US3, US6)

Repository operations: loadPreferences, saveCornerDefaults, listTemplates, saveTemplate,
setDefaultTemplate, getAsset, saveAsset. Return existing Result-style typed errors:
validation, quota-exceeded, incompatible-version, storage-error, asset-not-found.
Save completion means transaction commit. No delete UI is required in this feature.
ApplyTemplate(template, activeDraft) preserves active location, provenance, current corner text and
other current draft settings; applies appearance/coordinate representation/corners/watermark atomically.
New import applies preferences once; restoring a draft never reapplies today's defaults.

## C6. Verification surface

Unit: canonical validation, cancellation, stale async results, seed/rectangle stability, template
data isolation, new-database isolation and atomic transaction aborts. Component: selected states, callbacks, labels, 320px layouts and focus.
Integration: draft/asset roundtrip, renderer/orientation, download/share outcomes and no map traffic
without consent. E2E: mocked map layers and location plus offline production build; actual provider
smoke remains explicit, bounded and separate from deterministic CI.
