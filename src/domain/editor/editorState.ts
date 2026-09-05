export type EditorView =
  | 'editor'
  | 'coordinate'
  | 'map'
  | 'cornerText'
  | 'templates'
  | 'textStyle'
  | 'watermark'
  | 'defaults'
  | 'exportReview'
  | 'exportResult';
export type SettingsTransaction<T> = { photoId: string; baseRevision: number; value: T };
export function beginSettings<T>(
  photoId: string,
  baseRevision: number,
  value: T,
): SettingsTransaction<T> {
  return { photoId, baseRevision, value: structuredClone(value) };
}
export function commitSettings<T>(
  pending: SettingsTransaction<T>,
  photoId: string,
  revision: number,
): T | null {
  return pending.photoId === photoId && pending.baseRevision === revision
    ? structuredClone(pending.value)
    : null;
}
