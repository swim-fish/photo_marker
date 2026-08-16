import type { EditingSession, EditingSessionStatus } from './types';

export function selectActivePhotoId(session: EditingSession): string {
  return session.activePhotoId;
}

export function selectActivePhoto<T extends { id: string }>(
  session: EditingSession,
  photos: readonly T[] | Readonly<Record<string, T>>,
): T | undefined {
  if (Array.isArray(photos)) return photos.find((photo) => photo.id === session.activePhotoId);
  return (photos as Readonly<Record<string, T>>)[session.activePhotoId];
}

export function selectSessionStatus(session: EditingSession): EditingSessionStatus {
  return session.status;
}

export function selectRevision(session: EditingSession): number {
  return session.revision;
}

export function selectIsLocallySaved(session: EditingSession): boolean {
  return session.lastPersistedRevision === session.revision;
}

export function selectCanReviewExport(session: EditingSession): boolean {
  return session.status === 'reviewing' || session.status === 'partiallyExported';
}

export function selectPhotoIds(session: EditingSession): readonly string[] {
  return session.photoIds;
}
