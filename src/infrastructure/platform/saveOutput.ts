import type { SaveMethod } from '../../domain/export/types';

export class SaveCancelledError extends Error {
  constructor() {
    super('Saving was cancelled.');
    this.name = 'SaveCancelledError';
  }
}

type SavePickerWindow = Window &
  typeof globalThis & {
    showSaveFilePicker?: (options: {
      suggestedName: string;
      types: readonly unknown[];
    }) => Promise<{
      createWritable(): Promise<{
        write(blob: Blob): Promise<void>;
        close(): Promise<void>;
      }>;
    }>;
  };

export async function saveOutput(
  blob: Blob,
  outputName: string,
  preferredMethod: SaveMethod = 'filePicker',
): Promise<SaveMethod> {
  if (preferredMethod === 'filePicker' && typeof window !== 'undefined') {
    const picker = (window as SavePickerWindow).showSaveFilePicker;
    if (picker) {
      try {
        const handle = await picker({
          suggestedName: outputName,
          types: [
            {
              description: 'Annotated photo',
              accept: { [blob.type]: [blob.type === 'image/png' ? '.png' : '.jpg'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return 'filePicker';
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new SaveCancelledError();
        }
        throw error;
      }
    }
  }

  if (
    preferredMethod === 'webShare' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function'
  ) {
    const file = new File([blob], outputName, { type: blob.type });
    if (!navigator.canShare || navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
      return 'webShare';
    }
  }

  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('Download handoff is unavailable.');
  }
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = outputName;
    anchor.rel = 'noopener';
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
  return 'download';
}
