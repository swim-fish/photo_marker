<script lang="ts">
  import { onDestroy, onMount } from 'svelte';

  import CoordinateCard from '../coordinate/CoordinateCard.svelte';
  import BatchResults from '../export/BatchResults.svelte';
  import BatchReview from '../export/BatchReview.svelte';
  import BatchSettings, { type SharedSettingsValue } from '../export/BatchSettings.svelte';
  import ExportReview from '../export/ExportReview.svelte';
  import ExportResults from '../export/ExportResults.svelte';
  import ExportSettings from '../export/ExportSettings.svelte';
  import MapConsent from '../map/MapConsent.svelte';
  import MapPreview from '../map/MapPreview.svelte';
  import OverlayInspector from '../overlays/OverlayInspector.svelte';
  import OverlayList from '../overlays/OverlayList.svelte';
  import DraftRecovery from './DraftRecovery.svelte';
  import DraftStatus from './DraftStatus.svelte';
  import type { CoordinateRecord, Wgs84Coordinate } from '../../domain/coordinates/types';
  import { formatCoordinate } from '../../domain/coordinates/formatCoordinate';
  import type { ParsedCoordinate } from '../../domain/coordinates/parseCoordinateInput';
  import { replaceWorkingCoordinate } from '../../domain/coordinates/workingCoordinate';
  import { createDraftService, type DraftService } from '../../domain/drafts/draftService';
  import { createEditingSession, editingSessionReducer } from '../../domain/drafts/editingSession';
  import type { EditingSession } from '../../domain/drafts/types';
  import { exportPhoto } from '../../domain/export/exportPhoto';
  import {
    exportBatchSequentially,
    retryFailedBatchExports,
    type BatchExportWorkItem,
  } from '../../domain/export/batchExport';
  import type { ExportConfiguration, ExportResult } from '../../domain/export/types';
  import { isExportConfigurationReady } from '../../domain/export/types';
  import {
    grantMapConsent,
    MAP_CONSENT_POLICY_VERSION,
    readMapConsent,
    revokeMapConsent,
  } from '../../domain/map/mapConsent';
  import type { MapNetworkConsent } from '../../domain/map/types';
  import {
    createOverlay,
    moveOverlay,
    removeOverlay,
    reorderOverlays,
    resizeOverlay,
    updateOverlay,
  } from '../../domain/overlays/overlayEditor';
  import { formatCoordinateOverlay } from '../../domain/overlays/coordinateOverlay';
  import type { OverlayRole, TextOverlay } from '../../domain/overlays/types';
  import { importPhoto } from '../../domain/photos/importPhoto';
  import {
    applySharedBatchSettings,
    batchExportReadiness,
    createBatchSession,
    removeInvalidBatchItem,
    selectBatchItem,
    setBatchItemDecision,
    updateBatchItem,
    type BatchSession,
    type EditableBatchItem,
    type InvalidBatchIntake,
  } from '../../domain/photos/batchSession';
  import type { SourcePhoto } from '../../domain/photos/types';
  import { requestCurrentLocation } from '../../infrastructure/platform/geolocation';
  import { sanitizeDiagnostic } from '../../infrastructure/platform/diagnostics';
  import {
    consumeSharedFiles,
    DraftRepository,
    type DraftSnapshot,
  } from '../../infrastructure/storage/draftRepository';
  import { openDraftDatabase } from '../../infrastructure/storage/database';
  import {
    establishOfflineReadiness,
    type OfflineReadinessResult,
    requestWorkerReadiness,
  } from '../../infrastructure/pwa/readiness';
  import { messages } from '../../i18n';
  import ImportPanel from './ImportPanel.svelte';
  import InstallHelp from './InstallHelp.svelte';
  import OfflineStatus from './OfflineStatus.svelte';
  import PhotoNavigator, { type PhotoNavigatorEntry } from './PhotoNavigator.svelte';
  import PhotoStatus from './PhotoStatus.svelte';
  import PreviewStage from './PreviewStage.svelte';
  import StatusRegion from './StatusRegion.svelte';

  const t = messages.en;

  type ViewState = 'empty' | 'loading' | 'error' | 'editing' | 'exporting' | 'success';
  type InspectorTab = 'coordinate' | 'overlays' | 'export';
  type DraftUiStatus = 'idle' | 'saving' | 'saved' | 'denied' | 'quotaExceeded' | 'error';

  let viewState = $state<ViewState>('empty');
  let inspectorTab = $state<InspectorTab>('coordinate');
  let photo = $state<SourcePhoto | null>(null);
  let photoUrl = $state('');
  let coordinate = $state<CoordinateRecord | null>(null);
  let overlays = $state<TextOverlay[]>([]);
  let selectedOverlayId = $state<string | null>(null);
  let configuration = $state<ExportConfiguration | null>(null);
  let errorMessage = $state('');
  let locationError = $state('');
  let manualError = $state('');
  let reviewOpen = $state(false);
  let outputName = $state('');
  let exportResults = $state<ExportResult[]>([]);
  let batchSession = $state<BatchSession | null>(null);
  let batchReviewOpen = $state(false);
  let batchTotal = $state(0);
  let draftSession = $state<EditingSession | null>(null);
  let draftStatus = $state<DraftUiStatus>('idle');
  let recoverableDraft = $state<DraftSnapshot | null>(null);
  let draftRecoveryOpen = $state(false);
  let draftRecoveryIssue = $state('');
  let offlineReadiness = $state<OfflineReadinessResult>({
    status: 'not-ready',
    reason: 'service-worker-unavailable',
  });
  let installedApp = $state(false);
  let mapConsent = $state<MapNetworkConsent>({
    policyVersion: MAP_CONSENT_POLICY_VERSION,
    status: 'unknown',
    providerId: 'nlsc-emap5',
    grantedAt: null,
    revokedAt: null,
  });
  let mapConsentOpen = $state(false);
  let mapPreviewOpen = $state(false);
  let isOnline = $state(true);
  let statusMessage = $state<string>(t.readyStatus);

  const draftRepository = new DraftRepository();
  let draftService: DraftService;
  draftService = createDraftService({
    repository: draftRepository,
    onSave: (result) => {
      if (!result.ok) {
        draftStatus = result.error.code === 'quota-exceeded' ? 'quotaExceeded' : 'error';
        return;
      }
      draftStatus = result.value.persistenceStatus === 'denied' ? 'denied' : 'saved';
      if (draftSession?.id === result.value.sessionId) {
        draftSession = editingSessionReducer(draftSession, {
          type: 'mark-persisted',
          revision: result.value.revision,
        });
      }
    },
  });

  const selectedOverlay = $derived(
    overlays.find((overlay) => overlay.id === selectedOverlayId) ?? null,
  );
  const coordinateReady = $derived(coordinate?.validationStatus === 'valid');
  const overlaysReady = $derived(overlays.length > 0);
  const configurationReady = $derived(
    Boolean(configuration && photo && isExportConfigurationReady(configuration, photo.sourceMime)),
  );
  const canReview = $derived(coordinateReady && overlaysReady && configurationReady);
  const isBatch = $derived((batchSession?.items.length ?? 0) > 1);
  const canOpenReview = $derived(isBatch ? Boolean(batchSession) : canReview);
  const disabledReason = $derived(
    !coordinateReady
      ? t.resolveCoordinateBeforeExport
      : !overlaysReady
        ? t.addOverlayBeforeExport
        : !configurationReady
          ? t.chooseMetadataOrSourceFormat
          : '',
  );
  const displayText = $derived.by(() => {
    if (!coordinate) return '';
    const result = formatCoordinate(coordinate, coordinate.displayFormat, {
      zone: coordinate.zone,
      precision: coordinate.precision,
    });
    return result.ok ? result.value.text : '';
  });
  const batchNavigatorItems = $derived.by((): PhotoNavigatorEntry[] => {
    if (!batchSession) return [];
    const results = new Map(exportResults.map((result) => [result.photoId, result]));
    return batchSession.items.map((item) => {
      if (item.kind === 'invalid') {
        return {
          id: item.id,
          name: item.sourceName,
          status: 'Invalid',
          failureCode: item.failureCode,
        };
      }
      const result = results.get(item.id);
      const status: PhotoNavigatorEntry['status'] =
        result?.status === 'handedOff'
          ? 'Exported'
          : result?.status === 'failed'
            ? 'Failed'
            : item.decision === 'omit'
              ? 'Omitted'
              : item.coordinate?.validationStatus === 'valid' ||
                  item.decision === 'withoutCoordinate'
                ? 'Ready'
                : 'Missing coordinate';
      return {
        id: item.id,
        name: item.sourceName,
        status,
        provenance: item.coordinate ? provenanceLabel(item.coordinate.provenance) : undefined,
        failureCode: result?.failureCode ?? item.failureCode ?? undefined,
      };
    });
  });
  const batchReviewItems = $derived(
    batchNavigatorItems.map((item) => {
      const source = batchSession?.items.find((candidate) => candidate.id === item.id);
      return {
        id: item.id,
        name: item.name,
        status: item.status,
        decision: source?.kind === 'editable' ? source.decision : ('required' as const),
        configurationReady:
          source?.kind === 'editable'
            ? isExportConfigurationReady(source.configuration, source.photo.sourceMime)
            : true,
      };
    }),
  );
  const batchResultItems = $derived.by(() => {
    if (!batchSession) return [];
    const results = new Map(exportResults.map((result) => [result.photoId, result]));
    return batchSession.items.map((item) => {
      if (item.kind === 'invalid') {
        return {
          id: item.id,
          name: item.sourceName,
          status: 'Failed' as const,
          failureCode: item.failureCode,
          retryable: false,
        };
      }
      const result = results.get(item.id);
      if (item.decision === 'omit' || result?.status === 'omitted') {
        return { id: item.id, name: item.sourceName, status: 'Omitted' as const };
      }
      if (result?.status === 'handedOff') {
        return {
          id: item.id,
          name: item.sourceName,
          status: 'Exported' as const,
          outputName: result.outputName ?? undefined,
        };
      }
      if (result?.status === 'cancelled') {
        return {
          id: item.id,
          name: item.sourceName,
          status: 'Cancelled' as const,
          failureCode: result.failureCode ?? undefined,
        };
      }
      return {
        id: item.id,
        name: item.sourceName,
        status: 'Failed' as const,
        failureCode: result?.failureCode ?? 'not-exported',
        retryable: true,
      };
    });
  });

  function provenanceLabel(provenance: CoordinateRecord['provenance']): string {
    return provenance === 'CAPTURE_METADATA'
      ? t.captureMetadata
      : provenance === 'CURRENT_GPS'
        ? t.currentGps
        : t.manualInput;
  }

  function nextId(prefix: string): string {
    return typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function revokePhotoUrl(): void {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = '';
  }

  function syncActiveBatchItem(): void {
    if (!batchSession || !photo || !configuration) return;
    const existing = batchSession.items.find(
      (item): item is EditableBatchItem => item.kind === 'editable' && item.id === photo?.id,
    );
    if (!existing) return;
    const result = exportResults.find((entry) => entry.photoId === photo?.id);
    const reviewStatus =
      result?.status === 'handedOff'
        ? 'exported'
        : result?.status === 'failed'
          ? 'failed'
          : existing.decision === 'omit'
            ? 'omitted'
            : coordinate?.validationStatus === 'valid' || existing.decision === 'withoutCoordinate'
              ? 'ready'
              : 'missingCoordinate';
    batchSession = updateBatchItem(batchSession, photo.id, {
      photo: {
        ...photo,
        coordinateId: coordinate?.id ?? null,
        overlayIds: overlays.map((overlay) => overlay.id),
        reviewStatus,
        failureCode: result?.failureCode ?? null,
      },
      coordinate,
      overlays: [...overlays],
      configuration,
      status: reviewStatus,
      failureCode: result?.failureCode ?? null,
    });
  }

  function currentDraftSnapshot(): DraftSnapshot | null {
    syncActiveBatchItem();
    if (!draftSession || !batchSession) return null;
    const editableItems = batchSession.items.filter(
      (item): item is EditableBatchItem => item.kind === 'editable',
    );
    return $state.snapshot({
      session: draftSession,
      photos: editableItems.map((item) => item.photo),
      coordinates: editableItems.flatMap((item) => (item.coordinate ? [item.coordinate] : [])),
      overlays: editableItems.flatMap((item) => item.overlays),
      exportConfigurations: editableItems.flatMap((item) =>
        item.configuration ? [item.configuration] : [],
      ),
      exportResults,
      batchInvalidItems: batchSession.items
        .filter((item) => item.kind === 'invalid')
        .map(({ id, sourceName, failureCode }) => ({ id, sourceName, failureCode })),
      batchDecisions: editableItems.map((item) => ({
        photoId: item.id,
        decision: item.decision,
      })),
    }) as DraftSnapshot;
  }

  function scheduleCurrentDraft(touch = true): void {
    if (!draftSession) return;
    if (touch) draftSession = editingSessionReducer(draftSession, { type: 'touch' });
    const snapshot = currentDraftSnapshot();
    if (!snapshot) return;
    draftStatus = 'saving';
    draftService.scheduleSave(snapshot);
  }

  async function refreshOfflineReadiness(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
    offlineReadiness = await establishOfflineReadiness({
      isSecureContext: window.isSecureContext,
      requestWorkerReport: () => requestWorkerReadiness(navigator.serviceWorker),
      openDatabase: async () => {
        const database = await openDraftDatabase();
        database.close();
      },
    });
  }

  async function findRecoverableDraft(): Promise<void> {
    const result = await draftService.restoreLatest();
    if (!result.ok) {
      if (result.error.code === 'not-found') return;
      draftStatus = 'error';
      draftRecoveryIssue =
        result.error.code === 'incompatible-version'
          ? t.incompatibleDraftRecovery
          : t.failedDraftRecovery;
      return;
    }
    draftRecoveryIssue = '';
    recoverableDraft = result.value;
    draftRecoveryOpen = true;
  }

  async function loadInitialLocalState(): Promise<void> {
    try {
      const sharedFiles = await consumeSharedFiles();
      if (sharedFiles.length > 0) {
        await handleFiles(sharedFiles);
        return;
      }
    } catch {
      draftStatus = 'error';
      draftRecoveryIssue = t.failedDraftRecovery;
      return;
    }
    await findRecoverableDraft();
  }

  onMount(() => {
    mapConsent = readMapConsent(localStorage);
    isOnline = navigator.onLine;
    installedApp = window.matchMedia('(display-mode: standalone)').matches;
    void refreshOfflineReadiness();
    void loadInitialLocalState();
    const handleOnline = () => (isOnline = true);
    const handleOffline = () => (isOnline = false);
    const flushDraft = () => void draftService.flush();
    const flushHiddenDraft = () => {
      if (document.visibilityState === 'hidden') flushDraft();
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pointerup', flushDraft);
    document.addEventListener('visibilitychange', flushHiddenDraft);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pointerup', flushDraft);
      document.removeEventListener('visibilitychange', flushHiddenDraft);
    };
  });

  onDestroy(() => {
    revokePhotoUrl();
    draftService.dispose();
    draftRepository.close();
  });

  function outputNameFor(source: SourcePhoto): string {
    const dot = source.sourceName.lastIndexOf('.');
    const stem = dot > 0 ? source.sourceName.slice(0, dot) : source.sourceName;
    return `${stem}-annotated${source.sourceMime === 'image/png' ? '.png' : '.jpg'}`;
  }

  function defaultConfiguration(source: SourcePhoto): ExportConfiguration {
    return {
      photoId: source.id,
      format: source.sourceMime,
      width: source.rawWidth,
      height: source.rawHeight,
      quality: source.sourceMime === 'image/jpeg' ? 0.92 : null,
      metadataMode: 'preserveSupported',
      orientationMode: 'preserveRaw',
      fallback: null,
      outputName: outputNameFor(source),
      saveMethod: 'download',
    };
  }

  function acceptedCoordinateFor(
    source: SourcePhoto,
    previous: CoordinateRecord | null,
    value: Wgs84Coordinate,
    provenance: 'CAPTURE_METADATA' | 'MANUAL_INPUT',
  ): CoordinateRecord | null {
    const result = replaceWorkingCoordinate(previous, {
      id: nextId('coordinate'),
      photoId: source.id,
      latitude: value.latitude,
      longitude: value.longitude,
      provenance,
      inputFormat: 'WGS84_DD',
      displayFormat: 'WGS84_DD',
    });
    return result.ok ? result.value : null;
  }

  function coordinateText(value: CoordinateRecord): string {
    const label =
      value.provenance === 'CAPTURE_METADATA'
        ? t.captureMetadata
        : value.provenance === 'CURRENT_GPS'
          ? t.currentGps
          : t.manualInput;
    return formatCoordinateOverlay(value, label);
  }

  function syncCoordinateOverlay(value: CoordinateRecord): void {
    const existing = overlays.find((overlay) => overlay.role === 'coordinate');
    if (existing) {
      overlays = overlays.map((overlay) =>
        overlay.id === existing.id
          ? updateOverlay(overlay, { content: coordinateText(value) })
          : overlay,
      );
      return;
    }
    const overlay = createOverlay({
      id: nextId('overlay'),
      photoId: value.photoId,
      role: 'coordinate',
      content: coordinateText(value),
      fontFamily: 'Noto Sans TC',
      fontSize: 0.035,
      textColor: '#ffffff',
      backgroundColor: '#111827',
      x: 0.04,
      y: 0.84,
      width: 0.72,
      height: 0.11,
      order: overlays.length,
    });
    overlays = [...overlays, overlay];
    selectedOverlayId = overlay.id;
  }

  function coordinateOverlayFor(value: CoordinateRecord, order = 0): TextOverlay {
    return createOverlay({
      id: nextId('overlay'),
      photoId: value.photoId,
      role: 'coordinate',
      content: coordinateText(value),
      fontFamily: 'Noto Sans TC',
      fontSize: 0.035,
      textColor: '#ffffff',
      backgroundColor: '#111827',
      x: 0.04,
      y: 0.84,
      width: 0.72,
      height: 0.11,
      order,
    });
  }

  async function handleFiles(files: FileList | readonly File[]): Promise<void> {
    if (files.length === 0) return;
    viewState = 'loading';
    statusMessage = `${t.importProgress} ${files.length} item(s)`;
    errorMessage = '';
    const sessionId = nextId('session');
    const photos: SourcePhoto[] = [];
    const invalidItems: InvalidBatchIntake[] = [];
    const coordinates: CoordinateRecord[] = [];
    const importedOverlays: TextOverlay[] = [];
    const configurations: ExportConfiguration[] = [];

    for (const selected of Array.from(files)) {
      statusMessage = `${t.importProgress} ${selected.name}`;
      const result = await importPhoto(selected, {
        id: nextId('photo'),
        sessionId,
      });
      if (!result.ok) {
        invalidItems.push({
          id: nextId('invalid'),
          sourceName: selected.name,
          failureCode: result.error.code,
        });
        continue;
      }
      if (photos.length >= 20) {
        invalidItems.push({
          id: nextId('invalid'),
          sourceName: selected.name,
          failureCode: 'over-limit',
        });
        continue;
      }
      photos.push(result.value);
      configurations.push(defaultConfiguration(result.value));
      const captureCoordinate = result.value.metadataSummary.captureGps
        ? acceptedCoordinateFor(
            result.value,
            null,
            result.value.metadataSummary.captureGps,
            'CAPTURE_METADATA',
          )
        : null;
      if (captureCoordinate) {
        coordinates.push(captureCoordinate);
        importedOverlays.push(coordinateOverlayFor(captureCoordinate));
      }
    }

    if (photos.length === 0) {
      viewState = 'error';
      errorMessage = invalidItems[0]
        ? sanitizeDiagnostic(invalidItems[0].failureCode).message
        : t.photoImportFailed;
      statusMessage = t.photoImportFailed;
      return;
    }

    let storageHeadroomBytes: number | undefined;
    try {
      const estimate = await navigator.storage?.estimate();
      if (typeof estimate?.quota === 'number') {
        storageHeadroomBytes = Math.max(0, estimate.quota - (estimate.usage ?? 0));
      }
    } catch {
      storageHeadroomBytes = undefined;
    }
    const createdBatch = createBatchSession({
      id: sessionId,
      photos,
      invalidItems,
      coordinates,
      overlays: importedOverlays,
      configurations,
      storageHeadroomBytes,
    });
    if (!createdBatch.ok) {
      viewState = 'error';
      errorMessage = createdBatch.error.message;
      statusMessage = t.photoImportFailed;
      return;
    }

    batchSession = createdBatch.value;
    outputName = '';
    exportResults = [];
    viewState = 'editing';
    statusMessage = `${photos.length} ${t.batchImportPhotosSuffix} ${invalidItems.length} ${t.batchImportInvalidSuffix}`;
    draftSession = editingSessionReducer(
      createEditingSession({ id: sessionId, photoIds: photos.map((item) => item.id) }),
      { type: 'transition', status: 'editing' },
    );
    loadBatchItem(createdBatch.value.activeItemId, false);
    scheduleCurrentDraft(false);
  }

  function loadBatchItem(itemId: string, saveCurrent = true): void {
    if (!batchSession) return;
    if (saveCurrent) syncActiveBatchItem();
    const selectedSession = selectBatchItem(batchSession, itemId);
    const item = selectedSession.items.find(
      (candidate): candidate is EditableBatchItem =>
        candidate.kind === 'editable' && candidate.id === itemId,
    );
    if (!item || !item.configuration) return;
    batchSession = selectedSession;
    revokePhotoUrl();
    photo = item.photo;
    photoUrl = URL.createObjectURL(item.photo.sourceBlob);
    coordinate = item.coordinate;
    overlays = [...item.overlays];
    selectedOverlayId = overlays[0]?.id ?? null;
    configuration = item.configuration;
    manualError = '';
    locationError = '';
    inspectorTab = 'coordinate';
    if (draftSession) {
      draftSession = editingSessionReducer(draftSession, {
        type: 'set-active-photo',
        photoId: item.id,
      });
    }
    if (saveCurrent) scheduleCurrentDraft();
  }

  function resumeRecoveredDraft(): void {
    const snapshot = recoverableDraft;
    if (!snapshot || snapshot.photos.length === 0) return;
    const restored = createBatchSession({
      id: snapshot.session.id,
      photos: snapshot.photos,
      invalidItems: snapshot.batchInvalidItems,
      coordinates: snapshot.coordinates,
      overlays: snapshot.overlays,
      configurations: snapshot.exportConfigurations,
    });
    if (!restored.ok) {
      draftStatus = 'error';
      return;
    }
    let restoredBatch = selectBatchItem(restored.value, snapshot.session.activePhotoId);
    for (const entry of snapshot.batchDecisions ?? []) {
      restoredBatch = setBatchItemDecision(restoredBatch, entry.photoId, entry.decision);
    }
    batchSession = restoredBatch;
    exportResults = [...(snapshot.exportResults ?? [])];
    draftSession = snapshot.session;
    loadBatchItem(restoredBatch.activeItemId, false);
    draftStatus = 'saved';
    viewState = 'editing';
    inspectorTab = 'coordinate';
    draftRecoveryOpen = false;
    statusMessage = t.localDraftRestored;
  }

  async function discardRecoveredDraft(): Promise<void> {
    if (!recoverableDraft) return;
    const result = await draftService.discard(recoverableDraft.session.id);
    if (!result.ok) {
      draftStatus = 'error';
      return;
    }
    recoverableDraft = null;
    draftRecoveryOpen = false;
    draftStatus = 'idle';
  }

  function handleManualCoordinate(value: ParsedCoordinate): void {
    if (!photo) return;
    const result = replaceWorkingCoordinate(coordinate, {
      id: nextId('coordinate'),
      photoId: photo.id,
      latitude: value.latitude,
      longitude: value.longitude,
      provenance: 'MANUAL_INPUT',
      inputFormat: value.inputFormat,
      displayFormat: value.displayFormat,
      zone: value.zone,
      zoneAutoResolved: value.zoneAutoResolved,
      precision: value.precision,
    });
    if (!result.ok) {
      manualError = t.validWgs84;
      return;
    }
    coordinate = result.value;
    manualError = '';
    syncCoordinateOverlay(result.value);
    statusMessage = t.manualWorkingCoordinateAccepted;
    scheduleCurrentDraft();
  }

  function handleDisplayChange(selection: {
    format: CoordinateRecord['displayFormat'];
    precision: number | null;
  }): void {
    if (!coordinate) return;
    const result = formatCoordinate(coordinate, selection.format, {
      zone: coordinate.zone,
      precision: selection.precision,
    });
    if (!result.ok) {
      manualError = t.displayFormatUnavailable;
      return;
    }
    coordinate = {
      ...coordinate,
      displayFormat: selection.format,
      zone: coordinate.zoneAutoResolved ? coordinate.zone : result.value.zone,
      zoneAutoResolved: coordinate.zoneAutoResolved,
      precision: result.value.precision,
      coverageStatus: result.value.coverageStatus,
    };
    manualError = '';
    syncCoordinateOverlay(coordinate);
    statusMessage = t.displayFormatUpdated;
    scheduleCurrentDraft();
  }

  function requestMapPreview(): void {
    if (!coordinateReady || !coordinate) return;
    if (mapConsent.status === 'granted') {
      mapPreviewOpen = true;
      return;
    }
    mapConsentOpen = true;
  }

  function acceptMapConsent(): void {
    mapConsent = grantMapConsent(localStorage);
    mapConsentOpen = false;
    mapPreviewOpen = true;
  }

  function revokeMapNetworkConsent(): void {
    mapConsent = revokeMapConsent(localStorage);
    mapPreviewOpen = false;
    statusMessage = t.mapConsentRevokedMessage;
  }

  async function handleCurrentLocation(): Promise<void> {
    if (!photo || !navigator.geolocation) {
      locationError = t.currentLocationUnavailable;
      return;
    }
    locationError = '';
    const result = await requestCurrentLocation(navigator.geolocation, {
      id: nextId('coordinate'),
      photoId: photo.id,
      maxAccuracyMeters: 50,
    });
    if (!result.ok) {
      locationError =
        result.error.code === 'accuracy-insufficient'
          ? t.locationAccuracyInsufficient
          : t.currentLocationRejected;
      return;
    }
    coordinate = result.value;
    syncCoordinateOverlay(result.value);
    statusMessage = `${t.currentGps} accepted with ${result.value.accuracyMeters} ${t.metresSuffix} ${t.currentGpsAccuracySuffix}`;
    scheduleCurrentDraft();
  }

  function addOverlay(role: OverlayRole): void {
    if (!photo) return;
    const defaults: Record<OverlayRole, string> = {
      title: t.photoTitle,
      team: t.team,
      coordinate: coordinate ? coordinateText(coordinate) : t.coordinate,
      freeform: t.addYourNote,
    };
    const overlay = createOverlay({
      id: nextId('overlay'),
      photoId: photo.id,
      role,
      content: defaults[role],
      fontFamily: 'Noto Sans TC',
      fontSize: role === 'title' ? 0.06 : 0.04,
      textColor: '#ffffff',
      backgroundColor: '#111827',
      x: 0.08,
      y: 0.08 + overlays.length * 0.12,
      width: role === 'title' ? 0.6 : 0.5,
      height: 0.1,
      order: overlays.length,
    });
    overlays = [...overlays, overlay];
    selectedOverlayId = overlay.id;
    inspectorTab = 'overlays';
    scheduleCurrentDraft();
  }

  function updateSelected(update: Partial<TextOverlay>): void {
    if (!selectedOverlayId) return;
    overlays = overlays.map((overlay) =>
      overlay.id === selectedOverlayId ? updateOverlay(overlay, update) : overlay,
    );
    scheduleCurrentDraft();
  }

  function updateById(overlayId: string, update: Partial<TextOverlay>): void {
    selectedOverlayId = overlayId;
    overlays = overlays.map((overlay) =>
      overlay.id === overlayId ? updateOverlay(overlay, update) : overlay,
    );
    scheduleCurrentDraft();
  }

  function moveSelected(dx: number, dy: number): void {
    if (!selectedOverlayId) return;
    overlays = overlays.map((overlay) =>
      overlay.id === selectedOverlayId ? moveOverlay(overlay, { dx, dy }) : overlay,
    );
    scheduleCurrentDraft();
  }

  function moveById(overlayId: string, dx: number, dy: number): void {
    selectedOverlayId = overlayId;
    overlays = overlays.map((overlay) =>
      overlay.id === overlayId ? moveOverlay(overlay, { dx, dy }) : overlay,
    );
    scheduleCurrentDraft();
  }

  function resizeSelected(dw: number, dh: number): void {
    if (!selectedOverlayId) return;
    overlays = overlays.map((overlay) =>
      overlay.id === selectedOverlayId ? resizeOverlay(overlay, { dw, dh }) : overlay,
    );
    scheduleCurrentDraft();
  }

  function removeSelected(): void {
    if (!selectedOverlayId) return;
    overlays = removeOverlay(overlays, selectedOverlayId);
    selectedOverlayId = overlays[0]?.id ?? null;
    scheduleCurrentDraft();
  }

  function removeOverlayById(overlayId: string): void {
    overlays = removeOverlay(overlays, overlayId);
    if (selectedOverlayId === overlayId) selectedOverlayId = overlays[0]?.id ?? null;
    scheduleCurrentDraft();
  }

  function reorderOverlayById(overlayId: string, index: number): void {
    overlays = reorderOverlays(overlays, overlayId, index);
    scheduleCurrentDraft();
  }

  function updateConfiguration(update: Partial<ExportConfiguration>): void {
    if (!configuration || !photo) return;
    const next = { ...configuration, ...update };
    const bakeUpright = next.format !== photo.sourceMime || next.metadataMode === 'removeSupported';
    configuration = {
      ...next,
      width: bakeUpright ? photo.displayWidth : photo.rawWidth,
      height: bakeUpright ? photo.displayHeight : photo.rawHeight,
      quality: next.format === 'image/jpeg' ? (next.quality ?? 0.92) : null,
      orientationMode: bakeUpright ? 'bakeUpright' : 'preserveRaw',
      fallback:
        next.format !== photo.sourceMime && next.metadataMode === 'preserveSupported'
          ? {
              code: 'format-change-metadata',
              message: t.formatChangeMetadataFallback,
              acknowledged: false,
            }
          : null,
    };
    scheduleCurrentDraft();
  }

  function applySharedSettings(value: SharedSettingsValue): void {
    if (!batchSession) return;
    syncActiveBatchItem();
    const sharedOverlays = [
      ...(value.title
        ? [
            {
              role: 'title' as const,
              content: value.title,
              fontFamily: 'Noto Sans TC',
              fontSize: 0.06,
              textColor: '#ffffff',
              backgroundColor: '#111827',
              x: 0.08,
              y: 0.08,
              width: 0.6,
              height: 0.1,
              padding: 0.012,
              lineHeight: 1.2,
              order: 0,
              contrastStatus: 'acceptable' as const,
            },
          ]
        : []),
      ...(value.team
        ? [
            {
              role: 'team' as const,
              content: value.team,
              fontFamily: 'Noto Sans TC',
              fontSize: 0.04,
              textColor: '#ffffff',
              backgroundColor: '#111827',
              x: 0.08,
              y: 0.2,
              width: 0.5,
              height: 0.09,
              padding: 0.012,
              lineHeight: 1.2,
              order: value.title ? 1 : 0,
              contrastStatus: 'acceptable' as const,
            },
          ]
        : []),
    ];
    batchSession = applySharedBatchSettings(
      batchSession,
      {
        displayFormat: value.displayFormat,
        overlayTemplate: { overlays: sharedOverlays },
      },
      (photoId, index) => nextId(`${photoId}-shared-${index}`),
    );
    batchSession = {
      ...batchSession,
      items: batchSession.items.map((item) =>
        item.kind === 'editable' && item.coordinate
          ? {
              ...item,
              overlays: item.overlays.map((overlay) =>
                overlay.role === 'coordinate'
                  ? updateOverlay(overlay, { content: coordinateText(item.coordinate!) })
                  : overlay,
              ),
            }
          : item,
      ),
    };
    loadBatchItem(batchSession.activeItemId, false);
    statusMessage = t.sharedSettingsApplied;
    scheduleCurrentDraft();
  }

  function decideBatchItem(itemId: string, decision: 'omit' | 'withoutCoordinate'): void {
    if (!batchSession) return;
    syncActiveBatchItem();
    batchSession = setBatchItemDecision(batchSession, itemId, decision);
    scheduleCurrentDraft();
  }

  function removeInvalidItem(itemId: string): void {
    if (!batchSession) return;
    batchSession = removeInvalidBatchItem(batchSession, itemId);
    scheduleCurrentDraft();
  }

  async function openExportReview(): Promise<void> {
    const snapshot = currentDraftSnapshot();
    if (snapshot) {
      draftStatus = 'saving';
      await draftService.flush(snapshot);
    }
    if (isBatch) {
      batchReviewOpen = true;
      if (draftSession?.status === 'editing') {
        draftSession = editingSessionReducer(draftSession, {
          type: 'transition',
          status: 'reviewing',
        });
      }
    } else {
      reviewOpen = true;
    }
  }

  function batchWorkItems(): BatchExportWorkItem[] {
    syncActiveBatchItem();
    if (!batchSession) return [];
    return batchSession.items.flatMap((item) => {
      if (item.kind !== 'editable' || !item.configuration) return [];
      return [
        {
          photo: item.photo,
          disposition: item.decision === 'omit' ? ('omit' as const) : ('export' as const),
          overlays: item.overlays,
          request: {
            photoId: item.id,
            format: item.configuration.format,
            metadataMode: item.configuration.metadataMode,
            quality: item.configuration.quality,
            outputName: item.configuration.outputName,
            saveMethod: 'download' as const,
            fallback: item.configuration.fallback,
          },
        },
      ];
    });
  }

  async function finishBatchExport(results: readonly ExportResult[]): Promise<void> {
    if (!batchSession) return;
    for (const result of results) {
      applyBatchProgressResult(result);
    }
    const hasFailure = results.some(
      (result) => result.status === 'failed' || result.status === 'cancelled',
    );
    if (!hasFailure) {
      const handedOff = results.filter((result) => result.status === 'handedOff').length;
      statusMessage = `${handedOff} ${t.batchOutputSuffix}`;
      viewState = 'success';
      if (draftSession?.status === 'exporting') {
        draftSession = editingSessionReducer(draftSession, {
          type: 'transition',
          status: 'completed',
        });
      }
      if (draftSession) await draftService.cleanupAfterExport(draftSession.id);
      draftSession = null;
      draftStatus = 'idle';
      return;
    }
    errorMessage = t.batchPartialFailure;
    statusMessage = t.batchPartialStatus;
    viewState = 'error';
    if (draftSession?.status === 'exporting') {
      draftSession = editingSessionReducer(draftSession, {
        type: 'transition',
        status: 'partiallyExported',
      });
    }
    scheduleCurrentDraft();
  }

  function applyBatchProgressResult(result: ExportResult): void {
    exportResults = [
      ...exportResults.filter((existing) => existing.photoId !== result.photoId),
      result,
    ];
    if (!batchSession) return;
    const status =
      result.status === 'handedOff'
        ? 'exported'
        : result.status === 'omitted'
          ? 'omitted'
          : result.status === 'failed'
            ? 'failed'
            : 'ready';
    batchSession = updateBatchItem(batchSession, result.photoId, {
      status,
      failureCode: result.failureCode,
    });
  }

  async function confirmBatchExport(): Promise<void> {
    if (!batchSession || !batchExportReadiness(batchSession).ready) return;
    batchReviewOpen = false;
    viewState = 'exporting';
    const workItems = batchWorkItems();
    batchTotal = workItems.length;
    if (draftSession?.status === 'reviewing') {
      draftSession = editingSessionReducer(draftSession, {
        type: 'transition',
        status: 'exporting',
      });
    }
    if (draftSession) {
      draftSession = editingSessionReducer(draftSession, { type: 'touch' });
      const exportingSnapshot = currentDraftSnapshot();
      if (exportingSnapshot) await draftService.flush(exportingSnapshot);
    }
    const results = await exportBatchSequentially(workItems, {
      onProgress: async (completed, _total, result) => {
        applyBatchProgressResult(result);
        if (draftSession) {
          draftSession = editingSessionReducer(draftSession, { type: 'touch' });
          const checkpoint = currentDraftSnapshot();
          if (checkpoint) {
            draftStatus = 'saving';
            await draftService.flush(checkpoint);
          }
        }
        statusMessage = `${t.exportingBatch} ${completed} ${t.ofLabel} ${batchTotal}…`;
      },
    });
    await finishBatchExport(results);
  }

  async function retryFailedBatch(): Promise<void> {
    const workItems = batchWorkItems();
    viewState = 'exporting';
    if (draftSession?.status === 'partiallyExported') {
      draftSession = editingSessionReducer(draftSession, {
        type: 'transition',
        status: 'exporting',
      });
    }
    batchTotal = exportResults.filter((result) => result.status === 'failed').length;
    const results = await retryFailedBatchExports(workItems, exportResults, {
      onProgress: async (completed, _total, result) => {
        applyBatchProgressResult(result);
        if (draftSession) {
          draftSession = editingSessionReducer(draftSession, { type: 'touch' });
          const checkpoint = currentDraftSnapshot();
          if (checkpoint) {
            draftStatus = 'saving';
            await draftService.flush(checkpoint);
          }
        }
        statusMessage = `${t.retryingBatch} ${completed} ${t.ofLabel} ${batchTotal} ${t.failedItemsSuffix}`;
      },
    });
    await finishBatchExport(results);
  }

  async function confirmExport(): Promise<void> {
    if (!photo || !configuration || !canReview) return;
    reviewOpen = false;
    viewState = 'exporting';
    statusMessage = t.renderingExport;
    const result = await exportPhoto(photo, {
      photoId: photo.id,
      format: configuration.format,
      metadataMode: configuration.metadataMode,
      quality: configuration.quality,
      outputName: configuration.outputName,
      saveMethod: 'download',
      fallback: configuration.fallback,
      overlays,
    });
    if (result.ok) exportResults = [result.value];
    if (result.ok && result.value.status === 'handedOff') {
      outputName = result.value.outputName ?? configuration.outputName;
      statusMessage = `${t.exportSuccessPrefix} ${outputName} ${t.exportSuccessSuffix}`;
      viewState = 'success';
      if (draftSession) await draftService.cleanupAfterExport(draftSession.id);
      draftSession = null;
      draftStatus = 'idle';
      return;
    }
    errorMessage = result.ok
      ? `${t.exportFailedPrefix} (${result.value.failureCode ?? t.unknownFailure}). ${t.exportFailedTryAgain}`
      : result.error.message;
    statusMessage = t.exportFailed;
    viewState = 'error';
    scheduleCurrentDraft();
  }
</script>

<main class="workspace">
  <header class="app-header">
    <div>
      <p class="eyebrow">{t.offlineLabel}</p>
      <h1>{t.appName}</h1>
    </div>
    <span class="privacy">{t.localOnlyCore}</span>
  </header>

  <section class="application-status" aria-label={t.applicationStatus}>
    <OfflineStatus readiness={offlineReadiness} online={isOnline} />
    <DraftStatus status={draftStatus} />
    {#if draftRecoveryIssue}
      <p class="recovery-error" role="alert">{draftRecoveryIssue}</p>
      <button
        type="button"
        class="secondary"
        onclick={() => {
          draftRecoveryIssue = '';
          void findRecoverableDraft();
        }}>{t.retryDraftRecovery}</button
      >
    {/if}
    {#if !installedApp}
      <InstallHelp installed={installedApp} />
    {/if}
  </section>

  <DraftRecovery
    open={draftRecoveryOpen}
    sourceName={recoverableDraft?.photos[0]?.sourceName ?? t.unknownPhoto}
    onClose={() => (draftRecoveryOpen = false)}
    onResume={resumeRecoveredDraft}
    onDiscard={discardRecoveredDraft}
  />

  {#if viewState === 'empty'}
    <ImportPanel onFiles={handleFiles} />
  {:else if viewState === 'loading'}
    <StatusRegion message={statusMessage} busy />
    <button type="button" class="secondary" onclick={() => (viewState = 'empty')}>{t.cancel}</button
    >
  {:else if viewState === 'error' && !photo}
    <StatusRegion kind="alert" message={errorMessage} />
    <button type="button" class="primary" disabled aria-describedby="no-photo-review-reason"
      >{t.reviewExport}</button
    >
    <p id="no-photo-review-reason">{t.noPhotoReviewReason}</p>
    <button type="button" class="secondary" onclick={() => (viewState = 'empty')}
      >{t.retryOrReplace}</button
    >
    <ImportPanel onFiles={handleFiles} />
  {:else if photo && configuration}
    <StatusRegion
      kind={viewState === 'error' ? 'alert' : 'status'}
      message={viewState === 'error' ? errorMessage : statusMessage}
      busy={viewState === 'exporting'}
    />
    <div class="workspace-grid">
      <nav class="photo-rail" aria-label={t.photosLabel}>
        {#if isBatch && batchSession}
          <PhotoNavigator
            items={batchNavigatorItems}
            activeItemId={batchSession.activeItemId}
            onSelect={loadBatchItem}
            onRemove={removeInvalidItem}
          />
        {:else}
          <PhotoStatus
            name={photo.sourceName}
            status={viewState === 'success'
              ? 'Exported'
              : coordinateReady
                ? 'Ready'
                : 'Missing coordinate'}
            active
          />
        {/if}
        <ImportPanel onFiles={handleFiles} />
      </nav>

      <PreviewStage
        {photoUrl}
        photoAlt={`${t.previewOf} ${photo.sourceName}`}
        {overlays}
        selectedId={selectedOverlayId}
        onSelect={(id) => {
          selectedOverlayId = id;
          inspectorTab = 'overlays';
        }}
        onMove={moveById}
        onUpdate={updateById}
      />

      <aside class="inspector" aria-label={t.photoInspectorLabel}>
        <div class="tabs" role="tablist" aria-label={t.inspectorSectionsLabel}>
          {#each ['coordinate', 'overlays', 'export'] as tab (tab)}
            <button
              type="button"
              role="tab"
              aria-selected={inspectorTab === tab}
              onclick={() => (inspectorTab = tab as InspectorTab)}
              >{tab === 'export'
                ? t.exportSettings
                : tab === 'coordinate'
                  ? t.coordinateTab
                  : t.overlaysTab}</button
            >
          {/each}
        </div>

        {#if inspectorTab === 'coordinate'}
          <CoordinateCard
            {coordinate}
            {displayText}
            captureCoordinate={photo.metadataSummary.captureGps}
            {locationError}
            {manualError}
            onUseCurrentLocation={handleCurrentLocation}
            onManualAccepted={handleManualCoordinate}
            onDisplayChange={handleDisplayChange}
          />
          <button
            type="button"
            class="map-action"
            disabled={!coordinateReady}
            onclick={requestMapPreview}>{t.previewOnMap}</button
          >
        {:else if inspectorTab === 'overlays'}
          <div class="add-overlays" aria-label={t.addTextOverlayLabel}>
            <button type="button" onclick={() => addOverlay('title')}>{t.addTitle}</button>
            <button type="button" onclick={() => addOverlay('team')}>{t.addTeam}</button>
            <button type="button" onclick={() => addOverlay('freeform')}>{t.addFreeformText}</button
            >
          </div>
          <OverlayList
            {overlays}
            selectedId={selectedOverlayId}
            onSelect={(id) => (selectedOverlayId = id)}
            onRemove={removeOverlayById}
            onReorder={reorderOverlayById}
          />
          <OverlayInspector
            overlay={selectedOverlay}
            onUpdate={updateSelected}
            onMove={moveSelected}
            onResize={resizeSelected}
            onRemove={removeSelected}
          />
        {:else}
          {#if isBatch}
            <BatchSettings onApply={applySharedSettings} />
          {/if}
          <ExportSettings {configuration} onChange={updateConfiguration} />
        {/if}

        <div class="primary-actions">
          <button
            type="button"
            class="primary"
            disabled={!canOpenReview || viewState === 'exporting'}
            aria-describedby={!canOpenReview ? 'review-disabled-reason' : undefined}
            onclick={openExportReview}>{t.reviewExport}</button
          >
          {#if !canOpenReview}
            <p id="review-disabled-reason">{disabledReason}</p>
          {/if}
        </div>
      </aside>
    </div>

    {#if isBatch && exportResults.length > 0}
      <BatchResults items={batchResultItems} onRetry={() => void retryFailedBatch()} />
    {:else if exportResults.length > 0}
      <ExportResults
        results={exportResults}
        onRetry={() => {
          viewState = 'editing';
          reviewOpen = true;
        }}
      />
    {/if}

    <ExportReview
      open={reviewOpen}
      photoName={photo.sourceName}
      {configuration}
      ready={canReview}
      reason={disabledReason}
      onClose={() => (reviewOpen = false)}
      onConfirm={confirmExport}
    />

    <BatchReview
      open={batchReviewOpen}
      items={batchReviewItems}
      onDecision={decideBatchItem}
      onRemove={removeInvalidItem}
      onClose={() => (batchReviewOpen = false)}
      onConfirm={confirmBatchExport}
    />

    <MapConsent
      open={mapConsentOpen}
      onAccept={acceptMapConsent}
      onDecline={() => (mapConsentOpen = false)}
    />

    {#if mapPreviewOpen && coordinate}
      {#key `${isOnline}:${coordinate.latitude}:${coordinate.longitude}`}
        <MapPreview
          center={{ latitude: coordinate.latitude, longitude: coordinate.longitude }}
          online={isOnline}
          onClose={() => (mapPreviewOpen = false)}
          onRevoke={revokeMapNetworkConsent}
        />
      {/key}
    {/if}
  {/if}
</main>

<style>
  .workspace {
    display: grid;
    min-height: 100vh;
    align-content: start;
    gap: 1rem;
    padding: clamp(1rem, 2vw, 1.5rem);
  }

  .app-header,
  .tabs,
  .add-overlays,
  .primary-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }

  .app-header {
    justify-content: space-between;
  }

  .application-status {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: start;
    gap: 0.75rem;
  }

  h1,
  p {
    margin: 0;
  }

  h1 {
    font-size: clamp(1.75rem, 4vw, 2.75rem);
  }

  .eyebrow {
    color: #93c5fd;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .privacy {
    padding: 0.5rem 0.75rem;
    border: 1px solid #34d399;
    border-radius: 999px;
    color: #a7f3d0;
  }

  .workspace-grid {
    display: grid;
    grid-template-columns: minmax(12rem, 0.24fr) minmax(0, 1fr) minmax(18rem, 0.38fr);
    align-items: start;
    gap: 1rem;
  }

  .photo-rail,
  .inspector {
    display: grid;
    min-width: 0;
    gap: 1rem;
  }

  .photo-rail :global(.import-panel) {
    padding: 1rem;
  }

  .tabs button,
  .add-overlays button,
  .map-action,
  .primary,
  .secondary {
    min-height: 44px;
    padding: 0.6rem 0.85rem;
    border: 1px solid #60a5fa;
    border-radius: 0.65rem;
    color: #eff6ff;
    background: #1e3a8a;
    cursor: pointer;
  }

  .tabs button[aria-selected='true'],
  .primary {
    color: #0f172a;
    background: #93c5fd;
    font-weight: 700;
  }

  .primary:disabled {
    color: #94a3b8;
    background: #1e293b;
    cursor: not-allowed;
  }

  .map-action {
    width: fit-content;
  }

  .primary-actions {
    padding: 0.75rem 0;
    background: #070b14;
  }

  .primary-actions p {
    color: #fbbf24;
  }

  @media (max-width: 1023px) {
    .workspace-grid {
      grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.55fr);
    }

    .photo-rail {
      grid-column: 1 / -1;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 767px) {
    .workspace {
      padding: 0.75rem;
    }

    .workspace-grid,
    .photo-rail,
    .application-status {
      grid-template-columns: minmax(0, 1fr);
    }

    .photo-rail {
      overflow-x: auto;
    }

    .primary-actions {
      position: sticky;
      bottom: 0;
      z-index: 5;
    }

    .inspector :global(input),
    .inspector :global(textarea),
    .inspector :global(select),
    .inspector :global(button) {
      scroll-margin-bottom: 5rem;
    }
  }
</style>
