<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { CheckCircle2, PackagePlus, X } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const visible = defineModel<boolean>('visible', { required: true })
const store = useDocumentHubStore()

const form = reactive({
  customerMode: 'existing' as 'existing' | 'new',
  customerId: '',
  customerName: '',
  customerShortName: '',
  productModel: '',
  productName: '',
  remark: '',
  confirmModelChanged: false,
})

const originalModel = computed(() => store.unarchivedProductContext?.order.productModel ?? '')
const modelChanged = computed(() => (
  form.productModel.trim().normalize('NFKC') !== originalModel.value.trim().normalize('NFKC')
))
const canSubmit = computed(() => {
  if (!form.productModel.trim()) return false
  if (modelChanged.value && !form.confirmModelChanged) return false
  if (form.customerMode === 'existing') return Boolean(form.customerId)
  return Boolean(form.customerName.trim())
})

watch(visible, (next) => {
  if (!next) return
  const context = store.unarchivedProductContext
  const resolution = context?.resolution
  const order = context?.order
  form.customerMode = resolution?.status === 'customer_not_found' ? 'new' : 'existing'
  form.customerId = resolution?.status === 'product_not_found' ? resolution.customer.customerId : ''
  form.customerName = order?.customerName ?? ''
  form.customerShortName = order?.customerName ?? ''
  form.productModel = order?.productModel ?? ''
  form.productName = order?.productModel ?? ''
  form.remark = ''
  form.confirmModelChanged = false
})

async function submit() {
  if (!canSubmit.value) return
  await store.createProductArchive({
    customerId: form.customerMode === 'existing' ? form.customerId : '',
    productModel: form.productModel,
    productName: form.productName || form.productModel,
    remark: form.remark,
    source: 'manual_create',
    createCustomer: form.customerMode === 'new',
    customer: form.customerMode === 'new'
      ? {
        customerName: form.customerName,
        customerShortName: form.customerShortName || form.customerName,
        aliases: [form.customerName, form.customerShortName].filter(Boolean),
        status: 'active',
      }
      : undefined,
  })
}
</script>

<template>
  <PrimeDialog
    v-model:visible="visible"
    modal
    header="创建产品资料页"
    class="create-archive-dialog"
    :style="{ width: 'min(760px, 92vw)' }"
  >
    <div class="archive-form">
      <section class="intro">
        <PackagePlus :size="28" />
        <p>
          创建后将生成原图、SOP、成品图、辅料规格、注意事项和配套工装六个资料模块。原图未上传前，产品状态为“未发图”。
        </p>
      </section>

      <div class="mode-row">
        <button type="button" :class="{ active: form.customerMode === 'existing' }" @click="form.customerMode = 'existing'">
          选择已有客户
        </button>
        <button type="button" :class="{ active: form.customerMode === 'new' }" @click="form.customerMode = 'new'">
          创建新客户
        </button>
      </div>

      <label v-if="form.customerMode === 'existing'">
        客户
        <PrimeSelect
          v-model="form.customerId"
          :options="store.customers"
          option-label="customerName"
          option-value="customerId"
          placeholder="请选择客户"
          filter
        />
      </label>

      <div v-else class="field-grid">
        <label>
          客户名称
          <PrimeInputText v-model="form.customerName" placeholder="订单客户名称" />
        </label>
        <label>
          客户简称
          <PrimeInputText v-model="form.customerShortName" placeholder="可留空，默认客户名称" />
        </label>
      </div>

      <div class="field-grid">
        <label>
          产品型号
          <PrimeInputText v-model="form.productModel" />
        </label>
        <label>
          产品名称
          <PrimeInputText v-model="form.productName" />
        </label>
      </div>

      <label>
        备注
        <PrimeTextarea v-model="form.remark" rows="3" auto-resize placeholder="可留空" />
      </label>

      <label v-if="modelChanged" class="confirm-row">
        <PrimeCheckbox v-model="form.confirmModelChanged" binary />
        <span>已确认使用修改后的产品型号建档。</span>
      </label>
    </div>

    <template #footer>
      <PrimeButton severity="secondary" text @click="visible = false">
        <X :size="17" />
        <span>取消</span>
      </PrimeButton>
      <PrimeButton :disabled="!canSubmit" @click="submit">
        <CheckCircle2 :size="17" />
        <span>创建资料页</span>
      </PrimeButton>
    </template>
  </PrimeDialog>
</template>

<style scoped>
.archive-form {
  display: grid;
  gap: 12px;
}

.intro {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  padding: 12px;
  border: 1px solid rgba(191, 105, 45, 0.22);
  border-radius: 16px;
  color: #7a4b24;
  background: rgba(255, 242, 225, 0.64);
}

.intro p {
  margin: 0;
  font-weight: 850;
  line-height: 1.55;
}

.mode-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.mode-row button {
  min-height: 42px;
  border: 1px solid rgba(128, 88, 47, 0.18);
  border-radius: 14px;
  color: #6c4423;
  background: rgba(255, 255, 255, 0.56);
  font-weight: 950;
  cursor: pointer;
}

.mode-row button.active {
  color: #fff;
  border-color: rgba(191, 105, 45, 0.42);
  background: linear-gradient(145deg, #c57435, #9c5729);
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

label {
  display: grid;
  gap: 5px;
  color: #5f351a;
  font-size: 12px;
  font-weight: 950;
}

.confirm-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #9b3d32;
}

:global(.create-archive-dialog .p-dialog-footer .p-button) {
  min-height: 44px;
  border-radius: 14px;
  font-weight: 950;
}

@media (max-width: 680px) {
  .field-grid,
  .mode-row {
    grid-template-columns: 1fr;
  }
}
</style>
