<script lang="ts">
  import type { OfflineReadinessResult } from '../../infrastructure/pwa/readiness';
  import { messages } from '../../i18n';

  const t = messages.en;

  let {
    readiness,
    online = typeof navigator === 'undefined' ? true : navigator.onLine,
  }: { readiness: OfflineReadinessResult; online?: boolean } = $props();

  const detail = $derived.by(() => {
    if (readiness.status === 'ready') return online ? t.onlineNow : t.workingOffline;
    switch (readiness.reason) {
      case 'insecure-context':
        return t.insecureContextHelp;
      case 'service-worker-unavailable':
        return t.serviceWorkerHelp;
      case 'shell-incomplete':
        return t.shellIncompleteHelp;
      case 'database-unavailable':
        return t.databaseUnavailableHelp;
    }
  });
</script>

<section class:ready={readiness.status === 'ready'} class="offline-status" role="status">
  <strong>{readiness.status === 'ready' ? t.offlineReady : t.offlineNotReady}</strong>
  <span>{detail}</span>
</section>

<style>
  .offline-status {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 0.75rem;
    padding: 0.7rem 0.9rem;
    border: 1px solid #fbbf24;
    border-radius: 0.75rem;
    color: #fde68a;
    background: #422006;
  }

  .offline-status.ready {
    border-color: #34d399;
    color: #a7f3d0;
    background: #052e2b;
  }

  span {
    color: inherit;
  }
</style>
