<script setup lang="ts">
import { computed } from 'vue'
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  DatabaseZap,
  ExternalLink,
  FileClock,
  FileText,
  GitCompareArrows,
  Image as ImageIcon,
  Map,
  ScanSearch,
  ScrollText,
  UploadCloud,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AuditLogDialog from '@/components/document/AuditLogDialog.vue'
import MigrationPreviewDialog from '@/components/document/MigrationPreviewDialog.vue'
import UploadDocumentDialog from '@/components/document/UploadDocumentDialog.vue'
import VersionCompareDialog from '@/components/document/VersionCompareDialog.vue'
import VersionHistoryDialog from '@/components/document/VersionHistoryDialog.vue'
import { apiBaseUrl } from '@/services/api'
import { useProductionStore } from '@/stores/production-store'
import type { DocumentStatus, DocumentTab, DocumentTypeV03, ProductDocument, ProductionPlan } from '@/types/production'

const props = defineProps<{
  plan: ProductionPlan
  activeTab: DocumentTab
}>()

const emit = defineEmits<{
  setTab: [tab: DocumentTab]
}>()

const store = useProductionStore()

type TabConfig = {
  label: string
  shortLabel: string
  documentTypes: DocumentTypeV03[]
  icon: 'drawing' | 'sop' | 'pin-map' | 'finish'
}

const tabKeys: DocumentTab[] = ['drawing', 'sop', 'pin-map', 'finish']
const tabConfig: Record<DocumentTab, TabConfig> = {
  drawing: { label: 'PDF 图纸', shortLabel: '图纸', documentTypes: ['drawing_pdf'], icon: 'drawing' },
  sop: { label: 'SOP 扫描图片', shortLabel: 'SOP', documentTypes: ['sop_image', 'process_card'], icon: 'sop' },
  'pin-map': { label: '插接孔位图', shortLabel: '孔位图', documentTypes: ['pinout_diagram', 'connector_manual'], icon: 'pin-map' },
  finish: { label: '成品细节图', shortLabel: '成品图', documentTypes: ['finished_detail_image'], icon: 'finish' },
}

const statusOptions: Array<{ value: DocumentStatus; label: string }> = [
  { value: 'pending_review', label: '标记待确认' },
  { value: 'expired', label: '标记已失效' },
]

const currentTab = computed({
  get: () => props.activeTab,
  set: (value) => emit('setTab', value as DocumentTab),
})

const apiOrigin = computed(() => apiBaseUrl.replace(/\/api\/?$/, ''))

const allDocuments = computed(() => {
  const source = store.documents.length > 0 ? store.documents : props.plan.documents
  return source.filter((document) => !document.archived)
})

function documentId(document: ProductDocument) {
  return document.documentId ?? document.id
}

function documentStatus(document: ProductDocument): DocumentStatus {
  if (document.documentStatus) return document.documentStatus
  if (document.status === '有效') return 'effective'
  if (document.status === '待确认') return 'pending_review'
  if (document.status === '失效') return 'expired'
  return 'missing'
}

function statusLabel(document: ProductDocument) {
  const labels: Record<DocumentStatus, string> = {
    effective: '当前有效',
    pending_review: '待确认',
    expired: '已失效',
    missing: '缺失',
    inconsistent: '不一致',
  }
  return labels[documentStatus(document)]
}

function statusClass(document: ProductDocument) {
  const status = documentStatus(document)
  if (status === 'effective') return 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100'
  if (status === 'pending_review') return 'border-amber-300/40 bg-amber-300/10 text-amber-100'
  return 'border-red-400/40 bg-red-500/10 text-red-100'
}

function sourceLabel(document: ProductDocument) {
  if (document.source === 'manual_upload') return '本地上传'
  if (document.source === 'wecom_disk') return '企业微信微盘'
  return 'Mock 资料'
}

function documentTypeLabel(document: ProductDocument) {
  const labels: Record<DocumentTypeV03, string> = {
    drawing_pdf: 'PDF 图纸',
    sop_image: 'SOP 图片',
    connector_manual: '装配说明',
    pinout_diagram: '孔位图',
    finished_detail_image: '成品细节图',
    process_card: '流程卡',
  }
  return document.documentType ? labels[document.documentType] : tabConfig[document.type]?.label ?? '资料'
}

function matchesTab(tab: DocumentTab, document: ProductDocument) {
  return document.type === tab || Boolean(document.documentType && tabConfig[tab].documentTypes.includes(document.documentType))
}

function rankStatus(document: ProductDocument) {
  const status = documentStatus(document)
  if (status === 'effective') return 0
  if (status === 'pending_review') return 1
  if (status === 'inconsistent') return 2
  return 3
}

function docsForTab(tab: DocumentTab) {
  return allDocuments.value
    .filter((document) => matchesTab(tab, document))
    .sort((a, b) => {
      const sourceRank = (a.source === 'manual_upload' ? 0 : 1) - (b.source === 'manual_upload' ? 0 : 1)
      if (sourceRank !== 0) return sourceRank
      const statusRank = rankStatus(a) - rankStatus(b)
      if (statusRank !== 0) return statusRank
      return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')
    })
}

const groupedDocuments = computed<Record<DocumentTab, ProductDocument[]>>(() => ({
  drawing: docsForTab('drawing'),
  sop: docsForTab('sop'),
  'pin-map': docsForTab('pin-map'),
  finish: docsForTab('finish'),
}))

const currentDocuments = computed(() => groupedDocuments.value[currentTab.value] ?? [])

const activeDocument = computed(() => {
  const preview = store.previewDocument
  if (preview && matchesTab(currentTab.value, preview)) {
    return currentDocuments.value.find((document) => documentId(document) === documentId(preview)) ?? currentDocuments.value[0]
  }
  return currentDocuments.value[0]
})

function selectDocument(document: ProductDocument) {
  store.previewDocument = document
}

function resolveFileUrl(document?: ProductDocument | null) {
  const raw = document?.previewUrl ?? document?.downloadUrl ?? ''
  if (!raw) return ''
  if (/^https?:\/\//.test(raw)) return raw
  if (raw.startsWith('/')) return `${apiOrigin.value}${raw}`
  return raw
}

function fileSizeLabel(size?: number) {
  if (!size) return '占位资料'
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

const previewUrl = computed(() => resolveFileUrl(activeDocument.value))
const isPdfPreview = computed(() => activeDocument.value?.previewType === 'pdf' || activeDocument.value?.mimeType === 'application/pdf')
const isImagePreview = computed(() => activeDocument.value?.previewType === 'image' || activeDocument.value?.mimeType?.startsWith('image/'))
const canManageActiveDocument = computed(() => store.apiOnline && Boolean(activeDocument.value))

async function updateStatus(status: DocumentStatus) {
  if (!activeDocument.value) return
  try {
    await store.updateCurrentDocumentStatus(documentId(activeDocument.value), {
      status,
      reason: `V0.6 平板端资料状态维护：${status}`,
    })
  } catch {
    toast.error('资料状态更新失败', { description: '请检查后端 API 状态。' })
  }
}

async function setEffective() {
  if (!activeDocument.value) return
  if (!window.confirm(`确认将 ${activeDocument.value.title} ${activeDocument.value.version} 设为当前有效版本？`)) return
  await store.setCurrentDocumentEffective(documentId(activeDocument.value), {
    reason: `平板端确认 ${activeDocument.value.version} 为当前有效版本`,
  })
}

async function archiveActiveDocument() {
  if (!activeDocument.value) return
  try {
    await store.archiveCurrentDocument(documentId(activeDocument.value))
  } catch {
    toast.error('资料归档失败', { description: '请检查后端 API 状态。' })
  }
}

async function openVersions() {
  if (!activeDocument.value) return
  await store.loadDocumentVersions(documentId(activeDocument.value))
}

async function openCompare() {
  if (!activeDocument.value) return
  await store.loadDocumentVersions(documentId(activeDocument.value))
  store.compareDialogOpen = true
}

async function openAudit() {
  if (!activeDocument.value) return
  await store.loadAuditLogs({
    entityType: 'document',
    entityId: documentId(activeDocument.value),
    limit: 50,
  })
}

async function openMigrationPreview() {
  await store.loadMigrationPreview()
}
</script>

<template>
  <section class="rounded-lg border border-slate-700/80 bg-slate-900/80 p-5">
    <div class="mb-4 flex items-center justify-between gap-4">
      <div>
        <p class="text-sm font-semibold text-cyan-200">资料包预览与版本管理</p>
        <h2 class="m-0 mt-1 text-xl font-semibold tracking-normal text-slate-50">图纸 / SOP / 孔位图 / 成品细节图</h2>
      </div>
      <div class="flex items-center gap-3">
        <Badge
          class="border px-3 py-1"
          :class="store.apiOnline ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100' : 'border-amber-300/30 bg-amber-300/10 text-amber-100'"
        >
          {{ store.apiOnline ? 'Mock API 在线' : '离线演示模式' }}
        </Badge>
        <Button type="button" class="h-11 border border-slate-700 bg-slate-950 px-4 text-cyan-100 hover:bg-slate-800" :disabled="!store.apiOnline" @click="openMigrationPreview">
          <DatabaseZap class="size-4" />
          迁移预览
        </Button>
        <Button type="button" class="h-11 bg-cyan-300 px-5 text-slate-950 hover:bg-cyan-200" :disabled="!store.apiOnline" @click="store.uploadDialogOpen = true">
          <UploadCloud class="size-4" />
          上传资料
        </Button>
      </div>
    </div>

    <Tabs v-model="currentTab">
      <TabsList class="grid h-12 w-full grid-cols-4 bg-slate-950 text-slate-400">
        <TabsTrigger v-for="tab in tabKeys" :key="tab" :value="tab" class="h-10 data-[state=active]:bg-cyan-300 data-[state=active]:text-slate-950">
          <FileText v-if="tabConfig[tab].icon === 'drawing'" class="mr-2 size-4" />
          <ScanSearch v-else-if="tabConfig[tab].icon === 'sop'" class="mr-2 size-4" />
          <Map v-else-if="tabConfig[tab].icon === 'pin-map'" class="mr-2 size-4" />
          <ImageIcon v-else class="mr-2 size-4" />
          {{ tabConfig[tab].shortLabel }}
          <span class="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300">{{ groupedDocuments[tab].length }}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent v-for="tab in tabKeys" :key="tab" :value="tab" class="mt-4">
        <div class="grid grid-cols-[1fr_340px] gap-4">
          <div class="relative min-h-[350px] overflow-hidden rounded-lg border border-cyan-300/20 bg-slate-950">
            <template v-if="activeDocument && previewUrl && isPdfPreview">
              <iframe :src="previewUrl" :title="activeDocument.title" class="relative h-[350px] w-full bg-slate-950" />
            </template>
            <template v-else-if="activeDocument && previewUrl && isImagePreview">
              <div class="relative flex h-[350px] items-center justify-center bg-slate-950 p-4">
                <img :src="previewUrl" :alt="activeDocument.title" class="max-h-full max-w-full rounded border border-slate-700 object-contain shadow-[0_0_40px_rgba(34,211,238,0.12)]">
              </div>
            </template>
            <template v-else>
              <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(34,211,238,.06)_1px,transparent_1px),linear-gradient(rgba(34,211,238,.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
              <div class="absolute inset-6 rounded-lg border border-dashed border-cyan-300/25" />
              <div class="relative flex min-h-[350px] flex-col items-center justify-center gap-4 p-8 text-center">
                <div class="flex size-20 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 text-cyan-200 shadow-[0_0_35px_rgba(34,211,238,0.18)]">
                  <FileText v-if="tab === 'drawing'" class="size-10" />
                  <ScanSearch v-else-if="tab === 'sop'" class="size-10" />
                  <Map v-else-if="tab === 'pin-map'" class="size-10" />
                  <ImageIcon v-else class="size-10" />
                </div>
                <div>
                  <p class="text-2xl font-semibold text-slate-50">{{ activeDocument?.localMockLabel ?? `${tabConfig[tab].label}待上传` }}</p>
                  <p class="mt-2 max-w-xl text-sm text-slate-400">
                    未找到本地上传文件时显示资料预览占位器；上传 PDF 或图片后，此区域会直接读取后端本地文件流。
                  </p>
                </div>
              </div>
            </template>
          </div>

          <div class="flex min-h-[350px] flex-col gap-3 rounded-lg border border-slate-700 bg-slate-950/70 p-4">
            <div v-if="activeDocument" class="space-y-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-slate-400">{{ documentTypeLabel(activeDocument) }}</p>
                  <p class="mt-1 text-xl font-semibold text-slate-50">{{ activeDocument.title }}</p>
                </div>
                <Badge class="border px-2 py-1" :class="statusClass(activeDocument)">
                  {{ statusLabel(activeDocument) }}
                </Badge>
              </div>

              <div class="grid grid-cols-2 gap-2 text-sm">
                <div class="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
                  <p class="text-slate-500">版本</p>
                  <p class="mt-1 text-lg font-semibold text-cyan-100">{{ activeDocument.version }}</p>
                </div>
                <div class="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
                  <p class="text-slate-500">来源</p>
                  <p class="mt-1 text-lg font-semibold text-slate-100">{{ sourceLabel(activeDocument) }}</p>
                </div>
                <div class="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
                  <p class="text-slate-500">文件</p>
                  <p class="mt-1 text-base font-semibold text-slate-100">{{ fileSizeLabel(activeDocument.fileSize) }}</p>
                </div>
                <div class="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
                  <p class="text-slate-500">更新</p>
                  <p class="mt-1 text-base font-semibold text-slate-100">{{ activeDocument.updatedAt ?? activeDocument.createdAt ?? 'Mock' }}</p>
                </div>
              </div>

              <div v-if="documentStatus(activeDocument) !== 'effective'" class="rounded-lg border border-amber-300/35 bg-amber-300/10 p-3 text-sm font-semibold text-amber-100">
                <AlertTriangle class="mr-2 inline size-4" />
                当前资料不是有效版本，会参与资料齐套复核提醒。
              </div>

              <a v-if="previewUrl" :href="previewUrl" target="_blank" rel="noreferrer" class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-cyan-100 hover:border-cyan-300/40">
                <ExternalLink class="size-4" />
                新窗口打开
              </a>

              <div class="grid grid-cols-2 gap-2">
                <Button type="button" class="h-10 border border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800" :disabled="!canManageActiveDocument" @click="openVersions">
                  <FileClock class="size-4" />
                  查看版本
                </Button>
                <Button type="button" class="h-10 bg-emerald-300 text-slate-950 hover:bg-emerald-200 disabled:opacity-40" :disabled="!canManageActiveDocument || documentStatus(activeDocument) === 'effective'" @click="setEffective">
                  <CheckCircle2 class="size-4" />
                  设为有效
                </Button>
                <Button type="button" class="h-10 border border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800" :disabled="!canManageActiveDocument" @click="openCompare">
                  <GitCompareArrows class="size-4" />
                  对比版本
                </Button>
                <Button type="button" class="h-10 border border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800" :disabled="!canManageActiveDocument" @click="openAudit">
                  <ScrollText class="size-4" />
                  查看审计
                </Button>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <Button v-for="option in statusOptions" :key="option.value" type="button" class="h-10 border border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 disabled:opacity-40" :disabled="!canManageActiveDocument || documentStatus(activeDocument) === option.value" @click="updateStatus(option.value)">
                  <AlertTriangle class="size-4" />
                  {{ option.label }}
                </Button>
              </div>

              <Button type="button" class="h-10 w-full border border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/20 disabled:opacity-40" :disabled="!canManageActiveDocument" @click="archiveActiveDocument">
                <Archive class="size-4" />
                归档资料
              </Button>
            </div>

            <div v-else class="flex flex-1 flex-col items-center justify-center text-center">
              <p class="text-lg font-semibold text-slate-200">暂无 {{ tabConfig[tab].label }}</p>
              <p class="mt-2 text-sm text-slate-500">可点击上传资料绑定当前产品。</p>
            </div>
          </div>
        </div>

        <div v-if="groupedDocuments[tab].length > 1" class="mt-3 grid grid-cols-2 gap-3">
          <button
            v-for="document in groupedDocuments[tab]"
            :key="documentId(document)"
            type="button"
            class="rounded-lg border p-3 text-left transition hover:border-cyan-300/50"
            :class="activeDocument && documentId(activeDocument) === documentId(document) ? 'border-cyan-300/60 bg-cyan-300/10' : 'border-slate-700 bg-slate-950/70'"
            @click="selectDocument(document)"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="truncate text-sm font-semibold text-slate-100">{{ document.title }}</p>
              <Badge class="border px-2 py-0.5 text-xs" :class="statusClass(document)">{{ statusLabel(document) }}</Badge>
            </div>
            <p class="mt-2 text-xs text-slate-500">{{ sourceLabel(document) }} / {{ document.version }} / {{ fileSizeLabel(document.fileSize) }}</p>
          </button>
        </div>
      </TabsContent>
    </Tabs>

    <UploadDocumentDialog />
    <VersionHistoryDialog />
    <VersionCompareDialog />
    <AuditLogDialog />
    <MigrationPreviewDialog />
  </section>
</template>
