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
