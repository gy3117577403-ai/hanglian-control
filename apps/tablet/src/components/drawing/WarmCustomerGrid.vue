<script setup lang="ts">
import { computed } from 'vue'
import { Building2, Clock3, FileWarning, Layers3 } from 'lucide-vue-next'
import { mockDrawingDetails, mockHubProducts } from '@/mock/order-hub-data'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { HubCustomer } from '@/types/production'

const store = useDocumentHubStore()

const filteredCustomers = computed(() => {
  const keyword = store.searchKeyword.trim().toLowerCase()
  if (!keyword) return store.customers
  return store.customers.filter((customer) => [
    customer.customerName,
    customer.customerShortName,
  ].some((value) => value.toLowerCase().includes(keyword)))
})

function customerStats(customer: HubCustomer) {
  const products = mockHubProducts.filter((product) => product.customerId === customer.customerId)
  const noDrawingCount = products.filter((product) => product.drawingStatus === 'no_drawing').length
  const dates = mockDrawingDetails
    .filter((detail) => detail.product.customerId === customer.customerId)
    .flatMap((detail) => detail.modules.map((module) => module.updatedAt))
    .sort()
  return {
    productCount: products.length,
    noDrawingCount,
    updatedAt: dates.at(-1)?.slice(0, 10) ?? '待补充',
  }
}
</script>

<template>
  <div class="customer-grid" data-scroll-key="customers">
    <button v-for="customer in filteredCustomers" :key="customer.customerId" type="button" @click="store.openCustomer(customer)">
      <div class="customer-icon"><Building2 :size="24" /></div>
      <b>{{ customer.customerShortName }}</b>
      <span>{{ customer.customerName }}</span>
      <div class="meta-row">
        <i><Layers3 :size="14" />{{ customerStats(customer).productCount }} 个型号</i>
        <i><FileWarning :size="14" />{{ customerStats(customer).noDrawingCount }} 个未发图</i>
        <i><Clock3 :size="14" />{{ customerStats(customer).updatedAt }}</i>
      </div>
    </button>
    <div v-if="!filteredCustomers.length" class="empty">
      暂无客户资料，后续可通过产品型号导入或上传资料时自动创建。
    </div>
  </div>
</template>

<style scoped>
.customer-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  height: calc(100% - 58px);
  overflow: auto;
  padding-right: 2px;
}

button,
.empty {
  min-height: 136px;
  padding: 14px;
  border: 1px solid rgba(139, 90, 42, 0.16);
  border-radius: 16px;
  background: linear-gradient(145deg, rgba(255, 252, 245, 0.96), rgba(255, 232, 194, 0.78));
  color: #935022;
  text-align: left;
  box-shadow: 0 14px 24px rgba(80, 42, 16, 0.11);
}

.customer-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: rgba(214, 107, 44, 0.12);
}

b,
span,
i {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

b {
  display: block;
  margin-top: 9px;
  color: #342112;
  font-size: 21px;
  font-weight: 950;
}

span {
  display: block;
  margin-top: 2px;
  color: #7b542c;
  font-size: 13px;
  font-weight: 850;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 9px;
}

i {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 4px 7px;
  border-radius: 999px;
  background: rgba(255, 246, 230, 0.9);
  color: #724722;
  font-size: 11px;
  font-style: normal;
  font-weight: 900;
}

.empty {
  display: grid;
  place-items: center;
  grid-column: 1 / -1;
  min-height: 260px;
  color: #8a6239;
  font-weight: 850;
  text-align: center;
}
</style>
