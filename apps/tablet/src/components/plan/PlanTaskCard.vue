<script setup lang="ts">
import { computed } from 'vue'
import { CircleAlert, CircleCheck, Factory, PackageCheck, TimerReset } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { ProductionPlan } from '@/types/production'

const props = defineProps<{
  plan: ProductionPlan
  active: boolean
}>()

const completionRate = computed(() => Math.round((props.plan.completedQuantity / props.plan.plannedQuantity) * 100))

const statusClass = computed(() => {
  switch (props.plan.status) {
    case '生产中':
      return 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'
    case '已完成':
      return 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100'
    case '异常':
      return 'border-red-400/40 bg-red-400/10 text-red-100'
    default:
      return 'border-amber-300/30 bg-amber-300/10 text-amber-100'
  }
})

const materialClass = computed(() => {
  if (props.plan.materialCompleteness < 90) return 'text-red-200'
  if (props.plan.materialCompleteness < 96) return 'text-amber-100'
  return 'text-emerald-100'
})
</script>

<template>
  <button
    type="button"
    class="w-full rounded-lg border p-4 text-left transition"
    :class="active
      ? 'border-cyan-300/60 bg-cyan-300/10 shadow-[0_0_28px_rgba(34,211,238,0.14)]'
      : 'border-slate-700/80 bg-slate-900/70 hover:border-cyan-300/35 hover:bg-slate-900'"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <Factory class="size-4 shrink-0 text-cyan-300" />
          <p class="truncate text-base font-semibold text-slate-50">{{ plan.productCode }}</p>
        </div>
        <p class="mt-1 truncate text-sm text-slate-400">{{ plan.customer }} / {{ plan.productName }}</p>
      </div>
      <Badge :class="statusClass">{{ plan.status }}</Badge>
    </div>

    <div class="mt-4 grid grid-cols-4 gap-2 text-xs">
      <div class="rounded-md bg-slate-950/60 p-2">
        <p class="text-slate-500">计划</p>
        <p class="mt-1 text-base font-semibold text-slate-100">{{ plan.plannedQuantity }}</p>
      </div>
      <div class="rounded-md bg-slate-950/60 p-2">
        <p class="text-slate-500">完成</p>
        <p class="mt-1 text-base font-semibold text-cyan-100">{{ plan.completedQuantity }}</p>
      </div>
      <div class="rounded-md bg-slate-950/60 p-2">
        <p class="text-slate-500">段别</p>
        <p class="mt-1 text-base font-semibold text-amber-100">{{ plan.segment }}</p>
      </div>
      <div class="rounded-md bg-slate-950/60 p-2">
        <p class="text-slate-500">资料</p>
        <p class="mt-1 text-base font-semibold" :class="materialClass">{{ plan.materialCompleteness }}%</p>
      </div>
    </div>

    <div class="mt-4 flex items-center justify-between text-xs text-slate-400">
      <span class="flex items-center gap-1">
        <TimerReset class="size-3.5" />
        进度 {{ completionRate }}%
      </span>
      <span class="flex items-center gap-1" :class="plan.confirmationStatus === '已确认' ? 'text-emerald-200' : 'text-amber-200'">
        <CircleCheck v-if="plan.confirmationStatus === '已确认'" class="size-3.5" />
        <CircleAlert v-else class="size-3.5" />
        {{ plan.confirmationStatus }}
      </span>
      <span class="flex items-center gap-1" :class="materialClass">
        <PackageCheck class="size-3.5" />
        {{ plan.materialCompleteness < 90 ? '需复核' : '资料可用' }}
      </span>
    </div>
    <Progress class="mt-2 h-1.5 bg-slate-800 [&>div]:bg-cyan-300" :model-value="completionRate" />
  </button>
</template>
