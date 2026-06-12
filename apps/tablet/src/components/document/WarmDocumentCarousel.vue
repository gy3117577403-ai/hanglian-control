<script setup lang="ts">
import { computed, nextTick, ref, watch, type ComponentPublicInstance } from 'vue'
import emblaCarouselVue from 'embla-carousel-vue'
import { FileImage, FileText, Image as ImageIcon, Layers3, MoreHorizontal, Wrench } from 'lucide-vue-next'
import { documentTypeLabel, sourceLabel } from '@/lib/format'
import { documentSeverity, documentStatusDotClass, documentStatusLabel, fileHealthClass, fileHealthLabel } from '@/lib/status-style'
import type { DocumentFileHealthItem, ProductDocument } from '@/types/production'

export type DocumentCardAction =
  | 'preview'
  | 'versions'
  | 'set-effective'
  | 'audit'
  | 'compare'
  | 'pending'
  | 'expired'
  | 'archive'

const props = defineProps<{
  documents: ProductDocument[]
  activeDocumentId?: string
  fileHealthById?: Map<string, DocumentFileHealthItem>
}>()

const emit = defineEmits<{
  select: [document: ProductDocument]
  action: [action: DocumentCardAction, document: ProductDocument, event?: Event]
}>()

const [emblaRef, emblaApi] = emblaCarouselVue({ align: 'start', containScroll: 'trimSnaps' })
const menu = ref<{ toggle: (event: Event) => void } | null>(null)
const menuDocument = ref<ProductDocument | null>(null)

const menuItems = computed(() => [
  { label: '查看版本', icon: 'pi pi-history', command: () => trigger('versions') },
  { label: '设为当前有效', icon: 'pi pi-check-circle', command: () => trigger('set-effective') },
  { label: '查看审计', icon: 'pi pi-list-check', command: () => trigger('audit') },
  { label: '对比版本', icon: 'pi pi-clone', command: () => trigger('compare') },
  { separator: true },
  { label: '标记为待确认', icon: 'pi pi-exclamation-circle', command: () => trigger('pending') },
  { label: '标记为已失效', icon: 'pi pi-ban', class: 'danger-menu-item', command: () => trigger('expired') },
  { label: '归档', icon: 'pi pi-box', class: 'danger-menu-item', command: () => trigger('archive') },
])

function iconFor(document: ProductDocument) {
  if (document.type === 'drawing') return FileText
  if (document.type === 'sop') return FileImage
  if (document.type === 'pin-map') return Layers3
  if (document.documentType === 'connector_manual') return Wrench
  return ImageIcon
}

function healthFor(document: ProductDocument) {
  return props.fileHealthById?.get(document.documentId ?? document.id)
}

function bindEmblaNode(element: Element | ComponentPublicInstance | null) {
  emblaRef.value = element instanceof HTMLElement ? element : undefined
}

function openMenu(event: Event, document: ProductDocument) {
  menuDocument.value = document
  menu.value?.toggle(event)
}

function trigger(action: DocumentCardAction) {
  if (!menuDocument.value) return
  emit('action', action, menuDocument.value)
}

function onCarouselClick(event: MouseEvent) {
  const action = (event.target as HTMLElement).closest<HTMLElement>('[data-carousel]')?.dataset.carousel
  if (action === 'prev') emblaApi.value?.scrollPrev()
  if (action === 'next') emblaApi.value?.scrollNext()
}

watch(
  () => props.documents.map((document) => document.id).join('|'),
  async () => {
    await nextTick()
    emblaApi.value?.reInit()
  },
)
</script>

<template>
  <div class="document-carousel">
    <div :ref="bindEmblaNode" class="embla">
      <div v-auto-animate class="embla__container">
        <article
          v-for="document in documents"
          :key="document.documentId ?? document.id"
          :class="[
            'document-tile-3d embla__slide p-3',
            activeDocumentId === document.id || activeDocumentId === document.documentId ? 'ring-2 ring-[#d9772b66]' : '',
          ]"
        >
          <div class="mb-3 flex items-start justify-between gap-2">
            <button
              type="button"
              class="grid h-11 w-11 place-items-center rounded-lg bg-[#d8752a] text-white shadow transition hover:-translate-y-0.5"
              @click="emit('select', document)"
            >
              <component :is="iconFor(document)" :size="22" />
            </button>
            <PrimeTag :value="documentStatusLabel(document)" :severity="documentSeverity(document)" />
          </div>

          <button type="button" class="block w-full text-left" @click="emit('select', document)">
            <h4 class="line-clamp-2 min-h-[44px] text-base font-black text-[#342316]">{{ document.title }}</h4>
            <p class="mt-2 text-sm font-bold text-[#76512a]">{{ document.version }} · {{ sourceLabel(document.source) }}</p>
            <p class="mt-2 line-clamp-2 text-xs font-semibold text-[#80552c]">{{ documentTypeLabel(document) }}</p>
          </button>

          <div :class="['mt-3 file-health-pill', fileHealthClass(healthFor(document)?.healthStatus)]">
            <i class="pi pi-wave-pulse" />
            <span>{{ fileHealthLabel(healthFor(document)?.healthStatus) }}</span>
          </div>

          <div class="mt-3 flex items-center justify-between gap-2">
            <span class="inline-flex items-center gap-2 text-xs font-black text-[#76512a]">
              <span :class="['h-2.5 w-2.5 rounded-full', documentStatusDotClass(document)]" />
              资料状态
            </span>
            <PrimeButton severity="secondary" aria-label="资料操作" @click="openMenu($event, document)">
              <template #icon><MoreHorizontal :size="18" /></template>
            </PrimeButton>
          </div>
        </article>
      </div>
    </div>

    <div class="mt-3 flex items-center justify-between" @click.capture="onCarouselClick">
      <PrimeButton data-carousel="prev" severity="secondary" icon="pi pi-chevron-left" label="上一份" />
      <PrimeButton data-carousel="next" severity="secondary" icon="pi pi-chevron-right" label="下一份" icon-pos="right" />
    </div>

    <PrimeMenu ref="menu" :model="menuItems" popup />
  </div>
</template>
