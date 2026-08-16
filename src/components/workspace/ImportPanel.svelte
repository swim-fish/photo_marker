<script lang="ts">
  import { messages } from '../../i18n';

  const t = messages.en;

  let {
    onImport = () => undefined,
    onFiles = () => undefined,
    disabled = false,
  }: {
    onImport?: () => void;
    onFiles?: (files: FileList) => void;
    disabled?: boolean;
  } = $props();

  let input: HTMLInputElement;

  function openPicker(): void {
    onImport();
    input?.click();
  }
</script>

<section class="import-panel" aria-labelledby="import-title">
  <p class="eyebrow">{t.localOnlyProcessing}</p>
  <h2 id="import-title">{t.importPanelTitle}</h2>
  <p>{t.importPanelDescription}</p>
  <button type="button" class="primary" {disabled} onclick={openPicker}>{t.importAction}</button>
  <input
    bind:this={input}
    class="visually-hidden"
    type="file"
    accept="image/jpeg,image/png,.jpg,.jpeg,.png"
    multiple
    onchange={(event) => {
      const files = event.currentTarget.files;
      if (files?.length) onFiles(files);
    }}
  />
</section>

<style>
  .import-panel {
    display: grid;
    gap: 1rem;
    max-width: 38rem;
    padding: clamp(1.25rem, 4vw, 2.5rem);
    border: 1px solid #334155;
    border-radius: 1.25rem;
    background: #0f172a;
  }

  .import-panel > * {
    margin: 0;
  }

  .eyebrow {
    color: #93c5fd;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .primary {
    min-height: 44px;
    width: fit-content;
    padding: 0.65rem 1rem;
    border: 0;
    border-radius: 0.75rem;
    color: #0f172a;
    background: #93c5fd;
    cursor: pointer;
    font-weight: 700;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
