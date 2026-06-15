<script setup lang="ts">
import { computed } from 'vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { HubOrder } from '@/types/production'

const store = useDocumentHubStore()
const pendingOrders = computed(() => [...store.visibleTodayOrders, ...store.visibleWeekOrders])

function statusText(order: HubOrder) {
  if (order.status === 'front') return '在前端'
  if (order.status === 'back') return '在后端'
  return '未发图'
}
</script>

<template>
  <PrimeDialog v-model:visible="store.orderOverviewOpen" modal header="订单总览" :style="{ width: '860px' }">
    <div class="overview-grid">
      <section>
        <h3>本周订单</h3>
        <button v-for="order in store.weekOrders" :key="order.orderId" type="button" @click="store.openOrderProduct(order)">
          <b>{{ order.productModel }}</b>
          <span>{{ order.customerName }}</span>
          <i>{{ statusText(order) }}</i>
        </button>
      </section>
      <section>
        <h3>待完成</h3>
        <button v-for="order in pendingOrders" :key="order.orderId" type="button" @click="store.openOrderProduct(order)">
          <b>{{ order.productModel }}</b>
          <span>{{ order.customerName }}</span>
          <i>{{ statusText(order) }}</i>
        </button>
      </section>
      <section>
        <h3>已完成</h3>
        <button v-for="order in store.completedOrders" :key="order.orderId" type="button" @click="store.openOrderProduct(order)">
          <b>{{ order.productModel }}</b>
          <span>{{ order.customerName }}</span>
          <i>{{ order.completedAt?.slice(0, 16).replace('T', ' ') || '已完成' }}</i>
        </button>
        <p v-if="!store.completedOrders.length">暂无已完成订单。</p>
      </section>
    </div>
  </PrimeDialog>
</template>

<style scoped>
.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

section {
  min-height: 360px;
  max-height: 520px;
  overflow: auto;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 246, 230, 0.82);
}

h3 {
  margin: 0 0 10px;
  color: #4b2b15;
  font-size: 18px;
  font-weight: 950;
}

button {
  display: grid;
  width: 100%;
  margin-bottom: 8px;
  padding: 10px;
  border: 1px solid rgba(139, 90, 42, 0.14);
  border-radius: 12px;
  background: rgba(255, 252, 246, 0.88);
  color: #5f351a;
  text-align: left;
}

b,
span,
i,
p {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

b {
  font-size: 15px;
  font-weight: 950;
}

span,
i,
p {
  color: #7d542b;
  font-size: 12px;
  font-style: normal;
  font-weight: 850;
}
</style>
