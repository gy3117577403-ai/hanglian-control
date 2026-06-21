<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, ArrowDownToLine, ArrowUpToLine, Ban } from 'lucide-vue-next'
import type { OrderProductionStatus, ProductionOrder } from '@/types/order-management'

const props = defineProps<{
  order: ProductionOrder
  loading?: boolean
}>()

const emit = defineEmits<{
  change: [status: OrderProductionStatus]
}>()

const options: Array<{ value: OrderProductionStatus; label: string; className: string }> = [
  { value: 'front', label: '在前端', className: 'front' },
  { value: 'back', label: '在后端', className: 'back' },
  { value: 'no_drawing', label: '未发图', className: 'no-drawing' },
]

const current = computed(() => options.find((item) => item.value === props.order.productionStatus) ?? options[2])
const hasFormalProduct = computed(() => props.order.productResolutionStatus === 'found' && Boolean(props.order.linkedProductId))
const drawingStatusLocked = computed(() => !hasFormalProduct.value || props.order.productionStatus === 'no_drawing')
const disabledReason = computed(() => {
  if (props.order.completionStatus === 'completed') return '请先恢复订单。'
  if (drawingStatusLocked.value) return '当前产品尚无原图，不能切换生产状态。'
  return ''
})

function optionDisabled(status: OrderProductionStatus) {
  if (props.loading || props.order.completionStatus === 'completed') return true
  if (status === 'no_drawing') return false
  return drawingStatusLocked.value
}

function selectStatus(status: OrderProductionStatus) {
  if (status === props.order.productionStatus || optionDisabled(status)) return
  emit('change', status)
}

function handleSelect(event: Event) {
  const target = event.target as HTMLSelectElement
  selectStatus(target.value as OrderProductionStatus)
  target.value = props.order.productionStatus
}
</script>

<template>
  <div class="order-status-menu" :class="current.className">
    <div class="status-line">
      <div class="status-current" :title="disabledReason || `生产：${current.label}`">
        <ArrowUpToLine v-if="order.productionStatus === 'front'" :size="14" />
        <ArrowDownToLine v-else-if="order.productionStatus === 'back'" :size="14" />
        <Ban v-else :size="14" />
        <span>生产：{{ current.label }}</span>
      </div>
      <label class="status-switch" :title="disabledReason || '切换生产状态'">
        <span>切换</span>
        <select
          :value="order.productionStatus"
          :disabled="loading || Boolean(disabledReason)"
          aria-label="切换生产状态"
          @change="handleSelect"
        >
          <option
            v-for="option in options"
            :key="option.value"
            :value="option.value"
            :disabled="optionDisabled(option.value)"
          >
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>
    <p v-if="disabledReason" class="status-hint">
      <AlertTriangle :size="13" />
      <span>{{ disabledReason }}</span>
    </p>
  </div>
</template>

<style scoped>
.order-status-menu {
  display: grid;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
}

.status-line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px;
  align-items: center;
  min-width: 0;
}

.status-current,
.status-switch {
  display: inline-grid;
  grid-auto-flow: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 950;
  white-space: nowrap;
}

.status-current {
  min-width: 0;
  justify-content: start;
  padding: 0 9px;
}

.status-current span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.front .status-current,
.front .status-switch {
  background: rgba(32, 145, 142, 0.15);
  color: #14746f;
}

.back .status-current,
.back .status-switch {
  background: rgba(220, 115, 38, 0.16);
  color: #a34f1f;
}

.no-drawing .status-current,
.no-drawing .status-switch {
  background: rgba(174, 71, 60, 0.15);
  color: #9b3d32;
}

.status-switch {
  min-width: 64px;
  min-height: 30px;
  padding: 0 6px;
  border: 1px solid rgba(255, 255, 255, 0.68);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.status-switch select {
  width: 18px;
  min-width: 18px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.status-switch:has(select:disabled),
.status-switch select:disabled {
  opacity: 0.58;
}

.status-switch select:disabled {
  cursor: not-allowed;
}

.status-hint {
  display: inline-grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 4px;
  align-items: center;
  min-width: 0;
  margin: 0;
  color: #9b3d32;
  font-size: 9px;
  font-weight: 850;
  line-height: 1.25;
}

.status-hint span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
