<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  Scan,
  Shrink,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-vue-next'
import type { ViewerMode } from '@/types/document-viewer'

const props = defineProps<{
  mode: ViewerMode
  activeItemIndex: number
  itemCount: number
  activePage: number
  pageCount: number
  zoomPercent: string
  fullscreen: boolean
  hasDownload: boolean
}>()

const emit = defineEmits<{
  previous: []
  next: []
  zoomIn: []
  zoomOut: []
  reset: []
  fitWidth: []
  fitPage: []
  rotateClockwise: []
  rotateCounterClockwise: []
  fullscreen: []
  download: []
  close: []
}>()

function positionLabel() {
  if (props.mode === 'pdf') return `第 ${props.activePage} 页 / 共 ${props.pageCount} 页`
  if (props.mode === 'image') return `第 ${props.activeItemIndex + 1} 张 / 共 ${props.itemCount} 张`
  return `第 ${props.activeItemIndex + 1} 项 / 共 ${props.itemCount} 项`
}
</script>

<template>
  <div class="viewer-toolbar">
    <div class="toolbar-group">
      <PrimeButton severity="secondary" rounded title="上一页 / 上一张" aria-label="上一页 / 上一张" @click="emit('previous')">
        <ChevronLeft :size="20" />
      </PrimeButton>
      <span class="position-label">{{ positionLabel() }}</span>
      <PrimeButton severity="secondary" rounded title="下一页 / 下一张" aria-label="下一页 / 下一张" @click="emit('next')">
        <ChevronRight :size="20" />
      </PrimeButton>
    </div>

    <div class="toolbar-group">
      <PrimeButton severity="secondary" rounded title="缩小" aria-label="缩小" @click="emit('zoomOut')">
        <ZoomOut :size="19" />
      </PrimeButton>
      <span class="zoom-label">{{ zoomPercent }}</span>
      <PrimeButton severity="secondary" rounded title="放大" aria-label="放大" @click="emit('zoomIn')">
        <ZoomIn :size="19" />
      </PrimeButton>
      <PrimeButton severity="secondary" rounded title="重置 100%" aria-label="重置 100%" @click="emit('reset')">
        <Shrink :size="19" />
      </PrimeButton>
      <PrimeButton severity="secondary" rounded title="适合宽度" aria-label="适合宽度" @click="emit('fitWidth')">
        <Scan :size="19" />
      </PrimeButton>
      <PrimeButton severity="secondary" rounded title="适合页面" aria-label="适合页面" @click="emit('fitPage')">
        <Maximize2 :size="19" />
      </PrimeButton>
    </div>

    <div class="toolbar-group">
      <PrimeButton severity="secondary" rounded title="逆时针旋转 90°" aria-label="逆时针旋转 90°" @click="emit('rotateCounterClockwise')">
        <RotateCcw :size="19" />
      </PrimeButton>
      <PrimeButton severity="secondary" rounded title="顺时针旋转 90°" aria-label="顺时针旋转 90°" @click="emit('rotateClockwise')">
        <RotateCw :size="19" />
      </PrimeButton>
      <PrimeButton severity="secondary" rounded :title="fullscreen ? '退出全屏' : '全屏查看'" :aria-label="fullscreen ? '退出全屏' : '全屏查看'" @click="emit('fullscreen')">
        <Minimize2 v-if="fullscreen" :size="19" />
        <Maximize2 v-else :size="19" />
      </PrimeButton>
      <PrimeButton severity="secondary" rounded title="下载当前文件" aria-label="下载当前文件" :disabled="!hasDownload" @click="emit('download')">
        <Download :size="19" />
      </PrimeButton>
      <PrimeButton severity="danger" rounded title="关闭查看器" aria-label="关闭查看器" @click="emit('close')">
        <X :size="20" />
      </PrimeButton>
    </div>
  </div>
</template>

<style scoped>
.viewer-toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  overflow-x: auto;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 18px;
  background:
    linear-gradient(120deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.04) 48%, transparent),
    rgba(48, 42, 36, 0.72);
  box-shadow:
    0 16px 30px rgba(13, 9, 5, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.toolbar-group {
  display: flex;
  flex: 0 0 auto;
  gap: 6px;
  align-items: center;
  min-width: 0;
}

.viewer-toolbar :deep(.p-button) {
  width: 48px;
  height: 48px;
  min-width: 48px;
  min-height: 48px;
  padding: 0;
  border-color: rgba(255, 255, 255, 0.2) !important;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.04)),
    rgba(124, 84, 44, 0.42) !important;
  color: #fff6e8 !important;
}

.viewer-toolbar :deep(.p-button:disabled) {
  opacity: 0.38;
}

.position-label,
.zoom-label {
  flex: 0 0 auto;
  min-width: max-content;
  padding: 0 10px;
  color: #fff0d8;
  font-size: 13px;
  font-weight: 950;
  white-space: nowrap;
}

.zoom-label {
  min-width: 58px;
  text-align: center;
}
</style>
