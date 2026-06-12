<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
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
import { rawDocumentStatus } from '@/lib/status-style'
import { useProductionStore } from '@/stores/production-store'
import type { DocumentTab, ProductDocument } from '@/types/production'

const emit = defineEmits<{
  'open-upload': []
  'open-versions': []
  'open-audit': []
  'open-migration': []
}>()

const store = useProductionStore()
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
const previewFileHealth = computed(() => previewDocument.value ? store.fileHealthForDocument(previewDocument.value) : null)

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
  if (action === 'upload') emit('open-upload')
  if (action === 'versions' && previewDocument.value) void openVersions(previewDocument.value)
  if (action === 'audit' && previewDocument.value) void openAudit(previewDocument.value)
  if (action === 'migration') void openMigration()
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
        <PrimeButton data-action="upload" severity="secondary" icon="pi pi-upload" label="上传" />
        <PrimeButton data-action="versions" severity="secondary" icon="pi pi-history" label="版本" />
        <PrimeButton data-action="audit" severity="secondary" icon="pi pi-list-check" label="留痕" />
        <PrimeButton data-action="migration" severity="secondary" icon="pi pi-database" label="迁移" />
      </div>
    </div>

    <PrimeTabs :value="activeTab" class="document-folder-tabs" @update:value="setTab" @click.capture="onTabClick">
      <PrimeTabList>
        <PrimeTab v-for="item in tabStats" :key="item.tab" :value="item.tab">
          <i :class="tabIcon(item.tab)" />
          <span class="ml-2">{{ tabLabel(item.tab) }}</span>
          <span class="ml-2 rounded-full bg-white/55 px-2 py-0.5 text-xs">{{ item.count }}</span>
          <span :class="['ml-2 h-2.5 w-2.5 rounded-full', item.dotClass]" />
        </PrimeTab>
      </PrimeTabList>
    </PrimeTabs>

    <PrimeCard class="mt-3 document-preview-card">
      <template #content>
        <div class="grid grid-cols-[minmax(260px,0.34fr)_minmax(480px,0.66fr)] gap-3">
          <WarmDocumentCarousel
            :documents="activeDocs"
            :active-document-id="activeDocumentId"
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
