<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import DiscardDraftDialog from './DiscardDraftDialog.svelte';
  import TemplateEditor from '../templates/TemplateEditor.svelte';
  import TemplatePicker from '../templates/TemplatePicker.svelte';
  import {
    builtinTemplates,
    applyTemplate,
    sanitizeTemplate,
  } from '../../domain/templates/templateService';
  import { ensureEditorFont } from '../../renderer/font';
  import EditorShell from './EditorShell.svelte';
  import Button from '../ui/Button.svelte';
  import CoordinateOptions from '../coordinates/CoordinateOptions.svelte';
  import CoordinateReadout from '../coordinates/CoordinateReadout.svelte';
  import CornerPlacement from '../ui/CornerPlacement.svelte';
  import NumberStepper from '../ui/NumberStepper.svelte';
  import WatermarkEditor from '../watermarks/WatermarkEditor.svelte';
  import { arrangeWatermark, resolveWatermarkArrangement } from '../../domain/watermarks/layout';
  import { importWatermark } from '../../domain/watermarks/intake';
  import type {
    WatermarkArrangement,
    WatermarkAsset,
    WatermarkRenderLayer,
  } from '../../domain/watermarks/types';
  import RgbaPicker from '../ui/RgbaPicker.svelte';
  import { rgbHex } from '../../domain/overlays/color';
  import MapPreview from '../map/MapPreview.svelte';
  import MapConsent from '../map/MapConsent.svelte';
  import { grantMapConsent, readMapConsent, revokeMapConsent } from '../../domain/map/mapConsent';
  import { requestCurrentLocation } from '../../infrastructure/platform/geolocation';
  import { importPhoto } from '../../domain/photos/importPhoto';
  import type { SourcePhoto } from '../../domain/photos/types';
  import type { CoordinateRecord } from '../../domain/coordinates/types';
  import { replaceWorkingCoordinate } from '../../domain/coordinates/workingCoordinate';
  import { formatCoordinateOverlay } from '../../domain/overlays/coordinateOverlay';
  import { buildCornerOverlays } from '../../domain/editor/cornerLayout';
  import { formatCoordinate } from '../../domain/coordinates/formatCoordinate';
  import CornerTextEditor from '../overlays/CornerTextEditor.svelte';
  import type { TextOverlay } from '../../domain/overlays/types';
  import { createEditingSession, editingSessionReducer } from '../../domain/drafts/editingSession';
  import type { EditingSession } from '../../domain/drafts/types';
  import {
    DraftRepository,
    consumeSharedFiles,
    type DraftSnapshot,
  } from '../../infrastructure/storage/draftRepository';
  import { PreferencesRepository } from '../../infrastructure/storage/preferencesRepository';
  import {
    defaultTemplate,
    emptyCornerTexts,
    type AnnotationTemplate,
    type EditorAppearance,
    type CornerTexts,
  } from '../../domain/templates/types';
  import {
    beginSettings,
    commitSettings,
    type SettingsTransaction,
    type EditorView,
  } from '../../domain/editor/editorState';
  import { createRenderWorkerClient } from '../../infrastructure/platform/renderWorkerClient';
  import { exportPhoto } from '../../domain/export/exportPhoto';
  import type { ExportConfiguration } from '../../domain/export/types';
  import {
    establishOfflineReadiness,
    requestWorkerReadiness,
  } from '../../infrastructure/pwa/readiness';
  import { openDraftDatabase } from '../../infrastructure/storage/database';

  type EditSettings = {
    template: AnnotationTemplate;
    texts: CornerTexts;
    coordinate: CoordinateRecord | null;
  };
  let templateItems = $state<AnnotationTemplate[]>([...builtinTemplates]);
  let defaultTemplateId = $state<string>('outdoor');
  let templateRequest = 0;
  let photo = $state<SourcePhoto | null>(null);
  let session = $state<EditingSession | null>(null);
  let settings = $state<EditSettings>({
    template: structuredClone(defaultTemplate),
    texts: emptyCornerTexts(),
    coordinate: null,
  });
  let pending = $state<SettingsTransaction<EditSettings> | null>(null);
  let templateEditor = $state<TemplateEditor>();
  let creatingTemplate = $state(false);
  let templateHeading = $state('編輯樣板'),
    templateSubtitle = $state('');
  let discardOpen = $state(false),
    discarding = $state(false),
    discardError = $state('');
  let view = $state<EditorView>('editor');
  let watermarkArrangement = $state<WatermarkArrangement | null>(null);
  let watermarkAssets = $state<WatermarkAsset[]>([]);
  let overlays = $state<TextOverlay[]>([]);
  let previewUrl = $state('');
  let previewBusy = $state(false);
  let sourceUrl = $state('');
  let loading = $state(false);
  let exporting = $state(false);
  let ready = $state(false);
  let message = $state('');
  let error = $state('');
  let saved = $state('');
  let recovery = $state<DraftSnapshot | null>(null);
  let config = $state<ExportConfiguration | null>(null);
  let colorValid = $state(true);
  let mapConsented = $state(false),
    consentOpen = $state(false),
    online = $state(true),
    locating = $state(false);
  let sourceControlsOpen = $state(false);
  let latitude = $state(''),
    longitude = $state('');
  let locationCandidate = $state<CoordinateRecord | null>(null);
  let locationRequest = 0;
  let selectedFiles = $state<HTMLInputElement>();
  let originalFiles = $state<HTMLInputElement>();
  let androidFilePicker = $state(false);
  let importGeneration = 0;
  let renderGeneration = 0;
  let saveTail: Promise<void> = Promise.resolve();
  const drafts = new DraftRepository();
  const preferences = new PreferencesRepository();
  const renderer = createRenderWorkerClient();
  const display = $derived(pending?.value ?? settings);
  const title = $derived(
    !photo
      ? 'Photo Marker'
      : view === 'exportReview'
        ? '匯出照片'
        : view === 'exportResult'
          ? '照片已準備好'
          : view === 'coordinate'
            ? '座標設定'
            : view === 'map'
              ? '選取照片位置'
              : view === 'cornerText'
                ? '四角文字'
                : view === 'textStyle'
                  ? '文字樣式'
                  : view === 'watermark'
                    ? '浮水印'
                    : view === 'templateEdit'
                      ? templateHeading
                      : view === 'templates'
                        ? '選擇樣板'
                        : '編輯照片',
  );

  function updateAppearance(update: Partial<EditorAppearance>): void {
    if (pending)
      pending.value.template = {
        ...pending.value.template,
        appearance: { ...pending.value.template.appearance, ...update },
      };
  }
  function sourceLabel(value: CoordinateRecord): string {
    return value.provenance === 'CAPTURE_METADATA'
      ? '照片 GPS'
      : value.provenance === 'CURRENT_GPS'
        ? 'CURRENT GPS'
        : value.provenance === 'MAP_SELECTION'
          ? '地圖選取'
          : '手動輸入';
  }
  function coordinateSummary(value = settings): string {
    if (!value.coordinate) return '可補上位置，或直接加上文字。';
    if (value.template.coordinateFormat === 'WGS84_DD')
      return `${value.coordinate.latitude.toFixed(6)}, ${value.coordinate.longitude.toFixed(6)}`;
    const formatted = formatCoordinate(value.coordinate, value.template.coordinateFormat, {
      zone: value.template.zone,
      precision: value.template.precision,
    });
    return formatted.ok ? formatted.value.text : '此格式無法表示目前位置';
  }
  function buildOverlays(value: EditSettings): TextOverlay[] | null {
    if (!photo) return [];
    const coordinate = value.coordinate
      ? { ...value.coordinate, zone: value.template.zone, precision: value.template.precision }
      : null;
    if (
      coordinate &&
      !formatCoordinate(coordinate, value.template.coordinateFormat, {
        zone: value.template.zone,
        precision: value.template.precision,
      }).ok
    )
      return null;
    const text = coordinate
      ? formatCoordinateOverlay(
          coordinate,
          sourceLabel(coordinate),
          value.template.coordinateFormat,
        )
      : '';
    const context =
      typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
    const result = buildCornerOverlays(
      photo.id,
      { width: photo.displayWidth, height: photo.displayHeight },
      value.template,
      value.texts,
      text,
      context
        ? (text, fontSize) => {
            context.font = `${fontSize}px "Noto Sans TC", sans-serif`;
            return context.measureText(text).width;
          }
        : undefined,
    );
    return result.ok ? result.value : null;
  }
  function watermarkLayer(value: EditSettings): WatermarkRenderLayer | undefined {
    if (!photo) return undefined;
    const image = watermarkAssets.find((asset) => asset.id === value.template.watermark.assetId);
    const arrangement = arrangeWatermark(
      photo.id,
      photo.displayWidth / photo.displayHeight,
      value.template.watermark,
      image ? image.width / image.height : 1,
    );
    if (!arrangement) return undefined;
    return {
      config: value.template.watermark,
      arrangement: resolveWatermarkArrangement(arrangement, watermarkArrangement),
      assets: watermarkAssets,
    };
  }
  async function chooseWatermark(file: File): Promise<void> {
    const id = photo?.id,
      revision = pending?.baseRevision,
      transaction = pending;
    const result = await importWatermark(file);
    if (
      !pending ||
      pending !== transaction ||
      photo?.id !== id ||
      pending.baseRevision !== revision ||
      view !== 'watermark'
    )
      return;
    if (!result.ok) {
      error = 'PNG 浮水印無法讀取，請檢查格式、尺寸與檔案大小。';
      return;
    }
    watermarkAssets = [
      ...watermarkAssets.filter((asset) => asset.id === settings.template.watermark.assetId),
      result.value,
    ];
    pending.value.template = {
      ...pending.value.template,
      watermark: {
        ...pending.value.template.watermark,
        kind: 'image',
        mode: 'single',
        assetId: result.value.id,
      },
    };
  }
  async function selectTemplate(template: AnnotationTemplate): Promise<void> {
    if (!pending) return;
    const request = ++templateRequest,
      transaction = pending;
    const result = applyTemplate(template, $state.snapshot(pending.value));
    if (!result) {
      error = '樣板資料無法讀取。';
      return;
    }
    if (template.watermark.kind === 'image' && template.watermark.assetId) {
      const asset = await preferences.getAsset(template.watermark.assetId);
      if (request !== templateRequest || pending !== transaction) return;
      if (!asset.ok) {
        error = '樣板 PNG 無法讀取，請重新選取圖片。';
        return;
      }
      watermarkAssets = [
        ...watermarkAssets.filter((item) => item.id !== asset.value.id),
        asset.value,
      ];
    }
    if (request === templateRequest && pending === transaction) pending.value = result;
  }
  function editTemplate(creating: boolean): void {
    creatingTemplate = creating;
    templateHeading = creating ? '自訂樣板' : '編輯樣板';
    view = 'templateEdit';
    error = '';
    message = '';
  }
  async function saveEditedTemplate(
    value: AnnotationTemplate,
    assets: readonly WatermarkAsset[],
    makeDefault: boolean,
  ): Promise<boolean> {
    if (!pending) return false;
    const transaction = pending;
    const builtin = builtinTemplates.some((t) => t.id === value.id);
    const template = sanitizeTemplate({
      ...value,
      id: creatingTemplate ? crypto.randomUUID() : value.id,
    });
    if (!template) return false;
    const result = await preferences.saveTemplate(
      template,
      $state.snapshot(
        [...watermarkAssets, ...assets].filter((a) => a.id === template.watermark.assetId),
      ),
      makeDefault,
    );
    if (!result.ok) return false;
    if (makeDefault) defaultTemplateId = template.id;
    templateItems = [...templateItems.filter((t) => t.id !== template.id), template];
    watermarkAssets = [
      ...watermarkAssets.filter((a) => !assets.some((b) => b.id === a.id)),
      ...assets,
    ];
    if (pending === transaction) {
      pending.value.template = template;
      pending.value.texts = { ...template.defaultTexts! };
      view = 'templates';
      message = builtin && !creatingTemplate ? '已儲存樣板設定' : '已儲存樣板';
      error = '';
    }
    return true;
  }
  async function setDefaultTemplate(id: string): Promise<void> {
    const result = await preferences.setDefaultTemplate(id);
    if (result.ok) {
      defaultTemplateId = id;
      message = '已設定新照片預設樣板';
    } else error = '預設樣板儲存失敗，請重試。';
  }
  function snapshot(): DraftSnapshot | null {
    if (!photo || !session) return null;
    return $state.snapshot({
      session,
      photos: [photo],
      coordinates: settings.coordinate ? [settings.coordinate] : [],
      overlays,
      editorTemplate: settings.template,
      cornerTexts: settings.texts,
      exportConfigurations: config ? [config] : [],
      watermarkConfigs: [settings.template.watermark],
      watermarkArrangements: watermarkArrangement ? [watermarkArrangement] : [],
    });
  }
  function saveDraft(touch = true): void {
    if (!session) return;
    if (touch) session = editingSessionReducer(session, { type: 'touch' });
    const value = snapshot();
    if (!value) return;
    saved = '儲存中…';
    const assets = $state.snapshot(watermarkAssets);
    saveTail = saveTail
      .then(async () => {
        const result = await drafts.save(value, assets);
        if (session?.id !== value.session.id || session.revision !== value.session.revision) return;
        saved = result.ok ? '已自動儲存草稿' : '草稿未儲存';
        if (!result.ok) error = '無法儲存草稿，請保留此頁並重試；仍可匯出目前照片。';
      })
      .catch(() => {
        saved = '草稿未儲存';
      });
  }
  async function discardDraft(): Promise<void> {
    const id = session?.id ?? recovery?.session.id;
    if (!id || discarding) return;
    discarding = true;
    discardError = '';
    importGeneration++;
    locationRequest++;
    templateRequest++;
    loading = false;
    try {
      // Drain queued autosaves before deleting, so they cannot recreate the discarded draft.
      await saveTail;
      const result = await drafts.discard(id);
      if (!result.ok) {
        discardError = '草稿未能刪除，編輯內容仍保留。請重試。';
        return;
      }
      renderGeneration++;
      if (previewUrl && previewUrl !== sourceUrl) URL.revokeObjectURL(previewUrl);
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      photo = null;
      session = null;
      pending = null;
      config = null;
      overlays = [];
      watermarkAssets = [];
      watermarkArrangement = null;
      previewUrl = '';
      sourceUrl = '';
      previewBusy = false;
      view = 'editor';
      saved = '';
      error = '';
      message = '';
      recovery = null;
      if (selectedFiles) selectedFiles.value = '';
      const remaining = await drafts.restoreLatest();
      recovery = remaining.ok ? remaining.value : null;
      discardOpen = false;
    } catch {
      discardError = '草稿未能刪除，請重試。';
    } finally {
      discarding = false;
    }
  }
  function openSettings(next: EditorView): void {
    if (!photo || !session || loading) return;
    pending = beginSettings(photo.id, session.revision, $state.snapshot(settings));
    view = next;
    sourceControlsOpen = !settings.coordinate;
    colorValid = true;
    error = '';
    message = '';
    locationCandidate = null;
    latitude = settings.coordinate?.latitude.toString() ?? '';
    longitude = settings.coordinate?.longitude.toString() ?? '';
  }
  function cancelSettings(): void {
    templateRequest++;
    locationRequest++;
    locating = false;
    consentOpen = false;
    locationCandidate = null;
    pending = null;
    view = 'editor';
    error = '';
  }
  function applySettings(): void {
    if (!pending || !photo || !session) return;
    if (!colorValid) {
      error = '請先修正色彩欄位。';
      return;
    }
    const value = commitSettings($state.snapshot(pending), photo.id, session.revision);
    if (!value) {
      error = '照片已變更，請重新開啟設定。';
      return;
    }
    const clean = sanitizeTemplate(value.template);
    if (!clean) {
      error = '樣式或浮水印設定無效，請檢查輸入。';
      return;
    }
    value.template = clean;
    const placed = buildOverlays(value);
    if (!placed) {
      error = '文字超出照片範圍或座標格式無法表示此位置，請縮短文字、縮小字級或調整格式。';
      return;
    }
    const layer = watermarkLayer(value);
    if (
      value.template.watermark.enabled &&
      (!layer ||
        (value.template.watermark.kind === 'image' &&
          !watermarkAssets.some((asset) => asset.id === value.template.watermark.assetId)))
    ) {
      error = '浮水印無法排列或缺少 PNG，請縮短文字、降低密度或重新選取圖片。';
      return;
    }
    watermarkArrangement = layer?.arrangement ?? null;
    settings = value;
    error = '';
    overlays = placed;
    pending = null;
    view = 'editor';
    saveDraft();
  }
  function chooseCoordinate(
    lat: number,
    lng: number,
    provenance: 'MANUAL_INPUT' | 'MAP_SELECTION',
  ): void {
    if (!photo || !pending) return;
    const result = replaceWorkingCoordinate(pending.value.coordinate, {
      id: crypto.randomUUID(),
      photoId: photo.id,
      latitude: lat,
      longitude: lng,
      provenance,
      inputFormat: 'WGS84_DD',
      displayFormat: pending.value.template.coordinateFormat,
      zone: pending.value.template.zone,
      precision: pending.value.template.precision,
    });
    if (!result.ok) {
      error = '請輸入有效經緯度：緯度 −90～90、經度 −180～180。';
      return;
    }
    pending.value.coordinate = result.value;
    applySettings();
  }
  function requestMap(): void {
    if (mapConsented) view = 'map';
    else consentOpen = true;
  }
  async function locate(): Promise<void> {
    if (!photo || !pending || !navigator.geolocation) {
      error = '此裝置無法提供位置，請使用手動輸入或地圖。';
      return;
    }
    const request = ++locationRequest,
      photoId = photo.id;
    locating = true;
    error = '';
    locationCandidate = null;
    const result = await requestCurrentLocation(navigator.geolocation, {
      id: crypto.randomUUID(),
      photoId,
      maxAccuracyMeters: Number.MAX_VALUE,
    });
    if (request !== locationRequest || !pending || photo?.id !== photoId) return;
    locating = false;
    if (result.ok) locationCandidate = result.value;
    else error = '無法取得目前位置，請檢查定位權限或改用手動輸入。';
  }
  function defaultConfiguration(source: SourcePhoto): ExportConfiguration {
    const stem = source.sourceName.replace(/\.[^.]+$/, '');
    return {
      photoId: source.id,
      format: source.sourceMime,
      width: source.rawWidth,
      height: source.rawHeight,
      quality: source.sourceMime === 'image/jpeg' ? 0.92 : null,
      metadataMode: 'preserveSupported',
      orientationMode: 'preserveRaw',
      fallback: null,
      outputName: `${stem}-annotated.${source.sourceMime === 'image/png' ? 'png' : 'jpg'}`,
      saveMethod: 'download',
    };
  }
  async function handleFile(file: File | undefined): Promise<void> {
    if (!file) return;
    locationRequest++;
    locating = false;
    locationCandidate = null;
    const generation = ++importGeneration;
    loading = true;
    error = '';
    const id = crypto.randomUUID();
    try {
      const result = await importPhoto(file, { id: crypto.randomUUID(), sessionId: id });
      if (generation !== importGeneration) return;
      if (!result.ok) {
        error = '無法讀取這張照片。請選取支援範圍內的 JPEG 或 PNG。';
        return;
      }
      await ensureEditorFont();
      const defaults = await preferences.loadPreferences();
      const templates = await preferences.listTemplates();
      if (generation !== importGeneration) return;
      await saveTail;
      if (generation !== importGeneration) return;
      templateItems = [
        ...builtinTemplates.filter(
          (t) => !templates.ok || !templates.value.some((saved) => saved.id === t.id),
        ),
        ...(templates.ok ? templates.value : []),
      ];
      defaultTemplateId = defaults.ok ? (defaults.value.defaultTemplateId ?? 'outdoor') : 'outdoor';
      photo = result.value;
      session = editingSessionReducer(createEditingSession({ id, photoIds: [photo.id] }), {
        type: 'transition',
        status: 'editing',
      });
      const template =
        defaults.ok && templates.ok
          ? (templateItems.find((item) => item.id === defaults.value.defaultTemplateId) ??
            defaultTemplate)
          : defaultTemplate;
      if (
        defaults.ok &&
        defaults.value.defaultTemplateId &&
        !templateItems.some((item) => item.id === defaults.value.defaultTemplateId)
      )
        error = '預設樣板已不存在，已使用內建樣板。';
      const gps = photo.metadataSummary.captureGps;
      const coordinate = gps
        ? replaceWorkingCoordinate(null, {
            id: crypto.randomUUID(),
            photoId: photo.id,
            ...gps,
            provenance: 'CAPTURE_METADATA',
            inputFormat: 'WGS84_DD',
            displayFormat: template.coordinateFormat,
          })
        : null;
      settings = {
        template: $state.snapshot(template),
        texts: $state.snapshot(
          template.defaultTexts ?? (defaults.ok ? defaults.value.cornerTexts : emptyCornerTexts()),
        ),
        coordinate: coordinate?.ok ? coordinate.value : null,
      };
      watermarkAssets = [];
      if (template.watermark.kind === 'image' && template.watermark.assetId) {
        const asset = await preferences.getAsset(template.watermark.assetId);
        if (generation !== importGeneration) return;
        if (asset.ok) watermarkAssets = [asset.value];
        else {
          settings.template = structuredClone(defaultTemplate);
          error = '樣板 PNG 無法讀取，已使用內建樣板。';
        }
      }
      watermarkArrangement = null;
      watermarkArrangement = watermarkLayer(settings)?.arrangement ?? null;
      config = defaultConfiguration(photo);
      overlays = buildOverlays(settings) ?? [];
      pending = null;
      view = 'editor';
      if (previewUrl && previewUrl !== sourceUrl) URL.revokeObjectURL(previewUrl);
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      sourceUrl = URL.createObjectURL(photo.sourceBlob);
      previewUrl = sourceUrl;
      recovery = null;
      saveDraft(false);
      if (!defaults.ok || !templates.ok) error = '無法讀取儲存的設定，已使用內建樣板。';
    } catch {
      if (generation === importGeneration) error = '讀取照片失敗，請重試。';
    } finally {
      if (generation === importGeneration) loading = false;
    }
  }
  async function restoreDraft(): Promise<void> {
    if (!recovery || !recovery.photos[0]) return;
    locationRequest++;
    locating = false;
    locationCandidate = null;
    const generation = ++importGeneration,
      draft = $state.snapshot(recovery);
    const template = sanitizeTemplate(draft.editorTemplate ?? defaultTemplate);
    if (!template) {
      error = '草稿樣板資料無法讀取。';
      return;
    }
    let assets: WatermarkAsset[] = [];
    if (template.watermark.kind === 'image' && template.watermark.assetId) {
      const asset = await preferences.getAsset(template.watermark.assetId);
      if (generation !== importGeneration) return;
      if (!asset.ok) {
        error = 'PNG 浮水印無法還原，請重新選取。';
        return;
      }
      assets = [asset.value];
    }
    const storedTemplates = await preferences.listTemplates(),
      defaults = await preferences.loadPreferences();
    if (generation !== importGeneration) return;
    templateItems = [...builtinTemplates, ...(storedTemplates.ok ? storedTemplates.value : [])];
    defaultTemplateId = defaults.ok ? (defaults.value.defaultTemplateId ?? 'outdoor') : 'outdoor';
    photo = draft.photos[0];
    session = draft.session;
    settings = {
      template,
      texts: draft.cornerTexts ?? emptyCornerTexts(),
      coordinate: draft.coordinates?.[0] ?? null,
    };
    watermarkAssets = assets;
    watermarkArrangement = draft.watermarkArrangements?.[0] ?? null;
    watermarkArrangement = watermarkLayer(settings)?.arrangement ?? null;
    config = draft.exportConfigurations?.[0] ?? defaultConfiguration(photo);
    const restoredOverlays = buildOverlays(settings);
    overlays = restoredOverlays ?? [];
    if (!restoredOverlays) error = '草稿文字或座標無法完整排入照片，請調整文字大小或內容。';
    pending = null;
    if (previewUrl && previewUrl !== sourceUrl) URL.revokeObjectURL(previewUrl);
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceUrl = URL.createObjectURL(photo.sourceBlob);
    previewUrl = sourceUrl;
    recovery = null;
    saved = '已還原草稿';
    view = 'editor';
  }
  async function confirmExport(method: 'download' | 'share'): Promise<void> {
    if (!photo || !config || exporting) return;
    const currentOverlays = buildOverlays(settings);
    if (!currentOverlays) {
      error = '文字或座標無法完整排入照片，請返回調整文字大小或內容後再匯出。';
      return;
    }
    overlays = currentOverlays;
    exporting = true;
    error = '';
    await saveTail;
    try {
      const result = await exportPhoto(
        photo,
        {
          ...$state.snapshot(config),
          saveMethod: method === 'share' ? 'webShare' : 'download',
          overlays: $state.snapshot(overlays),
          watermark: $state.snapshot(watermarkLayer(settings)),
        },
        { renderPhoto: (source, options) => renderer.render(source, options) },
      );
      if (result.ok && result.value.status === 'handedOff') {
        message = result.value.saveMethod === 'download' ? '下載已開始' : '已交由系統分享';
        view = 'exportResult';
      } else {
        error =
          result.ok && result.value.status === 'cancelled'
            ? '已取消分享，照片與草稿仍保留。'
            : '匯出失敗，請重試或改用下載。';
      }
    } catch {
      error = '匯出失敗，請重試。';
    } finally {
      exporting = false;
    }
  }
  $effect(() => {
    const source = photo;
    const value = $state.snapshot(display);
    if (!source) return;
    const items = buildOverlays(value);
    if (!items) return;
    const generation = ++renderGeneration;
    previewBusy = true;
    const timer = setTimeout(() => {
      void renderer
        .render(source.sourceBlob, {
          mode: 'preview',
          orientation: source.orientation,
          overlays: items,
          watermark: $state.snapshot(watermarkLayer(value)),
          outputFormat: 'image/png',
          metadataMode: 'removeSupported',
        })
        .then((result) => {
          if (generation !== renderGeneration) return;
          previewBusy = false;
          if (!result.ok) {
            error = '預覽無法產生，請調整設定或重試。';
            return;
          }
          if (previewUrl && previewUrl !== sourceUrl) URL.revokeObjectURL(previewUrl);
          previewUrl = URL.createObjectURL(result.value.blob);
        });
    }, 80);
    return () => {
      clearTimeout(timer);
      renderGeneration++;
    };
  });
  onMount(() => {
    androidFilePicker = /Android/i.test(navigator.userAgent);
    let mounted = true;
    mapConsented = readMapConsent(localStorage).status === 'granted';
    online = navigator.onLine;
    void (async () => {
      const draft = await drafts.restoreLatest();
      if (!mounted) return;
      if (draft.ok && !photo) recovery = draft.value;
      const shared = await consumeSharedFiles().catch(() => []);
      if (mounted && shared[0]) await handleFile(shared[0]);
      if ('serviceWorker' in navigator) {
        const result = await establishOfflineReadiness({
          isSecureContext: window.isSecureContext,
          requestWorkerReport: () => requestWorkerReadiness(navigator.serviceWorker),
          openDatabase: async () => {
            const db = await openDraftDatabase();
            db.close();
          },
        });
        if (mounted) ready = result.status === 'ready';
      }
    })();
    return () => {
      mounted = false;
    };
  });
  onDestroy(() => {
    locationRequest++;
    importGeneration++;
    renderGeneration++;
    renderer.close();
    drafts.close();
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    if (previewUrl && previewUrl !== sourceUrl) URL.revokeObjectURL(previewUrl);
  });
</script>

<svelte:window ononline={() => (online = true)} onoffline={() => (online = false)} />
<EditorShell
  {title}
  subtitle={view === 'templates'
    ? '一鍵套用，立即預覽'
    : view === 'templateEdit'
      ? templateSubtitle
      : view === 'coordinate'
        ? '顯示格式與照片上的放置位置'
        : photo
          ? `${photo.sourceName} · ${saved}`
          : '讓每張照片，都有位置。'}
  onBack={photo && view !== 'editor' && !exporting
    ? view === 'templateEdit'
      ? () => templateEditor?.back()
      : cancelSettings
    : undefined}
>
  <input
    class="file-input"
    bind:this={selectedFiles}
    aria-label="選取照片"
    type="file"
    accept={androidFilePicker ? undefined : 'image/jpeg,image/png'}
    disabled={loading || exporting}
    onchange={(event) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = '';
      void handleFile(file);
    }}
  />
  <input
    class="file-input"
    bind:this={originalFiles}
    aria-label="選取原始照片檔案"
    type="file"
    disabled={loading || exporting}
    onchange={(event) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = '';
      void handleFile(file);
    }}
  />
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  {#if loading}<p role="status">正在讀取照片…</p>
    <Button
      variant="secondary"
      onclick={() => {
        importGeneration++;
        loading = false;
      }}>取消讀取</Button
    >{/if}
  {#if !photo}
    <section class="welcome">
      <span class="eyebrow">PHOTO MARKER</span>
      <h2>選一張照片，<br />留下你的記錄。</h2>
      <p>讀取照片 GPS，加上座標與文字。<br />照片留在此裝置，無須上傳。</p>
    </section>
    <Button disabled={loading} onclick={() => selectedFiles?.click()}>選取手機照片</Button>
    <Button variant="secondary" disabled={loading} onclick={() => originalFiles?.click()}
      >從檔案選取原圖</Button
    >
    {#if androidFilePicker}<p class="muted">
        建議從「檔案」中的 DCIM／Camera 選取原圖；相簿選取器可能移除
        GPS。若系統提供「包含位置」，請勾選。
      </p>{/if}
    <p class="muted">支援 JPEG、PNG · 保留原始照片</p>
    {#if recovery}<section class="panel">
        <h2>繼續上次的記錄</h2>
        <p>{recovery.photos[0]?.sourceName}</p>
        <Button disabled={loading} onclick={restoreDraft}>還原草稿</Button>
        <button
          class="discard"
          disabled={loading}
          onclick={() => {
            discardError = '';
            discardOpen = true;
          }}>捨棄草稿</button
        >
      </section>{/if}
  {:else}
    {#if view !== 'map' && view !== 'templateEdit' && view !== 'coordinate'}<div
        class="photo"
        class:template-preview={view === 'templates'}
        class:editor-preview={view === 'editor'}
        aria-busy={previewBusy}
      >
        <img src={previewUrl || sourceUrl} alt="照片預覽" />
      </div>{/if}
    {#if view === 'editor'}
      <section class="panel coordinate-summary">
        <strong>{settings.coordinate ? '已取得照片位置' : '未讀取到照片 GPS'}</strong>
        <CoordinateReadout
          text={coordinateSummary()}
          format={settings.template.coordinateFormat}
          wrap={settings.template.coordinateWrap}
          label="照片座標"
        />
        <small
          >{settings.coordinate ? `來源：${sourceLabel(settings.coordinate)}` : '未設定座標'}</small
        >
        {#if !settings.coordinate}
          <p class="muted">
            選取器可能移除位置資訊。請從「檔案」中的 DCIM／Camera 選取 JPEG 或 PNG
            原圖，也可以手動設定位置。
          </p>
          <Button
            variant="secondary"
            disabled={loading || exporting}
            onclick={() => originalFiles?.click()}>從檔案選取原圖</Button
          >
        {/if}
      </section>
      <div class="tools">
        <Button variant="secondary" disabled={loading} onclick={() => openSettings('coordinate')}
          >座標</Button
        ><Button variant="secondary" disabled={loading} onclick={() => openSettings('cornerText')}
          >四角文字</Button
        ><Button variant="secondary" disabled={loading} onclick={() => openSettings('templates')}
          >樣板</Button
        >
      </div>
      <div class="bottom">
        <p class="muted">目前樣板：{settings.template.name}</p>
        <Button
          disabled={loading}
          onclick={() => {
            pending = null;
            view = 'exportReview';
          }}>儲存照片</Button
        ><Button variant="secondary" onclick={() => selectedFiles?.click()}>選取另一張照片</Button>
        <button
          class="discard"
          disabled={loading}
          onclick={() => {
            discardError = '';
            discardOpen = true;
          }}>捨棄草稿</button
        >
      </div>
    {:else if view === 'coordinate' && pending}
      <section class="coordinate-settings">
        <h2>顯示格式</h2>
        <div class="tools">
          {#each [{ id: 'WGS84_DD', label: 'WGS84' }, { id: 'TWD97_TM2', label: 'TWD97' }, { id: 'MGRS', label: 'MGRS' }] as format (format.id)}<button
              class="choice"
              aria-pressed={pending.value.template.coordinateFormat === format.id}
              onclick={() => {
                if (pending)
                  pending.value.template = {
                    ...pending.value.template,
                    coordinateFormat: format.id as AnnotationTemplate['coordinateFormat'],
                  };
              }}>{format.label}</button
            >{/each}
        </div>
        <div class="coordinate-value">
          <CoordinateReadout
            text={coordinateSummary(pending.value)}
            format={pending.value.template.coordinateFormat}
            wrap={pending.value.template.coordinateWrap}
            label="座標格式預覽"
          />
        </div>
        <p class="muted">切換格式不會改變實際位置。</p>
        {#if pending.value.template.coordinateFormat === 'TWD97_TM2'}
          <label class="pm-field"
            ><span>分帶</span><select bind:value={pending.value.template.zone}
              ><option value={121}>121°（臺灣本島）</option><option value={119}>119°（澎湖）</option
              ></select
            ></label
          >
        {/if}
        <CoordinateOptions
          value={pending.value.template}
          onChange={(template) => {
            if (pending) pending.value.template = template;
          }}
        />
      </section>
      <section class="coordinate-placement">
        <h2>座標放在哪裡？</h2>
        <CornerPlacement
          photoUrl={sourceUrl}
          value={pending.value.template.coordinateCorner}
          onChange={(corner) => {
            if (pending)
              pending.value.template = { ...pending.value.template, coordinateCorner: corner };
          }}
        />
        <p class="muted">同一角有文字時，座標會排列在文字下方。</p>
      </section>
      <div class="coordinate-actions">
        <Button variant="secondary" onclick={() => (sourceControlsOpen = !sourceControlsOpen)}
          >位置來源：{pending.value.coordinate ? sourceLabel(pending.value.coordinate) : '尚未設定'} ›</Button
        >
        <Button onclick={applySettings} label="套用">套用座標設定</Button>
        <p class="muted">TWD97 可選 TM2 121／119 分帶；MGRS 可選精度。</p>
      </div>
      {#if sourceControlsOpen}
        <MapConsent
          open={consentOpen}
          onAccept={() => {
            mapConsented = grantMapConsent(localStorage).status === 'granted';
            consentOpen = false;
            view = 'map';
          }}
          onDecline={() => (consentOpen = false)}
        />
        <div class="tools">
          <Button variant="secondary" onclick={requestMap}>在地圖上選取</Button><Button
            variant="secondary"
            disabled={locating}
            onclick={locate}>{locating ? '定位中…' : '使用目前位置'}</Button
          >
        </div>
        {#if locationCandidate}<section class="panel">
            <h2>確認目前位置</h2>
            <p>{locationCandidate.latitude.toFixed(6)}, {locationCandidate.longitude.toFixed(6)}</p>
            <p>
              精確度：{locationCandidate.accuracyMeters === null
                ? '無法取得'
                : `約 ${locationCandidate.accuracyMeters} 公尺`}
            </p>
            <p>目前位置可能不是照片拍攝地點。</p>
            <Button
              onclick={() => {
                if (pending && locationCandidate) {
                  pending.value.coordinate = locationCandidate;
                  locationCandidate = null;
                  applySettings();
                }
              }}>確認使用目前位置</Button
            >
          </section>{/if}
        <section class="panel">
          <h2>手動輸入</h2>
          <label>緯度<input type="text" inputmode="decimal" bind:value={latitude} /></label><label
            >經度<input type="text" inputmode="decimal" bind:value={longitude} /></label
          ><Button
            onclick={() => {
              if (!latitude.trim() || !longitude.trim()) {
                error = '請填寫緯度與經度。';
                return;
              }
              chooseCoordinate(Number(latitude), Number(longitude), 'MANUAL_INPUT');
            }}>使用輸入的座標</Button
          >
        </section>
        <Button
          variant="secondary"
          onclick={() => {
            if (pending) {
              pending.value.coordinate = null;
              applySettings();
            }
          }}>不顯示座標</Button
        >
      {/if}
      <Button variant="secondary" onclick={cancelSettings}>取消</Button>
    {:else if view === 'cornerText' && pending}
      <div class="tools">
        <Button variant="secondary" onclick={() => (view = 'textStyle')}>文字樣式與底色</Button
        ><Button variant="secondary" onclick={() => (view = 'watermark')}>浮水印</Button>
      </div>
      <CornerTextEditor
        value={pending.value.texts}
        onChange={(value) => {
          if (pending) pending.value.texts = value;
        }}
        onSaveDefaults={async () => {
          if (!pending) return;
          const result = await preferences.saveCornerDefaults($state.snapshot(pending.value.texts));
          message = result.ok ? '已儲存預設文字' : '';
          if (!result.ok) error = '預設文字儲存失敗，請重試。';
        }}
      />
      {#if message}<p role="status">{message}</p>{/if}
      <Button onclick={applySettings}>套用</Button><Button
        variant="secondary"
        onclick={cancelSettings}>取消</Button
      >
    {:else if view === 'textStyle' && pending}
      <NumberStepper
        label="文字大小"
        value={Math.round(pending.value.template.appearance.fontSize * 390)}
        min={8}
        max={96}
        onChange={(value) => {
          if (pending) updateAppearance({ fontSize: value / 390 });
        }}
      />
      <label
        >文字顏色<input
          type="color"
          value={rgbHex(pending.value.template.appearance.textColor)}
          oninput={(event) => {
            if (!pending) return;
            const hex = event.currentTarget.value;
            updateAppearance({
              textColor: {
                red: parseInt(hex.slice(1, 3), 16),
                green: parseInt(hex.slice(3, 5), 16),
                blue: parseInt(hex.slice(5, 7), 16),
                alpha: 1,
              },
            });
          }}
        /></label
      >
      <NumberStepper
        label="圓角"
        value={Math.round(pending.value.template.appearance.cornerRadius * 390)}
        min={0}
        max={40}
        onChange={(value) => {
          if (pending) updateAppearance({ cornerRadius: value / 390 });
        }}
      />
      <NumberStepper
        label="內距"
        value={Math.round(pending.value.template.appearance.padding * 390)}
        min={0}
        max={40}
        onChange={(value) => {
          if (pending) updateAppearance({ padding: value / 390 });
        }}
      />
      <label
        >背景透明度 (%)<input
          type="range"
          min="0"
          max="100"
          value={Math.round(pending.value.template.appearance.backgroundColor.alpha * 100)}
          oninput={(event) => {
            if (pending)
              updateAppearance({
                backgroundColor: {
                  ...pending.value.template.appearance.backgroundColor,
                  alpha: +event.currentTarget.value / 100,
                },
              });
          }}
        /></label
      >
      <RgbaPicker
        value={pending.value.template.appearance.backgroundColor}
        onChange={(value) => {
          if (pending) updateAppearance({ backgroundColor: value });
        }}
        onValidityChange={(valid) => (colorValid = valid)}
      />
      <Button disabled={!colorValid} onclick={applySettings}>套用</Button><Button
        variant="secondary"
        onclick={cancelSettings}>取消</Button
      >
    {:else if view === 'templates' && pending}
      <TemplatePicker
        photoUrl={sourceUrl}
        onApply={applySettings}
        templates={templateItems}
        selected={pending.value.template}
        defaultId={defaultTemplateId}
        onSelect={selectTemplate}
        onDefault={setDefaultTemplate}
        onEdit={() => editTemplate(false)}
        onNew={() => editTemplate(true)}
      />
      {#if message}<p role="status">{message}</p>{/if}
    {:else if view === 'templateEdit' && pending}
      <TemplateEditor
        {photo}
        storedAssets={watermarkAssets}
        isDefault={defaultTemplateId === pending.value.template.id}
        onHeading={(heading, subtitle) => {
          templateHeading = heading;
          templateSubtitle = subtitle;
        }}
        bind:this={templateEditor}
        initial={pending.value.template}
        texts={pending.value.texts}
        creating={creatingTemplate}
        onSave={saveEditedTemplate}
        onCancel={() => {
          view = 'templates';
          error = '';
        }}
      />
    {:else if view === 'watermark' && pending}
      <WatermarkEditor
        value={pending.value.template.watermark}
        onChange={(value) => {
          if (pending) pending.value.template = { ...pending.value.template, watermark: value };
        }}
        onImage={chooseWatermark}
      />
      <Button onclick={applySettings}>套用</Button><Button
        variant="secondary"
        onclick={cancelSettings}>取消</Button
      >
    {:else if view === 'map'}
      <MapPreview
        center={display.coordinate ?? { latitude: 23.7, longitude: 121 }}
        consented={mapConsented}
        {online}
        onConfirm={(value) => chooseCoordinate(value.latitude, value.longitude, 'MAP_SELECTION')}
        onClose={() => (view = 'coordinate')}
        onRevoke={() => {
          revokeMapConsent(localStorage);
          mapConsented = false;
          view = 'coordinate';
        }}
      />
    {:else if view === 'exportReview' && config}
      <section class="panel">
        <h2>匯出設定</h2>
        <label
          >格式<select bind:value={config.format} disabled={exporting}
            ><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option></select
          ></label
        >{#if config.format === 'image/jpeg'}<label
            >JPEG 品質 (%)<input
              type="range"
              min="10"
              max="100"
              value={Math.round((config.quality ?? 0.92) * 100)}
              disabled={exporting}
              oninput={(event) => {
                if (config) config = { ...config, quality: +event.currentTarget.value / 100 };
              }}
            /><span>{Math.round((config.quality ?? 0.92) * 100)}%</span></label
          >{/if}<label>尺寸<select disabled><option>原始尺寸</option></select></label><label
          >中繼資料<select bind:value={config.metadataMode} disabled={exporting}
            ><option value="preserveSupported">保留支援的資料</option><option
              value="removeSupported">移除支援的資料</option
            ></select
          ></label
        >
        <p class="muted">{photo.rawWidth} × {photo.rawHeight} · 另存新檔，原始照片不變。</p>
        {#if config.format !== photo.sourceMime && config.metadataMode === 'preserveSupported'}<p
            class="error"
          >
            變更格式時，請選擇移除支援的資料。
          </p>{/if}
      </section>
      <Button
        disabled={exporting ||
          (config.format !== photo.sourceMime && config.metadataMode === 'preserveSupported')}
        onclick={() => confirmExport('download')}>{exporting ? '正在處理…' : '下載照片'}</Button
      >
      <Button variant="secondary" disabled={exporting} onclick={() => confirmExport('share')}
        >分享照片</Button
      >
    {:else if view === 'exportResult'}
      <section class="panel">
        <h2 role="status">{message}</h2>
        <p>請在瀏覽器下載項目或系統分享結果中確認。草稿仍保留在此裝置。</p>
      </section>
      <Button onclick={() => selectedFiles?.click()}>處理下一張照片</Button><Button
        variant="secondary"
        onclick={cancelSettings}>繼續編輯</Button
      >
    {/if}
  {/if}
  <footer>{ready ? '已可離線使用' : '本機處理 · 離線就緒狀態尚未確認'}</footer>
</EditorShell>
{#if discardOpen}<DiscardDraftDialog
    busy={discarding}
    error={discardError}
    onConfirm={discardDraft}
    onCancel={() => (discardOpen = false)}
  />{/if}

<style>
  .file-input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    overflow: hidden;
  }
  .photo {
    border-radius: var(--pm-radius-card);
    overflow: hidden;
    background: var(--pm-color-pale);
  }
  .editor-preview {
    height: 296px;
    flex-shrink: 0;
  }
  .editor-preview img {
    height: 100%;
  }
  .coordinate-summary {
    margin: 8px 0;
  }
  .coordinate-summary strong {
    font-size: 14px;
  }

  .template-preview {
    height: 250px;
    flex-shrink: 0;
  }
  .template-preview img {
    height: 100%;
  }
  .photo img {
    display: block;
    width: 100%;
    max-height: 55dvh;
    object-fit: contain;
  }
  .panel {
    padding: 16px;
    border-radius: 18px;
    background: var(--pm-color-pale);
    display: grid;
    gap: 12px;
  }
  .panel {
    min-width: 0;
  }
  .coordinate-value {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.7;
    font-variant-numeric: tabular-nums;
  }
  .panel p,
  .panel h2 {
    margin: 0;
  }
  .panel strong {
    color: var(--pm-color-accent);
  }
  h2 {
    font-size: 18px;
  }
  .welcome {
    padding: 52px 0;
  }
  .welcome h2 {
    font-size: clamp(28px, 5vw, 44px);
    line-height: 1.5;
    margin: 12px 0 24px;
  }
  .welcome p {
    line-height: 1.8;
    color: var(--pm-color-muted);
  }
  .eyebrow {
    color: var(--pm-color-accent);
  }
  .tools {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 10px;
  }
  .bottom {
    margin-top: auto;
    display: grid;
    gap: 12px;
  }
  .muted,
  footer,
  small {
    color: var(--pm-color-muted);
    font-size: 12px;
  }
  footer {
    text-align: center;
    margin-top: 12px;
  }
  .coordinate-settings,
  .coordinate-placement,
  .coordinate-actions {
    display: grid;
    gap: 12px;
  }
  .tools :global(button) {
    padding-inline: 8px;
  }
  .coordinate-settings .tools {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px;
  }
  .coordinate-settings {
    padding-top: 16px;
  }
  .coordinate-settings h2,
  .coordinate-placement h2 {
    margin: 0;
    font-size: 15px;
  }
  .coordinate-settings p,
  .coordinate-placement p,
  .coordinate-actions p {
    margin: 0;
  }
  .coordinate-settings .coordinate-value {
    font-size: 18px;
    font-weight: 500;
    color: var(--pm-color-accent);
    line-height: 1.5;
  }
  .coordinate-placement {
    margin-top: 25px;
  }
  .coordinate-actions {
    margin-top: 25px;
  }
  .choice {
    min-height: 50px;
    padding: 8px;
    background: white;
    border: 0;
    border-radius: 14px;
    color: var(--pm-color-ink);
  }
  .choice[aria-pressed='true'] {
    border-color: var(--pm-color-accent);
    background: var(--pm-color-accent);
    color: white;
  }
  .error {
    color: var(--pm-color-error);
    font-size: 14px;
  }
  .discard {
    min-height: 44px;
    border: 0;
    background: transparent;
    color: var(--pm-color-muted);
    font-size: 13px;
  }
  label {
    display: grid;
    gap: 8px;
  }
  label:not(.pm-field) input,
  label:not(.pm-field) select {
    min-width: 0;
    min-height: 48px;
    width: 100%;
    padding: 10px;
    border: 1px solid var(--pm-color-border);
    border-radius: 12px;
    background: white;
    color: var(--pm-color-ink);
  }
</style>
