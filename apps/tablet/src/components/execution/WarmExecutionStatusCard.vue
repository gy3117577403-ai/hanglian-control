<script setup lang="ts">
import { computed } from 'vue'
import { Activity, AlertTriangle, CheckCircle2, Clock3, PauseCircle, PlayCircle } from 'lucide-vue-next'
import { executionSeverity, executionStatusLabels, useExecutionStore } from '@/stores/execution-store'

const execution = useExecutionStore()
const detail = computed(() => execution.selectedExecutionDetail)

const statusIcon = computed(() => {
  const status = execution.selectedExecutionStatus
  if (status === 'running') return PlayCircle
  if (status === 'paused') return PauseCircle
  if (status === 'exception_hold') return AlertTriangle
  if (status === 'completed') return CheckCircle2
  if (status === 'ready_to_start') return Clock3
  return Activity
})

const progress = computed(() => detail.value?.completionRate ?? 0)
</script>

<template>
  <section class="section-bay warm-enter">
    <div class="section-title">
      <div>
        <p class="section-kicker">EXECUTION STATUS / V2.5</p>
        <h3 class="text-xl font-black">现场执行闭环</h3>
      </div>
      <PrimeTag
        :value="executionStatusLabels[execution.selectedExecutionStatus]"
        :severity="executionSeverity(execution.selectedExecutionStatus)"
      />
    </div>

    <div class="mt-3 grid grid-cols-[92px_1fr] gap-4">
      <div class="grid h-24 w-24 place-items-center rounded-3xl border border-[#d9772b33] bg-[#fff1d6] shadow-[0_18px_35px_rgba(115,64,24,0.16)]">
        <component :is="statusIcon" :size="42" class="text-[#b45309]" />
      </div>
      <div class="min-w-0">
        <p class="text-sm font-black text-[#7b5129]">当前计划</p>
        <h4 class="truncate text-2xl font-black text-[#342316]">
          {{ detail?.productCode ?? '未选择计划' }} {{ detail?.productName ?? '' }}
        </h4>
        <div class="mt-3 grid grid-cols-3 gap-2">
          <div class="rounded-xl bg-white/70 px-3 py-2">
            <p class="text-xs font-black text-[#7b5129]">计划数量</p>
            <strong class="text-xl text-[#342316]">{{ detail?.plannedQuantity ?? 0 }}</strong>
          </div>
          <div class="rounded-xl bg-white/70 px-3 py-2">
            <p class="text-xs font-black text-[#7b5129]">已完成</p>
            <strong class="text-xl text-[#342316]">{{ detail?.completedQuantity ?? 0 }}</strong>
          </div>
          <div class="rounded-xl bg-white/70 px-3 py-2">
            <p class="text-xs font-black text-[#7b5129]">完成率</p>
            <strong class="text-xl text-[#342316]">{{ progress }}%</strong>
          </div>
        </div>
      </div>
    </div>

    <PrimeProgressBar class="mt-4" :value="Math.min(progress, 100)" />

    <PrimeMessage
      v-if="execution.selectedExecutionStatus === 'exception_hold'"
      class="mt-3"
      severity="error"
      :closable="false"
    >
      当前计划处于异常停线，请完成异常处理说明后恢复生产。
    </PrimeMessage>
  </section>
</template>
