<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, CheckCircle2, ClipboardCheck, MessageSquareWarning } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import DocumentTabs from '@/components/document/DocumentTabs.vue'
import FeedbackDialog from '@/components/feedback/FeedbackDialog.vue'
import ProcessCards from '@/components/product/ProcessCards.vue'
import ReadinessCard from '@/components/product/ReadinessCard.vue'
import TaskDetailPanel from '@/components/product/TaskDetailPanel.vue'
import { useProductionStore } from '@/stores/production-store'

const store = useProductionStore()

const hasDangerAlert = computed(() => store.readiness.versionAlerts.some((alert) => alert.level === 'danger'))
const hasWarningAlert = computed(() => store.readiness.versionAlerts.some((alert) => alert.level === 'warning'))
const versionMessage = computed(() => {
  if (hasDangerAlert.value) return '版本红线：存在已失效、缺失或不一致资料，资料复核前不建议开工。'
  if (hasWarningAlert.value) return '版本提醒：存在待确认资料，请组长复核后再确认。'
  return '当前有效版本已通过资料检查，可进入组长确认。'
})
</script>

<template>
  <main class="flex min-h-0 flex-col gap-4 overflow-y-auto rounded-lg border border-slate-700/70 bg-slate-950/55 p-4 pr-2">
    <TaskDetailPanel :plan="store.selectedPlan" />
    <ReadinessCard :readiness="store.readiness" :loading="store.readinessLoading" />
    <ProcessCards
      :plan="store.selectedPlan"
      :active-segment="store.activeSegment"
      @set-segment="store.setSegment"
    />
    <DocumentTabs
      :plan="store.selectedPlan"
      :active-tab="store.activeDocumentTab"
      @set-tab="store.setDocumentTab"
    />

    <section class="grid grid-cols-[1fr_auto] gap-4">
      <div class="rounded-lg border border-slate-700/80 bg-slate-900/80 p-5">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="flex items-center gap-2 text-sm font-semibold text-cyan-200">
              <ClipboardCheck class="size-4" />
              版本状态提示
            </p>
            <p class="mt-2 text-lg font-semibold text-slate-50">
              {{ store.selectedPlan.productCode }} / {{ store.selectedPlan.productVersion }}
            </p>
          </div>
          <Badge
            class="px-3 py-1"
            :class="store.selectedPlan.confirmationStatus === '已确认' ? 'border border-emerald-300/30 bg-emerald-300/10 text-emerald-100' : 'border border-amber-300/30 bg-amber-300/10 text-amber-100'"
          >
            {{ store.selectedPlan.confirmationStatus }}
          </Badge>
        </div>

        <div class="mt-4 grid grid-cols-3 gap-3">
          <div class="rounded-lg border border-slate-700 bg-slate-950/70 p-3">
            <p class="text-xs text-slate-500">前段图纸版本</p>
            <p class="mt-1 text-base font-semibold text-slate-100">{{ store.selectedPlan.front.drawingVersion }}</p>
          </div>
          <div class="rounded-lg border border-slate-700 bg-slate-950/70 p-3">
            <p class="text-xs text-slate-500">后段图纸版本</p>
            <p class="mt-1 text-base font-semibold text-slate-100">{{ store.selectedPlan.back.drawingVersion }}</p>
          </div>
          <div class="rounded-lg border border-slate-700 bg-slate-950/70 p-3">
            <p class="text-xs text-slate-500">SOP 版本</p>
            <p class="mt-1 text-base font-semibold text-slate-100">{{ store.selectedPlan.back.sopVersion }}</p>
          </div>
        </div>

        <div
          v-if="hasDangerAlert"
          class="mt-4 rounded-lg border border-red-400/35 bg-red-500/10 p-3 text-sm font-semibold text-red-100"
        >
          <AlertTriangle class="mr-2 inline size-4" />
          {{ versionMessage }}
        </div>
        <div
          v-else-if="hasWarningAlert"
          class="mt-4 rounded-lg border border-amber-300/35 bg-amber-300/10 p-3 text-sm font-semibold text-amber-100"
        >
          <AlertTriangle class="mr-2 inline size-4" />
          {{ versionMessage }}
        </div>
        <div v-else class="mt-4 rounded-lg border border-emerald-300/25 bg-emerald-300/10 p-3 text-sm font-semibold text-emerald-100">
          <CheckCircle2 class="mr-2 inline size-4" />
          {{ versionMessage }}
        </div>
      </div>

      <div class="flex w-64 flex-col gap-3 rounded-lg border border-slate-700/80 bg-slate-900/80 p-5">
        <Button type="button" class="h-14 bg-emerald-300 px-8 text-lg text-slate-950 hover:bg-emerald-200" @click="store.confirmSelectedPlan">
          <CheckCircle2 class="size-5" />
          组长确认
        </Button>
        <FeedbackDialog />
        <div class="rounded-lg border border-slate-700 bg-slate-950/70 p-3">
          <p class="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <MessageSquareWarning class="size-4 text-amber-300" />
            异常记录
          </p>
          <p class="mt-2 text-3xl font-semibold text-amber-100">{{ store.selectedFeedbackRecords.length }}</p>
          <p class="mt-1 text-xs text-slate-500">Mock API / 离线演示留痕</p>
        </div>
      </div>
    </section>
  </main>
</template>
