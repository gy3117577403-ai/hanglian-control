<script setup lang="ts">
import { computed } from 'vue'
import { GitMerge, Palette, Route, ServerCog, ShieldCheck } from 'lucide-vue-next'
import { APP_STAGE, APP_VERSION } from '@/config/app-version'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const routes = [
  {
    title: '路线 A：继续 UI 细节优化',
    icon: Palette,
    fit: '界面还需要更好看、更适合现场',
    next: 'V1.8 UI 细节和视觉一致性',
    warning: '继续保持暖色立体工业平板风。',
  },
  {
    title: '路线 B：合并 main / 打演示标签',
    icon: GitMerge,
    fit: '当前演示版满意',
    next: '创建 PR、合并 main、打 v1.7-demo tag',
    warning: '合并前继续执行安全检查和构建检查。',
  },
  {
    title: '路线 C：接 Sealos 测试库',
    icon: ServerCog,
    fit: '要开始保存真实业务数据',
    next: '恢复 V0.8A/V0.8B 数据库接入线',
    warning: '先测试库，后生产库；严禁直接写生产库。',
  },
  {
    title: '路线 D：接企业微信微盘',
    icon: Route,
    fit: '要同步真实图纸/SOP',
    next: '做 WeCom 微盘 Adapter',
    warning: '需要企业微信授权和密钥管理。',
  },
]
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="后续路线" class="demo-guide-dialog">
    <div class="grid max-h-[72vh] gap-4 overflow-auto pr-1">
      <section class="system-hero-panel">
        <ShieldCheck :size="36" />
        <div>
          <p class="section-kicker">ROADMAP</p>
          <h3>{{ APP_VERSION }} {{ APP_STAGE }} 后续路线选择</h3>
          <p>本面板只做说明，不连接数据库，不添加微盘授权按钮。</p>
        </div>
        <PrimeTag severity="info" value="说明面板" />
      </section>

      <div class="roadmap-grid">
        <article v-for="route in routes" :key="route.title" class="roadmap-card">
          <component :is="route.icon" :size="30" />
          <h4>{{ route.title }}</h4>
          <p><strong>适合：</strong>{{ route.fit }}</p>
          <p><strong>下一步：</strong>{{ route.next }}</p>
          <PrimeMessage severity="warn" :closable="false">{{ route.warning }}</PrimeMessage>
        </article>
      </div>
    </div>

    <template #footer>
      <PrimeButton label="关闭" @click="dialogVisible = false" />
    </template>
  </PrimeDialog>
</template>
