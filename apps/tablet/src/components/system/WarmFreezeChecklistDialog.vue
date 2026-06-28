<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Clipboard, ClipboardCheck, RotateCcw } from 'lucide-vue-next'
import { useToast } from 'primevue/usetoast'
import { APP_STAGE, APP_VERSION } from '@/config/app-version'
import { useUiStore } from '@/stores/ui-store'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

interface FreezeItem {
  id: string
  title: string
}

interface FreezeGroup {
  id: string
  title: string
  items: FreezeItem[]
}

const storageKey = 'hanglian.freezeChecklist'
const toast = useToast()
const uiStore = useUiStore()
const copyFallbackVisible = ref(false)

const groups: FreezeGroup[] = [
  {
    id: 'login-role-v27',
    title: 'A. 登录角色',
    items: [
      { id: 'front-login', title: '前段组长登录' },
      { id: 'back-login', title: '后段组长登录' },
      { id: 'maintainer-login', title: '资料维护登录' },
      { id: 'process-login', title: '工艺登录' },
      { id: 'quality-login', title: '品质登录' },
      { id: 'admin-login', title: '管理员登录' },
    ],
  },
  {
    id: 'document-query-v27',
    title: 'B. 资料查询',
    items: [
      { id: 'front-parameter-query', title: '前段参数查询' },
      { id: 'back-package-query', title: '后段资料查询' },
      { id: 'pdf-preview-v27', title: 'PDF 预览' },
      { id: 'image-preview-v27', title: '图片预览' },
      { id: 'version-history-v27', title: '版本历史' },
      { id: 'file-health-v27', title: '文件健康' },
    ],
  },
  {
    id: 'data-import-v27',
    title: 'C. 数据导入',
    items: [
      { id: 'import-production-plan', title: '导入生产计划' },
      { id: 'import-front-parameter', title: '导入前段参数' },
      { id: 'import-back-package', title: '导入后段资料包' },
      { id: 'import-knowledge', title: '导入知识库' },
      { id: 'import-history', title: '导入历史' },
    ],
  },
  {
    id: 'maintenance-v27',
    title: 'D. 资料维护',
    items: [
      { id: 'update-plan', title: '修改计划' },
      { id: 'update-parameter', title: '修改参数' },
      { id: 'update-document-status', title: '修改资料状态' },
      { id: 'review-queue', title: '处理复核队列' },
      { id: 'maintenance-history', title: '查看维护历史' },
    ],
  },
  {
    id: 'field-knowledge-v27',
    title: 'E. 现场知识',
    items: [
      { id: 'fixture-library', title: '治具' },
      { id: 'abnormal-library', title: '异常' },
      { id: 'quality-standard', title: '质量标准' },
      { id: 'knowledge-validation', title: '知识验证' },
      { id: 'knowledge-bulk-maintenance', title: '批量维护' },
    ],
  },
  {
    id: 'execution-v27',
    title: 'F. 执行闭环',
    items: [
      { id: 'execution-start', title: '开工' },
      { id: 'execution-process-confirm', title: '过程确认' },
      { id: 'execution-quantity-report', title: '报工' },
      { id: 'execution-pause-resume', title: '暂停 / 恢复' },
      { id: 'execution-exception-hold', title: '异常停线' },
      { id: 'execution-complete', title: '完工' },
      { id: 'execution-handover', title: '班组交接' },
      { id: 'execution-daily-report', title: '日报' },
    ],
  },
  {
    id: 'analytics-v27',
    title: 'G. 统计看板',
    items: [
      { id: 'analytics-overview', title: '总览' },
      { id: 'analytics-production', title: '生产执行' },
      { id: 'analytics-quality', title: '质量数量' },
      { id: 'analytics-documents', title: '资料问题' },
      { id: 'analytics-knowledge', title: '知识库统计' },
      { id: 'analytics-summary-copy', title: '复制摘要' },
    ],
  },
  {
    id: 'safety-v27',
    title: 'H. 安全边界',
    items: [
      { id: 'mock-source', title: '显示 Mock 数据源' },
      { id: 'no-sealos', title: '未接数据库' },
      { id: 'no-wecom', title: '未接微盘' },
      { id: 'no-real-voice', title: '未接真实语音' },
      { id: 'no-sensitive-files', title: '未提交敏感文件' },
    ],
  },
]

function readCheckedIds() {
  if (typeof localStorage === 'undefined') return []
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

const checkedIds = ref<string[]>(readCheckedIds())
const allItems = computed(() => groups.flatMap((group) => group.items))
const completedCount = computed(() => checkedIds.value.length)
const progress = computed(() => Math.round((completedCount.value / Math.max(allItems.value.length, 1)) * 100))
const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})
const exportText = computed(() => {
  const completed = new Set(checkedIds.value)
  const time = new Date().toLocaleString('zh-CN', { hour12: false })
  return [
    `线束车间生产计划资料管控系统 ${APP_VERSION} ${APP_STAGE} 冻结前验收结果`,
    `时间：${time}`,
    `已完成：${completedCount.value} / ${allItems.value.length}`,
    `完成率：${progress.value}%`,
    '',
    ...groups.flatMap((group) => [
      group.title,
      ...group.items.map((item) => `- ${completed.has(item.id) ? '已完成' : '未完成'}：${item.title}`),
      '',
    ]),
    '安全边界：未接 Sealos、未接企业微信微盘、未接真实语音；本清单不写库、不伪造通过。',
  ].join('\n')
})

function toggleItem(id: string) {
  checkedIds.value = checkedIds.value.includes(id)
    ? checkedIds.value.filter((item) => item !== id)
    : [...checkedIds.value, id]
}

function resetChecklist() {
  checkedIds.value = []
  copyFallbackVisible.value = false
}

async function copyChecklistResult() {
  const ok = await uiStore.copyFieldQaResult(exportText.value)
  if (ok) {
    copyFallbackVisible.value = false
    toast.add({ severity: 'success', summary: '冻结验收结果已复制', detail: `${completedCount.value}/${allItems.value.length} 项完成。`, life: 2600 })
    return
  }
  copyFallbackVisible.value = true
  toast.add({ severity: 'warn', summary: '无法自动复制', detail: '请在文本框中手动复制验收结果。', life: 3000 })
}

watch(
  checkedIds,
  (value) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, JSON.stringify(value))
  },
  { deep: true },
)
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="冻结前验收" class="freeze-checklist-dialog">
    <div class="grid max-h-[72vh] gap-4 overflow-auto pr-1">
      <section class="field-qa-summary">
        <div>
          <p class="section-kicker">FREEZE CANDIDATE QA</p>
          <h3 class="text-2xl font-black text-[#342316]">{{ APP_VERSION }} {{ APP_STAGE }} 冻结前验收</h3>
          <p class="mt-1 text-sm font-bold text-[#76512a]">手动勾选，只保存到本机 localStorage，不连接数据库，不伪造通过。</p>
        </div>
        <div class="field-qa-meter">
          <strong>{{ completedCount }}/{{ allItems.length }}</strong>
          <span>{{ progress }}%</span>
        </div>
      </section>

      <PrimeProgressBar
        :value="progress"
        :show-value="false"
        :class="progress >= 90 ? 'warm-progress-good' : progress >= 60 ? 'warm-progress-ok' : 'warm-progress-warn'"
      />

      <div class="freeze-group-grid">
        <section v-for="group in groups" :key="group.id" class="freeze-group-card">
          <h4>{{ group.title }}</h4>
          <label
            v-for="item in group.items"
            :key="item.id"
            :class="['freeze-check-item', { checked: checkedIds.includes(item.id) }]"
          >
            <input
              type="checkbox"
              :checked="checkedIds.includes(item.id)"
              @change="toggleItem(item.id)"
            >
            <span>{{ item.title }}</span>
          </label>
        </section>
      </div>

      <PrimeMessage severity="warn" :closable="false">
        本清单用于演示冻结前人工确认，不会提交真实客户资料，不会连接 Sealos，不会执行任何数据库写入。
      </PrimeMessage>

      <section v-if="copyFallbackVisible" class="section-bay">
        <p class="section-kicker">COPY FALLBACK</p>
        <PrimeTextarea :model-value="exportText" class="mt-2 min-h-40 w-full text-sm font-bold" readonly />
      </section>
    </div>

    <template #footer>
      <PrimeButton severity="secondary" label="复制验收结果" @click="copyChecklistResult">
        <template #icon><Clipboard :size="17" /></template>
      </PrimeButton>
      <PrimeButton severity="secondary" label="重置清单" @click="resetChecklist">
        <template #icon><RotateCcw :size="17" /></template>
      </PrimeButton>
      <PrimeButton label="完成本轮复核" @click="dialogVisible = false">
        <template #icon><ClipboardCheck :size="17" /></template>
      </PrimeButton>
    </template>
  </PrimeDialog>
</template>
