<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, Ban, CheckCircle2, ClipboardCheck, ShieldAlert } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { PlanReadiness } from '@/types/production'

const props = defineProps<{
  readiness: PlanReadiness
  loading: boolean
}>()

const statusClass = computed(() => {
  if (props.readiness.readinessStatus === 'ready') return 'border-emerald-300/35 bg-emerald-300/10 text-emerald-100'
  if (props.readiness.readinessStatus === 'need_review') return 'border-amber-300/40 bg-amber-300/10 text-amber-100'
  return 'border-red-400/45 bg-red-500/10 text-red-100'
})

const progressClass = computed(() => {
  if (props.readiness.readinessStatus === 'ready') return '[&>div]:bg-emerald-300'
  if (props.readiness.readinessStatus === 'need_review') return '[&>div]:bg-amber-300'
  return '[&>div]:bg-red-400'
})

function itemClass(status: 'pass' | 'warning' | 'fail') {
  if (status === 'pass') return 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100'
  if (status === 'warning') return 'border-amber-300/30 bg-amber-300/10 text-amber-100'
  return 'border-red-400/35 bg-red-500/10 text-red-100'
}

function itemLabel(status: 'pass' | 'warning' | 'fail') {
  if (status === 'pass') return '已通过'
  if (status === 'warning') return '需确认'
  return '缺失/异常'
}
</script>

<template>
  <section class="rounded-lg border border-slate-700/80 bg-slate-900/80 p-5">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="flex items-center gap-2 text-sm font-semibold text-cyan-200">
          <ClipboardCheck class="size-4" />
          开工资料检查
        </p>
        <h2 class="m-0 mt-2 text-2xl font-semibold tracking-normal text-slate-50">
          {{ readiness.summary }}
        </h2>
      </div>
      <Badge class="h-9 gap-2 px-3 text-sm" :class="statusClass">
        <CheckCircle2 v-if="readiness.readinessStatus === 'ready'" class="size-4" />
        <AlertTriangle v-else-if="readiness.readinessStatus === 'need_review'" class="size-4" />
        <Ban v-else class="size-4" />
        {{ readiness.score }} 分
      </Badge>
    </div>

    <Progress class="mt-4 h-2.5 bg-slate-800" :class="progressClass" :model-value="readiness.score" />

    <div class="mt-4 grid grid-cols-4 gap-2">
      <div
        v-for="item in readiness.checkItems.slice(0, 12)"
        :key="item.key"
        class="min-h-20 rounded-lg border p-3"
        :class="itemClass(item.status)"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="truncate text-sm font-semibold">{{ item.label }}</p>
          <span class="shrink-0 rounded bg-slate-950/35 px-2 py-0.5 text-[11px]">{{ itemLabel(item.status) }}</span>
        </div>
        <p class="mt-2 line-clamp-2 text-xs opacity-80">{{ item.message }}</p>
      </div>
    </div>

    <div
      v-if="readiness.versionAlerts.length"
      class="mt-4 grid grid-cols-2 gap-2"
    >
      <div
        v-for="alert in readiness.versionAlerts.slice(0, 4)"
        :key="alert.message"
        class="rounded-lg border px-3 py-2 text-sm font-semibold"
        :class="alert.level === 'danger'
          ? 'border-red-400/40 bg-red-500/10 text-red-100'
          : 'border-amber-300/35 bg-amber-300/10 text-amber-100'"
      >
        <ShieldAlert class="mr-1 inline size-4" />
        {{ alert.message }}
      </div>
    </div>
    <div v-else class="mt-4 rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-sm font-semibold text-emerald-100">
      <CheckCircle2 class="mr-1 inline size-4" />
      当前有效版本已通过开工检查。
    </div>
  </section>
</template>
