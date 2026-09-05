<script lang="ts">
  let { label, detail, onclick }: { label: string; detail: string; onclick: () => void } = $props();
</script>

<button class="pm-setting" {onclick}>
  <small>{label}</small>
  <span>{detail}<span aria-hidden="true">›</span></span>
</button>

<style>
  button {
    width: 100%;
    text-align: left;
    cursor: pointer;
  }
  button > span {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }
</style>
