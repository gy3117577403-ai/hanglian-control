<script setup lang="ts">
import { computed } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { Clipboard, DatabaseZap, HardDrive, Info, RotateCcw, ShieldCheck, Wifi } from 'lucide-vue-next'
import { APP_BUILD_CHANNEL, APP_RELEASE_NAME, APP_RUNTIME_FLAGS, APP_STAGE, APP_SYSTEM_NAME, APP_VERSION } from '@/config/app-version'
import { getApiHostInfo } from '@/config/api-base'
import { apiBaseUrl } from '@/services/api'
import { useAuthStore } from '@/stores/auth-store'
import { useProductionStore } from '@/stores/production-store'
import { useUiStore } from '@/stores/ui-store'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'open-feedback': []
}>()

const confirm = useConfirm()
const toast = useToast()
const store = useProductionStore()
const uiStore = useUiStore()
const auth = useAuthStore()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const hostInfo = computed(() => getApiHostInfo())
const swaggerUrl = computed(() => `${apiBaseUrl}/docs`)
const modeRows = computed(() => [
  { label: '数据源', value: APP_RUNTIME_FLAGS.dataSource, icon: DatabaseZap },
  { label: 'Sealos', value: APP_RUNTIME_FLAGS.sealosConnected ? '已接入' : '未接入', icon: ShieldCheck },
  { label: '企业微信微盘', value: APP_RUNTIME_FLAGS.wecomDiskConnected ? '已接入' : '未接入', icon: HardDrive },
  { label: 'Mock 登录', value: auth.loggedIn ? `${auth.userName} / ${auth.roleLabel}` : '未选择角色', icon: ShieldCheck },
  { label: '企业微信登录', value: APP_RUNTIME_FLAGS.wecomLoginConnected ? '已接入' : '未接入', icon: ShieldCheck },
  { label: '真实语音', value: APP_RUNTIME_FLAGS.realVoiceConnected ? '已接入' : '未接入', icon: Wifi },
  { label: '文件存储', value: APP_RUNTIME_FLAGS.fileStorage, icon: HardDrive },
  { label: '平板访问', value: APP_RUNTIME_FLAGS.lanAccess ? '支持局域网访问' : '仅本机', icon: Wifi },
])

const safetyRows = [
  '数据库写入：禁用',
  '危险数据库操作：禁用',
  '本地 .env.local：不提交',
  '真实客户资料：不应上传到 Git',
  '企业微信登录：未接入',
  '角色会话：仅 localStorage Mock token',
]

const commands = [
  'npm run dev',
  'npm run dev:lan',
  'npm run pwa:assets',
  'npm run pwa:check',
  'npm run demo:imports',
  'npm run import-flow:check',
  'npm run maintenance-flow:check',
  'npm run auth-flow:check',
  'npm run settings-flow:check',
  'npm run field-pilot:check',
  'npm run demo:assets',
  'npm run demo:check',
  'npm run demo:freeze-check',
  'npm run file-flow:check',
  'npm run security:check',
  'npm run build',
  'npm run check',
]

function copySystemSummary() {
  const summary = [
    `${APP_SYSTEM_NAME} ${APP_VERSION} ${APP_STAGE}`,
    `版本名称：${APP_RELEASE_NAME}`,
    `构建通道：${APP_BUILD_CHANNEL}`,
    `前端地址：${hostInfo.value.frontendOrigin}`,
    `API 地址：${hostInfo.value.apiBaseUrl}`,
    `Swagger：${swaggerUrl.value}`,
    '数据源：Mock',
    'Sealos：未接入',
    '企业微信微盘：未接入',
    '真实语音：未接入',
  ].join('\n')

  if (!navigator.clipboard) return
  void navigator.clipboard.writeText(summary).then(() => {
    toast.add({ severity: 'success', summary: '系统信息已复制', detail: '已复制安全摘要，不包含密钥或数据库连接串。', life: 2600 })
  })
}

function confirmResetDemoUi() {
  confirm.require({
    header: '重置演示界面状态',
    message: '该操作只会清除本机浏览器中的演示界面状态，不会删除上传资料和审计记录。',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: '确认重置',
    rejectLabel: '取消',
    acceptClass: 'p-button-danger',
    accept: () => {
      uiStore.resetDemoUiState()
      toast.add({ severity: 'success', summary: '演示界面状态已重置', detail: '上传资料、审计记录和 metadata 均未删除。', life: 2600 })
      window.setTimeout(() => window.location.reload(), 800)
    },
  })
}
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="系统信息" class="system-info-dialog">
    <div class="grid max-h-[72vh] gap-4 overflow-auto pr-1">
      <section class="system-hero-panel">
        <Info :size="36" />
        <div>
          <p class="section-kicker">SYSTEM INFO</p>
          <h3>{{ APP_SYSTEM_NAME }}</h3>
          <p>{{ APP_VERSION }} {{ APP_STAGE }} / {{ APP_RELEASE_NAME }} / {{ APP_BUILD_CHANNEL }}</p>
        </div>
        <PrimeTag severity="info" value="Mock 数据源" />
      </section>

      <div class="diagnostic-grid">
        <article v-for="item in modeRows" :key="item.label" class="diagnostic-card">
          <div class="diagnostic-card-head">
            <component :is="item.icon" :size="23" />
            <span>{{ item.label }}</span>
          </div>
          <strong>{{ item.value }}</strong>
          <p>当前演示版不伪装生产正式环境。</p>
        </article>
      </div>

      <section class="section-bay">
        <p class="section-kicker">ACCESS</p>
        <div class="system-info-list">
          <div><span>当前前端地址</span><strong class="break-all">{{ hostInfo.frontendOrigin }}</strong></div>
          <div><span>当前 API 地址</span><strong class="break-all">{{ hostInfo.apiBaseUrl }}</strong></div>
          <div><span>Swagger 地址</span><strong class="break-all">{{ swaggerUrl }}</strong></div>
        </div>
      </section>

      <section class="section-bay">
        <p class="section-kicker">SAFETY</p>
        <div class="demo-file-grid">
          <span v-for="item in safetyRows" :key="item">{{ item }}</span>
        </div>
        <p class="mt-3 text-sm font-bold text-[#76512a]">
          当前 API 状态：{{ store.apiOnline ? '在线' : '离线/检查中' }}；不会显示完整数据库连接信息，也不会写入真实数据库。
        </p>
      </section>

      <section class="section-bay">
        <p class="section-kicker">COMMANDS</p>
        <div class="command-grid">
          <code v-for="command in commands" :key="command">{{ command }}</code>
        </div>
      </section>
    </div>

    <template #footer>
      <PrimeButton severity="secondary" label="复制系统摘要" @click="copySystemSummary">
        <template #icon><Clipboard :size="17" /></template>
      </PrimeButton>
      <PrimeButton severity="danger" label="重置演示界面状态" @click="confirmResetDemoUi">
        <template #icon><RotateCcw :size="17" /></template>
      </PrimeButton>
      <PrimeButton label="关闭" @click="dialogVisible = false" />
    </template>
  </PrimeDialog>
</template>
