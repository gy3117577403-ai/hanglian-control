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
  if (typeof value !== 'number' || Number.isNaN(value)) return ''
  return `${value}`
}

function hasMm(value?: number | null) {
  return typeof value === 'number' && !Number.isNaN(value)
}

function cleanRemark(value?: string) {
  const remark = value?.trim() ?? ''
  return remark.includes('?') ? '' : remark
}
</script>

<template>
  <div class="connector-board">
    <div class="board-labels" aria-hidden="true">
      <span>连接器型号</span>
      <span>规格</span>
      <span>入长</span>
      <span>外剥长度</span>
      <span>内剥长度</span>
      <span>备注</span>
      <span />
    </div>

    <button
      v-for="row in rows"
      :key="row.connectorId"
      type="button"
      class="parameter-row"
      @click="emit('open', row)"
    >
      <section class="model-cell">
        <i><Cable :size="21" /></i>
        <div>
          <b>{{ row.connectorModel }}</b>
          <small>{{ row.status || '启用' }}</small>
        </div>
      </section>

      <section class="spec-cell">
        <span>{{ row.specification || '' }}</span>
      </section>

      <section class="metric-card">
        <span>参数 1</span>
        <strong>{{ formatMm(row.insertionLengthMm) }}</strong>
        <em>mm</em>
      </section>

      <section class="metric-card">
        <span>参数 2</span>
        <strong>{{ formatMm(row.outerStripLengthMm) }}</strong>
        <em v-if="hasMm(row.outerStripLengthMm)">mm</em>
      </section>

      <section class="metric-card">
        <span>参数 3</span>
        <strong>{{ formatMm(row.innerStripLengthMm) }}</strong>
        <em>mm</em>
      </section>

      <section class="remark-cell" :class="{ empty: !cleanRemark(row.remark) }">
        <span>{{ cleanRemark(row.remark) }}</span>
      </section>

      <section class="row-actions" aria-label="连接器参数操作">
        <button type="button" class="icon-action" title="编辑" @click.stop="emit('edit', row)">
          <Pencil :size="17" />
        </button>
        <button type="button" class="icon-action danger" title="删除" @click.stop="emit('delete', row)">
          <Trash2 :size="17" />
        </button>
        <ChevronRight class="row-arrow" :size="20" />
      </section>
    </button>

    <div v-if="!rows.length" class="empty-state">
      暂无连接器参数，请通过单型号导入或 Excel 导入补充。
    </div>
  </div>
</template>

<style scoped>
.connector-board {
  display: grid;
  gap: 9px;
  min-width: 960px;
}

.board-labels {
  position: sticky;
  top: 0;
  z-index: 8;
  display: grid;
  grid-template-columns: 1.18fr 1fr 0.62fr 0.7fr 0.7fr 1.1fr 126px;
  gap: 10px;
  align-items: center;
  min-height: 42px;
  padding: 0 18px;
  border: 1px solid rgba(255, 255, 255, 0.52);
  border-radius: 18px;
  background:
    linear-gradient(90deg, rgba(114, 72, 37, 0.94), rgba(154, 99, 50, 0.86)),
    radial-gradient(circle at 90% 0%, rgba(255, 255, 255, 0.2), transparent 28%);
  color: rgba(255, 245, 230, 0.92);
  font-size: 12px;
  font-weight: 950;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    0 10px 22px rgba(70, 45, 25, 0.12);
  backdrop-filter: blur(18px);
}

.board-labels span {
  display: inline-flex;
  align-items: center;
}

.parameter-row {
  position: relative;
  display: grid;
  grid-template-columns: 1.18fr 1fr 0.62fr 0.7fr 0.7fr 1.1fr 126px;
  gap: 10px;
  align-items: stretch;
  width: 100%;
  min-height: 92px;
  padding: 10px 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 24px;
  background:
    linear-gradient(112deg, rgba(255, 255, 255, 0.82), rgba(255, 244, 225, 0.56) 36%, rgba(171, 209, 198, 0.34)),
    radial-gradient(circle at 96% 0%, rgba(255, 255, 255, 0.92), transparent 24%);
  color: #352112;
  text-align: left;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    inset 0 -20px 36px rgba(127, 159, 148, 0.12),
    0 18px 38px rgba(71, 48, 27, 0.1);
  transform: translateZ(0);
  transition:
    transform 0.14s ease,
    border-color 0.14s ease,
    box-shadow 0.14s ease;
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
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.96),
    inset 0 -20px 36px rgba(127, 159, 148, 0.16),
    0 22px 44px rgba(71, 48, 27, 0.14);
}

.model-cell,
.spec-cell,
.metric-card,
.remark-cell {
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.66);
  border-radius: 18px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.62), rgba(255, 245, 229, 0.34)),
    rgba(255, 255, 255, 0.26);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.78),
    0 10px 22px rgba(67, 48, 28, 0.05);
  backdrop-filter: blur(16px);
}

.model-cell {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px;
}

.model-cell i {
  display: grid;
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 16px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.86), rgba(235, 202, 160, 0.68));
  color: #9b5125;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.84),
    0 10px 20px rgba(78, 47, 22, 0.1);
}

.model-cell b {
  display: block;
  overflow: hidden;
  color: #2f1d0f;
  font-size: 19px;
  font-weight: 950;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.spec-cell,
.remark-cell {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  color: #5f4124;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.35;
}

.spec-cell span,
.remark-cell span {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.metric-card {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto 1fr;
  align-items: end;
  padding: 10px 12px;
}

.metric-card span {
  grid-column: 1 / -1;
  color: rgba(105, 70, 38, 0.68);
  font-size: 12px;
  font-weight: 950;
}

.metric-card strong {
  color: #9b5125;
  font-size: 25px;
  font-weight: 950;
  line-height: 1;
}

.metric-card em {
  color: rgba(105, 70, 38, 0.7);
  font-size: 12px;
  font-style: normal;
  font-weight: 950;
}

.remark-cell.empty {
  opacity: 0.34;
}

.row-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  padding-right: 4px;
}

.icon-action {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.5);
  color: #9b5125;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 8px 14px rgba(71, 48, 27, 0.08);
  transition: transform 0.12s ease, background 0.12s ease;
}

.icon-action:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.74);
}

.icon-action.danger {
  color: #b94435;
}

.row-arrow {
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

@media (max-width: 1180px) {
  .connector-board {
    min-width: 860px;
  }

  .board-labels,
  .parameter-row {
    grid-template-columns: 1.08fr 0.92fr 0.58fr 0.66fr 0.66fr 0.92fr 112px;
  }

  .model-cell b {
    font-size: 17px;
  }

  .metric-card strong {
    font-size: 22px;
  }
}
</style>
