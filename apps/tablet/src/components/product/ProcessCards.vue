<script setup lang="ts">
import { Bolt, Cable, CircuitBoard, PlugZap, Ruler, ShieldAlert } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ProductionPlan } from '@/types/production'

defineProps<{
  plan: ProductionPlan
  activeSegment: '前段' | '后段'
}>()

defineEmits<{
  setSegment: [segment: '前段' | '后段']
}>()
</script>

<template>
  <section class="rounded-lg border border-slate-700/80 bg-slate-900/80 p-5">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <p class="text-sm font-semibold text-cyan-200">工序资料切换</p>
        <h2 class="m-0 mt-1 text-xl font-semibold tracking-normal text-slate-50">前段 / 后段资料</h2>
      </div>
      <div class="flex rounded-lg border border-slate-700 bg-slate-950 p-1">
        <Button
          type="button"
          class="h-11 px-6 text-base"
          :class="activeSegment === '前段' ? 'bg-cyan-300 text-slate-950 hover:bg-cyan-200' : 'bg-transparent text-slate-300 hover:bg-slate-800'"
          @click="$emit('setSegment', '前段')"
        >
          前段
        </Button>
        <Button
          type="button"
          class="h-11 px-6 text-base"
          :class="activeSegment === '后段' ? 'bg-cyan-300 text-slate-950 hover:bg-cyan-200' : 'bg-transparent text-slate-300 hover:bg-slate-800'"
          @click="$emit('setSegment', '后段')"
        >
          后段
        </Button>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div
        class="rounded-lg border p-4"
        :class="activeSegment === '前段' ? 'border-cyan-300/45 bg-cyan-300/10' : 'border-slate-700 bg-slate-950/60'"
      >
        <div class="mb-4 flex items-center justify-between">
          <p class="flex items-center gap-2 text-lg font-semibold text-slate-50">
            <Cable class="size-5 text-cyan-300" />
            前段参数卡片
          </p>
          <Badge :class="plan.front.parameterStatus === '有效' ? 'border border-emerald-300/30 bg-emerald-300/10 text-emerald-100' : 'border border-amber-300/30 bg-amber-300/10 text-amber-100'">
            {{ plan.front.parameterStatus }}
          </Badge>
        </div>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-md bg-slate-950/70 p-3">
            <p class="flex items-center gap-1 text-slate-500"><Ruler class="size-3.5" />裁线长度</p>
            <p class="mt-1 font-semibold text-slate-100">{{ plan.front.wireLength }}</p>
          </div>
          <div class="rounded-md bg-slate-950/70 p-3">
            <p class="text-slate-500">剥皮长度</p>
            <p class="mt-1 font-semibold text-slate-100">{{ plan.front.strippingLength }}</p>
          </div>
          <div class="rounded-md bg-slate-950/70 p-3">
            <p class="flex items-center gap-1 text-slate-500"><Bolt class="size-3.5" />端子型号</p>
            <p class="mt-1 font-semibold text-cyan-100">{{ plan.front.terminalModel }}</p>
          </div>
          <div class="rounded-md bg-slate-950/70 p-3">
            <p class="text-slate-500">拉力标准</p>
            <p class="mt-1 font-semibold text-slate-100">{{ plan.front.pullForceStandard }}</p>
          </div>
          <div class="rounded-md bg-slate-950/70 p-3">
            <p class="text-slate-500">压接高度</p>
            <p class="mt-1 font-semibold text-slate-100">{{ plan.front.crimpHeight }}</p>
          </div>
          <div class="rounded-md bg-slate-950/70 p-3">
            <p class="text-slate-500">图纸版本</p>
            <p class="mt-1 font-semibold text-amber-100">{{ plan.front.drawingVersion }}</p>
          </div>
        </div>
      </div>

      <div
        class="rounded-lg border p-4"
        :class="activeSegment === '后段' ? 'border-cyan-300/45 bg-cyan-300/10' : 'border-slate-700 bg-slate-950/60'"
      >
        <div class="mb-4 flex items-center justify-between">
          <p class="flex items-center gap-2 text-lg font-semibold text-slate-50">
            <PlugZap class="size-5 text-cyan-300" />
            后段资料卡片
          </p>
          <Badge :class="plan.back.materialStatus === '有效' ? 'border border-emerald-300/30 bg-emerald-300/10 text-emerald-100' : 'border border-red-400/40 bg-red-400/10 text-red-100'">
            {{ plan.back.materialStatus }}
          </Badge>
        </div>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-md bg-slate-950/70 p-3">
            <p class="flex items-center gap-1 text-slate-500"><CircuitBoard class="size-3.5" />连接器型号</p>
            <p class="mt-1 font-semibold text-cyan-100">{{ plan.back.connectorModel }}</p>
          </div>
          <div class="rounded-md bg-slate-950/70 p-3">
            <p class="text-slate-500">装配说明书</p>
            <p class="mt-1 truncate font-semibold text-slate-100">{{ plan.back.assemblyManual }}</p>
          </div>
          <div class="rounded-md bg-slate-950/70 p-3">
            <p class="text-slate-500">插接孔位图</p>
            <p class="mt-1 font-semibold text-slate-100">{{ plan.back.pinMap }}</p>
          </div>
          <div class="rounded-md bg-slate-950/70 p-3">
            <p class="text-slate-500">作业流程 SOP</p>
            <p class="mt-1 truncate font-semibold text-slate-100">{{ plan.back.sop }}</p>
          </div>
          <div class="rounded-md bg-slate-950/70 p-3">
            <p class="text-slate-500">成品细节图</p>
            <p class="mt-1 font-semibold text-emerald-100">{{ plan.back.finishedImageCount }} 张</p>
          </div>
          <div class="rounded-md bg-slate-950/70 p-3">
            <p class="flex items-center gap-1 text-slate-500"><ShieldAlert class="size-3.5" />版本</p>
            <p class="mt-1 font-semibold text-amber-100">{{ plan.back.drawingVersion }} / {{ plan.back.sopVersion }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
