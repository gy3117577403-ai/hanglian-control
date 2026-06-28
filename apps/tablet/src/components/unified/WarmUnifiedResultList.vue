<script setup lang="ts">
import { CheckCircle2, Eye, FileText, History, Pencil, RotateCcw, ShieldAlert, Trash2 } from 'lucide-vue-next'
import { useUnifiedDocumentStore } from '@/stores/unified-document-store'
import type { UnifiedDocumentItem } from '@/types/production'

const store = useUnifiedDocumentStore()

const emit = defineEmits<{
  edit: [item: UnifiedDocumentItem]
  delete: [item: UnifiedDocumentItem]
  restore: [item: UnifiedDocumentItem]
  purge: [item: UnifiedDocumentItem]
  effective: [item: UnifiedDocumentItem]
}>()

function label(type: string) {
  const labels: Record<string, string> = {
    drawing: '图纸',
    sop: 'SOP',
    pin_map: '孔位图',
    finished_image: '成品图',
    connector: '连接器',
    front_parameter: '前段参数',
    back_package: '后段资料',
    fixture: '治具',
    abnormal_case: '异常',
    quality_standard: '质量标准',
    other: '其他',
  }
  return labels[type] ?? type
}

function sourceLabel(source?: string) {
  if (source === 'manual_upload') return '本地上传'
  if (source === 'knowledge') return '知识库'
  if (source === 'mock') return '内置资料'
  return source || '本地资料'
}
</script>

<template>
  <section class="result-panel">
    <div class="result-header">
      <div>
        <p class="eyebrow">{{ store.viewingTrash ? '回收站资料' : '搜索结果' }}</p>
        <h2>{{ store.results.length }} 条资料</h2>
      </div>
      <PrimeButton severity="secondary" text @click="store.search()">刷新</PrimeButton>
    </div>

    <div v-if="store.loading" class="result-skeleton">
      <PrimeSkeleton v-for="index in 5" :key="index" height="120px" border-radius="14px" />
    </div>

    <div v-else class="result-list">
      <article
        v-for="item in store.results"
        :key="item.id"
        class="result-card"
        :class="{ selected: store.selectedItem?.id === item.id, deleted: item.deleted }"
        @click="store.selectItem(item.id)"
      >
        <label class="select-box" @click.stop>
          <input
            type="checkbox"
            :checked="store.selectedIds.includes(item.id)"
            @change="store.toggleSelected(item.id)"
          >
        </label>
        <div class="file-mark">
          <FileText :size="24" />
        </div>
        <div class="result-main">
          <div class="result-title-row">
            <h3>{{ item.title }}</h3>
            <span>{{ label(String(item.unifiedType)) }}</span>
          </div>
          <p>{{ item.productName || item.subtitle }}</p>
          <div class="result-meta">
            <b>{{ item.customerName || '未填客户' }}</b>
            <b>{{ item.productCode || '未填产品' }}</b>
            <b>{{ item.version || '未填版本' }}</b>
            <b>{{ item.status || '待确认' }}</b>
            <b>{{ item.previewAvailable ? '文件健康：可预览' : '文件健康：待补充' }}</b>
            <b>{{ sourceLabel(item.source) }}</b>
            <b>{{ item.updatedAt?.slice(0, 10) || '未记录时间' }}</b>
            <b v-if="item.deleted">已删除</b>
          </div>
          <div v-if="item.matchedFields.length" class="matched">
            命中：{{ item.matchedFields.join('、') }}
          </div>
        </div>
        <div class="result-actions" @click.stop>
          <PrimeButton text severity="secondary" title="预览资料" @click="store.selectItem(item.id)">
            <Eye :size="17" />
          </PrimeButton>
          <PrimeButton v-if="!item.deleted" text severity="secondary" title="编辑资料" @click="emit('edit', item)">
            <Pencil :size="17" />
          </PrimeButton>
          <PrimeButton v-if="!item.deleted" text severity="secondary" title="设为当前有效" @click="emit('effective', item)">
            <CheckCircle2 :size="17" />
          </PrimeButton>
          <PrimeButton v-if="!item.deleted" text severity="warning" title="移入回收站" @click="emit('delete', item)">
            <Trash2 :size="17" />
          </PrimeButton>
          <PrimeButton v-if="item.deleted" text severity="success" title="恢复资料" @click="emit('restore', item)">
            <RotateCcw :size="17" />
          </PrimeButton>
          <PrimeButton v-if="item.deleted" text severity="danger" title="彻底删除" @click="emit('purge', item)">
            <ShieldAlert :size="17" />
          </PrimeButton>
        </div>
      </article>
    </div>

    <div v-if="!store.loading && !store.results.length" class="empty-state">
      <History :size="34" />
      <h3>暂无资料</h3>
      <p>暂无资料。可以先上传图纸、SOP、孔位图、成品图，或通过数据导入中心导入资料。</p>
      <PrimeButton label="上传资料" @click="store.uploadDialogOpen = true" />
    </div>
  </section>
</template>

<style scoped>
.result-panel {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  padding: 14px;
  border: 1px solid rgba(139, 90, 42, 0.2);
  border-radius: 18px;
  background: rgba(255, 249, 239, 0.82);
  box-shadow: 0 18px 32px rgba(75, 38, 13, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.74);
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.eyebrow {
  margin: 0;
  color: #9b5125;
  font-size: 12px;
  font-weight: 950;
}

h2,
h3,
p {
  margin: 0;
}

h2 {
  font-size: 24px;
  font-weight: 950;
  color: #342316;
}

.result-skeleton,
.result-list {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  gap: 10px;
  overflow: auto;
  padding-right: 4px;
}

.result-card {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 118px;
  padding: 13px;
  border: 1px solid rgba(139, 90, 42, 0.14);
  border-radius: 15px;
  background: linear-gradient(145deg, rgba(255, 252, 245, 0.95), rgba(255, 238, 207, 0.72));
  cursor: pointer;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.result-card:hover,
.result-card.selected {
  transform: translateY(-2px);
  border-color: rgba(196, 95, 36, 0.42);
  box-shadow: 0 16px 28px rgba(108, 56, 22, 0.16);
}

.result-card.deleted {
  background: linear-gradient(145deg, rgba(255, 245, 234, 0.84), rgba(234, 210, 184, 0.7));
}

.select-box input {
  width: 20px;
  height: 20px;
  accent-color: #c65f24;
}

.file-mark {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(145deg, #f2a33d, #c45f24);
  color: #fff8ed;
  box-shadow: 0 10px 18px rgba(151, 73, 24, 0.22);
}

.result-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.result-title-row h3 {
  overflow: hidden;
  color: #342316;
  font-size: 18px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-title-row span {
  flex: 0 0 auto;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(196, 95, 36, 0.12);
  color: #8b441f;
  font-size: 12px;
  font-weight: 950;
}

.result-main > p {
  overflow: hidden;
  margin-top: 3px;
  color: #73512c;
  font-size: 13px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.result-meta b,
.matched {
  padding: 4px 7px;
  border-radius: 999px;
  background: rgba(255, 245, 226, 0.86);
  color: #6c421f;
  font-size: 12px;
  font-weight: 900;
}

.matched {
  display: inline-block;
  margin-top: 6px;
  color: #2f6a45;
}

.result-actions {
  display: grid;
  grid-template-columns: repeat(2, 36px);
  gap: 4px;
}

.empty-state {
  display: grid;
  place-items: center;
  min-height: 300px;
  color: #8a6239;
  text-align: center;
}

.empty-state h3 {
  margin-top: 10px;
  font-size: 22px;
  font-weight: 950;
  color: #5c3419;
}

.empty-state p {
  max-width: 390px;
  margin-top: 6px;
  margin-bottom: 12px;
  font-weight: 850;
}
</style>
