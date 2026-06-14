<script setup lang="ts">
import { computed } from 'vue'
import { toast } from 'vue-sonner'
import {
  AlertTriangle,
  BadgeCheck,
  BookOpenCheck,
  Copy,
  FileImage,
  FileText,
  ListChecks,
  MapPinned,
  PackageOpen,
  UploadCloud,
  Wrench,
} from 'lucide-vue-next'
import { PERMISSIONS } from '@/lib/permissions'
import { useAuthStore } from '@/stores/auth-store'
import { useProductionStore } from '@/stores/production-store'
import type { DocumentTab } from '@/types/production'

const emit = defineEmits<{
  'open-upload': []
  'open-feedback': []
  'focus-documents': []
  'open-knowledge': [tab: 'validation' | 'fixtures' | 'abnormal' | 'quality']
}>()

const store = useProductionStore()
const auth = useAuthStore()

const activeFront = computed(() => store.activeProcess === 'front')
const canUpload = computed(() => auth.hasPermission(PERMISSIONS.DOCUMENT_UPLOAD))
const canConfirm = computed(() => auth.hasPermission(PERMISSIONS.PLAN_CONFIRM))
const canFeedback = computed(() => auth.hasPermission(PERMISSIONS.PLAN_FEEDBACK))

function deny() {
  toast.error('当前角色无权执行该操作', {
    description: '请切换到具备权限的 Mock 演示角色。',
  })
}

function openTab(tab: DocumentTab) {
  store.setDocumentTab(tab)
  const document = store.documents.find((item) => item.type === tab)
  if (document) store.previewDocument = document
  emit('focus-documents')
}

function copyKnowledgeSummary() {
  const text = `${store.selectedPlan.productCode} ${store.selectedPlan.productName} / ${activeFront.value ? '前段' : '后段'}现场知识摘要：查看关联治具、常见异常、质量标准和推荐动作。`
  void navigator.clipboard?.writeText(text)
  toast.success('现场知识摘要已复制', { description: text })
}

function onQuickAction(event: MouseEvent) {
  const action = (event.target as HTMLElement).closest<HTMLElement>('[data-field-action]')?.dataset.fieldAction
  if (!action) return
  if (action === 'front') store.setSegment('前段')
  if (action === 'back') store.setSegment('后段')
  if (action === 'drawing') openTab('drawing')
  if (action === 'sop') openTab('sop')
  if (action === 'pin-map') openTab('pin-map')
  if (action === 'knowledge') emit('open-knowledge', 'validation')
  if (action === 'fixtures') emit('open-knowledge', 'fixtures')
  if (action === 'abnormal') emit('open-knowledge', 'abnormal')
  if (action === 'quality') emit('open-knowledge', 'quality')
  if (action === 'copy-knowledge') copyKnowledgeSummary()
  if (action === 'upload' && !canUpload.value) return deny()
  if (action === 'confirm' && !canConfirm.value) return deny()
  if (action === 'feedback' && !canFeedback.value) return deny()
  if (action === 'upload') emit('open-upload')
  if (action === 'confirm') void store.confirmCurrentPlan()
  if (action === 'feedback') emit('open-feedback')
}
</script>

<template>
  <section class="quick-action-strip warm-enter" @click.capture="onQuickAction">
    <div class="quick-action-head">
      <div>
        <p class="section-kicker">FIELD SHORTCUTS / V2.4</p>
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
      <PrimeButton data-field-action="knowledge" severity="secondary" label="打开现场知识">
        <template #icon><BookOpenCheck :size="18" /></template>
      </PrimeButton>
      <PrimeButton data-field-action="fixtures" severity="secondary" label="查看关联治具">
        <template #icon><Wrench :size="18" /></template>
      </PrimeButton>
      <PrimeButton data-field-action="abnormal" severity="secondary" label="查看常见异常">
        <template #icon><AlertTriangle :size="18" /></template>
      </PrimeButton>
      <PrimeButton data-field-action="quality" severity="secondary" label="查看质量标准">
        <template #icon><ListChecks :size="18" /></template>
      </PrimeButton>
      <PrimeButton data-field-action="copy-knowledge" severity="secondary" label="复制知识摘要">
        <template #icon><Copy :size="18" /></template>
      </PrimeButton>
      <PrimeButton data-field-action="upload" severity="secondary" label="上传资料" :disabled="!canUpload" title="当前角色无权执行该操作">
        <template #icon><UploadCloud :size="18" /></template>
      </PrimeButton>
      <PrimeButton data-field-action="confirm" label="组长确认" :disabled="!canConfirm" title="当前角色无权执行该操作">
        <template #icon><BadgeCheck :size="18" /></template>
      </PrimeButton>
      <PrimeButton data-field-action="feedback" severity="danger" label="异常反馈" :disabled="!canFeedback" title="当前角色无权执行该操作">
        <template #icon><AlertTriangle :size="18" /></template>
      </PrimeButton>
    </div>
  </section>
</template>
