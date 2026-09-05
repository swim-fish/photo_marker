export type PhotoMarkerManifest = {
  id: '/photo-marker/';
  name: 'Photo Marker';
  short_name: 'Photo Marker';
  description: string;
  start_url: '/';
  scope: '/';
  display: 'standalone';
  background_color: string;
  theme_color: string;
  lang: 'zh-TW';
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose: string;
  }>;
  share_target?: {
    action: '/share-target';
    method: 'POST';
    enctype: 'multipart/form-data';
    params: {
      files: Array<{
        name: 'photos';
        accept: Array<'image/jpeg' | 'image/png'>;
      }>;
    };
  };
};

export function createWebAppManifest(enableShareTarget: boolean): PhotoMarkerManifest {
  return {
    id: '/photo-marker/',
    name: 'Photo Marker',
    short_name: 'Photo Marker',
    description: '離線照片座標與文字標記',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f8faf7',
    theme_color: '#f8faf7',
    lang: 'zh-TW',
    icons: [
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      {
        src: '/icons/icon-maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    ...(enableShareTarget
      ? {
          share_target: {
            action: '/share-target',
            method: 'POST',
            enctype: 'multipart/form-data',
            params: {
              files: [
                {
                  name: 'photos',
                  accept: ['image/jpeg', 'image/png'],
                },
              ],
            },
          },
        }
      : {}),
  };
}
