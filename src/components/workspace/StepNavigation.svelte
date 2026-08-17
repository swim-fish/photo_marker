<script lang="ts">
  import { messages } from '../../i18n';

  export type EditingStep = 'photo' | 'coordinate' | 'text' | 'export';

  const t = messages.en;

  let {
    step,
    onChange = () => undefined,
  }: {
    step: EditingStep;
    onChange?: (step: EditingStep) => void;
  } = $props();

  const steps: readonly { value: EditingStep; label: string }[] = [
    { value: 'photo', label: t.photoStep },
    { value: 'coordinate', label: t.coordinateStep },
    { value: 'text', label: t.textStep },
    { value: 'export', label: t.exportStep },
  ];
  const currentIndex = $derived(steps.findIndex((item) => item.value === step));
</script>

<div class="step-shell">
  <nav aria-label={t.editingSteps}>
    <ol>
      {#each steps as item, index (item.value)}
        <li>
          <button
            type="button"
            aria-label={item.label}
            aria-current={item.value === step ? 'step' : undefined}
            onclick={() => onChange(item.value)}
          >
            <span>{index + 1}</span>
            <strong>{item.label}</strong>
          </button>
        </li>
      {/each}
    </ol>
  </nav>
  <div class="step-actions">
    <output>{t.stepProgressPrefix} {currentIndex + 1} {t.stepProgressOf} {steps.length}</output>
    <div>
      <button
        type="button"
        disabled={currentIndex === 0}
        onclick={() => onChange(steps[currentIndex - 1].value)}>{t.previousStep}</button
      >
      <button
        type="button"
        class="next"
        disabled={currentIndex === steps.length - 1}
        onclick={() => onChange(steps[currentIndex + 1].value)}>{t.nextStep}</button
      >
    </div>
  </div>
</div>

<style>
  .step-shell {
    display: grid;
    gap: 0.75rem;
  }

  ol {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  nav button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    min-height: 48px;
    padding: 0.5rem;
    border: 1px solid #475569;
    border-radius: 0.7rem;
    color: #eff6ff;
    background: #0f172a;
    cursor: pointer;
  }

  nav button span {
    display: grid;
    width: 1.75rem;
    height: 1.75rem;
    place-items: center;
    border-radius: 50%;
    background: #334155;
  }

  nav button[aria-current='step'] {
    border-color: #93c5fd;
    background: #1e3a8a;
  }

  nav button[aria-current='step'] span {
    color: #0f172a;
    background: #93c5fd;
  }

  .step-actions,
  .step-actions > div {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .step-actions {
    justify-content: space-between;
    position: fixed;
    z-index: 20;
    right: 0;
    bottom: 0;
    left: 0;
    min-height: 4.5rem;
    padding: 0.75rem clamp(0.75rem, 2vw, 1.5rem);
    border-top: 1px solid #334155;
    background: rgb(7 11 20 / 96%);
    backdrop-filter: blur(12px);
  }

  .step-actions button {
    min-width: 7rem;
    min-height: 44px;
    padding: 0.55rem 0.8rem;
    border: 1px solid #60a5fa;
    border-radius: 0.65rem;
    color: #eff6ff;
    background: transparent;
  }

  .step-actions .next {
    color: #0f172a;
    background: #93c5fd;
    font-weight: 700;
  }

  .step-actions button:disabled {
    opacity: 0.45;
  }

  @media (max-width: 40rem) {
    nav button strong {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }

    .step-actions > div {
      flex: 1;
    }

    .step-actions button {
      min-width: 0;
      flex: 1;
    }
  }
</style>
