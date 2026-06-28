<script setup lang="ts">
import { computed } from 'vue'
import { FileText, FolderOpen, ShieldCheck, UploadCloud } from 'lucide-vue-next'
import { APP_STAGE, APP_VERSION } from '@/config/app-version'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'open-upload': []
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const demoFiles = [
  'demo-drawing-rev-a.pdf',
  'demo-drawing-rev-b.pdf',
  'demo-sop-step-01.png',
  'demo-pinout-16p.png',
  'demo-finished-detail.png',
  'demo-unsupported.txt',
]

const flow = [
  '先上传 Rev.A PDF 图纸',
  '再上传 Rev.B PDF 图纸',
  '将 Rev.B 设为当前有效',
  '上传 SOP 图片、孔位图、成品细节图',
  '尝试上传 txt，确认被拒绝',
  '查看文件健康、版本历史和审计记录',
]
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="演示资料说明" class="demo-guide-dialog">
    <div class="grid max-h-[72vh] gap-4 overflow-auto pr-1">
      <section class="system-hero-panel">
        <FolderOpen :size="36" />
        <div>
          <p class="section-kicker">DEMO ASSETS</p>
          <h3>演示资料使用说明</h3>
          <p>{{ APP_VERSION }} {{ APP_STAGE }} 使用本地合成演示资料，不包含真实客户信息。</p>
        </div>
        <PrimeTag severity="info" value="demo-upload-assets" />
      </section>

      <section class="section-bay">
        <p class="section-kicker">GENERATE</p>
        <div class="system-info-list">
          <div><span>生成命令</span><strong>npm run demo:assets</strong></div>
          <div><span>生成目录</span><strong>demo-upload-assets</strong></div>
        </div>
      </section>

      <section class="demo-file-list">
        <div class="flex items-center gap-2">
          <FileText :size="22" />
          <strong>建议测试文件</strong>
        </div>
        <div class="demo-file-grid">
          <span v-for="file in demoFiles" :key="file">{{ file }}</span>
        </div>
      </section>

      <section class="section-bay">
        <p class="section-kicker">FLOW</p>
        <div class="demo-route-list">
          <span v-for="(item, index) in flow" :key="item"><b>{{ index + 1 }}</b>{{ item }}</span>
        </div>
      </section>

      <PrimeMessage severity="warn" :closable="false">
        不要使用真实图纸测试 GitHub 提交流程，不要把真实客户资料提交到 Git。
      </PrimeMessage>
    </div>

    <template #footer>
      <PrimeButton severity="secondary" label="打开上传资料" @click="emit('open-upload')">
        <template #icon><UploadCloud :size="17" /></template>
      </PrimeButton>
      <PrimeButton label="我已了解安全边界" @click="dialogVisible = false">
        <template #icon><ShieldCheck :size="17" /></template>
      </PrimeButton>
    </template>
  </PrimeDialog>
</template>
