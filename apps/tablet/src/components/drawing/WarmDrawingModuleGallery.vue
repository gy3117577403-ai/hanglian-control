<script setup lang="ts">
import { ref } from 'vue'
import { ChevronLeft, FileText, Image, LockKeyhole, Trash2, UploadCloud } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { DrawingItem } from '@/types/production'

const store = useDocumentHubStore()
const deleteOpen = ref(false)
const deletePassword = ref('')
const deleteError = ref('')
const deleteTarget = ref<DrawingItem | null>(null)

function iconFor(item: DrawingItem) {
  return item.fileType === 'pdf' ? FileText : Image
}

function openDelete(item: DrawingItem) {
  deleteTarget.value = item
  deletePassword.value = ''
  deleteError.value = ''
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const ok = await store.deleteDrawingItem(deleteTarget.value, deletePassword.value)
  if (!ok) {
    deleteError.value = '密码错误或该资料不存在。'
    return
  }
  deleteOpen.value = false
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
      <PrimeButton rounded title="上传更多" @click="store.openModuleUpload(store.selectedModule)">
        <UploadCloud :size="18" />
      </PrimeButton>
    </section>
    <div class="gallery-grid">
      <article
        v-for="item in store.selectedModule?.items"
        :key="item.itemId"
        class="gallery-item"
      >
        <button type="button" class="thumb" @click="store.openImageDetail(item)">
          <component :is="iconFor(item)" :size="34" />
          <b>{{ item.fileType === 'pdf' ? 'PDF 预览' : '图片预览' }}</b>
        </button>
        <h3>{{ item.title }}</h3>
        <span>{{ item.version }} / {{ item.uploadedAt.slice(0, 10) }}</span>
        <p>{{ item.remark }}</p>
        <div class="item-actions">
          <PrimeButton rounded title="查看大图" @click="store.openImageDetail(item)">
            <Image :size="16" />
          </PrimeButton>
          <PrimeButton severity="danger" outlined rounded title="删除资料" @click="openDelete(item)">
            <Trash2 :size="16" />
          </PrimeButton>
        </div>
      </article>
      <div v-if="!store.selectedModule?.items.length" class="empty-gallery">
        <b>该模块暂无资料，可点击上传补充。</b>
        <PrimeButton rounded title="上传到本模块" @click="store.selectedModule && store.openModuleUpload(store.selectedModule)">
          <UploadCloud :size="18" />
        </PrimeButton>
      </div>
    </div>
    <PrimeDialog v-model:visible="deleteOpen" modal header="删除资料" :style="{ width: '420px' }">
      <div class="delete-panel">
        <LockKeyhole :size="28" />
        <div>
          <b>请输入删除密码</b>
          <span>{{ deleteTarget?.title }} 删除后仅从当前 Mock 资料中移除。</span>
        </div>
      </div>
      <label class="password-field">
        删除密码
        <PrimeInputText v-model="deletePassword" type="password" autofocus @keydown.enter="confirmDelete" />
      </label>
      <p v-if="deleteError" class="delete-error">{{ deleteError }}</p>
      <template #footer>
        <PrimeButton label="取消" severity="secondary" text @click="deleteOpen = false" />
        <PrimeButton severity="danger" @click="confirmDelete">
          <Trash2 :size="17" />
          <span>确认删除</span>
        </PrimeButton>
      </template>
    </PrimeDialog>
  </div>
</template>

<style scoped>
.module-gallery {
  height: 100%;
  overflow: auto;
  padding-right: 2px;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  -webkit-overflow-scrolling: touch;
}

.gallery-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
  padding: 13px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 21px;
  background:
    linear-gradient(122deg, rgba(255, 255, 255, 0.68), rgba(255, 255, 255, 0.1) 54%),
    linear-gradient(304deg, rgba(91, 143, 137, 0.13), transparent 58%),
    rgba(255, 255, 255, 0.16);
  box-shadow:
    0 18px 32px rgba(80, 42, 16, 0.11),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(30px) saturate(1.28);
  -webkit-backdrop-filter: blur(30px) saturate(1.28);
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

.gallery-item,
.empty-gallery {
  contain: layout paint style;
  min-height: 214px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.88);
  border-radius: 19px;
  background:
    linear-gradient(122deg, rgba(255, 255, 255, 0.66), rgba(255, 255, 255, 0.08) 56%),
    linear-gradient(302deg, rgba(95, 145, 139, 0.14), transparent 58%),
    rgba(255, 255, 255, 0.14);
  text-align: left;
  box-shadow:
    0 18px 32px rgba(80, 42, 16, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(28px) saturate(1.26);
  -webkit-backdrop-filter: blur(28px) saturate(1.26);
}

.thumb {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 116px;
  overflow: hidden;
  border: 0;
  border-radius: 16px;
  background:
    linear-gradient(128deg, rgba(255, 255, 255, 0.88), rgba(255, 252, 246, 0.48) 56%),
    linear-gradient(315deg, rgba(90, 144, 138, 0.12), transparent 58%);
  color: #a85624;
  cursor: pointer;
  box-shadow:
    0 14px 24px rgba(80, 42, 16, 0.09),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.thumb::before {
  position: absolute;
  inset: 10px;
  border: 1px solid rgba(255, 255, 255, 0.92);
  border-radius: 11px;
  background:
    linear-gradient(90deg, rgba(122, 76, 35, 0.04) 1px, transparent 1px) 0 0 / 22px 22px,
    linear-gradient(0deg, rgba(122, 76, 35, 0.035) 1px, transparent 1px) 0 0 / 22px 22px,
    rgba(255, 255, 255, 0.42);
  content: '';
}

.thumb :deep(svg) {
  position: relative;
  z-index: 1;
  padding: 8px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.42);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86);
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

.gallery-item span,
.gallery-item p,
.empty-gallery span {
  display: block;
  overflow: hidden;
  margin-top: 4px;
  color: #7b542c;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 9px;
}

.item-actions :deep(.p-button),
.gallery-head :deep(.p-button:not(:first-child)),
.empty-gallery :deep(.p-button) {
  width: 34px;
  height: 34px;
  min-height: 34px;
  padding: 0;
  border-radius: 10px;
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

.delete-panel {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.66);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.38);
  color: #70421d;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.delete-panel b,
.delete-panel span {
  display: block;
}

.password-field {
  display: grid;
  gap: 6px;
  color: #5f351a;
  font-size: 13px;
  font-weight: 950;
}

.delete-error {
  margin-top: 9px;
  color: #a23e31;
  font-size: 13px;
  font-weight: 900;
}
</style>
