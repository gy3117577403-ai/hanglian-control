<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { UploadCloud } from 'lucide-vue-next'
import WarmCameraCaptureDialog from '@/components/upload/WarmCameraCaptureDialog.vue'
import WarmFileSelectionPanel from '@/components/upload/WarmFileSelectionPanel.vue'
import WarmUploadPreviewGrid from '@/components/upload/WarmUploadPreviewGrid.vue'
import WarmUploadProgress from '@/components/upload/WarmUploadProgress.vue'
import WarmUploadSourcePicker from '@/components/upload/WarmUploadSourcePicker.vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { DrawingModuleKey } from '@/types/production'

const visible = defineModel<boolean>('visible', { required: true })
const store = useDocumentHubStore()

const form = reactive({
  customerId: '',
  productId: '',
  moduleKey: 'original_drawing' as DrawingModuleKey,
})

const moduleOptions: Array<{ label: string; value: DrawingModuleKey }> = [
  { label: '原图', value: 'original_drawing' },
  { label: 'SOP 指导书', value: 'sop' },
  { label: '成品图', value: 'finished_images' },
  { label: '辅料规格', value: 'accessory_specs' },
  { label: '注意事项', value: 'notes' },
  { label: '配套工装', value: 'tooling' },
]

const isModuleUpload = computed(() => store.uploadContext.entry === 'module')
const selectedModuleName = computed(() => moduleOptions.find((item) => item.value === form.moduleKey)?.label ?? '资料模块')
const productOptions = computed(() => {
  const map = new Map(store.productModels.map((product) => [product.productId, product]))
  if (store.productDrawingDetail) map.set(store.productDrawingDetail.product.productId, store.productDrawingDetail.product)
  if (store.selectedProduct) map.set(store.selectedProduct.productId, store.selectedProduct)
  return [...map.values()].filter((product) => !form.customerId || product.customerId === form.customerId)
})
const selectedCustomer = computed(() => store.customers.find((customer) => customer.customerId === form.customerId))
const selectedProduct = computed(() => (
  store.productModels.find((product) => product.productId === form.productId)
  ?? store.productDrawingDetail?.product
  ?? store.selectedProduct
))
const dialogTitle = computed(() => (
  isModuleUpload.value
    ? `上传到：${selectedProduct.value?.productModel ?? '当前产品'} / ${selectedModuleName.value}`
    : '上传资料'
))
const canUpload = computed(() => (
  Boolean(form.customerId && form.productId && form.moduleKey)
  && store.uploadItems.length > 0
  && store.uploadItems.every((item) => item.status !== 'error' && item.title.trim())
  && !store.uploadLoading
))
const hasFailedItems = computed(() => store.uploadItems.some((item) => item.status === 'failed'))

watch(visible, (next) => {
  if (!next) {
    if (!store.uploadLoading) store.resetUploadState()
    return
  }
  form.customerId = store.uploadContext.customerId ?? store.productDrawingDetail?.customer?.customerId ?? store.selectedCustomer?.customerId ?? ''
  form.productId = store.uploadContext.productId ?? store.productDrawingDetail?.product.productId ?? store.selectedProduct?.productId ?? ''
  form.moduleKey = store.uploadContext.moduleKey ?? store.selectedModule?.moduleKey ?? 'original_drawing'
})

watch(() => form.customerId, (customerId) => {
  if (isModuleUpload.value) return
  if (!customerId) {
    form.productId = ''
    return
  }
  if (form.productId && !productOptions.value.some((product) => product.productId === form.productId)) {
    form.productId = ''
  }
})

function backToSource() {
  if (store.uploadLoading) return
  store.uploadSource = null
}

async function submitUpload() {
  await store.uploadAllItems({
    customerId: form.customerId,
    productId: form.productId,
    moduleKey: form.moduleKey,
  })
}

async function retryFailed() {
  await store.retryFailedItems({
    customerId: form.customerId,
    productId: form.productId,
    moduleKey: form.moduleKey,
  })
}

function finish() {
  if (store.uploadLoading) return
  visible.value = false
  store.resetUploadState()
}
</script>

<template>
  <PrimeDialog
    v-model:visible="visible"
    modal
    :header="dialogTitle"
    :closable="!store.uploadLoading"
    class="warm-upload-dialog"
    :style="{ width: 'min(940px, 92vw)' }"
  >
    <div class="upload-dialog-body">
      <section class="upload-context">
        <label>
          客户
          <PrimeSelect
            v-model="form.customerId"
            :disabled="isModuleUpload || store.uploadLoading"
            :options="store.customers"
            option-label="customerName"
            option-value="customerId"
            placeholder="请选择客户"
            filter
          />
        </label>
        <label>
          产品型号
          <PrimeSelect
            v-model="form.productId"
            :disabled="isModuleUpload || store.uploadLoading"
            :options="productOptions"
            option-label="productModel"
            option-value="productId"
            placeholder="请选择产品"
            filter
          />
        </label>
        <label>
          当前模块
          <PrimeSelect
            v-model="form.moduleKey"
            :disabled="isModuleUpload || store.uploadLoading"
            :options="moduleOptions"
            option-label="label"
            option-value="value"
          />
        </label>
      </section>

      <section class="context-summary">
        <strong>{{ selectedCustomer?.customerName || '未选择客户' }}</strong>
        <span>{{ selectedProduct?.productModel || '未选择产品型号' }} / {{ selectedModuleName }}</span>
      </section>

      <WarmUploadSourcePicker v-if="!store.uploadSource" />
      <WarmFileSelectionPanel v-else-if="store.uploadSource === 'file'" />
      <WarmCameraCaptureDialog v-else />
      <WarmUploadPreviewGrid />
      <WarmUploadProgress />
    </div>

    <template #footer>
      <PrimeButton v-if="store.uploadSource && !store.uploadLoading" severity="secondary" text label="返回" @click="backToSource" />
      <PrimeButton severity="secondary" text :label="store.uploadLoading ? '上传中' : '取消'" :disabled="store.uploadLoading" @click="finish" />
      <PrimeButton v-if="hasFailedItems && !store.uploadLoading" severity="secondary" outlined label="重试失败项" @click="retryFailed" />
      <PrimeButton :disabled="!canUpload" :loading="store.uploadLoading" @click="submitUpload">
        <UploadCloud :size="18" />
        <span>上传资料</span>
      </PrimeButton>
    </template>
  </PrimeDialog>
</template>

<style scoped>
.upload-dialog-body {
  display: grid;
  gap: 12px;
  max-height: calc(90vh - 160px);
  overflow: auto;
  padding-right: 4px;
}

.upload-context {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

label {
  display: grid;
  gap: 5px;
  color: #5f351a;
  font-size: 12px;
  font-weight: 950;
}

.context-summary {
  display: grid;
  gap: 3px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 16px;
  background:
    linear-gradient(132deg, rgba(255, 255, 255, 0.68), rgba(255, 238, 214, 0.18)),
    rgba(255, 255, 255, 0.22);
  box-shadow:
    0 14px 26px rgba(80, 42, 16, 0.09),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.context-summary strong {
  color: #3d2815;
  font-size: 14px;
  font-weight: 950;
}

.context-summary span {
  color: #76512a;
  font-size: 12px;
  font-weight: 850;
}

:global(.warm-upload-dialog .p-dialog-footer) {
  position: sticky;
  bottom: 0;
  z-index: 2;
  border-top: 1px solid rgba(255, 255, 255, 0.54);
  background: rgba(255, 250, 240, 0.9);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

:global(.warm-upload-dialog .p-dialog-footer .p-button) {
  min-height: 48px;
}

@media (max-width: 760px) {
  .upload-context {
    grid-template-columns: 1fr;
  }
}
</style>
