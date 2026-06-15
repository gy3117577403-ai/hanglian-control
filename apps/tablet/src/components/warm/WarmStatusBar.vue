<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { CalendarDays, Factory, HardDrive, Maximize2, PackageCheck, ShieldCheck, UserRound, UserRoundCog, Wrench } from 'lucide-vue-next'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { APP_STAGE, APP_VERSION } from '@/config/app-version'
import { DEMO_DATA_MODE } from '@/config/demo-data-mode'
import { PERMISSIONS, permissionLabels } from '@/lib/permissions'
import { useAuthStore } from '@/stores/auth-store'
import { useProductionStore } from '@/stores/production-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useUiStore } from '@/stores/ui-store'
import type { MockUser, Permission } from '@/types/production'

type DemoToolItem = {
  label?: string
  icon?: string
  command?: () => void
  separator?: boolean
  class?: string
  permission?: Permission
  permissions?: Permission[]
}

const store = useProductionStore()
const settingsStore = useSettingsStore()
const uiStore = useUiStore()
const auth = useAuthStore()
const router = useRouter()
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
  'open-maintenance-center': []
  'open-demo-data-manager': []
  'open-demo-readiness': []
  'open-freeze-checklist': []
  'open-demo-assets-guide': []
  'open-roadmap': []
  'open-migration': []
  'open-analytics': []
  'open-system-qa': []
  'open-settings-center': []
  'open-system-feedback': []
  'open-pilot-check': []
  'open-announcements': []
}>()

const currentTime = ref(dayjs().format('YYYY年MM月DD日 HH:mm'))
const demoToolsMenu = ref<{ toggle: (event: Event) => void } | null>(null)
const userMenu = ref<{ toggle: (event: Event) => void } | null>(null)
const roleDialogVisible = ref(false)
const permissionDialogVisible = ref(false)
let timer: number | undefined

const apiLabel = computed(() => {
  if (store.offlineDemoMode) return '离线演示模式'
  return store.apiOnline ? 'API 在线' : 'API 检查中'
})
const apiSeverity = computed(() => (store.apiOnline ? 'success' : store.offlineDemoMode ? 'warn' : 'info'))
const permissionList = computed(() => auth.permissions.map((permission) => permissionLabels[permission] ?? permission))
const stationLabel = computed(() => settingsStore.activeStationProfile?.stationName ?? '未选择工位')

const allDemoToolItems = computed<DemoToolItem[]>(() => [
  { label: '系统信息', icon: 'pi pi-info-circle', permission: PERMISSIONS.SYSTEM_INFO_VIEW, command: () => emit('open-system-info') },
  { label: '系统配置中心', icon: 'pi pi-cog', permission: PERMISSIONS.SETTINGS_VIEW, command: () => emit('open-settings-center') },
  { label: '公告通知', icon: 'pi pi-bell', permission: PERMISSIONS.SETTINGS_ANNOUNCEMENT_VIEW, command: () => emit('open-announcements') },
  { label: '使用反馈', icon: 'pi pi-comment', permission: PERMISSIONS.SETTINGS_FEEDBACK_CREATE, command: () => emit('open-system-feedback') },
  { label: '试运行检查', icon: 'pi pi-clipboard', permission: PERMISSIONS.SETTINGS_PILOT_CHECK_VIEW, command: () => emit('open-pilot-check') },
  { label: '演示说明', icon: 'pi pi-book', permission: PERMISSIONS.SYSTEM_DEMO_TOOLS_VIEW, command: () => emit('open-demo-guide') },
  { label: '安装到平板桌面', icon: 'pi pi-mobile', permission: PERMISSIONS.SYSTEM_DEMO_TOOLS_VIEW, command: () => emit('open-pwa-install') },
  { label: '数据导入中心', icon: 'pi pi-file-import', permission: PERMISSIONS.IMPORT_VIEW, command: () => emit('open-import-center') },
  { label: '资料维护中心', icon: 'pi pi-wrench', permission: PERMISSIONS.MAINTENANCE_VIEW, command: () => emit('open-maintenance-center') },
  { label: '现场统计', icon: 'pi pi-chart-bar', permission: PERMISSIONS.ANALYTICS_VIEW, command: () => emit('open-analytics') },
  { separator: true },
  { label: '网络诊断', icon: 'pi pi-wifi', permission: PERMISSIONS.SYSTEM_DIAGNOSTICS_VIEW, command: () => emit('open-network') },
  { label: 'PWA / 平板诊断', icon: 'pi pi-tablet', permission: PERMISSIONS.SYSTEM_DIAGNOSTICS_VIEW, command: () => emit('open-pwa-diagnostics') },
  { label: '现场走查', icon: 'pi pi-list-check', permission: PERMISSIONS.SYSTEM_DIAGNOSTICS_VIEW, command: () => emit('open-field-qa') },
  { label: '全流程总验收', icon: 'pi pi-shield', permission: PERMISSIONS.SYSTEM_DIAGNOSTICS_VIEW, command: () => emit('open-system-qa') },
  { separator: true },
  { label: '生成演示资料', icon: 'pi pi-folder-open', permission: PERMISSIONS.SYSTEM_DEMO_TOOLS_VIEW, command: () => emit('open-demo-assets-guide') },
  { label: '生成演示导入文件', icon: 'pi pi-file-import', permission: PERMISSIONS.SYSTEM_DEMO_TOOLS_VIEW, command: () => emit('open-import-center') },
  { label: '生成演示知识库', icon: 'pi pi-book', permission: PERMISSIONS.SYSTEM_DEMO_TOOLS_VIEW, command: () => emit('open-maintenance-center') },
  { label: '清理演示数据', icon: 'pi pi-trash', permission: PERMISSIONS.SYSTEM_DEMO_TOOLS_VIEW, command: () => emit('open-demo-data-manager') },
  { label: `当前数据模式：${DEMO_DATA_MODE}`, icon: 'pi pi-database', permission: PERMISSIONS.SYSTEM_DEMO_TOOLS_VIEW, command: () => emit('open-demo-data-manager') },
  { label: '演示前检查', icon: 'pi pi-check-circle', permission: PERMISSIONS.SYSTEM_DEMO_TOOLS_VIEW, command: () => emit('open-demo-readiness') },
  { label: '冻结前验收', icon: 'pi pi-verified', permission: PERMISSIONS.SYSTEM_FREEZE_CHECK_VIEW, command: () => emit('open-freeze-checklist') },
  { label: '演示资料说明', icon: 'pi pi-folder-open', permission: PERMISSIONS.SYSTEM_DEMO_TOOLS_VIEW, command: () => emit('open-demo-assets-guide') },
  { label: '后续路线', icon: 'pi pi-compass', permission: PERMISSIONS.SYSTEM_ROADMAP_VIEW, command: () => emit('open-roadmap') },
  { label: '迁移预览', icon: 'pi pi-server', permission: PERMISSIONS.SYSTEM_INFO_VIEW, command: () => emit('open-migration') },
  { separator: true },
  { label: '重置演示界面状态', icon: 'pi pi-refresh', class: 'danger-menu-item', permission: PERMISSIONS.SYSTEM_DEMO_TOOLS_VIEW, command: () => confirmResetDemoUi() },
])

const demoToolItems = computed(() => {
  const visible: DemoToolItem[] = []
  for (const item of allDemoToolItems.value) {
    if (item.separator) {
      if (visible.length && !visible.at(-1)?.separator) visible.push(item)
      continue
    }
    const allowed = item.permission
      ? auth.hasPermission(item.permission)
      : item.permissions
        ? auth.hasAny(item.permissions)
        : true
    if (allowed) visible.push(item)
  }
  while (visible.at(-1)?.separator) visible.pop()
  return visible
})

const userMenuItems = computed(() => [
  { label: '切换演示角色', icon: 'pi pi-users', command: () => openRoleDialog() },
  { label: '权限说明', icon: 'pi pi-shield', command: () => { permissionDialogVisible.value = true } },
  { separator: true },
  { label: '退出登录', icon: 'pi pi-sign-out', class: 'danger-menu-item', command: () => logout() },
])

function toggleFieldMode() {
  void uiStore.toggleFieldMode()
}

function openDemoTools(event: Event) {
  demoToolsMenu.value?.toggle(event)
}

function openUserMenu(event: Event) {
  userMenu.value?.toggle(event)
}

async function openRoleDialog() {
  await auth.loadMockUsers()
  roleDialogVisible.value = true
}

async function switchRole(user: MockUser) {
  await auth.mockLogin(user.userId)
  if (user.role === 'front_leader') store.activeProcess = 'front'
  if (user.role === 'back_leader') store.activeProcess = 'back'
  roleDialogVisible.value = false
}

async function logout() {
  await auth.logout()
  await router.push('/login')
}

function confirmResetDemoUi() {
  confirm.require({
    header: '重置演示界面状态？',
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
  void settingsStore.initialize().catch(() => undefined)
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
          <PrimeTag severity="info" value="Mock 权限" />
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
        <span>{{ auth.team || 'A 班' }} / {{ stationLabel }}</span>
      </div>
      <div class="warm-chip">
        <UserRoundCog :size="17" />
        <span>{{ auth.roleLabel }}</span>
      </div>
      <button class="warm-chip min-w-0 text-left" type="button" @click="openUserMenu">
        <UserRound :size="17" />
        <span class="truncate">{{ auth.userName }}</span>
      </button>
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
        <PrimeMenu ref="userMenu" :model="userMenuItems" popup class="warm-mini-menu" />
      </div>
    </div>
  </header>

  <PrimeDialog v-model:visible="roleDialogVisible" modal header="切换本地 Mock 角色" class="w-[860px]">
    <div class="grid gap-3">
      <PrimeMessage severity="warn" :closable="false">
        当前仅为本地演示角色切换，不接企业微信登录，不保存真实账号。
      </PrimeMessage>
      <button
        v-for="user in auth.mockUsers"
        :key="user.userId"
        type="button"
        class="warm-user-card"
        @click="switchRole(user)"
      >
        <div class="warm-role-icon">
          <UserRoundCog :size="22" />
        </div>
        <div class="min-w-0 text-left">
          <div class="flex items-center justify-between gap-3">
            <strong class="text-lg text-[#342316]">{{ user.name }}</strong>
            <PrimeTag :severity="auth.currentUser?.userId === user.userId ? 'success' : 'secondary'" :value="user.roleLabel" />
          </div>
          <p class="mt-1 text-sm font-bold text-[#76512a]">{{ user.team }} / {{ user.description }}</p>
        </div>
      </button>
    </div>
  </PrimeDialog>

  <PrimeDialog v-model:visible="permissionDialogVisible" modal header="当前角色权限说明" class="w-[760px]">
    <div class="grid gap-4">
      <div class="warm-user-card">
        <div class="warm-role-icon">
          <ShieldCheck :size="22" />
        </div>
        <div>
          <strong class="text-xl text-[#342316]">{{ auth.userName }} / {{ auth.roleLabel }}</strong>
          <p class="mt-1 text-sm font-bold text-[#76512a]">本权限仅用于 V2.3 本地 Mock 演示，后续可替换为企业微信组织与后端 RBAC。</p>
        </div>
      </div>
      <div class="warm-permission-list">
        <span v-for="item in permissionList" :key="item">{{ item }}</span>
      </div>
    </div>
  </PrimeDialog>
</template>
