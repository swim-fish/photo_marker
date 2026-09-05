import { failure, success, type Result } from '../result';
import type { WatermarkAsset } from './types';
import { hashBlob } from '../../infrastructure/platform/hashBlob';
export async function importWatermark(
  file: File,
): Promise<Result<WatermarkAsset, 'invalid-asset'>> {
  if (file.type !== 'image/png' || file.size > 2 * 1024 * 1024 || file.size < 24)
    return failure('invalid-asset');
  const bytes = await file.arrayBuffer(),
    signature = new Uint8Array(bytes);
  if (![137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => signature[index] === value))
    return failure('invalid-asset');
  const header = new DataView(bytes),
    width = header.getUint32(16),
    height = header.getUint32(20);
  if (width < 1 || height < 1 || width > 2048 || height > 2048) return failure('invalid-asset');
  try {
    const bitmap = await createImageBitmap(file);
    bitmap.close();
  } catch {
    return failure('invalid-asset');
  }
  return success({
    id: crypto.randomUUID(),
    version: 1,
    mime: 'image/png',
    blob: file.slice(),
    sourceBytes: bytes,
    width,
    height,
    digest: await hashBlob(file),
  });
}
