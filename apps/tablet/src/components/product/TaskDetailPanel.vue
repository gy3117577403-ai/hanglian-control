<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, BadgeCheck, ClipboardCheck, Gauge, Layers3 } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { ProductionPlan } from '@/types/production'

const props = defineProps<{
  plan: ProductionPlan
}>()

const completionRate = computed(() => Math.round((props.plan.completedQuantity / props.plan.plannedQuantity) * 100))
const needsReview = computed(() => props.plan.materialCompleteness < 90)
const hasVersionRisk = computed(() => {
  return props.plan.front.parameterStatus !== '有效'
    || props.plan.back.materialStatus !== '有效'
    || props.plan.documents.some((doc) => doc.status !== '有效')
})
</script>

<template>
  <section class="grid grid-cols-[1.25fr_0.75fr] gap-4">
    <div class="rounded-lg border border-slate-700/80 bg-slate-900/80 p-5">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="flex items-center gap-2 text-sm font-semibold text-cyan-200">
            <Layers3 class="size-4" />
            当前计划任务详情
          </p>
          <h2 class="m-0 mt-2 truncate text-[28px] font-semibold tracking-normal text-slate-50">
            {{ plan.productName }}
          </h2>
          <p class="mt-2 text-base text-slate-300">{{ plan.customer }} / {{ plan.productCode }} / {{ plan.productVersion }}</p>
        </div>
        <Badge class="border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-cyan-100">{{ plan.weekPlanNo }}</Badge>
      </div>

      <div class="mt-5 grid grid-cols-5 gap-3">
        <div class="rounded-lg bg-slate-950/70 p-3">
          <p class="text-xs text-slate-500">销售</p>
          <p class="mt-1 text-lg font-semibold text-slate-100">{{ plan.sales }}</p>
        </div>
        <div class="rounded-lg bg-slate-950/70 p-3">
          <p class="text-xs text-slate-500">负责人</p>
          <p class="mt-1 truncate text-lg font-semibold text-slate-100">{{ plan.owner }}</p>
        </div>
        <div class="rounded-lg bg-slate-950/70 p-3">
          <p class="text-xs text-slate-500">计划数量</p>
          <p class="mt-1 text-lg font-semibold text-cyan-100">{{ plan.plannedQuantity }}</p>
        </div>
        <div class="rounded-lg bg-slate-950/70 p-3">
          <p class="text-xs text-slate-500">完成数量</p>
          <p class="mt-1 text-lg font-semibold text-emerald-100">{{ plan.completedQuantity }}</p>
        </div>
        <div class="rounded-lg bg-slate-950/70 p-3">
          <p class="text-xs text-slate-500">状态</p>
          <p class="mt-1 text-lg font-semibold text-amber-100">{{ plan.status }}</p>
        </div>
      </div>

      <div class="mt-5">
        <div class="mb-2 flex items-center justify-between text-sm">
          <span class="flex items-center gap-2 text-slate-300">
            <Gauge class="size-4 text-cyan-300" />
            生产进度
          </span>
          <span class="text-cyan-100">{{ completionRate }}%</span>
        </div>
        <Progress class="h-2 bg-slate-800 [&>div]:bg-cyan-300" :model-value="completionRate" />
      </div>
    </div>

    <div class="rounded-lg border border-slate-700/80 bg-slate-900/80 p-5">
      <div class="flex items-center justify-between">
        <p class="flex items-center gap-2 text-sm font-semibold text-cyan-200">
          <ClipboardCheck class="size-4" />
          产品资料完整度
        </p>
        <Badge :class="needsReview ? 'border border-red-400/40 bg-red-400/10 text-red-100' : 'border border-emerald-300/30 bg-emerald-300/10 text-emerald-100'">
          {{ plan.materialCompleteness }}%
        </Badge>
      </div>
      <div class="mt-5 flex items-end justify-between">
        <div>
          <p class="text-5xl font-semibold text-slate-50">{{ plan.materialCompleteness }}</p>
          <p class="mt-1 text-sm text-slate-400">资料包完整度评分</p>
        </div>
        <Badge :class="plan.confirmationStatus === '已确认' ? 'border border-emerald-300/30 bg-emerald-300/10 text-emerald-100' : 'border border-amber-300/30 bg-amber-300/10 text-amber-100'">
          <BadgeCheck class="mr-1 size-3.5" />
          {{ plan.confirmationStatus }}
        </Badge>
      </div>
      <Progress
        class="mt-5 h-3 bg-slate-800"
        :class="needsReview ? '[&>div]:bg-red-400' : '[&>div]:bg-emerald-300'"
        :model-value="plan.materialCompleteness"
      />
      <div v-if="needsReview" class="mt-4 rounded-lg border border-red-400/35 bg-red-500/10 p-3 text-sm font-semibold text-red-100">
        <AlertTriangle class="mr-2 inline size-4" />
        资料需复核：完整度低于 90%，请确认图纸、SOP、孔位图是否同步。
      </div>
      <div v-if="hasVersionRisk" class="mt-3 rounded-lg border border-amber-300/35 bg-amber-300/10 p-3 text-sm font-semibold text-amber-100">
        <AlertTriangle class="mr-2 inline size-4" />
        版本红线提醒：存在失效或待确认资料，禁止跳过组长复核。
      </div>
    </div>
  </section>
</template>
