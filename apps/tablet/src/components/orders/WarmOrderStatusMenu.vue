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
</script>

<template>
  <div class="order-status-menu" :class="current.className">
    <div class="status-current">
      <ArrowUpToLine v-if="order.productionStatus === 'front'" :size="14" />
      <ArrowDownToLine v-else-if="order.productionStatus === 'back'" :size="14" />
      <Ban v-else :size="14" />
      <span>{{ current.label }}</span>
    </div>
    <div class="status-actions" role="group" aria-label="订单状态切换">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :class="[option.className, { active: option.value === order.productionStatus }]"
        :disabled="optionDisabled(option.value)"
        :title="optionDisabled(option.value) ? disabledReason : option.label"
        @click="selectStatus(option.value)"
      >
        {{ option.label }}
      </button>
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
  gap: 5px;
  min-width: 0;
}

.status-current,
.status-actions button {
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
  padding: 0 8px;
}

.front .status-current,
.status-actions .front.active {
  background: rgba(32, 145, 142, 0.15);
  color: #14746f;
}

.back .status-current,
.status-actions .back.active {
  background: rgba(220, 115, 38, 0.16);
  color: #a34f1f;
}

.no-drawing .status-current,
.status-actions .no-drawing.active {
  background: rgba(174, 71, 60, 0.15);
  color: #9b3d32;
}

.status-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
}

.status-actions button {
  min-width: 0;
  min-height: 34px;
  padding: 0 5px;
  border: 1px solid rgba(255, 255, 255, 0.68);
  background: rgba(255, 255, 255, 0.34);
  color: #6a4726;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.status-actions button:disabled {
  opacity: 0.45;
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
  font-size: 10px;
  font-weight: 850;
  line-height: 1.35;
}
</style>
