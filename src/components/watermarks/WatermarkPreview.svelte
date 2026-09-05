<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { SourcePhoto } from '../../domain/photos/types';
  import type { WatermarkConfig, WatermarkAsset } from '../../domain/watermarks/types';
  import { arrangeWatermark } from '../../domain/watermarks/layout';
  import { createRenderWorkerClient } from '../../infrastructure/platform/renderWorkerClient';
  let {
    photo,
    value,
    assets,
  }: { photo: SourcePhoto; value: WatermarkConfig; assets: readonly WatermarkAsset[] } = $props();
  const renderer = createRenderWorkerClient();
  let url = $state(''),
    error = $state(''),
    busy = $state(false);
  $effect(() => {
    const source = photo,
      config = $state.snapshot(value),
      images = $state.snapshot(assets);
    const asset = images.find((item) => item.id === config.assetId);
    const arrangement = arrangeWatermark(
      source.id,
      source.displayWidth / source.displayHeight,
      config,
      asset ? asset.width / asset.height : 1,
    );
    let active = true;
    busy = true;
    error = '';
    const timer = setTimeout(async () => {
      if (config.enabled && (!arrangement || (config.kind === 'image' && !asset))) {
        if (active) {
          error = '請縮短文字、降低密度或選取 PNG 圖片。';
          busy = false;
        }
        return;
      }
      const result = await renderer.render(source.sourceBlob, {
        mode: 'preview',
        orientation: source.orientation,
        overlays: [],
        watermark: arrangement ? { config, arrangement, assets: images } : undefined,
        outputFormat: 'image/png',
        metadataMode: 'removeSupported',
      });
      if (!active) return;
      busy = false;
      if (result.ok) {
        if (url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(result.value.blob);
      } else error = '浮水印預覽無法產生，請重試。';
    }, 80);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  });
  onDestroy(() => {
    renderer.close();
    if (url) URL.revokeObjectURL(url);
  });
</script>

<div class="preview" aria-busy={busy}>
  {#if url}<img src={url} alt="樣板浮水印預覽" />{/if}
</div>
{#if error}<p role="alert">{error}</p>{/if}

<style>
  .preview {
    height: 180px;
    border-radius: 18px;
    overflow: hidden;
    background: var(--pm-color-pale);
    margin-bottom: 11px;
  }
  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  p {
    font-size: 12px;
    color: var(--pm-color-error);
  }
</style>
