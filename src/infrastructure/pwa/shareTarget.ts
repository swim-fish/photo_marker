export const SHARE_TARGET_ACTION = '/share-target';
export const SHARE_TARGET_FIELD = 'photos';
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png']);

export type ShareTargetHandlerOptions = Readonly<{
  persist: (files: readonly File[]) => Promise<void>;
}>;

async function hasExpectedMagic(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (file.type === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  return (
    bytes.length === 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte)
  );
}

export async function handleShareTargetRequest(
  request: Request,
  options: ShareTargetHandlerOptions,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (request.method !== 'POST' || url.pathname !== SHARE_TARGET_ACTION) return null;

  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return new Response('Invalid multipart request.', { status: 400 });
  }
  const files = data
    .getAll(SHARE_TARGET_FIELD)
    .filter((entry): entry is File => typeof entry !== 'string');
  if (files.length === 0) return new Response('No supported photos.', { status: 400 });
  if (files.length > MAX_PHOTOS || files.some((file) => file.size > MAX_BYTES_PER_PHOTO)) {
    return new Response('Shared photo limit exceeded.', { status: 413 });
  }
  if (files.some((file) => !SUPPORTED_TYPES.has(file.type))) {
    return new Response('Unsupported media type.', { status: 415 });
  }
  if (!(await Promise.all(files.map(hasExpectedMagic))).every(Boolean)) {
    return new Response('Photo signature does not match its media type.', { status: 415 });
  }

  await options.persist(files);
  return new Response(null, { status: 303, headers: { Location: '/' } });
}
import { MAX_BYTES_PER_PHOTO, MAX_PHOTOS } from '../../domain/photos/photoLimits';
