<script setup lang="ts">
import { computed } from 'vue'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import WarmOrderCard from './WarmOrderCard.vue'
import { orderQuantityTotal } from '@/lib/format'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { HubOrder } from '@/types/production'

const store = useDocumentHubStore()
const customerToneNames = ['tone-amber', 'tone-teal', 'tone-sage', 'tone-rose', 'tone-violet', 'tone-gold']

const weekOrders = computed(() => store.visibleWeekOrders)
const customerToneMap = computed(() => {
  const map = new Map<string, string>()
  for (const order of weekOrders.value) {
    if (!map.has(order.customerName)) {
      map.set(order.customerName, customerToneNames[map.size % customerToneNames.length])
    }
  }
  return map
})

function open(order: HubOrder) {
  void store.openOrderProduct(order, 'orders')
}

function customerTone(customerName: string) {
  return customerToneMap.value.get(customerName) ?? 'tone-neutral'
}

function customerCount(orders: HubOrder[]) {
  return new Set(orders.map((order) => order.customerName)).size
}

function quantitySum(orders: HubOrder[]) {
  return orderQuantityTotal(orders)
}
</script>

<template>
  <aside class="order-sidebar" :class="{ collapsed: store.orderSidebarCollapsed }" data-scroll-key="orders">
    <button
      class="collapsed-rail"
      type="button"
      title="展开订单"
      :aria-hidden="!store.orderSidebarCollapsed"
      :tabindex="store.orderSidebarCollapsed ? 0 : -1"
      @click="store.toggleOrderSidebar()"
    >
      <ChevronRight :size="19" />
      <span>订单</span>
      <b>{{ weekOrders.length }}</b>
      <small>本周</small>
    </button>

    <div
      class="expanded-panel"
      :aria-hidden="store.orderSidebarCollapsed"
    >
      <div class="sidebar-head">
        <CalendarDays :size="19" />
        <div>
          <h2>订单资料调用</h2>
          <p>点型号直接打开图纸资料</p>
        </div>
        <PrimeButton severity="secondary" text rounded title="收起订单栏" @click="store.toggleOrderSidebar()">
          <ChevronLeft :size="18" />
        </PrimeButton>
      </div>

      <section class="order-section week">
        <div class="section-title">
          <b>本周订单</b>
          <span>客户 {{ customerCount(weekOrders) }}</span>
          <em>数量 {{ quantitySum(weekOrders) }}</em>
        </div>
        <div class="order-list compact-scroll" data-scroll-key="week-orders">
          <WarmOrderCard
            v-for="order in weekOrders"
            :key="order.orderId"
            :order="order"
            :customer-tone="customerTone(order.customerName)"
            @open="open"
          />
          <div v-if="!weekOrders.length" class="empty-orders">
            本周暂无待办订单。
          </div>
        </div>
      </section>
    </div>
  </aside>
</template>

<style scoped>
.order-sidebar {
  position: relative;
  isolation: isolate;
  display: grid;
  box-sizing: border-box;
  min-height: 0;
  overflow: hidden;
  contain: layout paint style;
  z-index: 6;
  width: 100%;
  padding: 9px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 24px;
  background:
    linear-gradient(122deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.9) 34%, rgba(255, 255, 255, 0.78) 62%),
    linear-gradient(300deg, rgba(93, 143, 138, 0.22), rgba(93, 143, 138, 0.08) 52%, transparent 68%),
    rgba(255, 251, 241, 0.99);
  box-shadow:
    0 18px 34px rgba(75, 38, 13, 0.12),
    0 8px 18px rgba(255, 255, 255, 0.22) inset,
    0 0 0 1px rgba(126, 78, 36, 0.05),
    0 0 38px rgba(255, 255, 255, 0.18),
    0 2px 0 rgba(255, 255, 255, 0.96) inset,
    16px 0 28px rgba(255, 255, 255, 0.24) inset,
    -14px -12px 32px rgba(86, 130, 124, 0.1) inset;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: contents;
}

.order-sidebar::before,
.order-sidebar::after {
  position: absolute;
  content: '';
  pointer-events: none;
}

.order-sidebar::before {
  inset: 1px;
  z-index: -1;
  border-radius: 23px;
  background:
    linear-gradient(130deg, rgba(255, 255, 255, 0.99), rgba(255, 255, 255, 0.92) 32%, rgba(255, 255, 255, 0.82) 56%),
    linear-gradient(300deg, rgba(86, 132, 126, 0.18), transparent 50%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.22), transparent 18%, transparent 82%, rgba(100, 61, 29, 0.07));
}

.order-sidebar::after {
  display: none;
}

.collapsed-rail,
.expanded-panel {
  grid-area: 1 / 1;
  min-width: 0;
  min-height: 0;
  transition: none;
}

.expanded-panel {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  opacity: 1;
}

.order-sidebar.collapsed .expanded-panel {
  opacity: 0;
  pointer-events: none;
}

.order-sidebar.collapsed {
  width: 100%;
  padding: 6px;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  pointer-events: none;
}

.order-sidebar.collapsed::before {
  opacity: 0;
}

.sidebar-head {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 7px;
  align-items: center;
  margin-bottom: 8px;
  color: #9b5125;
}

h2,
p {
  margin: 0;
}

h2 {
  color: #332111;
  font-size: 16px;
  font-weight: 950;
}

p {
  margin-top: 2px;
  color: #7d542b;
  font-size: 11px;
  font-weight: 850;
}

.order-section {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
  padding: 7px 3px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 17px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.025)),
    rgba(255, 255, 255, 0.02);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    inset 0 -12px 22px rgba(120, 67, 32, 0.028);
}

.order-section.week {
  border-top-color: rgba(88, 122, 118, 0.18);
}

.section-title {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px;
  align-items: center;
  margin-bottom: 6px;
  color: #4a2d16;
}

.section-title b {
  font-size: 14px;
  font-weight: 950;
}

.section-title span,
.section-title em {
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.52);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
  color: #8b5528;
  font-size: 11px;
  font-weight: 950;
  font-style: normal;
  text-align: center;
}

.section-title em {
  grid-column: 1 / -1;
  justify-self: start;
}

.order-list {
  display: grid;
  align-content: start;
  gap: 6px;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 3px;
  scrollbar-gutter: stable;
  -webkit-overflow-scrolling: touch;
}

.order-list::-webkit-scrollbar {
  width: 6px;
}

.order-list::-webkit-scrollbar-track {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
}

.order-list::-webkit-scrollbar-thumb {
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.48), rgba(255, 255, 255, 0.12)),
    rgba(129, 84, 40, 0.42);
}

.compact-scroll {
  max-height: 100%;
}

.empty-orders {
  display: grid;
  place-items: center;
  min-height: 92px;
  padding: 10px;
  border: 1px dashed rgba(139, 90, 42, 0.18);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.2);
  color: #8a6239;
  font-size: 12px;
  font-weight: 850;
  line-height: 1.45;
  text-align: center;
}

.collapsed-rail {
  opacity: 0;
  display: grid;
  box-sizing: border-box;
  gap: 8px;
  place-items: center;
  contain: layout paint style;
  width: 100%;
  height: 100%;
  min-height: 0;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 18px;
  background:
    linear-gradient(128deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.08) 52%),
    linear-gradient(302deg, rgba(95, 142, 136, 0.1), transparent 56%),
    rgba(255, 255, 255, 0.34);
  color: #6a391b;
  cursor: pointer;
  box-shadow:
    0 18px 34px rgba(75, 38, 13, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.96),
    inset 0 -18px 34px rgba(116, 62, 30, 0.06);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  pointer-events: none;
}

.order-sidebar.collapsed .collapsed-rail {
  opacity: 1;
  pointer-events: auto;
}

.collapsed-rail span {
  writing-mode: vertical-rl;
  color: #4a2d16;
  font-size: 13px;
  font-weight: 950;
  letter-spacing: 0;
}

.collapsed-rail b,
.collapsed-rail small {
  display: grid;
  place-items: center;
  min-width: 30px;
  min-height: 30px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #a34f1f;
  font-weight: 950;
}

.collapsed-rail small {
  min-width: 0;
  min-height: 0;
  padding: 5px 4px;
  color: #6f4a28;
  font-size: 10px;
  writing-mode: vertical-rl;
}

@media (max-width: 1320px), (prefers-reduced-motion: reduce) {
  .order-sidebar {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .order-sidebar.collapsed .collapsed-rail {
    width: 100%;
  }

  .collapsed-rail,
  .expanded-panel {
    transition: none;
  }
}
</style>
