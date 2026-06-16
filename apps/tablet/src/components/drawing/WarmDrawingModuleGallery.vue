<script setup lang="ts">
import { ChevronLeft, FileText, Image, UploadCloud } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { DrawingItem } from '@/types/production'

const store = useDocumentHubStore()

function iconFor(item: DrawingItem) {
  return item.fileType === 'pdf' ? FileText : Image
}
</script>

<template>
  <div class="module-gallery" data-scroll-key="module">
    <section v-if="store.selectedModule" class="gallery-head">
      <PrimeButton severity="secondary" outlined rounded title="返回图纸详情" @click="store.goBack()">
        <ChevronLeft :size="20" />
      </PrimeButton>
      <div>
        <p>{{ store.productDrawingDetail?.customer?.customerName || '待补充客户资料' }}</p>
        <h2>{{ store.selectedProduct?.productModel }} / {{ store.selectedModule.moduleName }}</h2>
        <span>资料数量：{{ store.selectedModule.items.length }} 项</span>
      </div>
      <PrimeButton @click="store.openModuleUpload(store.selectedModule)">
        <UploadCloud :size="18" />
        <span>上传更多</span>
      </PrimeButton>
    </section>
    <div class="gallery-grid">
      <button
        v-for="item in store.selectedModule?.items"
        :key="item.itemId"
        type="button"
        @click="store.openImageDetail(item)"
      >
        <div class="thumb">
          <component :is="iconFor(item)" :size="34" />
          <b>{{ item.fileType === 'pdf' ? 'PDF 预览' : '图片预览' }}</b>
        </div>
        <h3>{{ item.title }}</h3>
        <span>{{ item.version }} / {{ item.uploadedAt.slice(0, 10) }}</span>
        <p>{{ item.remark }}</p>
      </button>
      <div v-if="!store.selectedModule?.items.length" class="empty-gallery">
        <b>该模块暂无资料，可点击上传补充。</b>
        <PrimeButton @click="store.selectedModule && store.openModuleUpload(store.selectedModule)">
          <UploadCloud :size="18" />
          <span>上传到本模块</span>
        </PrimeButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.module-gallery {
  height: calc(100% - 58px);
  overflow: auto;
  padding-right: 2px;
}

.gallery-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
  padding: 13px;
  border-radius: 18px;
  background: linear-gradient(145deg, #fff7ea, #ffd79d);
}

p,
h2,
span,
h3 {
  margin: 0;
}

p {
  color: #9b5125;
  font-size: 13px;
  font-weight: 950;
}

h2 {
  overflow: hidden;
  margin-top: 3px;
  color: #342112;
  font-size: 25px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gallery-head span {
  display: block;
  margin-top: 4px;
  color: #73512c;
  font-weight: 850;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

button,
.empty-gallery {
  min-height: 214px;
  padding: 12px;
  border: 1px solid rgba(139, 90, 42, 0.16);
  border-radius: 16px;
  background: rgba(255, 250, 241, 0.9);
  text-align: left;
  box-shadow: 0 12px 22px rgba(80, 42, 16, 0.1);
}

.thumb {
  display: grid;
  place-items: center;
  min-height: 116px;
  border-radius: 14px;
  background: linear-gradient(145deg, #f5b65e, #be6427);
  color: #fff8ed;
}

h3 {
  overflow: hidden;
  margin-top: 10px;
  color: #342112;
  font-size: 17px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

button span,
button p,
.empty-gallery span {
  display: block;
  overflow: hidden;
  margin-top: 4px;
  color: #7b542c;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-gallery {
  display: grid;
  gap: 12px;
  place-items: center;
  grid-column: 1 / -1;
  min-height: 240px;
  text-align: center;
}

.empty-gallery b {
  color: #5c3419;
}
</style>
