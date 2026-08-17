<script lang="ts">
  import { onDestroy, onMount } from 'svelte';

  import CoordinateCard from '../coordinate/CoordinateCard.svelte';
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
  import type { ExportConfiguration, ExportResult } from '../../domain/export/types';
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
  import type { SourcePhoto } from '../../domain/photos/types';
  import { requestCurrentLocation } from '../../infrastructure/platform/geolocation';
  import {
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
  let draftSession = $state<EditingSession | null>(null);
  let draftStatus = $state<DraftUiStatus>('idle');
  let recoverableDraft = $state<DraftSnapshot | null>(null);
  let draftRecoveryOpen = $state(false);
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
    Boolean(
      configuration &&
      photo &&
      !(
        configuration.metadataMode === 'preserveSupported' &&
        configuration.format !== photo.sourceMime
      ),
    ),
  );
  const canReview = $derived(coordinateReady && overlaysReady && configurationReady);
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

  function nextId(prefix: string): string {
    return typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function revokePhotoUrl(): void {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = '';
  }

  function currentDraftSnapshot(): DraftSnapshot | null {
    if (!draftSession || !photo || !configuration) return null;
    return $state.snapshot({
      session: draftSession,
      photos: [photo],
      coordinates: coordinate ? [coordinate] : [],
      overlays,
      exportConfigurations: [configuration],
      exportResults,
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
    if (!result.ok) return;
    recoverableDraft = result.value;
    draftRecoveryOpen = true;
  }

  onMount(() => {
    mapConsent = readMapConsent(localStorage);
    isOnline = navigator.onLine;
    installedApp = window.matchMedia('(display-mode: standalone)').matches;
    void refreshOfflineReadiness();
    void findRecoverableDraft();
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

  function acceptedCoordinate(
    value: Wgs84Coordinate,
    provenance: 'CAPTURE_METADATA' | 'MANUAL_INPUT',
  ): CoordinateRecord | null {
    if (!photo) return null;
    const result = replaceWorkingCoordinate(coordinate, {
      id: nextId('coordinate'),
      photoId: photo.id,
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

  async function handleFiles(files: FileList): Promise<void> {
    const selected = files.item(0);
    if (!selected) return;
    viewState = 'loading';
    statusMessage = `${t.importProgress} ${selected.name}`;
    errorMessage = '';
    const result = await importPhoto(selected, {
      id: nextId('photo'),
      sessionId: nextId('session'),
    });
    if (!result.ok) {
      viewState = 'error';
      errorMessage = result.error.message;
      statusMessage = t.photoImportFailed;
      return;
    }

    revokePhotoUrl();
    photo = result.value;
    photoUrl = URL.createObjectURL(result.value.sourceBlob);
    overlays = [];
    selectedOverlayId = null;
    configuration = defaultConfiguration(result.value);
    outputName = '';
    exportResults = [];
    if (result.value.metadataSummary.captureGps) {
      coordinate = acceptedCoordinate(result.value.metadataSummary.captureGps, 'CAPTURE_METADATA');
      if (coordinate) syncCoordinateOverlay(coordinate);
    } else {
      coordinate = null;
    }
    viewState = 'editing';
    statusMessage = `${result.value.sourceName} ${t.importedLocallySuffix}`;
    draftSession = editingSessionReducer(
      createEditingSession({ id: result.value.sessionId, photoIds: [result.value.id] }),
      { type: 'transition', status: 'editing' },
    );
    scheduleCurrentDraft(false);
  }

  function resumeRecoveredDraft(): void {
    const snapshot = recoverableDraft;
    const restoredPhoto = snapshot?.photos[0];
    const restoredConfiguration = snapshot?.exportConfigurations?.[0];
    if (!snapshot || !restoredPhoto || !restoredConfiguration) return;
    revokePhotoUrl();
    photo = restoredPhoto;
    photoUrl = URL.createObjectURL(restoredPhoto.sourceBlob);
    coordinate = snapshot.coordinates?.[0] ?? null;
    overlays = [...(snapshot.overlays ?? [])];
    selectedOverlayId = overlays[0]?.id ?? null;
    configuration = restoredConfiguration;
    exportResults = [...(snapshot.exportResults ?? [])];
    draftSession = snapshot.session;
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

  async function openExportReview(): Promise<void> {
    const snapshot = currentDraftSnapshot();
    if (snapshot) {
      draftStatus = 'saving';
      await draftService.flush(snapshot);
    }
    reviewOpen = true;
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
        <PhotoStatus
          name={photo.sourceName}
          status={viewState === 'success'
            ? 'Exported'
            : coordinateReady
              ? 'Ready'
              : 'Missing coordinate'}
          active
        />
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
          <ExportSettings {configuration} onChange={updateConfiguration} />
        {/if}

        <div class="primary-actions">
          <button
            type="button"
            class="primary"
            disabled={!canReview || viewState === 'exporting'}
            aria-describedby={!canReview ? 'review-disabled-reason' : undefined}
            onclick={openExportReview}>{t.reviewExport}</button
          >
          {#if !canReview}
            <p id="review-disabled-reason">{disabledReason}</p>
          {/if}
        </div>
      </aside>
    </div>

    {#if exportResults.length > 0}
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
    position: sticky;
    bottom: 0;
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
      z-index: 5;
    }
  }
</style>
