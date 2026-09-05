<script lang="ts">
  const version = __APP_VERSION__;
  import { tick, type Snippet } from 'svelte';
  let {
    title,
    subtitle = '',
    children,
    onBack,
  }: { title: string; subtitle?: string; children?: Snippet; onBack?: () => void } = $props();
  let heading = $state<HTMLHeadingElement>();
  $effect(() => {
    void title;
    void tick().then(() => heading?.focus());
  });
</script>

<main class="editor-shell">
  <header>
    {#if onBack}<button class="back" type="button" onclick={onBack}>返回</button>{/if}
    <h1 bind:this={heading} tabindex="-1">{title}</h1>
    <p>{subtitle}</p>
  </header>
  {#if children}{@render children()}{/if}
  <footer aria-label="版本資訊">Photo Marker v{version}</footer>
</main>

<style>
  footer {
    margin-top: auto;
    padding-top: 24px;
    text-align: center;
    font-size: 12px;
    color: var(--pm-color-muted);
  }
  :global(body) {
    background: var(--pm-color-bg);
    color: var(--pm-color-ink);
  }
  .editor-shell {
    width: min(100%, 390px);
    margin: 0 auto;
    min-height: 100dvh;
    padding: 48px 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  header {
    position: relative;
    display: grid;
    gap: 12px;
    margin-bottom: 5px;
    padding-bottom: 0;
  }
  h1 {
    font-size: 22px;
    line-height: 1.5;
  }
  p {
    margin: 0;
    font-size: 12px;
    line-height: 18px;
    color: var(--pm-color-muted);
    overflow-wrap: anywhere;
  }
  .back {
    position: absolute;
    right: -8px;
    top: -44px;
    min-height: 44px;
    min-width: 64px;
    border: 0;
    background: transparent;
    color: var(--pm-color-ink);
    border-radius: 14px;
    font-size: 12px;
  }
  @media (max-width: 600px) {
    .editor-shell {
      max-width: 390px;
    }
  }
  @media (max-width: 350px) {
    .editor-shell {
      padding: 48px 16px 24px;
    }
  }
</style>
