<script setup lang="ts">
import { Eye, FileText, Image, UploadCloud } from 'lucide-vue-next'
import type { DrawingModule } from '@/types/production'

defineProps<{
  module: DrawingModule
}>()

const emit = defineEmits<{
  open: [module: DrawingModule]
  upload: [module: DrawingModule]
}>()

function statusText(module: DrawingModule) {
  if (module.status === 'uploaded') return '已上传'
  if (module.status === 'no_drawing') return '未发图'
  return '待上传'
}

function firstType(module: DrawingModule) {
  return module.items[0]?.fileType === 'pdf' ? FileText : Image
}
</script>

<template>
  <article class="module-card" :class="{ missing: !module.items.length }">
    <div class="preview-tile" :class="{ empty: !module.items.length }">
      <component :is="firstType(module)" :size="32" />
      <b>{{ module.items[0]?.title || module.moduleName }}</b>
      <span>{{ module.items[0]?.fileType?.toUpperCase() || (module.moduleKey === 'original_drawing' ? '未发图' : '待上传') }}</span>
    </div>
    <div class="module-body">
      <div>
        <h3>{{ module.moduleName }}</h3>
        <p>
          <template v-if="module.moduleKey === 'original_drawing' && !module.items.length">
            后续可由企业微信微盘同步原图。
          </template>
          <template v-else>{{ module.remark }}</template>
        </p>
      </div>
      <div class="meta-row">
        <span :class="module.status">{{ statusText(module) }}</span>
        <span>共 {{ module.items.length }} 项</span>
        <span>{{ module.updatedAt.slice(0, 10) }}</span>
      </div>
      <div class="actions">
        <PrimeButton severity="secondary" outlined @click="emit('upload', module)">
          <UploadCloud :size="16" />
          <span>上传</span>
        </PrimeButton>
        <PrimeButton @click="emit('open', module)">
          <Eye :size="16" />
          <span>查看全部</span>
        </PrimeButton>
      </div>
    </div>
  </article>
</template>

<style scoped>
.module-card {
  display: grid;
  grid-template-columns: 138px minmax(0, 1fr);
  gap: 11px;
  height: 176px;
  padding: 11px;
  border: 1px solid rgba(139, 90, 42, 0.16);
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255, 252, 245, 0.96), rgba(255, 235, 205, 0.8));
  box-shadow: 0 14px 24px rgba(80, 42, 16, 0.12);
}

.module-card.missing {
  border-style: dashed;
}

.preview-tile {
  display: grid;
  align-content: end;
  gap: 5px;
  min-width: 0;
  padding: 12px;
  border-radius: 14px;
  background: linear-gradient(145deg, #f5b65e, #be6427);
  color: #fff8ed;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.38);
}

.preview-tile.empty {
  background: linear-gradient(145deg, #e5d7c2, #b89d7b);
}

.preview-tile b,
.preview-tile span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.module-body {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto auto;
  min-width: 0;
}

h3,
p {
  margin: 0;
}

h3 {
  color: #342112;
  font-size: 20px;
  font-weight: 950;
}

p {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 5px;
  color: #7b542c;
  font-size: 13px;
  font-weight: 850;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
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
  background: rgba(255, 246, 230, 0.9);
  color: #724722;
  font-size: 11px;
  font-weight: 950;
}

.meta-row .uploaded {
  color: #3f7a36;
}

.meta-row .pending {
  color: #a34f1f;
}

.meta-row .no_drawing {
  color: #9b3d32;
}

.actions {
  margin-top: 7px;
}

.actions :deep(.p-button) {
  min-height: 34px;
  border-radius: 11px;
  font-size: 12px;
  font-weight: 950;
}
</style>
