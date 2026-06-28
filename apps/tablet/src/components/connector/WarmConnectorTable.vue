<script setup lang="ts">
import { Cable, ChevronRight, Pencil, Trash2 } from 'lucide-vue-next'
import type { ConnectorParameter } from '@/types/production'

defineProps<{
  rows: ConnectorParameter[]
}>()

const emit = defineEmits<{
  open: [row: ConnectorParameter]
  edit: [row: ConnectorParameter]
  delete: [row: ConnectorParameter]
}>()

function formatMm(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `${value}`
}

function hasMm(value?: number | null) {
  return typeof value === 'number' && !Number.isNaN(value)
}

function cleanRemark(value?: string) {
  const remark = value?.trim() ?? ''
  if (!remark || remark.includes('?')) return '—'
  return remark
}

function isBlankRemark(value?: string) {
  const remark = value?.trim() ?? ''
  return !remark || remark.includes('?')
}

function isOuterBlank(row: ConnectorParameter) {
  return row.outerStripLengthMm === null || row.outerStripLengthMm === undefined
}

function statusClass(status?: string) {
  if (status === '复核中') return 'status-review'
  if (status === '停用') return 'status-disabled'
  return 'status-enabled'
}
</script>

<template>
  <div class="connector-board">
    <div class="board-labels" aria-hidden="true">
      <span>连接器型号</span>
      <span>入长</span>
      <span>外剥长度</span>
      <span>内剥长度</span>
      <span>备注</span>
      <span />
    </div>

    <article
      v-for="row in rows"
      :key="row.connectorId"
      class="parameter-row"
      :class="{ 'missing-outer': isOuterBlank(row) }"
      role="button"
      tabindex="0"
      @click="emit('open', row)"
      @keydown.enter.prevent="emit('open', row)"
    >
      <section class="model-cell">
        <i><Cable :size="21" /></i>
        <div>
          <b :title="row.connectorModel">{{ row.connectorModel }}</b>
          <small :class="statusClass(row.status)">{{ row.status || '启用' }}</small>
        </div>
      </section>

      <section class="metric-card" title="入长">
        <span class="cell-label">入长</span>
        <strong>{{ formatMm(row.insertionLengthMm) }}</strong>
        <em v-if="hasMm(row.insertionLengthMm)">mm</em>
      </section>

      <section class="metric-card optional" :class="{ missing: isOuterBlank(row) }">
        <span class="cell-label">外剥长度</span>
        <strong>{{ formatMm(row.outerStripLengthMm) }}</strong>
        <em v-if="hasMm(row.outerStripLengthMm)">mm</em>
      </section>

      <section class="metric-card" title="内剥长度">
        <span class="cell-label">内剥长度</span>
        <strong>{{ formatMm(row.innerStripLengthMm) }}</strong>
        <em v-if="hasMm(row.innerStripLengthMm)">mm</em>
      </section>

      <section class="remark-cell" :class="{ empty: isBlankRemark(row.remark) }">
        <span class="cell-label">备注</span>
        <span :title="cleanRemark(row.remark)">{{ cleanRemark(row.remark) }}</span>
      </section>

      <section class="row-actions" aria-label="连接器参数操作">
        <button type="button" class="icon-action" title="编辑" @click.stop="emit('edit', row)">
          <Pencil :size="17" />
        </button>
        <button type="button" class="icon-action danger" title="删除" @click.stop="emit('delete', row)">
          <Trash2 :size="17" />
        </button>
        <button type="button" class="icon-action detail" title="详情" @click.stop="emit('open', row)">
          <ChevronRight :size="18" />
        </button>
      </section>
    </article>

    <div v-if="!rows.length" class="empty-state">
      暂无连接器参数，请通过单型号导入或 Excel 导入补充。
    </div>
  </div>
</template>

<style scoped>
.connector-board {
  --connector-grid-template:
    minmax(190px, 1.45fr)
    minmax(82px, 0.62fr)
    minmax(98px, 0.72fr)
    minmax(98px, 0.72fr)
    minmax(120px, 0.9fr)
    104px;
  container-type: inline-size;
  display: grid;
  width: 100%;
  min-width: 0;
  gap: 8px;
}

.board-labels {
  position: sticky;
  top: 0;
  z-index: 8;
  display: grid;
  grid-template-columns: var(--connector-grid-template);
  gap: 8px;
  align-items: center;
  min-height: 42px;
  padding: 0 14px;
  border: 1px solid rgba(129, 79, 35, 0.12);
  border-radius: 14px;
  background: linear-gradient(90deg, rgba(114, 72, 37, 0.94), rgba(154, 99, 50, 0.9));
  color: rgba(255, 245, 230, 0.92);
  font-size: 12px;
  font-weight: 950;
  box-shadow: 0 8px 16px rgba(70, 45, 25, 0.08);
}

.board-labels span {
  display: inline-flex;
  align-items: center;
}

.parameter-row {
  position: relative;
  display: grid;
  grid-template-columns: var(--connector-grid-template);
  gap: 8px;
  align-items: center;
  width: 100%;
  min-height: 76px;
  padding: 9px 10px 9px 14px;
  overflow: visible;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 16px;
  background: linear-gradient(112deg, rgba(255, 255, 255, 0.86), rgba(255, 244, 225, 0.54) 58%, rgba(171, 209, 198, 0.24));
  color: #352112;
  text-align: left;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.88), 0 8px 16px rgba(71, 48, 27, 0.07);
  transform: translateZ(0);
  transition:
    transform 0.14s ease,
    border-color 0.14s ease,
    background-color 0.14s ease;
  cursor: pointer;
}

.parameter-row::before {
  position: absolute;
  inset: 12px auto 12px 0;
  width: 5px;
  border-radius: 999px;
  background: linear-gradient(180deg, #db7a36, #92bfb2);
  content: '';
}

.parameter-row:hover {
  transform: translateY(-1px);
  border-color: rgba(204, 129, 61, 0.42);
  background-color: rgba(255, 255, 255, 0.74);
}

.model-cell,
.metric-card,
.remark-cell {
  min-width: 0;
}

.model-cell {
  display: flex;
  gap: 10px;
  align-items: center;
}

.model-cell > div {
  min-width: 0;
}

.model-cell i {
  display: grid;
  flex: 0 0 44px;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.64);
  color: #9b5125;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.model-cell b {
  display: -webkit-box;
  overflow: hidden;
  color: #2f1d0f;
  font-size: 17px;
  font-weight: 950;
  letter-spacing: 0;
  line-height: 1.18;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.model-cell small {
  display: inline-flex;
  margin-top: 4px;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(161, 197, 141, 0.22);
  color: #4c7e36;
  font-size: 11px;
  font-weight: 950;
}

.model-cell small.status-review {
  background: rgba(236, 181, 81, 0.24);
  color: #8f6418;
}

.model-cell small.status-disabled {
  background: rgba(114, 103, 92, 0.16);
  color: rgba(72, 62, 52, 0.74);
}

.remark-cell {
  display: block;
  align-items: center;
  color: #5f4124;
  font-size: 14px;
  font-weight: 900;
  line-height: 1.35;
}

.remark-cell span:not(.cell-label) {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.metric-card {
  display: inline-flex;
  gap: 4px;
  align-items: baseline;
  white-space: nowrap;
}

.cell-label {
  display: none;
  color: rgba(105, 70, 38, 0.68);
  font-size: 11px;
  font-weight: 950;
}

.metric-card strong {
  color: #9b5125;
  font-size: 18px;
  font-weight: 950;
  line-height: 1;
}

.metric-card em {
  color: rgba(105, 70, 38, 0.7);
  font-size: 12px;
  font-style: normal;
  font-weight: 950;
}

.metric-card.optional.missing strong {
  color: rgba(137, 89, 45, 0.7);
}

.remark-cell.empty {
  color: rgba(137, 89, 45, 0.7);
}

.row-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: flex-end;
}

.icon-action {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.5);
  color: #9b5125;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transition: transform 0.12s ease, background 0.12s ease;
}

.icon-action:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.74);
}

.icon-action.danger {
  color: #b94435;
}

.icon-action.detail {
  color: rgba(113, 75, 42, 0.34);
}

.empty-state {
  display: grid;
  min-height: 280px;
  place-items: center;
  border: 1px dashed rgba(139, 90, 42, 0.24);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.34);
  color: #8a6239;
  font-weight: 900;
}

@container (max-width: 900px) {
  .board-labels {
    display: none;
  }

  .parameter-row {
    grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
    align-items: start;
    min-height: 116px;
    padding: 12px;
  }

  .model-cell {
    grid-column: 1 / 4;
  }

  .row-actions {
    grid-column: 4;
    grid-row: 1;
  }

  .metric-card {
    display: grid;
    gap: 3px;
    align-items: start;
    padding-top: 2px;
  }

  .metric-card strong {
    font-size: 17px;
  }

  .cell-label {
    display: block;
  }

  .remark-cell {
    grid-column: 1 / -1;
    min-height: 20px;
  }

  .remark-cell span:not(.cell-label) {
    -webkit-line-clamp: 1;
  }
}

:global(html[data-native-app="true"]) .parameter-row {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82), 0 6px 12px rgba(71, 48, 27, 0.06);
}

:global(html[data-native-app="true"]) .model-cell i {
  box-shadow: none;
}

:global(html[data-native-app="true"]) .icon-action {
  box-shadow: none;
}

@media (prefers-reduced-motion: reduce) {
  .parameter-row,
  .icon-action {
    transition: none;
  }
}
</style>
