<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Viewer from 'viewerjs'
import 'viewerjs/dist/viewer.css'
import { Download, Maximize2 } from 'lucide-vue-next'
import { dateTimeLabel, documentTypeLabel, fileSizeLabel, mockPreviewImage, resolveFileUrl } from '@/lib/format'
import {
  documentSeverity,
  documentStatusLabel,
  fileHealthLabel,
  fileHealthSeverity,
  isHistoricalDocument,
  isPendingDocument,
} from '@/lib/status-style'
import type { DocumentFileHealthItem, ProductDocument } from '@/types/production'

const props = defineProps<{
  document: ProductDocument | null | undefined
  documents: ProductDocument[]
  fileHealth?: DocumentFileHealthItem | null
}>()

const emit = defineEmits<{
  upload: []
  download: [document: ProductDocument]
  versions: [document: ProductDocument]
  audit: [document: ProductDocument]
}>()

const viewerRoot = ref<HTMLElement | null>(null)
const activeIndex = ref(0)
const failed = ref(false)
let viewer: Viewer | null = null

const imageItems = computed(() => {
  const sourceDocuments = props.documents.length ? props.documents : props.document ? [props.document] : []
  return sourceDocuments.flatMap((document) => {
    const realSource = resolveFileUrl(document.previewUrl ?? document.downloadUrl)
    const total = realSource ? 1 : document.type === 'finish' ? 4 : document.type === 'pin-map' ? 2 : 3
    return Array.from({ length: total }, (_, index) => ({
      key: `${document.id}-${index}`,
      document,
      title: total > 1 ? `${document.title} · ${index + 1}` : document.title,
      src: realSource || mockPreviewImage(document, index + 1, total),
      index: index + 1,
      total,
      isMock: !realSource,
    }))
  })
})

const currentItem = computed(() => imageItems.value[Math.min(activeIndex.value, Math.max(imageItems.value.length - 1, 0))])
const effectiveHealthStatus = computed(() => props.fileHealth?.healthStatus ?? (currentItem.value?.isMock ? 'demo' : 'ok'))
const shouldShowFallback = computed(() => Boolean(currentItem.value) && (failed.value || effectiveHealthStatus.value !== 'ok'))

function rebuildViewer() {
  viewer?.destroy()
  viewer = null
  if (!viewerRoot.value) return
  viewer = new Viewer(viewerRoot.value, {
    navbar: false,
    title: false,
    toolbar: {
      zoomIn: true,
      zoomOut: true,
      oneToOne: true,
      reset: true,
      prev: true,
      play: false,
      next: true,
      rotateLeft: true,
      rotateRight: true,
      flipHorizontal: false,
      flipVertical: false,
    },
  })
}

function openViewer() {
  if (effectiveHealthStatus.value !== 'ok' && effectiveHealthStatus.value !== 'demo') return
  if (!viewer) rebuildViewer()
  viewer?.view(activeIndex.value)
}

function changeImage(delta: number) {
  if (!imageItems.value.length) return
  activeIndex.value = (activeIndex.value + delta + imageItems.value.length) % imageItems.value.length
  failed.value = false
}

function onImageAction(event: MouseEvent) {
  const action = (event.target as HTMLElement).closest<HTMLElement>('[data-image-action]')?.dataset.imageAction
  const document = currentItem.value?.document
  if (!action) return
  if (action === 'prev') changeImage(-1)
  if (action === 'next') changeImage(1)
  if (action === 'zoom') openViewer()
  if (action === 'upload') emit('upload')
  if (action === 'reload') failed.value = false
  if (!document) return
  if (action === 'download') emit('download', document)
  if (action === 'versions') emit('versions', document)
  if (action === 'audit') emit('audit', document)
}

watch(
  () => imageItems.value.map((item) => item.key).join('|'),
  async () => {
    activeIndex.value = 0
    failed.value = false
    await nextTick()
    rebuildViewer()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  viewer?.destroy()
})
</script>

<template>
  <div class="image-preview-board">
    <div class="image-toolbar" @click.capture="onImageAction">
      <div class="min-w-0">
        <p class="section-kicker">IMAGE INSPECTION BOARD</p>
        <h4 class="truncate text-2xl font-black text-[#342316]">{{ currentItem?.title ?? '未选择图片资料' }}</h4>
        <div v-if="currentItem" class="mt-2 flex flex-wrap items-center gap-2">
          <PrimeTag :value="documentTypeLabel(currentItem.document)" severity="secondary" />
          <PrimeTag :value="currentItem.document.version" severity="secondary" />
          <PrimeTag :value="documentStatusLabel(currentItem.document)" :severity="documentSeverity(currentItem.document)" />
          <PrimeTag :value="`${currentItem.index} / ${currentItem.total}`" severity="info" />
          <PrimeTag :value="fileSizeLabel(currentItem.document.fileSize)" severity="secondary" />
          <PrimeTag :value="fileHealthLabel(effectiveHealthStatus)" :severity="fileHealthSeverity(effectiveHealthStatus)" />
          <PrimeTag :value="dateTimeLabel(currentItem.document.updatedAt ?? currentItem.document.createdAt)" severity="secondary" />
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <PrimeButton data-image-action="prev" severity="secondary" icon="pi pi-chevron-left" label="上一张" />
        <PrimeButton data-image-action="next" severity="secondary" icon="pi pi-chevron-right" label="下一张" />
        <PrimeButton data-image-action="zoom" severity="secondary" label="放大">
          <template #icon><Maximize2 :size="18" /></template>
        </PrimeButton>
        <PrimeButton data-image-action="download" severity="secondary" label="下载">
          <template #icon><Download :size="18" /></template>
        </PrimeButton>
        <PrimeButton data-image-action="versions" severity="secondary" icon="pi pi-history" label="版本" />
        <PrimeButton data-image-action="audit" severity="secondary" icon="pi pi-list-check" label="审计" />
      </div>
    </div>

    <PrimeMessage v-if="currentItem && isHistoricalDocument(currentItem.document)" severity="error" :closable="false">
      该图片资料为历史版本，不建议用于当前生产。
    </PrimeMessage>
    <PrimeMessage v-else-if="currentItem && isPendingDocument(currentItem.document)" severity="warn" :closable="false">
      该图片资料为待确认版本，请复核后使用。
    </PrimeMessage>
    <PrimeMessage v-if="shouldShowFallback" :severity="effectiveHealthStatus === 'demo' ? 'info' : 'error'" :closable="false">
      文件健康状态：{{ fileHealthLabel(effectiveHealthStatus) }}。上传真实图片后将自动替换当前预览。
    </PrimeMessage>

    <div ref="viewerRoot" class="viewer-image-bank">
      <img
        v-for="item in imageItems"
        :key="item.key"
        :src="item.src"
        :alt="item.title"
        :class="item.key === currentItem?.key ? 'block' : 'hidden'"
        @error="failed = true"
      >
    </div>

    <div v-if="currentItem" class="image-stage" @dblclick="openViewer">
      <img :src="currentItem.src" :alt="currentItem.title" class="inspection-image" @error="failed = true">
      <div class="inspection-caption">
        <span>{{ currentItem.isMock ? '当前为演示资料' : fileHealthLabel(effectiveHealthStatus) }}</span>
        <strong>{{ currentItem.document.localMockLabel || '本地资料预览' }}</strong>
      </div>
      <div v-if="shouldShowFallback" class="preview-fallback-actions">
        <PrimeButton data-image-action="upload" icon="pi pi-upload" label="上传真实图片" />
        <PrimeButton data-image-action="reload" severity="secondary" icon="pi pi-refresh" label="重新加载" />
      </div>
    </div>

    <div v-else class="grid min-h-[320px] place-items-center rounded-lg border border-dashed border-[#9a693633] bg-[#fff8e9]/78">
      <div class="text-center">
        <PrimeSkeleton shape="circle" size="4rem" class="mx-auto" />
        <p class="mt-4 text-lg font-black text-[#3b2514]">当前资料夹暂无图片</p>
        <p class="mt-1 text-sm font-bold text-[#76512a]">可通过本地上传加入 Mock 资料包。</p>
      </div>
    </div>
  </div>
</template>
