<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    children,
    onclick,
    disabled = false,
    variant = 'primary',
    type = 'button',
    label,
  }: {
    children?: Snippet;
    onclick?: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'secondary';
    type?: 'button' | 'submit';
    label?: string;
  } = $props();
</script>

<button {type} {onclick} {disabled} aria-label={label} class:secondary={variant === 'secondary'}>
  {#if children}{@render children()}{:else}{label}{/if}
</button>

<style>
  button {
    min-height: 50px;
    min-width: 44px;
    padding: 12px 20px;
    border: 1px solid transparent;
    border-radius: var(--pm-radius-control);
    background: var(--pm-color-accent);
    color: white;
    font-size: 15px;
    font-weight: 500;
    line-height: 1.5;
    cursor: pointer;
  }
  button.secondary {
    color: var(--pm-color-ink);
    background: white;
    border-color: var(--pm-color-border);
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  button:focus-visible {
    outline: 3px solid var(--pm-color-accent);
    outline-offset: 3px;
  }
</style>
