export const SHARE_TARGET_ACTION = '/share-target';
export const SHARE_TARGET_FIELD = 'photos';
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png']);

export type ShareTargetHandlerOptions = Readonly<{
  persist: (files: readonly File[]) => Promise<void>;
}>;

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
  if (files.some((file) => !SUPPORTED_TYPES.has(file.type))) {
    return new Response('Unsupported media type.', { status: 415 });
  }

  await options.persist(files);
  return new Response(null, { status: 303, headers: { Location: '/' } });
}
