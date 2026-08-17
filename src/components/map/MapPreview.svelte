<script lang="ts">
  import { onDestroy, onMount } from 'svelte';

  import type { Wgs84Coordinate } from '../../domain/coordinates/types';
  import { messages } from '../../i18n';
  import {
    createEmap5Preview,
    EMAP5_SERVICE_URL,
    type CreateEmap5Preview,
    type Emap5PreviewHandle,
  } from '../../infrastructure/map/emap5';

  const t = messages.en;

  let {
    center,
    online = typeof navigator === 'undefined' ? true : navigator.onLine,
    createPreview = createEmap5Preview,
    onClose = () => undefined,
    onRevoke = () => undefined,
  }: {
    center: Wgs84Coordinate;
    online?: boolean;
    createPreview?: CreateEmap5Preview;
    onClose?: () => void;
    onRevoke?: () => void;
  } = $props();

  type PreviewStatus = 'loading' | 'open' | 'offline' | 'providerError';

  let container = $state<HTMLDivElement>();
  let status = $state<PreviewStatus>('loading');
  let handle: Emap5PreviewHandle | null = null;
  let generation = 0;

  function destroyMap(): void {
    generation += 1;
    handle?.destroy();
    handle = null;
  }

  async function start(): Promise<void> {
    destroyMap();
    if (!online || !container) {
      status = 'offline';
      return;
    }
    status = 'loading';
    const currentGeneration = generation;
    try {
      const next = await createPreview(
        container,
        { latitude: center.latitude, longitude: center.longitude },
        {
          onTileError: () => {
            if (currentGeneration !== generation) return;
            destroyMap();
            status = 'providerError';
          },
        },
      );
      if (currentGeneration !== generation) {
        next.destroy();
        return;
      }
      handle = next;
      status = 'open';
    } catch {
      if (currentGeneration === generation) status = 'providerError';
    }
  }

  function close(): void {
    destroyMap();
    onClose();
  }

  function revoke(): void {
    destroyMap();
    onRevoke();
  }

  onMount(start);
  onDestroy(destroyMap);
</script>

<section class="map-preview" aria-labelledby="map-preview-title">
  <div class="heading">
    <div>
      <p class="eyebrow">{t.emap5Label}</p>
      <h2 id="map-preview-title">
        {status === 'offline' || status === 'providerError' ? t.mapUnavailable : t.mapPreview}
      </h2>
    </div>
    <div class="actions">
      <button type="button" onclick={close}>{t.closeMap}</button>
      <button type="button" onclick={revoke}>{t.revokeConsent}</button>
    </div>
  </div>

  {#if status === 'offline'}
    <p class="warning">{t.mapOfflineMessage}</p>
    <button type="button" disabled>{t.retry}</button>
  {:else if status === 'providerError'}
    <p class="warning">{t.mapProviderErrorMessage}</p>
    <button type="button" onclick={start}>{t.retry}</button>
  {:else}
    <p role="status">{status === 'loading' ? t.loadingMap : t.onlineMap}</p>
  {/if}

  <div
    class:hidden={status === 'offline' || status === 'providerError'}
    class="map-host"
    bind:this={container}
  ></div>

  {#if status === 'loading' || status === 'open'}
    <a href={EMAP5_SERVICE_URL} target="_blank" rel="noreferrer">{t.emap5Attribution}</a>
  {/if}
</section>

<style>
  .map-preview {
    display: grid;
    gap: 0.75rem;
    padding: 1rem;
    border: 1px solid #475569;
    border-radius: 1rem;
    background: #0f172a;
  }

  .heading,
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  h2,
  p {
    margin: 0;
  }

  .eyebrow {
    color: #34d399;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .map-host {
    min-height: 18rem;
    overflow: hidden;
    border-radius: 0.75rem;
  }

  .hidden {
    display: none;
  }

  button {
    min-height: 44px;
  }

  .warning {
    color: #fbbf24;
  }

  a {
    color: #93c5fd;
  }
</style>
