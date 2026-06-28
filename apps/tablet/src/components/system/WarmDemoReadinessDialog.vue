<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Clipboard, Info, Network, RefreshCw, ShieldCheck } from 'lucide-vue-next'
import { useToast } from 'primevue/usetoast'
import { APP_RUNTIME_FLAGS, APP_STAGE, APP_VERSION } from '@/config/app-version'
import { checkFileService, getDataSourceStatus, getHealth } from '@/services/api'
import { useProductionStore } from '@/stores/production-store'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'open-network': []
  'open-system-info': []
}>()

interface ReadinessItem {
  label: string
  status: 'pass' | 'warn' | 'fail'
  message: string
}

const toast = useToast()
const store = useProductionStore()
const loading = ref(false)
const checkedAt = ref('-')
const items = ref<ReadinessItem[]>([])
const copyFallbackVisible = ref(false)

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const completedCount = computed(() => items.value.filter((item) => item.status === 'pass').length)
const progress = computed(() => Math.round((completedCount.value / Math.max(items.value.length, 1)) * 100))
const reportText = computed(() =>
  [
    `线束车间生产计划资料管控系统 ${APP_VERSION} ${APP_STAGE} 演示前检查`,
    `时间：${checkedAt.value}`,
    `通过：${completedCount.value} / ${items.value.length}`,
    ...items.value.map((item) => {
      const statusText = item.status === 'pass' ? '通过' : item.status === 'warn' ? '提醒' : '未通过'
      return `- ${item.label}：${statusText}：${item.message}`
    }),
    '',
    '建议命令：npm run demo:release-check / npm run security:check / npm run build / npm run check',
  ].join('\n'),
)

function severityFor(status: ReadinessItem['status']) {
  if (status === 'pass') return 'success'
  if (status === 'warn') return 'warn'
  return 'danger'
}

async function runReadiness() {
  loading.value = true
  checkedAt.value = new Date().toLocaleString('zh-CN', { hour12: false })

  const nextItems: ReadinessItem[] = [
    { label: '当前版本', status: 'pass', message: `${APP_VERSION} ${APP_STAGE}` },
    {
      label: '未接 Sealos',
      status: APP_RUNTIME_FLAGS.sealosConnected ? 'fail' : 'pass',
      message: APP_RUNTIME_FLAGS.sealosConnected ? '检测到 Sealos 标记开启' : '未接入 Sealos',
    },
    { label: '未启用数据库写入', status: 'pass', message: '演示前端不提供写库入口' },
    { label: '网络诊断可用', status: 'pass', message: '可从演示工具菜单打开' },
    { label: '现场走查可用', status: 'pass', message: '可从演示工具菜单打开' },
    {
      label: '演示资料已生成',
      status: 'warn',
      message: '前端无法直接检查本机目录；如不确定请执行 npm run demo:assets',
    },
    {
      label: '安全检查建议',
      status: 'warn',
      message: '建议执行 demo:release-check、security:check、build、check',
    },
  ]

  try {
    const health = await getHealth()
    nextItems.splice(1, 0, {
      label: 'API 在线',
      status: health.status === 'ok' ? 'pass' : 'fail',
      message: health.status === 'ok' ? `${health.service ?? 'API'} 在线` : 'API 未返回 ok',
    })
  } catch {
    nextItems.splice(1, 0, {
      label: 'API 在线',
      status: 'fail',
      message: 'API 不可用，可继续离线演示但不能上传资料',
    })
  }

  try {
    const source = await getDataSourceStatus()
    nextItems.splice(2, 0, {
      label: '数据源为 Mock',
      status: source.dataSource === 'mock' ? 'pass' : 'warn',
      message: source.dataSource === 'mock' ? '当前为 Mock 数据源' : `当前数据源为 ${source.dataSource}`,
    })
  } catch {
    nextItems.splice(2, 0, {
      label: '数据源为 Mock',
      status: store.dataSourceStatus.dataSource === 'mock' ? 'pass' : 'warn',
      message: '数据源接口不可用，使用前端当前状态判断',
    })
  }

  try {
    const fileResult = await checkFileService({
      planId: store.selectedPlan.id,
      productId: store.selectedPlan.productId ?? store.selectedPlan.productCode,
    })
    nextItems.splice(6, 0, {
      label: '文件健康接口可用',
      status: fileResult.ok ? 'pass' : 'fail',
      message: fileResult.message,
    })
  } catch {
    nextItems.splice(6, 0, {
      label: '文件健康接口可用',
      status: 'fail',
      message: '文件健康检查接口不可用',
    })
  }

  items.value = nextItems
  loading.value = false
}

async function copyReport() {
  try {
    await navigator.clipboard.writeText(reportText.value)
    copyFallbackVisible.value = false
    toast.add({
      severity: 'success',
      summary: '检查结果已复制',
      detail: `${completedCount.value}/${items.value.length} 项通过。`,
      life: 2600,
    })
  } catch {
    copyFallbackVisible.value = true
    toast.add({ severity: 'warn', summary: '无法自动复制', detail: '请在文本框中手动复制检查结果。', life: 2600 })
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) void runReadiness()
  },
)
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="演示前检查" class="system-info-dialog">
    <div class="grid max-h-[72vh] gap-4 overflow-auto pr-1">
      <section class="system-hero-panel">
        <ShieldCheck :size="36" />
        <div>
          <p class="section-kicker">DEMO READINESS</p>
          <h3>{{ APP_VERSION }} {{ APP_STAGE }} 演示前检查</h3>
          <p>前端只显示可检测项目和建议命令，不执行 npm 脚本、不连接数据库。</p>
        </div>
        <PrimeTag :severity="progress >= 80 ? 'success' : 'warn'" :value="`${completedCount}/${items.length || 1}`" />
      </section>

      <PrimeProgressBar
        :value="progress"
        :show-value="false"
        :class="progress >= 80 ? 'warm-progress-good' : 'warm-progress-warn'"
      />

      <div class="readiness-grid">
        <article v-for="item in items" :key="item.label" class="readiness-card">
          <PrimeTag
            :severity="severityFor(item.status)"
            :value="item.status === 'pass' ? '通过' : item.status === 'warn' ? '提醒' : '未通过'"
          />
          <h4>{{ item.label }}</h4>
          <p>{{ item.message }}</p>
        </article>
      </div>

      <PrimeMessage severity="info" :closable="false">
        前端无法直接执行 npm 脚本。演示前请在电脑终端执行：npm run demo:release-check / npm run security:check / npm run
        build / npm run check。
      </PrimeMessage>

      <section v-if="copyFallbackVisible" class="section-bay">
        <p class="section-kicker">COPY FALLBACK</p>
        <PrimeTextarea :model-value="reportText" class="mt-2 min-h-40 w-full text-sm font-bold" readonly />
      </section>
    </div>

    <template #footer>
      <PrimeButton :loading="loading" severity="secondary" label="重新检查" @click="runReadiness">
        <template #icon><RefreshCw :size="17" /></template>
      </PrimeButton>
      <PrimeButton severity="secondary" label="打开网络诊断" @click="emit('open-network')">
        <template #icon><Network :size="17" /></template>
      </PrimeButton>
      <PrimeButton severity="secondary" label="打开系统信息" @click="emit('open-system-info')">
        <template #icon><Info :size="17" /></template>
      </PrimeButton>
      <PrimeButton label="复制检查结果" @click="copyReport">
        <template #icon><Clipboard :size="17" /></template>
      </PrimeButton>
    </template>
  </PrimeDialog>
</template>
