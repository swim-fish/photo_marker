<script lang="ts">
  import { onMount } from 'svelte';
  import type { EditorCoordinateFormat } from '../../domain/templates/types';
  import { coordinateParts } from '../../domain/coordinates/presentation';
  let {
    text,
    format,
    wrap = 'auto',
    label,
  }: {
    text: string;
    format: EditorCoordinateFormat;
    wrap?: 'auto' | 'nowrap';
    label: string;
  } = $props();
  let element: HTMLParagraphElement;
  let width = $state(0),
    fontSize = $state(18),
    fontsReady = $state(false);
  const parts = $derived(
    format === 'MGRS' || wrap === 'nowrap' ? [text] : coordinateParts(text, format),
  );
  onMount(() => {
    let active = true;
    const observer = new ResizeObserver(() => {
      width = element.clientWidth;
    });
    observer.observe(element);
    void document.fonts.ready.then(() => {
      if (active) fontsReady = true;
    });
    return () => {
      active = false;
      observer.disconnect();
    };
  });
  $effect(() => {
    void fontsReady;
    const strings = parts;
    if (!width) return;
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return;
    context.font = '500 18px "Noto Sans TC", sans-serif';
    const longest = Math.max(...strings.map((part) => context.measureText(part).width));
    fontSize = Math.min(18, (18 * Math.max(0, width - 1)) / Math.max(1, longest));
  });
</script>

<p bind:this={element} aria-label={label} style:font-size={`${fontSize}px`}>
  {#each parts as part, index (index)}<span>{part}</span>{/each}
</p>

<style>
  p {
    display: flex;
    flex-wrap: wrap;
    margin: 0;
    min-width: 0;
    width: 100%;
    font-weight: 500;
    line-height: 1.5;
    font-variant-numeric: tabular-nums;
  }
  span {
    white-space: pre;
  }
</style>
