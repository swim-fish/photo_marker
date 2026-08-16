import type { CoordinateDisplayFormat } from '../coordinates/types';
import type { OverlayTemplate } from '../overlays/types';

export type EditingSessionStatus =
  | 'creating'
  | 'editing'
  | 'reviewing'
  | 'exporting'
  | 'partiallyExported'
  | 'completed'
  | 'discarded'
  | 'storageError';

export type PersistenceStatus =
  'unknown' | 'bestEffort' | 'persistent' | 'denied' | 'quotaExceeded';

export type EditingSession = Readonly<{
  id: string;
  schemaVersion: number;
  revision: number;
  status: EditingSessionStatus;
  photoIds: readonly string[];
  activePhotoId: string;
  sharedOverlayTemplate: OverlayTemplate | null;
  sharedDisplayFormat: CoordinateDisplayFormat | null;
  createdAt: string;
  updatedAt: string;
  lastPersistedRevision: number;
  persistenceStatus: PersistenceStatus;
}>;
