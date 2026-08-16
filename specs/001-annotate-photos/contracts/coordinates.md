# Contract: Coordinate Input, Display, and Provenance

## Canonical boundary

All accepted locations cross the domain boundary as finite WGS84 latitude/longitude. The converter
MUST return a typed result; it MUST NOT throw for user input or fabricate a plausible coordinate.

```ts
type CoordinateProvenance =
  | "CAPTURE_METADATA"
  | "CURRENT_GPS"
  | "MANUAL_INPUT";

type CoordinateFailure =
  | "malformed"
  | "out-of-range"
  | "out-of-coverage"
  | "unsupported-precision"
  | "ambiguous";

type CoordinateResult =
  | { ok: true; coordinate: CoordinateRecord }
  | { ok: false; reason: CoordinateFailure; field?: string };
```

## Accepted inputs

| Input | Required validation |
|-------|---------------------|
| WGS84 decimal degrees | Latitude/longitude range and finite values |
| WGS84 DMS | Direction, component ranges, and normalized decimal result |
| TWD97 TM2 | Zone 119/121 explicit or auto-resolved and surfaced |
| TWD67 TM2 | Zone 121 four-parameter transform only |
| MGRS | Precision 1–5 and supported latitude coverage |
| Taipower | Verified mainland letter/grid coverage only |

Manual input produces `MANUAL_INPUT`. Valid embedded GPS produces `CAPTURE_METADATA`. Device location
can produce `CURRENT_GPS` only after the explicit action, permission, displayed accuracy, and user
acceptance. Replacing a coordinate creates a new provenance record and never rewrites source GPS.

## Display contract

- Always show provenance as text, not color alone.
- Show the selected format, validation status, and WGS84-derived value.
- Show zone for TWD97/TWD67; show `zoneAutoResolved` before export when applicable.
- Show MGRS/Taipower precision and explicit out-of-coverage results.
- Show accuracy and acquisition time for `CURRENT_GPS`.
- A failed conversion leaves the last valid coordinate unchanged.

## Compatibility and evidence

Vendored conversions MUST retain `pwa_map` MIT attribution and pass the approved vectors and
tolerances, including TWD67 3 m forward/6 m inverse tolerances and Taipower regression cases. Any
change to formulas, supported cells, zone resolution, parser grammar, or public result categories
requires an ADR assessment and updated vectors before implementation.
