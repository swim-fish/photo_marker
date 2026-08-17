import type { TextOverlay } from '../overlays/types';
import type { Result } from '../result';
import type { SourcePhoto } from '../photos/types';
import { hashBlob } from '../../infrastructure/platform/hashBlob';
import { exportPhoto, type ExportPhotoRequest } from './exportPhoto';
import type { ExportResult } from './types';

export type BatchExportWorkItem = Readonly<{
  photo: SourcePhoto;
  request: ExportPhotoRequest;
  overlays?: readonly TextOverlay[];
  disposition: 'export' | 'omit';
}>;

type ExportOne = (
  item: BatchExportWorkItem,
  context: Readonly<{ signal?: AbortSignal; existingOutputNames: readonly string[] }>,
) => Promise<Result<ExportResult, string>>;

export type BatchExportDependencies = Readonly<{
  exportOne?: ExportOne;
  release?: (item: BatchExportWorkItem) => void | Promise<void>;
  signal?: AbortSignal;
  onProgress?: (completed: number, total: number, result: ExportResult) => void | Promise<void>;
}>;

function terminalResult(
  photoId: string,
  status: 'omitted' | 'cancelled' | 'failed',
  failureCode: string | null,
): ExportResult {
  const now = new Date().toISOString();
  return {
    photoId,
    status,
    outputName: null,
    outputMime: null,
    outputBytes: null,
    saveMethod: null,
    failureCode,
    startedAt: now,
    finishedAt: now,
    phaseDurationsMs: {},
  };
}

async function defaultExportOne(
  item: BatchExportWorkItem,
  context: Readonly<{ signal?: AbortSignal; existingOutputNames: readonly string[] }>,
): Promise<Result<ExportResult, string>> {
  return exportPhoto(
    item.photo,
    { ...item.request, overlays: item.overlays },
    { signal: context.signal, existingOutputNames: context.existingOutputNames },
  );
}

export async function exportBatchSequentially(
  items: readonly BatchExportWorkItem[],
  dependencies: BatchExportDependencies = {},
): Promise<readonly ExportResult[]> {
  const results: ExportResult[] = [];
  const existingOutputNames: string[] = [];
  const exportOne = dependencies.exportOne ?? defaultExportOne;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (dependencies.signal?.aborted) {
      for (const pending of items.slice(index)) {
        results.push(terminalResult(pending.photo.id, 'cancelled', 'batch-cancelled'));
      }
      break;
    }

    if (item.disposition === 'omit') {
      const omitted = terminalResult(item.photo.id, 'omitted', null);
      results.push(omitted);
      await dependencies.onProgress?.(results.length, items.length, omitted);
      continue;
    }

    const beforeDigest = await hashBlob(item.photo.sourceBlob);
    let completed: ExportResult;
    try {
      const result = await exportOne(item, {
        signal: dependencies.signal,
        existingOutputNames,
      });
      completed = result.ok
        ? result.value
        : terminalResult(item.photo.id, 'failed', result.error.code);
      if ((await hashBlob(item.photo.sourceBlob)) !== beforeDigest) {
        completed = terminalResult(item.photo.id, 'failed', 'source-modified');
      }
    } catch {
      completed = terminalResult(item.photo.id, 'failed', 'export-failed');
    } finally {
      await dependencies.release?.(item);
    }
    results.push(completed);
    if (completed.status === 'handedOff' && completed.outputName) {
      existingOutputNames.push(completed.outputName);
    }
    await dependencies.onProgress?.(results.length, items.length, completed);
  }

  return results;
}

export async function retryFailedBatchExports(
  items: readonly BatchExportWorkItem[],
  previousResults: readonly ExportResult[],
  dependencies: BatchExportDependencies = {},
): Promise<readonly ExportResult[]> {
  const previousByPhoto = new Map(previousResults.map((result) => [result.photoId, result]));
  const retryItems = items.filter(
    (item) => previousByPhoto.get(item.photo.id)?.status === 'failed',
  );
  const retried = await exportBatchSequentially(retryItems, dependencies);
  const retriedByPhoto = new Map(retried.map((result) => [result.photoId, result]));
  return items.map(
    (item) =>
      retriedByPhoto.get(item.photo.id) ??
      previousByPhoto.get(item.photo.id) ??
      terminalResult(item.photo.id, 'cancelled', 'not-started'),
  );
}
