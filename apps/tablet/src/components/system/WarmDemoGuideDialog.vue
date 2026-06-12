<script setup lang="ts">
import { computed } from 'vue'
import { ClipboardList, FileUp, FolderOpen, Network, PlayCircle, Route, TabletSmartphone } from 'lucide-vue-next'
import { APP_STAGE, APP_SYSTEM_NAME, APP_VERSION } from '@/config/app-version'
import { useProductionStore } from '@/stores/production-store'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'open-network': []
  'open-field-qa': []
  'open-upload': []
}>()

const store = useProductionStore()
const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const steps = [
  {
    title: '启动演示',
    icon: PlayCircle,
    lines: ['电脑执行 npm run dev:lan', '平板访问 http://电脑IPv4:5173/tablet', '电脑和平板需要在同一 WiFi'],
  },
  {
    title: '选择生产计划',
    icon: Route,
    lines: ['切换今日 / 本周', '选择一个计划任务', '锁定客户和产品'],
  },
  {
    title: '查看资料',
    icon: FolderOpen,
    lines: ['查看开工资料检查', '查看前段参数和后段资料', '打开图纸 / SOP / 孔位图 / 成品图'],
  },
  {
    title: '上传与追溯',
    icon: FileUp,
    lines: ['执行 npm run demo:assets 生成演示资料', '上传 PDF 图纸或图片资料', '查看文件健康、版本历史、审计记录', '完成组长确认或异常反馈'],
  },
]
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="演示说明" class="demo-guide-dialog">
    <div class="grid max-h-[72vh] gap-4 overflow-auto pr-1">
      <section class="system-hero-panel">
        <TabletSmartphone :size="36" />
        <div>
          <p class="section-kicker">DEMO GUIDE</p>
          <h3>{{ APP_SYSTEM_NAME }}</h3>
          <p>{{ APP_VERSION }} {{ APP_STAGE }}，当前使用 Mock API + 本地文件上传/预览。</p>
        </div>
        <PrimeTag severity="warn" value="非生产正式版" />
      </section>

      <div class="demo-step-grid">
        <article v-for="(step, index) in steps" :key="step.title" class="demo-step-card">
          <div class="demo-step-head">
            <span>{{ index + 1 }}</span>
            <component :is="step.icon" :size="25" />
          </div>
          <h4>{{ step.title }}</h4>
          <ul>
            <li v-for="line in step.lines" :key="line">{{ line }}</li>
          </ul>
        </article>
      </div>

      <PrimeMessage severity="info" :closable="false">
        上传测试请只使用 demo-upload-assets 下的合成演示文件，不要选择真实客户图纸或 SOP。
      </PrimeMessage>
    </div>

    <template #footer>
      <PrimeButton severity="secondary" label="打开网络诊断" @click="emit('open-network')">
        <template #icon><Network :size="17" /></template>
      </PrimeButton>
      <PrimeButton severity="secondary" label="打开现场走查" @click="emit('open-field-qa')">
        <template #icon><ClipboardList :size="17" /></template>
      </PrimeButton>
      <PrimeButton :disabled="!store.selectedPlan?.id" label="打开上传资料" @click="emit('open-upload')">
        <template #icon><FileUp :size="17" /></template>
      </PrimeButton>
    </template>
  </PrimeDialog>
</template>
