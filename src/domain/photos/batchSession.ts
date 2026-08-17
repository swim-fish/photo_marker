import type { CoordinateDisplayFormat, CoordinateRecord } from '../coordinates/types';
import type { ExportConfiguration } from '../export/types';
import type { OverlayTemplate, TextOverlay } from '../overlays/types';
import { failure, type Result, success } from '../result';
import { validatePhotoBatchLimits } from './photoLimits';
import type { PhotoReviewStatus, SourcePhoto } from './types';

export type BatchItemDecision = 'required' | 'omit' | 'withoutCoordinate';

export type EditableBatchItem = Readonly<{
  kind: 'editable';
  id: string;
  sourceName: string;
  photo: SourcePhoto;
  coordinate: CoordinateRecord | null;
  overlays: readonly TextOverlay[];
  configuration: ExportConfiguration | null;
  decision: BatchItemDecision;
  status: PhotoReviewStatus;
  failureCode: string | null;
}>;

export type InvalidBatchItem = Readonly<{
  kind: 'invalid';
  id: string;
  sourceName: string;
  status: 'invalid';
  failureCode: string;
}>;

export type BatchItem = EditableBatchItem | InvalidBatchItem;

export type BatchSession = Readonly<{
  id: string;
  items: readonly BatchItem[];
  activeItemId: string;
  aggregateBytes: number;
}>;

export type InvalidBatchIntake = Readonly<{
  id: string;
  sourceName: string;
  failureCode: string;
}>;

export type CreateBatchSessionInput = Readonly<{
  id: string;
  photos: readonly SourcePhoto[];
  invalidItems?: readonly InvalidBatchIntake[];
  coordinates?: readonly CoordinateRecord[];
  overlays?: readonly TextOverlay[];
  configurations?: readonly ExportConfiguration[];
  storageHeadroomBytes?: number;
}>;

export type SharedBatchSettings = Readonly<{
  overlayTemplate?: OverlayTemplate;
  displayFormat?: CoordinateDisplayFormat;
}>;

export type BatchSessionFailure = 'over-limit' | 'duplicate-id' | 'invalid-input';

export function createBatchSession(
  input: CreateBatchSessionInput,
): Result<BatchSession, BatchSessionFailure> {
  const limits = validatePhotoBatchLimits(input.photos, {
    storageHeadroomBytes: input.storageHeadroomBytes,
  });
  if (!limits.ok) return failure('over-limit');

  const invalidItems = input.invalidItems ?? [];
  const ids = [...input.photos.map((photo) => photo.id), ...invalidItems.map((item) => item.id)];
  if (new Set(ids).size !== ids.length) return failure('duplicate-id');
  if (input.photos.some((photo) => photo.sessionId !== input.id)) return failure('invalid-input');

  const coordinates = new Map((input.coordinates ?? []).map((record) => [record.photoId, record]));
  const configurations = new Map(
    (input.configurations ?? []).map((configuration) => [configuration.photoId, configuration]),
  );
  const overlaysByPhoto = new Map<string, TextOverlay[]>();
  for (const overlay of input.overlays ?? []) {
    const group = overlaysByPhoto.get(overlay.photoId) ?? [];
    group.push(overlay);
    overlaysByPhoto.set(overlay.photoId, group);
  }

  const editable: EditableBatchItem[] = input.photos.map((photo) => {
    const coordinate = coordinates.get(photo.id) ?? null;
    return {
      kind: 'editable',
      id: photo.id,
      sourceName: photo.sourceName,
      photo,
      coordinate,
      overlays: [...(overlaysByPhoto.get(photo.id) ?? [])],
      configuration: configurations.get(photo.id) ?? null,
      decision: 'required',
      status: coordinate?.validationStatus === 'valid' ? 'ready' : 'missingCoordinate',
      failureCode: null,
    };
  });
  const invalid: InvalidBatchItem[] = invalidItems.map((item) => ({
    kind: 'invalid',
    id: item.id,
    sourceName: item.sourceName,
    status: 'invalid',
    failureCode: item.failureCode,
  }));

  return success({
    id: input.id,
    items: [...editable, ...invalid],
    activeItemId: editable[0].id,
    aggregateBytes: input.photos.reduce((total, photo) => total + photo.sourceBytes, 0),
  });
}

export function applySharedBatchSettings(
  session: BatchSession,
  settings: SharedBatchSettings,
  createOverlayId: (photoId: string, index: number) => string = (photoId, index) =>
    `${photoId}-shared-${index}`,
): BatchSession {
  const sharedOverlayCount = settings.overlayTemplate?.overlays.length ?? 0;
  return {
    ...session,
    items: session.items.map((item) => {
      if (item.kind !== 'editable') return item;
      const coordinate =
        item.coordinate && settings.displayFormat
          ? { ...item.coordinate, displayFormat: settings.displayFormat }
          : item.coordinate;
      const overlays = settings.overlayTemplate
        ? [
            ...settings.overlayTemplate.overlays.map((overlay, index) => ({
              ...overlay,
              id: createOverlayId(item.photo.id, index),
              photoId: item.photo.id,
            })),
            ...item.overlays
              .filter((overlay) => overlay.role === 'coordinate')
              .map((overlay, index) => ({
                ...overlay,
                order: sharedOverlayCount + index,
              })),
          ]
        : item.overlays;
      return { ...item, coordinate, overlays };
    }),
  };
}

export function setBatchItemDecision(
  session: BatchSession,
  itemId: string,
  decision: BatchItemDecision,
): BatchSession {
  return {
    ...session,
    items: session.items.map((item) => {
      if (item.kind !== 'editable' || item.id !== itemId) return item;
      const status: PhotoReviewStatus =
        decision === 'omit'
          ? 'omitted'
          : item.coordinate?.validationStatus === 'valid' || decision === 'withoutCoordinate'
            ? 'ready'
            : 'missingCoordinate';
      return { ...item, decision, status };
    }),
  };
}

export function batchExportReadiness(session: BatchSession): {
  ready: boolean;
  unresolvedItemIds: string[];
} {
  const unresolvedItemIds = session.items
    .filter(
      (item): item is EditableBatchItem =>
        item.kind === 'editable' &&
        item.coordinate?.validationStatus !== 'valid' &&
        item.decision === 'required',
    )
    .map((item) => item.id);
  return { ready: unresolvedItemIds.length === 0, unresolvedItemIds };
}

export function updateBatchItem(
  session: BatchSession,
  itemId: string,
  update: Partial<Omit<EditableBatchItem, 'kind' | 'id' | 'sourceName'>>,
): BatchSession {
  return {
    ...session,
    items: session.items.map((item) =>
      item.kind === 'editable' && item.id === itemId ? { ...item, ...update } : item,
    ),
  };
}

export function selectBatchItem(session: BatchSession, itemId: string): BatchSession {
  return session.items.some((item) => item.kind === 'editable' && item.id === itemId)
    ? { ...session, activeItemId: itemId }
    : session;
}
