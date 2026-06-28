<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { FileText, Image, PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next'
import WarmImageThumbnail from './WarmImageThumbnail.vue'
import WarmPdfPageThumbnail from './WarmPdfPageThumbnail.vue'
import { usePdfThumbnailQueue } from '@/composables/use-pdf-thumbnail-queue'
import type { DocumentViewerItem, PdfDocumentProxy, ViewerMode } from '@/types/document-viewer'

const props = defineProps<{
  collapsed: boolean
  items: DocumentViewerItem[]
  activeItem: DocumentViewerItem | null
  activeItemIndex: number
  activePage: number
  pageCount: number
  mode: ViewerMode
  pdfDocument: PdfDocumentProxy | null
}>()

const emit = defineEmits<{
  'update:collapsed': [value: boolean]
  selectPage: [pageNumber: number]
  selectItem: [index: number]
}>()

const railRoot = ref<HTMLElement | null>(null)
const queue = usePdfThumbnailQueue(2)
let manualScrollUntil = 0

const visibleItems = computed(() => props.items.filter((item) => !item.deleted && !item.deletedAt))
const pageNumbers = computed(() => Array.from({ length: props.pageCount }, (_, index) => index + 1))
const imageItems = computed(() => visibleItems.value
  .map((item, index) => ({ item, index }))
  .filter(({ item }) => (item.contentKind ?? item.fileType) === 'image' && Boolean(item.previewUrl)))
const largePdfNotice = computed(() => props.mode === 'pdf' && props.pageCount > 200)
const showFileSelect = computed(() => visibleItems.value.length > 1)

function fileTypeLabel(item: DocumentViewerItem) {
  const kind = item.contentKind ?? item.fileType
  if (kind === 'pdf') return 'PDF'
  if (kind === 'image') return '图片'
  if (kind === 'text' || kind === 'card') return '资料'
  return '未知'
}

function selectItemById(value: string) {
  const index = props.items.findIndex((item) => item.itemId === value)
  if (index >= 0) emit('selectItem', index)
}

function markManualScroll() {
  manualScrollUntil = Date.now() + 450
}

function scrollActiveIntoView() {
  if (props.collapsed || Date.now() < manualScrollUntil) return
  const key = props.mode === 'pdf'
    ? `pdf-${props.activePage}`
    : props.mode === 'image' && props.activeItem
      ? `image-${props.activeItem.itemId}`
      : props.activeItem
        ? `item-${props.activeItem.itemId}`
        : ''
  if (!key) return
  const target = railRoot.value?.querySelector<HTMLElement>(`[data-thumbnail-key="${key}"]`)
  target?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
}

watch(() => [props.activePage, props.activeItemIndex, props.mode, props.collapsed] as const, () => {
  void nextTick(scrollActiveIntoView)
}, { immediate: true })

watch(() => [props.pdfDocument, props.activeItem?.itemId] as const, () => {
  queue.reset()
})

watch(() => props.collapsed, (collapsed) => {
  if (collapsed) queue.cancelAll()
  else void nextTick(scrollActiveIntoView)
})

onBeforeUnmount(() => {
  queue.cancelAll()
})
</script>

<template>
  <aside
    ref="railRoot"
    class="thumbnail-rail"
    :class="{ collapsed }"
    @scroll.passive="markManualScroll"
    @wheel.passive="markManualScroll"
    @pointerdown="markManualScroll"
    @touchstart.passive="markManualScroll"
  >
    <header class="rail-head">
      <button
        type="button"
        class="rail-toggle"
        :title="collapsed ? '展开缩略图' : '收起缩略图'"
        :aria-label="collapsed ? '展开缩略图' : '收起缩略图'"
        @click="emit('update:collapsed', !collapsed)"
      >
        <PanelLeftOpen v-if="collapsed" :size="20" />
        <PanelLeftClose v-else :size="20" />
      </button>
      <div v-if="!collapsed" class="rail-title">
        <b>缩略图</b>
        <span v-if="mode === 'pdf'">第 {{ activePage }} / {{ pageCount }} 页</span>
        <span v-else-if="mode === 'image'">{{ imageItems.length }} 张图片</span>
        <span v-else>{{ visibleItems.length }} 份资料</span>
      </div>
    </header>

    <template v-if="!collapsed">
      <label v-if="showFileSelect" class="rail-file-select">
        <span>当前资料</span>
        <PrimeSelect
          :options="visibleItems"
          option-label="title"
          option-value="itemId"
          :model-value="activeItem?.itemId"
          @update:model-value="selectItemById"
        >
          <template #option="{ option }">
            <div class="file-option">
              <Image v-if="fileTypeLabel(option) === '图片'" :size="15" />
              <FileText v-else :size="15" />
              <span>{{ option.title }}</span>
              <small>{{ fileTypeLabel(option) }} / {{ option.version || '无版本' }}</small>
            </div>
          </template>
          <template #value="{ value }">
            <span class="file-value">{{ visibleItems.find((item) => item.itemId === value)?.title || '选择资料' }}</span>
          </template>
        </PrimeSelect>
      </label>

      <p v-if="largePdfNotice" class="rail-notice">文档页数较多，缩略图将按需加载。</p>

      <div class="rail-body">
        <template v-if="mode === 'pdf' && pageNumbers.length">
          <WarmPdfPageThumbnail
            v-for="pageNumber in pageNumbers"
            :key="`${activeItem?.itemId || 'pdf'}-${pageNumber}`"
            :document="pdfDocument"
            :page-number="pageNumber"
            :active="pageNumber === activePage"
            :queue="queue"
            @select="emit('selectPage', $event)"
          />
        </template>

        <template v-else-if="mode === 'image' && imageItems.length">
          <WarmImageThumbnail
            v-for="({ item, index }, displayIndex) in imageItems"
            :key="item.itemId"
            :item="item"
            :index="index"
            :display-index="displayIndex"
            :active="index === activeItemIndex"
            @select="emit('selectItem', $event)"
          />
        </template>

        <template v-else-if="visibleItems.length">
          <button
            v-for="(item, index) in visibleItems"
            :key="item.itemId"
            type="button"
            class="document-card-thumbnail"
            :class="{ active: index === activeItemIndex }"
            :data-thumbnail-key="`item-${item.itemId}`"
            @click="emit('selectItem', index)"
          >
            <FileText :size="20" />
            <b>{{ item.title }}</b>
            <span>{{ fileTypeLabel(item) }} / {{ item.version || '无版本' }}</span>
          </button>
        </template>

        <div v-else class="empty-rail">暂无可预览内容</div>
      </div>
    </template>
  </aside>
</template>

<style scoped>
.thumbnail-rail {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  gap: 10px;
  overflow: hidden;
  min-width: 132px;
  max-width: 150px;
  min-height: 0;
  padding: 10px;
  border: 1px solid rgba(255, 224, 186, 0.18);
  border-radius: 18px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.035)),
    rgba(46, 35, 27, 0.72);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    0 18px 34px rgba(11, 8, 5, 0.24);
}

.thumbnail-rail.collapsed {
  grid-template-rows: auto;
  min-width: 54px;
  max-width: 54px;
  padding: 6px;
}

.rail-head {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.rail-toggle {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(255, 224, 186, 0.18);
  border-radius: 14px;
  background:
    linear-gradient(145deg, rgba(255, 214, 151, 0.18), rgba(255, 255, 255, 0.05)),
    rgba(108, 73, 39, 0.54);
  color: #fff2dc;
  cursor: pointer;
}

.rail-title {
  min-width: 0;
}

.rail-title b,
.rail-title span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rail-title b {
  color: #fff4df;
  font-size: 14px;
  font-weight: 950;
}

.rail-title span,
.rail-file-select > span,
.rail-notice {
  color: #e4bd8e;
  font-size: 11px;
  font-weight: 850;
}

.rail-file-select {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.rail-file-select :deep(.p-select) {
  width: 100%;
  min-height: 38px;
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.08);
}

.file-value {
  display: block;
  overflow: hidden;
  max-width: 88px;
  color: #fff4df;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 3px 7px;
  align-items: center;
  min-width: 0;
}

.file-option span,
.file-option small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-option small {
  grid-column: 2;
  color: #80572d;
  font-size: 11px;
  font-weight: 850;
}

.rail-notice {
  margin: 0;
  padding: 8px;
  border-radius: 12px;
  background: rgba(255, 185, 93, 0.12);
  line-height: 1.35;
}

.rail-body {
  display: grid;
  align-content: start;
  gap: 9px;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
  scrollbar-gutter: stable;
}

.rail-body::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.rail-body::-webkit-scrollbar-track {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
}

.rail-body::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(237, 183, 117, 0.36);
}

.document-card-thumbnail,
.empty-rail {
  display: grid;
  gap: 6px;
  width: 116px;
  min-width: 116px;
  min-height: 118px;
  padding: 10px;
  border: 1px solid rgba(255, 223, 183, 0.24);
  border-radius: 14px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.035)),
    rgba(82, 58, 38, 0.42);
  color: #fff4df;
  text-align: left;
}

.document-card-thumbnail {
  cursor: pointer;
}

.document-card-thumbnail.active {
  border-color: rgba(255, 183, 86, 0.96);
  box-shadow: 0 0 0 2px rgba(255, 183, 86, 0.32);
}

.document-card-thumbnail b,
.document-card-thumbnail span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.document-card-thumbnail b {
  font-size: 12px;
  font-weight: 950;
}

.document-card-thumbnail span,
.empty-rail {
  color: #e4bd8e;
  font-size: 11px;
  font-weight: 850;
}

.empty-rail {
  place-items: center;
  text-align: center;
}

@media (max-width: 900px) {
  .thumbnail-rail {
    grid-template-rows: auto auto auto minmax(0, 1fr);
    grid-template-columns: minmax(0, 1fr);
    max-width: none;
    min-height: 120px;
    max-height: 132px;
    min-width: 0;
  }

  .thumbnail-rail.collapsed {
    min-width: 0;
    max-width: none;
    min-height: 56px;
    max-height: 56px;
  }

  .rail-body {
    grid-auto-flow: column;
    grid-auto-columns: max-content;
    overflow-x: auto;
    overflow-y: hidden;
    padding-right: 0;
    padding-bottom: 2px;
  }

  .rail-head {
    justify-content: space-between;
  }
}
</style>
