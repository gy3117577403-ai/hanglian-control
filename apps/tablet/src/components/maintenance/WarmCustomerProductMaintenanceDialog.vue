<script setup lang="ts">
import { ref, watch } from 'vue'
import { Search, X } from 'lucide-vue-next'
import WarmCustomerEditDialog from './WarmCustomerEditDialog.vue'
import WarmCustomerListPanel from './WarmCustomerListPanel.vue'
import WarmProductEditDialog from './WarmProductEditDialog.vue'
import WarmProductListPanel from './WarmProductListPanel.vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { HubCustomer } from '@/types/production'
import type { MaintenanceProductRow } from '@/types/customer-product-maintenance'

const visible = defineModel<boolean>('visible', { required: true })
const store = useDocumentHubStore()

const globalSearch = ref('')
const customerEditorOpen = ref(false)
const productEditorOpen = ref(false)
const editingCustomer = ref<HubCustomer | null>(null)
const editingProduct = ref<MaintenanceProductRow | null>(null)

function applyGlobalSearch() {
  store.maintenanceCustomerSearch = globalSearch.value
  store.maintenanceProductSearch = globalSearch.value
  void store.loadMaintenanceCustomers()
}

function refreshAll() {
  void store.loadMaintenanceCustomers()
}

function createCustomer() {
  editingCustomer.value = null
  customerEditorOpen.value = true
}

function editCustomer(customer: HubCustomer) {
  editingCustomer.value = customer
  customerEditorOpen.value = true
}

function createProduct() {
  editingProduct.value = null
  productEditorOpen.value = true
}

function editProduct(product: MaintenanceProductRow) {
  editingProduct.value = product
  productEditorOpen.value = true
}

watch(visible, (next) => {
  if (next) {
    void store.openCustomerProductMaintenance()
    globalSearch.value = store.maintenanceCustomerSearch || store.maintenanceProductSearch
  } else {
    store.closeCustomerProductMaintenance()
  }
})
</script>

<template>
  <PrimeDialog
    v-model:visible="visible"
    modal
    header="客户与产品资料"
    class="customer-product-maintenance-dialog"
    :style="{ width: '94vw', maxWidth: '1320px' }"
    :content-style="{ padding: '0', overflow: 'hidden' }"
  >
    <div class="maintenance-shell">
      <header class="maintenance-topbar">
        <div class="maintenance-title">
          <strong>客户与产品资料</strong>
          <span>图纸客户、产品型号和空白资料页维护</span>
        </div>

        <div class="global-search">
          <Search :size="17" />
          <input
            v-model="globalSearch"
            type="search"
            placeholder="搜索客户或产品"
            @keyup.enter="applyGlobalSearch"
          >
          <PrimeButton label="搜索" severity="secondary" outlined @click="applyGlobalSearch" />
        </div>

        <PrimeButton class="close-button" severity="secondary" outlined title="关闭" aria-label="关闭" @click="visible = false">
          <X :size="18" />
        </PrimeButton>
      </header>

      <PrimeMessage v-if="store.maintenanceError" severity="warn" :closable="false" class="maintenance-error">
        {{ store.maintenanceError }}
      </PrimeMessage>

      <section class="maintenance-grid">
        <WarmCustomerListPanel @create="createCustomer" @edit="editCustomer" />
        <WarmProductListPanel @create="createProduct" @edit="editProduct" />
      </section>

      <footer class="maintenance-footer">
        <PrimeButton label="刷新资料" severity="secondary" outlined :loading="store.maintenanceLoading" @click="refreshAll" />
        <PrimeButton label="关闭" @click="visible = false" />
      </footer>
    </div>

    <WarmCustomerEditDialog v-model:visible="customerEditorOpen" :customer="editingCustomer" />
    <WarmProductEditDialog
      v-model:visible="productEditorOpen"
      :customer="store.maintenanceSelectedCustomer"
      :product="editingProduct"
    />
  </PrimeDialog>
</template>

<style scoped>
:global(.customer-product-maintenance-dialog) {
  max-height: 92vh;
}

:global(.customer-product-maintenance-dialog .p-dialog-content) {
  border-radius: 0 0 20px 20px;
}

.maintenance-shell {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: 12px;
  height: min(760px, 82vh);
  min-height: 620px;
  padding: 16px;
  background:
    radial-gradient(ellipse at 18% 0%, rgba(255, 255, 255, 0.8), transparent 38%),
    linear-gradient(128deg, rgba(255, 250, 240, 0.95), rgba(229, 241, 235, 0.92) 58%, rgba(223, 235, 230, 0.94));
  overflow: hidden;
}

.maintenance-topbar {
  display: grid;
  grid-template-columns: minmax(210px, 0.72fr) minmax(260px, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.maintenance-title {
  min-width: 0;
}

.maintenance-title strong,
.maintenance-title span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.maintenance-title strong {
  color: #3f2916;
  font-size: 22px;
  font-weight: 950;
  letter-spacing: 0;
}

.maintenance-title span {
  margin-top: 4px;
  color: rgba(68, 44, 25, 0.64);
  font-size: 13px;
  font-weight: 850;
}

.global-search {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 48px;
  padding: 0 8px 0 13px;
  border: 1px solid rgba(134, 91, 48, 0.16);
  border-radius: 17px;
  color: #7a4a22;
  background: rgba(255, 255, 255, 0.58);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.global-search input {
  min-width: 0;
  border: 0;
  outline: 0;
  color: #3f2916;
  background: transparent;
  font-size: 15px;
  font-weight: 850;
}

.global-search :deep(.p-button),
.close-button,
.maintenance-footer :deep(.p-button) {
  min-height: 44px;
  border-radius: 14px;
  font-weight: 950;
}

.close-button {
  width: 46px;
  min-width: 46px;
  padding: 0;
}

.maintenance-error {
  margin: 0;
}

.maintenance-grid {
  display: grid;
  grid-template-columns: minmax(300px, 340px) minmax(0, 1fr);
  gap: 13px;
  min-height: 0;
  overflow: hidden;
}

.maintenance-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 2px;
}

@media (max-width: 980px) {
  .maintenance-shell {
    height: min(820px, 86vh);
    min-height: 0;
  }

  .maintenance-topbar {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .global-search {
    grid-column: 1 / -1;
    order: 3;
  }

  .maintenance-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(220px, 0.42fr) minmax(0, 1fr);
  }
}
</style>
