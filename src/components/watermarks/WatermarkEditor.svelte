<script lang="ts">
  import type { WatermarkConfig } from '../../domain/watermarks/types';
  let {
    value,
    onChange,
    onImage,
  }: {
    value: WatermarkConfig;
    onChange: (value: WatermarkConfig) => void;
    onImage: (file: File) => void;
  } = $props();
  function update(patch: Partial<WatermarkConfig>): void {
    onChange({ ...value, ...patch });
  }
</script>

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

<style>
  .watermark-settings {
    display: grid;
    gap: 16px;
  }
  label {
    display: grid;
    gap: 8px;
  }
  input,
  select,
  button {
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
  input[type='checkbox'] {
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
</style>
