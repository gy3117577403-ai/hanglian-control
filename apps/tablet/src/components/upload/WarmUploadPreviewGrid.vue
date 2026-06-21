<script setup lang="ts">
import { computed } from 'vue'
import { FileText, Image, Trash2 } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { DocumentHubUploadItem } from '@/types/production'

const store = useDocumentHubStore()

const items = computed(() => store.uploadItems)

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.ceil(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function sourceLabel(item: DocumentHubUploadItem) {
  return item.source === 'camera_capture' ? '拍照' : '选择文件'
}

function statusLabel(item: DocumentHubUploadItem) {
  if (item.status === 'success') return '已上传'
  if (item.status === 'failed') return '上传失败'
  if (item.status === 'uploading') return '上传中'
  if (item.status === 'error') return '无法上传'
  return '待上传'
}
</script>

<template>
  <section v-if="items.length" class="preview-grid">
    <article v-for="item in items" :key="item.id" class="upload-item" :class="item.status">
      <div class="thumb">
        <img v-if="item.fileType === 'image' && item.previewUrl" :src="item.previewUrl" alt="图片预览" loading="lazy" decoding="async">
        <iframe v-else-if="item.fileType === 'pdf' && item.previewUrl" :src="item.previewUrl" title="PDF 预览" />
        <FileText v-else-if="item.fileType === 'pdf'" :size="28" />
        <Image v-else :size="28" />
      </div>
      <div class="item-body">
        <div class="item-head">
          <div>
            <strong>{{ item.file.name }}</strong>
            <span>{{ sourceLabel(item) }} / {{ formatFileSize(item.file.size) }} / {{ statusLabel(item) }}</span>
          </div>
          <PrimeButton severity="secondary" text rounded title="移除文件" :disabled="store.uploadLoading" @click="store.removeUploadItem(item.id)">
            <Trash2 :size="16" />
          </PrimeButton>
        </div>
        <div class="metadata-grid">
          <label>
            资料标题
            <PrimeInputText
              :model-value="item.title"
              :disabled="store.uploadLoading"
              @update:model-value="store.updateUploadItemMetadata(item.id, { title: String($event) })"
            />
          </label>
          <label>
            版本
            <PrimeInputText
              :model-value="item.version"
              :disabled="store.uploadLoading"
              placeholder="可为空"
              @update:model-value="store.updateUploadItemMetadata(item.id, { version: String($event) })"
            />
          </label>
          <label>
            关键词
            <PrimeInputText
              :model-value="item.keywords"
              :disabled="store.uploadLoading"
              placeholder="可为空，逗号分隔"
              @update:model-value="store.updateUploadItemMetadata(item.id, { keywords: String($event) })"
            />
          </label>
          <label>
            备注
            <PrimeInputText
              :model-value="item.remark"
              :disabled="store.uploadLoading"
              placeholder="可为空"
              @update:model-value="store.updateUploadItemMetadata(item.id, { remark: String($event) })"
            />
          </label>
        </div>
        <p v-if="item.error" class="item-error">{{ item.error }}</p>
      </div>
    </article>
  </section>
</template>

<style scoped>
.preview-grid {
  display: grid;
  gap: 10px;
}

.upload-item {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  gap: 12px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-radius: 18px;
  background:
    linear-gradient(132deg, rgba(255, 255, 255, 0.66), rgba(255, 240, 216, 0.16)),
    rgba(255, 255, 255, 0.22);
  box-shadow:
    0 16px 30px rgba(80, 42, 16, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.upload-item.error,
.upload-item.failed {
  border-color: rgba(170, 67, 55, 0.42);
}

.upload-item.success {
  border-color: rgba(80, 145, 109, 0.42);
}

.thumb {
  display: grid;
  place-items: center;
  overflow: hidden;
  aspect-ratio: 1.414 / 1;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.36);
  color: #b66028;
}

.thumb img,
.thumb iframe {
  width: 100%;
  height: 100%;
  border: 0;
  object-fit: cover;
}

.item-body {
  min-width: 0;
}

.item-head {
  display: flex;
  gap: 8px;
  align-items: start;
  justify-content: space-between;
}

.item-head strong,
.item-head span {
  display: block;
}

.item-head strong {
  overflow: hidden;
  color: #332111;
  font-size: 15px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-head span {
  margin-top: 2px;
  color: #76512a;
  font-size: 12px;
  font-weight: 850;
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 9px;
}

label {
  display: grid;
  gap: 4px;
  color: #5f351a;
  font-size: 12px;
  font-weight: 950;
}

.item-error {
  margin: 8px 0 0;
  color: #a23e31;
  font-size: 12px;
  font-weight: 900;
}

@media (max-width: 760px) {
  .upload-item,
  .metadata-grid {
    grid-template-columns: 1fr;
  }
}
</style>
