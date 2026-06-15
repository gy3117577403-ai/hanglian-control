<script setup lang="ts">
import { reactive, ref } from 'vue'
import { UploadCloud } from 'lucide-vue-next'
import { useUnifiedDocumentStore } from '@/stores/unified-document-store'
import type { DocumentStatus, DocumentTypeV03, RequiredProcess } from '@/types/production'

const visible = defineModel<boolean>('visible', { required: true })
const store = useUnifiedDocumentStore()
const submitting = ref(false)
const file = ref<File | null>(null)

const form = reactive({
  customerName: '',
  productCode: '',
  productName: '',
  productVersion: 'Rev.A',
  documentType: 'drawing_pdf' as DocumentTypeV03,
  title: '',
  version: 'Rev.A',
  status: 'effective' as DocumentStatus,
  requiredForProcess: 'common' as RequiredProcess,
  keywords: '',
  remark: '',
})

const documentTypes = [
  { label: 'PDF 图纸', value: 'drawing_pdf' },
  { label: 'SOP 扫描图片', value: 'sop_image' },
  { label: '连接器装配说明书', value: 'connector_manual' },
  { label: '插接孔位图', value: 'pinout_diagram' },
  { label: '成品细节图', value: 'finished_detail_image' },
  { label: '作业流程卡', value: 'process_card' },
]

const statuses = [
  { label: '有效', value: 'effective' },
  { label: '待确认', value: 'pending_review' },
  { label: '失效', value: 'expired' },
  { label: '缺失', value: 'missing' },
  { label: '不一致', value: 'inconsistent' },
]

const processes = [
  { label: '通用', value: 'common' },
  { label: '前段', value: 'front' },
  { label: '后段', value: 'back' },
]

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  file.value = input.files?.[0] ?? null
}

async function submit() {
  if (!file.value) return
  submitting.value = true
  try {
    await store.upload({ ...form, file: file.value })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <PrimeDialog v-model:visible="visible" modal header="上传资料" :style="{ width: '760px' }">
    <div class="upload-grid">
      <label>
        客户
        <PrimeInputText v-model="form.customerName" placeholder="例如：本地客户" />
      </label>
      <label>
        产品编号
        <PrimeInputText v-model="form.productCode" placeholder="例如：HL-001" />
      </label>
      <label>
        产品名称
        <PrimeInputText v-model="form.productName" placeholder="例如：线束总成资料包" />
      </label>
      <label>
        产品版本
        <PrimeInputText v-model="form.productVersion" />
      </label>
      <label>
        资料类型
        <select v-model="form.documentType">
          <option v-for="item in documentTypes" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </label>
      <label>
        资料标题
        <PrimeInputText v-model="form.title" placeholder="资料标题" />
      </label>
      <label>
        版本号
        <PrimeInputText v-model="form.version" />
      </label>
      <label>
        状态
        <select v-model="form.status">
          <option v-for="item in statuses" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </label>
      <label>
        适用范围
        <select v-model="form.requiredForProcess">
          <option v-for="item in processes" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </label>
      <label>
        关键词
        <PrimeInputText v-model="form.keywords" placeholder="多个关键词用逗号分隔" />
      </label>
      <label class="full">
        备注
        <PrimeTextarea v-model="form.remark" rows="3" auto-resize />
      </label>
      <label class="file-row full">
        文件选择
        <input accept="application/pdf,image/jpeg,image/png,image/webp" type="file" @change="onFileChange">
        <span>{{ file?.name || '支持 PDF / JPG / PNG / WEBP，单文件最大 30MB' }}</span>
      </label>
    </div>
    <template #footer>
      <PrimeButton label="取消" severity="secondary" text @click="visible = false" />
      <PrimeButton :disabled="!file || !form.productCode || !form.productName || !form.title" :loading="submitting" @click="submit">
        <UploadCloud :size="18" />
        <span>上传资料</span>
      </PrimeButton>
    </template>
  </PrimeDialog>
</template>

<style scoped>
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

.file-row span {
  color: #8a6239;
  font-size: 12px;
}
</style>
