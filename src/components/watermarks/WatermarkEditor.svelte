<script lang="ts">
  import type { WatermarkConfig, WatermarkAsset } from '../../domain/watermarks/types';
  import type { SourcePhoto } from '../../domain/photos/types';
  import WatermarkPreview from './WatermarkPreview.svelte';
  let {
    photo,
    assets = [],
    compact = false,
    value,
    onChange,
    onImage,
  }: {
    photo?: SourcePhoto;
    assets?: readonly WatermarkAsset[];
    compact?: boolean;
    value: WatermarkConfig;
    onChange: (value: WatermarkConfig) => void;
    onImage: (file: File) => void;
  } = $props();
  let detailsOpen = $state(false);
  const positions = {
    'top-left': '左上角',
    'top-right': '右上角',
    'bottom-left': '左下角',
    'bottom-right': '右下角',
    center: '中央',
  };
  function update(patch: Partial<WatermarkConfig>): void {
    onChange({ ...value, ...patch });
  }
</script>

{#if compact}
  <section class="compact" aria-label="浮水印設定">
    {#if photo}<WatermarkPreview {photo} {value} {assets} />{/if}
    <label class="pm-field enabled"
      ><span>啟用浮水印</span><span class="toggle-value"
        ><input
          type="checkbox"
          aria-label="啟用浮水印"
          checked={value.enabled}
          onchange={(event) => update({ enabled: event.currentTarget.checked })}
        />{value.enabled ? '開啟' : '關閉'}</span
      ></label
    >
    <div class="modes">
      <button
        aria-pressed={value.kind === 'text' && value.mode === 'single'}
        onclick={() => update({ kind: 'text', mode: 'single' })}>單一位置</button
      >
      <button
        aria-pressed={value.kind === 'text' && value.mode === 'repeat'}
        onclick={() => update({ kind: 'text', mode: 'repeat' })}>隨機重複</button
      >
    </div>
    {#if value.kind === 'text'}<label class="pm-field"
        ><span>浮水印內容</span><input
          aria-label="浮水印文字"
          maxlength="120"
          value={value.text}
          oninput={(event) => update({ text: event.currentTarget.value })}
          placeholder="輸入浮水印文字"
        /></label
      >{/if}
    <label class="image-button"
      >{value.kind === 'image' ? '替換 PNG 圖片浮水印' : '＋ 使用 PNG 圖片浮水印'}<input
        class="image-input"
        aria-label="選取 PNG 浮水印"
        type="file"
        accept="image/png"
        onchange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) onImage(file);
          event.currentTarget.value = '';
        }}
      /></label
    >
    <button
      class="pm-setting"
      aria-expanded={detailsOpen}
      onclick={() => (detailsOpen = !detailsOpen)}
      ><small>{value.mode === 'repeat' ? '重複密度與不透明度' : '位置與不透明度'}</small><span
        >{value.mode === 'repeat'
          ? `密度：${{ low: '低', medium: '適中', high: '高' }[value.density]}`
          : positions[value.singlePosition]} · 不透明度 {Math.round(value.opacity * 100)}% ›</span
      ></button
    >
    {#if detailsOpen}
      {#if value.mode === 'single'}<label class="pm-field"
          ><span>浮水印位置</span><select
            value={value.singlePosition}
            onchange={(event) =>
              update({
                singlePosition: event.currentTarget.value as WatermarkConfig['singlePosition'],
              })}
            >{#each Object.entries(positions) as [id, label] (id)}<option value={id}>{label}</option
              >{/each}</select
          ></label
        >
      {:else}<label class="pm-field"
          ><span>重複密度</span><select
            value={value.density}
            onchange={(event) =>
              update({ density: event.currentTarget.value as WatermarkConfig['density'] })}
            ><option value="low">低 · 5 個</option><option value="medium">適中 · 10 個</option
            ><option value="high">高 · 20 個</option></select
          ></label
        >{/if}
      <label class="pm-field"
        ><span>浮水印不透明度 · {Math.round(value.opacity * 100)}%</span><input
          type="range"
          min="0"
          max="100"
          value={value.opacity * 100}
          oninput={(event) => update({ opacity: +event.currentTarget.value / 100 })}
        /></label
      >
    {/if}
  </section>
{:else}
  <section class="watermark-settings" aria-label="浮水印設定">
    <label class="toggle"
      ><input
        type="checkbox"
        checked={value.enabled}
        onchange={(event) => update({ enabled: event.currentTarget.checked })}
      />啟用浮水印</label
    >
    <label
      >浮水印類型<select
        value={value.kind}
        onchange={(event) =>
          update({
            kind: event.currentTarget.value as 'text' | 'image',
            mode: event.currentTarget.value === 'image' ? 'single' : value.mode,
          })}><option value="text">文字</option><option value="image">PNG 圖片</option></select
      ></label
    >
    {#if value.kind === 'text'}<label
        >浮水印文字<input
          type="text"
          maxlength="240"
          value={value.text}
          oninput={(event) => update({ text: event.currentTarget.value })}
        /></label
      >
      <div class="modes">
        <button aria-pressed={value.mode === 'single'} onclick={() => update({ mode: 'single' })}
          >單一位置</button
        ><button aria-pressed={value.mode === 'repeat'} onclick={() => update({ mode: 'repeat' })}
          >隨機重複</button
        >
      </div>{:else}<label
        >選取 PNG 浮水印<input
          type="file"
          accept="image/png"
          onchange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) onImage(file);
          }}
        /></label
      >
      <p>PNG 僅支援單一位置，最大 2 MiB、2048 × 2048。</p>{/if}
    {#if value.mode === 'single'}<label
        >浮水印位置<select
          value={value.singlePosition}
          onchange={(event) =>
            update({
              singlePosition: event.currentTarget.value as WatermarkConfig['singlePosition'],
            })}
          ><option value="top-left">左上</option><option value="top-right">右上</option><option
            value="bottom-left">左下</option
          ><option value="bottom-right">右下</option><option value="center">中央</option></select
        ></label
      >{:else}<label
        >重複密度<select
          value={value.density}
          onchange={(event) =>
            update({ density: event.currentTarget.value as WatermarkConfig['density'] })}
          ><option value="low">低 · 5 個</option><option value="medium">中 · 10 個</option><option
            value="high">高 · 20 個</option
          ></select
        ></label
      >{/if}
    <label
      >浮水印透明度 · {Math.round(value.opacity * 100)}%<input
        type="range"
        min="0"
        max="100"
        value={value.opacity * 100}
        oninput={(event) => update({ opacity: +event.currentTarget.value / 100 })}
      /></label
    >
    <p>浮水印位於四角文字與座標下方。相同設定會保留排列。</p>
  </section>
{/if}

<style>
  .watermark-settings {
    display: grid;
    gap: 16px;
  }
  .watermark-settings label {
    display: grid;
    gap: 8px;
  }
  .watermark-settings input,
  .watermark-settings select,
  .watermark-settings button,
  .modes button {
    min-height: 48px;
    min-width: 0;
    width: 100%;
    padding: 10px;
    border: 1px solid var(--pm-color-border);
    border-radius: 12px;
    background: white;
    color: var(--pm-color-ink);
  }
  .toggle {
    display: flex;
    align-items: center;
  }
  .watermark-settings input[type='checkbox'] {
    width: 22px;
  }
  .modes {
    display: flex;
    gap: 12px;
  }
  button[aria-pressed='true'] {
    background: var(--pm-color-pale);
    border-color: var(--pm-color-accent);
  }
  p {
    font-size: 12px;
    color: var(--pm-color-muted);
  }
  .compact {
    display: grid;
    gap: 12px;
  }
  .compact .modes {
    gap: 24px;
  }
  .compact .modes button {
    min-height: 50px;
    border: 0;
    font-size: 15px;
    font-weight: 500;
  }
  .compact .pm-setting {
    text-align: left;
  }
  .enabled .toggle-value {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 15px;
    color: var(--pm-color-ink);
    font-weight: 500;
  }
  .toggle-value input {
    width: 18px;
    height: 18px;
    accent-color: var(--pm-color-accent);
  }
  .image-button {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 50px;
    border-radius: 14px;
    background: white;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
  }
  .image-input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }
  .image-button:focus-within {
    outline: 3px solid var(--pm-color-accent);
    outline-offset: 3px;
  }
</style>
