import type { WatermarkAsset } from '../../domain/watermarks/types';
/** Compare durable bytes as well as metadata; a caller-supplied digest alone is not sufficient. */
export function sameAsset(left: WatermarkAsset, right: WatermarkAsset): boolean {
  const a = new Uint8Array(left.sourceBytes),
    b = new Uint8Array(right.sourceBytes);
  return (
    left.version === right.version &&
    left.mime === right.mime &&
    left.width === right.width &&
    left.height === right.height &&
    left.digest === right.digest &&
    a.length === b.length &&
    a.every((value, index) => value === b[index])
  );
}
