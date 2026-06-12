<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Clipboard, ExternalLink, HardDrive, Network, RefreshCw, Router, Server, ShieldAlert, TabletSmartphone } from 'lucide-vue-next'
import WarmErrorState from '@/components/common/WarmErrorState.vue'
import { getApiHostInfo } from '@/config/api-base'
import { apiBaseUrl, checkFileService, getDataSourceStatus, getHealth, measureApiLatency } from '@/services/api'
import { useProductionStore } from '@/stores/production-store'

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
  dataSource: string
  dataSourceDetail: string
  fileServiceStatus: '未检测' | '正常' | '异常'
  fileServiceDetail: string
  filesRouteDetail: string
  checkedAt: string
}

const store = useProductionStore()
const loading = ref(false)
const copied = ref('')
const diagnostics = ref<DiagnosticsState>({
  healthStatus: '未检测',
  healthDetail: '打开面板后自动检测，也可手动重试。',
  latencyMs: null,
  dataSource: 'Mock',
  dataSourceDetail: '当前未连接 Sealos PostgreSQL。',
  fileServiceStatus: '未检测',
  fileServiceDetail: '等待检测 /api/documents/file-health。',
  filesRouteDetail: '/api/files/<storedFileName> 仅在上传资料后用于预览或下载。',
  checkedAt: '-',
})

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const hostInfo = computed(() => getApiHostInfo())
const userAgentShort = computed(() => {
  if (typeof navigator === 'undefined') return 'Unknown browser'
  const agent = navigator.userAgent
  return agent.length > 92 ? `${agent.slice(0, 92)}...` : agent
})
const tabletUrl = computed(() => (typeof window === 'undefined' ? 'http://localhost:5173/tablet' : window.location.href))
const swaggerUrl = computed(() => `${apiBaseUrl}/docs`)
const healthSeverity = computed(() => diagnostics.value.healthStatus === '在线' ? 'success' : diagnostics.value.healthStatus === '离线' ? 'danger' : 'info')
const fileSeverity = computed(() => diagnostics.value.fileServiceStatus === '正常' ? 'success' : diagnostics.value.fileServiceStatus === '异常' ? 'danger' : 'info')

function safeCopyText(value: string, label: string) {
  copied.value = ''
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    void navigator.clipboard.writeText(value).then(() => {
      copied.value = `${label} 已复制`
      window.setTimeout(() => {
        copied.value = ''
      }, 1800)
    })
  }
}

function openSwagger() {
  if (typeof window !== 'undefined') {
    window.open(swaggerUrl.value, '_blank', 'noopener,noreferrer')
  }
}

async function runDiagnostics() {
  loading.value = true
  const checkedAt = new Date().toLocaleString('zh-CN', { hour12: false })
  try {
    const health = await getHealth()
    diagnostics.value.healthStatus = health.status === 'ok' ? '在线' : '离线'
    diagnostics.value.healthDetail = `${health.service ?? 'Hanglian API'} / ${health.version ?? 'unknown'}`
  } catch {
    diagnostics.value.healthStatus = '离线'
    diagnostics.value.healthDetail = '健康检查失败，请确认电脑 API 服务已启动并允许局域网访问。'
  }

  const latency = await measureApiLatency()
  diagnostics.value.latencyMs = latency.ok ? latency.latencyMs : null

  try {
    const source = await getDataSourceStatus()
    diagnostics.value.dataSource = source.dataSource === 'prisma' ? 'Prisma' : 'Mock'
    diagnostics.value.dataSourceDetail = source.dataSource === 'prisma'
      ? '已切到 Prisma 读路径；本面板不执行数据库写入。'
      : 'Mock 内存/本地演示数据，Sealos 未连接。'
  } catch {
    diagnostics.value.dataSource = store.dataSourceStatus.dataSource === 'prisma' ? 'Prisma' : 'Mock'
    diagnostics.value.dataSourceDetail = '数据源状态接口不可用，使用当前前端状态展示。'
  }

  const fileResult = await checkFileService({
    planId: store.selectedPlan.id,
    productId: store.selectedPlan.productId ?? store.selectedPlan.productCode,
  })
  diagnostics.value.fileServiceStatus = fileResult.ok ? '正常' : '异常'
  diagnostics.value.fileServiceDetail = `${fileResult.message} / ${fileResult.latencyMs}ms`
  diagnostics.value.filesRouteDetail = fileResult.ok
    ? '/api/files/<storedFileName> 可用于已上传资料的预览流；Mock 占位资料不会生成真实文件流。'
    : '文件健康接口异常，请先确认 API 服务和上传目录。'
  diagnostics.value.checkedAt = checkedAt
  loading.value = false
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) void runDiagnostics()
  },
)
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="网络诊断" class="network-diagnostics-dialog">
    <div class="grid max-h-[72vh] gap-4 overflow-auto pr-1">
      <PrimeMessage v-if="hostInfo.mixedContentRisk" severity="warn" :closable="false">
        当前前端为 HTTPS，但 API 为 HTTP，安卓平板浏览器可能拦截请求；现场演示建议前端和 API 都使用 HTTP 局域网地址。
      </PrimeMessage>

      <WarmErrorState
        v-if="diagnostics.healthStatus === '离线'"
        title="API 健康检查失败"
        description="请确认电脑已执行 npm run dev:lan，平板和电脑在同一网络，并允许 Node.js 通过防火墙。"
        action-label="重新检测"
        @action="runDiagnostics"
      />

      <div class="diagnostic-grid">
        <article class="diagnostic-card">
          <div class="diagnostic-card-head">
            <TabletSmartphone :size="24" />
            <span>访问模式</span>
          </div>
          <strong>{{ hostInfo.accessMode === 'lan' ? '局域网平板访问' : '本机访问' }}</strong>
          <p>{{ hostInfo.frontendOrigin }}</p>
        </article>
        <article class="diagnostic-card">
          <div class="diagnostic-card-head">
            <Server :size="24" />
            <span>API 地址</span>
          </div>
          <strong class="break-all">{{ hostInfo.apiBaseUrl }}</strong>
          <p>{{ hostInfo.frontendHostname }} / {{ hostInfo.frontendProtocol }}</p>
        </article>
        <article class="diagnostic-card">
          <div class="diagnostic-card-head">
            <Network :size="24" />
            <span>健康检查</span>
          </div>
          <PrimeTag :severity="healthSeverity" :value="diagnostics.healthStatus" />
          <p>{{ diagnostics.healthDetail }}</p>
        </article>
        <article class="diagnostic-card">
          <div class="diagnostic-card-head">
            <Router :size="24" />
            <span>延迟</span>
          </div>
          <strong>{{ diagnostics.latencyMs === null ? '-' : `${diagnostics.latencyMs}ms` }}</strong>
          <p>最后检测：{{ diagnostics.checkedAt }}</p>
        </article>
        <article class="diagnostic-card">
          <div class="diagnostic-card-head">
            <HardDrive :size="24" />
            <span>数据源</span>
          </div>
          <strong>{{ diagnostics.dataSource }}</strong>
          <p>{{ diagnostics.dataSourceDetail }}</p>
        </article>
        <article class="diagnostic-card">
          <div class="diagnostic-card-head">
            <ShieldAlert :size="24" />
            <span>文件服务</span>
          </div>
          <PrimeTag :severity="fileSeverity" :value="diagnostics.fileServiceStatus" />
          <p>{{ diagnostics.fileServiceDetail }}</p>
        </article>
      </div>

      <section class="section-bay">
        <p class="section-kicker">FILE PREVIEW ROUTE</p>
        <h3 class="text-xl font-black text-[#342316]">/api/files 可访问性</h3>
        <p class="mt-2 text-base font-bold text-[#68411f]">{{ diagnostics.filesRouteDetail }}</p>
      </section>

      <section class="network-tip-panel">
        <p class="section-kicker">ANDROID TABLET TIPS</p>
        <div class="network-tip-list">
          <span>电脑和平板连接同一 Wi-Fi 或同一网段。</span>
          <span>用 `npm run dev:lan` 启动，并在平板浏览器输入电脑 IPv4 的 5173 地址。</span>
          <span>如果 API 离线，检查 Windows 防火墙是否允许 Node.js 局域网访问。</span>
          <span>当前不会连接 Sealos、企业微信微盘或真实语音平台。</span>
        </div>
        <p class="mt-3 break-all text-xs font-bold text-[#76512a]">UA：{{ userAgentShort }}</p>
      </section>

      <PrimeMessage v-if="copied" severity="success" :closable="false">{{ copied }}</PrimeMessage>
    </div>

    <template #footer>
      <PrimeButton severity="secondary" label="复制 API" @click="safeCopyText(hostInfo.apiBaseUrl, 'API 地址')">
        <template #icon><Clipboard :size="17" /></template>
      </PrimeButton>
      <PrimeButton severity="secondary" label="复制平板地址" @click="safeCopyText(tabletUrl, '平板地址')">
        <template #icon><Clipboard :size="17" /></template>
      </PrimeButton>
      <PrimeButton severity="secondary" label="打开 Swagger" @click="openSwagger">
        <template #icon><ExternalLink :size="17" /></template>
      </PrimeButton>
      <PrimeButton :loading="loading" label="重新检测" @click="runDiagnostics">
        <template #icon><RefreshCw :size="17" /></template>
      </PrimeButton>
    </template>
  </PrimeDialog>
</template>
