import { en } from './en';
export const zhTW: { [K in keyof typeof en]: string } = {
  ...en,
  appName: 'Photo Marker',
  metaDescription: '離線照片座標與文字標記',
  description: '讓每張照片，都有位置。',
  importAction: '選取照片',
  readyStatus: '選取照片，開始記錄。',
  importPanelTitle: '讓每張照片，都有位置。',
  importPanelDescription: '選取手機內的 JPEG 或 PNG 照片，讀取 GPS 並加上標記。',
  photosLabel: '照片',
  photoStep: '照片',
  coordinateStep: '座標',
  textStep: '四角文字',
  exportStep: '儲存',
};
