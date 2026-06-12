<script setup lang="ts">
import { computed, nextTick, watch } from 'vue'
import emblaCarouselVue from 'embla-carousel-vue'
import { FileImage, FileText, Image as ImageIcon, Layers3, RotateCcw } from 'lucide-vue-next'
import { documentSeverity, documentStatusLabel, documentTabLabel, sourceLabel } from '@/lib/status-style'
import { useProductionStore } from '@/stores/production-store'
import type { DocumentTab, ProductDocument } from '@/types/production'

const emit = defineEmits<{
  'open-upload': []
  'open-versions': []
  'open-audit': []
  'open-migration': []
}>()

const store = useProductionStore()
const [emblaRef, emblaApi] = emblaCarouselVue({ align: 'start', containScroll: 'trimSnaps' })

const tabs: Array<{ value: DocumentTab; label: string; icon: string }> = [
  { value: 'drawing', label: '图纸', icon: 'pi pi-file-pdf' },
  { value: 'sop', label: 'SOP', icon: 'pi pi-images' },
  { value: 'pin-map', label: '孔位图', icon: 'pi pi-sitemap' },
  { value: 'finish', label: '成品图', icon: 'pi pi-image' },
]

const activeDocs = computed(() => {
  const source = store.documents.length ? store.documents : store.selectedPlan.documents
  return source.filter((document) => document.type === store.activeDocumentTab)
})

const previewDocument = computed(() => {
  return store.previewDocument && store.previewDocument.type === store.activeDocumentTab
    ? store.previewDocument
    : activeDocs.value[0]
})

function setTab(value: string | number) {
  store.setDocumentTab(value as DocumentTab)
}

function onTabClick(event: MouseEvent) {
  const text = (event.target as HTMLElement).closest<HTMLElement>('[role="tab"]')?.textContent ?? ''
  const tab = tabs.find((item) => text.includes(item.label))
  if (tab) setTab(tab.value)
}

function onActionClick(event: MouseEvent) {
  const action = (event.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action
  if (action === 'upload') emit('open-upload')
  if (action === 'versions') void openVersions()
  if (action === 'audit') void openAudit()
  if (action === 'migration') void openMigration()
}

function onCarouselClick(event: MouseEvent) {
  const action = (event.target as HTMLElement).closest<HTMLElement>('[data-carousel]')?.dataset.carousel
  if (action === 'prev') emblaApi.value?.scrollPrev()
  if (action === 'next') emblaApi.value?.scrollNext()
}

function selectDocument(document: ProductDocument) {
  store.previewDocument = document
  void store.refreshDocumentDetail(document.documentId ?? document.id)
}

async function openVersions() {
  const document = previewDocument.value
  if (document) {
    store.previewDocument = document
    await store.loadDocumentVersions(document.documentId ?? document.id).catch(() => undefined)
  }
  emit('open-versions')
}

async function openAudit() {
  await store.loadAuditLogs({ planId: store.selectedPlan.id, limit: 30 }).catch(() => undefined)
  emit('open-audit')
}

async function openMigration() {
  await store.loadMigrationPreview().catch(() => undefined)
  emit('open-migration')
}

watch(
  () => store.activeDocumentTab,
  async () => {
    const document = activeDocs.value[0]
    if (document) store.previewDocument = document
    await nextTick()
    emblaApi.value?.reInit()
  },
)
</script>

<template>
  <section class="section-bay warm-enter min-h-0">
    <div class="section-title">
      <div>
        <p class="section-kicker">DOCUMENT PREVIEW DESK</p>
        <h3 class="text-xl font-black">资料预览台</h3>
      </div>
      <div class="flex gap-2" @click.capture="onActionClick">
        <PrimeButton data-action="upload" severity="secondary" icon="pi pi-upload" label="上传" />
        <PrimeButton data-action="versions" severity="secondary" icon="pi pi-history" label="版本" />
        <PrimeButton data-action="audit" severity="secondary" icon="pi pi-list-check" label="留痕" />
        <PrimeButton data-action="migration" severity="secondary" icon="pi pi-database" label="迁移" />
      </div>
    </div>

    <PrimeTabs :value="store.activeDocumentTab" @update:value="setTab" @click.capture="onTabClick">
      <PrimeTabList>
        <PrimeTab v-for="tab in tabs" :key="tab.value" :value="tab.value">
          <i :class="tab.icon" />
          <span class="ml-2 px-2">{{ tab.label }}</span>
        </PrimeTab>
      </PrimeTabList>
    </PrimeTabs>

    <div class="mt-3 grid grid-cols-[minmax(260px,0.38fr)_minmax(420px,0.62fr)] gap-3">
      <div class="min-w-0">
        <div ref="emblaRef" class="embla">
          <div v-auto-animate class="embla__container">
            <button
              v-for="document in activeDocs"
              :key="document.documentId ?? document.id"
              type="button"
              :class="[
                'document-tile-3d embla__slide p-3 text-left',
                previewDocument?.id === document.id ? 'ring-2 ring-[#d9772b66]' : '',
              ]"
              @click="selectDocument(document)"
            >
              <div class="mb-3 flex items-start justify-between gap-2">
                <div class="grid h-11 w-11 place-items-center rounded-lg bg-[#d8752a] text-white shadow">
                  <FileText v-if="document.type === 'drawing'" :size="22" />
                  <FileImage v-else-if="document.type === 'sop'" :size="22" />
                  <Layers3 v-else-if="document.type === 'pin-map'" :size="22" />
                  <ImageIcon v-else :size="22" />
                </div>
                <PrimeTag :value="documentStatusLabel(document)" :severity="documentSeverity(document)" />
              </div>
              <h4 class="line-clamp-2 min-h-[44px] text-base font-black text-[#342316]">{{ document.title }}</h4>
              <p class="mt-2 text-sm font-bold text-[#76512a]">{{ document.version }} · {{ sourceLabel(document.source) }}</p>
              <p class="mt-2 line-clamp-2 text-xs font-semibold text-[#80552c]">{{ document.description }}</p>
            </button>
          </div>
        </div>

        <div class="mt-3 flex items-center justify-between" @click.capture="onCarouselClick">
          <PrimeButton data-carousel="prev" severity="secondary" icon="pi pi-chevron-left" label="上一份" />
          <PrimeButton data-carousel="next" severity="secondary" icon="pi pi-chevron-right" label="下一份" icon-pos="right" />
        </div>
      </div>

      <div class="document-preview p-5">
        <div v-if="previewDocument" class="preview-paper flex h-full min-h-[255px] flex-col p-5">
          <div class="mb-4 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="section-kicker">{{ documentTabLabel(previewDocument.type) }}</p>
              <h4 class="truncate text-2xl font-black text-[#342316]">{{ previewDocument.title }}</h4>
              <p class="mt-1 text-sm font-bold text-[#76512a]">
                {{ previewDocument.version }} / {{ documentStatusLabel(previewDocument) }} / {{ sourceLabel(previewDocument.source) }}
              </p>
            </div>
            <PrimeTag :value="previewDocument.previewType === 'pdf' ? 'PDF 预览位' : '图片预览位'" severity="secondary" />
          </div>

          <div class="grid flex-1 place-items-center rounded-lg border border-dashed border-[#9a693633] bg-[#fff8e9]/78 p-5 text-center">
            <div>
              <FileText v-if="previewDocument.previewType === 'pdf'" class="mx-auto text-[#b45f22]" :size="58" />
              <ImageIcon v-else class="mx-auto text-[#b45f22]" :size="58" />
              <p class="mt-4 text-xl font-black text-[#3b2514]">{{ previewDocument.localMockLabel || '本地资料预览占位' }}</p>
              <p class="mx-auto mt-2 max-w-xl text-sm font-bold leading-6 text-[#78512a]">
                {{ previewDocument.mockPreviewText || previewDocument.description }}
              </p>
            </div>
          </div>
        </div>

        <div v-else class="grid h-full min-h-[255px] place-items-center text-center">
          <div>
            <RotateCcw class="mx-auto text-[#b45f22]" :size="48" />
            <p class="mt-3 text-lg font-black text-[#3b2514]">当前标签暂无资料</p>
            <p class="mt-1 text-sm font-bold text-[#76512a]">可通过本地上传添加 Mock 资料。</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

