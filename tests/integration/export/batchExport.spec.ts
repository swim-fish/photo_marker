import { describe, expect, it, vi } from 'vitest';

import { failure, success } from '../../../src/domain/result';
import {
  exportBatchSequentially,
  retryFailedBatchExports,
  type BatchExportWorkItem,
} from '../../../src/domain/export/batchExport';
import type { ExportResult } from '../../../src/domain/export/types';
import type { SourcePhoto } from '../../../src/domain/photos/types';
import { hashBlob } from '../../../src/infrastructure/platform/hashBlob';

function photo(id: string): SourcePhoto {
  const sourceBlob = new Blob([`source-${id}`], { type: 'image/png' });
  return {
    id,
    sessionId: 'batch-session',
    sourceBlob,
    sourceName: `${id}.png`,
    sourceMime: 'image/png',
    sourceBytes: sourceBlob.size,
    sourceDigest: '',
    rawWidth: 10,
    rawHeight: 10,
    displayWidth: 10,
    displayHeight: 10,
    orientation: 1,
    metadataSummary: {
      captureGps: null,
      orientationPresent: false,
      groups: [],
      preservationEligibility: 'none',
      excludedGroups: [],
    },
    coordinateId: null,
    overlayIds: [],
    reviewStatus: 'ready',
    failureCode: null,
  };
}

function workItem(id: string, disposition: BatchExportWorkItem['disposition'] = 'export') {
  const source = photo(id);
  return {
    photo: source,
    disposition,
    request: {
      photoId: id,
      format: 'image/png' as const,
      metadataMode: 'preserveSupported' as const,
      outputName: `${id}-annotated.png`,
      saveMethod: 'download' as const,
      fallback: null,
    },
  };
}

function result(photoId: string, status: ExportResult['status']): ExportResult {
  return {
    photoId,
    status,
    outputName: status === 'handedOff' ? `${photoId}-annotated.png` : null,
    outputMime: status === 'handedOff' ? 'image/png' : null,
    outputBytes: status === 'handedOff' ? 10 : null,
    saveMethod: status === 'handedOff' ? 'download' : null,
    failureCode: status === 'failed' ? 'save-failed' : null,
    startedAt: '2026-01-01T00:00:00.000Z',
    finishedAt: '2026-01-01T00:00:01.000Z',
    phaseDurationsMs: {},
  };
}

describe('sequential batch export', () => {
  it('uses concurrency one, releases each attempted item, and preserves source hashes', async () => {
    const items = [workItem('one'), workItem('two'), workItem('three')];
    const before = await Promise.all(items.map((item) => hashBlob(item.photo.sourceBlob)));
    let active = 0;
    let maximumActive = 0;
    const exportOne = vi.fn(async (item: BatchExportWorkItem) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return success(result(item.photo.id, 'handedOff'));
    });
    const release = vi.fn();

    const results = await exportBatchSequentially(items, { exportOne, release });

    expect(maximumActive).toBe(1);
    expect(results.map((entry) => entry.status)).toEqual(['handedOff', 'handedOff', 'handedOff']);
    expect(release.mock.calls.map(([item]) => item.photo.id)).toEqual(['one', 'two', 'three']);
    expect(await Promise.all(items.map((item) => hashBlob(item.photo.sourceBlob)))).toEqual(before);
  });

  it('retains successes, explicit omissions, and later work when one item fails', async () => {
    const items = [workItem('one'), workItem('omitted', 'omit'), workItem('bad'), workItem('last')];
    const exportOne = vi.fn(async (item: BatchExportWorkItem) =>
      item.photo.id === 'bad'
        ? failure('metadata-preservation-unavailable')
        : success(result(item.photo.id, 'handedOff')),
    );

    const results = await exportBatchSequentially(items, { exportOne });

    expect(results.map((entry) => [entry.photoId, entry.status])).toEqual([
      ['one', 'handedOff'],
      ['omitted', 'omitted'],
      ['bad', 'failed'],
      ['last', 'handedOff'],
    ]);
    expect(exportOne).toHaveBeenCalledTimes(3);
  });

  it('retries only failed items while retaining prior successful results', async () => {
    const items = [workItem('one'), workItem('bad'), workItem('three')];
    const previous = [
      result('one', 'handedOff'),
      result('bad', 'failed'),
      result('three', 'handedOff'),
    ];
    const exportOne = vi.fn(async (item: BatchExportWorkItem) =>
      success(result(item.photo.id, 'handedOff')),
    );

    const retried = await retryFailedBatchExports(items, previous, { exportOne });

    expect(exportOne).toHaveBeenCalledOnce();
    expect(exportOne.mock.calls[0]?.[0].photo.id).toBe('bad');
    expect(retried.map((entry) => entry.status)).toEqual(['handedOff', 'handedOff', 'handedOff']);
    expect(retried[0]).toBe(previous[0]);
    expect(retried[2]).toBe(previous[2]);
  });

  it('stops between items on cancellation and marks untouched work cancelled', async () => {
    const controller = new AbortController();
    const items = [workItem('one'), workItem('two'), workItem('three')];
    const exportOne = vi.fn(async (item: BatchExportWorkItem) => {
      controller.abort();
      return success(result(item.photo.id, 'handedOff'));
    });

    const results = await exportBatchSequentially(items, {
      exportOne,
      signal: controller.signal,
    });

    expect(exportOne).toHaveBeenCalledOnce();
    expect(results.map((entry) => entry.status)).toEqual(['handedOff', 'cancelled', 'cancelled']);
  });
});
