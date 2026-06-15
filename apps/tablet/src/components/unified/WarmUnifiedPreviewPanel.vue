<script setup lang="ts">
import { computed } from 'vue'
import { Eye, FileCheck2, FileText, History, ShieldCheck } from 'lucide-vue-next'
import { apiBaseUrl } from '@/services/api'
import { useUnifiedDocumentStore } from '@/stores/unified-document-store'

const store = useUnifiedDocumentStore()

const item = computed(() => store.selectedItem)

const previewSrc = computed(() => {
  const url = item.value?.previewUrl
  if (!url) return ''
  if (url.startsWith('http')) return url
  try {
    return `${new URL(apiBaseUrl).origin}${url}`
  } catch {
    return url
  }
})

const isImage = computed(() => item.value?.mimeType?.startsWith('image/') || item.value?.document?.previewType === 'image')
const isPdf = computed(() => item.value?.mimeType === 'application/pdf' || item.value?.document?.previewType === 'pdf')
</script>

<template>
  <aside class="preview-panel">
    <div v-if="!item" class="preview-empty">
      <Eye :size="42" />
      <h2>选择一条资料查看预览</h2>
      <p>上传、搜索、编辑和版本信息会在这里集中展示。</p>
    </div>

    <template v-else>
      <section class="detail-card hero-detail">
        <p class="eyebrow">资料详情</p>
        <h2>{{ item.title }}</h2>
        <p>{{ item.subtitle }}</p>
        <div class="detail-tags">
          <span>{{ item.status || '待确认' }}</span>
          <span>{{ item.version || '未填版本' }}</span>
          <span>{{ item.source || '本地资料' }}</span>
        </div>
      </section>

      <section class="preview-box">
        <div class="section-title">
          <FileText :size="19" />
          <span>资料预览</span>
        </div>
        <div v-if="previewSrc && isImage" class="preview-stage">
          <img :src="previewSrc" :alt="item.title">
        </div>
        <iframe v-else-if="previewSrc && isPdf" class="preview-stage pdf-stage" :src="previewSrc" title="PDF 预览" />
        <div v-else class="preview-placeholder">
          <FileText :size="46" />
          <strong>{{ item.previewAvailable ? '可预览资料' : '资料卡片预览' }}</strong>
          <span>{{ item.originalFileName || '当前资料没有可直接打开的本地文件预览' }}</span>
        </div>
      </section>

      <section class="detail-card">
        <div class="section-title">
          <FileCheck2 :size="19" />
          <span>文件健康</span>
        </div>
        <div class="health-grid">
          <div>
            <b>{{ item.previewAvailable ? '可预览' : '卡片占位' }}</b>
            <span>预览状态</span>
          </div>
          <div>
            <b>{{ item.originalFileName || '无文件名' }}</b>
            <span>文件名</span>
          </div>
          <div>
            <b>{{ item.fileSize ? `${Math.round(item.fileSize / 1024)} KB` : '未记录' }}</b>
            <span>文件大小</span>
          </div>
          <div>
            <b>{{ item.updatedAt?.slice(0, 10) || '未记录' }}</b>
            <span>更新时间</span>
          </div>
        </div>
      </section>

      <section class="detail-card">
        <div class="section-title">
          <History :size="19" />
          <span>版本历史</span>
        </div>
        <pre>{{ JSON.stringify(store.versions, null, 2) }}</pre>
      </section>

      <section class="detail-card warning-card">
        <div class="section-title">
          <ShieldCheck :size="19" />
          <span>删除保护</span>
        </div>
        <p>移入回收站和彻底删除必须通过后端删除密码锁。前端不会保存明文密码。</p>
      </section>
    </template>
  </aside>
</template>

<style scoped>
.preview-panel {
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.preview-empty,
.detail-card,
.preview-box {
  border: 1px solid rgba(139, 90, 42, 0.2);
  border-radius: 18px;
  background: rgba(255, 249, 239, 0.82);
  box-shadow: 0 18px 32px rgba(75, 38, 13, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.74);
}

.preview-empty {
  display: grid;
  place-items: center;
  min-height: 360px;
  padding: 28px;
  color: #8a6239;
  text-align: center;
}

.preview-empty h2,
.hero-detail h2 {
  margin: 10px 0 0;
  color: #342316;
  font-size: 26px;
  font-weight: 950;
  line-height: 1.1;
}

.preview-empty p,
.hero-detail p,
.warning-card p {
  margin: 8px 0 0;
  color: #6f4d28;
  font-weight: 850;
}

.detail-card,
.preview-box {
  margin-bottom: 12px;
  padding: 14px;
}

.hero-detail {
  background: linear-gradient(145deg, rgba(255, 252, 245, 0.97), rgba(255, 226, 185, 0.82));
}

.eyebrow {
  margin: 0;
  color: #9b5125;
  font-size: 12px;
  font-weight: 950;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 12px;
}

.detail-tags span {
  padding: 6px 9px;
  border-radius: 999px;
  background: rgba(196, 95, 36, 0.13);
  color: #7b421f;
  font-size: 12px;
  font-weight: 950;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: #5f351a;
  font-weight: 950;
}

.preview-stage,
.preview-placeholder {
  width: 100%;
  min-height: 250px;
  max-height: 320px;
  border: 1px solid rgba(139, 90, 42, 0.18);
  border-radius: 14px;
  background: #fffaf1;
}

.preview-stage {
  overflow: hidden;
  object-fit: contain;
}

.preview-stage img,
img.preview-stage {
  display: block;
  width: 100%;
  height: 100%;
  max-height: 320px;
  object-fit: contain;
}

.pdf-stage {
  height: 320px;
}

.preview-placeholder {
  display: grid;
  place-items: center;
  padding: 22px;
  color: #8a6239;
  text-align: center;
}

.preview-placeholder strong,
.preview-placeholder span {
  display: block;
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.health-grid div {
  padding: 10px;
  border-radius: 12px;
  background: rgba(255, 244, 225, 0.8);
}

.health-grid b,
.health-grid span {
  display: block;
}

.health-grid b {
  overflow: hidden;
  color: #342316;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.health-grid span {
  margin-top: 2px;
  color: #8a6239;
  font-size: 12px;
  font-weight: 850;
}

pre {
  max-height: 180px;
  margin: 0;
  overflow: auto;
  padding: 10px;
  border-radius: 12px;
  background: rgba(75, 44, 20, 0.08);
  color: #5d361a;
  font-size: 11px;
  white-space: pre-wrap;
}

.warning-card {
  background: rgba(255, 237, 208, 0.8);
}
</style>
