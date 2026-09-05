export type OverlayRole = 'title' | 'team' | 'coordinate' | 'freeform';
export type ContrastStatus = 'acceptable' | 'warning';
export type OverlayCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type OverlayGeometry = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type RgbaColor =
  | string
  | Readonly<{
      red: number;
      green: number;
      blue: number;
      alpha: number;
    }>;

export type TextOverlay = OverlayGeometry &
  Readonly<{
    id: string;
    photoId: string;
    role: OverlayRole;
    content: string;
    fontFamily: string;
    fontSize: number;
    textColor: RgbaColor;
    backgroundColor: RgbaColor;
    padding: number;
    cornerRadius?: number;
    lineHeight: number;
    order: number;
    contrastStatus: ContrastStatus;
    placementCorner?: OverlayCorner;
    coordinateFormat?: import('../coordinates/types').CoordinateDisplayFormat;
  }>;

export type OverlayTemplate = Readonly<{
  overlays: readonly Omit<TextOverlay, 'id' | 'photoId'>[];
}>;
