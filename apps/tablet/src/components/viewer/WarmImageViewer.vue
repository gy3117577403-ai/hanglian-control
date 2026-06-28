<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RotateCcw } from 'lucide-vue-next'
import { resolveDocumentPreviewUrl } from '@/lib/document-preview-url'
import type { DocumentViewerItem, ViewerFitMode } from '@/types/document-viewer'

const props = defineProps<{
  item: DocumentViewerItem
  zoom: number
  rotation: number
  fitMode: ViewerFitMode
}>()

const emit = defineEmits<{
  loading: [value: boolean]
  error: [message: string]
  fitZoom: [mode: ViewerFitMode, zoom: number]
  zoom: [zoom: number]
  previous: []
  next: []
}>()

const stage = ref<HTMLElement | null>(null)
const image = ref<HTMLImageElement | null>(null)
const loading = ref(true)
const failed = ref('')
const retrySeed = ref(0)
let resizeObserver: ResizeObserver | null = null
let touchStartX = 0
let touchStartY = 0

const source = computed(() => resolveDocumentPreviewUrl(props.item.previewUrl))
const transform = computed(() => `rotate(${props.rotation}deg) scale(${props.zoom})`)

function safeZoom(value: number) {
  if (!Number.isFinite(value)) return 1
  return Math.min(3, Math.max(0.5, value))
}

function updateFitZoom() {
  if (!stage.value || !image.value || props.fitMode === 'actual') return
  const width = image.value.naturalWidth || image.value.width
  const height = image.value.naturalHeight || image.value.height
  if (!width || !height) return
  const bounds = stage.value.getBoundingClientRect()
  const rotated = props.rotation % 180 !== 0
  const imageWidth = rotated ? height : width
  const imageHeight = rotated ? width : height
  const availableWidth = Math.max(bounds.width - 34, 1)
  const availableHeight = Math.max(bounds.height - 34, 1)
  const nextZoom = props.fitMode === 'width'
    ? safeZoom(availableWidth / imageWidth)
    : safeZoom(Math.min(availableWidth / imageWidth, availableHeight / imageHeight))
  if (Math.abs(nextZoom - props.zoom) > 0.01) emit('fitZoom', props.fitMode, nextZoom)
}

function startLoading() {
  loading.value = true
  failed.value = ''
  emit('loading', true)
  emit('error', '')
}

function finishLoading() {
  loading.value = false
  failed.value = ''
  emit('loading', false)
  void nextTick(updateFitZoom)
}

function failLoading() {
  loading.value = false
  failed.value = '图片加载失败，请检查文件或网络。'
  emit('loading', false)
  emit('error', failed.value)
}

function retry() {
  retrySeed.value += 1
  startLoading()
}

function onWheel(event: WheelEvent) {
  if (!event.ctrlKey) return
  event.preventDefault()
  const nextZoom = props.zoom + (event.deltaY < 0 ? 0.25 : -0.25)
  emit('zoom', safeZoom(nextZoom))
}

function onTouchStart(event: TouchEvent) {
  const touch = event.touches[0]
  touchStartX = touch?.clientX ?? 0
  touchStartY = touch?.clientY ?? 0
}

function onTouchEnd(event: TouchEvent) {
  const touch = event.changedTouches[0]
  if (!touch) return
  const dx = touch.clientX - touchStartX
  const dy = touch.clientY - touchStartY
  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.4) return
  if (dx > 0) emit('previous')
  else emit('next')
}

watch(() => [source.value, retrySeed.value], () => {
  startLoading()
})

watch(() => [props.fitMode, props.rotation], () => {
  void nextTick(updateFitZoom)
})

onMounted(() => {
  resizeObserver = new ResizeObserver(() => updateFitZoom())
  if (stage.value) resizeObserver.observe(stage.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<template>
  <div
    ref="stage"
    class="image-viewer-stage"
    @wheel="onWheel"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <PrimeSkeleton v-if="loading && !failed" class="viewer-skeleton" height="100%" />
    <img
      v-if="source && !failed"
      :key="`${source}-${retrySeed}`"
      ref="image"
      class="viewer-image"
      :src="source"
      :alt="item.title"
      loading="lazy"
      decoding="async"
      :style="{ transform }"
      @load="finishLoading"
      @error="failLoading"
    >
    <div v-if="failed || !source" class="viewer-error">
      <b>{{ failed || '图片加载失败，请检查文件或网络。' }}</b>
      <PrimeButton severity="secondary" rounded title="重新加载图片" @click="retry">
        <RotateCcw :size="16" />
        <span>重新加载</span>
      </PrimeButton>
    </div>
  </div>
</template>

<style scoped>
.image-viewer-stage {
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

.viewer-image {
  max-width: none;
  max-height: none;
  object-fit: contain;
  transform-origin: center center;
  transition: transform 0.14s ease;
  box-shadow: 0 30px 70px rgba(10, 8, 5, 0.34);
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
