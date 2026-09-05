import type { EditingSession, EditingSessionStatus } from './types';

export type CreateEditingSessionInput = Readonly<{
  id: string;
  photoIds: readonly string[];
  now?: string;
  schemaVersion?: number;
}>;

export type EditingSessionAction =
  | Readonly<{
      type: 'transition';
      status: EditingSessionStatus;
      now?: string;
    }>
  | Readonly<{
      type: 'set-active-photo' | 'setActivePhoto' | 'select-photo';
      photoId: string;
      now?: string;
    }>
  | Readonly<{
      type: 'mark-persisted';
      revision?: number;
    }>
  | Readonly<{
      type: 'set-persistence-status';
      persistenceStatus: EditingSession['persistenceStatus'];
    }>
  | Readonly<{
      type: 'touch';
      now?: string;
    }>;

const transitions: Readonly<Record<EditingSessionStatus, readonly EditingSessionStatus[]>> = {
  creating: ['editing', 'discarded'],
  editing: ['reviewing', 'storageError', 'discarded'],
  reviewing: ['editing', 'exporting', 'storageError', 'discarded'],
  exporting: ['reviewing', 'partiallyExported', 'completed', 'storageError'],
  partiallyExported: ['reviewing', 'exporting', 'discarded'],
  completed: [],
  discarded: [],
  storageError: ['editing'],
};

export function isLegalSessionTransition(
  from: EditingSessionStatus,
  to: EditingSessionStatus,
): boolean {
  return transitions[from].includes(to);
}

export function createEditingSession(input: CreateEditingSessionInput): EditingSession {
  const photoIds = [...input.photoIds];
  if (new Set(photoIds).size !== photoIds.length) {
    throw new RangeError('Photo IDs must be unique.');
  }
  if (photoIds.length < 1 || photoIds.length > 20) {
    throw new RangeError('An editing session must contain between one and twenty photos.');
  }
  const now = input.now ?? new Date().toISOString();
  return {
    id: input.id,
    schemaVersion: input.schemaVersion ?? 1,
    revision: 0,
    status: 'creating',
    photoIds,
    activePhotoId: photoIds[0],
    sharedOverlayTemplate: null,
    sharedDisplayFormat: null,
    createdAt: now,
    updatedAt: now,
    lastPersistedRevision: 0,
    persistenceStatus: 'unknown',
  };
}

function nextTimestamp(requested?: string): string {
  return requested ?? new Date().toISOString();
}

function bump(session: EditingSession, now?: string): EditingSession {
  return {
    ...session,
    revision: session.revision + 1,
    updatedAt: nextTimestamp(now),
  };
}

export function editingSessionReducer(
  session: EditingSession,
  action: EditingSessionAction,
): EditingSession {
  switch (action.type) {
    case 'transition':
      if (
        !isLegalSessionTransition(session.status, action.status) ||
        action.status === session.status
      ) {
        return session;
      }
      return bump({ ...session, status: action.status }, action.now);

    case 'set-active-photo':
    case 'setActivePhoto':
    case 'select-photo':
      if (
        !session.photoIds.includes(action.photoId) ||
        session.activePhotoId === action.photoId ||
        session.status === 'completed' ||
        session.status === 'discarded'
      ) {
        return session;
      }
      return bump({ ...session, activePhotoId: action.photoId }, action.now);

    case 'mark-persisted': {
      const revision = action.revision ?? session.revision;
      if (
        revision < 0 ||
        revision > session.revision ||
        revision < session.lastPersistedRevision ||
        revision === session.lastPersistedRevision
      ) {
        return session;
      }
      return { ...session, lastPersistedRevision: revision };
    }

    case 'set-persistence-status':
      if (session.persistenceStatus === action.persistenceStatus) return session;
      return { ...session, persistenceStatus: action.persistenceStatus };

    case 'touch':
      return session.status === 'completed' || session.status === 'discarded'
        ? session
        : bump(session, action.now);
  }
}

export const reduceEditingSession = editingSessionReducer;
export const createSession = createEditingSession;
