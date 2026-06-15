<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { FileUploadSelectEvent } from 'primevue/fileupload'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import WarmPermissionDenied from '@/components/auth/WarmPermissionDenied.vue'
import WarmEmptyState from '@/components/common/WarmEmptyState.vue'
import WarmErrorState from '@/components/common/WarmErrorState.vue'
import { PERMISSIONS } from '@/lib/permissions'
import {
  auditActionLabel,
  compareFieldLabel,
  dateTimeLabel,
  documentTypeLabel,
  fileSizeLabel,
  processLabel,
  sourceLabel,
} from '@/lib/format'
import { errorMessages, friendlyErrorMessage } from '@/lib/error-message'
import { documentSeverity, documentStatusLabel, rawDocumentStatus } from '@/lib/status-style'
import { useAuthStore } from '@/stores/auth-store'
import { useProductionStore } from '@/stores/production-store'
import type { DocumentStatus, DocumentTypeV03, FeedbackType, ProductDocument, RequiredProcess } from '@/types/production'

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
const auth = useAuthStore()
const toast = useToast()
const confirm = useConfirm()
const selectedUploadFile = ref<File | null>(null)
const uploadError = ref('')
const skipEffectiveWarning = ref(false)
const compareSelection = ref<string[]>([])
const versionMenu = ref<{ toggle: (event: Event) => void } | null>(null)
const versionMenuDocument = ref<ProductDocument | null>(null)

const activeDocument = computed(() => store.selectedDocument ?? store.previewDocument)
const allowedUploadMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const allowedUploadExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp']
const demoUploadFiles = [
  'demo-drawing-rev-a.pdf',
  'demo-drawing-rev-b.pdf',
  'demo-sop-step-01.png',
  'demo-pinout-16p.png',
  'demo-finished-detail.png',
]

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
const compareVisible = computed({
  get: () => store.compareDialogOpen,
  set: (value: boolean) => {
    store.compareDialogOpen = value
  },
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
  version: 'Rev.A',
  keywords: '',
  remark: '',
})

const versionForm = reactive({
  status: 'effective' as DocumentStatus,
  reason: '组长复核后设为当前有效版本。',
})

const versionRows = computed(() => {
  const rows = store.documentVersions?.versions ?? []
  if (rows.length) return rows
  return activeDocument.value ? [activeDocument.value] : []
})

const currentVersions = computed(() => versionRows.value.filter((document) => rawDocumentStatus(document) === 'effective'))
const pendingVersions = computed(() => versionRows.value.filter((document) => rawDocumentStatus(document) === 'pending_review'))
const historyVersions = computed(() => versionRows.value.filter((document) => !['effective', 'pending_review'].includes(String(rawDocumentStatus(document)))))
const canFeedback = computed(() => auth.hasPermission(PERMISSIONS.PLAN_FEEDBACK))
const canUpload = computed(() => auth.hasPermission(PERMISSIONS.DOCUMENT_UPLOAD))
const canUpdateDocument = computed(() => auth.hasPermission(PERMISSIONS.DOCUMENT_UPDATE))
const canSetEffective = computed(() => auth.hasPermission(PERMISSIONS.DOCUMENT_SET_EFFECTIVE))
const canArchive = computed(() => auth.hasPermission(PERMISSIONS.DOCUMENT_ARCHIVE))

const versionGroupSummary = computed(() => {
  const document = activeDocument.value
  if (!document) return '未选择资料'
  return `${document.productId ?? store.selectedPlan.productId ?? store.selectedPlan.productCode} / ${documentTypeLabel(document)} / ${processLabel(document.requiredForProcess)}`
})

const migrationSafetyRows = computed(() => {
  const safety = store.databaseSafety
  if (!safety) return []
  return [
    { label: '阶段', value: safety.stage },
    { label: '数据源', value: safety.dataSource === 'prisma' ? 'Prisma 只读准备' : 'Mock 演示数据' },
    { label: '测试库目标', value: safety.dbTarget },
    { label: '连接串', value: safety.databaseUrlMasked },
    { label: '只读连接', value: safety.canReadDatabase ? '允许' : '未启用' },
    { label: '写库', value: safety.canWriteDatabase ? '允许' : '禁止' },
    { label: '危险操作', value: safety.destructiveActionsAllowed ? '开启' : '关闭' },
    { label: '.env.local', value: safety.envLocalExists ? '已准备' : '未检测到' },
  ]
})

const migrationNextSteps = computed(() => store.databaseSafety?.nextSteps ?? [])

const versionMenuItems = computed(() => [
  { label: '设为当前有效', icon: 'pi pi-check-circle', disabled: !canSetEffective.value, command: () => confirmSetEffective(versionMenuDocument.value) },
  { label: '加入对比', icon: 'pi pi-clone', command: () => toggleCompare(versionMenuDocument.value) },
  { label: '标记为待确认', icon: 'pi pi-exclamation-circle', disabled: !canUpdateDocument.value, command: () => updateVersionStatus(versionMenuDocument.value, 'pending_review') },
  { label: '标记为已失效', icon: 'pi pi-ban', class: 'danger-menu-item', disabled: !canUpdateDocument.value, command: () => updateVersionStatus(versionMenuDocument.value, 'expired') },
  { label: '归档', icon: 'pi pi-box', class: 'danger-menu-item', disabled: !canArchive.value, command: () => confirmArchive(versionMenuDocument.value) },
])

function deny() {
  toast.add({ severity: 'error', summary: '当前角色无权执行该操作。', detail: '请在右上角切换到具备权限的 Mock 角色。', life: 2600 })
}

function onFileSelect(event: FileUploadSelectEvent) {
  const files = Array.isArray(event.files) ? event.files as File[] : [event.files as File]
  selectedUploadFile.value = files[0] ?? null
  if (selectedUploadFile.value && !uploadForm.title) {
    uploadForm.title = selectedUploadFile.value.name.replace(/\.[^.]+$/, '')
  }
  uploadError.value = ''
}

function clearUploadFile() {
  selectedUploadFile.value = null
}

async function submitFeedback() {
  if (!canFeedback.value) return deny()
  await store.submitFeedback(feedbackForm.type, feedbackForm.description)
  toast.add({ severity: 'warn', summary: '异常反馈已提交', detail: feedbackForm.type, life: 2600 })
  feedbackVisible.value = false
}

function fileExtension(file: File) {
  const index = file.name.lastIndexOf('.')
  return index >= 0 ? file.name.slice(index).toLowerCase() : ''
}

function duplicateUploadWarning() {
  const productId = store.selectedPlan.productId ?? store.selectedPlan.productCode
  const duplicate = store.documents.find((document) => {
    return (document.productId ?? productId) === productId
      && document.documentType === uploadForm.documentType
      && document.requiredForProcess === uploadForm.requiredForProcess
      && document.version === uploadForm.version.trim()
  })
  return duplicate ? '当前产品已存在同类型同版本资料，建议改为新版本或进入版本历史查看。' : ''
}

function effectiveConflictWarning() {
  if (uploadForm.status !== 'effective') return ''
  const productId = store.selectedPlan.productId ?? store.selectedPlan.productCode
  const conflict = store.documents.find((document) => {
    return (document.productId ?? productId) === productId
      && document.documentType === uploadForm.documentType
      && document.requiredForProcess === uploadForm.requiredForProcess
      && rawDocumentStatus(document) === 'effective'
  })
  return conflict ? '设为当前有效后，同组其他有效版本将自动转为已失效。' : ''
}

function versionFormatWarning() {
  const version = uploadForm.version.trim()
  return version && !/^Rev\.[A-Z0-9]+(?:[-_.][A-Z0-9]+)?$/i.test(version)
    ? '版本号建议使用 Rev.A / Rev.B / Rev.C 格式；当前格式可继续上传，但建议复核。'
    : ''
}

function validateUpload() {
  if (!selectedUploadFile.value) return '请选择资料文件。'
  if (!store.selectedPlan?.id || !(store.selectedPlan.productId ?? store.selectedPlan.productCode)) return errorMessages.selectPlanFirst
  if (!allowedUploadMimeTypes.includes(selectedUploadFile.value.type) || !allowedUploadExtensions.includes(fileExtension(selectedUploadFile.value))) {
    return '文件格式不支持，请上传 PDF、JPG、PNG 或 WEBP。'
  }
  if (!selectedUploadFile.value) return '请选择资料文件。'
  if (!uploadForm.documentType) return '请选择资料类型。'
  if (!uploadForm.title.trim()) return '请填写资料标题。'
  if (!uploadForm.version.trim()) return '请填写版本号。'
  if (selectedUploadFile.value.size > 30 * 1024 * 1024) return '单文件最大 30MB。'
  return ''
}

async function submitUpload() {
  if (!canUpload.value) return deny()
  uploadError.value = validateUpload()
  if (uploadError.value) return
  if (!selectedUploadFile.value) return
  const effectiveWarning = effectiveConflictWarning()
  if (effectiveWarning && !skipEffectiveWarning.value) {
    confirm.require({
      header: '确认设置当前有效版本',
      message: effectiveWarning,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: '继续上传',
      rejectLabel: '取消',
      acceptClass: 'p-button-danger',
      accept: () => {
        skipEffectiveWarning.value = true
        void submitUpload().finally(() => {
          skipEffectiveWarning.value = false
        })
      },
    })
    return
  }

  const formData = new FormData()
  formData.set('file', selectedUploadFile.value)
  formData.set('documentType', uploadForm.documentType)
  formData.set('requiredForProcess', uploadForm.requiredForProcess)
  formData.set('status', uploadForm.status)
  formData.set('title', uploadForm.title.trim())
  formData.set('version', uploadForm.version.trim())
  formData.set('keywords', uploadForm.keywords.trim())
  formData.set('remark', uploadForm.remark.trim())

  try {
    await store.uploadCurrentDocument(formData)
    toast.add({ severity: 'success', summary: '资料上传成功', detail: '已加入当前产品资料包。', life: 3000 })
    uploadVisible.value = false
    selectedUploadFile.value = null
    uploadError.value = ''
  } catch (error) {
    uploadError.value = friendlyErrorMessage(error, '资料上传失败，请检查文件格式或网络。')
    return
  }
}

function openVersionMenu(event: Event, document: ProductDocument) {
  versionMenuDocument.value = document
  versionMenu.value?.toggle(event)
}

function toggleCompare(document?: ProductDocument | null) {
  if (!document) return
  const id = document.documentId ?? document.id
  if (compareSelection.value.includes(id)) {
    compareSelection.value = compareSelection.value.filter((item) => item !== id)
    return
  }
  compareSelection.value = [...compareSelection.value, id].slice(-2)
}

async function runCompare() {
  if (compareSelection.value.length !== 2) {
    toast.add({ severity: 'warn', summary: '请选择两个版本', detail: '版本对比需要两个资料版本。', life: 2600 })
    return
  }
  await store.compareDocumentVersions(compareSelection.value)
}

function confirmSetEffective(document?: ProductDocument | null) {
  if (!document) return
  if (!canSetEffective.value) return deny()
  confirm.require({
    header: '设为当前有效版本',
    message: `确认将 ${document.title} ${document.version} 设为当前有效版本？`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: '确认设为有效',
    rejectLabel: '取消',
    acceptClass: 'p-button-danger',
    accept: () => {
      void store.setCurrentDocumentEffective(document.documentId ?? document.id, { reason: versionForm.reason }).then(() => {
        toast.add({ severity: 'success', summary: '已设为当前有效', detail: document.title, life: 2600 })
      })
    },
  })
}

function confirmArchive(document?: ProductDocument | null) {
  if (!document) return
  if (!canArchive.value) return deny()
  confirm.require({
    header: '归档资料',
    message: `确认归档 ${document.title} ${document.version}？`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: '确认归档',
    rejectLabel: '取消',
    acceptClass: 'p-button-danger',
    accept: () => {
      void store.archiveCurrentDocument(document.documentId ?? document.id).then(() => {
        toast.add({ severity: 'warn', summary: '资料已归档', detail: document.title, life: 2600 })
      })
    },
  })
}

async function updateVersionStatus(document: ProductDocument | null | undefined, status: DocumentStatus) {
  if (!document) return
  if (!canUpdateDocument.value) return deny()
  await store.updateCurrentDocumentStatus(document.documentId ?? document.id, {
    status,
    reason: versionForm.reason,
  })
  toast.add({ severity: status === 'expired' ? 'error' : 'warn', summary: '资料状态已更新', detail: document.title, life: 2600 })
}
</script>

<template>
  <PrimeDialog v-model:visible="feedbackVisible" modal header="异常反馈" class="w-[620px]">
    <WarmPermissionDenied
      v-if="!canFeedback"
      title="当前角色不能提交异常反馈"
      description="请切换到前段组长、后段组长或管理员角色后再提交反馈。"
    />
    <div class="grid gap-4">
      <div>
        <label class="text-sm font-black text-[#68411f]">异常类型</label>
        <PrimeSelect v-model="feedbackForm.type" class="mt-2 w-full" :options="feedbackTypes" option-label="label" option-value="value" />
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
      <PrimeButton label="提交反馈" icon="pi pi-send" :disabled="!canFeedback" @click="submitFeedback" />
    </template>
  </PrimeDialog>

  <PrimeDialog v-model:visible="uploadVisible" modal header="上传产品资料" class="w-[860px]">
    <WarmPermissionDenied
      v-if="!canUpload"
      title="当前角色不能上传资料"
      description="请切换到资料维护、工艺或管理员角色后再上传资料。"
    />
    <div class="grid max-h-[70vh] gap-4 overflow-auto pr-1">
      <div class="upload-binding-grid">
        <div class="warm-chip"><span>客户</span><strong>{{ store.selectedPlan.customer }}</strong></div>
        <div class="warm-chip"><span>产品编号</span><strong>{{ store.selectedPlan.productCode }}</strong></div>
        <div class="warm-chip"><span>产品名称</span><strong>{{ store.selectedPlan.productName }}</strong></div>
        <div class="warm-chip"><span>当前计划</span><strong>{{ store.selectedPlan.weekPlanNo }}</strong></div>
      </div>

      <div class="upload-drop-frame p-3">
        <PrimeFileUpload
          mode="advanced"
          name="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          :multiple="false"
          :custom-upload="true"
          :show-upload-button="false"
          :show-cancel-button="false"
          :max-file-size="30 * 1024 * 1024"
          choose-label="选择资料文件"
          invalid-file-size-message="{0} 超过 30MB 限制。"
          invalid-file-type-message="{0} 文件格式不支持。"
          @select="onFileSelect"
          @clear="clearUploadFile"
        >
          <template #empty>
            <div class="grid min-h-24 place-items-center text-center">
              <div>
                <p class="text-lg font-black text-[#3b2514]">拖入或选择 PDF / JPG / PNG / WEBP</p>
                <p class="mt-1 text-sm font-bold text-[#76512a]">单文件最大 30MB，仅用于本地原型资料包。</p>
              </div>
            </div>
          </template>
        </PrimeFileUpload>
      </div>

      <section class="demo-file-list">
        <strong>现场演示建议文件</strong>
        <div class="demo-file-grid">
          <span v-for="file in demoUploadFiles" :key="file">{{ file }}</span>
        </div>
        <p>请从项目根目录 `demo-upload-assets` 选择以上合成资料，不要选择真实客户图纸、SOP 或量产资料。</p>
      </section>

      <div class="grid grid-cols-2 gap-4">
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
          <PrimeInputText v-model="uploadForm.version" class="mt-2 w-full" placeholder="Rev.A" />
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
          <PrimeTextarea v-model="uploadForm.remark" class="mt-2 min-h-20 w-full" />
        </div>
      </div>

      <PrimeMessage v-if="versionFormatWarning()" severity="warn" :closable="false">{{ versionFormatWarning() }}</PrimeMessage>
      <PrimeMessage v-if="duplicateUploadWarning()" severity="warn" :closable="false">{{ duplicateUploadWarning() }}</PrimeMessage>
      <PrimeMessage v-if="effectiveConflictWarning()" severity="warn" :closable="false">{{ effectiveConflictWarning() }}</PrimeMessage>
      <PrimeMessage v-if="uploadError" severity="error" :closable="false">{{ uploadError }}</PrimeMessage>
      <PrimeProgressBar v-if="store.uploadLoading" mode="indeterminate" />
    </div>

    <template #footer>
      <PrimeButton severity="secondary" label="取消" @click="uploadVisible = false" />
      <PrimeButton :disabled="store.uploadLoading || !store.apiOnline || !canUpload" label="上传并绑定" icon="pi pi-upload" @click="submitUpload" />
    </template>
  </PrimeDialog>

  <PrimeDialog v-model:visible="versionsVisible" modal header="资料版本档案" class="w-[940px]">
    <div class="grid max-h-[72vh] gap-4 overflow-auto pr-1">
      <div class="section-bay">
        <p class="section-kicker">VERSION GROUP</p>
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-2xl font-black text-[#342316]">{{ versionGroupSummary }}</h3>
          <PrimeButton label="对比所选版本" icon="pi pi-clone" @click="runCompare" />
        </div>
      </div>

      <section v-for="group in [
        { title: '当前有效版本', rows: currentVersions, severity: 'success' },
        { title: '待确认版本', rows: pendingVersions, severity: 'warn' },
        { title: '历史/失效版本', rows: historyVersions, severity: 'danger' },
      ]" :key="group.title" class="version-archive-section">
        <div class="mb-3 flex items-center justify-between">
          <h4 class="text-lg font-black text-[#342316]">{{ group.title }}</h4>
          <PrimeTag :value="`${group.rows.length} 份`" :severity="group.severity" />
        </div>
        <div v-auto-animate class="space-y-2">
          <div
            v-for="document in group.rows"
            :key="document.documentId ?? document.id"
            :class="[
              'grid grid-cols-[34px_1fr_110px_118px_118px_92px_54px] items-center gap-3 rounded-lg border bg-white/60 px-3 py-2',
              rawDocumentStatus(document) === 'expired' ? 'border-[#b8422a66]' : 'border-[#8b5a2a30]',
            ]"
          >
            <input
              type="checkbox"
              :checked="compareSelection.includes(document.documentId ?? document.id)"
              @change="toggleCompare(document)"
            >
            <div class="min-w-0">
              <p class="truncate font-black text-[#342316]">{{ document.title }}</p>
              <p class="truncate text-sm font-bold text-[#76512a]">{{ document.version }} · {{ sourceLabel(document.source) }}</p>
            </div>
            <PrimeTag :value="documentStatusLabel(document)" :severity="documentSeverity(document)" />
            <span class="text-sm font-bold text-[#76512a]">{{ fileSizeLabel(document.fileSize) }}</span>
            <span class="text-sm font-bold text-[#76512a]">{{ dateTimeLabel(document.updatedAt ?? document.createdAt) }}</span>
            <span class="text-sm font-bold text-[#76512a]">{{ processLabel(document.requiredForProcess) }}</span>
            <PrimeButton severity="secondary" aria-label="版本操作" @click="openVersionMenu($event, document)" icon="pi pi-ellipsis-h" />
          </div>
          <WarmEmptyState
            v-if="!group.rows.length"
            :title="`暂无${group.title}`"
            description="当前资料组还没有对应版本，可上传演示资料后再查看。"
          />
        </div>
      </section>
    </div>
    <PrimeMenu ref="versionMenu" :model="versionMenuItems" popup />
  </PrimeDialog>

  <PrimeDialog v-model:visible="compareVisible" modal header="版本元数据对比" class="w-[920px]">
    <WarmErrorState
      v-if="!store.versionCompareResult || store.versionCompareResult.documents.length < 2"
      title="无法生成版本对比"
      description="请选择两个版本进行对比。当前只做元数据对比，不做 PDF 内容差异。"
    />
    <div v-else class="grid gap-4">
      <div class="grid grid-cols-2 gap-4">
        <div v-for="document in store.versionCompareResult.documents.slice(0, 2)" :key="document.documentId ?? document.id" class="section-bay">
          <p class="section-kicker">{{ document.version }}</p>
          <h3 class="truncate text-xl font-black text-[#342316]">{{ document.title }}</h3>
          <p class="mt-1 text-sm font-bold text-[#76512a]">{{ documentTypeLabel(document) }} · {{ sourceLabel(document.source) }}</p>
        </div>
      </div>
      <div class="space-y-2">
        <div
          v-for="field in store.versionCompareResult.fields"
          :key="field.field"
          :class="['grid grid-cols-[150px_1fr_1fr] gap-3 rounded-lg border px-3 py-2', field.different ? 'border-[#c45f2480] bg-[#fff3dc]' : 'border-[#8b5a2a24] bg-white/45 opacity-75']"
        >
          <strong class="text-[#68411f]">{{ compareFieldLabel(field.label || field.field) }}</strong>
          <span class="font-bold text-[#3b2514]">{{ field.values[0] ?? '-' }}</span>
          <span class="font-bold text-[#3b2514]">{{ field.values[1] ?? '-' }}</span>
        </div>
      </div>
    </div>
  </PrimeDialog>

  <PrimeDialog v-model:visible="auditVisible" modal header="审计时间轴" class="w-[860px]">
    <PrimeTimeline :value="store.auditLogs" align="left" class="max-h-[66vh] overflow-auto pr-2">
      <template #marker>
        <span class="grid h-4 w-4 place-items-center rounded-full bg-[#c45f24] shadow-[0_0_0_5px_rgba(196,95,36,0.14)]" />
      </template>
      <template #content="{ item }">
        <article class="audit-timeline-item">
          <div class="flex items-center justify-between gap-3">
            <h4 class="text-lg font-black text-[#342316]">{{ auditActionLabel(item.action) }}</h4>
            <PrimeTag :value="dateTimeLabel(item.createdAt)" severity="secondary" />
          </div>
          <p class="mt-1 text-sm font-bold text-[#76512a]">{{ item.operatorName }} / {{ item.operatorRole }}</p>
          <p class="mt-2 text-base font-bold text-[#3b2514]">{{ item.message }}</p>
          <details v-if="item.before || item.after" class="mt-2 text-sm font-bold text-[#76512a]">
            <summary>查看详情</summary>
            <pre class="mt-2 max-h-32 overflow-auto rounded-md bg-[#fff8ea] p-2 text-xs">{{ { before: item.before, after: item.after } }}</pre>
          </details>
        </article>
      </template>
      <template #empty>
        <WarmEmptyState
          title="暂无审计记录"
          description="当前计划还没有上传、版本调整或反馈动作。执行演示操作后会出现模拟留痕。"
        />
      </template>
    </PrimeTimeline>
  </PrimeDialog>

  <PrimeDialog v-model:visible="migrationVisible" modal header="V3.0A Sealos 只读验证准备" class="w-[860px]">
    <div class="grid gap-4">
      <PrimeMessage severity="warn" :closable="false">
        当前仍为 Mock / 本地 metadata 演示数据。V3.0A 只允许测试库只读连通验证、迁移 SQL 预览和 seed dry-run，禁止写库和危险数据库操作。
      </PrimeMessage>
      <div v-if="store.databaseSafety" class="section-bay">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="section-kicker">DATABASE SAFETY</p>
            <p class="mt-1 text-lg font-black text-[#342316]">{{ store.databaseSafety.message }}</p>
          </div>
          <PrimeTag
            :value="store.databaseSafety.canReadDatabase ? '测试库只读可验证' : '安全待配置'"
            :severity="store.databaseSafety.canReadDatabase ? 'success' : 'warn'"
            class="text-sm font-black"
          />
        </div>
        <div class="mt-4 grid grid-cols-4 gap-3">
          <div v-for="row in migrationSafetyRows" :key="row.label" class="rounded-2xl border border-[#e8c99d] bg-[#fff8ea] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <p class="text-xs font-black uppercase tracking-[0.18em] text-[#a36b2d]">{{ row.label }}</p>
            <p class="mt-1 break-words text-base font-black text-[#342316]">{{ row.value }}</p>
          </div>
        </div>
        <div v-if="store.databaseSafety.warnings.length" class="mt-4 rounded-2xl border border-[#f2b15c] bg-[#fff1d5] p-3">
          <p class="text-sm font-black text-[#8d3f16]">安全提醒</p>
          <ul class="mt-2 grid gap-1 text-sm font-bold text-[#6b3c18]">
            <li v-for="warning in store.databaseSafety.warnings" :key="warning">· {{ warning }}</li>
          </ul>
        </div>
      </div>
      <div class="grid grid-cols-4 gap-3">
        <div v-for="(value, key) in store.migrationPreview?.summary ?? {}" :key="key" class="metric-tile-3d min-h-0">
          <p class="metric-label">{{ key }}</p>
          <p class="metric-value">{{ value }}</p>
        </div>
      </div>
      <div v-if="migrationNextSteps.length" class="section-bay">
        <p class="section-kicker">NEXT STEPS</p>
        <div class="mt-3 grid gap-2">
          <div v-for="(step, index) in migrationNextSteps" :key="step" class="flex items-center gap-3 rounded-2xl bg-[#fff8ea] px-3 py-2 text-sm font-black text-[#50331b]">
            <span class="grid h-7 w-7 place-items-center rounded-full bg-[#d8732a] text-white">{{ index + 1 }}</span>
            <span>{{ step }}</span>
          </div>
        </div>
      </div>
    </div>
  </PrimeDialog>
</template>
