<script setup lang="ts">
import { CheckCircle2, FileSearch, Link2, Link2Off } from 'lucide-vue-next'
import WarmOrderStatusMenu from './WarmOrderStatusMenu.vue'
import type { OrderProductionStatus, ProductionOrder } from '@/types/order-management'

defineProps<{
  order: ProductionOrder
  customerTone?: string
  loading?: boolean
}>()

const emit = defineEmits<{
  open: [order: ProductionOrder]
  complete: [order: ProductionOrder]
  link: [order: ProductionOrder]
  'status-change': [order: ProductionOrder, status: OrderProductionStatus]
}>()

const resolutionMap = {
  found: { label: '已绑定资料页', className: 'bound' },
  product_not_found: { label: '产品未建档', className: 'missing' },
  customer_not_found: { label: '客户未建档', className: 'missing' },
  ambiguous: { label: '需确认客户', className: 'confirm' },
  unknown: { label: '待识别资料页', className: 'pending' },
  resolving: { label: '正在识别', className: 'pending' },
  error: { label: '识别失败', className: 'missing' },
}

function quantityText(order: ProductionOrder) {
  if (!order.quantityProvided) return '数量未填写'
  const value = Number(order.quantity)
  return Number.isFinite(value) && value > 0 ? `数量 ${value}` : '数量未填写'
}

function bindingState(order: ProductionOrder) {
  return resolutionMap[order.productResolutionStatus] ?? resolutionMap.unknown
}
</script>

<template>
  <article class="order-card" :class="customerTone">
    <div class="card-top">
      <button type="button" class="model-button" :title="order.productModel" @click="emit('open', order)">
        <FileSearch :size="17" />
        <span>{{ order.productModel }}</span>
      </button>
      <button
        v-if="order.productResolutionStatus === 'ambiguous'"
        class="link-button"
        type="button"
        :disabled="loading"
        title="确认客户和产品资料页"
        @click="emit('link', order)"
      >
        <Link2 :size="15" />
      </button>
    </div>

    <p class="card-meta">
      <i aria-hidden="true"></i>
      <span :title="order.customerName || '客户待确认'">{{ order.customerName || '客户待确认' }}</span>
      <b>{{ quantityText(order) }}</b>
    </p>

    <div class="card-state">
      <span class="binding" :class="bindingState(order).className">
        <Link2 v-if="order.productResolutionStatus === 'found'" :size="13" />
        <Link2Off v-else :size="13" />
        {{ bindingState(order).label }}
      </span>
      <PrimeButton
        class="complete-button"
        severity="success"
        size="small"
        :disabled="loading || order.completionStatus === 'completed'"
        title="确认完成订单"
        @click="emit('complete', order)"
      >
        <CheckCircle2 :size="15" />
        <span>完成</span>
      </PrimeButton>
    </div>

    <WarmOrderStatusMenu
      :order="order"
      :loading="loading"
      @change="(status) => emit('status-change', order, status)"
    />
  </article>
</template>

<style scoped>
.order-card {
  position: relative;
  isolation: isolate;
  display: grid;
  gap: 7px;
  contain: layout paint style;
  min-height: 132px;
  padding: 9px 9px 9px 11px;
  border: 1px solid rgba(255, 255, 255, 0.92);
  border-radius: 15px;
  background:
    linear-gradient(122deg, rgba(255, 255, 255, 0.68), rgba(255, 255, 255, 0.1) 48%, transparent 68%),
    linear-gradient(310deg, rgba(96, 145, 139, 0.16), rgba(96, 145, 139, 0.03) 56%, transparent),
    rgba(255, 255, 255, 0.06);
  box-shadow:
    0 16px 30px rgba(81, 42, 16, 0.11),
    0 0 0 1px rgba(120, 74, 33, 0.04),
    0 2px 0 rgba(255, 255, 255, 0.96) inset,
    12px 0 24px rgba(255, 255, 255, 0.28) inset,
    -12px -8px 24px rgba(92, 133, 127, 0.08) inset,
    0 -8px 18px rgba(127, 70, 34, 0.018) inset;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
  --customer-accent: #d88935;
  --customer-soft: rgba(216, 137, 53, 0.14);
}

.order-card::before {
  position: absolute;
  inset: 1px;
  z-index: -1;
  border-radius: 14px;
  background:
    linear-gradient(90deg, var(--customer-soft), transparent 34%),
    linear-gradient(124deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.1) 36%, transparent 62%),
    linear-gradient(300deg, rgba(93, 140, 134, 0.12), transparent 48%);
  content: '';
  pointer-events: none;
}

.order-card::after {
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 4px;
  width: 4px;
  border-radius: 999px;
  background: var(--customer-accent);
  box-shadow: 0 0 14px color-mix(in srgb, var(--customer-accent) 46%, transparent);
  content: '';
  pointer-events: none;
}

.order-card:hover {
  border-color: rgba(255, 255, 255, 0.96);
  box-shadow:
    0 18px 34px rgba(81, 42, 16, 0.18),
    0 0 0 1px rgba(120, 74, 33, 0.045),
    0 2px 0 rgba(255, 255, 255, 0.92) inset,
    0 -8px 18px rgba(127, 70, 34, 0.04) inset;
  transform: translateY(-1px);
}

.card-top,
.card-state {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 7px;
  align-items: center;
  min-width: 0;
}

.model-button,
.link-button {
  display: inline-grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 5px;
  align-items: center;
  min-height: 34px;
  max-width: 100%;
  border: 0;
  background: transparent;
  color: #392312;
  font-size: 14px;
  font-weight: 950;
  text-align: left;
  cursor: pointer;
}

.model-button span,
.card-meta span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-button {
  grid-template-columns: auto;
  justify-content: center;
  min-width: 34px;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.44);
  color: #96501f;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.link-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.card-meta {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  gap: 5px;
  align-items: center;
  min-width: 0;
  margin: -2px 0 0 21px;
  color: #7d542b;
  font-size: 10px;
  font-weight: 850;
}

.card-meta i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--customer-accent);
  box-shadow: 0 0 10px color-mix(in srgb, var(--customer-accent) 42%, transparent);
}

.card-meta b,
.binding {
  flex: none;
  justify-self: end;
  padding: 3px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.56);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
  color: #8f4a22;
  font-size: 10px;
  font-weight: 950;
  white-space: nowrap;
}

.binding {
  justify-self: start;
  display: inline-grid;
  grid-auto-flow: column;
  gap: 4px;
  align-items: center;
}

.binding.bound {
  color: #14746f;
}

.binding.confirm {
  color: #9b5125;
}

.binding.missing {
  color: #9b3d32;
}

.binding.pending {
  color: #6b5c3b;
}

.complete-button {
  min-width: 72px;
  min-height: 36px;
  border-radius: 12px;
  font-weight: 950;
}

.tone-amber {
  --customer-accent: #d88935;
  --customer-soft: rgba(216, 137, 53, 0.18);
}

.tone-teal {
  --customer-accent: #4f9893;
  --customer-soft: rgba(79, 152, 147, 0.18);
}

.tone-sage {
  --customer-accent: #7c9b54;
  --customer-soft: rgba(124, 155, 84, 0.18);
}

.tone-rose {
  --customer-accent: #c26b62;
  --customer-soft: rgba(194, 107, 98, 0.18);
}

.tone-violet {
  --customer-accent: #8f7ab8;
  --customer-soft: rgba(143, 122, 184, 0.18);
}

.tone-gold {
  --customer-accent: #c5a04b;
  --customer-soft: rgba(197, 160, 75, 0.18);
}
</style>
