<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Link2, RefreshCw } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
const selectedCustomerId = ref('')
const selectedProductId = ref('')

const visible = computed({
  get: () => Boolean(store.pendingProductLinkOrder),
  set: (value: boolean) => {
    if (!value) store.closeOrderProductLinkDialog()
  },
})

const order = computed(() => store.pendingProductLinkOrder)
const selectedProducts = computed(() => (
  store.orderProductLinkCandidates.find((candidate) => candidate.customer.customerId === selectedCustomerId.value)?.products ?? []
))
const canSubmit = computed(() => Boolean(order.value && selectedCustomerId.value && selectedProductId.value))

watch(order, (value) => {
  selectedCustomerId.value = ''
  selectedProductId.value = ''
  if (value) void store.openOrderProductLinkDialog(value)
})

watch(selectedCustomerId, () => {
  selectedProductId.value = ''
})

async function submit() {
  if (!order.value || !canSubmit.value) return
  await store.linkOrderToProduct(order.value, selectedCustomerId.value, selectedProductId.value)
}
</script>

<template>
  <PrimeDialog v-model:visible="visible" modal header="确认订单产品资料页" :style="{ width: '760px' }">
    <section v-if="order" class="link-dialog">
      <div class="order-summary">
        <Link2 :size="22" />
        <div>
          <span>当前订单型号</span>
          <b>{{ order.productModel }}</b>
        </div>
      </div>

      <p v-if="store.orderProductLinkError" class="link-error">{{ store.orderProductLinkError }}</p>

      <div class="field-grid">
        <label>
          <span>客户</span>
          <select v-model="selectedCustomerId" @focus="store.loadOrderProductLinkCandidates(order)">
            <option value="">选择客户</option>
            <option v-for="candidate in store.orderProductLinkCandidates" :key="candidate.customer.customerId" :value="candidate.customer.customerId">
              {{ candidate.customer.customerName }}
            </option>
          </select>
        </label>

        <label>
          <span>匹配的正式产品</span>
          <select v-model="selectedProductId" :disabled="!selectedCustomerId">
            <option value="">选择产品资料页</option>
            <option v-for="product in selectedProducts" :key="product.productId" :value="product.productId">
              {{ product.productModel }}
            </option>
          </select>
        </label>
      </div>

      <div v-if="!store.orderProductLinkLoading && !store.orderProductLinkCandidates.length" class="empty-candidates">
        暂无匹配候选，请确认该型号是否已建档。
      </div>
    </section>

    <template #footer>
      <div class="dialog-footer">
        <PrimeButton severity="secondary" text label="取消" @click="store.closeOrderProductLinkDialog()" />
        <PrimeButton
          severity="secondary"
          outlined
          :loading="store.orderProductLinkLoading"
          @click="order && store.loadOrderProductLinkCandidates(order)"
        >
          <RefreshCw :size="16" />
          <span>刷新候选</span>
        </PrimeButton>
        <PrimeButton
          :disabled="!canSubmit"
          :loading="Boolean(order && store.orderActionLoadingId === order.orderId)"
          @click="submit"
        >
          <Link2 :size="16" />
          <span>确认绑定</span>
        </PrimeButton>
      </div>
    </template>
  </PrimeDialog>
</template>

<style scoped>
.link-dialog {
  display: grid;
  gap: 14px;
}

.order-summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.34);
  color: #8b4c22;
}

.order-summary span,
.order-summary b {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-summary span {
  color: #7d542b;
  font-size: 12px;
  font-weight: 850;
}

.order-summary b {
  color: #342112;
  font-size: 18px;
  font-weight: 950;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

label {
  display: grid;
  gap: 6px;
  color: #593819;
  font-size: 12px;
  font-weight: 950;
}

select {
  min-width: 0;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.52);
  color: #593819;
  font-weight: 900;
}

.link-error,
.empty-candidates {
  margin: 0;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(174, 71, 60, 0.1);
  color: #9b3d32;
  font-size: 13px;
  font-weight: 900;
}

.empty-candidates {
  background: rgba(221, 142, 50, 0.12);
  color: #8b4c22;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  width: 100%;
}

.dialog-footer :deep(.p-button) {
  min-height: 44px;
  border-radius: 14px;
  font-weight: 950;
}
</style>
