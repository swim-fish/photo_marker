# Data Model: Redesigned Photo Editor

## Canonical new-version contracts

SourcePhoto remains immutable. CoordinateRecord remains the canonical WGS84 location.
TextOverlay uses normalized geometry, fontSize, padding, order and canonical RGBA objects.
EditingSession commits ordered revisions and immutable source Blobs in the new database.
AnnotationTemplate is the sole reusable editor template model; old batch representations are not read.

## New and extended records

| Record | Fields / relationships | Rules |
| --- | --- | --- |
| EditorViewState | view, returnStack, activePhotoId, pendingSettings, baseRevision | Transient; one active view. Cancel discards pending values. Apply validates then commits once; stale photo/revision cannot receive edits. |
| LocationCandidate | latitude, longitude, source: map/device/manual, accuracyMeters?, acquiredAt?, requestId | Uncommitted. Layer/menu changes cannot write CoordinateRecord. Ignore stale async results after close or photo switch. |
| CoordinateRecord extension | provenance adds MAP_SELECTION; inputFormat remains WGS84_DD for map input | Preserve CURRENT_GPS/CAPTURE_METADATA/MANUAL_INPUT. Accept legitimate (0,0); missing accuracy is null, not invented; nonfinite/negative accuracy is invalid. |
| RgbaColor | red, green, blue integers 0..255; alpha number 0..1 | Persist only validated channel objects; parse UI RGBA notation into this canonical form. UI alpha percent and string fractional alpha represent one value. |
| TextOverlay extension | cornerRadius normalized to shorter image dimension | Default 0 for new overlays. Padding uses existing shorter-dimension normalization; fontSize uses existing display-height normalization. |
| WatermarkConfig | enabled, kind: text/image, text or assetId, opacity, mode, singlePosition, density | Text <=120 Unicode code points; empty means no mark. Image only supports single mode. Positions: four corners/center; density low/medium/high. |
| WatermarkArrangement | photoId, algorithmVersion: 1, configFingerprint, normalized rectangles, seed | Stored in draft; preview and export consume same arrangement. Photo/content/density changes regenerate; unrelated settings do not. |
| AnnotationTemplate | id, version:1, name, textAppearance, coordinateFormat: WGS84/TWD97/MGRS, zone, precision, corner assignments, watermarkConfig, timestamps | No photoId, raw photo bytes, capture metadata, coordinate values, or per-photo arrangement. No old template conversion. Name trimmed, 1..80 code points. |
| EditorPreferences | version:1, defaultTemplateId?, cornerTexts for all four corners | Local/origin scoped, not tied to session cleanup. Defaults only apply during new import; missing template falls back with a notice. |
| WatermarkAsset | id, mime:image/png, blob, sourceBytes, dimensions, digest | Validate PNG; <=2 MiB and <=2048 pixels/axis. Referenced by templates or drafts; never uploaded or stored as object URLs. |
| Draft record, schema:1 | watermarkConfigs[], watermarkArrangements[], selectedTemplateId? plus source/coordinate/overlays/revision | New drafts initialize empty watermark arrays. Restore only records from the new database. |

## Geometry and appearance units

Editor text-size fields display equivalent pixels on a 390-pixel-high reference photo:
normalized fontSize = displayed value / 390. One step changes that displayed value by 1;
validated edit range 8..96. These are reference-display pixels, not source-image pixels.
Radius and padding are edited in equivalent pixels on a 390-pixel shorter-edge reference.
Render transforms remain display-oriented then map through all eight EXIF orientations.

## Watermark placement

Use a versioned seeded jittered-grid layout: low/medium/high request 5/10/20 copies, maximum 20.
Store resolved rectangles, not just a PRNG seed. Each candidate must fit inside safe bounds and avoid
another watermark rectangle; at most 200 placement attempts. If requested count cannot fit, retain
the last applied arrangement and report insufficient space; never silently lower density.
Require at least two copies for repeat. Foreground corner labels render above watermarks and may
cover them; their own collision rules remain unchanged.
PNG assets use the same single-position geometry but never enter random-repeat placement.

## Transactions and persistence

Use one new `photo-marker-v2` IndexedDB database, database version 1 and record schema 1.
Stores: sessions, revisions, photos, sharedIntake, preferences, templates, watermarkAssets.
`database.ts` owns opening/schema creation; all repositories use that shared connection.
Do not read, migrate, write, downgrade or delete `photo-marker-drafts` or older settings storage.
First launch initializes new defaults and requests fresh map consent independently of old storage.
Unknown newer record schemas fail closed without mutation; this is corruption/forward-version safety,
not a promise to support older clients or formats.

Use a single readwrite transaction across every store involved in a logical save. A new PNG and its
referencing draft/template commit atomically. A draft revision N+1 and sessions.latestRevision commit
together; source Blobs must exist before success. No dangling references or partial saved badges.
Perform image decoding, hashing and validation before opening the transaction; await its completion.
Quota/abort failures retain in-memory edits and the previous committed revision.

Template/default updates are atomic. Validate the entire template and assets before applying it;
resolve coordinate content from the active photo and preserve current corner text. Applying a template
creates one revision or leaves the prior revision unchanged. Export/discard clears only the relevant
session data, never preferences/templates/assets. Defer asset garbage collection in this feature.


## Coordinate presentation amendment (2026-09-05)

`AnnotationTemplate.coordinateWrap` is `auto | nowrap`; missing values normalize to
`auto`. Sanitization rejects other values. Drafts and saved templates retain this
presentation preference; canonical WGS84 coordinates and MGRS precision are unchanged.
MGRS always renders as a single line regardless of the stored preference, which remains
available when switching back to WGS84 or TWD97.

Automatic wrapping only splits WGS84 latitude/longitude or TWD97 easting/northing at
component boundaries. Numbers, zone suffixes, and MGRS strings are never split mid-value.
Coordinate-only font reduction and geometry are derived, not written back to the shared
text appearance. A single-line coordinate may use up to 94% of the image width, while
freeform text retains the 44% limit. Placement checks every existing text box, including
opposite corners, with the normal safety gap. An impossible layout is rejected. Restoring
and exporting rebuild layout from canonical settings instead of trusting cached rectangles.
