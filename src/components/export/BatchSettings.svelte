<script lang="ts">
  import type { CoordinateDisplayFormat } from '../../domain/coordinates/types';
  import { messages } from '../../i18n';

  const t = messages.en;

  export type SharedSettingsValue = Readonly<{
    title: string;
    team: string;
    displayFormat: CoordinateDisplayFormat;
  }>;

  let {
    onApply = () => undefined,
  }: {
    onApply?: (value: SharedSettingsValue) => void;
  } = $props();

  let title = $state('');
  let team = $state('');
  let displayFormat = $state<CoordinateDisplayFormat>('WGS84_DD');
</script>

<section aria-labelledby="batch-settings-title">
  <h3 id="batch-settings-title">{t.sharedBatchSettings}</h3>
  <p>{t.sharedBatchSettingsHelp}</p>
  <label>
    {t.sharedTitle}
    <input bind:value={title} />
  </label>
  <label>
    {t.sharedTeam}
    <input bind:value={team} />
  </label>
  <label>
    {t.sharedCoordinateFormat}
    <select bind:value={displayFormat}>
      <option value="WGS84_DD">WGS84 decimal degrees</option>
      <option value="WGS84_DMS">WGS84 degrees, minutes, seconds</option>
      <option value="TWD97_TM2">TWD97 TM2</option>
      <option value="TWD67_TM2">TWD67 TM2 zone 121</option>
      <option value="MGRS">MGRS</option>
      <option value="TAIPOWER">Taipower</option>
    </select>
  </label>
  <button type="button" onclick={() => onApply({ title, team, displayFormat })}
    >{t.applyToAllPhotos}</button
  >
</section>

<style>
  section,
  label {
    display: grid;
    gap: 0.55rem;
  }

  section {
    padding: 0.9rem;
    border: 1px solid #334155;
    border-radius: 0.8rem;
    background: #0f172a;
  }

  h3,
  p {
    margin: 0;
  }

  p {
    color: #cbd5e1;
  }

  input,
  select,
  button {
    min-height: 44px;
    padding: 0.6rem 0.75rem;
  }

  button {
    border: 1px solid #60a5fa;
    border-radius: 0.65rem;
    color: #0f172a;
    background: #93c5fd;
    font-weight: 700;
  }
</style>
