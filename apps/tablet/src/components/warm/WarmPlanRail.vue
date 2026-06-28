<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, ClipboardList, PackageCheck } from 'lucide-vue-next'
import WarmEmptyState from '@/components/common/WarmEmptyState.vue'
import WarmSearchPanel from '@/components/warm/WarmSearchPanel.vue'
import { completionSummary, completionTone, confirmSeverity, planStatusSeverity, progressClass } from '@/lib/status-style'
import { useProductionStore } from '@/stores/production-store'

const store = useProductionStore()

const selectedId = computed(() => store.selectedPlan?.id)
const lockedPlan = computed(() => store.selectedPlan)

function onScopeChange(value: string | number) {
  void store.setScope(value === 'week' ? 'week' : 'today')
}

function selectPlan(id: string) {
  void store.selectPlan(id)
}

function onScopeTabClick(event: MouseEvent) {
  const text = (event.target as HTMLElement).closest<HTMLElement>('[role="tab"]')?.textContent ?? ''
  if (text.includes('本周')) onScopeChange('week')
  if (text.includes('今日')) onScopeChange('today')
}
</script>

<template>
  <aside class="warm-rail warm-enter">
    <div @click.capture="onScopeTabClick">
      <PrimeTabs :value="store.scope" @update:value="onScopeChange">
        <PrimeTabList>
          <PrimeTab value="today">
            <span class="px-4">今日计划</span>
          </PrimeTab>
          <PrimeTab value="week">
            <span class="px-4">本周计划</span>
          </PrimeTab>
        </PrimeTabList>
      </PrimeTabs>
    </div>

    <WarmSearchPanel />

    <section class="section-bay min-h-0">
      <div class="section-title">
        <div>
          <p class="section-kicker">PLAN QUEUE</p>
          <h2 class="text-xl font-black">生产任务队列</h2>
        </div>
        <PrimeTag :value="`${store.visiblePlans.length} 条`" severity="secondary" />
      </div>

      <WarmEmptyState
        v-if="!store.visiblePlans.length"
        title="暂无生产计划"
        description="暂无生产计划，请通过数据导入中心导入周计划。"
      />

      <div v-else v-auto-animate class="warm-scroll max-h-[calc(100vh-390px)] space-y-3">
        <button
          v-for="plan in store.visiblePlans"
          :key="plan.id"
          type="button"
          :class="['plan-card-3d', { 'is-active': plan.id === selectedId }]"
          @click="selectPlan(plan.id)"
        >
          <div class="mb-2 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-[13px] font-black text-[#7a4c1f]">{{ plan.weekPlanNo }} / {{ plan.date }}</p>
              <h3 class="mt-1 truncate text-lg font-black leading-tight text-[#342316]">
                {{ plan.productCode }}
              </h3>
              <p class="truncate text-sm font-bold text-[#65401f]">{{ plan.customer }} · {{ plan.productName }}</p>
            </div>
            <PrimeTag :value="plan.status" :severity="planStatusSeverity(plan.status)" />
          </div>

          <div class="mb-2 grid grid-cols-3 gap-2 text-xs font-bold text-[#6f4722]">
            <span class="rounded-md bg-white/45 px-2 py-1">工序：{{ plan.segment }}</span>
            <span class="rounded-md bg-white/45 px-2 py-1">负责人：{{ plan.owner }}</span>
            <span class="rounded-md bg-white/45 px-2 py-1">完成：{{ completionSummary(plan).percent }}%</span>
          </div>

          <div class="flex items-center gap-2">
            <PrimeProgressBar :value="plan.materialCompleteness" :class="progressClass(plan.materialCompleteness)" />
            <span
              :class="[
                'w-12 text-right text-sm font-black',
                completionTone(plan.materialCompleteness) === 'danger' ? 'text-[#b8422a]' : 'text-[#6f4722]',
              ]"
            >
              {{ plan.materialCompleteness }}%
            </span>
          </div>

          <div class="mt-3 flex items-center justify-between">
            <PrimeTag :value="plan.confirmationStatus" :severity="confirmSeverity(plan.confirmationStatus)" />
            <span v-if="plan.materialCompleteness < 90" class="inline-flex items-center gap-1 text-xs font-black text-[#b8422a]">
              <AlertTriangle :size="14" /> 资料需复核
            </span>
          </div>
        </button>
      </div>
    </section>

    <section class="locked-plate p-4">
      <div class="mb-3 flex items-center justify-between">
        <div>
          <p class="section-kicker">LOCKED PRODUCT</p>
          <h3 class="text-lg font-black text-[#342316]">当前锁定产品</h3>
        </div>
        <PackageCheck class="text-[#b45f22]" :size="26" />
      </div>
      <div class="grid grid-cols-[1fr_auto] gap-3">
        <div class="min-w-0">
          <p class="truncate text-2xl font-black text-[#342316]">{{ lockedPlan.productCode }}</p>
          <p class="truncate text-sm font-bold text-[#6f4722]">{{ lockedPlan.customer }} · {{ lockedPlan.productVersion }}</p>
        </div>
        <PrimeTag :value="lockedPlan.confirmationStatus" :severity="confirmSeverity(lockedPlan.confirmationStatus)" />
      </div>
      <div class="mt-3 flex items-center gap-2 text-sm font-bold text-[#6d4724]">
        <ClipboardList :size="16" />
        <span>计划 {{ lockedPlan.plannedQuantity }} 件，剩余 {{ completionSummary(lockedPlan).remaining }} 件</span>
      </div>
    </section>
  </aside>
</template>
