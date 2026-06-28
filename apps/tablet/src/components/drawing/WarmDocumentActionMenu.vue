<script setup lang="ts">
import { computed, ref } from 'vue'
import { MoreVertical } from 'lucide-vue-next'
import type { DrawingItem, DrawingModule } from '@/types/production'

const props = defineProps<{
  item?: DrawingItem | null
  module?: DrawingModule | null
  loading?: boolean
}>()

const emit = defineEmits<{
  edit: [item: DrawingItem, module: DrawingModule]
  setEffective: [item: DrawingItem, module: DrawingModule]
  setCover: [item: DrawingItem, module: DrawingModule]
  trash: [item: DrawingItem, module: DrawingModule]
}>()

const menu = ref<{ toggle: (event: Event) => void } | null>(null)
const formalSources = ['manual_upload', 'camera_capture', 'pdf_import']
const placeholderHint = '该资料为系统占位资料，暂不支持维护。'

const isFormal = computed(() => Boolean(props.item && formalSources.includes(props.item.source)))
const isFinishedImages = computed(() => props.module?.moduleKey === 'finished_images')
const documentStatus = computed(() => props.item?.documentStatus ?? props.item?.status)
const isEffective = computed(() => documentStatus.value === 'effective')
const isCover = computed(() => Boolean(props.item?.isCover || (
  props.module?.coverDocumentId &&
  props.item &&
  (props.module.coverDocumentId === props.item.itemId || props.module.coverDocumentId === props.item.documentId)
)))
const disabledReason = computed(() => {
  if (!props.item || !props.module) return '资料状态已变化，请刷新后重试。'
  if (!isFormal.value) return placeholderHint
  return ''
})
const canMaintain = computed(() => !props.loading && !disabledReason.value)

function openMenu(event: Event) {
  menu.value?.toggle(event)
}

function withTarget(action: (item: DrawingItem, module: DrawingModule) => void) {
  if (!props.item || !props.module || !canMaintain.value) return
  action(props.item, props.module)
}

const menuItems = computed(() => {
  const items = [
    {
      label: '编辑资料信息',
      disabled: !canMaintain.value,
      command: () => withTarget((item, module) => emit('edit', item, module)),
    },
  ]

  if (!isFinishedImages.value) {
    items.push({
      label: isEffective.value ? '当前有效' : '设为当前有效',
      disabled: !canMaintain.value || isEffective.value,
      command: () => withTarget((item, module) => emit('setEffective', item, module)),
    })
  }

  items.push(
    {
      label: isCover.value ? '首页封面' : '设为首页封面',
      disabled: !canMaintain.value || isCover.value,
      command: () => withTarget((item, module) => emit('setCover', item, module)),
    },
    {
      label: '移入回收站',
      disabled: !canMaintain.value,
      command: () => withTarget((item, module) => emit('trash', item, module)),
    },
  )
  return items
})
</script>

<template>
  <span class="document-action-menu">
    <button
      type="button"
      class="action-trigger"
      :title="disabledReason || '资料操作'"
      aria-label="资料操作"
      @click.stop="openMenu"
    >
      <MoreVertical :size="16" />
    </button>
    <PrimeMenu ref="menu" :model="menuItems" popup append-to="body" class="document-action-popup" />
  </span>
</template>

<style scoped>
.document-action-menu {
  display: inline-grid;
  place-items: center;
}

.action-trigger {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  min-width: 34px;
  min-height: 34px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 10px;
  background:
    linear-gradient(130deg, rgba(255, 255, 255, 0.66), rgba(255, 255, 255, 0.2)),
    rgba(255, 255, 255, 0.34);
  color: #8f4a22;
  cursor: pointer;
  box-shadow: 0 8px 14px rgba(80, 42, 16, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

:global(.document-action-popup) {
  z-index: 4300;
  min-width: 168px;
  border: 1px solid rgba(216, 137, 53, 0.24);
  border-radius: 14px;
  background: rgba(255, 252, 246, 0.98);
  box-shadow: 0 14px 32px rgba(72, 38, 13, 0.18);
}
</style>
