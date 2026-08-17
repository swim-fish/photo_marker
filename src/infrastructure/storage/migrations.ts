import { failure, success, type Result } from '../../domain/result';

/** The independently versioned shape of records stored in the draft database. */
export const CURRENT_RECORD_SCHEMA_VERSION = 1;

export type RecordMigrationErrorCode = 'incompatible-version' | 'migration-failed';

export type MigratableDraftRecord = Readonly<Record<string, unknown>> & {
  recordSchemaVersion?: unknown;
};

export type MigratedDraftRecord = Readonly<Record<string, unknown>> & {
  recordSchemaVersion: number;
};

export type RecordMigration = (
  record: MigratableDraftRecord,
  fromVersion: number,
) => MigratableDraftRecord;

/**
 * Apply only additive record migrations in memory. The caller writes the returned value in a new
 * transaction, so a failed migration cannot alter the previous readable record.
 */
export function migrateDraftRecord(
  input: unknown,
  migrate: RecordMigration = defaultRecordMigration,
  targetVersion = CURRENT_RECORD_SCHEMA_VERSION,
): Result<MigratedDraftRecord, RecordMigrationErrorCode> {
  if (!isRecord(input)) return failure('migration-failed');

  const sourceVersion = readRecordVersion(input);
  if (sourceVersion > targetVersion) return failure('incompatible-version');

  let current: MigratableDraftRecord = input;
  let version = sourceVersion;
  try {
    while (version < targetVersion) {
      current = migrate(current, version);
      const nextVersion = readRecordVersion(current);
      if (nextVersion <= version || nextVersion > targetVersion) {
        return failure('migration-failed');
      }
      version = nextVersion;
    }
  } catch {
    return failure('migration-failed');
  }

  if (version === 0 && targetVersion === 0) {
    return success({ ...current, recordSchemaVersion: 0 });
  }
  return success({ ...current, recordSchemaVersion: version });
}

/** Default migration for the initial record schema: add the explicit version marker. */
export function defaultRecordMigration(
  record: MigratableDraftRecord,
  fromVersion: number,
): MigratableDraftRecord {
  if (fromVersion === 0) return { ...record, recordSchemaVersion: 1 };
  throw new Error(`No migration registered for record schema ${fromVersion}.`);
}

function readRecordVersion(record: MigratableDraftRecord): number {
  if (record.recordSchemaVersion === undefined) return 0;
  if (
    typeof record.recordSchemaVersion !== 'number' ||
    !Number.isInteger(record.recordSchemaVersion) ||
    record.recordSchemaVersion < 0
  ) {
    throw new Error('Invalid record schema version.');
  }
  return record.recordSchemaVersion;
}

function isRecord(input: unknown): input is MigratableDraftRecord {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}
