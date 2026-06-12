<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Clipboard, Download, Network, RefreshCw, TabletSmartphone } from 'lucide-vue-next'
import { useToast } from 'primevue/usetoast'
import { getApiHostInfo } from '@/config/api-base'
import { APP_RUNTIME_FLAGS, APP_STAGE, APP_VERSION } from '@/config/app-version'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'open-install': []
  'open-network': []
}>()

interface DiagnosticRow {
  label: string
  value: string
  tone: 'good' | 'warn' | 'info'
}

const toast = useToast()
const rows = ref<DiagnosticRow[]>([])
const checkedAt = ref('-')
const copyFallbackVisible = ref(false)

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})
const reportText = computed(() => [
  `线束车间生产计划资料管控系统 ${APP_VERSION} ${APP_STAGE} PWA / 平板诊断`,
  `时间：${checkedAt.value}`,
  ...rows.value.map((row) => `- ${row.label}：${row.value}`),
  '安全边界：Mock 数据源，未接 Sealos / 微盘 / 真实语音。',
].join('\n'))

function yesNo(value: boolean) {
  return value ? '是' : '否'
}

function isStandaloneMode() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

function isLikelyLanIp(hostname: string) {
  return /^(10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.|198\.18\.)/.test(hostname)
}

async function runDiagnostics() {
  const hostInfo = getApiHostInfo()
  const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration().catch(() => undefined) : undefined
  const isPortrait = window.innerWidth < window.innerHeight
  const supportsInstallPrompt = 'onbeforeinstallprompt' in window
  checkedAt.value = new Date().toLocaleString('zh-CN', { hour12: false })
  rows.value = [
    { label: '当前访问地址', value: window.location.href, tone: 'info' },
    { label: '当前 API 地址', value: hostInfo.apiBaseUrl, tone: 'info' },
    { label: '是否 HTTPS', value: yesNo(window.location.protocol === 'https:'), tone: window.location.protocol === 'https:' ? 'good' : 'warn' },
    { label: '是否 localhost', value: yesNo(hostInfo.accessMode === 'local'), tone: hostInfo.accessMode === 'local' ? 'good' : 'info' },
    { label: '是否局域网 IP', value: yesNo(isLikelyLanIp(window.location.hostname)), tone: isLikelyLanIp(window.location.hostname) ? 'good' : 'info' },
    { label: '支持 Service Worker', value: yesNo('serviceWorker' in navigator), tone: 'serviceWorker' in navigator ? 'good' : 'warn' },
    { label: 'Service Worker 已注册', value: yesNo(Boolean(registration)), tone: registration ? 'good' : 'warn' },
    { label: '支持安装事件', value: yesNo(supportsInstallPrompt), tone: supportsInstallPrompt ? 'good' : 'warn' },
    { label: 'standalone 模式', value: yesNo(isStandaloneMode()), tone: isStandaloneMode() ? 'good' : 'info' },
    { label: '是否竖屏', value: yesNo(isPortrait), tone: isPortrait ? 'warn' : 'good' },
    { label: '当前屏幕尺寸', value: `${window.innerWidth} x ${window.innerHeight}`, tone: 'info' },
    { label: 'userAgent', value: navigator.userAgent.slice(0, 120), tone: 'info' },
    { label: '当前版本', value: `${APP_VERSION} ${APP_STAGE}`, tone: 'info' },
    { label: '数据源', value: APP_RUNTIME_FLAGS.dataSource, tone: 'info' },
    { label: 'Sealos / 微盘 / 真实语音', value: '均未接入', tone: 'good' },
  ]
}

async function copyDiagnostics() {
  try {
    await navigator.clipboard.writeText(reportText.value)
    copyFallbackVisible.value = false
    toast.add({ severity: 'success', summary: '诊断结果已复制', detail: '不包含密钥或数据库连接串。', life: 2600 })
  } catch {
    copyFallbackVisible.value = true
    toast.add({ severity: 'warn', summary: '无法自动复制', detail: '请在文本框中手动复制。', life: 2600 })
  }
}

function severityFor(tone: DiagnosticRow['tone']) {
  if (tone === 'good') return 'success'
  if (tone === 'warn') return 'warn'
  return 'info'
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) void runDiagnostics()
  },
)
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="PWA / 平板诊断" class="system-info-dialog">
    <div class="grid max-h-[72vh] gap-4 overflow-auto pr-1">
      <section class="system-hero-panel">
        <TabletSmartphone :size="36" />
        <div>
          <p class="section-kicker">PWA TABLET DIAGNOSTICS</p>
          <h3>{{ APP_VERSION }} {{ APP_STAGE }}</h3>
          <p>诊断平板访问、PWA 安装和横屏状态，不显示密钥，不连接数据库。</p>
        </div>
        <PrimeTag severity="info" value="Mock 数据源" />
      </section>

      <div class="readiness-grid">
        <article v-for="row in rows" :key="row.label" class="readiness-card">
          <PrimeTag :severity="severityFor(row.tone)" :value="row.label" />
          <p class="break-all">{{ row.value }}</p>
        </article>
      </div>

      <PrimeMessage severity="warn" :closable="false">
        局域网 HTTP 演示环境可能只能添加桌面快捷方式；完整 PWA 安装建议后续使用 HTTPS 部署环境。
      </PrimeMessage>

      <section v-if="copyFallbackVisible" class="section-bay">
        <p class="section-kicker">COPY FALLBACK</p>
        <PrimeTextarea :model-value="reportText" class="mt-2 min-h-40 w-full text-sm font-bold" readonly />
      </section>
    </div>

    <template #footer>
      <PrimeButton severity="secondary" label="重新检测" @click="runDiagnostics">
        <template #icon><RefreshCw :size="17" /></template>
      </PrimeButton>
      <PrimeButton severity="secondary" label="打开安装说明" @click="emit('open-install')">
        <template #icon><Download :size="17" /></template>
      </PrimeButton>
      <PrimeButton severity="secondary" label="打开网络诊断" @click="emit('open-network')">
        <template #icon><Network :size="17" /></template>
      </PrimeButton>
      <PrimeButton label="复制诊断结果" @click="copyDiagnostics">
        <template #icon><Clipboard :size="17" /></template>
      </PrimeButton>
    </template>
  </PrimeDialog>
</template>
