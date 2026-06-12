<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import dayjs from 'dayjs'
import { CalendarDays, Factory, HardDrive, Maximize2, PackageCheck, ShieldCheck, UserRound, Wrench } from 'lucide-vue-next'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { APP_STAGE, APP_VERSION } from '@/config/app-version'
import { useProductionStore } from '@/stores/production-store'
import { useUiStore } from '@/stores/ui-store'

const store = useProductionStore()
const uiStore = useUiStore()
const confirm = useConfirm()
const toast = useToast()
const emit = defineEmits<{
  'open-network': []
  'open-field-qa': []
  'open-system-info': []
  'open-demo-guide': []
  'open-pwa-install': []
  'open-pwa-diagnostics': []
  'open-import-center': []
  'open-demo-data-manager': []
  'open-demo-readiness': []
  'open-freeze-checklist': []
  'open-demo-assets-guide': []
  'open-roadmap': []
  'open-migration': []
}>()
const currentTime = ref(dayjs().format('YYYY年MM月DD日 HH:mm'))
const demoToolsMenu = ref<{ toggle: (event: Event) => void } | null>(null)
let timer: number | undefined

const roleLabel = computed(() => (store.activeProcess === 'front' ? '前段组长' : '后段组长'))
const apiLabel = computed(() => {
  if (store.offlineDemoMode) return '离线演示模式'
  return store.apiOnline ? 'API 在线' : 'API 检查中'
})
const apiSeverity = computed(() => (store.apiOnline ? 'success' : store.offlineDemoMode ? 'warn' : 'info'))

const demoToolItems = [
  { label: '系统信息', icon: 'pi pi-info-circle', command: () => emit('open-system-info') },
  { label: '演示说明', icon: 'pi pi-book', command: () => emit('open-demo-guide') },
  { label: '安装到平板桌面', icon: 'pi pi-mobile', command: () => emit('open-pwa-install') },
  { label: '数据导入中心', icon: 'pi pi-file-import', command: () => emit('open-import-center') },
  { separator: true },
  { label: '网络诊断', icon: 'pi pi-wifi', command: () => emit('open-network') },
  { label: 'PWA / 平板诊断', icon: 'pi pi-tablet', command: () => emit('open-pwa-diagnostics') },
  { label: '现场走查', icon: 'pi pi-list-check', command: () => emit('open-field-qa') },
  { separator: true },
  { label: '演示数据管理', icon: 'pi pi-database', command: () => emit('open-demo-data-manager') },
  { label: '演示前检查', icon: 'pi pi-check-circle', command: () => emit('open-demo-readiness') },
  { label: '冻结前验收', icon: 'pi pi-verified', command: () => emit('open-freeze-checklist') },
  { label: '演示资料说明', icon: 'pi pi-folder-open', command: () => emit('open-demo-assets-guide') },
  { label: '后续路线', icon: 'pi pi-compass', command: () => emit('open-roadmap') },
  { label: '迁移预览', icon: 'pi pi-server', command: () => emit('open-migration') },
  { separator: true },
  { label: '重置演示界面状态', icon: 'pi pi-refresh', class: 'danger-menu-item', command: () => confirmResetDemoUi() },
]

function toggleFieldMode() {
  void uiStore.toggleFieldMode()
}

function openDemoTools(event: Event) {
  demoToolsMenu.value?.toggle(event)
}

function confirmResetDemoUi() {
  confirm.require({
    header: '重置演示界面状态',
    message: '该操作只会清除本机浏览器中的演示界面状态，不会删除上传资料、metadata、审计记录或数据库内容。',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: '确认重置',
    rejectLabel: '取消',
    acceptClass: 'p-button-danger',
    accept: () => {
      uiStore.resetDemoUiState()
      toast.add({ severity: 'success', summary: '演示界面状态已重置', detail: '未删除上传资料和审计记录。', life: 2600 })
      window.setTimeout(() => window.location.reload(), 800)
    },
  })
}

onMounted(() => {
  timer = window.setInterval(() => {
    currentTime.value = dayjs().format('YYYY年MM月DD日 HH:mm')
  }, 30_000)
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <header class="warm-topbar warm-enter">
    <div class="flex min-w-0 items-center gap-4">
      <div class="warm-logo-mark">
        <Factory :size="30" stroke-width="2.4" />
      </div>
      <div class="min-w-0">
        <p class="section-kicker">HANG LIAN CONTROL / TABLET PWA</p>
        <h1 class="truncate text-[25px] font-black leading-tight tracking-normal text-[#342316]">
          线束车间生产计划资料管控系统
        </h1>
        <div class="mt-1 flex flex-wrap gap-2">
          <PrimeTag severity="warn" :value="`${APP_VERSION} ${APP_STAGE}`" />
          <PrimeTag severity="info" value="Mock 数据源" />
        </div>
      </div>
    </div>

    <div class="warm-topbar-info grid grid-cols-4 gap-2 text-sm font-bold">
      <div class="warm-chip">
        <CalendarDays :size="17" />
        <span>{{ currentTime }}</span>
      </div>
      <div class="warm-chip">
        <ShieldCheck :size="17" />
        <span>A 班</span>
      </div>
      <div class="warm-chip">
        <UserRound :size="17" />
        <span>{{ roleLabel }}</span>
      </div>
      <div class="warm-chip">
        <span :class="['status-lamp', { offline: !store.apiOnline }]" />
        <span>组长演示账号</span>
      </div>
    </div>

    <div class="warm-topbar-system grid grid-cols-[minmax(0,1fr)_260px] items-center gap-3">
      <div class="space-y-2">
        <PrimeTag :severity="apiSeverity" :value="apiLabel" />
        <div class="flex items-center gap-2 text-xs font-bold text-[#76512a]">
          <HardDrive :size="15" />
          <span>{{ store.dataSourceStatus.dataSource === 'prisma' ? 'Prisma 数据源' : 'Mock 数据源' }}</span>
        </div>
      </div>
      <div class="warm-topbar-action-grid">
        <PrimeButton
          severity="secondary"
          label="演示工具"
          @click="openDemoTools"
        >
          <template #icon><Wrench :size="17" /></template>
        </PrimeButton>
        <PrimeButton
          severity="secondary"
          :label="uiStore.fieldMode ? '退出现场' : '现场模式'"
          @click="toggleFieldMode"
        >
          <template #icon><Maximize2 :size="17" /></template>
        </PrimeButton>
        <div class="warm-demo-hints">
          <span><PackageCheck :size="14" /> Mock 演示</span>
          <span>未接 Sealos</span>
        </div>
        <PrimeMenu ref="demoToolsMenu" :model="demoToolItems" popup class="warm-mini-menu" />
      </div>
    </div>
  </header>
</template>
