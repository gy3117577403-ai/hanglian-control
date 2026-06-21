<script setup lang="ts">
import { computed } from 'vue'
import { Pencil, RefreshCw, Search, Users } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { HubCustomer } from '@/types/production'

const store = useDocumentHubStore()

defineEmits<{
  create: []
  edit: [customer: HubCustomer]
}>()

function normalize(value: unknown) {
  return String(value ?? '').normalize('NFKC').trim().toLowerCase()
}

const filteredCustomers = computed(() => {
  const keyword = normalize(store.maintenanceCustomerSearch)
  if (!keyword) return store.maintenanceCustomers
  return store.maintenanceCustomers.filter((customer) => [
    customer.customerName,
    customer.customerShortName,
    customer.customerCode,
    ...(customer.aliases ?? []),
  ].some((value) => normalize(value).includes(keyword)))
})

function customerStatusText(status?: HubCustomer['status']) {
  return status === 'disabled' ? '停用' : '启用'
}

function customerStatusClass(status?: HubCustomer['status']) {
  return status === 'disabled' ? 'is-disabled' : 'is-active'
}

function summaryOf(customer: HubCustomer) {
  return store.maintenanceCustomerSummaries[customer.customerId] ?? {
    productCount: 0,
    noDrawingCount: 0,
    lastUpdatedAt: undefined,
  }
}

function formatDate(value?: string) {
  if (!value) return '暂无更新'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '暂无更新'
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

function reload() {
  void store.loadMaintenanceCustomers()
}

function selectCustomer(customer: HubCustomer) {
  void store.selectMaintenanceCustomer(customer.customerId)
}
</script>

<template>
  <section class="maintenance-customer-panel">
    <header class="panel-heading">
      <div class="heading-title">
        <Users :size="20" />
        <div>
          <h3>客户列表</h3>
          <p>{{ filteredCustomers.length }} 个客户</p>
        </div>
      </div>
      <PrimeButton class="icon-button" severity="secondary" outlined :disabled="store.maintenanceLoading" title="刷新客户" aria-label="刷新客户" @click="reload">
        <RefreshCw :size="17" />
      </PrimeButton>
    </header>

    <div class="search-line">
      <Search :size="17" />
      <input
        v-model="store.maintenanceCustomerSearch"
        type="search"
        placeholder="搜索客户名称、简称、编码、别名"
        @keyup.enter="reload"
      >
    </div>

    <div class="panel-actions">
      <PrimeButton label="新建客户" class="create-button" @click="$emit('create')" />
    </div>

    <div class="customer-list" data-scroll-key="maintenance-customers">
      <button
        v-for="customer in filteredCustomers"
        :key="customer.customerId"
        type="button"
        class="customer-card"
        :class="{ active: store.maintenanceSelectedCustomerId === customer.customerId }"
        @click="selectCustomer(customer)"
      >
        <span class="customer-card__main">
          <span class="customer-card__name" :title="customer.customerName">{{ customer.customerName }}</span>
          <span class="customer-card__short" :title="customer.customerShortName">{{ customer.customerShortName || customer.customerName }}</span>
        </span>
        <span class="customer-card__meta">
          <span v-if="customer.customerCode" class="meta-pill" :title="customer.customerCode">{{ customer.customerCode }}</span>
          <span class="meta-pill" :class="customerStatusClass(customer.status)">{{ customerStatusText(customer.status) }}</span>
        </span>
        <span class="customer-card__stats">
          <span>产品 {{ summaryOf(customer).productCount }}</span>
          <span>未发图 {{ summaryOf(customer).noDrawingCount }}</span>
          <span>{{ formatDate(summaryOf(customer).lastUpdatedAt) }}</span>
        </span>
        <PrimeButton class="edit-button" severity="secondary" outlined title="编辑客户" aria-label="编辑客户" @click.stop="$emit('edit', customer)">
          <Pencil :size="16" />
        </PrimeButton>
      </button>

      <div v-if="!filteredCustomers.length" class="empty-state">
        暂无客户资料。
      </div>
    </div>
  </section>
</template>

<style scoped>
.maintenance-customer-panel {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  min-height: 0;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 22px;
  background:
    linear-gradient(128deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.12) 58%),
    rgba(255, 255, 255, 0.16);
  box-shadow: 0 22px 48px rgba(91, 55, 23, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.86);
  overflow: hidden;
}

.panel-heading,
.heading-title,
.customer-card__meta,
.customer-card__stats {
  display: flex;
  align-items: center;
}

.panel-heading {
  justify-content: space-between;
  gap: 10px;
}

.heading-title {
  gap: 9px;
  min-width: 0;
  color: #4b2d15;
}

.heading-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 950;
  letter-spacing: 0;
}

.heading-title p {
  margin: 2px 0 0;
  color: rgba(86, 54, 29, 0.68);
  font-size: 12px;
  font-weight: 800;
}

.icon-button,
.edit-button {
  width: 44px;
  min-width: 44px;
  height: 44px;
  border-radius: 14px;
}

.search-line {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin-top: 12px;
  padding: 0 12px;
  border: 1px solid rgba(134, 91, 48, 0.14);
  border-radius: 16px;
  color: #7a4a22;
  background: rgba(255, 255, 255, 0.52);
}

.search-line input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: #3f2916;
  background: transparent;
  font-size: 14px;
  font-weight: 800;
}

.panel-actions {
  margin-top: 10px;
}

.create-button {
  width: 100%;
  min-height: 44px;
  border-radius: 15px;
  font-weight: 950;
}

.customer-list {
  display: grid;
  align-content: start;
  gap: 10px;
  min-height: 0;
  margin-top: 12px;
  padding-right: 2px;
  overflow-x: hidden;
  overflow-y: auto;
}

.customer-card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  min-height: 132px;
  padding: 13px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 20px;
  text-align: left;
  color: #432816;
  background:
    linear-gradient(128deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.24) 58%),
    rgba(255, 255, 255, 0.28);
  box-shadow: 0 16px 32px rgba(103, 62, 25, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.customer-card.active {
  border-color: rgba(196, 112, 44, 0.5);
  box-shadow: 0 18px 36px rgba(149, 80, 27, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.customer-card__main,
.customer-card__stats {
  grid-column: 1 / -1;
}

.customer-card__name,
.customer-card__short {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.customer-card__name {
  font-size: 17px;
  font-weight: 950;
}

.customer-card__short {
  margin-top: 5px;
  color: rgba(68, 44, 25, 0.68);
  font-size: 13px;
  font-weight: 850;
}

.customer-card__meta {
  grid-column: 1 / 2;
  gap: 6px;
  min-width: 0;
  flex-wrap: wrap;
}

.meta-pill {
  max-width: 100%;
  min-height: 28px;
  padding: 5px 9px;
  border-radius: 999px;
  color: #61401f;
  background: rgba(255, 255, 255, 0.58);
  font-size: 12px;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-pill.is-active {
  color: #1d6b5f;
  background: rgba(221, 247, 239, 0.82);
}

.meta-pill.is-disabled {
  color: #8e5b23;
  background: rgba(252, 231, 198, 0.82);
}

.customer-card__stats {
  justify-content: space-between;
  gap: 6px;
  color: rgba(76, 49, 27, 0.72);
  font-size: 12px;
  font-weight: 850;
}

.edit-button {
  grid-column: 2 / 3;
  grid-row: 2 / 3;
  align-self: center;
}

.empty-state {
  display: grid;
  min-height: 180px;
  place-items: center;
  color: rgba(75, 48, 27, 0.56);
  font-size: 14px;
  font-weight: 850;
}
</style>
