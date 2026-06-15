<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarDays } from 'lucide-vue-next'
import WarmOrderCard from './WarmOrderCard.vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
const tab = ref<'today' | 'week'>('today')
const orders = computed(() => tab.value === 'today' ? store.visibleTodayOrders : store.visibleWeekOrders)
</script>

<template>
  <aside class="order-sidebar" data-scroll-key="orders">
    <div class="sidebar-head">
      <CalendarDays :size="22" />
      <div>
        <h2>订单资料调用</h2>
        <p>点击产品型号直接打开图纸</p>
      </div>
    </div>
    <div class="order-tabs">
      <button type="button" :class="{ active: tab === 'today' }" @click="tab = 'today'">
        今日订单 <b>{{ store.visibleTodayOrders.length }}</b>
      </button>
      <button type="button" :class="{ active: tab === 'week' }" @click="tab = 'week'">
        本周订单 <b>{{ store.visibleWeekOrders.length }}</b>
      </button>
    </div>
    <div class="order-list">
      <WarmOrderCard
        v-for="order in orders"
        :key="order.orderId"
        :order="order"
        @open="store.openOrderProduct"
        @complete="store.completeOrder"
      />
      <div v-if="!orders.length" class="empty-orders">
        <b>当前列表已清空</b>
        <span>已完成订单可在右上角“订单总览”查看。</span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.order-sidebar {
  min-height: 0;
  overflow: auto;
  padding: 12px;
  border: 1px solid rgba(139, 90, 42, 0.18);
  border-radius: 20px;
  background: rgba(255, 249, 238, 0.82);
  box-shadow: 0 18px 30px rgba(75, 38, 13, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.75);
}

.sidebar-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
  color: #9b5125;
}

h2,
p {
  margin: 0;
}

h2 {
  color: #332111;
  font-size: 20px;
  font-weight: 950;
}

p {
  margin-top: 2px;
  color: #7d542b;
  font-size: 12px;
  font-weight: 850;
}

.order-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}

.order-tabs button {
  min-height: 42px;
  border: 1px solid rgba(139, 90, 42, 0.16);
  border-radius: 13px;
  background: rgba(255, 241, 218, 0.82);
  color: #65421f;
  font-weight: 950;
}

.order-tabs button.active {
  background: linear-gradient(145deg, #d66b2c, #a84b24);
  color: #fff8ec;
  box-shadow: 0 12px 18px rgba(128, 62, 22, 0.2);
}

.order-tabs b {
  margin-left: 4px;
}

.order-list {
  display: grid;
  gap: 9px;
}

.empty-orders {
  display: grid;
  gap: 4px;
  place-items: center;
  min-height: 170px;
  color: #8a6239;
  text-align: center;
}

.empty-orders b {
  color: #5c3419;
}
</style>
