<script lang="ts">
  import { messages } from '../../i18n';
  import type { Wgs84Coordinate } from '../../domain/coordinates/types';

  const t = messages.en;

  type Wgs84InputProps = {
    latitude?: number | null;
    longitude?: number | null;
    disabled?: boolean;
    error?: string;
    onSubmitCoordinate?: (coordinate: Wgs84Coordinate) => void;
  };

  let {
    latitude = null,
    longitude = null,
    disabled = false,
    error = '',
    onSubmitCoordinate = () => undefined,
  }: Wgs84InputProps = $props();

  let latitudeValue = $state<string | number>('');
  let longitudeValue = $state<string | number>('');
  let localError = $state('');

  $effect(() => {
    latitudeValue = latitude === null ? '' : String(latitude);
    longitudeValue = longitude === null ? '' : String(longitude);
  });

  function submit(event: Event): void {
    event.preventDefault();
    const nextLatitude = Number(latitudeValue);
    const nextLongitude = Number(longitudeValue);

    if (
      String(latitudeValue).trim() === '' ||
      String(longitudeValue).trim() === '' ||
      !Number.isFinite(nextLatitude) ||
      !Number.isFinite(nextLongitude) ||
      nextLatitude < -90 ||
      nextLatitude > 90 ||
      nextLongitude < -180 ||
      nextLongitude > 180 ||
      (nextLatitude === 0 && nextLongitude === 0)
    ) {
      localError = t.validWgs84;
      return;
    }

    localError = '';
    onSubmitCoordinate({ latitude: nextLatitude, longitude: nextLongitude });
  }

  function displayError(): string {
    return error || localError;
  }
</script>

<form class="wgs84-form" aria-labelledby="wgs84-title" onsubmit={submit}>
  <h3 id="wgs84-title">{t.manualWgs84}</h3>
  <p class="hint">{t.wgs84Hint}</p>

  <div class="fields">
    <label>
      <span>{t.latitudeWgs84}</span>
      <input
        name="latitude"
        type="number"
        min="-90"
        max="90"
        step="any"
        inputmode="decimal"
        bind:value={latitudeValue}
        {disabled}
        aria-invalid={Boolean(displayError())}
        aria-describedby={displayError() ? 'wgs84-input-error' : undefined}
      />
    </label>

    <label>
      <span>{t.longitudeWgs84}</span>
      <input
        name="longitude"
        type="number"
        min="-180"
        max="180"
        step="any"
        inputmode="decimal"
        bind:value={longitudeValue}
        {disabled}
        aria-invalid={Boolean(displayError())}
        aria-describedby={displayError() ? 'wgs84-input-error' : undefined}
      />
    </label>
  </div>

  {#if displayError()}
    <p id="wgs84-input-error" class="error" role="alert">{displayError()}</p>
  {/if}

  <button
    type="submit"
    {disabled}
    onkeydown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') submit(event);
    }}>{t.useManualCoordinate}</button
  >
</form>

<style>
  .wgs84-form {
    display: grid;
    gap: 0.85rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #334155;
  }

  h3,
  p {
    margin: 0;
  }

  h3 {
    font-size: 1rem;
  }

  .hint {
    color: #cbd5e1;
    font-size: 0.9rem;
  }

  .fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  label {
    display: grid;
    gap: 0.35rem;
    color: #e2e8f0;
    font-size: 0.9rem;
  }

  input {
    min-height: 44px;
    width: 100%;
    padding: 0.6rem 0.7rem;
    border: 1px solid #64748b;
    border-radius: 0.6rem;
    color: #f8fafc;
    background: #0f172a;
  }

  input:focus-visible,
  button:focus-visible {
    outline: 3px solid #93c5fd;
    outline-offset: 2px;
  }

  button {
    min-height: 44px;
    width: fit-content;
    padding: 0.65rem 1rem;
    border: 1px solid #60a5fa;
    border-radius: 0.65rem;
    color: #eff6ff;
    background: #1d4ed8;
    cursor: pointer;
    font-weight: 700;
  }

  button:disabled,
  input:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }

  .error {
    padding: 0.65rem 0.75rem;
    border: 1px solid #fb7185;
    border-radius: 0.6rem;
    color: #ffe4e6;
    background: #4c0519;
  }

  @media (max-width: 40rem) {
    .fields {
      grid-template-columns: 1fr;
    }
  }
</style>
