# Contract: Consent-Gated Online Map Preview

## Scope

The first release provides one optional, contained map preview for an already accepted coordinate.
It uses the NLSC `EMAP5` raster source only. It is not a coordinate editor, general-purpose browser,
offline map, route planner, or basemap selector.

## Consent and lifecycle

1. `Preview on map` MUST show a disclosure before the first provider request. The disclosure names
   NLSC, explains that the viewed area is sent through tile requests, and states that photo,
   annotation, and draft content is not sent.
2. Declining MUST issue no request and MUST leave the core workflow usable.
3. Consent is stored locally for the same device/application origin until revoked or the disclosure
   policy version changes.
4. Leaflet and the source MUST be initialized only after consent and an explicit open action.
5. An online indicator and NLSC attribution MUST remain visible for the complete mounted lifetime.
6. Closing destroys the mounted map. Revocation additionally blocks every subsequent map request
   until the user consents again.

## Provider and network boundary

- Provider ID: `nlsc-emap5`.
- Raster template:
  `https://wmts.nlsc.gov.tw/wmts/EMAP5/default/GoogleMapsCompatible/{z}/{y}/{x}`.
- Tile size: 256 px; supported source zoom range: 0–19.
- Initial zoom: 16, clamped to the source range.
- Only `https://wmts.nlsc.gov.tw` is allowlisted by production CSP for map traffic.
- Leaflet code and styles are bundled locally; no CDN is permitted.
- Lazy Leaflet JavaScript plus CSS MUST total no more than 60 KiB gzip and MUST NOT join the initial
  offline-core startup chunk.
- Tile images use anonymous loading with `referrerPolicy='no-referrer'`, no credentials, and no
  application-defined headers.
- The service worker MUST NOT precache, runtime-cache, retry in background, or persist map tiles.
- The app MUST NOT silently change providers when access, terms, CORS, or availability fails.
- Permanent visible attribution is `Data source: National Land Surveying and Mapping Center (NLSC),
  Taiwan e-Map (contours and house numbers)` with a link to the official service page.
- `EMAP5` is governed by NLSC service terms and MUST NOT be described as the separately licensed
  `EMAP5_OPENDATA` layer. Bulk/programmatic tile download is prohibited.

## State isolation

The preview receives a read-only copy of the accepted WGS84 coordinate. Marker placement, map
pan/zoom, provider response, offline state, and close/revoke actions MUST NOT mutate the canonical
coordinate, its provenance, overlays, drafts, or export configuration. Offline and provider failures
show an actionable unavailable state and preserve editing/export functionality.

## Focused verification

- Assert zero map requests before consent and after decline/revocation.
- Assert requests use only the allowlisted NLSC origin and contain no user-content payload.
- Verify consent persistence and policy-version invalidation.
- Verify online indicator and attribution while mounted.
- Verify offline/provider-error recovery and no tile presence in Cache Storage.
- Verify coordinate/provenance remain byte-equivalent after open, pan/zoom, failure, close, and revoke.
- Confirm NLSC access terms, attribution requirements, endpoint behavior, and browser CORS on the
  release origin before enabling the preview in a supported release.
