<script lang="ts">
  import type { CanonicalColor } from '../../domain/templates/types';
  import { parseRgba, rgbaString, rgbHex, rgbaToHsv, hsvToRgba } from '../../domain/overlays/color';
  let {
    value,
    onChange,
    onValidityChange = () => {},
  }: {
    value: CanonicalColor;
    onChange: (value: CanonicalColor) => void;
    onValidityChange?: (valid: boolean) => void;
  } = $props();
  let notation = $state(''),
    invalid = $state(false);
  let channels = $state({ red: '', green: '', blue: '', alpha: '' });
  function sync(color: CanonicalColor): void {
    channels = {
      red: String(color.red),
      green: String(color.green),
      blue: String(color.blue),
      alpha: String(Math.round(color.alpha * 100)),
    };
    notation = rgbaString(color);
  }
  const hsv = $derived(rgbaToHsv(value));
  $effect(() => {
    sync(value);
    invalid = false;
    onValidityChange(true);
  });
  function emit(color: CanonicalColor): void {
    invalid = false;
    sync(color);
    onValidityChange(true);
    onChange(color);
  }
  function channel(key: keyof CanonicalColor, text: string): void {
    channels[key] = text;
    const valid = Object.entries(channels).every(
      ([key, raw]) =>
        raw.trim() &&
        Number.isInteger(Number(raw)) &&
        Number(raw) >= 0 &&
        Number(raw) <= (key === 'alpha' ? 100 : 255),
    );
    if (!valid) {
      invalid = true;
      onValidityChange(false);
      return;
    }
    emit({
      red: Number(channels.red),
      green: Number(channels.green),
      blue: Number(channels.blue),
      alpha: Number(channels.alpha) / 100,
    });
  }
</script>

<section class="picker" aria-label="RGBA 色盤">
  <label
    >選取背景顏色<input
      class="color-plane"
      type="color"
      value={rgbHex(value)}
      oninput={(event) => {
        const hex = event.currentTarget.value;
        emit({
          red: parseInt(hex.slice(1, 3), 16),
          green: parseInt(hex.slice(3, 5), 16),
          blue: parseInt(hex.slice(5, 7), 16),
          alpha: value.alpha,
        });
      }}
    /></label
  >
  <label
    >色相<input
      type="range"
      min="0"
      max="359"
      value={hsv.hue}
      oninput={(event) =>
        emit(hsvToRgba(+event.currentTarget.value, hsv.saturation, hsv.brightness, value.alpha))}
    /></label
  >
  <label
    >飽和度<input
      type="range"
      min="0"
      max="100"
      value={hsv.saturation}
      oninput={(event) =>
        emit(hsvToRgba(hsv.hue, +event.currentTarget.value, hsv.brightness, value.alpha))}
    /></label
  >
  <label
    >亮度<input
      type="range"
      min="0"
      max="100"
      value={hsv.brightness}
      oninput={(event) =>
        emit(hsvToRgba(hsv.hue, hsv.saturation, +event.currentTarget.value, value.alpha))}
    /></label
  >
  <div class="channels">
    {#each [{ key: 'red', label: 'R' }, { key: 'green', label: 'G' }, { key: 'blue', label: 'B' }, { key: 'alpha', label: 'A (%)' }] as field (field.key)}<label
        >{field.label}<input
          type="number"
          min="0"
          max={field.key === 'alpha' ? 100 : 255}
          step="1"
          value={channels[field.key as keyof CanonicalColor]}
          oninput={(event) => channel(field.key as keyof CanonicalColor, event.currentTarget.value)}
        /></label
      >{/each}
  </div>
  <label
    >RGBA 值<input
      type="text"
      bind:value={notation}
      aria-invalid={invalid}
      oninput={() => {
        const parsed = parseRgba(notation);
        if (parsed) emit(parsed);
        else {
          invalid = true;
          onValidityChange(false);
        }
      }}
    /></label
  >
  {#if invalid}<p role="alert">請輸入有效 RGB 整數 0～255，以及透明度 0～1。</p>{/if}
  <div class="checker">
    <div class="swatch" style:background={rgbaString(value)}>文字不受背景透明度影響</div>
  </div>
</section>

<style>
  .picker {
    display: grid;
    gap: 14px;
  }
  label {
    display: grid;
    gap: 8px;
  }
  input {
    min-width: 0;
    width: 100%;
    min-height: 44px;
    border: 1px solid var(--pm-color-border);
    border-radius: 10px;
    background: white;
    color: var(--pm-color-ink);
    padding: 8px;
  }
  .color-plane {
    height: 100px;
    padding: 0;
  }
  .channels {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }
  .checker {
    background: repeating-conic-gradient(#ddd 0 25%, white 0 50%) 0 / 16px 16px;
    border-radius: 14px;
    overflow: hidden;
  }
  .swatch {
    padding: 18px;
    color: white;
  }
  p {
    color: var(--pm-color-error);
  }
</style>
