<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RotateCcw } from 'lucide-vue-next'
import type { PdfThumbnailQueue } from '@/composables/use-pdf-thumbnail-queue'
import type { PdfDocumentProxy, ThumbnailStatus } from '@/types/document-viewer'

const props = defineProps<{
  document: PdfDocumentProxy | null
  pageNumber: number
  active: boolean
  queue: PdfThumbnailQueue
}>()

const emit = defineEmits<{
  select: [pageNumber: number]
}>()

const root = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const status = ref<ThumbnailStatus>('idle')
const retrySeed = ref(0)
const visible = ref(false)
let observer: IntersectionObserver | null = null
let renderTask: { promise: Promise<void>; cancel: () => void } | null = null
let renderToken = 0

const thumbnailScale = 0.22

function clearCanvas() {
  if (!canvas.value) return
  const context = canvas.value.getContext('2d')
  context?.clearRect(0, 0, canvas.value.width, canvas.value.height)
  canvas.value.width = 0
  canvas.value.height = 0
}

function cancelRender() {
  renderToken += 1
  renderTask?.cancel()
  renderTask = null
  props.queue.cancel(props.pageNumber)
}

async function renderThumbnail(signal: AbortSignal) {
  if (!props.document || !canvas.value) return
  const token = ++renderToken
  status.value = 'loading'
  let abortHandler: (() => void) | null = null
  try {
    const page = await props.document.getPage(props.pageNumber)
    if (signal.aborted || token !== renderToken || !canvas.value) {
      page.cleanup?.()
      return
    }
    const scale = Math.min(0.25, Math.max(0.18, thumbnailScale))
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const viewport = page.getViewport({ scale: scale * dpr })
    const target = canvas.value
    target.width = Math.max(Math.floor(viewport.width), 1)
    target.height = Math.max(Math.floor(viewport.height), 1)
    target.style.width = `${Math.round(target.width / dpr)}px`
    target.style.height = `${Math.round(target.height / dpr)}px`
    const context = target.getContext('2d')
    if (!context) throw new Error('Canvas context is unavailable')
    renderTask = page.render({ canvasContext: context, viewport })
    abortHandler = () => renderTask?.cancel()
    signal.addEventListener('abort', abortHandler, { once: true })
    await renderTask.promise
    page.cleanup?.()
    if (signal.aborted || token !== renderToken) return
    status.value = 'done'
    props.queue.markRendered(props.pageNumber)
  } catch {
    if (!signal.aborted && token === renderToken) status.value = 'failed'
  } finally {
    if (abortHandler) signal.removeEventListener('abort', abortHandler)
    renderTask = null
  }
}

function scheduleRender() {
  if (!visible.value || !props.document || !canvas.value || status.value === 'done') return
  status.value = 'queued'
  void props.queue.enqueue(props.pageNumber, renderThumbnail)
}

function retry() {
  cancelRender()
  clearCanvas()
  status.value = 'idle'
  retrySeed.value += 1
  void nextTick(scheduleRender)
}

watch(() => [props.document, props.pageNumber, retrySeed.value] as const, () => {
  cancelRender()
  clearCanvas()
  status.value = 'idle'
  void nextTick(scheduleRender)
})

watch(visible, () => {
  void nextTick(scheduleRender)
})

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    visible.value = Boolean(entries[0]?.isIntersecting)
  }, { root: null, rootMargin: '160px 0px', threshold: 0.01 })
  if (root.value) observer.observe(root.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  cancelRender()
  clearCanvas()
})
</script>

<template>
  <button
    ref="root"
    type="button"
    class="pdf-thumbnail"
    :class="{ active }"
    :data-thumbnail-key="`pdf-${pageNumber}`"
    :aria-current="active ? 'page' : undefined"
    @click="emit('select', pageNumber)"
  >
    <span class="canvas-wrap">
      <PrimeSkeleton v-if="status === 'queued' || status === 'loading'" height="100%" />
      <canvas v-show="status === 'done'" ref="canvas" />
      <span v-if="status === 'idle'" class="thumb-state">等待加载</span>
      <span v-if="status === 'failed'" class="thumb-state failed">
        第 {{ pageNumber }} 页预览失败
        <span class="retry" @click.stop="retry">
          <RotateCcw :size="14" />
        </span>
      </span>
    </span>
    <b>第 {{ pageNumber }} 页</b>
  </button>
</template>

<style scoped>
.pdf-thumbnail {
  display: grid;
  gap: 7px;
  width: 116px;
  min-width: 116px;
  min-height: 154px;
  padding: 8px;
  border: 1px solid rgba(255, 223, 183, 0.24);
  border-radius: 14px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.035)),
    rgba(82, 58, 38, 0.42);
  color: #fff4df;
  cursor: pointer;
  text-align: center;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    0 12px 22px rgba(10, 7, 4, 0.18);
}

.pdf-thumbnail.active {
  border-color: rgba(255, 183, 86, 0.96);
  background:
    linear-gradient(145deg, rgba(255, 214, 151, 0.3), rgba(255, 255, 255, 0.08)),
    rgba(131, 82, 37, 0.62);
  box-shadow:
    0 0 0 2px rgba(255, 183, 86, 0.32),
    0 20px 32px rgba(22, 12, 5, 0.26),
    inset 0 1px 0 rgba(255, 255, 255, 0.26);
}

.canvas-wrap {
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  width: 100%;
  height: 120px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
}

canvas {
  max-width: 100%;
  max-height: 100%;
  background: #fff;
}

.thumb-state {
  display: grid;
  place-items: center;
  gap: 4px;
  padding: 8px;
  color: #e9caa0;
  font-size: 11px;
  font-weight: 900;
  line-height: 1.25;
}

.thumb-state.failed {
  color: #ffd0c2;
}

.retry {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
}

b {
  overflow: hidden;
  font-size: 12px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
