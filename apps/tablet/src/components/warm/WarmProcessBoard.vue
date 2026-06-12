<script setup lang="ts">
import { computed } from 'vue'
import { Gauge, PlugZap, Ruler, Scissors, ShieldCheck, Wrench } from 'lucide-vue-next'
import { materialSeverity } from '@/lib/status-style'
import { useProductionStore } from '@/stores/production-store'

const store = useProductionStore()
const plan = computed(() => store.selectedPlan)

const frontMetrics = computed(() => [
  { label: '裁线长度', value: plan.value.front.wireLength, icon: Ruler },
  { label: '剥皮长度', value: plan.value.front.strippingLength, icon: Scissors },
  { label: '端子型号', value: plan.value.front.terminalModel, icon: PlugZap },
  { label: '拉力标准', value: plan.value.front.pullForceStandard, icon: ShieldCheck },
  { label: '压接高度', value: plan.value.front.crimpHeight, icon: Gauge },
])

const backMetrics = computed(() => [
  { label: '连接器型号', value: plan.value.back.connectorModel, icon: PlugZap },
  { label: '装配说明书', value: plan.value.back.assemblyManual, icon: Wrench },
  { label: '插接孔位图', value: plan.value.back.pinMap, icon: Gauge },
  { label: '作业流程 SOP', value: plan.value.back.sop, icon: ShieldCheck },
  { label: '成品细节图', value: `${plan.value.back.finishedImageCount} 张`, icon: Ruler },
])

function setSegment(segment: '前段' | '后段') {
  store.setSegment(segment)
}

function onSegmentClick(event: MouseEvent) {
  const segment = (event.target as HTMLElement).closest<HTMLElement>('[data-segment]')?.dataset.segment
  if (segment === 'front') setSegment('前段')
  if (segment === 'back') setSegment('后段')
}
</script>

<template>
  <section class="process-compact grid min-h-0 grid-cols-[0.52fr_0.48fr] gap-3" @click.capture="onSegmentClick">
    <PrimePanel class="section-bay warm-enter">
      <template #header>
        <div class="flex w-full items-center justify-between">
          <div>
            <p class="section-kicker">PROCESS PARAMETERS</p>
            <h3 class="text-xl font-black text-[#342316]">前段参数台</h3>
          </div>
          <PrimeButton
            data-segment="front"
            label="切到前段"
            icon="pi pi-arrow-left"
            :severity="store.activeProcess === 'front' ? 'primary' : 'secondary'"
          />
        </div>
      </template>

      <div class="grid grid-cols-2 gap-3">
        <article
          v-for="item in frontMetrics"
          :key="item.label"
          :class="['metric-tile-3d', store.activeProcess === 'front' ? 'ring-2 ring-[#d9772b55]' : '']"
        >
          <component :is="item.icon" class="text-[#b45f22]" :size="24" />
          <p class="metric-label mt-3">{{ item.label }}</p>
          <p class="metric-value text-[22px]">{{ item.value }}</p>
        </article>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <PrimeTag :value="`图纸版本 ${plan.front.drawingVersion}`" severity="secondary" />
        <PrimeTag :value="plan.front.parameterStatus" :severity="materialSeverity(plan.front.parameterStatus)" />
      </div>
    </PrimePanel>

    <PrimePanel class="section-bay warm-enter">
      <template #header>
        <div class="flex w-full items-center justify-between">
          <div>
            <p class="section-kicker">BACK PROCESS PACKAGE</p>
            <h3 class="text-xl font-black text-[#342316]">后段资料台</h3>
          </div>
          <PrimeButton
            data-segment="back"
            label="切到后段"
            icon="pi pi-arrow-right"
            :severity="store.activeProcess === 'back' ? 'primary' : 'secondary'"
          />
        </div>
      </template>

      <div class="grid grid-cols-2 gap-3">
        <article
          v-for="item in backMetrics"
          :key="item.label"
          :class="['metric-tile-3d', store.activeProcess === 'back' ? 'ring-2 ring-[#d9772b55]' : '']"
        >
          <component :is="item.icon" class="text-[#b45f22]" :size="24" />
          <p class="metric-label mt-3">{{ item.label }}</p>
          <p class="metric-value text-[20px]">{{ item.value }}</p>
        </article>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <PrimeTag :value="`图纸版本 ${plan.back.drawingVersion}`" severity="secondary" />
        <PrimeTag :value="`SOP ${plan.back.sopVersion}`" severity="secondary" />
        <PrimeTag :value="plan.back.materialStatus" :severity="materialSeverity(plan.back.materialStatus)" />
      </div>
    </PrimePanel>

    <div class="section-bay col-span-2 warm-enter">
      <div class="section-title">
        <div>
          <p class="section-kicker">READINESS CHECK</p>
          <h3 class="text-xl font-black">开工资料检查</h3>
        </div>
        <PrimeTag :value="`${store.readiness.score} 分`" :severity="store.readiness.score >= 90 ? 'success' : 'danger'" />
      </div>

      <PrimeMessage v-if="store.readiness.versionAlerts.length" severity="warn" :closable="false">
        {{ store.readiness.summary }}：{{ store.readiness.versionAlerts[0].message }}
      </PrimeMessage>

      <div v-auto-animate class="mt-3 grid grid-cols-4 gap-2">
        <div
          v-for="item in store.readiness.checkItems.slice(0, 8)"
          :key="item.key"
          class="rounded-lg border border-[#8b5a2a30] bg-white/55 px-3 py-2"
        >
          <p class="truncate text-sm font-black text-[#3b2514]">{{ item.label }}</p>
          <p class="mt-1 text-xs font-bold text-[#7b5129]">{{ item.message }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
