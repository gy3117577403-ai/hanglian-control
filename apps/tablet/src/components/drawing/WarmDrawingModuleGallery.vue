<script setup lang="ts">
import { Image, UploadCloud } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
</script>

<template>
  <div class="module-gallery" data-scroll-key="module">
    <section v-if="store.selectedModule" class="gallery-head">
      <div>
        <p>{{ store.selectedProduct?.productModel }}</p>
        <h2>{{ store.selectedModule.moduleName }}</h2>
        <span>{{ store.selectedModule.remark }}</span>
      </div>
      <PrimeButton @click="store.uploadDialogOpen = true">
        <UploadCloud :size="18" />
        <span>上传到本模块</span>
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
          <Image :size="32" />
          <b>{{ item.fileType.toUpperCase() }}</b>
        </div>
        <h3>{{ item.title }}</h3>
        <span>{{ item.version }} / {{ item.uploadedAt.slice(0, 10) }}</span>
        <p>{{ item.remark }}</p>
      </button>
      <div v-if="!store.selectedModule?.items.length" class="empty-gallery">
        <b>暂无资料</b>
        <span>可以点击“上传到本模块”补充 SOP、成品图、辅料规格或配套工装。</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.module-gallery {
  height: calc(100% - 58px);
  overflow: auto;
}

.gallery-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 16px;
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
  font-weight: 950;
}

h2 {
  margin-top: 3px;
  color: #342112;
  font-size: 28px;
  font-weight: 950;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

button,
.empty-gallery {
  min-height: 230px;
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
  min-height: 126px;
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
  place-items: center;
  grid-column: 1 / -1;
  text-align: center;
}
</style>
