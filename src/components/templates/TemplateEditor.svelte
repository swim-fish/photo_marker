<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { AnnotationTemplate, CornerTexts } from '../../domain/templates/types';
  import type { WatermarkAsset } from '../../domain/watermarks/types';
  import { importWatermark } from '../../domain/watermarks/intake';
  import { sanitizeTemplate } from '../../domain/templates/templateService';
  import CornerTextEditor from '../overlays/CornerTextEditor.svelte';
  import WatermarkEditor from '../watermarks/WatermarkEditor.svelte';
  import RgbaPicker from '../ui/RgbaPicker.svelte';
  import NumberStepper from '../ui/NumberStepper.svelte';
  import Button from '../ui/Button.svelte';
  let {
    initial,
    texts,
    creating = false,
    onSave,
    onCancel,
  }: {
    initial: AnnotationTemplate;
    texts: CornerTexts;
    creating?: boolean;
    onSave: (value: AnnotationTemplate, assets: readonly WatermarkAsset[]) => Promise<boolean>;
    onCancel: () => void;
  } = $props();
  let value = $state(
    untrack(() => ({
      ...$state.snapshot(initial),
      name: creating ? '' : initial.name,
      defaultTexts: $state.snapshot(creating ? texts : (initial.defaultTexts ?? texts)),
    })),
  );
  type Panel = 'main' | 'texts' | 'watermark' | 'appearance' | 'coordinate';
  let panel = $state<Panel>('main'),
    busy = $state(false),
    importing = $state(false),
    error = $state(''),
    valid = $state(true);
  let checkpoint: typeof value | null = null;
  let assets: WatermarkAsset[] = [],
    generation = 0;
  onDestroy(() => {
    generation++;
  });
  function open(next: Panel): void {
    checkpoint = $state.snapshot(value);
    panel = next;
    error = '';
    valid = true;
  }
  export function back(): void {
    if (busy) return;
    generation++;
    importing = false;
    error = '';
    if (panel === 'main') onCancel();
    else {
      if (checkpoint) value = checkpoint;
      panel = 'main';
      valid = true;
    }
  }
  function done(): void {
    if (!valid || importing) return;
    generation++;
    panel = 'main';
    error = '';
  }
  async function image(file: File): Promise<void> {
    const current = ++generation;
    importing = true;
    const result = await importWatermark(file);
    if (current !== generation) return;
    importing = false;
    if (!result.ok) {
      error = 'PNG 浮水印無法讀取，請檢查格式、尺寸與檔案大小。';
      return;
    }
    assets = [...assets.filter((a) => a.id !== result.value.id), result.value];
    value = {
      ...value,
      watermark: { ...value.watermark, kind: 'image', mode: 'single', assetId: result.value.id },
    };
    error = '';
  }
  async function save(): Promise<void> {
    const clean = sanitizeTemplate($state.snapshot(value));
    if (!clean) {
      error = '請檢查樣板名稱與設定。';
      return;
    }
    busy = true;
    try {
      if (
        !(await onSave(
          clean,
          assets.filter((a) => a.id === clean.watermark.assetId),
        ))
      )
        error = '樣板儲存失敗，請重試。';
    } finally {
      busy = false;
    }
  }
</script>

<section aria-label="樣板編輯" aria-busy={busy || importing}>
  {#if error}<p role="alert">{error}</p>{/if}
  {#if panel === 'main'}
    <label
      >樣板名稱<input bind:value={value.name} maxlength="80" placeholder="例如：工程巡查" /></label
    >
    <button class="row" onclick={() => open('texts')}
      ><small>四角預設文字</small><span
        >{value.defaultTexts['top-left'] || '四個角落分別設定'} ›</span
      ></button
    >
    <button class="row" onclick={() => open('appearance')}
      ><small>文字框</small><span>文字樣式與 RGBA 底色 ›</span></button
    >
    <button class="row" onclick={() => open('coordinate')}
      ><small>座標格式與位置</small><span
        >{value.coordinateFormat.replace('_DD', '').replace('_TM2', '')} ›</span
      ></button
    >
    <button class="row" onclick={() => open('watermark')}
      ><small>浮水印</small><span
        >{value.watermark.enabled
          ? value.watermark.kind === 'image'
            ? 'PNG 圖片'
            : value.watermark.text || '已開啟'
          : '未啟用'} ›</span
      ></button
    >
    <p>儲存四角預設文字與浮水印，照片座標不變。</p>
    <Button disabled={busy || !value.name.trim()} onclick={save}
      >{creating ? '儲存目前設定為樣板' : '儲存變更'}</Button
    >
    <Button variant="secondary" disabled={busy} onclick={back}>取消</Button>
  {:else}
    {#if panel === 'texts'}<h2>四角預設文字</h2>
      <CornerTextEditor
        value={value.defaultTexts}
        onChange={(texts) => (value = { ...value, defaultTexts: texts })}
      />
      <p>套用此樣板時帶入以上文字；留白可清空該角落。</p>
    {:else if panel === 'watermark'}<h2>樣板浮水印</h2>
      <WatermarkEditor
        value={value.watermark}
        onChange={(watermark) => (value = { ...value, watermark })}
        onImage={image}
      />
    {:else if panel === 'appearance'}<h2>文字框樣式</h2>
      <NumberStepper
        label="文字大小"
        value={Math.round(value.appearance.fontSize * 390)}
        min={8}
        max={96}
        onChange={(n) =>
          (value = { ...value, appearance: { ...value.appearance, fontSize: n / 390 } })}
      />
      <label
        >文字顏色<input
          type="color"
          value={'#' +
            [
              value.appearance.textColor.red,
              value.appearance.textColor.green,
              value.appearance.textColor.blue,
            ]
              .map((n) => n.toString(16).padStart(2, '0'))
              .join('')}
          oninput={(event) => {
            const hex = event.currentTarget.value;
            value = {
              ...value,
              appearance: {
                ...value.appearance,
                textColor: {
                  red: parseInt(hex.slice(1, 3), 16),
                  green: parseInt(hex.slice(3, 5), 16),
                  blue: parseInt(hex.slice(5, 7), 16),
                  alpha: 1,
                },
              },
            };
          }}
        /></label
      >
      <NumberStepper
        label="文字框內距"
        value={Math.round(value.appearance.padding * 390)}
        min={0}
        max={40}
        onChange={(n) =>
          (value = { ...value, appearance: { ...value.appearance, padding: n / 390 } })}
      />
      <NumberStepper
        label="文字框圓角"
        value={Math.round(value.appearance.cornerRadius * 390)}
        min={0}
        max={40}
        onChange={(n) =>
          (value = { ...value, appearance: { ...value.appearance, cornerRadius: n / 390 } })}
      />
      <RgbaPicker
        value={value.appearance.backgroundColor}
        onChange={(color) =>
          (value = { ...value, appearance: { ...value.appearance, backgroundColor: color } })}
        onValidityChange={(v) => (valid = v)}
      />
    {:else}<h2>座標格式與位置</h2>
      <label
        >座標格式<select bind:value={value.coordinateFormat}
          ><option value="WGS84_DD">WGS84</option><option value="TWD97_TM2">TWD97</option><option
            value="MGRS">MGRS</option
          ></select
        ></label
      >
      <label
        >座標位置<select bind:value={value.coordinateCorner}
          ><option value="top-left">左上角</option><option value="top-right">右上角</option><option
            value="bottom-left">左下角</option
          ><option value="bottom-right">右下角</option></select
        ></label
      >
      {#if value.coordinateFormat === 'TWD97_TM2'}<label
          >中央經線<select bind:value={value.zone}
            ><option value={121}>121°</option><option value={119}>119°</option></select
          ></label
        >{/if}
      {#if value.coordinateFormat === 'MGRS'}<NumberStepper
          label="座標精度"
          value={value.precision}
          min={0}
          max={5}
          onChange={(n) => (value = { ...value, precision: n })}
        />{/if}
    {/if}
    {#if importing}<p role="status">讀取 PNG 中…</p>{/if}
    <Button disabled={!valid || importing} onclick={done}>完成，返回樣板</Button><Button
      variant="secondary"
      onclick={back}>取消</Button
    >
  {/if}
</section>

<style>
  section {
    display: grid;
    gap: 16px;
  }
  label {
    display: grid;
    gap: 8px;
  }
  h2 {
    font-size: 20px;
    margin: 0;
  }
  input,
  select {
    width: 100%;
    min-height: 50px;
    padding: 12px;
    border: 1px solid var(--pm-color-border);
    border-radius: 14px;
    background: white;
    color: var(--pm-color-ink);
  }
  .row {
    display: grid;
    gap: 8px;
    text-align: left;
    padding: 16px;
    min-height: 78px;
    border: 1px solid var(--pm-color-border);
    border-radius: var(--pm-radius-control);
    background: white;
    color: var(--pm-color-ink);
  }
  small,
  p {
    color: var(--pm-color-muted);
  }
  span {
    overflow-wrap: anywhere;
  }
</style>
