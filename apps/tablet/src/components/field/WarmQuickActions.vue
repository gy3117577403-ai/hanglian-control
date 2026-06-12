<script setup lang="ts">
import { computed } from 'vue'
import {
  AlertTriangle,
  BadgeCheck,
  FileImage,
  FileText,
  ListChecks,
  MapPinned,
  PackageOpen,
  UploadCloud,
} from 'lucide-vue-next'
import { useProductionStore } from '@/stores/production-store'
import type { DocumentTab } from '@/types/production'

const emit = defineEmits<{
  'open-upload': []
  'open-feedback': []
  'focus-documents': []
}>()

const store = useProductionStore()

const activeFront = computed(() => store.activeProcess === 'front')

function openTab(tab: DocumentTab) {
  store.setDocumentTab(tab)
  const document = store.documents.find((item) => item.type === tab)
  if (document) store.previewDocument = document
  emit('focus-documents')
}

function onQuickAction(event: MouseEvent) {
  const action = (event.target as HTMLElement).closest<HTMLElement>('[data-field-action]')?.dataset.fieldAction
  if (!action) return
  if (action === 'front') store.setSegment('前段')
  if (action === 'back') store.setSegment('后段')
  if (action === 'drawing') openTab('drawing')
  if (action === 'sop') openTab('sop')
  if (action === 'pin-map') openTab('pin-map')
  if (action === 'upload') emit('open-upload')
  if (action === 'confirm') void store.confirmCurrentPlan()
  if (action === 'feedback') emit('open-feedback')
}
</script>

<template>
  <section class="quick-action-strip warm-enter" @click.capture="onQuickAction">
    <div class="quick-action-head">
      <div>
        <p class="section-kicker">FIELD SHORTCUTS</p>
        <h3>现场快捷操作</h3>
      </div>
      <PrimeTag :value="activeFront ? '前段优先' : '后段优先'" severity="info" />
    </div>

    <div class="quick-action-grid">
      <PrimeButton data-field-action="front" :class="{ 'quick-action-primary': activeFront }" severity="secondary" label="查看前段参数">
        <template #icon><ListChecks :size="18" /></template>
      </PrimeButton>
      <PrimeButton data-field-action="back" :class="{ 'quick-action-primary': !activeFront }" severity="secondary" label="查看后段资料">
        <template #icon><PackageOpen :size="18" /></template>
      </PrimeButton>
      <PrimeButton data-field-action="drawing" severity="secondary" label="打开图纸">
        <template #icon><FileText :size="18" /></template>
      </PrimeButton>
      <PrimeButton data-field-action="sop" severity="secondary" label="打开 SOP">
        <template #icon><FileImage :size="18" /></template>
      </PrimeButton>
      <PrimeButton data-field-action="pin-map" severity="secondary" label="查看孔位图">
        <template #icon><MapPinned :size="18" /></template>
      </PrimeButton>
      <PrimeButton data-field-action="upload" severity="secondary" label="上传资料">
        <template #icon><UploadCloud :size="18" /></template>
      </PrimeButton>
      <PrimeButton data-field-action="confirm" label="组长确认">
        <template #icon><BadgeCheck :size="18" /></template>
      </PrimeButton>
      <PrimeButton data-field-action="feedback" severity="danger" label="异常反馈">
        <template #icon><AlertTriangle :size="18" /></template>
      </PrimeButton>
    </div>
  </section>
</template>
