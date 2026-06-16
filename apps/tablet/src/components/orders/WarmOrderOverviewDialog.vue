<script setup lang="ts">
import { computed, ref } from 'vue'
import { RotateCcw } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { HubOrder } from '@/types/production'

const store = useDocumentHubStore()
const tab = ref<'week' | 'pending' | 'completed'>('week')

const pendingOrders = computed(() => [...store.visibleTodayOrders, ...store.visibleWeekOrders])
const rows = computed(() => {
  if (tab.value === 'pending') return pendingOrders.value
  if (tab.value === 'completed') return store.completedOrders
  return store.weekOrders
})

function statusText(order: HubOrder) {
  if (order.status === 'front') return '在前段'
  if (order.status === 'back') return '在后段'
  return '未发图'
}

function completeText(order: HubOrder) {
  return order.completed ? '已完成' : '待完成'
}

function open(order: HubOrder) {
  store.saveCurrentScroll('order-overview')
  void store.openOrderProduct(order, 'overview')
  store.orderOverviewOpen = false
}
</script>

<template>
  <PrimeDialog v-model:visible="store.orderOverviewOpen" modal header="订单总览" :style="{ width: '900px' }">
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
          <i>{{ statusText(order) }}</i>
          <strong>{{ completeText(order) }}</strong>
          <small>{{ order.completedAt?.slice(0, 16).replace('T', ' ') || '暂无完成时间' }}</small>
        </button>
        <PrimeButton
          v-if="order.completed"
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
  border-radius: 12px;
  background: rgba(255, 238, 205, 0.78);
  color: #70421d;
  font-size: 13px;
  font-weight: 900;
}

.overview-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}

.overview-tabs button {
  min-height: 42px;
  border: 1px solid rgba(139, 90, 42, 0.16);
  border-radius: 13px;
  background: rgba(255, 241, 218, 0.82);
  color: #65421f;
  font-weight: 950;
}

.overview-tabs button.active {
  background: linear-gradient(145deg, #d66b2c, #a84b24);
  color: #fff8ec;
  box-shadow: 0 12px 18px rgba(128, 62, 22, 0.2);
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
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.row-main {
  display: grid;
  grid-template-columns: minmax(140px, 1.1fr) minmax(110px, 0.9fr) 76px 76px minmax(120px, 0.8fr);
  gap: 8px;
  align-items: center;
  min-height: 52px;
  padding: 9px 10px;
  border: 1px solid rgba(139, 90, 42, 0.14);
  border-radius: 12px;
  background: rgba(255, 252, 246, 0.9);
  color: #5f351a;
  text-align: left;
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

.overview-row :deep(.p-button) {
  min-height: 40px;
  border-radius: 12px;
  font-weight: 950;
}

.empty-overview {
  display: grid;
  place-items: center;
  min-height: 180px;
  border: 1px dashed rgba(139, 90, 42, 0.2);
  border-radius: 14px;
  text-align: center;
}
</style>
