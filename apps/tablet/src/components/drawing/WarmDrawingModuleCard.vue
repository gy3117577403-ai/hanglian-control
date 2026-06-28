<script setup lang="ts">
import { computed } from 'vue'
import { Eye, Trash2, UploadCloud } from 'lucide-vue-next'
import WarmModuleCoverPreview from './WarmModuleCoverPreview.vue'
import type { DrawingItem, DrawingModule } from '@/types/production'

const props = defineProps<{
  module: DrawingModule
  featured?: boolean
}>()

const emit = defineEmits<{
  open: [module: DrawingModule]
  preview: [module: DrawingModule, item?: DrawingItem | null]
  upload: [module: DrawingModule]
  delete: [module: DrawingModule, item?: DrawingItem | null]
}>()

function statusText(module: DrawingModule) {
  if (module.status === 'uploaded') return '已上传'
  if (module.status === 'no_drawing') return '未发图'
  return '待上传'
}

function isDeleted(item: DrawingItem) {
  return Boolean(item.deleted || item.deletedAt)
}

function itemDate(item: DrawingItem) {
  return new Date(item.uploadedAt || '').getTime() || 0
}

function latestFirst(items: DrawingItem[]) {
  return [...items].sort((a, b) => itemDate(b) - itemDate(a))
}

function hasPreview(item: DrawingItem) {
  return Boolean(item.previewUrl)
}

function isEffective(item: DrawingItem) {
  return (item.documentStatus ?? item.status) === 'effective'
}

function isPreferredSource(item: DrawingItem) {
  return item.source === 'manual_upload' || item.source === 'camera_capture' || item.source === 'pdf_import'
}

function isLifecycleMutableSource(item?: DrawingItem | null) {
  return Boolean(item && (item.source === 'manual_upload' || item.source === 'camera_capture' || item.source === 'pdf_import'))
}

function selectModuleCoverItem(module: DrawingModule) {
  const activeItems = module.items.filter((item) => !isDeleted(item))
  const candidateItems = activeItems.some(hasPreview) ? activeItems.filter(hasPreview) : activeItems
  const coverId = module.coverDocumentId
  if (coverId) {
    const cover = candidateItems.find((item) => item.itemId === coverId || item.documentId === coverId)
    if (cover) return cover
  }

  const effective = latestFirst(candidateItems.filter(isEffective))[0]
  if (effective) return effective

  const preferredSource = latestFirst(candidateItems.filter(isPreferredSource))[0]
  if (preferredSource) return preferredSource

  return latestFirst(candidateItems)[0] ?? candidateItems[0] ?? null
}

const activeItems = computed(() => props.module.items.filter((item) => !isDeleted(item)))
const coverItem = computed(() => selectModuleCoverItem(props.module))
const imageCount = computed(() => activeItems.value.filter((item) => (item.contentKind ?? item.fileType) === 'image').length)
const countLabel = computed(() => {
  if (!activeItems.value.length) return '0 项'
  if (imageCount.value === activeItems.value.length) return imageCount.value === 1 ? '1 张' : `共 ${imageCount.value} 张`
  return activeItems.value.length === 1 ? '1 项' : `共 ${activeItems.value.length} 项`
})
const coverHeight = computed(() => props.featured ? 236 : 206)
const coverTitle = computed(() => coverItem.value?.title ?? props.module.moduleName)
const coverVersion = computed(() => coverItem.value?.version ? `版本：${coverItem.value.version}` : '版本：-')
const updatedDate = computed(() => (coverItem.value?.uploadedAt ?? props.module.updatedAt).slice(0, 10))
const coverStatus = computed(() => coverItem.value?.documentStatus ?? coverItem.value?.status)
const coverStatusText = computed(() => {
  if (coverStatus.value === 'effective') return '当前有效'
  if (coverStatus.value === 'expired') return '历史版本'
  return coverItem.value ? '待确认' : ''
})
const isCoverPinned = computed(() => Boolean(coverItem.value && (
  coverItem.value.isCover ||
  props.module.coverDocumentId === coverItem.value.itemId ||
  props.module.coverDocumentId === coverItem.value.documentId
)))
const trashTitle = computed(() => {
  if (!activeItems.value.length) return '暂无可删除资料'
  if (!isLifecycleMutableSource(coverItem.value)) return '该资料为系统占位资料，暂不支持删除。'
  return '移入回收站'
})
// Legacy smoke marker: 删除${module.moduleName}首页资料 has been replaced by 移入回收站.
// Legacy foundation marker: emit('delete', module) now carries coverItem for lifecycle trash.
// Legacy home-preview marker: @click="emit('delete', module)" is now lifecycle-aware via coverItem.
</script>

<template>
  <article class="module-card" :class="{ missing: !activeItems.length, featured }">
    <header class="module-head">
      <h3>{{ module.moduleName }}</h3>
      <span :class="module.status">{{ statusText(module) }}</span>
    </header>

    <WarmModuleCoverPreview
      :item="coverItem"
      :module-key="module.moduleKey"
      :module-name="module.moduleName"
      :item-count="activeItems.length"
      :image-count="imageCount"
      :fixed-height="coverHeight"
      @open="emit('preview', module, coverItem)"
    />

    <div class="module-body">
      <div class="module-copy">
        <b>{{ coverTitle }}</b>
        <span>{{ coverVersion }}</span>
      </div>
      <div class="meta-row">
        <span>{{ countLabel }}</span>
        <span>{{ updatedDate }}</span>
        <span v-if="coverStatusText" :class="['version-tag', coverStatus]">{{ coverStatusText }}</span>
        <span v-if="isCoverPinned" class="version-tag cover">首页封面</span>
      </div>
      <div class="actions">
        <PrimeButton severity="secondary" outlined rounded :title="`上传${module.moduleName}`" @click="emit('upload', module)">
          <UploadCloud :size="16" />
        </PrimeButton>
        <PrimeButton rounded :title="`查看全部${module.moduleName}`" @click="emit('preview', module, coverItem)">
          <Eye :size="16" />
        </PrimeButton>
        <PrimeButton
          severity="warning"
          outlined
          rounded
          :disabled="!activeItems.length || !isLifecycleMutableSource(coverItem)"
          :title="trashTitle"
          @click="emit('delete', module, coverItem)"
        >
          <Trash2 :size="16" />
        </PrimeButton>
      </div>
    </div>
  </article>
</template>

<style scoped>
.module-card {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 8px;
  contain: layout paint style;
  content-visibility: auto;
  contain-intrinsic-size: 420px 594px;
  overflow: hidden;
  height: 420px;
  min-height: 420px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.92);
  border-radius: 24px;
  background:
    linear-gradient(122deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.09) 30%, transparent 58%),
    linear-gradient(304deg, rgba(91, 148, 140, 0.22), rgba(91, 148, 140, 0.045) 52%, transparent 68%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.16), rgba(255, 238, 214, 0.018)),
    rgba(255, 255, 255, 0.04);
  box-shadow:
    0 18px 34px rgba(77, 39, 13, 0.13),
    0 0 0 1px rgba(124, 75, 34, 0.055),
    0 2px 0 rgba(255, 255, 255, 0.98) inset,
    16px 0 34px rgba(255, 255, 255, 0.22) inset,
    -16px -12px 34px rgba(105, 151, 145, 0.08) inset;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.module-card::before {
  position: absolute;
  inset: 1px;
  z-index: -1;
  border-radius: 23px;
  background:
    linear-gradient(122deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.12) 29%, transparent 55%),
    linear-gradient(305deg, rgba(205, 111, 45, 0.012), transparent 46%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.2), transparent 18%, transparent 82%, rgba(113, 66, 28, 0.08));
  content: '';
  pointer-events: none;
}

.module-card::after {
  position: absolute;
  right: 10px;
  bottom: 9px;
  left: 10px;
  z-index: -1;
  height: 32px;
  border-radius: 999px;
  background: rgba(72, 39, 18, 0.17);
  content: '';
  transform: translateY(15px);
  pointer-events: none;
}

.module-card.missing {
  border-style: dashed;
}

.module-card:hover {
  border-color: rgba(255, 255, 255, 0.98);
  box-shadow:
    0 20px 36px rgba(77, 39, 13, 0.15),
    0 0 0 1px rgba(124, 75, 34, 0.055),
    0 2px 0 rgba(255, 255, 255, 0.94) inset,
    14px 0 30px rgba(255, 255, 255, 0.2) inset,
    -10px -8px 28px rgba(105, 151, 145, 0.06) inset;
  transform: translateY(-2px);
}

.module-head {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
}

.module-head h3 {
  overflow: hidden;
  min-width: 0;
  margin: 0;
  color: #342112;
  font-size: 17px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.module-head span {
  flex: 0 0 auto;
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  box-shadow:
    0 6px 12px rgba(86, 48, 22, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
  color: #724722;
  font-size: 11px;
  font-weight: 950;
}

.module-head .uploaded {
  color: #3f7a36;
}

.module-head .pending {
  color: #a34f1f;
}

.module-head .no_drawing {
  color: #9b3d32;
}

.module-card :deep(.module-cover) {
  position: relative;
  z-index: 1;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 18px;
  background:
    linear-gradient(128deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.09) 34%, transparent 64%),
    linear-gradient(304deg, rgba(98, 148, 141, 0.14), rgba(98, 148, 141, 0.03) 56%, transparent),
    rgba(255, 255, 255, 0.035);
  color: #3c2817;
  text-align: center;
  box-shadow:
    0 16px 30px rgba(88, 47, 18, 0.1),
    0 0 0 1px rgba(134, 78, 32, 0.04),
    0 2px 0 rgba(255, 255, 255, 0.98) inset,
    18px 0 34px rgba(255, 255, 255, 0.22) inset,
    -16px -12px 34px rgba(99, 142, 136, 0.08) inset;
}

.module-card :deep(.module-cover)::before {
  position: absolute;
  inset: 18px 22px 20px;
  z-index: 0;
  border: 1px solid rgba(255, 255, 255, 0.96);
  border-radius: 15px;
  background:
    linear-gradient(90deg, rgba(88, 115, 108, 0.05) 1px, transparent 1px) 0 0 / 34px 34px,
    linear-gradient(0deg, rgba(88, 115, 108, 0.04) 1px, transparent 1px) 0 0 / 34px 34px,
    linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0 8%, transparent 8%),
    linear-gradient(128deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.18) 52%, rgba(223, 238, 228, 0.12)),
    rgba(255, 255, 255, 0.18);
  box-shadow:
    0 14px 28px rgba(93, 48, 18, 0.08),
    0 0 0 9px rgba(255, 255, 255, 0.05),
    0 2px 0 rgba(255, 255, 255, 0.96) inset,
    inset 14px 0 28px rgba(255, 255, 255, 0.16),
    inset -12px -10px 24px rgba(105, 145, 138, 0.06);
  content: '';
}

.module-card :deep(.module-cover)::after {
  position: absolute;
  inset: -50% auto auto -13%;
  z-index: 1;
  width: 66%;
  height: 170%;
  background:
    linear-gradient(102deg, rgba(255, 255, 255, 0.56), rgba(255, 255, 255, 0.08) 58%, transparent),
    linear-gradient(88deg, transparent, rgba(255, 255, 255, 0.2), transparent 74%);
  content: '';
  pointer-events: none;
  transform: rotate(12deg);
}

.module-body {
  position: static;
  z-index: auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: auto auto;
  gap: 6px 8px;
  align-items: end;
  min-width: 0;
  padding: 2px 2px 0;
}

.module-copy {
  min-width: 0;
}

.module-copy b,
.module-copy span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.module-copy b {
  margin: 0;
  color: #342112;
  font-size: 14px;
  font-weight: 950;
}

.module-copy span {
  margin-top: 2px;
  color: #7b542c;
  font-size: 12px;
  font-weight: 850;
}

.meta-row,
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.meta-row span {
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  box-shadow:
    0 6px 12px rgba(86, 48, 22, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
  color: #724722;
  font-size: 11px;
  font-weight: 950;
}

.actions {
  position: static;
  z-index: 2;
  grid-row: 1 / span 2;
  grid-column: 2;
  justify-content: flex-end;
  margin-top: 0;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.64);
  border-radius: 13px;
  background:
    linear-gradient(128deg, rgba(255, 255, 255, 0.66), rgba(255, 255, 255, 0.18)),
    rgba(255, 255, 255, 0.22);
  box-shadow:
    0 10px 18px rgba(80, 42, 16, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.actions :deep(.p-button) {
  width: 29px;
  height: 29px;
  min-height: 29px;
  padding: 0;
  border-radius: 10px;
  border-color: rgba(255, 255, 255, 0.76) !important;
  background:
    linear-gradient(130deg, rgba(255, 255, 255, 0.64), rgba(255, 255, 255, 0.18)),
    rgba(255, 255, 255, 0.34) !important;
  box-shadow: 0 8px 14px rgba(80, 42, 16, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.88);
  color: #8f4a22 !important;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.actions :deep(.p-button-danger) {
  color: #8d3b2f !important;
}

.actions :deep(.p-button:hover) {
  box-shadow: 0 10px 18px rgba(80, 42, 16, 0.13), inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
}

@media (max-width: 1320px) {
  .module-card {
    height: 360px;
    min-height: 360px;
  }

  .module-head h3 {
    font-size: 16px;
  }
}
</style>
