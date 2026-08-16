<script lang="ts">
  import { messages } from '../../i18n';
  import type { ExportConfiguration, ExportFormat, MetadataMode } from '../../domain/export/types';

  const t = messages.en;

  let {
    configuration,
    onChange = () => undefined,
  }: {
    configuration: ExportConfiguration;
    onChange?: (update: Partial<ExportConfiguration>) => void;
  } = $props();

  const numericValue = (event: Event): number =>
    Number((event.currentTarget as HTMLInputElement).value);
</script>

<section aria-labelledby="export-settings-title">
  <h3 id="export-settings-title">{t.exportSettings}</h3>
  <div class="grid">
    <label>
      {t.format}
      <select
        value={configuration.format}
        onchange={(event) => onChange({ format: event.currentTarget.value as ExportFormat })}
      >
        <option value="image/jpeg">{t.jpeg}</option>
        <option value="image/png">{t.png}</option>
      </select>
    </label>
    <label
      >{t.width}
      <input
        type="number"
        min="1"
        max="8192"
        value={configuration.width}
        oninput={(event) => onChange({ width: numericValue(event) })}
      /></label
    >
    <label
      >{t.height}
      <input
        type="number"
        min="1"
        max="8192"
        value={configuration.height}
        oninput={(event) => onChange({ height: numericValue(event) })}
      /></label
    >
    {#if configuration.format === 'image/jpeg'}
      <label
        >{t.jpegQuality}
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.01"
          value={configuration.quality ?? 0.92}
          oninput={(event) => onChange({ quality: numericValue(event) })}
        /></label
      >
    {/if}
    <label>
      {t.metadata}
      <select
        value={configuration.metadataMode}
        onchange={(event) => onChange({ metadataMode: event.currentTarget.value as MetadataMode })}
      >
        <option value="preserveSupported">{t.preserveSupportedMetadata}</option>
        <option value="removeSupported">{t.removeSupportedMetadata}</option>
      </select>
    </label>
    <label
      >{t.outputName}
      <input
        value={configuration.outputName}
        oninput={(event) => onChange({ outputName: event.currentTarget.value })}
      /></label
    >
  </div>
  {#if configuration.orientationMode === 'bakeUpright'}
    <p class="notice">{t.uprightOutputNotice}</p>
  {/if}
  {#if configuration.fallback && !configuration.fallback.acknowledged}
    <p class="warning" role="alert">{configuration.fallback.message}</p>
  {/if}
</section>

<style>
  section,
  label {
    display: grid;
    gap: 0.5rem;
  }

  section {
    gap: 1rem;
  }

  h3,
  p {
    margin: 0;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 0.75rem;
  }

  input,
  select {
    min-height: 44px;
  }

  .notice {
    color: #bfdbfe;
  }

  .warning {
    color: #fbbf24;
  }
</style>
