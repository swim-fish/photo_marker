import { describe, expect, it, vi } from 'vitest';

import { exportPhoto } from '../../../src/domain/export/exportPhoto';
import type { SourcePhoto } from '../../../src/domain/photos/types';
import { importPhoto } from '../../../src/domain/photos/importPhoto';
import { readMetadata } from '../../../src/infrastructure/metadata/readMetadata';
import { hashBlob } from '../../../src/infrastructure/platform/hashBlob';
import { createPhotoFixtureFile } from '../../helpers/photoFixtures';

type PhotoMime = 'image/jpeg' | 'image/png';
type MetadataMode = 'preserveSupported' | 'removeSupported';

type ExportOverrides = Readonly<{
  format?: PhotoMime;
  metadataMode?: MetadataMode;
  quality?: number | null;
  outputName?: string;
  fallback?: Readonly<{ code: string; message: string; acknowledged: boolean }> | null;
}>;

async function loadPhoto(
  name: 'orientation-6.jpg' | 'sample.png',
  id: string,
): Promise<SourcePhoto> {
  const imported = await importPhoto(await createPhotoFixtureFile(name), {
    id,
    sessionId: 'session-export',
  });
  expect(imported.ok).toBe(true);
  if (!imported.ok) throw new Error('Fixture import failed.');
  return imported.value;
}

function exportRequest(source: SourcePhoto, overrides: ExportOverrides = {}) {
  return {
    photoId: source.id,
    format: overrides.format ?? source.sourceMime,
    metadataMode: overrides.metadataMode ?? 'preserveSupported',
    quality: overrides.quality,
    outputName: overrides.outputName ?? `${source.sourceName}.annotated`,
    saveMethod: 'download' as const,
    fallback: overrides.fallback ?? null,
  };
}

describe('single-photo export safety and handoff', () => {
  it('verifies JPEG and PNG encoder MIME types and reports an accurate handedOff result', async () => {
    for (const [fixture, mime] of [
      ['orientation-6.jpg', 'image/jpeg'],
      ['sample.png', 'image/png'],
    ] as const) {
      const source = await loadPhoto(fixture, `photo-${mime}`);
      let handedOffBlob: Blob | null = null;
      let handedOffName: string | null = null;
      const saveOutput = vi.fn(async (blob: Blob, name: string) => {
        handedOffBlob = blob;
        handedOffName = name;
      });

      const result = await exportPhoto(source, exportRequest(source), { saveOutput });

      expect(result).toMatchObject({
        ok: true,
        value: {
          status: 'handedOff',
          outputMime: mime,
          saveMethod: 'download',
        },
      });
      expect((handedOffBlob as Blob | null)?.type).toBe(mime);
      expect(handedOffName).toBeTruthy();
    }
  });

  it('defaults same-format output to raw dimensions and source orientation while keeping the source hash stable', async () => {
    const source = await loadPhoto('orientation-6.jpg', 'photo-defaults');
    const before = await hashBlob(source.sourceBlob);
    let handedOffBlob: Blob | null = null;
    const saveOutput = vi.fn(async (blob: Blob) => {
      handedOffBlob = blob;
    });

    const result = await exportPhoto(source, exportRequest(source), { saveOutput });

    expect(result).toMatchObject({
      ok: true,
      value: { outputMime: 'image/jpeg', status: 'handedOff' },
    });
    expect(handedOffBlob).toBeInstanceOf(Blob);
    if (!handedOffBlob) return;
    const outputMetadata = await readMetadata(handedOffBlob);
    expect(outputMetadata.ok).toBe(true);
    if (!outputMetadata.ok) return;
    expect(outputMetadata.value.rawWidth).toBe(source.rawWidth);
    expect(outputMetadata.value.rawHeight).toBe(source.rawHeight);
    expect(outputMetadata.value.orientation).toBe(source.orientation);
    expect(await hashBlob(source.sourceBlob)).toBe(before);
  });

  it('passes the default and adjusted JPEG quality to the encoder configuration', async () => {
    const source = await loadPhoto('orientation-6.jpg', 'photo-quality');
    const renderPhoto = vi.fn().mockResolvedValue({
      ok: true,
      value: {
        blob: new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' }),
        mime: 'image/jpeg',
        renderPath: 'main-thread',
        overlayRects: [],
        plan: {},
      },
    });
    const saveOutput = vi.fn(async () => undefined);

    await exportPhoto(source, exportRequest(source, { quality: 0.64 }), {
      renderPhoto,
      saveOutput,
    });

    expect(renderPhoto).toHaveBeenCalledTimes(1);
    const renderOptions = renderPhoto.mock.calls[0]?.[1] as Record<string, unknown> | undefined;
    expect(renderOptions).toMatchObject({
      outputFormat: 'image/jpeg',
      orientation: source.orientation,
      quality: 0.64,
      metadataMode: 'preserveSupported',
    });
  });

  it('requires disclosure before format-change preservation and bakes upright pixels after explicit removal', async () => {
    const source = await loadPhoto('orientation-6.jpg', 'photo-normalization');
    const blockedSave = vi.fn(async () => undefined);
    const blocked = await exportPhoto(
      source,
      exportRequest(source, { format: 'image/png', metadataMode: 'preserveSupported' }),
      { saveOutput: blockedSave },
    );
    expect(blocked).toMatchObject({
      ok: false,
      error: { code: 'metadata-preservation-unavailable' },
    });
    expect(blockedSave).not.toHaveBeenCalled();

    let normalizedBlob: Blob | null = null;
    const saveOutput = vi.fn(async (blob: Blob) => {
      normalizedBlob = blob;
    });
    const normalized = await exportPhoto(
      source,
      exportRequest(source, { format: 'image/png', metadataMode: 'removeSupported' }),
      { saveOutput },
    );
    expect(normalized).toMatchObject({
      ok: true,
      value: { status: 'handedOff', outputMime: 'image/png' },
    });
    expect(normalizedBlob).toBeInstanceOf(Blob);
    if (!normalizedBlob) return;
    const metadata = await readMetadata(normalizedBlob);
    expect(metadata.ok).toBe(true);
    if (!metadata.ok) return;
    expect(metadata.value.orientation).toBe(1);
    expect(metadata.value.rawWidth).toBe(source.displayWidth);
    expect(metadata.value.rawHeight).toBe(source.displayHeight);
  });

  it('uses a conflict-safe name, creates no output on cancellation, and preserves source bytes', async () => {
    const source = await loadPhoto('orientation-6.jpg', 'photo-conflict');
    const before = await hashBlob(source.sourceBlob);
    let savedName: string | null = null;
    const saveOutput = vi.fn(async (_blob: Blob, name: string) => {
      savedName = name;
    });
    const completed = await exportPhoto(
      source,
      exportRequest(source, { outputName: source.sourceName }),
      {
        saveOutput,
        existingOutputNames: [source.sourceName],
      },
    );

    expect(completed).toMatchObject({ ok: true, value: { status: 'handedOff' } });
    expect(savedName).toBeTruthy();
    expect(savedName).not.toBe(source.sourceName);
    expect(await hashBlob(source.sourceBlob)).toBe(before);

    const controller = new AbortController();
    controller.abort();
    const cancelledSave = vi.fn(async () => undefined);
    const cancelled = await exportPhoto(
      source,
      exportRequest(source, { outputName: 'cancelled.jpg' }),
      { saveOutput: cancelledSave, signal: controller.signal },
    );
    expect(cancelled).toMatchObject({
      ok: true,
      value: { status: 'cancelled', failureCode: 'save-cancelled' },
    });
    expect(cancelledSave).not.toHaveBeenCalled();
    expect(await hashBlob(source.sourceBlob)).toBe(before);
  });

  it('does not claim handedOff when the injected save handoff fails', async () => {
    const source = await loadPhoto('sample.png', 'photo-save-failure');
    const saveOutput = vi.fn(async () => {
      throw new Error('synthetic save failure');
    });

    const result = await exportPhoto(source, exportRequest(source), { saveOutput });

    expect(result).toMatchObject({
      ok: true,
      value: { status: 'failed', failureCode: 'save-failed', saveMethod: null },
    });
  });
});
