import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  deleteDraftDatabase,
  openDraftDatabase,
} from '../../../src/infrastructure/storage/database';
import { PreferencesRepository } from '../../../src/infrastructure/storage/preferencesRepository';
import { createEditingSession } from '../../../src/domain/drafts/editingSession';
import { DraftRepository } from '../../../src/infrastructure/storage/draftRepository';
import { defaultTemplate } from '../../../src/domain/templates/types';

describe('unified preferences transactions', () => {
  beforeEach(async () => {
    await deleteDraftDatabase();
  });

  it('roundtrips canonical defaults and keeps them after session cleanup', async () => {
    const db = await openDraftDatabase();
    const preferences = new PreferencesRepository(db);
    expect(
      (
        await preferences.saveCornerDefaults({
          'top-left': '現勘',
          'top-right': '',
          'bottom-left': '',
          'bottom-right': '記錄員',
        })
      ).ok,
    ).toBe(true);
    const drafts = new DraftRepository({ database: db });
    await drafts.save({ session: createEditingSession({ id: 's', photoIds: ['p'] }), photos: [] });
    await drafts.cleanup('s', 'discarded');
    const restored = await preferences.loadPreferences();
    expect(restored.ok && restored.value.cornerTexts['top-left']).toBe('現勘');
    db.close();
  });

  it('aborts an asset and its referencing template together', async () => {
    const db = await openDraftDatabase();
    const preferences = new PreferencesRepository(db, () => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const asset = {
      id: 'logo',
      mime: 'image/png' as const,
      blob: new Blob(['png']),
      sourceBytes: new Uint8Array([1]).buffer,
      width: 1,
      height: 1,
      digest: 'fixture',
      version: 1 as const,
    };
    const template = {
      ...defaultTemplate,
      id: 'custom',
      watermark: { ...defaultTemplate.watermark, kind: 'image' as const, assetId: 'logo' },
    };
    const saved = await preferences.saveTemplate(template, [asset]);
    expect(saved.ok).toBe(false);
    if (!saved.ok) expect(saved.error.code).toBe('quota-exceeded');
    expect(await db.get('watermarkAssets', 'logo')).toBeUndefined();
    expect(await db.get('templates', 'custom')).toBeUndefined();
    db.close();
  });

  it('rejects dangling asset references without reporting success', async () => {
    const db = await openDraftDatabase();
    const preferences = new PreferencesRepository(db);
    const saved = await preferences.saveTemplate({
      ...defaultTemplate,
      id: 'missing',
      watermark: { ...defaultTemplate.watermark, kind: 'image', assetId: 'absent' },
    });
    expect(saved.ok).toBe(false);
    expect(await db.get('templates', 'missing')).toBeUndefined();
    db.close();
  });
});

describe('immutable shared assets', () => {
  it('rejects replacement bytes for an asset referenced by another template', async () => {
    const db = await openDraftDatabase({ name: 'immutable-assets' });
    const repository = new PreferencesRepository(db);
    const asset = {
      id: 'shared',
      version: 1 as const,
      mime: 'image/png' as const,
      blob: new Blob(['a']),
      sourceBytes: new Uint8Array([1]).buffer,
      width: 1,
      height: 1,
      digest: 'a',
    };
    const template = {
      ...defaultTemplate,
      id: 'one',
      watermark: { ...defaultTemplate.watermark, kind: 'image' as const, assetId: asset.id },
    };
    expect((await repository.saveTemplate(template, [asset])).ok).toBe(true);
    expect((await repository.saveTemplate({ ...template, id: 'two' }, [asset])).ok).toBe(true);
    expect(
      (
        await repository.saveTemplate({ ...template, id: 'bad' }, [
          { ...asset, sourceBytes: new Uint8Array([2]).buffer, digest: 'b' },
        ])
      ).ok,
    ).toBe(false);
    expect((await db.get('watermarkAssets', 'shared'))?.digest).toBe('a');
    expect(await db.get('templates', 'bad')).toBeUndefined();
    db.close();
  });
});
