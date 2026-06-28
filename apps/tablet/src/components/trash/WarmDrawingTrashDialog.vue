<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { RefreshCw, Search, X } from 'lucide-vue-next'
import WarmTrashDocumentCard from './WarmTrashDocumentCard.vue'
import { useProgressiveList } from '@/composables/use-progressive-list'
import { createWarmAsyncComponent } from '@/lib/async-components'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { DocumentViewerItem } from '@/types/document-viewer'
import type { DrawingTrashItem } from '@/types/document-lifecycle'
import type { DrawingModuleKey } from '@/types/production'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const store = useDocumentHubStore()
const confirm = useConfirm()
const keyword = ref('')
const customerId = ref('')
const productId = ref('')
const moduleKey = ref('')
const pageSize = ref(20)
const purgeVisible = ref(false)
const viewerOpen = ref(false)
const viewerInitialItemId = ref('')
const WarmPurgeDocumentDialog = createWarmAsyncComponent(() => import('./WarmPurgeDocumentDialog.vue'), {
  name: 'WarmPurgeDocumentDialog',
  label: '正在加载彻底删除确认...',
})
const WarmDocumentViewer = createWarmAsyncComponent(() => import('@/components/viewer/WarmDocumentViewer.vue'), {
  name: 'WarmDocumentViewer',
  label: '正在加载资料查看器...',
})

const moduleOptions: Array<{ label: string; value: DrawingModuleKey }> = [
  { label: '原图', value: 'original_drawing' },
  { label: 'SOP 指导书', value: 'sop' },
  { label: '成品图', value: 'finished_images' },
  { label: '辅料规格', value: 'accessory_specs' },
  { label: '注意事项', value: 'notes' },
  { label: '配套工装', value: 'tooling' },
]

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => {
    emit('update:visible', value)
    if (!value) {
      purgeVisible.value = false
      viewerOpen.value = false
    }
  },
})
const currentOffset = computed(() => Number(store.drawingTrashFilters.offset ?? 0))
const currentLimit = computed(() => Number(store.drawingTrashFilters.limit ?? pageSize.value))
const currentPage = computed(() => Math.floor(currentOffset.value / currentLimit.value) + 1)
const pageCount = computed(() => Math.max(1, Math.ceil(store.drawingTrashTotal / currentLimit.value)))
const canPrevious = computed(() => currentOffset.value > 0)
const canNext = computed(() => currentOffset.value + currentLimit.value < store.drawingTrashTotal)
const productOptions = computed(() => store.productModels.map((item) => ({
  label: item.productModel,
  value: item.productId,
})))
const customerOptions = computed(() => store.customers.map((item) => ({
  label: item.customerName,
  value: item.customerId,
})))
const trashViewerItems = computed<DocumentViewerItem[]>(() => (
  store.drawingTrashItems
    .filter((item) => item.previewAvailable)
    .map(toViewerItem)
))
const trashRows = computed(() => store.drawingTrashItems)
const {
  visibleItems: visibleTrashItems,
  onScroll: handleTrashScroll,
} = useProgressiveList(trashRows, {
  threshold: 30,
  initialCount: 20,
  step: 20,
})

function cleanFilters(offset = 0) {
  return {
    keyword: keyword.value.trim() || undefined,
    customerId: customerId.value || undefined,
    productId: productId.value || undefined,
    moduleKey: moduleKey.value || undefined,
    limit: pageSize.value,
    offset,
  }
}

async function load(offset = 0) {
  await store.loadDrawingTrash(cleanFilters(offset)).catch(() => undefined)
}

function resetFilters() {
  keyword.value = ''
  customerId.value = ''
  productId.value = ''
  moduleKey.value = ''
  void load(0)
}

function changePage(delta: number) {
  const nextOffset = Math.max(0, currentOffset.value + delta * currentLimit.value)
  void load(nextOffset)
}

function fileKind(item: DrawingTrashItem): 'pdf' | 'image' | 'text' | 'card' {
  const mimeType = item.mimeType ?? ''
  const name = item.originalFileName ?? item.title
  if (mimeType.includes('pdf') || /\.pdf$/i.test(name)) return 'pdf'
  if (mimeType.includes('image') || /\.(png|jpe?g|webp)$/i.test(name)) return 'image'
  return 'text'
}

function toViewerItem(item: DrawingTrashItem): DocumentViewerItem {
  const encodedId = encodeURIComponent(item.documentId)
  const kind = fileKind(item)
  return {
    itemId: item.documentId,
    documentId: item.documentId,
    title: item.title,
    fileType: kind,
    contentKind: kind,
    previewUrl: `/api/files/documents/${encodedId}/preview`,
    downloadUrl: `/api/files/documents/${encodedId}/download`,
    fileName: item.originalFileName || item.title,
    version: item.version || '-',
    remark: item.deleteReason ? `此资料当前位于回收站。删除原因：${item.deleteReason}` : '此资料当前位于回收站。',
    source: item.source || 'pdf_import',
    uploadedAt: item.deletedAt || new Date().toISOString(),
    inTrash: true,
  }
}

function previewTrashItem(item: DrawingTrashItem) {
  viewerInitialItemId.value = item.documentId
  viewerOpen.value = true
}

function restoreTrashItem(item: DrawingTrashItem) {
  confirm.require({
    header: '恢复资料',
    message: '资料将恢复到原产品和原模块，是否继续？',
    acceptLabel: '恢复资料',
    rejectLabel: '取消',
    acceptClass: 'p-button-success',
    accept: () => {
      void store.restoreDocument(item, {
        operatorId: 'local-tablet',
        operatorName: '本地平板',
      }).catch(() => undefined)
    },
  })
}

async function openPurge(item: DrawingTrashItem) {
  store.pendingPurgeItem = item
  try {
    await store.loadDeleteLockStatus()
  } catch {
    // Keep the purge dialog available so the backend error remains visible.
  }
  purgeVisible.value = true
}

watch(() => props.visible, (visible) => {
  if (!visible) return
  keyword.value = store.drawingTrashFilters.keyword ?? ''
  customerId.value = store.drawingTrashFilters.customerId ?? ''
  productId.value = store.drawingTrashFilters.productId ?? ''
  moduleKey.value = String(store.drawingTrashFilters.moduleKey ?? '')
  pageSize.value = Number(store.drawingTrashFilters.limit ?? 20)
  if (store.drawingTrashLoading) return
  void load(store.drawingTrashFilters.offset ?? 0)
})

watch(() => store.lastLifecycleResult, (result) => {
  if (!result?.purged) return
  if (viewerInitialItemId.value === result.documentId) {
    viewerOpen.value = false
    viewerInitialItemId.value = ''
  }
})
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    modal
    header="资料回收站"
    :style="{ width: '92vw', maxWidth: '1180px' }"
    :content-style="{ maxHeight: '72vh', overflow: 'auto' }"
    :draggable="false"
  >
    <section class="trash-dialog">
      <div class="trash-toolbar">
        <label class="search-field">
          <Search :size="17" />
          <PrimeInputText v-model="keyword" placeholder="搜索资料、文件、客户、产品" @keydown.enter="load(0)" />
        </label>
        <PrimeSelect
          v-model="customerId"
          class="filter-select"
          :options="customerOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="客户"
          @change="load(0)"
        />
        <PrimeSelect
          v-model="productId"
          class="filter-select"
          :options="productOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="产品"
          @change="load(0)"
        />
        <PrimeSelect
          v-model="moduleKey"
          class="filter-select"
          :options="moduleOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="模块"
          @change="load(0)"
        />
        <PrimeButton severity="secondary" outlined title="刷新" aria-label="刷新" :loading="store.drawingTrashLoading" @click="load(currentOffset)">
          <RefreshCw :size="17" />
        </PrimeButton>
        <PrimeButton severity="secondary" text title="关闭" aria-label="关闭" @click="dialogVisible = false">
          <X :size="18" />
        </PrimeButton>
      </div>

      <div v-if="store.drawingTrashError" class="trash-error">{{ store.drawingTrashError }}</div>

      <div v-if="store.drawingTrashLoading && !store.drawingTrashItems.length" class="trash-empty">
        正在加载回收站资料。
      </div>
      <div v-else-if="!store.drawingTrashItems.length" class="trash-empty">
        回收站暂无资料。
      </div>
      <div v-else class="trash-list" @scroll.passive="handleTrashScroll">
        <WarmTrashDocumentCard
          v-for="item in visibleTrashItems"
          :key="item.documentId"
          :item="item"
          :action-document-id="store.lifecycleActionDocumentId"
          @preview="previewTrashItem"
          @restore="restoreTrashItem"
          @purge="openPurge"
        />
      </div>
    </section>

    <template #footer>
      <div class="trash-footer">
        <span>共 {{ store.drawingTrashTotal }} 条 / 第 {{ currentPage }} 页，共 {{ pageCount }} 页</span>
        <div>
          <PrimeButton label="清空筛选" severity="secondary" text @click="resetFilters" />
          <PrimeButton label="上一页" severity="secondary" outlined :disabled="!canPrevious || store.drawingTrashLoading" @click="changePage(-1)" />
          <PrimeButton label="下一页" severity="secondary" outlined :disabled="!canNext || store.drawingTrashLoading" @click="changePage(1)" />
        </div>
      </div>
    </template>

    <WarmPurgeDocumentDialog v-if="purgeVisible" v-model:visible="purgeVisible" :item="store.pendingPurgeItem" />
    <WarmDocumentViewer
      v-if="viewerOpen"
      v-model:visible="viewerOpen"
      :items="trashViewerItems"
      :initial-item-id="viewerInitialItemId"
      module-name="资料回收站"
      product-model="回收站预览"
      @close="viewerOpen = false"
    />
  </PrimeDialog>
</template>

<style scoped>
.trash-dialog {
  display: grid;
  gap: 14px;
  min-height: min(58vh, 620px);
}

.trash-toolbar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(140px, 170px) minmax(140px, 170px) minmax(140px, 170px) auto auto;
  gap: 8px;
  align-items: center;
  padding-bottom: 8px;
  background: rgba(255, 250, 242, 0.96);
}

.search-field {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  min-width: 0;
  padding: 0 10px;
  border: 1px solid rgba(139, 90, 42, 0.12);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.68);
  color: #8f4a22;
}

.search-field :deep(.p-inputtext) {
  width: 100%;
  border: 0;
  background: transparent;
}

.filter-select {
  min-width: 0;
}

.trash-list {
  display: grid;
  gap: 10px;
  max-height: min(58vh, 620px);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
  -webkit-overflow-scrolling: touch;
}

.trash-empty,
.trash-error {
  display: grid;
  place-items: center;
  min-height: 220px;
  border: 1px dashed rgba(139, 90, 42, 0.22);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.48);
  color: #724722;
  font-weight: 950;
}

.trash-error {
  min-height: auto;
  padding: 12px;
  border-style: solid;
  background: rgba(255, 229, 224, 0.72);
  color: #a23e31;
}

.trash-footer {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.trash-footer span {
  color: #70421d;
  font-weight: 950;
}

.trash-footer div {
  display: flex;
  gap: 8px;
}

@media (max-width: 1100px) {
  .trash-toolbar {
    grid-template-columns: minmax(0, 1fr) minmax(140px, 1fr) minmax(140px, 1fr);
  }
}
</style>
