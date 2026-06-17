<script setup lang="ts">
import { computed, ref } from 'vue'
import { CheckCircle2, RotateCcw } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { HubOrder, HubOrderStatus } from '@/types/production'

const store = useDocumentHubStore()
const tab = ref<'week' | 'pending' | 'completed'>('week')

const statusOptions: Array<{ label: string; value: HubOrderStatus }> = [
  { label: '在后段', value: 'back' },
  { label: '在前段', value: 'front' },
  { label: '未发图', value: 'no_drawing' },
  { label: '异常', value: 'exception' },
]
const orderStatusRank: Record<HubOrderStatus, number> = { back: 0, front: 1, no_drawing: 2, exception: 3 }

function sortedOrders(orders: HubOrder[]) {
  return [...orders].sort((a, b) => {
    const statusDiff = orderStatusRank[a.status] - orderStatusRank[b.status]
    if (statusDiff) return statusDiff
    const customerDiff = a.customerName.localeCompare(b.customerName, 'zh-Hans-CN')
    if (customerDiff) return customerDiff
    return a.productModel.localeCompare(b.productModel, 'zh-Hans-CN')
  })
}

const pendingOrders = computed(() => [...store.visibleTodayOrders, ...store.visibleWeekOrders])
const rows = computed(() => {
  if (tab.value === 'pending') return sortedOrders(pendingOrders.value)
  if (tab.value === 'completed') return sortedOrders(store.completedOrders)
  return sortedOrders(store.weekOrders)
})

function completeText(order: HubOrder) {
  return order.completed ? '已完成' : '待完成'
}

function open(order: HubOrder) {
  store.saveCurrentScroll('order-overview')
  void store.openOrderProduct(order, 'overview')
  store.orderOverviewOpen = false
}

function updateStatus(order: HubOrder, event: Event) {
  const value = (event.target as HTMLSelectElement).value as HubOrderStatus
  store.updateOrderStatus(order, value)
}
</script>

<template>
  <PrimeDialog v-model:visible="store.orderOverviewOpen" modal header="订单总览" :style="{ width: '980px' }">
    <div class="overview-note">后续 Excel 导入只需导入产品型号。</div>
    <div class="overview-tabs">
      <button type="button" :class="{ active: tab === 'week' }" @click="tab = 'week'">
        本周订单 <b>{{ store.weekOrders.length }}</b>
      </button>
      <button type="button" :class="{ active: tab === 'pending' }" @click="tab = 'pending'">
        待完成 <b>{{ pendingOrders.length }}</b>
      </button>
      <button type="button" :class="{ active: tab === 'completed' }" @click="tab = 'completed'">
        已完成 <b>{{ store.completedOrders.length }}</b>
      </button>
    </div>
    <div class="overview-list" data-scroll-key="order-overview">
      <article v-for="order in rows" :key="order.orderId" class="overview-row">
        <button type="button" class="row-main" @click="open(order)">
          <b>{{ order.productModel }}</b>
          <span>{{ order.customerName }}</span>
          <small>{{ order.completedAt?.slice(0, 16).replace('T', ' ') || '暂无完成时间' }}</small>
        </button>
        <select
          class="status-select"
          :class="order.status"
          :value="order.status"
          :disabled="order.completed"
          title="编辑订单状态"
          @change="updateStatus(order, $event)"
        >
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <strong class="complete-state">{{ completeText(order) }}</strong>
        <PrimeButton
          v-if="!order.completed"
          class="complete-button"
          severity="success"
          outlined
          title="确认完成"
          @click="store.completeOrder(order)"
        >
          <CheckCircle2 :size="16" />
          <span>确认完成</span>
        </PrimeButton>
        <PrimeButton
          v-if="order.completed"
          class="reopen-button"
          severity="secondary"
          outlined
          title="重新加入待完成"
          @click="store.reopenOrder(order)"
        >
          <RotateCcw :size="16" />
          <span>重新加入</span>
        </PrimeButton>
      </article>
      <p v-if="!rows.length" class="empty-overview">暂无订单，可后续通过 Excel 导入产品型号。</p>
    </div>
  </PrimeDialog>
</template>

<style scoped>
.overview-note {
  margin-bottom: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.66);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.36);
  color: #70421d;
  font-size: 13px;
  font-weight: 900;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.overview-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}

.overview-tabs button {
  min-height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.66);
  border-radius: 14px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.5), rgba(255, 232, 198, 0.22)),
    rgba(255, 255, 255, 0.18);
  color: #65421f;
  font-weight: 950;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.overview-tabs button.active {
  border-color: rgba(255, 255, 255, 0.58);
  background:
    linear-gradient(145deg, rgba(214, 107, 44, 0.78), rgba(168, 75, 36, 0.7)),
    rgba(255, 255, 255, 0.2);
  color: #fff8ec;
  box-shadow:
    0 14px 22px rgba(128, 62, 22, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.overview-tabs b {
  margin-left: 5px;
}

.overview-list {
  display: grid;
  align-content: start;
  gap: 8px;
  max-height: 520px;
  overflow-y: auto;
  padding-right: 3px;
}

.overview-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 116px 72px auto;
  gap: 8px;
  align-items: center;
}

.row-main {
  display: grid;
  grid-template-columns: minmax(140px, 1.1fr) minmax(110px, 0.9fr) minmax(120px, 0.8fr);
  gap: 8px;
  align-items: center;
  min-height: 52px;
  padding: 9px 10px;
  border: 1px solid rgba(255, 255, 255, 0.64);
  border-radius: 14px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.48), rgba(255, 238, 214, 0.18)),
    rgba(255, 255, 255, 0.2);
  color: #5f351a;
  text-align: left;
  box-shadow:
    0 10px 18px rgba(80, 42, 16, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

b,
span,
i,
strong,
small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

b {
  color: #342112;
  font-size: 15px;
  font-weight: 950;
}

span,
i,
strong,
small,
.empty-overview {
  color: #7d542b;
  font-size: 12px;
  font-style: normal;
  font-weight: 850;
}

strong {
  color: #3f7a36;
}

.status-select {
  min-height: 42px;
  padding: 0 30px 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 13px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.62), rgba(255, 238, 214, 0.24)),
    rgba(255, 255, 255, 0.22);
  color: #68401f;
  font-size: 13px;
  font-weight: 950;
  outline: none;
  box-shadow:
    0 10px 18px rgba(80, 42, 16, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  cursor: pointer;
}

.status-select.front {
  color: #1f7184;
}

.status-select.back {
  color: #a34f1f;
}

.status-select.no_drawing,
.status-select.exception {
  color: #9b3d32;
}

.status-select:disabled {
  opacity: 0.62;
  cursor: default;
}

.complete-state {
  display: grid;
  place-items: center;
  min-height: 42px;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.28);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.68);
  text-align: center;
}

.overview-row :deep(.p-button) {
  min-height: 40px;
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
  text-align: center;
}
</style>
