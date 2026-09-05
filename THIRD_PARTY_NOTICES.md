# Third-party notices

## Noto Sans Traditional Chinese

The application bundles the `Noto Sans TC` Traditional Chinese webfont subset as
`static/fonts/noto-sans-tc-chinese-traditional-400-normal.woff2`.

- Package: `@fontsource/noto-sans-tc` 5.3.0
- License: SIL Open Font License 1.1 (OFL-1.1)
- Source package: https://www.npmjs.com/package/@fontsource/noto-sans-tc/v/5.3.0
- Upstream project: https://github.com/notofonts/noto-cjk
- License text: https://scripts.sil.org/OFL
- Copyright: Copyright 2022 The Noto Project Authors (https://github.com/notofonts/noto-cjk)

Only the Traditional Chinese regular-weight subset is copied into `static/fonts/`; the complete
package remains a development asset source and is not loaded by the application at runtime.

## Photo Marker icons

The SVG icons in `static/icons/` are original project artwork and are distributed with this
repository under the project license.

## Runtime packages

Runtime package notices for `svelte`, `idb`, `exifr`, `leaflet`, `mgrs`, `proj4`, and
`workbox-window` are represented by their package metadata in `package-lock.json`. Before release,
the generated notice report MUST be refreshed when dependency versions change.

### Leaflet 1.9.4

The optional online map preview lazy-loads Leaflet 1.9.4, distributed under the BSD 2-Clause
License.

```text
Copyright (c) 2010-2023, Volodymyr Agafonkin
Copyright (c) 2010-2011, CloudMade
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted
provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions
   and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of
   conditions and the following disclaimer in the documentation and/or other materials provided
   with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

Upstream license: https://github.com/Leaflet/Leaflet/blob/v1.9.4/LICENSE

## NLSC external map services

The optional online preview requests JPEG tiles from the National Land Surveying and Mapping Center
(NLSC) EMAP5, PHOTO2 and B5000 WMTS layers only after explicit user consent. The permanent in-application attribution
is **圖資來源：內政部國土測繪中心 NLSC**.

- Service page: https://maps.nlsc.gov.tw/S09SOA/
- Tile endpoint: `https://wmts.nlsc.gov.tw/wmts/{layer}/default/GoogleMapsCompatible/{z}/{y}/{x}`
- Configured layers: EMAP5 (standard), PHOTO2 (orthophoto imagery), B5000 (terrain); common zoom 0–18.
- Service boundary: EMAP5 is distinct from `EMAP5_OPENDATA`; this project does not claim the latter
  layer's open-data license for EMAP5.
- Usage boundary: the application does not bulk-download, prefetch, or persist map tiles and does
  not add EMAP5 to the service-worker cache.

Use of these layers remains subject to the NLSC service terms in effect when the service is accessed.

## Vendored coordinate core and reference vectors

The UI-independent coordinate conversion modules under `src/domain/coordinates/converters/` are
vendored from the `pwa_map` project and remain under its MIT license.

Copyright (c) 2026 Shihyu.

The MIT permission notice is reproduced here for the vendored source:

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
> associated documentation files (the "Software"), to deal in the Software without restriction,
> including without limitation the rights to use, copy, modify, merge, publish, distribute,
> sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions: the above copyright notice and this
> permission notice shall be included in all copies or substantial portions of the Software.

> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
> NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
> NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
> DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT
> OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

The approved coordinate vectors in `tests/unit/fixtures/test-vectors.json` are copied verbatim from
the reference document **Taiwan Coordinate Systems Reference v2.0.0 (MIT)** — Copyright (c) 2026
TacMap TW contributors — MIT License. Their SHA-256 digest is pinned in
`tests/unit/fixtures/vectors-digest.txt`.
