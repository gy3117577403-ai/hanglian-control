<script setup lang="ts">
import { computed, ref } from 'vue'
import type { OrderProductionStatus, ProductionOrder } from '@/types/order-management'

const props = defineProps<{
  order: ProductionOrder
  loading?: boolean
}>()

const emit = defineEmits<{
  change: [status: OrderProductionStatus]
}>()

const menu = ref<{ toggle: (event: Event) => void } | null>(null)

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
  if (!hasFormalProduct.value) return '产品未建档，暂不可切换。'
  if (drawingStatusLocked.value) return '当前产品尚无原图，不能切换生产状态。'
  return ''
})
const switchDisabled = computed(() => props.loading || Boolean(disabledReason.value))
const menuItems = computed(() => options.map((option) => ({
  label: option.label,
  disabled: optionDisabled(option.value),
  command: () => selectStatus(option.value),
})))

function optionDisabled(status: OrderProductionStatus) {
  if (props.loading || props.order.completionStatus === 'completed') return true
  if (status === 'no_drawing') return false
  return drawingStatusLocked.value
}

function selectStatus(status: OrderProductionStatus) {
  if (status === props.order.productionStatus || optionDisabled(status)) return
  emit('change', status)
}

function openMenu(event: Event) {
  if (switchDisabled.value) return
  menu.value?.toggle(event)
}
</script>

<template>
  <div class="order-status-menu" :class="current.className">
    <div class="status-display" :title="disabledReason || `生产：${current.label}`">
      <span class="status-prefix">生产状态</span>
      <span class="status-pill">{{ current.label }}</span>
    </div>
    <button
      class="status-switch"
      type="button"
      :disabled="switchDisabled"
      :title="disabledReason || '切换生产状态'"
      aria-label="切换生产状态"
      @click="openMenu"
    >
      切换
    </button>
    <PrimeMenu ref="menu" :model="menuItems" popup append-to="body" class="order-status-popup" />
  </div>
</template>

<style scoped>
.order-status-menu {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 58px;
  gap: 8px;
  align-items: center;
  min-width: 0;
  max-width: 100%;
}

.status-display {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  white-space: nowrap;
}

.status-prefix {
  flex-shrink: 0;
  color: #68401f;
  font-size: 12px;
  font-weight: 950;
  line-height: 1;
}

.status-pill {
  display: inline-grid;
  flex-shrink: 0;
  place-items: center;
  min-width: 62px;
  height: 31px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 950;
  line-height: 1;
  white-space: nowrap;
}

.front .status-pill,
.front .status-switch {
  background: rgba(32, 145, 142, 0.15);
  color: #14746f;
}

.back .status-pill,
.back .status-switch {
  background: rgba(220, 115, 38, 0.16);
  color: #a34f1f;
}

.no-drawing .status-pill,
.no-drawing .status-switch {
  background: rgba(174, 71, 60, 0.15);
  color: #9b3d32;
}

.status-switch {
  display: inline-grid;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 58px;
  min-width: 58px;
  max-width: 58px;
  min-height: 34px;
  max-height: 34px;
  padding: 0 6px;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 950;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.status-switch:disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

:global(.order-status-popup) {
  z-index: 4000;
  min-width: 108px;
  border: 1px solid rgba(216, 137, 53, 0.24);
  border-radius: 14px;
  background: rgba(255, 252, 246, 0.98);
  box-shadow: 0 14px 32px rgba(72, 38, 13, 0.18);
}
</style>
