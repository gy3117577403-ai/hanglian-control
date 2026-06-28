<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus } from 'lucide-vue-next'
import { resolveFileUrl } from '@/lib/format'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
const zoom = ref(1)
const loadFailed = ref(false)

const items = computed(() => store.selectedModule?.items ?? [])
const currentIndex = computed(() => items.value.findIndex((item) => item.itemId === store.selectedDrawingItem?.itemId))
const currentNumber = computed(() => Math.max(currentIndex.value + 1, 1))
const previewSource = computed(() => resolveFileUrl(store.selectedDrawingItem?.previewUrl))
const hasPreviewSource = computed(() => Boolean(previewSource.value))
const isPdf = computed(() => store.selectedDrawingItem?.fileType === 'pdf')
const isImage = computed(() => store.selectedDrawingItem?.fileType === 'image')

function go(offset: number) {
  if (!items.value.length) return
  const nextIndex = (currentIndex.value + offset + items.value.length) % items.value.length
  store.selectedDrawingItem = items.value[nextIndex]
  zoom.value = 1
  loadFailed.value = false
}

function close() {
  zoom.value = 1
  loadFailed.value = false
  void store.goBack()
}
</script>

<template>
  <div class="image-viewer">
    <section v-if="store.selectedDrawingItem" class="viewer-card">
      <div class="viewer-toolbar">
        <PrimeButton severity="secondary" outlined rounded title="返回资料列表" aria-label="返回资料列表" @click="close">
          <ChevronLeft :size="19" />
        </PrimeButton>
        <b>第 {{ currentNumber }} 张 / 共 {{ items.length }} 张</b>
        <div class="zoom-actions">
          <PrimeButton severity="secondary" outlined rounded title="缩小" @click="zoom = Math.max(0.8, zoom - 0.2)">
            <Minus :size="17" />
          </PrimeButton>
          <span>{{ Math.round(zoom * 100) }}%</span>
          <PrimeButton severity="secondary" outlined rounded title="放大" @click="zoom = Math.min(1.8, zoom + 0.2)">
            <Plus :size="17" />
          </PrimeButton>
        </div>
      </div>
      <div class="viewer-layout">
        <PrimeButton severity="secondary" outlined rounded title="上一张" @click="go(-1)">
          <ChevronLeft :size="22" />
        </PrimeButton>
        <div class="large-preview">
          <div v-if="loadFailed" class="failed">图片加载失败，请返回资料列表重新打开。</div>
          <iframe
            v-else-if="hasPreviewSource && isPdf"
            class="real-preview pdf-preview"
            :src="previewSource"
            title="PDF 资料预览"
            :style="{ transform: `scale(${zoom})` }"
            @error="loadFailed = true"
          />
          <img
            v-else-if="hasPreviewSource && isImage"
            class="real-preview image-preview"
            :src="previewSource"
            :alt="store.selectedDrawingItem.title"
            loading="lazy"
            decoding="async"
            :style="{ transform: `scale(${zoom})` }"
            @error="loadFailed = true"
          >
          <div v-else class="preview-surface" :style="{ transform: `scale(${zoom})` }">
            <Maximize2 :size="54" />
            <b>{{ store.selectedDrawingItem.fileType === 'pdf' ? 'PDF 预览占位' : '图片预览占位' }}</b>
            <span>{{ store.selectedDrawingItem.fileName }}</span>
          </div>
        </div>
        <PrimeButton severity="secondary" outlined rounded title="下一张" @click="go(1)">
          <ChevronRight :size="22" />
        </PrimeButton>
      </div>
      <div class="viewer-info">
        <p>{{ store.selectedModule?.moduleName }}</p>
        <h2>{{ store.selectedDrawingItem.title }}</h2>
        <span>版本：{{ store.selectedDrawingItem.version }}</span>
        <span>来源：{{ store.selectedDrawingItem.source }}</span>
        <strong>{{ store.selectedDrawingItem.remark }}</strong>
      </div>
    </section>
  </div>
</template>

<style scoped>
.image-viewer {
  height: 100%;
  overflow: auto;
  padding-right: 2px;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  -webkit-overflow-scrolling: touch;
}

.viewer-card {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 12px;
  contain: layout paint style;
  min-height: 560px;
}

.viewer-toolbar,
.viewer-info {
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 20px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.52), rgba(255, 234, 204, 0.2)),
    rgba(255, 255, 255, 0.18);
  box-shadow:
    0 16px 30px rgba(80, 42, 16, 0.11),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px) saturate(1.16);
  -webkit-backdrop-filter: blur(20px) saturate(1.16);
}

.viewer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
}

.viewer-toolbar b {
  color: #342112;
  font-weight: 950;
}

.zoom-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  color: #70421d;
  font-weight: 950;
}

.viewer-layout {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 430px;
}

.large-preview {
  position: relative;
  display: grid;
  place-items: center;
  height: 100%;
  min-height: 430px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 24px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.8), rgba(255, 241, 221, 0.42)),
    radial-gradient(circle at 20% 12%, rgba(255, 255, 255, 0.86), transparent 35%),
    linear-gradient(315deg, rgba(214, 119, 47, 0.12), transparent 58%);
  color: #3c2817;
  box-shadow:
    0 26px 50px rgba(80, 42, 16, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.94),
    inset 0 -34px 72px rgba(197, 104, 40, 0.08);
  backdrop-filter: blur(22px) saturate(1.18);
  -webkit-backdrop-filter: blur(22px) saturate(1.18);
}

.large-preview::before {
  position: absolute;
  inset: 22px;
  border: 1px solid rgba(122, 76, 35, 0.12);
  border-radius: 18px;
  background:
    linear-gradient(90deg, rgba(122, 76, 35, 0.045) 1px, transparent 1px) 0 0 / 32px 32px,
    linear-gradient(0deg, rgba(122, 76, 35, 0.04) 1px, transparent 1px) 0 0 / 32px 32px;
  content: '';
}

.large-preview::after {
  position: absolute;
  inset: -28% auto auto -10%;
  width: 48%;
  height: 132%;
  background: linear-gradient(105deg, rgba(255, 255, 255, 0.52), rgba(255, 255, 255, 0.08) 60%, transparent);
  content: '';
  transform: rotate(12deg);
  pointer-events: none;
}

.real-preview,
.preview-surface {
  position: relative;
  z-index: 1;
  transition: transform 0.16s ease;
  transform-origin: center center;
}

.real-preview {
  width: min(92%, 900px);
  height: min(92%, 620px);
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow:
    0 24px 42px rgba(80, 42, 16, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.pdf-preview {
  min-height: 620px;
}

.image-preview {
  object-fit: contain;
}

.preview-surface {
  display: grid;
  gap: 10px;
  place-items: center;
  max-width: 76%;
}

.preview-surface b {
  font-size: 30px;
}

.preview-surface span {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.failed {
  position: relative;
  z-index: 1;
  padding: 18px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.44);
  font-weight: 950;
}

.viewer-info {
  padding: 14px;
}

p,
h2,
span,
strong {
  display: block;
  margin: 0;
}

p {
  color: #9b5125;
  font-weight: 950;
}

h2 {
  margin-top: 6px;
  color: #342112;
  font-size: 24px;
  font-weight: 950;
}

span,
strong {
  margin-top: 8px;
  color: #73512c;
  font-weight: 850;
}
</style>
