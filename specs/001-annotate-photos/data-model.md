# Data Model: Offline Photo Annotation

## Modeling rules

- IDs are opaque UUID strings generated locally.
- Persisted records carry both `schemaVersion` and `revision`; migrations are additive and commit
  atomically before older data is removed.
- WGS84 latitude/longitude is the only canonical coordinate. Other formats are inputs or derived
  display values.
- Overlay geometry is normalized against the display-oriented image, in the closed range `[0, 1]`.
- Source Blobs and their immutable identities are never overwritten. Preview and output Blobs are
  derived and are not required for draft restoration.
- Timestamps are ISO 8601 UTC strings. User-facing formatting is localized separately.

## Entity relationships

```text
EditingSession 1 ── 1..20 SourcePhoto
SourcePhoto    1 ── 0..1 CoordinateRecord
SourcePhoto    1 ── 0..* TextOverlay
SourcePhoto    1 ── 1 ExportConfiguration
SourcePhoto    1 ── 0..1 ExportResult
ApplicationOrigin 1 ── 0..1 MapNetworkConsent
EditingSession 0 ── 0..1 MapPreviewState
```

Shared batch settings are templates copied into each photo's independently reviewable state. They
do not replace per-photo coordinates, validation, or export results.

## EditingSession

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID | Immutable primary key |
| `schemaVersion` | positive integer | Supported by an additive migration path |
| `revision` | non-negative integer | Increments after each committed interaction |
| `status` | enum | `creating`, `editing`, `reviewing`, `exporting`, `partiallyExported`, `completed`, `discarded`, `storageError` |
| `photoIds` | ordered UUID array | 1–20 unique IDs |
| `activePhotoId` | UUID | Must belong to `photoIds` |
| `sharedOverlayTemplate` | overlay template or null | New/common settings only; applying it creates per-photo values |
| `sharedDisplayFormat` | coordinate display selection or null | Does not alter canonical WGS84 or provenance |
| `createdAt`, `updatedAt` | timestamp | `updatedAt >= createdAt` |
| `lastPersistedRevision` | integer | “Saved locally” is shown only when equal to `revision` |
| `persistenceStatus` | enum | `unknown`, `bestEffort`, `persistent`, `denied`, `quotaExceeded` |

### State transitions

```text
creating -> editing -> reviewing -> exporting
editing/reviewing/exporting -> storageError -> editing
exporting -> partiallyExported -> reviewing/exporting
exporting -> completed
creating/editing/reviewing/partiallyExported -> discarded
```

`completed` requires successful handoff for every non-omitted photo. `discarded` requires explicit
confirmation. Both remove the restorable draft transactionally; failures leave it recoverable.

## SourcePhoto

| Field | Type | Rules |
|-------|------|-------|
| `id`, `sessionId` | UUID | Immutable; session must exist |
| `sourceBlob` | Blob | JPEG or PNG; immutable |
| `sourceName` | string | Display only; never treated as a path |
| `sourceMime` | enum | `image/jpeg` or `image/png`, verified from content |
| `sourceBytes` | integer | `1..33554432` |
| `sourceDigest` | SHA-256 string | Used to prove source immutability |
| `rawWidth`, `rawHeight` | integer | Positive; each ≤8192; product ≤13,000,000 |
| `displayWidth`, `displayHeight` | integer | Derived from raw dimensions and orientation |
| `orientation` | integer | EXIF 1–8; defaults to 1 only when absent, not malformed |
| `metadataSummary` | MetadataSummary | Presence and preservation eligibility, not arbitrary parsed data |
| `coordinateId` | UUID or null | Missing/invalid GPS creates no accepted record |
| `overlayIds` | ordered UUID array | Determines paint order |
| `reviewStatus` | enum | `importing`, `ready`, `missingCoordinate`, `invalid`, `omitted`, `exported`, `failed` |
| `failureCode` | string or null | Stable non-sensitive code; no photo content/path/coordinate |

Duplicate source digests MAY coexist and MUST be shown as distinct items. A corrupt, unsupported, or
over-limit input gets an explicit import result but is not decoded or stored as an editable photo.

## MetadataSummary

| Field | Type | Rules |
|-------|------|-------|
| `captureGps` | WGS84 or null | Read-only source value; zero/out-of-range/malformed is invalid |
| `orientationPresent` | boolean | Distinguishes absent from normalized default |
| `groups` | set | JPEG: EXIF/XMP/IPTC/JFIF; PNG: eXIf/text/pHYs |
| `preservationEligibility` | enum | `supported`, `unsupportedForFormatChange`, `malformed`, `none` |
| `excludedGroups` | set | ICC, MPF, thumbnail, unknown segments, or invalid structures |

The original metadata bytes are read only through bounds-checked adapters. Changing a working
coordinate never changes `captureGps` or metadata bytes.

## CoordinateRecord

| Field | Type | Rules |
|-------|------|-------|
| `id`, `photoId` | UUID | One accepted working coordinate per photo |
| `latitude`, `longitude` | finite number | WGS84: latitude `[-90, 90]`, longitude `[-180, 180]` |
| `provenance` | enum | `CAPTURE_METADATA`, `CURRENT_GPS`, `MANUAL_INPUT`; immutable until coordinate replacement |
| `inputFormat` | enum | `WGS84_DD`, `WGS84_DMS`, `TWD97_TM2`, `TWD67_TM2`, `MGRS`, `TAIPOWER`, or `DEVICE_WGS84` |
| `displayFormat` | same display enum | Derived output selection |
| `zone` | `119`, `121`, or null | Required/surfaced for applicable TM2 output |
| `zoneAutoResolved` | boolean | Must be visible before export when true |
| `precision` | integer or null | MGRS 1–5 or format-specific supported precision |
| `accuracyMeters` | non-negative number or null | Required for accepted `CURRENT_GPS` |
| `acquiredAt` | timestamp or null | Required for accepted `CURRENT_GPS` |
| `coverageStatus` | enum | `available`, `outOfCoverage`, `unsupportedPrecision` |
| `validationStatus` | enum | `valid`, `malformed`, `outOfRange`, `outOfCoverage`, `ambiguous` |

Only `valid` records become working coordinates. Failed input returns a typed result and preserves the
previous accepted record. MGRS inverse uses the southwest cell corner, and the UI must describe that
precision semantics where relevant.

## TextOverlay

| Field | Type | Rules |
|-------|------|-------|
| `id`, `photoId` | UUID | Immutable identity |
| `role` | enum | `title`, `team`, `coordinate`, `freeform` |
| `content` | Unicode string | May be empty during editing; must fit renderer limits before export |
| `x`, `y`, `width`, `height` | number | Normalized `[0, 1]`; clamped fully inside image for export |
| `fontFamily` | bundled-font ID | No remote font |
| `fontSize` | normalized number | Positive and bounded by documented editor controls |
| `textColor`, `backgroundColor` | RGBA | Same value drives preview and export |
| `padding`, `lineHeight` | normalized number | Non-negative, bounded |
| `order` | non-negative integer | Unique within a photo |
| `contrastStatus` | enum | `acceptable`, `warning`; warning does not silently change colors |

Direct manipulation, numeric fields, step buttons, and keyboard movement all update the same record.
Default movement is 1% and accelerated movement is 5%; every path clamps to image bounds.

## ExportConfiguration

| Field | Type | Rules |
|-------|------|-------|
| `photoId` | UUID | One per editable photo |
| `format` | enum | `image/jpeg` or `image/png` |
| `width`, `height` | integer | Same-format preservation defaults to `rawWidth`/`rawHeight`; normalized output defaults to `displayWidth`/`displayHeight`; user changes retain the applicable aspect ratio |
| `quality` | number or null | JPEG `(0,1]`, default `0.92`; null for PNG |
| `metadataMode` | enum | `preserveSupported` default or `removeSupported` |
| `orientationMode` | enum | `preserveRaw` only for same-format metadata preservation; otherwise `bakeUpright` |
| `fallback` | object or null | Required format/metadata/save fallback and user acknowledgement |
| `outputName` | string | Conflict-safe; never equals an instruction to overwrite the source |
| `saveMethod` | enum | `filePicker`, `download`, `webShare` selected by capability and user action |

Format changes set `metadataMode=preserveSupported` to a blocked review state until unsupported
metadata loss and upright-pixel normalization are disclosed and acknowledged or the user selects
removal. `preserveRaw` inverse-maps display-oriented overlay geometry onto the raw canvas and retains
the source orientation; `bakeUpright` writes upright pixels and sets or omits orientation as 1.

## ExportResult

| Field | Type | Rules |
|-------|------|-------|
| `photoId` | UUID | References one source |
| `status` | enum | `pending`, `rendering`, `handedOff`, `omitted`, `cancelled`, `failed` |
| `outputName` | string or null | Present after render |
| `outputMime`, `outputBytes` | value or null | Verified encoder result |
| `saveMethod` | enum or null | Actual handoff used |
| `failureCode` | string or null | Actionable and non-sensitive |
| `startedAt`, `finishedAt` | timestamp or null | Supports focused measurements |
| `phaseDurationsMs` | object | Decode, render, encode, metadata attachment, and handoff only |

`handedOff` means the app handed the Blob to the browser/OS; it does not claim a browser download was
written to a particular path. A partial failure retains all results and draft data needed for retry.

## MapNetworkConsent

This preference is origin-local application state and MUST NOT be stored inside a photo or draft.

| Field | Type | Rules |
|-------|------|-------|
| `policyVersion` | positive integer | A changed disclosure requires renewed consent |
| `status` | enum | `unknown`, `granted`, `revoked` |
| `providerId` | literal | `nlsc-emap5` only |
| `grantedAt` | timestamp or null | Present only after explicit opt-in |
| `revokedAt` | timestamp or null | Present after revocation |

Consent survives reopen on the same device/application origin until revoked or invalidated by a new
policy version. It stores no photo, coordinate, or annotation value.

## MapPreviewState

Map state is ephemeral and MUST NOT become the canonical coordinate or a restorable browsing session.

| Field | Type | Rules |
|-------|------|-------|
| `status` | enum | `closed`, `consentRequired`, `loading`, `open`, `offline`, `providerError` |
| `photoId` | UUID or null | Active photo whose accepted coordinate is copied for display |
| `center` | WGS84 or null | Read-only copy; changes to pan/zoom are not persisted to `CoordinateRecord` |
| `onlineIndicatorVisible` | boolean | Must be true for the complete mounted lifetime |
| `providerId` | literal or null | `nlsc-emap5` when loading/open |

Closing or revoking destroys the mounted map. Decline, offline state, or provider failure changes no
photo/editor/export state and leaves the core workflow usable.
