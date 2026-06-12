<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { MonitorSmartphone, PlusCircle, ShieldCheck } from 'lucide-vue-next'
import { useToast } from 'primevue/usetoast'
import { APP_STAGE, APP_VERSION } from '@/config/app-version'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const toast = useToast()
const installEvent = ref<BeforeInstallPromptEvent | null>(null)
const installed = ref(false)

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})
const isStandalone = computed(() => {
  if (typeof window === 'undefined') return false
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
})
const canPromptInstall = computed(() => Boolean(installEvent.value) && !isStandalone.value && !installed.value)
const isHttpLan = computed(() => {
  if (typeof window === 'undefined') return false
  return window.location.protocol === 'http:' && !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
})

function handleBeforeInstallPrompt(event: Event) {
  event.preventDefault()
  installEvent.value = event as BeforeInstallPromptEvent
}

function handleInstalled() {
  installed.value = true
  installEvent.value = null
}

async function installToDesktop() {
  if (!installEvent.value) return
  await installEvent.value.prompt()
  const choice = await installEvent.value.userChoice.catch(() => ({ outcome: 'dismissed' as const, platform: '' }))
  installEvent.value = null
  toast.add({
    severity: choice.outcome === 'accepted' ? 'success' : 'info',
    summary: choice.outcome === 'accepted' ? '已请求安装' : '已取消安装',
    detail: choice.outcome === 'accepted' ? '如浏览器支持，将添加到平板桌面。' : '可稍后从演示工具再次打开安装说明。',
    life: 3000,
  })
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleInstalled)
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.removeEventListener('appinstalled', handleInstalled)
})
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="安装到平板桌面" class="system-info-dialog">
    <div class="grid max-h-[72vh] gap-4 overflow-auto pr-1">
      <section class="system-hero-panel">
        <MonitorSmartphone :size="36" />
        <div>
          <p class="section-kicker">PWA INSTALL</p>
          <h3>{{ APP_VERSION }} {{ APP_STAGE }}</h3>
          <p>可在支持的安卓浏览器中添加到平板桌面，当前仍为 Mock 演示系统。</p>
        </div>
        <PrimeTag :severity="isStandalone ? 'success' : 'info'" :value="isStandalone ? '应用模式' : '浏览器模式'" />
      </section>

      <PrimeMessage v-if="isStandalone || installed" severity="success" :closable="false">
        已以应用模式运行，或浏览器已接受安装请求。
      </PrimeMessage>

      <section class="section-bay">
        <p class="section-kicker">INSTALL</p>
        <div class="pwa-install-panel">
          <PrimeButton v-if="canPromptInstall" label="安装到平板桌面" @click="installToDesktop">
            <template #icon><PlusCircle :size="18" /></template>
          </PrimeButton>
          <div v-else class="pwa-manual-steps">
            <strong>当前浏览器未提供直接安装按钮</strong>
            <span>1. 打开浏览器菜单</span>
            <span>2. 选择“添加到主屏幕”或“安装应用”</span>
            <span>3. 回到桌面，从图标进入系统</span>
          </div>
        </div>
      </section>

      <PrimeMessage v-if="isHttpLan" severity="warn" :closable="false">
        当前为局域网演示环境，部分浏览器可能只支持添加快捷方式。后续 HTTPS 部署后可获得完整 PWA 体验。
      </PrimeMessage>

      <PrimeMessage severity="info" :closable="false">
        安装入口不会连接数据库，不会上传资料，不会写入 Sealos。当前仍显示 Mock 数据源、未接微盘、未接真实语音。
      </PrimeMessage>
    </div>

    <template #footer>
      <PrimeButton severity="secondary" label="我已了解安装方式" @click="dialogVisible = false">
        <template #icon><ShieldCheck :size="17" /></template>
      </PrimeButton>
    </template>
  </PrimeDialog>
</template>
