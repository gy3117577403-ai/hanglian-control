<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Clipboard, ClipboardCheck, RotateCcw, ShieldCheck } from 'lucide-vue-next'
import { useToast } from 'primevue/usetoast'
import { useUiStore } from '@/stores/ui-store'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const toast = useToast()
const uiStore = useUiStore()

interface QaItem {
  id: string
  title: string
  detail: string
}

const storageKey = 'hanglian.fieldQaChecklist'
const items: QaItem[] = [
  { id: 'today-plan', title: '选择今日计划', detail: '确认左侧计划切换到今日，并能看到至少一条任务。' },
  { id: 'lock-product', title: '锁定产品', detail: '点击任一计划后，右侧产品资料包同步刷新。' },
  { id: 'readiness', title: '查看资料完整度', detail: '检查资料完整度、红线提醒和开工状态。' },
  { id: 'front-process', title: '切换前段', detail: '前段参数五项清晰可读。' },
  { id: 'back-process', title: '切换后段', detail: '后段资料五项清晰可读。' },
  { id: 'drawing-preview', title: '打开图纸预览', detail: 'PDF 图纸占位或上传图纸可在预览台显示。' },
  { id: 'sop-pinout-finish', title: '打开 SOP / 孔位图 / 成品图', detail: '各标签页可切换，资料卡不遮挡按钮。' },
  { id: 'upload-pdf', title: '上传演示 PDF', detail: '从 demo-upload-assets 选择 demo-drawing-rev-a.pdf 或 Rev.B。' },
  { id: 'upload-image', title: '上传演示图片', detail: '从 demo-upload-assets 选择 SOP、孔位图或成品细节 PNG。' },
  { id: 'file-health', title: '检查文件健康', detail: '预览诊断能区分手工上传、Mock 占位和可预览状态。' },
  { id: 'version-history', title: '查看版本历史', detail: '打开版本档案，能看到当前有效、待确认、历史版本。' },
  { id: 'set-effective', title: '设为当前有效', detail: '对手工上传资料执行版本确认，不伪造通过。' },
  { id: 'audit-logs', title: '查看审计留痕', detail: '确认版本、上传、反馈等动作有模拟留痕。' },
  { id: 'leader-confirm', title: '组长确认', detail: '执行组长确认并看到确认状态变化。' },
  { id: 'feedback', title: '异常反馈', detail: '提交一条异常反馈，确认页面提示清晰。' },
  { id: 'field-mode', title: '开启现场模式', detail: '按钮变大，1280x800 横屏不拥挤。' },
  { id: 'network-diagnostics', title: '网络诊断通过', detail: '打开网络诊断，确认 API、文件健康和 Swagger 地址。' },
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
const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})
const completedCount = computed(() => checkedIds.value.length)
const progress = computed(() => Math.round((completedCount.value / items.length) * 100))
const exportText = computed(() => uiStore.exportFieldQaResult(items, checkedIds.value))
const copyFallbackVisible = ref(false)

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
    toast.add({ severity: 'success', summary: '走查结果已复制', detail: `${completedCount.value}/${items.length} 项完成。`, life: 2600 })
    return
  }
  copyFallbackVisible.value = true
  toast.add({ severity: 'warn', summary: '无法自动复制', detail: '请在文本框中手动复制走查结果。', life: 3000 })
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
  <PrimeDialog v-model:visible="dialogVisible" modal header="现场走查" class="field-qa-dialog">
    <div class="grid max-h-[72vh] gap-4 overflow-auto pr-1">
      <section class="field-qa-summary">
        <div>
          <p class="section-kicker">FIELD QA CHECKLIST</p>
          <h3 class="text-2xl font-black text-[#342316]">安卓平板演示走查</h3>
          <p class="mt-1 text-sm font-bold text-[#76512a]">手动勾选，不改变业务数据，也不伪造通过状态。</p>
        </div>
        <div class="field-qa-meter">
          <strong>{{ completedCount }}/{{ items.length }}</strong>
          <span>{{ progress }}%</span>
        </div>
      </section>

      <PrimeProgressBar :value="progress" :show-value="false" :class="progress >= 90 ? 'warm-progress-good' : progress >= 60 ? 'warm-progress-ok' : 'warm-progress-warn'" />

      <section class="demo-file-list">
        <div class="flex items-center gap-2">
          <ShieldCheck :size="22" />
          <strong>推荐演示文件</strong>
        </div>
        <div class="demo-file-grid">
          <span>demo-drawing-rev-a.pdf</span>
          <span>demo-drawing-rev-b.pdf</span>
          <span>demo-sop-step-01.png</span>
          <span>demo-pinout-16p.png</span>
          <span>demo-finished-detail.png</span>
        </div>
        <p>上传测试请从项目根目录 `demo-upload-assets` 选择，不要上传真实客户资料。</p>
      </section>

      <div class="field-qa-list">
        <label
          v-for="(item, index) in items"
          :key="item.id"
          :class="['field-qa-item', { checked: checkedIds.includes(item.id) }]"
        >
          <input
            type="checkbox"
            :checked="checkedIds.includes(item.id)"
            @change="toggleItem(item.id)"
          >
          <span class="field-qa-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="min-w-0">
            <strong>{{ item.title }}</strong>
            <small>{{ item.detail }}</small>
          </span>
        </label>
      </div>

      <section v-if="copyFallbackVisible" class="section-bay">
        <p class="section-kicker">COPY FALLBACK</p>
        <PrimeTextarea :model-value="exportText" class="mt-2 min-h-36 w-full text-sm font-bold" readonly />
      </section>
    </div>

    <template #footer>
      <PrimeButton severity="secondary" label="复制走查结果" @click="copyChecklistResult">
        <template #icon><Clipboard :size="17" /></template>
      </PrimeButton>
      <PrimeButton severity="secondary" label="重置走查" @click="resetChecklist">
        <template #icon><RotateCcw :size="17" /></template>
      </PrimeButton>
      <PrimeButton severity="secondary" label="全部标记为未完成" @click="resetChecklist">
        <template #icon><RotateCcw :size="17" /></template>
      </PrimeButton>
      <PrimeButton label="继续现场验证" @click="dialogVisible = false">
        <template #icon><ClipboardCheck :size="17" /></template>
      </PrimeButton>
    </template>
  </PrimeDialog>
</template>
