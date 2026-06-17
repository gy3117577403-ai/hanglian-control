<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { AlertTriangle, CheckCircle2, FileText, Image, ShieldCheck, UploadCloud, X } from 'lucide-vue-next'
import { mockHubProducts } from '@/mock/order-hub-data'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { DrawingModuleKey } from '@/types/production'

const visible = defineModel<boolean>('visible', { required: true })
const store = useDocumentHubStore()
const submitting = ref(false)
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const previewUrl = ref('')
const testAcknowledged = ref(false)

const MAX_UPLOAD_BYTES = 30 * 1024 * 1024
const LARGE_FILE_WARNING_BYTES = 15 * 1024 * 1024
const TEST_UPLOAD_KEYWORD = 'HL_REAL_DATA_TEST'
const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

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
const selectedModuleItems = computed(() => {
  if (store.productDrawingDetail?.product.productId !== form.productId) return []
  return store.productDrawingDetail.modules.find((module) => module.moduleKey === form.moduleKey)?.items ?? []
})
const duplicateWarning = computed(() => {
  const title = form.title.trim().toLowerCase()
  const version = form.version.trim().toLowerCase()
  if (!title || !version) return ''
  const duplicated = selectedModuleItems.value.some((item) => (
    item.title.trim().toLowerCase() === title && item.version.trim().toLowerCase() === version
  ))
  return duplicated ? '当前模块已有相同标题和版本的资料，上传后会作为补充资料排在首页。' : ''
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
const fileValidation = computed(() => {
  if (!file.value) return { ok: false, message: '请选择 PDF / JPG / PNG / WEBP 文件后再上传。', level: 'empty' as const }
  if (!allowedMimeTypes.includes(file.value.type)) {
    return { ok: false, message: '文件类型不支持，只允许 PDF / JPG / PNG / WEBP。', level: 'error' as const }
  }
  if (file.value.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: '文件超过 30MB，请先压缩或拆分后再上传。', level: 'error' as const }
  }
  if (file.value.size > LARGE_FILE_WARNING_BYTES) {
    return { ok: true, message: '文件较大，安卓平板首次预览可能稍慢，建议现场测试时重点确认打开速度。', level: 'warning' as const }
  }
  return { ok: true, message: '文件检查通过，可上传到本地资料沙盒。', level: 'success' as const }
})
const fileTypeLabel = computed(() => {
  if (!file.value) return '未选择'
  if (file.value.type === 'application/pdf') return 'PDF 图纸'
  if (file.value.type.startsWith('image/')) return '图片资料'
  return '未知类型'
})
const canSubmit = computed(() => Boolean(
  form.productId
  && form.moduleKey
  && form.title.trim()
  && file.value
  && fileValidation.value.ok
  && testAcknowledged.value,
))

watch(visible, (next) => {
  if (!next) return
  form.customerId = store.productDrawingDetail?.customer?.customerId ?? store.selectedCustomer?.customerId ?? ''
  form.productId = store.productDrawingDetail?.product.productId ?? store.selectedProduct?.productId ?? ''
  form.moduleKey = store.selectedModule?.moduleKey ?? 'original_drawing'
  form.title = store.selectedModule ? `${store.selectedModule.moduleName}补充资料` : ''
  form.version = 'Rev.A'
  form.remark = ''
  form.keywords = ''
  testAcknowledged.value = false
  clearFile()
})

watch(() => form.productId, (productId) => {
  const product = mockHubProducts.find((item) => item.productId === productId)
  if (product && !form.customerId) form.customerId = product.customerId
})

watch(file, (next) => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
  if (next && allowedMimeTypes.includes(next.type)) previewUrl.value = URL.createObjectURL(next)
})

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

function formatFileSize(bytes?: number) {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  file.value = input.files?.[0] ?? null
  testAcknowledged.value = false
}

function clearFile() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
  file.value = null
  testAcknowledged.value = false
  if (fileInput.value) fileInput.value.value = ''
}

async function submit() {
  if (!canSubmit.value || !file.value) return
  if (!testAcknowledged.value) {
    return
  }
  submitting.value = true
  try {
    const keywords = form.keywords
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean)
    if (!keywords.includes(TEST_UPLOAD_KEYWORD)) keywords.push(TEST_UPLOAD_KEYWORD)
    const remark = [
      form.remark.trim(),
      `测试标记：${TEST_UPLOAD_KEYWORD}`,
      `测试时间：${new Date().toISOString()}`,
    ].filter(Boolean).join('\n')
    await store.uploadToModule({
      ...form,
      keywords: keywords.join(','),
      remark,
      file: file.value,
    })
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
        <span>资料会写入本地沙盒存储，可预览、可清理；支持 PDF / JPG / PNG / WEBP。</span>
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
        <input ref="fileInput" accept="application/pdf,image/jpeg,image/png,image/webp" type="file" @change="onFileChange">
      </label>
      <section class="file-check full" :class="fileValidation.level">
        <div class="file-preview">
          <img v-if="file?.type.startsWith('image/') && previewUrl" :src="previewUrl" alt="待上传图片预览">
          <iframe v-else-if="file?.type === 'application/pdf' && previewUrl" title="待上传 PDF 预览" :src="previewUrl" />
          <FileText v-else-if="file?.type === 'application/pdf'" :size="34" />
          <Image v-else :size="34" />
        </div>
        <div class="file-meta">
          <p>文件检查</p>
          <b>{{ file?.name || '尚未选择文件' }}</b>
          <span>{{ fileTypeLabel }} / {{ formatFileSize(file?.size) }}</span>
          <em>
            <CheckCircle2 v-if="fileValidation.level === 'success'" :size="15" />
            <AlertTriangle v-else :size="15" />
            {{ fileValidation.message }}
          </em>
          <em v-if="duplicateWarning" class="duplicate-warning">
            <AlertTriangle :size="15" />
            {{ duplicateWarning }}
          </em>
        </div>
        <PrimeButton v-if="file" severity="secondary" text rounded title="清除文件" @click="clearFile">
          <X :size="17" />
        </PrimeButton>
      </section>
      <section class="real-data-guard full" :class="{ ready: testAcknowledged }">
        <ShieldCheck :size="24" />
        <div>
          <b>真实资料本机测试护栏</b>
          <span>文件只写入本机沙盒目录，并自动加入 {{ TEST_UPLOAD_KEYWORD }} 测试标记；不要把上传文件、metadata、数据库连接串或客户资料提交到 Git。</span>
          <small>推荐顺序：real-data:preflight → 页面上传 → real-data:postcheck → real-data:cleanup:dry → real-data:cleanup</small>
        </div>
        <label class="guard-check">
          <input v-model="testAcknowledged" type="checkbox">
          <span>我确认这是本机测试上传，测试完成后会清理资料</span>
        </label>
      </section>
    </div>
    <template #footer>
      <PrimeButton label="取消" severity="secondary" text @click="visible = false" />
      <PrimeButton :disabled="!canSubmit" :loading="submitting" @click="submit">
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
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 14px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.58), rgba(255, 238, 205, 0.34)),
    rgba(255, 255, 255, 0.22);
  color: #70421d;
  box-shadow:
    0 14px 24px rgba(80, 42, 16, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(16px) saturate(1.12);
  -webkit-backdrop-filter: blur(16px) saturate(1.12);
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

.file-check {
  display: grid;
  grid-template-columns: 138px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 16px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.56), rgba(255, 240, 218, 0.18)),
    rgba(255, 255, 255, 0.18);
  box-shadow:
    0 16px 30px rgba(80, 42, 16, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.file-check.error {
  border-color: rgba(170, 67, 55, 0.38);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.54), rgba(255, 225, 218, 0.22)),
    rgba(255, 245, 239, 0.18);
}

.file-check.warning {
  border-color: rgba(201, 117, 36, 0.34);
}

.file-check.success {
  border-color: rgba(80, 145, 109, 0.34);
}

.real-data-guard {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 11px 12px;
  border: 1px solid rgba(201, 117, 36, 0.3);
  border-radius: 16px;
  background:
    radial-gradient(circle at 16% 0, rgba(255, 255, 255, 0.86), transparent 36%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.5), rgba(255, 236, 210, 0.18)),
    rgba(255, 255, 255, 0.18);
  color: #70421d;
  box-shadow:
    0 14px 28px rgba(80, 42, 16, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(16px) saturate(1.12);
  -webkit-backdrop-filter: blur(16px) saturate(1.12);
}

.real-data-guard.ready {
  border-color: rgba(80, 145, 109, 0.38);
}

.real-data-guard b,
.real-data-guard span,
.real-data-guard small {
  display: block;
}

.real-data-guard b {
  color: #3a2413;
  font-size: 14px;
  font-weight: 950;
}

.real-data-guard span {
  margin-top: 3px;
  color: #74512e;
  font-size: 12px;
  font-weight: 850;
  line-height: 1.45;
}

.real-data-guard small {
  margin-top: 5px;
  color: #936126;
  font-size: 11px;
  font-weight: 900;
  line-height: 1.4;
}

.guard-check {
  grid-column: 1 / -1;
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 34px;
  padding: 7px 9px;
  border: 1px solid rgba(255, 255, 255, 0.66);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.34);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.76);
}

.guard-check input {
  width: 18px;
  height: 18px;
  accent-color: #b66028;
}

.guard-check span {
  margin: 0;
  color: #4d2d16;
  font-size: 12px;
  font-weight: 950;
}

.file-preview {
  display: grid;
  place-items: center;
  overflow: hidden;
  width: 138px;
  aspect-ratio: 1.414 / 1;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 13px;
  background:
    linear-gradient(90deg, rgba(122, 76, 35, 0.045) 1px, transparent 1px) 0 0 / 18px 18px,
    linear-gradient(0deg, rgba(122, 76, 35, 0.04) 1px, transparent 1px) 0 0 / 18px 18px,
    rgba(255, 255, 255, 0.42);
  color: #b66028;
  box-shadow:
    0 12px 22px rgba(80, 42, 16, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.file-preview img,
.file-preview iframe {
  width: 100%;
  height: 100%;
  border: 0;
  object-fit: cover;
}

.file-meta {
  min-width: 0;
}

.file-meta p,
.file-meta b,
.file-meta span,
.file-meta em {
  display: block;
  margin: 0;
}

.file-meta p {
  color: #9b5125;
  font-size: 12px;
  font-weight: 950;
}

.file-meta b {
  overflow: hidden;
  margin-top: 3px;
  color: #332111;
  font-size: 15px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta span {
  margin-top: 3px;
  color: #76522c;
  font-size: 12px;
  font-weight: 850;
}

.file-meta em {
  display: flex;
  gap: 5px;
  align-items: center;
  margin-top: 6px;
  color: #6e8a42;
  font-size: 12px;
  font-style: normal;
  font-weight: 900;
  line-height: 1.35;
}

.file-check.error .file-meta em {
  color: #a23e31;
}

.file-check.warning .file-meta em,
.duplicate-warning {
  color: #a35a22;
}

.file-check :deep(.p-button) {
  width: 34px;
  height: 34px;
  min-height: 34px;
  padding: 0;
}
</style>
