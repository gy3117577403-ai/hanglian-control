<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { UploadCloud } from 'lucide-vue-next'
import { mockHubProducts } from '@/mock/order-hub-data'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { DrawingModuleKey } from '@/types/production'

const visible = defineModel<boolean>('visible', { required: true })
const store = useDocumentHubStore()
const submitting = ref(false)
const file = ref<File | null>(null)

const form = reactive({
  customerId: '',
  productId: '',
  moduleKey: 'original_drawing' as DrawingModuleKey,
  title: '',
  version: 'Rev.A',
  remark: '',
  keywords: '',
})

const moduleOptions: Array<{ label: string; value: DrawingModuleKey }> = [
  { label: '原图', value: 'original_drawing' },
  { label: 'SOP 指导书', value: 'sop' },
  { label: '成品图', value: 'finished_images' },
  { label: '辅料规格', value: 'accessory_specs' },
  { label: '注意事项', value: 'notes' },
  { label: '配套工装', value: 'tooling' },
]

const isModuleUpload = computed(() => store.uploadDialogSource === 'module')
const selectedModuleName = computed(() => moduleOptions.find((item) => item.value === form.moduleKey)?.label ?? '资料模块')
const selectedProductModel = computed(() => {
  const product = mockHubProducts.find((item) => item.productId === form.productId) ?? store.productDrawingDetail?.product
  return product?.productModel ?? '待选择产品型号'
})
const dialogTitle = computed(() => {
  if (isModuleUpload.value) return `上传到：${selectedProductModel.value} / ${selectedModuleName.value}`
  return '上传资料'
})

const productOptions = computed(() => {
  const map = new Map(mockHubProducts.map((product) => [product.productId, product]))
  if (store.productDrawingDetail) map.set(store.productDrawingDetail.product.productId, store.productDrawingDetail.product)
  store.productModels.forEach((product) => map.set(product.productId, product))
  return [...map.values()].filter((product) => !form.customerId || product.customerId === form.customerId)
})

watch(visible, (next) => {
  if (!next) return
  form.customerId = store.productDrawingDetail?.customer?.customerId ?? store.selectedCustomer?.customerId ?? ''
  form.productId = store.productDrawingDetail?.product.productId ?? store.selectedProduct?.productId ?? ''
  form.moduleKey = store.selectedModule?.moduleKey ?? 'original_drawing'
  form.title = store.selectedModule ? `${store.selectedModule.moduleName}补充资料` : ''
  form.version = 'Rev.A'
  form.remark = ''
  form.keywords = ''
  file.value = null
})

watch(() => form.productId, (productId) => {
  const product = mockHubProducts.find((item) => item.productId === productId)
  if (product && !form.customerId) form.customerId = product.customerId
})

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  file.value = input.files?.[0] ?? null
}

async function submit() {
  if (!form.productId || !form.moduleKey || !form.title) return
  submitting.value = true
  try {
    await store.uploadToModule({ ...form, file: file.value })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <PrimeDialog v-model:visible="visible" modal :header="dialogTitle" :style="{ width: '760px' }">
    <div class="hint-card">
      <UploadCloud :size="26" />
      <div>
        <b>{{ isModuleUpload ? '模块内上传会自动绑定当前产品和资料模块' : '顶部上传可手动选择客户、产品型号和资料模块' }}</b>
        <span>当前阶段写入 Mock 状态；文件支持 PDF / JPG / PNG / WEBP，上传备注会保留。</span>
      </div>
    </div>
    <div class="upload-grid">
      <label>
        客户
        <select v-model="form.customerId" :disabled="isModuleUpload">
          <option value="">请选择客户</option>
          <option v-for="customer in store.customers" :key="customer.customerId" :value="customer.customerId">
            {{ customer.customerName }}
          </option>
        </select>
      </label>
      <label>
        产品型号
        <select v-model="form.productId" :disabled="isModuleUpload">
          <option value="">请选择产品型号</option>
          <option v-for="product in productOptions" :key="product.productId" :value="product.productId">
            {{ product.productModel }}
          </option>
        </select>
      </label>
      <label>
        模块类型
        <select v-model="form.moduleKey" :disabled="isModuleUpload">
          <option v-for="item in moduleOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </label>
      <label>
        资料标题
        <PrimeInputText v-model="form.title" placeholder="例如：成品图补充 01" />
      </label>
      <label>
        版本
        <PrimeInputText v-model="form.version" />
      </label>
      <label>
        关键词
        <PrimeInputText v-model="form.keywords" placeholder="可选，用逗号分隔" />
      </label>
      <label class="full">
        备注
        <PrimeTextarea v-model="form.remark" rows="3" auto-resize placeholder="可选，记录资料来源或现场说明" />
      </label>
      <label class="file-row full">
        文件
        <input accept="application/pdf,image/jpeg,image/png,image/webp" type="file" @change="onFileChange">
        <span>{{ file?.name || '可先不选文件，仅创建资料卡片；支持 PDF / JPG / PNG / WEBP。' }}</span>
      </label>
    </div>
    <template #footer>
      <PrimeButton label="取消" severity="secondary" text @click="visible = false" />
      <PrimeButton :disabled="!form.productId || !form.title" :loading="submitting" @click="submit">
        <UploadCloud :size="18" />
        <span>确认上传</span>
      </PrimeButton>
    </template>
  </PrimeDialog>
</template>

<style scoped>
.hint-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 238, 205, 0.78);
  color: #70421d;
}

.hint-card b,
.hint-card span {
  display: block;
}

.hint-card span {
  margin-top: 2px;
  color: #8b6338;
  font-size: 12px;
  font-weight: 850;
}

.upload-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

label {
  display: grid;
  gap: 6px;
  color: #5f351a;
  font-size: 13px;
  font-weight: 950;
}

.full {
  grid-column: 1 / -1;
}

select,
input[type='file'] {
  min-height: 42px;
  border: 1px solid rgba(139, 90, 42, 0.22);
  border-radius: 10px;
  background: rgba(255, 248, 235, 0.95);
  color: #432813;
  font-weight: 850;
}

select:disabled {
  color: #6b4a28;
  background: rgba(237, 221, 198, 0.75);
}

.file-row span {
  color: #8a6239;
  font-size: 12px;
}
</style>
