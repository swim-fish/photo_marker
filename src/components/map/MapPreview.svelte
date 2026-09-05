<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { setMapNetworkLease } from '../../infrastructure/map/networkLease';
  import Button from '../ui/Button.svelte';
  import MapLayerPicker from './MapLayerPicker.svelte';
  import {
    createEmap5Preview,
    EMAP5_SERVICE_URL,
    type CreateEmap5Preview,
    type Emap5PreviewHandle,
  } from '../../infrastructure/map/emap5';
  import type { MapLayerId } from '../../infrastructure/map/layers';
  import type { Wgs84Coordinate } from '../../domain/coordinates/types';
  let {
    center,
    consented = false,
    online = true,
    createPreview = createEmap5Preview,
    onClose = () => {},
    onRevoke = () => {},
    onConfirm = () => {},
  }: {
    center: Wgs84Coordinate;
    consented?: boolean;
    online?: boolean;
    createPreview?: CreateEmap5Preview;
    onClose?: () => void;
    onRevoke?: () => void;
    onConfirm?: (value: Wgs84Coordinate) => void;
  } = $props();
  let host = $state<HTMLDivElement>();
  let candidate = $state<Wgs84Coordinate>({ latitude: 0, longitude: 0 });
  let moving = $state(false),
    status = $state('載入地圖中…'),
    layersOpen = $state(false),
    zoom = $state(16);
  let selected = $state<MapLayerId>('EMAP5');
  let handle: Emap5PreviewHandle | null = null;
  let generation = 0;
  function destroy(): void {
    void setMapNetworkLease(false);
    generation++;
    handle?.destroy();
    handle = null;
  }
  $effect(() => {
    const allowed = consented && online,
      element = host,
      initial = { ...center };
    destroy();
    if (!allowed || !element) {
      status = online ? '尚未同意地圖連線' : '離線時無法載入地圖';
      return;
    }
    const current = generation;
    candidate = initial;
    status = '載入地圖中…';
    void setMapNetworkLease(true)
      .then((allowed) => {
        if (!allowed || current !== generation) throw new Error('Map permission changed.');
        return createPreview(element, initial, {
          canLoad: () => current === generation && consented && online,
          onMoving: () => {
            if (current === generation) moving = true;
          },
          onCenterChanged: (value) => {
            if (current === generation) {
              candidate = value;
              moving = false;
            }
          },
          onZoomChanged: (value) => {
            if (current === generation) zoom = value;
          },
          onTileLoad: () => {
            if (current === generation) status = '線上地圖';
          },
          onTileError: () => {
            if (current === generation) status = '圖層無法載入，請切換圖層或返回手動輸入';
          },
        });
      })
      .then((value) => {
        if (current !== generation) value.destroy();
        else {
          handle = value;
        }
      })
      .catch(() => {
        if (current === generation) status = '地圖無法載入';
      });
    return destroy;
  });
  onMount(() => {
    const sync = () => {
      if (consented && online) void setMapNetworkLease(true);
    };
    navigator.serviceWorker?.addEventListener('controllerchange', sync);
    return () => navigator.serviceWorker?.removeEventListener('controllerchange', sync);
  });
  onDestroy(destroy);
  function choose(layer: MapLayerId): void {
    if (!consented || !online) return;
    selected = layer;
    status = '載入地圖中…';
    handle?.setLayer?.(layer);
    layersOpen = false;
  }
</script>

<section class="map-preview" aria-label="地圖選取位置">
  <h2>{online ? '移動地圖，對準位置' : '地圖無法使用'}</h2>
  <p role="status">{status}</p>
  <div class="map-viewport">
    <div class="map-host" bind:this={host}></div>
    <div class="crosshair" aria-label="地圖中央準星">＋</div>
    <button class="layer-button" onclick={() => (layersOpen = !layersOpen)}>圖層</button
    >{#if layersOpen}<div class="layer-menu">
        <MapLayerPicker {selected} onSelect={choose} />
      </div>{/if}
  </div>
  <div class="zoom">
    <button
      disabled={!online || zoom <= 0}
      aria-label="縮小地圖"
      onclick={() => handle?.zoomBy?.(-1)}>−</button
    ><span>縮放 {zoom}</span><button
      disabled={!online || zoom >= 18}
      aria-label="放大地圖"
      onclick={() => handle?.zoomBy?.(1)}>＋</button
    >
  </div>
  <div class="pan" aria-label="移動地圖">
    <button onclick={() => handle?.panBy?.(0, -100)}>向北</button><button
      onclick={() => handle?.panBy?.(-100, 0)}>向西</button
    ><button onclick={() => handle?.panBy?.(100, 0)}>向東</button><button
      onclick={() => handle?.panBy?.(0, 100)}>向南</button
    >
  </div>
  <p>{candidate.latitude.toFixed(6)}, {candidate.longitude.toFixed(6)}</p>
  <Button
    disabled={!consented || !online || moving || status !== '線上地圖'}
    onclick={() => {
      const value = { ...candidate };
      destroy();
      onConfirm(value);
    }}>使用準星位置</Button
  >
  <Button
    variant="secondary"
    onclick={() => {
      destroy();
      onClose();
    }}>取消選取</Button
  ><Button
    variant="secondary"
    onclick={() => {
      destroy();
      onRevoke();
    }}>撤銷地圖同意</Button
  >
  <a href={EMAP5_SERVICE_URL} target="_blank" rel="noreferrer">圖資來源：內政部國土測繪中心 NLSC</a>
</section>

<style>
  .map-preview {
    display: grid;
    gap: 12px;
  }
  h2,
  p {
    margin: 0;
  }
  h2 {
    font-size: 18px;
  }
  .map-viewport {
    position: relative;
    height: 360px;
    isolation: isolate;
    overflow: hidden;
    border-radius: 18px;
    background: var(--pm-color-pale);
  }
  .map-host {
    height: 100%;
    width: 100%;
  }
  .crosshair {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 700;
    pointer-events: none;
    font-size: 36px;
    color: #18352f;
    text-shadow: 0 0 3px white;
  }
  .layer-button {
    position: absolute;
    right: 12px;
    top: 12px;
    z-index: 800;
  }
  .layer-menu {
    position: absolute;
    top: 70px;
    left: 12px;
    right: 12px;
    z-index: 900;
  }
  button {
    min-height: 50px;
    padding: 10px;
    border: 1px solid var(--pm-color-border);
    background: white;
    color: var(--pm-color-ink);
    border-radius: 14px;
  }
  .zoom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }
  .zoom button {
    width: 64px;
    font-size: 24px;
  }
  .pan {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .pan button {
    flex: 1;
    min-width: 50px;
  }
  a {
    color: var(--pm-color-accent);
    font-size: 12px;
  }
</style>
