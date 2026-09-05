<script lang="ts">
  let {
    label,
    value,
    min,
    max,
    step = 1,
    onChange,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
  } = $props();
</script>

<div class="stepper" role="group" aria-label={label}>
  <span>{label}</span>
  <div class="controls">
    <button
      disabled={value <= min}
      aria-label={`減少${label}`}
      onclick={() => onChange(Math.max(min, value - step))}>−</button
    ><label
      ><span class="sr">{label}數值</span><input
        type="number"
        {min}
        {max}
        {step}
        {value}
        onchange={(event) => {
          const next = event.currentTarget.valueAsNumber;
          if (Number.isFinite(next) && next >= min && next <= max) onChange(next);
          else event.currentTarget.value = String(value);
        }}
      /></label
    ><button
      disabled={value >= max}
      aria-label={`增加${label}`}
      onclick={() => onChange(Math.min(max, value + step))}>＋</button
    >
  </div>
</div>

<style>
  .stepper {
    display: grid;
    gap: 10px;
  }
  .controls {
    display: grid;
    grid-template-columns: 56px minmax(48px, 1fr) 56px;
    gap: 24px;
    align-items: center;
  }
  button {
    width: 56px;
    min-height: 50px;
    padding: 8px;
    border: 1px solid var(--pm-color-border);
    border-radius: 14px;
    background: white;
    color: var(--pm-color-ink);
    font-size: 24px;
  }
  button:disabled {
    opacity: 0.4;
  }
  input {
    width: 100%;
    min-width: 0;
    min-height: 50px;
    padding: 8px;
    text-align: center;
    border: 1px solid var(--pm-color-border);
    border-radius: 12px;
    background: white;
    color: var(--pm-color-ink);
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    clip-path: inset(50%);
    overflow: hidden;
  }
</style>
