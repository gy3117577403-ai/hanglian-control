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
    id: 'visual-touch',
    title: 'A. 视觉与触控',
    items: [
      { id: 'warm-3d', title: '暖色立体风一致' },
      { id: 'clear-boundary', title: '主控区边界清楚' },
      { id: 'tablet-1280', title: '1280 x 800 可用' },
      { id: 'touch-buttons', title: '按钮适合触控' },
      { id: 'dialog-fit', title: '弹窗不超屏' },
    ],
  },
  {
    id: 'plan',
    title: 'B. 生产计划',
    items: [
      { id: 'scope-switch', title: '今日/本周切换正常' },
      { id: 'plan-click', title: '计划卡片可点击' },
      { id: 'locked-product', title: '当前产品锁定明显' },
      { id: 'startup-check', title: '开工资料检查清楚' },
    ],
  },
  {
    id: 'documents',
    title: 'C. 资料与预览',
    items: [
      { id: 'pdf-upload', title: 'PDF 上传正常' },
      { id: 'image-upload', title: '图片上传正常' },
      { id: 'reject-file', title: '不支持文件被拒绝' },
      { id: 'pdf-preview', title: 'PDF 可预览或有兜底' },
      { id: 'image-preview', title: '图片可预览或有兜底' },
      { id: 'file-health', title: '文件健康状态清楚' },
    ],
  },
  {
    id: 'version-audit',
    title: 'D. 版本与追溯',
    items: [
      { id: 'version-history', title: '版本历史清楚' },
      { id: 'set-effective', title: '当前有效版本可设置' },
      { id: 'redline-history', title: '历史版本有红线' },
      { id: 'audit-log', title: '审计记录可查看' },
    ],
  },
  {
    id: 'demo-tools',
    title: 'E. 演示工具',
    items: [
      { id: 'system-info', title: '系统信息可打开' },
      { id: 'demo-guide', title: '演示说明可打开' },
      { id: 'network', title: '网络诊断可打开' },
      { id: 'field-qa', title: '现场走查可使用' },
      { id: 'demo-data', title: '演示数据管理说明清楚' },
      { id: 'demo-readiness', title: '演示前检查可使用' },
      { id: 'roadmap', title: '后续路线选择清楚' },
    ],
  },
  {
    id: 'safety',
    title: 'F. 安全边界',
    items: [
      { id: 'mock-source', title: '显示 Mock 数据源' },
      { id: 'no-sealos', title: '显示未接 Sealos' },
      { id: 'no-wecom', title: '显示未接微盘' },
      { id: 'no-real-voice', title: '显示未接真实语音' },
      { id: 'no-sensitive-files', title: '未提交敏感文件' },
      { id: 'no-db-connect', title: '未连接数据库' },
      { id: 'no-db-write', title: '未执行写库操作' },
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
