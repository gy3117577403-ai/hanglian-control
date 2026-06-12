<script setup lang="ts">
import { computed, ref } from 'vue'
import VuePdfEmbed from 'vue-pdf-embed'
import { GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { Download, RotateCcw, ZoomIn, ZoomOut } from 'lucide-vue-next'
import { dateTimeLabel, documentTypeLabel, fileSizeLabel, resolveFileUrl } from '@/lib/format'
import {
  documentSeverity,
  documentStatusLabel,
  fileHealthLabel,
  fileHealthSeverity,
  isHistoricalDocument,
  isPendingDocument,
} from '@/lib/status-style'
import type { DocumentFileHealthItem, ProductDocument } from '@/types/production'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const props = defineProps<{
  document: ProductDocument | null | undefined
  fileHealth?: DocumentFileHealthItem | null
}>()

const emit = defineEmits<{
  upload: []
  download: [document: ProductDocument]
  versions: [document: ProductDocument]
  audit: [document: ProductDocument]
}>()

const scale = ref(1)
const loading = ref(false)
const failed = ref(false)

const source = computed(() => resolveFileUrl(props.document?.previewUrl ?? props.document?.downloadUrl))
const hasRealPdf = computed(() => Boolean(props.document && source.value && props.document.previewType === 'pdf'))
const effectiveHealthStatus = computed(() => props.fileHealth?.healthStatus ?? (hasRealPdf.value ? 'ok' : 'demo'))
const canRenderPdf = computed(() => hasRealPdf.value && effectiveHealthStatus.value === 'ok' && !failed.value)
const shouldShowFallback = computed(() => Boolean(props.document) && !canRenderPdf.value)
const boundaryMessages = computed(() => {
  const messages: Array<{ severity: 'info' | 'warn' | 'error'; text: string }> = []
  if (!props.document) messages.push({ severity: 'info', text: '暂无该类型资料，请上传真实资料。' })
  if (props.document?.source === 'mock' || effectiveHealthStatus.value === 'demo') messages.push({ severity: 'info', text: '当前为演示资料，上传真实资料后将替换预览。' })
  if (effectiveHealthStatus.value === 'unsupported') messages.push({ severity: 'warn', text: '该文件暂不支持在线预览，可下载查看。' })
  if (effectiveHealthStatus.value === 'missing_file') messages.push({ severity: 'error', text: '文件缺失，请重新上传。' })
  if (failed.value) messages.push({ severity: 'error', text: 'PDF 预览失败，可下载查看或重新上传。' })
  if (props.fileHealth?.largeFileWarning) messages.push({ severity: 'warn', text: '文件超过推荐大小，预览可能较慢。' })
  if (props.fileHealth?.isHistorical || isHistoricalDocument(props.document)) messages.push({ severity: 'error', text: '历史版本，不建议用于生产。' })
  if (props.fileHealth?.isPendingReview || isPendingDocument(props.document)) messages.push({ severity: 'warn', text: '待确认版本，开工前请复核。' })
  return messages
})

function onPdfAction(event: MouseEvent) {
  const action = (event.target as HTMLElement).closest<HTMLElement>('[data-pdf-action]')?.dataset.pdfAction
  const document = props.document
  if (!action) return

  if (action === 'zoom-in') scale.value = Math.min(scale.value + 0.1, 1.8)
  if (action === 'zoom-out') scale.value = Math.max(scale.value - 0.1, 0.7)
  if (action === 'reset' || action === 'reload') {
    scale.value = 1
    failed.value = false
  }
  if (action === 'upload') emit('upload')
  if (!document) return
  if (action === 'download') emit('download', document)
  if (action === 'versions') emit('versions', document)
  if (action === 'audit') emit('audit', document)
}

function startLoading() {
  if (!hasRealPdf.value) return
  loading.value = true
  failed.value = false
}

function finishLoading() {
  loading.value = false
}

function failLoading() {
  loading.value = false
  failed.value = true
}
</script>

<template>
  <div class="pdf-preview-desk">
    <div class="pdf-toolbar" @click.capture="onPdfAction">
      <div class="min-w-0">
        <p class="section-kicker">PDF DRAWING DESK</p>
        <h4 class="truncate text-2xl font-black text-[#342316]">{{ document?.title ?? '未选择图纸' }}</h4>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <PrimeTag :value="document ? documentTypeLabel(document) : 'PDF 图纸'" severity="secondary" />
          <PrimeTag v-if="document" :value="document.version" severity="secondary" />
          <PrimeTag v-if="document" :value="documentStatusLabel(document)" :severity="documentSeverity(document)" />
          <PrimeTag :value="document?.source === 'manual_upload' ? '本地上传' : 'Mock 资料包'" severity="info" />
          <PrimeTag :value="fileSizeLabel(document?.fileSize)" severity="secondary" />
          <PrimeTag :value="fileHealthLabel(effectiveHealthStatus)" :severity="fileHealthSeverity(effectiveHealthStatus)" />
          <PrimeTag :value="dateTimeLabel(document?.updatedAt ?? document?.createdAt)" severity="secondary" />
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <PrimeButton data-pdf-action="zoom-in" severity="secondary" aria-label="放大">
          <template #icon><ZoomIn :size="18" /></template>
        </PrimeButton>
        <PrimeButton data-pdf-action="zoom-out" severity="secondary" aria-label="缩小">
          <template #icon><ZoomOut :size="18" /></template>
        </PrimeButton>
        <PrimeButton data-pdf-action="reset" severity="secondary" aria-label="重置">
          <template #icon><RotateCcw :size="18" /></template>
        </PrimeButton>
        <PrimeButton data-pdf-action="download" severity="secondary" label="下载" :disabled="!document">
          <template #icon><Download :size="18" /></template>
        </PrimeButton>
        <PrimeButton data-pdf-action="versions" severity="secondary" icon="pi pi-history" label="版本" :disabled="!document" />
        <PrimeButton data-pdf-action="audit" severity="secondary" icon="pi pi-list-check" label="审计" :disabled="!document" />
      </div>
    </div>

    <PrimeMessage v-for="item in boundaryMessages" :key="item.text" :severity="item.severity" :closable="false">
      {{ item.text }}
    </PrimeMessage>

    <PrimeMessage v-if="document && isHistoricalDocument(document)" severity="error" :closable="false">
      该图纸为历史版本，不建议用于当前生产。
    </PrimeMessage>
    <PrimeMessage v-else-if="document && isPendingDocument(document)" severity="warn" :closable="false">
      该图纸为待确认版本，请组长复核后再用于生产。
    </PrimeMessage>
    <PrimeMessage v-if="shouldShowFallback" :severity="effectiveHealthStatus === 'demo' ? 'info' : 'error'" :closable="false">
      文件健康状态：{{ fileHealthLabel(effectiveHealthStatus) }}。如果该资料来自演示数据，请先上传真实 PDF；如果文件异常，可重新加载或下载后查看。
    </PrimeMessage>

    <div class="pdf-paper-stage">
      <div v-if="loading" class="grid gap-3 p-5">
        <PrimeSkeleton height="36px" />
        <PrimeSkeleton height="260px" />
        <PrimeProgressBar mode="indeterminate" />
      </div>

      <VuePdfEmbed
        v-if="canRenderPdf"
        class="pdf-embed-sheet"
        :source="source"
        :scale="scale"
        @loaded="finishLoading"
        @loading="startLoading"
        @loading-failed="failLoading"
      />

      <div v-else class="demo-drawing-sheet">
        <div class="demo-drawing-title">
          <span>{{ effectiveHealthStatus === 'demo' ? '当前为演示资料' : 'PDF 预览兜底' }}</span>
          <strong>{{ document?.version ?? 'PDF-V0' }}</strong>
        </div>
        <div class="demo-wire-map">
          <span v-for="pin in 32" :key="pin" class="demo-pin">{{ pin }}</span>
          <svg viewBox="0 0 760 260" aria-hidden="true">
            <path d="M28 42 C160 160 274 -60 396 72 S604 198 732 52" />
            <path d="M32 205 C176 92 282 276 430 176 S606 72 730 216" />
            <path d="M86 132 L690 132" />
          </svg>
        </div>
        <p class="demo-drawing-note">
          资料标题：{{ document?.title ?? '未选择图纸' }}。健康状态：{{ fileHealthLabel(effectiveHealthStatus) }}。
          上传真实 PDF 后将自动替换为文件流预览。
        </p>
        <div class="mt-4 flex flex-wrap justify-center gap-3">
          <PrimeButton data-pdf-action="upload" icon="pi pi-upload" label="上传真实 PDF" />
          <PrimeButton data-pdf-action="reload" severity="secondary" icon="pi pi-refresh" label="重新加载" />
          <PrimeButton
            v-if="document?.downloadUrl"
            data-pdf-action="download"
            severity="secondary"
            icon="pi pi-download"
            label="下载文件"
          />
        </div>
      </div>
    </div>
  </div>
</template>
