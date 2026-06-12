<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, CheckCircle2, Database, FileUp, GitCompareArrows, History, ShieldAlert } from 'lucide-vue-next'
import { completionSummary, confirmSeverity, planStatusSeverity, progressClass, readinessLabel } from '@/lib/status-style'
import { useProductionStore } from '@/stores/production-store'

const emit = defineEmits<{
  'open-feedback': []
  'open-upload': []
  'open-versions': []
  'open-audit': []
  'open-migration': []
}>()

const store = useProductionStore()
const plan = computed(() => store.selectedPlan)
const progress = computed(() => completionSummary(plan.value))
const hasRedline = computed(() => Boolean(plan.value.versionStatus?.redLine || plan.value.materialCompleteness < 90))

function onControlClick(event: MouseEvent) {
  const action = (event.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action
  if (!action) return
  if (action === 'confirm') void store.confirmSelectedPlan()
  if (action === 'feedback') emit('open-feedback')
  if (action === 'upload') emit('open-upload')
  if (action === 'versions') emit('open-versions')
  if (action === 'audit') emit('open-audit')
  if (action === 'migration') emit('open-migration')
}
</script>

<template>
  <section class="raised-panel warm-enter p-4">
    <div class="grid grid-cols-[1fr_340px] gap-4">
      <div class="min-w-0">
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <PrimeTag :value="plan.status" :severity="planStatusSeverity(plan.status)" />
          <PrimeTag :value="plan.confirmationStatus" :severity="confirmSeverity(plan.confirmationStatus)" />
          <PrimeTag :value="readinessLabel(plan)" :severity="hasRedline ? 'danger' : 'success'" />
          <PrimeTag :value="store.offlineDemoMode ? '离线演示' : '后端 Mock API'" :severity="store.offlineDemoMode ? 'warn' : 'info'" />
        </div>

        <div class="flex items-end gap-3">
          <div class="min-w-0">
            <p class="section-kicker">CURRENT PRODUCTION ORDER</p>
            <h2 class="truncate text-[34px] font-black leading-tight text-[#332111]">
              {{ plan.productCode }} · {{ plan.productName }}
            </h2>
            <p class="mt-1 truncate text-base font-bold text-[#6f4722]">
              {{ plan.customer }} / {{ plan.productVersion }} / {{ plan.weekPlanNo }} / {{ plan.owner }}
            </p>
          </div>
        </div>

        <div v-if="hasRedline" class="redline-alert mt-3 rounded-lg px-4 py-3">
          <div class="flex items-center gap-2 text-base font-black text-[#9d341e]">
            <ShieldAlert :size="22" />
            <span>{{ plan.versionStatus?.message || '资料完整度低于 90%，当前资料需复核。' }}</span>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-4 gap-3">
          <div class="metric-tile-3d min-h-0">
            <p class="metric-label">计划数量</p>
            <p class="metric-value">{{ plan.plannedQuantity }}</p>
          </div>
          <div class="metric-tile-3d min-h-0">
            <p class="metric-label">完成数量</p>
            <p class="metric-value">{{ plan.completedQuantity }}</p>
          </div>
          <div class="metric-tile-3d min-h-0">
            <p class="metric-label">完成进度</p>
            <p class="metric-value">{{ progress.percent }}%</p>
          </div>
          <div class="metric-tile-3d min-h-0">
            <p class="metric-label">剩余数量</p>
            <p class="metric-value">{{ progress.remaining }}</p>
          </div>
        </div>
      </div>

      <div class="section-bay">
        <div class="section-title">
          <div>
            <p class="section-kicker">MATERIAL CONTROL</p>
            <h3 class="text-xl font-black">资料完整度</h3>
          </div>
          <span class="text-3xl font-black text-[#9d5220]">{{ plan.materialCompleteness }}%</span>
        </div>
        <PrimeProgressBar :value="plan.materialCompleteness" :class="progressClass(plan.materialCompleteness)" />

        <div class="warm-control-grid mt-4 grid grid-cols-2 gap-3" @click.capture="onControlClick">
          <PrimeButton data-action="confirm" class="touch-button-3d" icon="pi pi-check-circle" label="组长确认" />
          <PrimeButton data-action="feedback" severity="danger" icon="pi pi-exclamation-triangle" label="异常反馈" />
          <PrimeButton data-action="upload" severity="secondary">
            <template #icon><FileUp :size="18" /></template>
            <span>上传资料</span>
          </PrimeButton>
          <PrimeButton data-action="versions" severity="secondary">
            <template #icon><GitCompareArrows :size="18" /></template>
            <span>版本管理</span>
          </PrimeButton>
          <PrimeButton data-action="audit" severity="secondary">
            <template #icon><History :size="18" /></template>
            <span>查询留痕</span>
          </PrimeButton>
          <PrimeButton data-action="migration" severity="secondary">
            <template #icon><Database :size="18" /></template>
            <span>迁移预览</span>
          </PrimeButton>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-2 text-sm font-bold text-[#68411f]">
          <div class="warm-chip">
            <CheckCircle2 :size="16" />
            <span>前段 {{ plan.front.parameterStatus }}</span>
          </div>
          <div class="warm-chip">
            <AlertTriangle :size="16" />
            <span>后段 {{ plan.back.materialStatus }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
