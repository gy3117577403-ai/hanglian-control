<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import WarmEmptyState from '@/components/common/WarmEmptyState.vue'
import WarmErrorState from '@/components/common/WarmErrorState.vue'
import WarmDocumentCarousel, { type DocumentCardAction } from '@/components/document/WarmDocumentCarousel.vue'
import WarmImagePreview from '@/components/document/WarmImagePreview.vue'
import WarmPdfPreview from '@/components/document/WarmPdfPreview.vue'
import {
  documentMatchesTab,
  resolveFileUrl,
  tabForDocument,
  tabIcon,
  tabLabel,
  type PreviewFolderTab,
} from '@/lib/format'
import { PERMISSIONS } from '@/lib/permissions'
import { rawDocumentStatus } from '@/lib/status-style'
import { useAuthStore } from '@/stores/auth-store'
import { useProductionStore } from '@/stores/production-store'
import type { DocumentTab, ProductDocument } from '@/types/production'

const emit = defineEmits<{
  'open-upload': []
  'open-versions': []
  'open-audit': []
  'open-migration': []
}>()

const store = useProductionStore()
const auth = useAuthStore()
const confirm = useConfirm()
const toast = useToast()

const activeTab = ref<PreviewFolderTab>('drawing')

const tabs: PreviewFolderTab[] = ['drawing', 'sop', 'pin-map', 'finish', 'connector', 'process-card']

const allDocuments = computed(() => {
  return store.documents.length ? store.documents : store.selectedPlan.documents
})

const tabStats = computed(() => {
  return tabs.map((tab) => {
    const documents = allDocuments.value.filter((document) => documentMatchesTab(document, tab))
    const statuses = documents.map(rawDocumentStatus)
    const dotClass = documents.length === 0
      ? 'bg-[#d79527]'
      : statuses.some((status) => ['expired', 'missing', 'inconsistent'].includes(String(status)))
        ? 'bg-[#b8422a]'
        : statuses.some((status) => status === 'pending_review')
          ? 'bg-[#d79527]'
          : 'bg-[#229a66]'
    return {
      tab,
      documents,
      count: documents.length,
      dotClass,
    }
  })
})

const activeDocs = computed(() => allDocuments.value.filter((document) => documentMatchesTab(document, activeTab.value)))

const previewDocument = computed(() => {
  return store.previewDocument && documentMatchesTab(store.previewDocument, activeTab.value)
    ? store.previewDocument
    : activeDocs.value[0]
})

const isPdfTab = computed(() => activeTab.value === 'drawing')
const activeDocumentId = computed(() => previewDocument.value?.documentId ?? previewDocument.value?.id)
const canUpload = computed(() => auth.hasPermission(PERMISSIONS.DOCUMENT_UPLOAD))
const canViewVersions = computed(() => auth.hasPermission(PERMISSIONS.DOCUMENT_VIEW))
const canViewAudit = computed(() => auth.hasPermission(PERMISSIONS.DOCUMENT_AUDIT_VIEW))
const canSetEffective = computed(() => auth.hasPermission(PERMISSIONS.DOCUMENT_SET_EFFECTIVE))
const canUpdateDocument = computed(() => auth.hasPermission(PERMISSIONS.DOCUMENT_UPDATE))
const canArchive = computed(() => auth.hasPermission(PERMISSIONS.DOCUMENT_ARCHIVE))
const canViewSystem = computed(() => auth.hasPermission(PERMISSIONS.SYSTEM_INFO_VIEW))
const previewFileHealth = computed(() => previewDocument.value ? store.fileHealthForDocument(previewDocument.value) : null)
const previewDiagnostics = computed(() => {
  const document = previewDocument.value
  const health = previewFileHealth.value
  const hasPreviewUrl = Boolean(document?.previewUrl)
  const hasDownloadUrl = Boolean(document?.downloadUrl)
  const isManualUpload = document?.source === 'manual_upload'
  const isMock = document?.source !== 'manual_upload'
  const canPreview = Boolean(health?.canPreview ?? (isManualUpload && (hasPreviewUrl || hasDownloadUrl)))
  const recommendedAction = health?.recommendedAction
    ?? document?.recommendedAction
    ?? (isMock
      ? '当前是 Mock 占位资料；如需真实预览，请上传 demo-upload-assets 中的演示文件。'
      : canPreview
        ? '当前资料可预览，现场可继续执行版本确认或留痕检查。'
        : '当前资料缺少可访问文件流，请重新上传或检查后端文件服务。')

  return {
    rows: [
      { label: 'previewUrl', value: hasPreviewUrl ? '有' : '无', tone: hasPreviewUrl ? 'good' : 'warn' },
      { label: 'downloadUrl', value: hasDownloadUrl ? '有' : '无', tone: hasDownloadUrl ? 'good' : 'warn' },
      { label: 'manual_upload', value: isManualUpload ? '是' : '否', tone: isManualUpload ? 'good' : 'info' },
      { label: 'mock', value: isMock ? '是' : '否', tone: isMock ? 'info' : 'good' },
      { label: 'canPreview', value: canPreview ? '是' : '否', tone: canPreview ? 'good' : 'danger' },
    ],
    recommendedAction,
  }
})
const healthCards = computed(() => {
  const summary = store.fileHealth?.summary
  return [
    { label: '可预览', value: summary?.previewableDocuments ?? 0, tone: 'good' },
    { label: '演示资料', value: summary?.demoOnly ?? 0, tone: 'info' },
    { label: '文件缺失', value: summary?.missingFiles ?? 0, tone: 'danger' },
    { label: '待确认', value: summary?.pendingReviewDocuments ?? 0, tone: 'warn' },
    { label: '历史失效', value: summary?.expiredDocuments ?? 0, tone: 'danger' },
    { label: '重复版本', value: summary?.duplicateVersionGroups ?? 0, tone: 'warn' },
  ]
})

function setTab(value: string | number) {
  activeTab.value = value as PreviewFolderTab
  const legacyTab = activeTab.value as DocumentTab
  if (['drawing', 'sop', 'pin-map', 'finish'].includes(legacyTab)) {
    store.setDocumentTab(legacyTab)
  }
}

function onTabClick(event: MouseEvent) {
  const text = (event.target as HTMLElement).closest<HTMLElement>('[role="tab"]')?.textContent ?? ''
  const tab = tabs.find((item) => text.includes(tabLabel(item)))
  if (tab) setTab(tab)
}

function onActionClick(event: MouseEvent) {
  const action = (event.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action
  if (action === 'upload' && !canUpload.value) return deny()
  if (action === 'versions' && !canViewVersions.value) return deny()
  if (action === 'audit' && !canViewAudit.value) return deny()
  if (action === 'migration' && !canViewSystem.value) return deny()
  if (action === 'upload') emit('open-upload')
  if (action === 'versions' && previewDocument.value) void openVersions(previewDocument.value)
  if (action === 'audit' && previewDocument.value) void openAudit(previewDocument.value)
  if (action === 'migration') void openMigration()
}

function deny() {
  toast.add({ severity: 'error', summary: '当前角色无权执行该操作。', detail: '请在右上角切换到具备权限的 Mock 角色。', life: 2600 })
}

function selectDocument(document: ProductDocument) {
  activeTab.value = tabForDocument(document)
  store.previewDocument = document
  void store.refreshDocumentDetail(document.documentId ?? document.id)
}

function downloadDocument(document: ProductDocument) {
  const url = resolveFileUrl(document.downloadUrl ?? document.previewUrl)
  if (!url) {
    toast.add({ severity: 'info', summary: '当前为演示资料', detail: '未上传真实文件，暂无可下载文件。', life: 2600 })
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
  store.addQueryLog(`下载资料：${document.title}`, '搜索', store.selectedPlan.id)
}

async function openVersions(document: ProductDocument) {
  store.previewDocument = document
  if (store.apiOnline) {
    await store.loadDocumentVersions(document.documentId ?? document.id).catch(() => undefined)
  }
  emit('open-versions')
}

async function openAudit(document: ProductDocument) {
  store.previewDocument = document
  await store.loadAuditLogs({ entityType: 'document', entityId: document.documentId ?? document.id, limit: 30 }).catch(() => undefined)
  emit('open-audit')
}

async function openMigration() {
  await store.loadMigrationPreview().catch(() => undefined)
  emit('open-migration')
}

async function compareVersions(document: ProductDocument) {
  store.previewDocument = document
  const sameGroup = allDocuments.value.filter((item) => {
    if (document.versionGroupKey && item.versionGroupKey) return item.versionGroupKey === document.versionGroupKey
    return item.documentType === document.documentType && item.productId === document.productId
  })
  const candidates = [document, ...sameGroup.filter((item) => (item.documentId ?? item.id) !== (document.documentId ?? document.id))]
  const ids = candidates.slice(0, 2).map((item) => item.documentId ?? item.id)
  if (ids.length < 2) {
    toast.add({ severity: 'warn', summary: '请选择两个版本', detail: '当前资料组只有一个版本，暂不能对比。', life: 2800 })
    return
  }
  await store.compareDocumentVersions(ids).catch(() => undefined)
}

function confirmSetEffective(document: ProductDocument) {
  if (!canSetEffective.value) return deny()
  confirm.require({
    header: '设为当前有效版本',
    message: `确认将 ${document.title} ${document.version} 设为当前有效版本？`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: '确认设为有效',
    rejectLabel: '取消',
    acceptClass: 'p-button-danger',
    accept: () => {
      void store.setCurrentDocumentEffective(document.documentId ?? document.id, { reason: 'V1.2 资料卡片菜单确认设为当前有效。' }).then(() => {
        toast.add({ severity: 'success', summary: '已设为当前有效', detail: document.title, life: 2600 })
      })
    },
  })
}

function confirmArchive(document: ProductDocument) {
  if (!canArchive.value) return deny()
  confirm.require({
    header: '归档资料',
    message: `确认归档 ${document.title} ${document.version}？归档后不会作为当前生产资料使用。`,
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

async function handleDocumentAction(action: DocumentCardAction, document: ProductDocument) {
  store.previewDocument = document
  if (action === 'set-effective' && !canSetEffective.value) return deny()
  if (['pending', 'expired'].includes(action) && !canUpdateDocument.value) return deny()
  if (action === 'archive' && !canArchive.value) return deny()
  if (action === 'preview') selectDocument(document)
  if (action === 'versions') await openVersions(document)
  if (action === 'audit') await openAudit(document)
  if (action === 'compare') await compareVersions(document)
  if (action === 'set-effective') confirmSetEffective(document)
  if (action === 'pending') {
    await store.updateCurrentDocumentStatus(document.documentId ?? document.id, { status: 'pending_review', reason: 'V1.2 资料卡片菜单标记为待确认。' })
    toast.add({ severity: 'warn', summary: '已标记为待确认', detail: document.title, life: 2600 })
  }
  if (action === 'expired') {
    await store.updateCurrentDocumentStatus(document.documentId ?? document.id, { status: 'expired', reason: 'V1.2 资料卡片菜单标记为已失效。' })
    toast.add({ severity: 'error', summary: '已标记为失效', detail: document.title, life: 2600 })
  }
  if (action === 'archive') confirmArchive(document)
}

watch(
  () => activeTab.value,
  async () => {
    const document = activeDocs.value[0]
    if (document) store.previewDocument = document
    await nextTick()
  },
)

watch(
  () => store.activeDocumentTab,
  (tab) => {
    activeTab.value = tab
  },
)
</script>

<template>
  <section class="section-bay warm-enter min-h-0">
    <div class="section-title">
      <div>
        <p class="section-kicker">DOCUMENT PREVIEW DESK</p>
        <h3 class="text-xl font-black">资料预览台</h3>
        <p class="mt-1 text-xs font-black text-[#7a5129]">
          文件健康：{{ store.fileHealth?.summary.previewableDocuments ?? 0 }} 可预览 /
          {{ store.fileHealth?.summary.demoOnly ?? 0 }} 演示 /
          {{ (store.fileHealth?.summary.missingFiles ?? 0) + (store.fileHealth?.summary.brokenPreview ?? 0) }} 异常
        </p>
      </div>
      <div class="flex gap-2" @click.capture="onActionClick">
        <PrimeButton data-action="upload" severity="secondary" icon="pi pi-upload" label="上传" :disabled="!canUpload" title="当前角色无权执行该操作" />
        <PrimeButton data-action="versions" severity="secondary" icon="pi pi-history" label="版本" :disabled="!canViewVersions" title="当前角色无权执行该操作" />
        <PrimeButton data-action="audit" severity="secondary" icon="pi pi-list-check" label="留痕" :disabled="!canViewAudit" title="当前角色无权执行该操作" />
        <PrimeButton data-action="migration" severity="secondary" icon="pi pi-database" label="迁移" :disabled="!canViewSystem" title="当前角色无权执行该操作" />
      </div>
    </div>

    <div class="file-health-overview">
      <div
        v-for="item in healthCards"
        :key="item.label"
        :class="['file-health-summary-card', `file-health-summary-${item.tone}`]"
      >
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>

    <WarmEmptyState
      v-if="!allDocuments.length"
      title="当前产品暂无资料"
      description="可点击上传，使用 demo-upload-assets 中的演示 PDF 或图片资料加入当前产品资料包。"
      action-label="上传资料"
      @action="emit('open-upload')"
    />

    <WarmErrorState
      v-else-if="!store.fileHealth && !store.fileHealthLoading"
      title="文件健康暂无数据"
      description="文件健康接口未返回结果，仍可继续查看 Mock 资料；如需验证文件流，请先打开网络诊断或重新选择计划。"
      action-label="重新检查"
      @action="store.loadFileHealth()"
    />

    <div v-if="previewDocument" class="preview-diagnostic-grid">
      <div
        v-for="item in previewDiagnostics.rows"
        :key="item.label"
        :class="['preview-diagnostic-card', `preview-diagnostic-${item.tone}`]"
      >
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
      <div class="preview-diagnostic-card preview-diagnostic-action">
        <span>recommendedAction</span>
        <strong>{{ previewDiagnostics.recommendedAction }}</strong>
      </div>
    </div>

    <PrimeTabs v-if="allDocuments.length" :value="activeTab" class="document-folder-tabs" @update:value="setTab" @click.capture="onTabClick">
      <PrimeTabList>
        <PrimeTab v-for="item in tabStats" :key="item.tab" :value="item.tab">
          <i :class="tabIcon(item.tab)" />
          <span class="ml-2">{{ tabLabel(item.tab) }}</span>
          <span class="ml-2 rounded-full bg-white/55 px-2 py-0.5 text-xs">{{ item.count }}</span>
          <span :class="['ml-2 h-2.5 w-2.5 rounded-full', item.dotClass]" />
        </PrimeTab>
      </PrimeTabList>
    </PrimeTabs>

    <PrimeCard v-if="allDocuments.length" class="mt-3 document-preview-card">
      <template #content>
        <div class="grid grid-cols-[minmax(260px,0.34fr)_minmax(480px,0.66fr)] gap-3">
          <WarmDocumentCarousel
            :documents="activeDocs"
            :active-document-id="activeDocumentId"
            :highlighted-document-id="store.highlightedDocumentId"
            :file-health-by-id="store.fileHealthByDocumentId"
            @select="selectDocument"
            @action="handleDocumentAction"
          />

          <WarmPdfPreview
            v-if="isPdfTab"
            :document="previewDocument"
            :file-health="previewFileHealth"
            @upload="emit('open-upload')"
            @download="downloadDocument"
            @versions="openVersions"
            @audit="openAudit"
          />
          <WarmImagePreview
            v-else
            :document="previewDocument"
            :documents="activeDocs"
            :file-health="previewFileHealth"
            @upload="emit('open-upload')"
            @download="downloadDocument"
            @versions="openVersions"
            @audit="openAudit"
          />
        </div>
      </template>
    </PrimeCard>
  </section>
</template>
