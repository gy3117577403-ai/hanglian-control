<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, X } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
const zoom = ref(1)
const loadFailed = ref(false)

const items = computed(() => store.selectedModule?.items ?? [])
const currentIndex = computed(() => items.value.findIndex((item) => item.itemId === store.selectedDrawingItem?.itemId))
const currentNumber = computed(() => Math.max(currentIndex.value + 1, 1))

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
        <PrimeButton severity="secondary" outlined rounded title="关闭" @click="close">
          <X :size="19" />
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
          <div v-if="loadFailed" class="failed">图片加载失败，请返回模块详情重新打开。</div>
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
  height: calc(100% - 58px);
  overflow: auto;
  padding-right: 2px;
}

.viewer-card {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 12px;
  min-height: 560px;
}

.viewer-toolbar,
.viewer-info {
  border: 1px solid rgba(139, 90, 42, 0.16);
  border-radius: 18px;
  background: rgba(255, 250, 241, 0.9);
  box-shadow: 0 12px 22px rgba(80, 42, 16, 0.1);
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
  display: grid;
  place-items: center;
  height: 100%;
  min-height: 430px;
  overflow: hidden;
  border: 1px solid rgba(139, 90, 42, 0.16);
  border-radius: 20px;
  background: linear-gradient(145deg, #f5b65e, #be6427);
  color: #fff8ed;
  box-shadow: 0 16px 30px rgba(80, 42, 16, 0.12);
}

.preview-surface {
  display: grid;
  gap: 10px;
  place-items: center;
  max-width: 76%;
  transition: transform 0.16s ease;
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
  padding: 18px;
  border-radius: 14px;
  background: rgba(255, 250, 241, 0.18);
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
