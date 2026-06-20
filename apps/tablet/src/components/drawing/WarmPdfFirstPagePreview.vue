<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RotateCcw } from 'lucide-vue-next'
import pdfjsUrl from 'pdfjs-dist/build/pdf.mjs?url'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

type PdfPageProxy = {
  getViewport(input: { scale: number }): { width: number; height: number }
  render(input: { canvasContext: CanvasRenderingContext2D; viewport: unknown }): { promise: Promise<void>; cancel: () => void }
  cleanup?: () => void
}

type PdfDocumentProxy = {
  numPages: number
  getPage(pageNumber: number): Promise<PdfPageProxy>
  destroy?: () => Promise<void>
}

type PdfLoadingTask = {
  promise: Promise<PdfDocumentProxy>
  destroy?: () => Promise<void>
}

type PdfJsModule = {
  GlobalWorkerOptions: { workerSrc: string }
  getDocument(input: { url: string }): PdfLoadingTask
}

const props = withDefaults(defineProps<{
  source?: string
  title?: string
  fixedHeight?: number
}>(), {
  source: '',
  title: 'PDF 资料',
  fixedHeight: 220,
})

const emit = defineEmits<{
  open: []
  retry: []
  pageCount: [count: number]
}>()

const root = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const shouldLoad = ref(false)
const loading = ref(false)
const rendered = ref(false)
const failed = ref(false)
const pageCount = ref(0)
const retryKey = ref(0)
let observer: IntersectionObserver | null = null
let pdfjsPromise: Promise<PdfJsModule> | null = null
let loadingTask: PdfLoadingTask | null = null
let renderTask: { promise: Promise<void>; cancel: () => void } | null = null
let loadedDocument: PdfDocumentProxy | null = null
let renderToken = 0
let lastRenderedKey = ''

const safeSource = computed(() => props.source.trim())
const renderKey = computed(() => `${safeSource.value}::${retryKey.value}`)
const pageLabel = computed(() => {
  if (!pageCount.value) return ''
  return pageCount.value > 1 ? `共 ${pageCount.value} 页` : '1 页'
})
const coverStyle = computed(() => ({ '--pdf-preview-height': `${props.fixedHeight}px` }))

function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import(/* @vite-ignore */ pdfjsUrl).then((module) => {
      const pdfjs = module as PdfJsModule
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
      return pdfjs
    })
  }
  return pdfjsPromise
}

function cancelRender() {
  renderTask?.cancel()
  renderTask = null
  void loadingTask?.destroy?.()
  loadingTask = null
  void loadedDocument?.destroy?.()
  loadedDocument = null
}

function resetState() {
  cancelRender()
  rendered.value = false
  failed.value = false
  pageCount.value = 0
  loading.value = Boolean(shouldLoad.value && safeSource.value)
  lastRenderedKey = ''
}

async function renderFirstPage() {
  if (!shouldLoad.value || !safeSource.value || !canvas.value) return
  if (lastRenderedKey === renderKey.value && rendered.value && !failed.value) return

  const token = ++renderToken
  cancelRender()
  loading.value = true
  failed.value = false
  rendered.value = false

  try {
    const pdfjs = await loadPdfJs()
    if (token !== renderToken) return
    loadingTask = pdfjs.getDocument({ url: safeSource.value })
    const document = await loadingTask.promise
    if (token !== renderToken) {
      void document.destroy?.()
      return
    }
    loadedDocument = document
    pageCount.value = Number(document.numPages) || 0
    if (pageCount.value > 0) emit('pageCount', pageCount.value)

    const page = await document.getPage(1)
    if (token !== renderToken || !canvas.value || !root.value) {
      page.cleanup?.()
      return
    }

    const viewport = page.getViewport({ scale: 1 })
    const bounds = root.value.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const scale = Math.min(
      Math.max((bounds.width - 20) * dpr, 1) / viewport.width,
      Math.max((bounds.height - 20) * dpr, 1) / viewport.height,
    )
    const scaledViewport = page.getViewport({ scale })
    const target = canvas.value
    target.width = Math.max(Math.floor(scaledViewport.width), 1)
    target.height = Math.max(Math.floor(scaledViewport.height), 1)
    target.style.width = `${Math.round(target.width / dpr)}px`
    target.style.height = `${Math.round(target.height / dpr)}px`

    const context = target.getContext('2d')
    if (!context) throw new Error('Canvas context is unavailable')
    renderTask = page.render({ canvasContext: context, viewport: scaledViewport })
    await renderTask.promise
    page.cleanup?.()
    if (token !== renderToken) return
    rendered.value = true
    loading.value = false
    failed.value = false
    lastRenderedKey = renderKey.value
  } catch (error) {
    if (token !== renderToken) return
    loading.value = false
    failed.value = true
    rendered.value = false
  }
}

function retry() {
  retryKey.value += 1
  resetState()
  void nextTick(renderFirstPage)
  emit('retry')
}

function startObserver() {
  if (!root.value) return
  if (typeof IntersectionObserver === 'undefined') {
    shouldLoad.value = true
    void nextTick(renderFirstPage)
    return
  }
  observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      shouldLoad.value = true
      loading.value = Boolean(safeSource.value)
      observer?.disconnect()
      observer = null
      void nextTick(renderFirstPage)
    }
  }, { rootMargin: '120px 0px', threshold: 0.01 })
  observer.observe(root.value)
}

watch([safeSource, retryKey], () => {
  resetState()
  void nextTick(renderFirstPage)
})

onMounted(() => {
  void nextTick(startObserver)
})

onBeforeUnmount(() => {
  renderToken += 1
  observer?.disconnect()
  observer = null
  shouldLoad.value = false
  cancelRender()
})
</script>

<template>
  <div
    ref="root"
    role="button"
    tabindex="0"
    class="pdf-first-page"
    :class="{ failed, rendered }"
    :style="coverStyle"
    @click="emit('open')"
    @keydown.enter="emit('open')"
    @keydown.space.prevent="emit('open')"
  >
    <PrimeSkeleton v-if="loading && !failed" class="pdf-skeleton" height="100%" />
    <canvas v-show="rendered && !failed" ref="canvas" class="pdf-canvas" :aria-label="title" />

    <span v-if="pageLabel && !failed" class="page-count">{{ pageLabel }}</span>

    <span v-if="failed" class="failed-state">
      <b>PDF 预览失败</b>
      <PrimeButton severity="secondary" size="small" text rounded title="重试 PDF 预览" @click.stop="retry">
        <RotateCcw :size="14" />
        <span>重试</span>
      </PrimeButton>
    </span>

    <span v-else-if="!safeSource" class="failed-state">
      <b>PDF 预览失败</b>
    </span>
  </div>
</template>

<style scoped>
.pdf-first-page {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: var(--pdf-preview-height);
  min-height: var(--pdf-preview-height);
  overflow: hidden;
  border-radius: 16px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.82), rgba(255, 246, 232, 0.42)),
    rgba(255, 255, 255, 0.28);
  cursor: pointer;
}

.pdf-skeleton {
  position: absolute;
  inset: 0;
}

.pdf-canvas {
  position: relative;
  z-index: 1;
  max-width: calc(100% - 20px);
  max-height: calc(100% - 20px);
  object-fit: contain;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 16px 28px rgba(80, 42, 16, 0.13);
}

.page-count {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 2;
  padding: 4px 8px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: #70421d;
  font-size: 11px;
  font-weight: 950;
  box-shadow: 0 8px 16px rgba(80, 42, 16, 0.11);
}

.failed-state {
  position: relative;
  z-index: 2;
  display: grid;
  gap: 8px;
  justify-items: center;
  color: #9b3d32;
  font-size: 12px;
  font-weight: 950;
}

.failed-state :deep(.p-button) {
  padding: 4px 8px;
}
</style>
