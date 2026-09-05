# Photo Marker

A mobile-friendly Progressive Web App (PWA) for adding coordinates, text, and
watermarks to photos. Photos and drafts are processed and stored on your device.

**[Open Photo Marker](https://swim-fish.github.io/photo_marker/)** ·
**[Releases](https://github.com/swim-fish/photo_marker/releases)**

## Features

- Import JPEG or PNG photos and read GPS coordinates from photo metadata.
- Choose WGS84, TWD97, or MGRS coordinates; set wrapping and MGRS grid precision.
- Set a location manually, use the device location, or select the map center with
  a crosshair, map layers, and overlays.
- Place text in all four corners with RGBA backgrounds and reusable defaults.
- Add a single watermark or randomly repeated watermarks, then save a template.
- Export annotated photos, recover saved drafts, or discard a draft.
- Install the PWA and edit offline after the app has finished preparing offline
  resources. Online maps require a network connection and consent.

## Quick start

1. Open the app and select a photo.
2. Check its GPS coordinates or choose a location.
3. Apply a template, edit corner text, and adjust the watermark.
4. Export the annotated photo. The original photo remains unchanged.

Device location requires browser permission. Map requests are sent to the chosen
map provider; photos are not uploaded. Clearing browser site data removes locally
stored drafts and templates. The app version appears at the bottom of each page.

### Android photo locations

Android photo pickers or photo providers may remove GPS metadata before handing
the file to a website. Android uses a general file picker by default in this app;
you can also choose **從檔案選取原圖** and browse to the original JPEG or PNG in
**DCIM/Camera**. If offered, enable **Include location** in the system picker.
Whether GPS is retained depends on the browser and file provider. A location
shown in a gallery is not necessarily embedded in the original file.

If the selected file still has no GPS metadata, use the map or manually enter the
photo location. Device location describes where you are now, not necessarily
where the photo was taken. The app cannot restore metadata removed by Android.

Reference: [Android media location access](https://developer.android.com/training/data-storage/shared/media#media-location-permission).

## Development

Requires Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
```

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Built with Svelte, TypeScript, Vite, Leaflet, and IndexedDB.

## Releases and GitHub Pages

In repository **Settings → Pages**, choose **GitHub Actions** as the build source.
The `Deploy release to GitHub Pages` workflow builds and deploys each published
stable release at `/photo_marker/`. Prereleases are excluded. The workflow can
also be run manually with an existing release tag.

To publish the next version:

1. Run `npm version <version> --no-git-tag-version` and commit both package files
   together with the release changes. The app reads its version from `package.json`.
2. Push the commit, create and push a matching `v<version>` tag.
3. Publish a GitHub Release for that tag and check the Pages workflow result.

The workflow rejects a tag that does not match `package.json`. To preview a Pages
build locally, set `PHOTO_MARKER_BASE_PATH=/photo_marker/` before `npm run build`,
then run `npm run preview -- --base /photo_marker/` and open `/photo_marker/`.

See [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
for repository deployment configuration.
