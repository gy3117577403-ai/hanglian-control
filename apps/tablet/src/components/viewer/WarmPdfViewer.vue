<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RotateCcw } from 'lucide-vue-next'
import pdfjsUrl from 'pdfjs-dist/build/pdf.mjs?url'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { resolveDocumentPreviewUrl } from '@/lib/document-preview-url'
import type { DocumentViewerItem, ViewerFitMode } from '@/types/document-viewer'

type PdfPageProxy = {
  getViewport(input: { scale: number; rotation?: number }): { width: number; height: number }
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

const props = defineProps<{
  item: DocumentViewerItem
  activePage: number
  zoom: number
  rotation: number
  fitMode: ViewerFitMode
}>()

const emit = defineEmits<{
  pageCount: [count: number]
  loading: [value: boolean]
  error: [message: string]
  fitZoom: [mode: ViewerFitMode, zoom: number]
}>()

const stage = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const loading = ref(false)
const failed = ref('')
const retrySeed = ref(0)
let pdfjsPromise: Promise<PdfJsModule> | null = null
let loadingTask: PdfLoadingTask | null = null
let renderTask: { promise: Promise<void>; cancel: () => void } | null = null
let loadedDocument: PdfDocumentProxy | null = null
let loadedSource = ''
let resizeObserver: ResizeObserver | null = null
let renderToken = 0

const source = computed(() => resolveDocumentPreviewUrl(props.item.previewUrl))

function safeZoom(value: number) {
  if (!Number.isFinite(value)) return 1
  return Math.min(3, Math.max(0.5, value))
}

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
}

function destroyDocument() {
  cancelRender()
  void loadingTask?.destroy?.()
  loadingTask = null
  void loadedDocument?.destroy?.()
  loadedDocument = null
  loadedSource = ''
}

async function ensureDocument(token: number) {
  if (!source.value) throw new Error('PDF preview source is empty')
  if (loadedDocument && loadedSource === source.value) return loadedDocument
  destroyDocument()
  const pdfjs = await loadPdfJs()
  if (token !== renderToken) throw new Error('PDF render cancelled')
  loadingTask = pdfjs.getDocument({ url: source.value })
  const document = await loadingTask.promise
  if (token !== renderToken) {
    void document.destroy?.()
    throw new Error('PDF render cancelled')
  }
  loadedDocument = document
  loadedSource = source.value
  emit('pageCount', Math.max(1, Number(document.numPages) || 1))
  return document
}

function fitScale(bounds: DOMRect, viewport: { width: number; height: number }) {
  const availableWidth = Math.max(bounds.width - 28, 1)
  const availableHeight = Math.max(bounds.height - 28, 1)
  if (props.fitMode === 'width') return safeZoom(availableWidth / viewport.width)
  if (props.fitMode === 'page') return safeZoom(Math.min(availableWidth / viewport.width, availableHeight / viewport.height))
  return safeZoom(props.zoom)
}

async function renderPage() {
  if (!canvas.value || !stage.value) return
  const token = ++renderToken
  loading.value = true
  failed.value = ''
  emit('loading', true)
  emit('error', '')
  cancelRender()

  try {
    const document = await ensureDocument(token)
    const pageNumber = Math.min(Math.max(props.activePage, 1), Math.max(document.numPages, 1))
    const page = await document.getPage(pageNumber)
    if (token !== renderToken || !canvas.value || !stage.value) {
      page.cleanup?.()
      return
    }
    const baseViewport = page.getViewport({ scale: 1, rotation: props.rotation })
    const nextScale = fitScale(stage.value.getBoundingClientRect(), baseViewport)
    if (props.fitMode !== 'actual' && Math.abs(nextScale - props.zoom) > 0.01) {
      emit('fitZoom', props.fitMode, nextScale)
    }
    const dpr = window.devicePixelRatio || 1
    const viewport = page.getViewport({ scale: nextScale * dpr, rotation: props.rotation })
    const target = canvas.value
    target.width = Math.max(Math.floor(viewport.width), 1)
    target.height = Math.max(Math.floor(viewport.height), 1)
    target.style.width = `${Math.round(target.width / dpr)}px`
    target.style.height = `${Math.round(target.height / dpr)}px`
    const context = target.getContext('2d')
    if (!context) throw new Error('Canvas context is unavailable')
    renderTask = page.render({ canvasContext: context, viewport })
    await renderTask.promise
    page.cleanup?.()
    if (token !== renderToken) return
    loading.value = false
    emit('loading', false)
  } catch (error) {
    if (token !== renderToken) return
    loading.value = false
    failed.value = 'PDF 加载失败，请检查文件或网络。'
    emit('loading', false)
    emit('error', failed.value)
  }
}

function retry() {
  retrySeed.value += 1
  destroyDocument()
  void nextTick(renderPage)
}

watch(() => source.value, () => {
  destroyDocument()
  void nextTick(renderPage)
})

watch(() => [props.activePage, props.zoom, props.rotation, props.fitMode, retrySeed.value], () => {
  void nextTick(renderPage)
})

onMounted(() => {
  resizeObserver = new ResizeObserver(() => {
    void nextTick(renderPage)
  })
  if (stage.value) resizeObserver.observe(stage.value)
  void nextTick(renderPage)
})

onBeforeUnmount(() => {
  renderToken += 1
  resizeObserver?.disconnect()
  resizeObserver = null
  destroyDocument()
})
</script>

<template>
  <div ref="stage" class="pdf-viewer-stage">
    <PrimeSkeleton v-if="loading && !failed" class="viewer-skeleton" height="100%" />
    <canvas v-show="!loading && !failed" ref="canvas" class="pdf-page-canvas" />
    <div v-if="failed" class="viewer-error">
      <b>{{ failed }}</b>
      <PrimeButton severity="secondary" rounded title="重新加载 PDF" @click="retry">
        <RotateCcw :size="16" />
        <span>重新加载</span>
      </PrimeButton>
    </div>
  </div>
</template>

<style scoped>
.pdf-viewer-stage {
  position: relative;
  display: grid;
  place-items: center;
  min-width: 100%;
  min-height: 100%;
  overflow: auto;
  padding: 18px;
}

.viewer-skeleton {
  width: min(76%, 760px);
  min-height: 68vh;
}

.pdf-page-canvas {
  max-width: none;
  max-height: none;
  background: #fff;
  box-shadow: 0 30px 70px rgba(10, 8, 5, 0.38);
}

.viewer-error {
  display: grid;
  gap: 12px;
  place-items: center;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  color: #ffe8d2;
  font-weight: 950;
}
</style>
