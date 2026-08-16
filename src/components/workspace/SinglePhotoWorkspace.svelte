<script lang="ts">
  import { messages } from '../../i18n';
  import ImportPanel from './ImportPanel.svelte';
  import StatusRegion from './StatusRegion.svelte';

  const t = messages.en;

  type WorkspaceState = 'empty' | 'loading' | 'error' | 'disabled' | 'ready' | 'success';

  let {
    state,
    onImport = () => undefined,
    onCancel = () => undefined,
    onRetry = () => undefined,
    onReviewExport = () => undefined,
    onExport = () => undefined,
    errorMessage = t.unsupportedPhotoMessage,
    disabledReason = t.resolvePhotoBeforeExport,
    outputName = t.defaultAnnotatedPhotoName,
    canExport = false,
  }: {
    state: WorkspaceState;
    onImport?: () => void;
    onCancel?: () => void;
    onRetry?: () => void;
    onReviewExport?: () => void;
    onExport?: () => void;
    errorCode?: string;
    errorMessage?: string;
    disabledReason?: string;
    outputName?: string;
    canExport?: boolean;
  } = $props();

  function activateOnEnter(event: KeyboardEvent, action: () => void): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }
</script>

<section class="single-photo" aria-label={t.singlePhotoWorkspaceLabel}>
  {#if state === 'empty'}
    <ImportPanel {onImport} />
  {:else if state === 'loading'}
    <StatusRegion message={t.importingPhoto} busy />
    <button type="button" onclick={onCancel} onkeydown={(event) => activateOnEnter(event, onCancel)}
      >{t.cancel}</button
    >
  {:else if state === 'error'}
    <StatusRegion kind="alert" message={errorMessage} />
    <button type="button" onclick={onRetry} onkeydown={(event) => activateOnEnter(event, onRetry)}
      >{t.retryOrReplace}</button
    >
  {:else if state === 'success'}
    <StatusRegion message={t.successAnnotatedCopy} />
    <p>{t.outputLabel} <strong>{outputName}</strong></p>
  {:else}
    <div class="actions">
      <button
        type="button"
        disabled={state === 'disabled'}
        aria-describedby={state === 'disabled' ? 'review-disabled-reason' : undefined}
        onclick={onReviewExport}
        onkeydown={(event) => activateOnEnter(event, onReviewExport)}>{t.reviewExport}</button
      >
      {#if state === 'ready'}
        <button
          type="button"
          disabled={!canExport}
          onclick={onExport}
          onkeydown={(event) => activateOnEnter(event, onExport)}>{t.exportAction}</button
        >
      {/if}
    </div>
    {#if state === 'disabled'}
      <p id="review-disabled-reason" class="reason">{disabledReason}</p>
    {/if}
  {/if}
</section>

<style>
  .single-photo {
    display: grid;
    gap: 1rem;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  button {
    min-height: 44px;
    padding: 0.65rem 1rem;
    border: 1px solid #60a5fa;
    border-radius: 0.75rem;
    color: #eff6ff;
    background: #1d4ed8;
    cursor: pointer;
    font-weight: 700;
  }

  button:disabled {
    border-color: #475569;
    color: #94a3b8;
    background: #1e293b;
    cursor: not-allowed;
  }

  .reason {
    margin: 0;
    color: #fbbf24;
  }
</style>
