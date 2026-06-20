<script setup lang="ts">
import { Camera, FolderOpen } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
</script>

<template>
  <section class="source-picker">
    <button type="button" class="source-card" @click="store.setUploadSource('camera')">
      <Camera :size="34" />
      <strong>拍照</strong>
      <span>使用设备摄像头拍摄现场图片</span>
    </button>
    <button type="button" class="source-card" @click="store.setUploadSource('file')">
      <FolderOpen :size="34" />
      <strong>选择文件</strong>
      <span>上传 PDF、JPG、PNG 或 WEBP 资料</span>
    </button>
  </section>
</template>

<style scoped>
.source-picker {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.source-card {
  min-height: 128px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 18px;
  background:
    linear-gradient(130deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.18)),
    rgba(255, 246, 232, 0.38);
  box-shadow:
    0 18px 34px rgba(80, 42, 16, 0.11),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
  color: #432713;
  text-align: left;
  cursor: pointer;
}

.source-card svg {
  color: #b66028;
}

.source-card strong,
.source-card span {
  display: block;
}

.source-card strong {
  margin-top: 10px;
  font-size: 18px;
  font-weight: 950;
}

.source-card span {
  margin-top: 5px;
  color: #76512a;
  font-size: 13px;
  font-weight: 850;
}

@media (max-width: 760px) {
  .source-picker {
    grid-template-columns: 1fr;
  }
}
</style>
