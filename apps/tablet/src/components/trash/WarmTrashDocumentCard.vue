<script setup lang="ts">
import { computed } from 'vue'
import { Eye, FileText, RotateCcw, Trash2 } from 'lucide-vue-next'
import type { DrawingTrashItem } from '@/types/document-lifecycle'

const props = defineProps<{
  item: DrawingTrashItem
  actionDocumentId?: string
}>()

const emit = defineEmits<{
  restore: [item: DrawingTrashItem]
  purge: [item: DrawingTrashItem]
  preview: [item: DrawingTrashItem]
}>()

const actionLoading = computed(() => props.actionDocumentId === props.item.documentId)

function formatFileSize(value?: number) {
  if (!value) return '-'
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`
  if (value >= 1024) return `${Math.round(value / 1024)} KB`
  return `${value} B`
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function sourceLabel(source?: string) {
  if (source === 'manual_upload') return '手动上传'
  if (source === 'camera_capture') return '拍照上传'
  if (source === 'pdf_import') return 'PDF 导入'
  return source || '-'
}
</script>

<template>
  <article class="trash-card">
    <div class="trash-thumb">
      <FileText :size="26" />
      <span>{{ item.mimeType?.includes('image') ? '图片' : '资料' }}</span>
    </div>

    <div class="trash-main">
      <header>
        <div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.customerName || '-' }} / {{ item.productModel || item.productId }}</p>
        </div>
        <span class="source-pill">{{ sourceLabel(item.source) }}</span>
      </header>

      <dl>
        <div>
          <dt>模块</dt>
          <dd>{{ item.moduleName || item.moduleKey }}</dd>
        </div>
        <div>
          <dt>版本</dt>
          <dd>{{ item.version || '-' }}</dd>
        </div>
        <div>
          <dt>文件类型</dt>
          <dd>{{ item.mimeType || '-' }}</dd>
        </div>
        <div>
          <dt>文件大小</dt>
          <dd>{{ formatFileSize(item.fileSize) }}</dd>
        </div>
        <div>
          <dt>删除时间</dt>
          <dd>{{ formatDate(item.deletedAt) }}</dd>
        </div>
        <div>
          <dt>删除人</dt>
          <dd>{{ item.deletedBy || '-' }}</dd>
        </div>
      </dl>

      <p class="reason">删除原因：{{ item.deleteReason || '未填写' }}</p>
    </div>

    <div class="trash-actions">
      <PrimeButton
        v-if="item.previewAvailable"
        severity="secondary"
        outlined
        rounded
        title="查看"
        aria-label="查看"
        @click="emit('preview', item)"
      >
        <Eye :size="17" />
      </PrimeButton>
      <PrimeButton
        severity="success"
        outlined
        rounded
        title="恢复资料"
        aria-label="恢复资料"
        :loading="actionLoading"
        :disabled="item.canRestore === false"
        @click="emit('restore', item)"
      >
        <RotateCcw :size="17" />
      </PrimeButton>
      <PrimeButton
        severity="danger"
        outlined
        rounded
        title="彻底删除"
        aria-label="彻底删除"
        :loading="actionLoading"
        :disabled="item.canPurge === false"
        @click="emit('purge', item)"
      >
        <Trash2 :size="17" />
      </PrimeButton>
    </div>
  </article>
</template>

<style scoped>
.trash-card {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: stretch;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.86);
  border-radius: 18px;
  background:
    linear-gradient(118deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.12) 54%),
    rgba(255, 250, 242, 0.64);
  box-shadow:
    0 18px 34px rgba(80, 42, 16, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  content-visibility: auto;
  contain-intrinsic-size: 138px;
}

.trash-thumb {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 6px;
  border-radius: 14px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.8), rgba(231, 240, 229, 0.46));
  color: #8f4a22;
  font-size: 12px;
  font-weight: 950;
}

.trash-main {
  min-width: 0;
}

.trash-main header {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  justify-content: space-between;
}

h3,
p,
dl {
  margin: 0;
}

h3 {
  overflow: hidden;
  color: #342112;
  font-size: 17px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trash-main header p {
  margin-top: 3px;
  color: #805332;
  font-size: 13px;
  font-weight: 850;
}

.source-pill {
  flex: 0 0 auto;
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.68);
  color: #734822;
  font-size: 12px;
  font-weight: 950;
}

dl {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

dt {
  color: #a65a28;
  font-size: 11px;
  font-weight: 950;
}

dd {
  overflow: hidden;
  margin: 2px 0 0;
  color: #3d2815;
  font-size: 13px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reason {
  margin-top: 8px;
  color: #7b542c;
  font-size: 13px;
  font-weight: 850;
}

.trash-actions {
  display: flex;
  flex-direction: column;
  gap: 7px;
  justify-content: center;
}

.trash-actions :deep(.p-button) {
  width: 38px;
  height: 38px;
  min-height: 38px;
  padding: 0;
}

@media (max-width: 900px) {
  .trash-card {
    grid-template-columns: minmax(0, 1fr);
  }

  .trash-thumb {
    min-height: 72px;
  }

  .trash-actions {
    flex-direction: row;
    justify-content: flex-end;
  }

  dl {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
