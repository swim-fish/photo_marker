<script lang="ts">
  import { messages } from '../../i18n';

  const t = messages.en;
  type DraftUiStatus = 'idle' | 'saving' | 'saved' | 'denied' | 'quotaExceeded' | 'error';

  let { status = 'idle' }: { status?: DraftUiStatus } = $props();

  const message = $derived(
    status === 'saving'
      ? t.savingDraft
      : status === 'saved'
        ? t.savedLocally
        : status === 'denied'
          ? t.bestEffortDraft
          : status === 'quotaExceeded'
            ? t.draftStorageFull
            : status === 'error'
              ? t.draftSaveFailed
              : t.draftNotStarted,
  );
  const alert = $derived(status === 'quotaExceeded' || status === 'error');
</script>

<p class:alert role={alert ? 'alert' : 'status'}>{message}</p>

<style>
  p {
    margin: 0;
    color: #a7f3d0;
  }

  .alert {
    color: #fecdd3;
  }
</style>
