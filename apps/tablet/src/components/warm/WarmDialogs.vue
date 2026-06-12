<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { documentSeverity, documentStatusLabel, sourceLabel } from '@/lib/status-style'
import { useProductionStore } from '@/stores/production-store'
import type { DocumentStatus, DocumentTypeV03, FeedbackType, RequiredProcess } from '@/types/production'

const props = defineProps<{
  feedbackOpen: boolean
  uploadOpen: boolean
  versionsOpen: boolean
  auditOpen: boolean
  migrationOpen: boolean
}>()

const emit = defineEmits<{
  'update:feedbackOpen': [value: boolean]
  'update:uploadOpen': [value: boolean]
  'update:versionsOpen': [value: boolean]
  'update:auditOpen': [value: boolean]
  'update:migrationOpen': [value: boolean]
}>()

const store = useProductionStore()
const toast = useToast()
const uploadInput = ref<HTMLInputElement | null>(null)
const activeDocument = computed(() => store.selectedDocument ?? store.previewDocument)

const feedbackVisible = computed({
  get: () => props.feedbackOpen,
  set: (value: boolean) => emit('update:feedbackOpen', value),
})
const uploadVisible = computed({
  get: () => props.uploadOpen,
  set: (value: boolean) => emit('update:uploadOpen', value),
})
const versionsVisible = computed({
  get: () => props.versionsOpen,
  set: (value: boolean) => emit('update:versionsOpen', value),
})
const auditVisible = computed({
  get: () => props.auditOpen,
  set: (value: boolean) => emit('update:auditOpen', value),
})
const migrationVisible = computed({
  get: () => props.migrationOpen,
  set: (value: boolean) => emit('update:migrationOpen', value),
})

const feedbackTypes: Array<{ label: FeedbackType; value: FeedbackType }> = [
  { label: '资料缺失', value: '资料缺失' },
  { label: '版本异常', value: '版本异常' },
  { label: '参数不一致', value: '参数不一致' },
  { label: '图纸不清晰', value: '图纸不清晰' },
  { label: 'SOP 与现场不符', value: 'SOP 与现场不符' },
  { label: '其他', value: '其他' },
]

const documentTypeOptions: Array<{ value: DocumentTypeV03; label: string }> = [
  { value: 'drawing_pdf', label: 'PDF 图纸' },
  { value: 'sop_image', label: 'SOP 扫描图片' },
  { value: 'connector_manual', label: '连接器装配说明书' },
  { value: 'pinout_diagram', label: '插接孔位图' },
  { value: 'finished_detail_image', label: '成品细节图' },
  { value: 'process_card', label: '作业流程卡' },
]

const statusOptions: Array<{ value: DocumentStatus; label: string }> = [
  { value: 'effective', label: '有效' },
  { value: 'pending_review', label: '待确认' },
  { value: 'expired', label: '失效' },
  { value: 'inconsistent', label: '不一致' },
]

const processOptions: Array<{ value: RequiredProcess; label: string }> = [
  { value: 'front', label: '前段必需' },
  { value: 'back', label: '后段必需' },
  { value: 'common', label: '通用资料' },
]

const feedbackForm = reactive({
  type: '资料缺失' as FeedbackType,
  description: '现场发现资料异常，等待工艺复核。',
})

const uploadForm = reactive({
  documentType: 'drawing_pdf' as DocumentTypeV03,
  requiredForProcess: 'common' as RequiredProcess,
  status: 'pending_review' as DocumentStatus,
  title: '',
  version: 'V1.0',
  keywords: '',
  remark: '',
})

const versionForm = reactive({
  status: 'effective' as DocumentStatus,
  reason: '组长复核后设为当前有效版本。',
})

function onFileChange() {
  const file = uploadInput.value?.files?.[0]
  if (file && !uploadForm.title) {
    uploadForm.title = file.name.replace(/\.[^.]+$/, '')
  }
}

async function submitFeedback() {
  await store.submitFeedback(feedbackForm.type, feedbackForm.description)
  toast.add({ severity: 'warn', summary: '异常反馈已提交', detail: feedbackForm.type, life: 2600 })
  feedbackVisible.value = false
}

async function submitUpload() {
  const file = uploadInput.value?.files?.[0]
  if (!file) {
    toast.add({ severity: 'warn', summary: '请选择资料文件', detail: '仅支持本地 Mock 文件上传。', life: 2600 })
    return
  }
  if (!uploadForm.title.trim()) {
    toast.add({ severity: 'warn', summary: '请填写资料标题', life: 2600 })
    return
  }

  const formData = new FormData()
  formData.set('file', file)
  formData.set('documentType', uploadForm.documentType)
  formData.set('requiredForProcess', uploadForm.requiredForProcess)
  formData.set('status', uploadForm.status)
  formData.set('title', uploadForm.title.trim())
  formData.set('version', uploadForm.version.trim() || 'V1.0')
  formData.set('keywords', uploadForm.keywords.trim())
  formData.set('remark', uploadForm.remark.trim())

  await store.uploadCurrentDocument(formData)
  if (!store.uploadLoading) uploadVisible.value = false
}

async function setEffective() {
  const document = store.selectedDocument ?? store.previewDocument
  if (!document) return
  await store.setCurrentDocumentEffective(document.documentId ?? document.id, { reason: versionForm.reason })
}

async function updateStatus() {
  const document = store.selectedDocument ?? store.previewDocument
  if (!document) return
  await store.updateCurrentDocumentStatus(document.documentId ?? document.id, {
    status: versionForm.status,
    reason: versionForm.reason,
  })
}

async function archiveDocument() {
  const document = store.selectedDocument ?? store.previewDocument
  if (!document) return
  await store.archiveCurrentDocument(document.documentId ?? document.id)
}
</script>

<template>
  <PrimeDialog v-model:visible="feedbackVisible" modal header="异常反馈" class="w-[620px]">
    <div class="grid gap-4">
      <div>
        <label class="text-sm font-black text-[#68411f]">异常类型</label>
        <PrimeSelect
          v-model="feedbackForm.type"
          class="mt-2 w-full"
          :options="feedbackTypes"
          option-label="label"
          option-value="value"
        />
      </div>
      <div>
        <label class="text-sm font-black text-[#68411f]">现场说明</label>
        <PrimeTextarea v-model="feedbackForm.description" class="mt-2 min-h-32 w-full" />
      </div>
      <PrimeMessage severity="warn" :closable="false">
        当前只写入后端内存 Mock 记录，不连接真实数据库。
      </PrimeMessage>
    </div>
    <template #footer>
      <PrimeButton severity="secondary" label="取消" @click="feedbackVisible = false" />
      <PrimeButton label="提交反馈" icon="pi pi-send" @click="submitFeedback" />
    </template>
  </PrimeDialog>

  <PrimeDialog v-model:visible="uploadVisible" modal header="上传本地资料" class="w-[760px]">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="text-sm font-black text-[#68411f]">资料文件</label>
        <input
          ref="uploadInput"
          class="mt-2 block w-full rounded-lg border border-[#8b5a2a42] bg-[#fff8ea] px-3 py-3 text-base font-bold text-[#342316] file:mr-4 file:rounded-md file:border-0 file:bg-[#c76f28] file:px-4 file:py-2 file:font-black file:text-white"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          @change="onFileChange"
        >
      </div>
      <div>
        <label class="text-sm font-black text-[#68411f]">资料类型</label>
        <PrimeSelect v-model="uploadForm.documentType" class="mt-2 w-full" :options="documentTypeOptions" option-label="label" option-value="value" />
      </div>
      <div>
        <label class="text-sm font-black text-[#68411f]">适用工序</label>
        <PrimeSelect v-model="uploadForm.requiredForProcess" class="mt-2 w-full" :options="processOptions" option-label="label" option-value="value" />
      </div>
      <div>
        <label class="text-sm font-black text-[#68411f]">资料标题</label>
        <PrimeInputText v-model="uploadForm.title" class="mt-2 w-full" placeholder="例如：后段孔位图-A版" />
      </div>
      <div>
        <label class="text-sm font-black text-[#68411f]">版本号</label>
        <PrimeInputText v-model="uploadForm.version" class="mt-2 w-full" placeholder="V1.0" />
      </div>
      <div>
        <label class="text-sm font-black text-[#68411f]">资料状态</label>
        <PrimeSelect v-model="uploadForm.status" class="mt-2 w-full" :options="statusOptions" option-label="label" option-value="value" />
      </div>
      <div>
        <label class="text-sm font-black text-[#68411f]">搜索关键词</label>
        <PrimeInputText v-model="uploadForm.keywords" class="mt-2 w-full" placeholder="孔位图,后段,连接器" />
      </div>
      <div class="col-span-2">
        <label class="text-sm font-black text-[#68411f]">备注</label>
        <PrimeTextarea v-model="uploadForm.remark" class="mt-2 min-h-24 w-full" />
      </div>
    </div>
    <template #footer>
      <PrimeButton severity="secondary" label="取消" @click="uploadVisible = false" />
      <PrimeButton :disabled="store.uploadLoading || !store.apiOnline" label="上传并绑定" icon="pi pi-upload" @click="submitUpload" />
    </template>
  </PrimeDialog>

  <PrimeDialog v-model:visible="versionsVisible" modal header="资料版本管理" class="w-[860px]">
    <div v-if="activeDocument" class="grid gap-4">
      <div class="section-bay">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="section-kicker">CURRENT DOCUMENT</p>
            <h3 class="text-2xl font-black text-[#342316]">
              {{ activeDocument.title }}
            </h3>
            <p class="mt-1 text-sm font-bold text-[#76512a]">
              {{ activeDocument.version }} · {{ sourceLabel(activeDocument.source) }}
            </p>
          </div>
          <PrimeTag
            :value="documentStatusLabel(activeDocument)"
            :severity="documentSeverity(activeDocument)"
          />
        </div>
      </div>

      <div class="grid grid-cols-[1fr_180px_180px] gap-3">
        <PrimeInputText v-model="versionForm.reason" placeholder="版本操作原因" />
        <PrimeSelect v-model="versionForm.status" :options="statusOptions" option-label="label" option-value="value" />
        <PrimeButton label="更新状态" icon="pi pi-sync" @click="updateStatus" />
      </div>

      <div v-auto-animate class="max-h-60 space-y-2 overflow-auto">
        <div
          v-for="item in store.documentVersions?.versions ?? []"
          :key="item.documentId ?? item.id"
          class="flex items-center justify-between rounded-lg border border-[#8b5a2a30] bg-white/60 px-4 py-3"
        >
          <div>
            <p class="font-black text-[#342316]">{{ item.title }}</p>
            <p class="text-sm font-bold text-[#76512a]">{{ item.version }} · {{ sourceLabel(item.source) }}</p>
          </div>
          <PrimeTag :value="documentStatusLabel(item)" :severity="documentSeverity(item)" />
        </div>
      </div>
    </div>
    <PrimeMessage v-else severity="info" :closable="false">请先选择一份资料。</PrimeMessage>
    <template #footer>
      <PrimeButton severity="secondary" label="关闭" @click="versionsVisible = false" />
      <PrimeButton severity="danger" label="归档" icon="pi pi-box" @click="archiveDocument" />
      <PrimeButton label="设为当前有效" icon="pi pi-check" @click="setEffective" />
    </template>
  </PrimeDialog>

  <PrimeDialog v-model:visible="auditVisible" modal header="查询留痕与审计记录" class="w-[820px]">
    <div v-auto-animate class="max-h-[520px] space-y-3 overflow-auto">
      <div
        v-for="log in store.auditLogs"
        :key="log.auditId"
        class="rounded-lg border border-[#8b5a2a30] bg-white/65 px-4 py-3"
      >
        <div class="flex items-center justify-between">
          <p class="font-black text-[#342316]">{{ log.message }}</p>
          <PrimeTag :value="log.action" severity="secondary" />
        </div>
        <p class="mt-1 text-sm font-bold text-[#76512a]">{{ log.createdAt }} · {{ log.operatorName }} · {{ log.operatorRole }}</p>
      </div>
      <PrimeMessage v-if="!store.auditLogs.length" severity="info" :closable="false">当前计划暂无审计记录。</PrimeMessage>
    </div>
  </PrimeDialog>

  <PrimeDialog v-model:visible="migrationVisible" modal header="Sealos 迁移预览" class="w-[860px]">
    <div class="grid gap-4">
      <PrimeMessage severity="warn" :closable="false">
        当前仅展示 dry-run / SQL 预览信息，不连接数据库，不执行迁移，不写库。
      </PrimeMessage>
      <div class="grid grid-cols-4 gap-3">
        <div v-for="(value, key) in store.migrationPreview?.summary ?? {}" :key="key" class="metric-tile-3d min-h-0">
          <p class="metric-label">{{ key }}</p>
          <p class="metric-value">{{ value }}</p>
        </div>
      </div>
      <div v-if="store.databaseSafety" class="section-bay">
        <p class="section-kicker">DATABASE SAFETY</p>
        <p class="mt-1 text-lg font-black text-[#342316]">{{ store.databaseSafety.message }}</p>
        <p class="mt-2 text-sm font-bold text-[#76512a]">
          DB_TARGET={{ store.databaseSafety.dbTarget }} / 写库允许={{ store.databaseSafety.canWriteDatabase ? '是' : '否' }}
        </p>
      </div>
    </div>
    <template #footer>
      <PrimeButton severity="secondary" label="关闭" @click="migrationVisible = false" />
      <PrimeButton label="导出 seed dry-run 预览" icon="pi pi-download" @click="store.exportSeedPreview" />
    </template>
  </PrimeDialog>
</template>
