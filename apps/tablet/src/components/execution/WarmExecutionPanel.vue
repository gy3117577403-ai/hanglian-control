<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue'
import WarmCompletePlanDialog from './WarmCompletePlanDialog.vue'
import WarmDailyReportDialog from './WarmDailyReportDialog.vue'
import WarmExecutionActions from './WarmExecutionActions.vue'
import WarmExecutionStatusCard from './WarmExecutionStatusCard.vue'
import WarmExecutionTimeline from './WarmExecutionTimeline.vue'
import WarmProcessConfirmDialog from './WarmProcessConfirmDialog.vue'
import WarmQuantityReportDialog from './WarmQuantityReportDialog.vue'
import WarmShiftHandoverDialog from './WarmShiftHandoverDialog.vue'
import WarmStartCheckDialog from './WarmStartCheckDialog.vue'
import { useExecutionStore } from '@/stores/execution-store'
import { useProductionStore } from '@/stores/production-store'

const execution = useExecutionStore()
const production = useProductionStore()

const dialogs = reactive({
  start: false,
  quantity: false,
  process: false,
  handover: false,
  dailyReport: false,
  complete: false,
})

async function refresh() {
  await Promise.all([
    execution.loadSummary().catch(() => undefined),
    execution.loadExecutionPlans().catch(() => undefined),
    execution.loadPlanExecutionDetail(production.selectedPlan.id).catch(() => undefined),
  ])
}

onMounted(() => {
  void refresh()
})

watch(() => production.selectedPlan.id, () => {
  void refresh()
})
</script>

<template>
  <section class="grid gap-3">
    <div class="grid grid-cols-[0.46fr_0.54fr] gap-3">
      <WarmExecutionStatusCard />
      <WarmExecutionActions
        @open-start="dialogs.start = true"
        @open-quantity="dialogs.quantity = true"
        @open-process="dialogs.process = true"
        @open-handover="dialogs.handover = true"
        @open-daily-report="dialogs.dailyReport = true"
        @open-complete="dialogs.complete = true"
      />
    </div>

    <div class="grid grid-cols-[0.58fr_0.42fr] gap-3">
      <section class="section-bay warm-enter">
        <div class="section-title">
          <div>
            <p class="section-kicker">EXECUTION BOARD</p>
            <h3 class="text-xl font-black">今日执行看板</h3>
          </div>
          <PrimeTag :value="`${execution.summary?.completionRate ?? 0}%`" severity="success" />
        </div>
        <div class="mt-3 grid grid-cols-5 gap-2">
          <div class="rounded-2xl bg-white/70 p-3">
            <p class="text-xs font-black text-[#7b5129]">今日计划</p>
            <strong>{{ execution.summary?.todayPlans ?? 0 }}</strong>
          </div>
          <div class="rounded-2xl bg-white/70 p-3">
            <p class="text-xs font-black text-[#7b5129]">生产中</p>
            <strong>{{ execution.summary?.running ?? 0 }}</strong>
          </div>
          <div class="rounded-2xl bg-white/70 p-3">
            <p class="text-xs font-black text-[#7b5129]">暂停</p>
            <strong>{{ execution.summary?.paused ?? 0 }}</strong>
          </div>
          <div class="rounded-2xl bg-white/70 p-3">
            <p class="text-xs font-black text-[#7b5129]">异常</p>
            <strong>{{ execution.summary?.exceptionHold ?? 0 }}</strong>
          </div>
          <div class="rounded-2xl bg-white/70 p-3">
            <p class="text-xs font-black text-[#7b5129]">完工</p>
            <strong>{{ execution.summary?.completed ?? 0 }}</strong>
          </div>
        </div>

        <div class="mt-3 grid gap-2">
          <article
            v-for="plan in execution.executionPlans.slice(0, 4)"
            :key="plan.id"
            class="grid grid-cols-[1fr_86px_80px] items-center gap-3 rounded-2xl border border-[#8b5a2a24] bg-white/60 px-3 py-2"
          >
            <div class="min-w-0">
              <p class="truncate font-black text-[#342316]">{{ plan.productCode }} {{ plan.productName }}</p>
              <p class="truncate text-sm font-bold text-[#76512a]">{{ plan.customer }} / {{ plan.owner }}</p>
            </div>
            <PrimeTag :value="plan.executionStatusLabel" />
            <strong class="text-right text-[#342316]">{{ plan.completionRate }}%</strong>
          </article>
        </div>
      </section>

      <WarmExecutionTimeline />
    </div>

    <WarmStartCheckDialog v-model:visible="dialogs.start" />
    <WarmQuantityReportDialog v-model:visible="dialogs.quantity" />
    <WarmProcessConfirmDialog v-model:visible="dialogs.process" />
    <WarmShiftHandoverDialog v-model:visible="dialogs.handover" />
    <WarmDailyReportDialog v-model:visible="dialogs.dailyReport" />
    <WarmCompletePlanDialog v-model:visible="dialogs.complete" />
  </section>
</template>
