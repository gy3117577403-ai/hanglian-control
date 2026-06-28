<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CheckCircle2, Clipboard, Cloud, ExternalLink, Globe2, HardDrive, Laptop, RefreshCw, RotateCcw, Server, WifiOff } from 'lucide-vue-next'
import { useToast } from 'primevue/usetoast'
import {
  clearApiRuntimeMode,
  CLOUD_API_BASE_URL,
  getApiHostInfo,
  getApiRuntimeConfig,
  LOCAL_API_BASE_URL,
  saveApiRuntimeMode,
  type ApiRuntimeMode,
} from '@/config/api-base'
import { getDataSourceStatus, getHealth, measureApiLatency } from '@/services/api'
import type { DataSourceStatus } from '@/types/production'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

interface DiagnosticsState {
  healthStatus: '未检测' | '在线' | '离线'
  healthDetail: string
  latencyMs: number | null
  dataSource: 'mock' | 'prisma' | 'unknown'
  dataSourceStatus: DataSourceStatus | null
  checkedAt: string
}

const toast = useToast()
const loading = ref(false)
const copied = ref('')
const runtimeConfig = ref(getApiRuntimeConfig())
const selectedMode = ref<ApiRuntimeMode>(
  runtimeConfig.value.mode === 'local' || runtimeConfig.value.mode === 'cloud' || runtimeConfig.value.mode === 'custom'
    ? runtimeConfig.value.mode
    : 'local',
)
const customApiBaseUrl = ref(runtimeConfig.value.mode === 'custom' ? runtimeConfig.value.apiBaseUrl : '')
const diagnostics = ref<DiagnosticsState>({
  healthStatus: '未检测',
  healthDetail: '打开后自动检测当前 API。',
  latencyMs: null,
  dataSource: 'unknown',
  dataSourceStatus: null,
  checkedAt: '-',
})

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const hostInfo = computed(() => getApiHostInfo())
const swaggerUrl = computed(() => `${hostInfo.value.apiBaseUrl}/docs`)
const healthSeverity = computed(() => diagnostics.value.healthStatus === '在线' ? 'success' : diagnostics.value.healthStatus === '离线' ? 'danger' : 'info')

const modeCards = computed(() => [
  {
    mode: 'local' as const,
    icon: Laptop,
    title: '本机调试',
    url: LOCAL_API_BASE_URL,
    note: '电脑本地运行后端时使用',
  },
  {
    mode: 'cloud' as const,
    icon: Cloud,
    title: '云端 API',
    url: CLOUD_API_BASE_URL,
    note: '平板 App 优先使用的 Sealos 接口',
  },
  {
    mode: 'custom' as const,
    icon: Globe2,
    title: '自定义',
    url: customApiBaseUrl.value || 'https://example.com/api',
    note: '后续换域名或测试环境时使用',
  },
])

const statusRows = computed(() => {
  const source = diagnostics.value.dataSourceStatus
  return [
    { label: 'API 地址', value: hostInfo.value.apiBaseUrl, tone: 'info' },
    { label: '接口模式', value: runtimeConfig.value.label, tone: 'info' },
    { label: 'API 状态', value: diagnostics.value.healthStatus, tone: diagnostics.value.healthStatus === '在线' ? 'good' : diagnostics.value.healthStatus === '离线' ? 'bad' : 'info' },
    { label: '延迟', value: diagnostics.value.latencyMs === null ? '-' : `${diagnostics.value.latencyMs}ms`, tone: diagnostics.value.latencyMs !== null && diagnostics.value.latencyMs < 800 ? 'good' : 'info' },
    { label: '数据源', value: diagnostics.value.dataSource === 'prisma' ? 'Prisma / PostgreSQL' : diagnostics.value.dataSource === 'mock' ? 'Mock 演示数据' : '-', tone: diagnostics.value.dataSource === 'prisma' ? 'good' : 'info' },
    { label: '数据库读取', value: source?.canReadDatabase ? '可读' : source ? '未确认' : '-', tone: source?.canReadDatabase ? 'good' : 'info' },
    { label: '数据库写入', value: source?.canWriteDatabase ? '测试库可写' : source ? '未开启' : '-', tone: source?.canWriteDatabase ? 'warn' : 'info' },
    { label: '危险操作', value: source?.allowDestructiveDbActions ? '已开启' : '关闭', tone: source?.allowDestructiveDbActions ? 'bad' : 'good' },
  ]
})

function syncRuntimeForm() {
  runtimeConfig.value = getApiRuntimeConfig()
  if (runtimeConfig.value.mode === 'local' || runtimeConfig.value.mode === 'cloud' || runtimeConfig.value.mode === 'custom') {
    selectedMode.value = runtimeConfig.value.mode
  }
  customApiBaseUrl.value = runtimeConfig.value.mode === 'custom' ? runtimeConfig.value.apiBaseUrl : customApiBaseUrl.value
}

function toneClass(tone: string) {
  return `api-status-${tone}`
}

function selectMode(mode: ApiRuntimeMode) {
  selectedMode.value = mode
}

function validateCustomUrl() {
  if (selectedMode.value !== 'custom') return true
  const value = customApiBaseUrl.value.trim()
  return /^https?:\/\/.+\/api\/?$/.test(value)
}

function applyProfileAndReload() {
  if (!validateCustomUrl()) {
    toast.add({ severity: 'warn', summary: '接口地址格式不正确', detail: '自定义地址需要以 http:// 或 https:// 开头，并以 /api 结尾。', life: 2600 })
    return
  }

  saveApiRuntimeMode(selectedMode.value, customApiBaseUrl.value)
  syncRuntimeForm()
  toast.add({ severity: 'success', summary: '接口配置已保存', detail: '页面正在刷新以应用新的 API 地址。', life: 1600 })
  window.setTimeout(() => window.location.reload(), 450)
}

function resetToAutoAndReload() {
  clearApiRuntimeMode()
  syncRuntimeForm()
  toast.add({ severity: 'success', summary: '已恢复自动接口配置', detail: '页面正在刷新。', life: 1600 })
  window.setTimeout(() => window.location.reload(), 450)
}

async function safeCopyText(value: string, label: string) {
  copied.value = ''
  if (!navigator.clipboard) return
  await navigator.clipboard.writeText(value)
  copied.value = `${label} 已复制`
  window.setTimeout(() => {
    copied.value = ''
  }, 1800)
}

function openSwagger() {
  window.open(swaggerUrl.value, '_blank', 'noopener,noreferrer')
}

async function runDiagnostics() {
  loading.value = true
  diagnostics.value.checkedAt = new Date().toLocaleString('zh-CN', { hour12: false })

  try {
    const health = await getHealth()
    diagnostics.value.healthStatus = health.status === 'ok' ? '在线' : '离线'
    diagnostics.value.healthDetail = `${health.service ?? 'Hanglian API'} / ${health.version ?? 'unknown'}`
  } catch {
    diagnostics.value.healthStatus = '离线'
    diagnostics.value.healthDetail = '当前 API 不可达，请检查本机后端、云端服务或平板网络。'
  }

  const latency = await measureApiLatency()
  diagnostics.value.latencyMs = latency.ok ? latency.latencyMs : null

  try {
    const source = await getDataSourceStatus()
    diagnostics.value.dataSource = source.dataSource
    diagnostics.value.dataSourceStatus = source
  } catch {
    diagnostics.value.dataSource = 'unknown'
    diagnostics.value.dataSourceStatus = null
  } finally {
    loading.value = false
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    syncRuntimeForm()
    void runDiagnostics()
  },
)
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="接口设置与诊断" class="network-diagnostics-dialog">
    <div class="grid max-h-[72vh] gap-4 overflow-auto pr-1">
      <PrimeMessage v-if="hostInfo.mixedContentRisk" severity="warn" :closable="false">
        当前平板页面是 HTTPS，但 API 是 HTTP，浏览器可能拦截请求。建议云端 API 使用 HTTPS。
      </PrimeMessage>

      <section class="system-hero-panel">
        <Server :size="36" />
        <div>
          <p class="section-kicker">TABLET API</p>
          <h3>{{ runtimeConfig.label }}</h3>
          <p class="break-all">{{ hostInfo.apiBaseUrl }}</p>
        </div>
        <PrimeTag :severity="healthSeverity" :value="diagnostics.healthStatus" />
      </section>

      <section class="section-bay">
        <p class="section-kicker">API PROFILE</p>
        <div class="api-profile-grid">
          <button
            v-for="card in modeCards"
            :key="card.mode"
            class="api-profile-card"
            :class="{ active: selectedMode === card.mode }"
            type="button"
            @click="selectMode(card.mode)"
          >
            <component :is="card.icon" :size="24" />
            <strong>{{ card.title }}</strong>
            <span>{{ card.note }}</span>
            <small class="break-all">{{ card.mode === 'custom' ? customApiBaseUrl || card.url : card.url }}</small>
          </button>
        </div>
        <label v-if="selectedMode === 'custom'" class="api-custom-input">
          <span>自定义 API 地址</span>
          <PrimeInputText v-model="customApiBaseUrl" placeholder="https://example.com/api" />
        </label>
      </section>

      <div class="diagnostic-grid">
        <article v-for="row in statusRows" :key="row.label" class="diagnostic-card" :class="toneClass(row.tone)">
          <div class="diagnostic-card-head">
            <CheckCircle2 v-if="row.tone === 'good'" :size="22" />
            <WifiOff v-else-if="row.tone === 'bad'" :size="22" />
            <HardDrive v-else :size="22" />
            <span>{{ row.label }}</span>
          </div>
          <strong class="break-all">{{ row.value }}</strong>
        </article>
      </div>

      <section class="network-tip-panel">
        <p class="section-kicker">CURRENT STATUS</p>
        <div class="network-tip-list">
          <span>最后检测：{{ diagnostics.checkedAt }}</span>
          <span>健康信息：{{ diagnostics.healthDetail }}</span>
          <span>数据库连接串不会在平板端完整显示。</span>
          <span>本弹窗只做读取检测和本地接口切换，不执行迁移、seed 或写库命令。</span>
        </div>
      </section>

      <PrimeMessage v-if="copied" severity="success" :closable="false">{{ copied }}</PrimeMessage>
    </div>

    <template #footer>
      <PrimeButton severity="secondary" label="复制 API" @click="safeCopyText(hostInfo.apiBaseUrl, 'API 地址')">
        <template #icon><Clipboard :size="17" /></template>
      </PrimeButton>
      <PrimeButton severity="secondary" label="Swagger" @click="openSwagger">
        <template #icon><ExternalLink :size="17" /></template>
      </PrimeButton>
      <PrimeButton severity="secondary" label="恢复自动" @click="resetToAutoAndReload">
        <template #icon><RotateCcw :size="17" /></template>
      </PrimeButton>
      <PrimeButton :loading="loading" severity="secondary" label="重新检测" @click="runDiagnostics">
        <template #icon><RefreshCw :size="17" /></template>
      </PrimeButton>
      <PrimeButton label="保存并刷新" @click="applyProfileAndReload" />
    </template>
  </PrimeDialog>
</template>
