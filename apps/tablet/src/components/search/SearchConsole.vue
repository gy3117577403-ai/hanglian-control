<script setup lang="ts">
import { Mic, Search, Sparkles } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProductionStore } from '@/stores/production-store'

const store = useProductionStore()
</script>

<template>
  <section class="space-y-3 rounded-lg border border-cyan-300/15 bg-slate-900/75 p-4">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 text-sm font-semibold text-cyan-100">
        <Search class="size-4 text-cyan-300" />
        模糊搜索
      </div>
      <span
        v-if="store.offlineDemoMode"
        class="rounded border border-orange-400/30 bg-orange-400/10 px-2 py-1 text-[11px] font-semibold text-orange-100"
      >
        当前为离线演示模式
      </span>
    </div>
    <Input
      :model-value="store.searchKeyword"
      placeholder="客户 / 产品编号 / SOP / 孔位图 / 端子型号"
      class="h-12 border-cyan-300/20 bg-slate-950/70 text-base text-slate-50 placeholder:text-slate-500 focus-visible:ring-cyan-300"
      @keyup.enter="store.search(store.searchKeyword)"
      @update:model-value="store.setSearchKeyword"
    />

    <button
      class="group flex min-h-24 w-full touch-none flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-cyan-300/25 bg-cyan-300/10 text-cyan-100 transition hover:border-cyan-200/60 hover:bg-cyan-300/15"
      type="button"
      @click="store.runVoiceQuery"
    >
      <span class="flex size-11 items-center justify-center rounded-full bg-cyan-300/15 text-cyan-200 shadow-[0_0_22px_rgba(34,211,238,0.2)]">
        <Mic class="size-6" />
      </span>
      <span class="text-lg font-semibold">按住说话</span>
      <span class="flex items-center gap-1 text-xs text-cyan-200/70">
        <Sparkles class="size-3.5" />
        点击模拟：“查询当前产品后段孔位图”
      </span>
    </button>

    <div class="space-y-2">
      <p class="text-xs font-semibold text-slate-400">查询结果</p>
      <button
        v-for="hit in store.searchHits"
        :key="hit.id"
        type="button"
        class="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-left transition hover:border-cyan-300/50 hover:bg-slate-900"
        @click="store.selectPlan(hit.planId)"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="truncate text-sm font-semibold text-slate-100">{{ hit.title }}</span>
          <span class="rounded bg-cyan-300/10 px-2 py-0.5 text-[11px] text-cyan-200">
            {{ hit.scope === 'global' ? '全局' : '当前' }} / {{ hit.type }}
          </span>
        </div>
        <p class="mt-1 truncate text-xs text-slate-400">{{ hit.subtitle }}</p>
        <p v-if="hit.matchedField" class="mt-1 truncate text-[11px] text-cyan-200/75">{{ hit.matchedField }}：{{ hit.snippet }}</p>
      </button>
    </div>

    <Button
      class="h-11 w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200"
      type="button"
      :disabled="store.loading"
      @click="store.search(store.searchKeyword || store.selectedPlan.productCode)"
    >
      执行查询
    </Button>
  </section>
</template>
