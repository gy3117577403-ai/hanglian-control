<script setup lang="ts">
import { CheckCircle2, FileSearch, Link2, RotateCcw } from 'lucide-vue-next'
import WarmOrderStatusMenu from './WarmOrderStatusMenu.vue'
import type { OrderProductionStatus, ProductionOrder } from '@/types/order-management'

defineProps<{
  orders: ProductionOrder[]
  actionLoadingId?: string
}>()

const emit = defineEmits<{
  open: [order: ProductionOrder]
  complete: [order: ProductionOrder]
  restore: [order: ProductionOrder]
  link: [order: ProductionOrder]
  'status-change': [order: ProductionOrder, status: OrderProductionStatus]
}>()

const completionLabel = {
  pending: '待完成',
  completed: '已完成',
}

function quantityText(order: ProductionOrder) {
  if (!order.quantityProvided) return '数量未填写'
  const value = Number(order.quantity)
  return Number.isFinite(value) && value > 0 ? `数量 ${value}` : '数量未填写'
}

function bindingLabel(order: ProductionOrder) {
  if (order.productResolutionStatus === 'found') return '已绑定资料页'
  if (order.productResolutionStatus === 'ambiguous') return '需确认客户'
  if (order.productResolutionStatus === 'customer_not_found') return '客户未建档'
  if (order.productResolutionStatus === 'product_not_found') return '产品未建档'
  return '待识别资料页'
}
</script>

<template>
  <div class="overview-list" data-scroll-key="order-overview">
    <article v-for="order in orders" :key="order.orderId" class="overview-row" :class="order.completionStatus">
      <button type="button" class="row-main" :title="order.productModel" @click="emit('open', order)">
        <FileSearch :size="16" />
        <b>{{ order.productModel }}</b>
        <span>{{ order.customerName || '客户待确认' }}</span>
        <small>{{ quantityText(order) }}</small>
      </button>

      <div class="row-tags">
        <strong>{{ completionLabel[order.completionStatus] }}</strong>
        <em>{{ bindingLabel(order) }}</em>
        <i>{{ order.completedAt ? order.completedAt.slice(0, 16).replace('T', ' ') : '暂无完成时间' }}</i>
      </div>

      <WarmOrderStatusMenu
        :order="order"
        :loading="actionLoadingId === order.orderId"
        @change="(status) => emit('status-change', order, status)"
      />

      <div class="row-actions">
        <PrimeButton
          v-if="order.productResolutionStatus === 'ambiguous'"
          severity="secondary"
          outlined
          title="确认客户和产品资料页"
          :disabled="actionLoadingId === order.orderId"
          @click="emit('link', order)"
        >
          <Link2 :size="16" />
        </PrimeButton>
        <PrimeButton
          v-if="order.completionStatus === 'pending'"
          severity="success"
          outlined
          :loading="actionLoadingId === order.orderId"
          @click="emit('complete', order)"
        >
          <CheckCircle2 :size="16" />
          <span>完成</span>
        </PrimeButton>
        <PrimeButton
          v-else
          severity="secondary"
          outlined
          :loading="actionLoadingId === order.orderId"
          @click="emit('restore', order)"
        >
          <RotateCcw :size="16" />
          <span>恢复</span>
        </PrimeButton>
      </div>
    </article>

    <p v-if="!orders.length" class="empty-overview">暂无符合条件的订单。</p>
  </div>
</template>

<style scoped>
.overview-list {
  display: grid;
  align-content: start;
  gap: 8px;
  max-height: 54vh;
  overflow-y: auto;
  padding-right: 4px;
}

.overview-row {
  display: grid;
  grid-template-columns: minmax(270px, 1.25fr) minmax(150px, 0.8fr) minmax(220px, 0.9fr) auto;
  gap: 8px;
  align-items: center;
  min-height: 86px;
  padding: 9px;
  border: 1px solid rgba(255, 255, 255, 0.64);
  border-radius: 15px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.46), rgba(255, 238, 214, 0.16)),
    rgba(255, 255, 255, 0.2);
  box-shadow:
    0 10px 18px rgba(80, 42, 16, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.78);
}

.overview-row.completed {
  opacity: 0.86;
}

.row-main {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 4px 7px;
  align-items: center;
  min-width: 0;
  min-height: 60px;
  padding: 8px 10px;
  border: 0;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.22);
  color: #5f351a;
  text-align: left;
  cursor: pointer;
}

.row-main span,
.row-main small {
  grid-column: 2;
}

.row-main b,
.row-main span,
.row-main small,
.row-tags strong,
.row-tags em,
.row-tags i {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-main b {
  color: #342112;
  font-size: 15px;
  font-weight: 950;
}

.row-main span,
.row-main small,
.row-tags {
  color: #7d542b;
  font-size: 12px;
  font-weight: 850;
}

.row-tags {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.row-tags strong,
.row-tags em,
.row-tags i {
  font-style: normal;
}

.row-tags strong,
.row-tags em {
  justify-self: start;
  padding: 4px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.48);
}

.row-tags strong {
  color: #2f7c5f;
}

.row-tags em {
  color: #8f4a22;
}

.row-actions {
  display: grid;
  grid-auto-flow: column;
  gap: 6px;
  align-items: center;
}

.row-actions :deep(.p-button) {
  min-height: 42px;
  border-radius: 12px;
  font-weight: 950;
}

.empty-overview {
  display: grid;
  place-items: center;
  min-height: 180px;
  border: 1px dashed rgba(139, 90, 42, 0.16);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.24);
  color: #7d542b;
  font-size: 13px;
  font-weight: 850;
  text-align: center;
}

@media (max-width: 1200px) {
  .overview-row {
    grid-template-columns: minmax(220px, 1fr) minmax(140px, 0.7fr);
  }

  .row-actions,
  .overview-row :deep(.order-status-menu) {
    grid-column: 1 / -1;
  }
}
</style>
