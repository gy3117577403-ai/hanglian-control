<script setup lang="ts">
import { Building2, FileText, PackageSearch } from 'lucide-vue-next'
import type { DrawingSearchResult } from '@/types/drawing-search'

const props = defineProps<{
  result: DrawingSearchResult
}>()

const emit = defineEmits<{
  select: [result: DrawingSearchResult]
}>()

function statusLabel(status?: string) {
  if (status === 'available') return '已有图纸'
  if (status === 'partial') return '资料不完整'
  if (status === 'no_drawing') return '未发图'
  return '资料'
}

function resultMeta() {
  if (props.result.resultType === 'customer') return `${props.result.productCount} 个产品`
  if (props.result.resultType === 'product') return `${statusLabel(props.result.drawingStatus)} · ${props.result.uploadedModuleCount}/${props.result.moduleCount} 模块`
  return `${props.result.moduleName} · ${props.result.version || '无版本'} · ${props.result.contentKind.toUpperCase()}`
}

function subtitle() {
  if (props.result.resultType === 'customer') return props.result.customerShortName
  if (props.result.resultType === 'product') return `${props.result.productName} · ${props.result.customerName}`
  return `${props.result.productModel} · ${props.result.customerName}`
}
</script>

<template>
  <button class="drawing-search-item" type="button" @click="emit('select', result)">
    <span class="result-icon" aria-hidden="true">
      <Building2 v-if="result.resultType === 'customer'" :size="18" />
      <PackageSearch v-else-if="result.resultType === 'product'" :size="18" />
      <FileText v-else :size="18" />
    </span>
    <span class="result-copy">
      <strong>{{ result.title }}</strong>
      <span>{{ subtitle() }}</span>
    </span>
    <span class="result-meta">{{ resultMeta() }}</span>
  </button>
</template>

<style scoped>
.drawing-search-item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  width: 100%;
  min-height: 52px;
  padding: 8px 10px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: #52301e;
  text-align: left;
  cursor: pointer;
  content-visibility: auto;
  contain-intrinsic-size: 52px;
}

.drawing-search-item:hover,
.drawing-search-item:focus-visible {
  background: rgba(255, 255, 255, 0.58);
  outline: none;
}

.result-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.62);
  color: #0e7972;
}

.result-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.result-copy strong,
.result-copy span,
.result-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-copy strong {
  font-size: 14px;
  font-weight: 950;
}

.result-copy span,
.result-meta {
  color: rgba(82, 48, 30, 0.72);
  font-size: 12px;
  font-weight: 800;
}

.result-meta {
  max-width: 150px;
}
</style>
