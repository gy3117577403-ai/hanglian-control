<script setup lang="ts">
import { computed, ref } from 'vue'
import { Clipboard, Database, FolderOpen, ListChecks, RefreshCw, ShieldAlert } from 'lucide-vue-next'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { APP_RUNTIME_FLAGS, APP_VERSION } from '@/config/app-version'
import { useUiStore } from '@/stores/ui-store'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'open-assets-guide': []
  'open-network': []
  'open-field-qa': []
}>()

const confirm = useConfirm()
const toast = useToast()
const uiStore = useUiStore()
const copyFallbackVisible = ref(false)

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const statusRows = [
  { label: '数据源', value: APP_RUNTIME_FLAGS.dataSource },
  { label: '本地上传文件', value: '由后端本地文件服务管理' },
  { label: '本地 metadata', value: 'documents.json / audit-logs.json' },
  { label: '前端 UI 状态', value: 'localStorage' },
  { label: '演示资料目录', value: 'demo-upload-assets' },
]

const cleanupGuide = [
  '本面板不会自动删除上传文件、审计记录、metadata 或数据库内容。',
  '如需清理本地上传演示资料，请先停止服务，再手动检查 apps/api/storage/uploads。',
  '如需清理本地 metadata，请手动检查 apps/api/storage/metadata/documents.json 和 audit-logs.json。',
  '不要删除真实资料，不要把 uploads 或 metadata JSON 提交到 Git。',
  '当前系统未接 Sealos，不会清空数据库。',
].join('\n')

function confirmResetDemoUi() {
  confirm.require({
    header: '重置前端演示界面状态',
    message: '该操作只清理本机浏览器 localStorage 中的 UI 状态，不会删除上传文件、metadata 或审计记录。',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: '确认重置',
    rejectLabel: '取消',
    acceptClass: 'p-button-danger',
    accept: () => {
      uiStore.resetDemoUiState()
      toast.add({
        severity: 'success',
        summary: '演示界面状态已重置',
        detail: '上传资料和审计记录未删除。',
        life: 2600,
      })
      window.setTimeout(() => window.location.reload(), 800)
    },
  })
}

async function copyCleanupGuide() {
  try {
    await navigator.clipboard.writeText(cleanupGuide)
    copyFallbackVisible.value = false
    toast.add({ severity: 'success', summary: '清理说明已复制', detail: '仅复制说明，不执行清理。', life: 2600 })
  } catch {
    copyFallbackVisible.value = true
    toast.add({ severity: 'warn', summary: '无法自动复制', detail: '请在文本框中手动复制。', life: 2600 })
  }
}
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="演示数据管理" class="system-info-dialog">
    <div class="grid max-h-[72vh] gap-4 overflow-auto pr-1">
      <section class="system-hero-panel">
        <Database :size="36" />
        <div>
          <p class="section-kicker">DEMO DATA</p>
          <h3>{{ APP_VERSION }} 演示数据管理</h3>
          <p>只管理演示说明和前端 UI 状态，不删除后端上传文件或 metadata。</p>
        </div>
        <PrimeTag severity="warn" value="无危险删除" />
      </section>

      <section class="section-bay">
        <p class="section-kicker">STATUS</p>
        <div class="system-info-list">
          <div v-for="item in statusRows" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </section>

      <section class="section-bay">
        <p class="section-kicker">ACTIONS</p>
        <div class="demo-action-grid">
          <PrimeButton severity="secondary" label="重置前端演示界面状态" @click="confirmResetDemoUi">
            <template #icon><RefreshCw :size="17" /></template>
          </PrimeButton>
          <PrimeButton severity="secondary" label="复制本地清理说明" @click="copyCleanupGuide">
            <template #icon><Clipboard :size="17" /></template>
          </PrimeButton>
          <PrimeButton severity="secondary" label="打开演示资料说明" @click="emit('open-assets-guide')">
            <template #icon><FolderOpen :size="17" /></template>
          </PrimeButton>
          <PrimeButton severity="secondary" label="打开文件健康检查" @click="emit('open-network')">
            <template #icon><ShieldAlert :size="17" /></template>
          </PrimeButton>
          <PrimeButton severity="secondary" label="打开现场走查" @click="emit('open-field-qa')">
            <template #icon><ListChecks :size="17" /></template>
          </PrimeButton>
        </div>
      </section>

      <PrimeMessage severity="warn" :closable="false">
        当前界面不会自动删除上传文件、审计记录，不会清空数据库，系统未接 Sealos。
      </PrimeMessage>

      <section class="section-bay">
        <p class="section-kicker">MANUAL CLEANUP GUIDE</p>
        <p class="whitespace-pre-line text-sm font-bold text-[#68411f]">{{ cleanupGuide }}</p>
        <PrimeTextarea
          v-if="copyFallbackVisible"
          :model-value="cleanupGuide"
          class="mt-3 min-h-36 w-full text-sm font-bold"
          readonly
        />
      </section>
    </div>

    <template #footer>
      <PrimeButton label="关闭" @click="dialogVisible = false" />
    </template>
  </PrimeDialog>
</template>
