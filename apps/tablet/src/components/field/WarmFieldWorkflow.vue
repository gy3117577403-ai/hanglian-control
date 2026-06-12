<script setup lang="ts">
import { computed } from 'vue'
import { ClipboardCheck, FileSearch, FlagTriangleRight, LockKeyhole, ShieldCheck, Siren } from 'lucide-vue-next'
import { useProductionStore } from '@/stores/production-store'

const store = useProductionStore()

type StepTone = 'done' | 'current' | 'review' | 'blocked' | 'idle'

const plan = computed(() => store.selectedPlan)
const needsReview = computed(() => store.readiness.readinessStatus === 'need_review' || plan.value.materialCompleteness < 90)
const blocked = computed(() => store.readiness.readinessStatus === 'blocked' || plan.value.status === '异常')
const confirmed = computed(() => String(plan.value.confirmationStatus).includes('已'))

const steps = computed<Array<{ index: number; label: string; detail: string; tone: StepTone; icon: unknown }>>(() => {
  const materialTone: StepTone = blocked.value ? 'blocked' : needsReview.value ? 'review' : 'done'
  return [
    { index: 1, label: '选择生产计划', detail: plan.value.weekPlanNo, tone: 'done', icon: ClipboardCheck },
    { index: 2, label: '锁定客户产品', detail: plan.value.productCode, tone: 'done', icon: LockKeyhole },
    { index: 3, label: '检查资料齐套', detail: store.readiness.summary, tone: materialTone, icon: ShieldCheck },
    { index: 4, label: '查看图纸/SOP/参数', detail: store.activeProcess === 'front' ? '前段参数' : '后段资料', tone: confirmed.value ? 'done' : 'current', icon: FileSearch },
    { index: 5, label: '组长确认', detail: plan.value.confirmationStatus, tone: confirmed.value ? 'done' : needsReview.value ? 'review' : 'current', icon: FlagTriangleRight },
    { index: 6, label: '异常反馈', detail: blocked.value ? '已阻塞' : '按需提交', tone: blocked.value ? 'blocked' : 'idle', icon: Siren },
  ]
})
</script>

<template>
  <section class="field-workflow warm-enter">
    <div class="field-workflow-head">
      <div>
        <p class="section-kicker">FIELD FLOW</p>
        <h3>现场操作步骤</h3>
      </div>
      <PrimeTag :value="blocked ? '异常阻塞' : needsReview ? '资料需复核' : '流程可推进'" :severity="blocked ? 'danger' : needsReview ? 'warn' : 'success'" />
    </div>

    <div v-auto-animate class="field-step-row">
      <article v-for="step in steps" :key="step.index" :class="['field-step', `field-step-${step.tone}`]">
        <span class="field-step-index">{{ step.index }}</span>
        <component :is="step.icon" :size="18" />
        <div class="min-w-0">
          <p>{{ step.label }}</p>
          <small>{{ step.detail }}</small>
        </div>
      </article>
    </div>
  </section>
</template>
