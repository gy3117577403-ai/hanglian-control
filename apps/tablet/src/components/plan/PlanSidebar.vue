<script setup lang="ts">
import { CalendarRange, ClipboardList } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import LockedProductCard from '@/components/plan/LockedProductCard.vue'
import PlanTaskCard from '@/components/plan/PlanTaskCard.vue'
import RecentQueries from '@/components/plan/RecentQueries.vue'
import SearchConsole from '@/components/search/SearchConsole.vue'
import { useProductionStore } from '@/stores/production-store'

const store = useProductionStore()
</script>

<template>
  <aside class="flex min-h-0 flex-col gap-4 rounded-lg border border-slate-700/70 bg-slate-950/70 p-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="flex items-center gap-2 text-sm font-semibold text-cyan-200">
          <ClipboardList class="size-4" />
          生产计划
        </p>
        <h2 class="m-0 mt-1 text-xl font-semibold tracking-normal text-slate-50">计划驱动资料</h2>
      </div>
      <div class="flex rounded-lg border border-slate-700 bg-slate-900 p-1">
        <Button
          size="sm"
          type="button"
          :class="store.scope === 'today' ? 'bg-cyan-300 text-slate-950 hover:bg-cyan-200' : 'bg-transparent text-slate-300 hover:bg-slate-800'"
          @click="store.setScope('today')"
        >
          今日计划
        </Button>
        <Button
          size="sm"
          type="button"
          :class="store.scope === 'week' ? 'bg-cyan-300 text-slate-950 hover:bg-cyan-200' : 'bg-transparent text-slate-300 hover:bg-slate-800'"
          @click="store.setScope('week')"
        >
          本周计划
        </Button>
      </div>
    </div>

    <div
      v-if="store.errorMessage"
      class="rounded-lg border border-orange-400/30 bg-orange-400/10 px-3 py-2 text-xs font-semibold text-orange-100"
    >
      {{ store.errorMessage }}
    </div>

    <SearchConsole />

    <div class="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
      <div class="flex items-center justify-between text-xs text-slate-400">
        <span class="flex items-center gap-1">
          <CalendarRange class="size-3.5" />
          {{ store.scope === 'today' ? '今日待执行' : '本周计划池' }}
        </span>
        <span>{{ store.visiblePlans.length }} 条</span>
      </div>
      <PlanTaskCard
        v-for="plan in store.visiblePlans"
        :key="plan.id"
        :plan="plan"
        :active="plan.id === store.selectedPlan.id"
        @click="store.selectPlan(plan.id)"
      />
    </div>

    <LockedProductCard :plan="store.selectedPlan" />
    <RecentQueries :records="store.queryRecords" />
  </aside>
</template>
