<script setup lang="ts">
import { CalendarDays } from 'lucide-vue-next'
import WarmOrderCard from './WarmOrderCard.vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { HubOrder } from '@/types/production'

const store = useDocumentHubStore()

function open(order: HubOrder) {
  void store.openOrderProduct(order, 'orders')
}
</script>

<template>
  <aside class="order-sidebar" data-scroll-key="orders">
    <div class="sidebar-head">
      <CalendarDays :size="21" />
      <div>
        <h2>订单驱动图纸库</h2>
        <p>点击产品型号直接打开图纸详情</p>
      </div>
    </div>

    <section class="order-section">
      <div class="section-title">
        <b>今日订单</b>
        <span>{{ store.visibleTodayOrders.length }}</span>
      </div>
      <div class="order-list compact-scroll" data-scroll-key="today-orders">
        <WarmOrderCard
          v-for="order in store.visibleTodayOrders"
          :key="order.orderId"
          :order="order"
          @open="open"
          @complete="store.completeOrder"
        />
        <div v-if="!store.visibleTodayOrders.length" class="empty-orders">
          暂无订单，可后续通过 Excel 导入产品型号。
        </div>
      </div>
    </section>

    <section class="order-section">
      <div class="section-title">
        <b>本周订单</b>
        <span>{{ store.visibleWeekOrders.length }}</span>
      </div>
      <div class="order-list compact-scroll" data-scroll-key="week-orders">
        <WarmOrderCard
          v-for="order in store.visibleWeekOrders"
          :key="order.orderId"
          :order="order"
          @open="open"
          @complete="store.completeOrder"
        />
        <div v-if="!store.visibleWeekOrders.length" class="empty-orders">
          暂无订单，可后续通过 Excel 导入产品型号。
        </div>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.order-sidebar {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
  padding: 11px;
  border: 1px solid rgba(139, 90, 42, 0.18);
  border-radius: 20px;
  background: rgba(255, 249, 238, 0.84);
  box-shadow: 0 18px 30px rgba(75, 38, 13, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.75);
}

.sidebar-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  margin-bottom: 9px;
  color: #9b5125;
}

h2,
p {
  margin: 0;
}

h2 {
  color: #332111;
  font-size: 19px;
  font-weight: 950;
}

p {
  margin-top: 2px;
  color: #7d542b;
  font-size: 12px;
  font-weight: 850;
}

.order-section {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
  padding-top: 8px;
  border-top: 1px solid rgba(139, 90, 42, 0.12);
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 7px;
  color: #4a2d16;
}

.section-title b {
  font-size: 15px;
  font-weight: 950;
}

.section-title span {
  min-width: 30px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(214, 107, 44, 0.12);
  color: #a34f1f;
  font-size: 12px;
  font-weight: 950;
  text-align: center;
}

.order-list {
  display: grid;
  align-content: start;
  gap: 7px;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 2px;
}

.compact-scroll {
  max-height: 100%;
}

.empty-orders {
  display: grid;
  place-items: center;
  min-height: 120px;
  padding: 12px;
  border: 1px dashed rgba(139, 90, 42, 0.2);
  border-radius: 14px;
  color: #8a6239;
  font-size: 13px;
  font-weight: 850;
  line-height: 1.45;
  text-align: center;
}
</style>
