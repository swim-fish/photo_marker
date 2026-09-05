<script lang="ts">
  import type { AnnotationTemplate } from '../../domain/templates/types';
  import { mgrsPrecisionOptions } from '../../domain/coordinates/presentation';
  let {
    value,
    onChange,
  }: { value: AnnotationTemplate; onChange: (template: AnnotationTemplate) => void } = $props();
</script>

{#if value.coordinateFormat === 'MGRS'}
  <label class="pm-field"
    ><span>精度</span><select
      aria-label="精度"
      value={value.precision}
      onchange={(event) => onChange({ ...value, precision: +event.currentTarget.value })}
    >
      {#each mgrsPrecisionOptions as option (option.precision)}<option value={option.precision}
          >{option.label}</option
        >{/each}
    </select></label
  >
  <p>範圍表示每格的寬 × 高；定位準確度仍取決於照片或裝置 GPS。</p>
{/if}
<label class="pm-field"
  ><span>座標換行</span><select
    aria-label="座標換行"
    value={value.coordinateFormat === 'MGRS' ? 'nowrap' : (value.coordinateWrap ?? 'auto')}
    disabled={value.coordinateFormat === 'MGRS'}
    onchange={(event) =>
      onChange({ ...value, coordinateWrap: event.currentTarget.value as 'auto' | 'nowrap' })}
  >
    <option value="auto">允許換行</option><option value="nowrap">強制不換行</option>
  </select></label
>
<p>
  {value.coordinateFormat === 'MGRS'
    ? 'MGRS 固定單行顯示。'
    : value.coordinateFormat === 'WGS84_DD'
      ? '允許換行時，較長的座標依緯度、經度分行。'
      : '允許換行時，較長的座標依 X（東向）、Y（北向）分行。'}單行過長時會縮小座標字級，並避開其他文字框。
</p>

<style>
  p {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--pm-color-muted);
  }
</style>
