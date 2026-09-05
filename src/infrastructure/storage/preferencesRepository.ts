import { sanitizeTemplate } from '../../domain/templates/templateService';
import { sameAsset } from './immutableAsset';
import { failure, success, type Result } from '../../domain/result';
import {
  emptyCornerTexts,
  type AnnotationTemplate,
  type CornerTexts,
  type EditorPreferences,
} from '../../domain/templates/types';
import type { WatermarkAsset } from '../../domain/watermarks/types';
import { openDraftDatabase, type DraftDatabase } from './database';

type SettingsError =
  'validation' | 'quota-exceeded' | 'incompatible-version' | 'storage-error' | 'asset-not-found';
export type SettingsResult<T> = Result<T, SettingsError>;

export class PreferencesRepository {
  constructor(
    private readonly supplied?: DraftDatabase,
    private readonly beforeCommit?: () => void,
  ) {}

  private async run<T>(operation: (db: DraftDatabase) => Promise<T>): Promise<SettingsResult<T>> {
    let db: DraftDatabase | undefined;
    try {
      db = this.supplied ?? (await openDraftDatabase());
      return success(await operation(db));
    } catch (error) {
      const code =
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        error.name === 'QuotaExceededError'
          ? 'quota-exceeded'
          : error instanceof Error &&
              ['validation', 'incompatible-version', 'asset-not-found'].includes(error.message)
            ? (error.message as SettingsError)
            : 'storage-error';
      return failure(code);
    } finally {
      if (!this.supplied) db?.close();
    }
  }

  loadPreferences(): Promise<SettingsResult<EditorPreferences>> {
    return this.run(async (db) => {
      const value = await db.get('preferences', 'editor');
      if (value && value.version !== 1) throw new Error('incompatible-version');
      return value ?? { version: 1, cornerTexts: emptyCornerTexts() };
    });
  }

  saveCornerDefaults(cornerTexts: CornerTexts): Promise<SettingsResult<void>> {
    return this.updatePreferences((current) => ({ ...current, cornerTexts }));
  }

  setDefaultTemplate(defaultTemplateId: string): Promise<SettingsResult<void>> {
    return this.updatePreferences((current) => ({ ...current, defaultTemplateId }));
  }

  private updatePreferences(
    update: (current: EditorPreferences) => EditorPreferences,
  ): Promise<SettingsResult<void>> {
    return this.run(async (db) => {
      const tx = db.transaction('preferences', 'readwrite');
      try {
        const current = (await tx.store.get('editor')) ?? {
          version: 1,
          cornerTexts: emptyCornerTexts(),
        };
        if (current.version !== 1) throw new Error('incompatible-version');
        const next = update(current);
        if (
          Object.keys(emptyCornerTexts()).some(
            (key) => typeof next.cornerTexts[key as keyof CornerTexts] !== 'string',
          )
        )
          throw new Error('validation');
        await tx.store.put(next, 'editor');
        this.beforeCommit?.();
        await tx.done;
      } catch (error) {
        try {
          tx.abort();
        } catch {
          /* Transaction may already be aborted. */
        }
        await tx.done.catch(() => undefined);
        throw error;
      }
    });
  }

  listTemplates(): Promise<SettingsResult<AnnotationTemplate[]>> {
    return this.run(async (db) => {
      const records = await db.getAll('templates');
      if (records.some((record) => record.version !== 1)) throw new Error('incompatible-version');
      const clean = records.map(sanitizeTemplate);
      if (clean.some((record) => !record)) throw new Error('validation');
      return clean as AnnotationTemplate[];
    });
  }

  saveTemplate(
    template: AnnotationTemplate,
    assets: readonly WatermarkAsset[] = [],
    makeDefault = false,
  ): Promise<SettingsResult<void>> {
    return this.run(async (db) => {
      const clean = sanitizeTemplate(template);
      if (!clean) throw new Error('validation');
      const tx = db.transaction(['templates', 'watermarkAssets', 'preferences'], 'readwrite');
      try {
        for (const asset of assets) {
          const existing = await tx.objectStore('watermarkAssets').get(asset.id);
          if (existing && !sameAsset(existing, asset)) throw new Error('validation');
          if (!existing) await tx.objectStore('watermarkAssets').add(asset, asset.id);
        }
        if (
          template.watermark.kind === 'image' &&
          (!template.watermark.assetId ||
            !(await tx.objectStore('watermarkAssets').get(template.watermark.assetId)))
        )
          throw new Error('asset-not-found');
        await tx.objectStore('templates').put(clean, clean.id);
        if (makeDefault) {
          const current = (await tx.objectStore('preferences').get('editor')) ?? {
            version: 1,
            cornerTexts: emptyCornerTexts(),
          };
          if (current.version !== 1) throw new Error('incompatible-version');
          await tx
            .objectStore('preferences')
            .put({ ...current, defaultTemplateId: clean.id }, 'editor');
        }
        this.beforeCommit?.();
        await tx.done;
      } catch (error) {
        try {
          tx.abort();
        } catch {
          /* Transaction may already be aborted. */
        }
        await tx.done.catch(() => undefined);
        throw error;
      }
    });
  }

  getAsset(id: string): Promise<SettingsResult<WatermarkAsset>> {
    return this.run(async (db) => {
      const record = await db.get('watermarkAssets', id);
      if (!record) throw new Error('asset-not-found');
      if (record.version !== 1) throw new Error('incompatible-version');
      return { ...record, blob: new Blob([record.sourceBytes], { type: record.mime }) };
    });
  }
}
