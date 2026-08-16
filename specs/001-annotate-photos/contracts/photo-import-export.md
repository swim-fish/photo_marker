# Contract: Photo Import, Rendering, Metadata, and Export

## Import contract

Every intake source produces `File` objects for the same validation pipeline.

| Rule | Value |
|------|-------|
| Formats | JPEG and PNG only |
| Count | 1–20 accepted photos per draft |
| Pixel area | ≤13,000,000 pixels |
| Maximum dimension | ≤8192 px |
| Compressed bytes | ≤32 MiB per item |
| Aggregate bytes | ≤`min(640 MiB, 80% of reported storage headroom)` |

Validation checks declared MIME, extension, magic bytes, bounded header lengths, dimensions, and
actual decodability. One invalid item does not discard accepted items. Web Share Target and the file
input use identical validation, persistence, and result types.

## Source safety

- Store and operate on Blob copies/references; never obtain or write through a source file handle.
- Capture a SHA-256 source digest on intake and compare it after export/cancel verification.
- Cancel, close, failure, and retry create no output without explicit export confirmation.
- Duplicate content is allowed as distinct items and is never silently deduplicated.

## Rendering contract

- Preview and export use the same layout/text-measurement rules and bundled fonts.
- Overlay geometry is normalized to the display-oriented image.
- Same-format metadata-preserving output uses the raw encoded dimensions, inverse-maps display
  overlay geometry through EXIF orientation, and retains the source orientation value.
- Format change or supported-metadata removal bakes the display orientation into upright pixels,
  uses display-oriented dimensions, and discloses the normalization before confirmation.
- EXIF orientations 1–8 produce equivalent visible preview/output geometry in both output modes.
- Full-resolution processing concurrency is exactly 1 until a later measured plan changes it.
- The worker path and main-thread fallback return the same typed render result.
- Release decoded/canvas/object-URL resources before advancing to the next full-resolution item.

## Encoder contract

- Default to the source format, raw encoded source dimensions, and preserved source orientation.
- JPEG quality defaults to `0.92` and is user-adjustable; PNG has no lossy quality control.
- Verify the returned Blob MIME type. Any encoder fallback is disclosed before confirmation.
- A changed output dimension retains source aspect ratio.
- A format change or metadata-removal choice switches to upright display dimensions and sets or
  omits orientation as normalized; it MUST NOT retain an orientation tag that would rotate twice.

## Supported metadata profile

| Same-format path | Preserved groups |
|------------------|------------------|
| JPEG→JPEG | EXIF APP1, XMP APP1, IPTC APP13, JFIF density |
| PNG→PNG | `eXIf`, `tEXt`, `zTXt`, `iTXt`, `pHYs` |

ICC profiles, MPF, embedded thumbnails, unknown application segments, invalid offsets, and stale
structural metadata are not supported. Format changes must list metadata loss. Changing the visible
coordinate never changes embedded capture GPS. Selecting removal excludes supported source metadata;
browser-added technical headers may remain.

If preservation cannot be completed safely, the app MUST block that preservation mode and request an
explicit choice to remove supported metadata. It MUST NOT silently strip metadata.

## Output handoff and result semantics

1. Prefer `showSaveFilePicker()` when supported and directly user-activated.
2. Otherwise create a conflict-safe Blob download; Web Share MAY be offered when file sharing is
   capability-tested.
3. Directory picking MAY improve supported batch output. Without it, perform sequential confirmed
   downloads. ZIP is out of scope.
4. `handedOff` means the app gave the output to the browser/OS. It does not claim a download path was
   written or that the browser resolved every filename conflict.
5. Preserve each successful result when another item fails; expose failure code and retry.

## Error codes

Errors use stable codes such as `unsupported-format`, `over-limit`, `malformed-metadata`,
`decode-failed`, `metadata-preservation-unavailable`, `encode-failed`, `save-cancelled`,
`save-failed`, and `quota-exceeded`. Diagnostics MUST NOT include image bytes, sensitive metadata,
coordinates, annotation content, or local paths.
