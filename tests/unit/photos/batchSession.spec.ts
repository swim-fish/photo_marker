import { describe, expect, it } from 'vitest';

import type { CoordinateRecord } from '../../../src/domain/coordinates/types';
import type { ExportConfiguration } from '../../../src/domain/export/types';
import {
  applySharedBatchSettings,
  batchExportReadiness,
  createBatchSession,
  setBatchItemDecision,
} from '../../../src/domain/photos/batchSession';
import type { SourcePhoto } from '../../../src/domain/photos/types';

function photo(id: string, overrides: Partial<SourcePhoto> = {}): SourcePhoto {
  return {
    id,
    sessionId: 'batch-session',
    sourceBlob: new Blob([id], { type: 'image/png' }),
    sourceName: `${id}.png`,
    sourceMime: 'image/png',
    sourceBytes: 1024,
    sourceDigest: overrides.sourceDigest ?? `digest-${id}`,
    rawWidth: 100,
    rawHeight: 100,
    displayWidth: 100,
    displayHeight: 100,
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
    reviewStatus: 'missingCoordinate',
    failureCode: null,
    ...overrides,
  };
}

function coordinate(photoId: string, provenance: CoordinateRecord['provenance']): CoordinateRecord {
  return {
    id: `coordinate-${photoId}`,
    photoId,
    latitude: 25.033,
    longitude: 121.5654,
    provenance,
    inputFormat: 'WGS84_DD',
    displayFormat: 'WGS84_DD',
    zone: null,
    zoneAutoResolved: false,
    precision: null,
    accuracyMeters: null,
    acquiredAt: null,
    coverageStatus: 'available',
    validationStatus: 'valid',
  };
}

function configuration(photoId: string): ExportConfiguration {
  return {
    photoId,
    format: 'image/png',
    width: 100,
    height: 100,
    quality: null,
    metadataMode: 'preserveSupported',
    orientationMode: 'preserveRaw',
    fallback: null,
    outputName: `${photoId}-annotated.png`,
    saveMethod: 'download',
  };
}

describe('batch session', () => {
  it('accepts 20 editable photos plus explicit invalid intake and rejects a 21st editable photo', () => {
    const photos = Array.from({ length: 20 }, (_, index) => photo(`photo-${index + 1}`));
    const accepted = createBatchSession({
      id: 'batch-session',
      photos,
      invalidItems: [
        { id: 'invalid-1', sourceName: 'broken.txt', failureCode: 'unsupported-format' },
      ],
    });
    expect(accepted.ok).toBe(true);
    if (accepted.ok) {
      expect(accepted.value.items).toHaveLength(21);
      expect(accepted.value.items.at(-1)).toMatchObject({ status: 'invalid' });
    }

    expect(
      createBatchSession({ id: 'too-many', photos: [...photos, photo('photo-21')] }),
    ).toMatchObject({ ok: false, error: { code: 'over-limit' } });
  });

  it('keeps duplicate content as distinct items but rejects duplicate item identities', () => {
    const duplicates = [
      photo('duplicate-a', { sourceDigest: 'same-digest' }),
      photo('duplicate-b', { sourceDigest: 'same-digest' }),
    ];
    const result = createBatchSession({ id: 'batch-session', photos: duplicates });
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.value.items.map((item) => item.id)).toEqual(['duplicate-a', 'duplicate-b']);

    expect(
      createBatchSession({ id: 'batch-session', photos: [photo('same'), photo('same')] }),
    ).toMatchObject({ ok: false, error: { code: 'duplicate-id' } });
  });

  it('copies shared overlays and display format while retaining per-photo coordinate provenance', () => {
    const first = photo('first');
    const second = photo('second');
    const created = createBatchSession({
      id: 'batch-session',
      photos: [first, second],
      coordinates: [
        coordinate(first.id, 'CAPTURE_METADATA'),
        coordinate(second.id, 'MANUAL_INPUT'),
      ],
      configurations: [configuration(first.id), configuration(second.id)],
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const updated = applySharedBatchSettings(
      created.value,
      {
        displayFormat: 'WGS84_DMS',
        overlayTemplate: {
          overlays: [
            {
              role: 'title',
              content: 'Shared title',
              fontFamily: 'Noto Sans TC',
              fontSize: 0.05,
              textColor: '#fff',
              backgroundColor: '#111',
              x: 0.1,
              y: 0.1,
              width: 0.5,
              height: 0.1,
              padding: 0.012,
              lineHeight: 1.2,
              order: 0,
              contrastStatus: 'acceptable',
            },
          ],
        },
      },
      (photoId, index) => `${photoId}-overlay-${index}`,
    );
    const editable = updated.items.filter((item) => item.kind === 'editable');
    expect(editable.map((item) => item.coordinate?.provenance)).toEqual([
      'CAPTURE_METADATA',
      'MANUAL_INPUT',
    ]);
    expect(editable.map((item) => item.coordinate?.displayFormat)).toEqual([
      'WGS84_DMS',
      'WGS84_DMS',
    ]);
    expect(editable.map((item) => item.overlays[0]?.photoId)).toEqual(['first', 'second']);
    expect(editable[0]?.overlays).not.toBe(editable[1]?.overlays);
  });

  it('requires an explicit unresolved decision and honors omit or coordinate-free export', () => {
    const created = createBatchSession({
      id: 'batch-session',
      photos: [photo('ready'), photo('unresolved')],
      coordinates: [coordinate('ready', 'MANUAL_INPUT')],
      configurations: [configuration('ready'), configuration('unresolved')],
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(batchExportReadiness(created.value)).toEqual({
      ready: false,
      unresolvedItemIds: ['unresolved'],
    });

    const omitted = setBatchItemDecision(created.value, 'unresolved', 'omit');
    expect(batchExportReadiness(omitted)).toEqual({ ready: true, unresolvedItemIds: [] });
    expect(omitted.items.find((item) => item.id === 'unresolved')).toMatchObject({
      decision: 'omit',
      status: 'omitted',
    });

    const withoutCoordinate = setBatchItemDecision(
      created.value,
      'unresolved',
      'withoutCoordinate',
    );
    expect(batchExportReadiness(withoutCoordinate)).toEqual({ ready: true, unresolvedItemIds: [] });
    expect(withoutCoordinate.items.find((item) => item.id === 'unresolved')).toMatchObject({
      decision: 'withoutCoordinate',
      status: 'ready',
    });
  });

  it('rejects aggregate bytes above 80% of reported storage headroom', () => {
    expect(
      createBatchSession({
        id: 'batch-session',
        photos: [photo('one', { sourceBytes: 900 }), photo('two', { sourceBytes: 900 })],
        storageHeadroomBytes: 2_000,
      }),
    ).toMatchObject({ ok: false, error: { code: 'over-limit' } });
  });
});
