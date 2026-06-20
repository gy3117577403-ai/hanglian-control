<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { AlertTriangle, FileText, Info, X } from 'lucide-vue-next'
import WarmImageViewer from './WarmImageViewer.vue'
import WarmPdfViewer from './WarmPdfViewer.vue'
import WarmThumbnailRail from './WarmThumbnailRail.vue'
import WarmViewerToolbar from './WarmViewerToolbar.vue'
import { useDocumentViewer } from '@/composables/use-document-viewer'
import { resolveDocumentDownloadUrl } from '@/lib/document-preview-url'
import type { DocumentViewerItem, PdfDocumentProxy, PdfDocumentReadyPayload } from '@/types/document-viewer'

const props = defineProps<{
  visible: boolean
  items: DocumentViewerItem[]
  initialItemId?: string
  moduleName?: string
  productModel?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  close: []
}>()

const viewer = useDocumentViewer()
const viewerRoot = ref<HTMLElement | null>(null)
const infoOpen = ref(false)
const thumbnailRailCollapsed = ref(false)
const fullscreenError = ref('')
const downloadError = ref('')
const previousBodyOverflow = ref('')
const pdfDocument = shallowRef<PdfDocumentProxy | null>(null)
let bodyLocked = false

const activeItem = computed(() => viewer.activeItem.value)
const activeItemInTrash = computed(() => Boolean(activeItem.value?.inTrash))
const hasDownload = computed(() => Boolean(resolveDocumentDownloadUrl(activeItem.value?.downloadUrl)))
const title = computed(() => activeItem.value?.title || props.moduleName || '资料查看')
const subtitle = computed(() => [props.productModel, props.moduleName].filter(Boolean).join(' / '))
const fileLabel = computed(() => {
  const item = activeItem.value
  if (!item) return '未知'
  const kind = item.contentKind ?? item.fileType
  if (kind === 'pdf') return 'PDF'
  if (kind === 'image') return '图片'
  if (kind === 'text' || kind === 'card') return '文本资料'
  return '不支持的资料'
})
const uploadedDate = computed(() => activeItem.value?.uploadedAt?.slice(0, 10) || '-')
const sourceLabel = computed(() => {
  const source = activeItem.value?.source
  if (source === 'manual_upload') return '手动上传'
  if (source === 'camera_capture') return '拍照上传'
  if (source === 'pdf_import') return 'PDF 导入'
  if (source === 'mock' || source === 'seed') return '演示资料'
  return source || '-'
})

function lockBodyScroll() {
  if (bodyLocked) return
  previousBodyOverflow.value = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  bodyLocked = true
}

function unlockBodyScroll() {
  if (!bodyLocked) return
  document.body.style.overflow = previousBodyOverflow.value
  bodyLocked = false
}

function resetViewerFromProps() {
  viewer.state.open = props.visible
  if (props.visible) {
    pdfDocument.value = null
    viewer.setItems(props.items, props.initialItemId)
    void nextTick(() => viewerRoot.value?.focus())
  }
}

function closeViewer() {
  if (document.fullscreenElement === viewerRoot.value) {
    void document.exitFullscreen().catch(() => undefined)
  }
  viewer.close()
  pdfDocument.value = null
  infoOpen.value = false
  fullscreenError.value = ''
  downloadError.value = ''
  emit('update:visible', false)
  emit('close')
}

async function toggleFullscreen() {
  fullscreenError.value = ''
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else if (viewerRoot.value?.requestFullscreen) {
      await viewerRoot.value.requestFullscreen()
    } else {
      fullscreenError.value = '当前浏览器不支持全屏查看。'
    }
  } catch {
    fullscreenError.value = '当前浏览器无法进入全屏。'
  }
}

function updateFullscreenState() {
  viewer.setFullscreen(document.fullscreenElement === viewerRoot.value)
}

function downloadActiveItem() {
  downloadError.value = ''
  const item = activeItem.value
  const href = resolveDocumentDownloadUrl(item?.downloadUrl)
  if (!item || !href) {
    downloadError.value = '当前资料暂无可下载文件。'
    return
  }
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  anchor.download = item.fileName || item.title
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
}

function setActiveItemIndex(index: number) {
  if (index < 0) return
  pdfDocument.value = null
  viewer.setActiveItemIndex(index)
}

function setActiveItemId(value: string) {
  const index = viewer.state.items.findIndex((item) => item.itemId === value)
  setActiveItemIndex(index)
}

function setActivePage(pageNumber: number) {
  viewer.setActivePage(pageNumber)
}

function setPdfDocument(payload: PdfDocumentReadyPayload) {
  if (payload.document) {
    pdfDocument.value = payload.document
    return
  }
  pdfDocument.value = null
}

watch(() => activeItem.value?.itemId, () => {
  pdfDocument.value = null
})

function isEditableTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null
  if (!element) return false
  return Boolean(element.closest('input, textarea, select, [contenteditable="true"]'))
}

function onKeydown(event: KeyboardEvent) {
  if (!props.visible || isEditableTarget(event.target)) return
  if (event.key === 'Escape') {
    event.preventDefault()
    closeViewer()
    return
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    viewer.previous()
    return
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    viewer.next()
    return
  }
  if (event.key === '+' || event.key === '=') {
    event.preventDefault()
    viewer.zoomIn()
    return
  }
  if (event.key === '-') {
    event.preventDefault()
    viewer.zoomOut()
    return
  }
  if (event.key === '0') {
    event.preventDefault()
    viewer.reset()
    return
  }
  if (event.key.toLowerCase() === 'r') {
    event.preventDefault()
    viewer.rotateClockwise()
  }
}

watch(() => props.visible, (visible) => {
  if (visible) {
    lockBodyScroll()
    resetViewerFromProps()
  } else {
    unlockBodyScroll()
    pdfDocument.value = null
    viewer.close()
  }
}, { immediate: true })

watch(() => [props.items, props.initialItemId] as const, () => {
  if (props.visible) resetViewerFromProps()
})

document.addEventListener('keydown', onKeydown)
document.addEventListener('fullscreenchange', updateFullscreenState)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('fullscreenchange', updateFullscreenState)
  if (document.fullscreenElement === viewerRoot.value) {
    void document.exitFullscreen().catch(() => undefined)
  }
  unlockBodyScroll()
  viewer.close()
})
</script>

<template>
  <Teleport to="body">
    <section
      v-if="visible"
      ref="viewerRoot"
      class="document-viewer-shell"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <header class="viewer-header">
        <div class="viewer-title">
          <FileText :size="22" />
          <div>
            <p>{{ subtitle }}</p>
            <h2>{{ title }}</h2>
          </div>
        </div>
        <label class="viewer-select">
          <span>资料</span>
          <PrimeSelect
            :options="viewer.state.items"
            option-label="title"
            option-value="itemId"
            :model-value="activeItem?.itemId"
            @update:model-value="setActiveItemId"
          />
        </label>
        <PrimeButton class="info-button" severity="secondary" rounded title="资料信息" aria-label="资料信息" @click="infoOpen = !infoOpen">
          <Info :size="20" />
        </PrimeButton>
        <PrimeButton severity="danger" rounded title="关闭查看器" aria-label="关闭查看器" @click="closeViewer">
          <X :size="20" />
        </PrimeButton>
      </header>

      <WarmViewerToolbar
        :mode="viewer.state.mode"
        :active-item-index="viewer.state.activeItemIndex"
        :item-count="viewer.state.items.length"
        :active-page="viewer.state.activePage"
        :page-count="viewer.state.pageCount"
        :zoom-percent="viewer.zoomPercent.value"
        :fullscreen="viewer.state.fullscreen"
        :has-download="hasDownload"
        @previous="viewer.previous"
        @next="viewer.next"
        @zoom-in="viewer.zoomIn"
        @zoom-out="viewer.zoomOut"
        @reset="viewer.reset"
        @fit-width="viewer.fitWidth"
        @fit-page="viewer.fitPage"
        @rotate-clockwise="viewer.rotateClockwise"
        @rotate-counter-clockwise="viewer.rotateCounterClockwise"
        @fullscreen="toggleFullscreen"
        @download="downloadActiveItem"
        @close="closeViewer"
      />

      <p v-if="activeItemInTrash" class="trash-viewer-note">此资料当前位于回收站。</p>

      <main class="viewer-main" :class="{ 'with-info': infoOpen, 'rail-collapsed': thumbnailRailCollapsed }">
        <WarmThumbnailRail
          v-model:collapsed="thumbnailRailCollapsed"
          :items="viewer.state.items"
          :active-item="activeItem"
          :active-item-index="viewer.state.activeItemIndex"
          :active-page="viewer.state.activePage"
          :page-count="viewer.state.pageCount"
          :mode="viewer.state.mode"
          :pdf-document="pdfDocument"
          @select-page="setActivePage"
          @select-item="setActiveItemIndex"
        />

        <section class="viewer-canvas">
          <WarmPdfViewer
            v-if="activeItem && viewer.state.mode === 'pdf'"
            :item="activeItem"
            :active-page="viewer.state.activePage"
            :zoom="viewer.state.zoom"
            :rotation="viewer.state.rotation"
            :fit-mode="viewer.state.fitMode"
            @page-count="viewer.setPageCount"
            @loading="viewer.setLoading"
            @error="viewer.setError"
            @fit-zoom="viewer.setFitZoom"
            @pdf-document="setPdfDocument"
          />
          <WarmImageViewer
            v-else-if="activeItem && viewer.state.mode === 'image'"
            :item="activeItem"
            :zoom="viewer.state.zoom"
            :rotation="viewer.state.rotation"
            :fit-mode="viewer.state.fitMode"
            @loading="viewer.setLoading"
            @error="viewer.setError"
            @fit-zoom="viewer.setFitZoom"
            @zoom="viewer.setZoom"
            @previous="viewer.previousItem"
            @next="viewer.nextItem"
          />
          <div v-else class="unsupported-panel">
            <AlertTriangle :size="34" />
            <b>当前资料暂不支持在线预览。</b>
            <span>可使用下载按钮在本地打开文件。</span>
          </div>
        </section>

        <aside v-if="infoOpen" class="info-panel">
          <h3>资料信息</h3>
          <dl>
            <div>
              <dt>标题</dt>
              <dd>{{ activeItem?.title || '-' }}</dd>
            </div>
            <div>
              <dt>文件</dt>
              <dd>{{ activeItem?.fileName || '-' }}</dd>
            </div>
            <div>
              <dt>类型</dt>
              <dd>{{ fileLabel }}</dd>
            </div>
            <div>
              <dt>版本</dt>
              <dd>{{ activeItem?.version || '-' }}</dd>
            </div>
            <div>
              <dt>来源</dt>
              <dd>{{ sourceLabel }}</dd>
            </div>
            <div>
              <dt>上传时间</dt>
              <dd>{{ uploadedDate }}</dd>
            </div>
            <div>
              <dt>备注</dt>
              <dd>{{ activeItem?.remark || activeItem?.description || '-' }}</dd>
            </div>
            <div v-if="activeItemInTrash">
              <dt>回收站状态</dt>
              <dd>此资料当前位于回收站。</dd>
            </div>
          </dl>
        </aside>
      </main>

      <p v-if="fullscreenError || downloadError || viewer.state.error" class="viewer-message">
        {{ fullscreenError || downloadError || viewer.state.error }}
      </p>
    </section>
  </Teleport>
</template>

<style scoped>
.document-viewer-shell {
  position: fixed;
  inset: 0;
  z-index: 4200;
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr) auto;
  gap: 10px;
  padding: 12px;
  background:
    linear-gradient(135deg, rgba(28, 22, 18, 0.96), rgba(38, 44, 43, 0.94)),
    rgba(20, 16, 13, 0.96);
  color: #fff7e8;
  outline: none;
}

.viewer-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 280px) auto auto;
  gap: 10px;
  align-items: center;
}

.viewer-title {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.viewer-title p,
.viewer-title h2 {
  margin: 0;
}

.viewer-title p {
  overflow: hidden;
  color: #f0c28d;
  font-size: 12px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.viewer-title h2 {
  overflow: hidden;
  color: #fff7e8;
  font-size: 20px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.viewer-select {
  display: grid;
  gap: 4px;
  color: #efd4b0;
  font-size: 12px;
  font-weight: 900;
}

.viewer-select :deep(.p-select) {
  width: 100%;
  min-height: 42px;
  border-color: rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.1);
  color: #fff7e8;
}

.viewer-header :deep(.p-button) {
  width: 46px;
  height: 46px;
  min-width: 46px;
  min-height: 46px;
}

.viewer-main {
  display: grid;
  grid-template-columns: minmax(132px, 150px) minmax(0, 1fr);
  gap: 10px;
  min-height: 0;
}

.trash-viewer-note {
  margin: -2px 0 0;
  padding: 8px 12px;
  border: 1px solid rgba(255, 193, 115, 0.24);
  border-radius: 14px;
  background: rgba(134, 78, 32, 0.24);
  color: #ffe4bd;
  font-weight: 950;
}

.viewer-main.rail-collapsed {
  grid-template-columns: 54px minmax(0, 1fr);
}

.viewer-main.with-info {
  grid-template-columns: minmax(132px, 150px) minmax(0, 1fr) minmax(260px, 320px);
}

.viewer-main.with-info.rail-collapsed {
  grid-template-columns: 54px minmax(0, 1fr) minmax(260px, 320px);
}

.viewer-canvas {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 18px;
  background:
    linear-gradient(120deg, rgba(255, 255, 255, 0.07), transparent 42%),
    rgba(11, 10, 9, 0.56);
}

.info-panel {
  min-width: 0;
  overflow: auto;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 18px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04)),
    rgba(65, 48, 36, 0.58);
}

.info-panel h3 {
  margin: 0 0 12px;
  font-size: 17px;
  font-weight: 950;
}

.info-panel dl {
  display: grid;
  gap: 12px;
  margin: 0;
}

.info-panel div {
  display: grid;
  gap: 4px;
}

.info-panel dt {
  color: #e4bd8e;
  font-size: 12px;
  font-weight: 900;
}

.info-panel dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  color: #fff7e8;
  font-weight: 850;
}

.unsupported-panel {
  display: grid;
  place-items: center;
  align-content: center;
  min-height: 100%;
  gap: 8px;
  padding: 28px;
  color: #ffe6c8;
  text-align: center;
}

.viewer-message {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid rgba(255, 193, 115, 0.22);
  border-radius: 14px;
  background: rgba(122, 72, 25, 0.28);
  color: #ffe1bd;
  font-weight: 900;
}

@media (max-width: 900px) {
  .document-viewer-shell {
    padding: 8px;
  }

  .viewer-header {
    grid-template-columns: minmax(0, 1fr) auto auto;
  }

  .viewer-select {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .viewer-main.with-info {
    grid-template-columns: minmax(0, 1fr);
  }

  .viewer-main,
  .viewer-main.rail-collapsed,
  .viewer-main.with-info,
  .viewer-main.with-info.rail-collapsed {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
  }

  .viewer-canvas {
    grid-row: 1;
  }

  .viewer-main :deep(.thumbnail-rail) {
    grid-row: 2;
  }

  .info-panel {
    grid-row: 3;
    max-height: 32vh;
  }
}
</style>
