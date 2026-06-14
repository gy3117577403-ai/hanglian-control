<script setup lang="ts">
import { Wrench } from 'lucide-vue-next'
import type { FixtureKnowledge } from '@/types/production'

defineProps<{ item: FixtureKnowledge }>()

const emit = defineEmits<{ open: [item: FixtureKnowledge] }>()

function severity(status: string) {
  if (status === 'active') return 'success'
  if (status === 'pending_review') return 'warn'
  if (status === 'abnormal') return 'danger'
  return 'secondary'
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    active: '启用',
    pending_review: '待复核',
    inactive: '停用',
    abnormal: '异常',
  }
  return labels[status] ?? status
}
</script>

<template>
  <button type="button" class="rounded-xl border border-[#b26a2a33] bg-[#fff8ea]/85 p-3 text-left shadow-[0_14px_30px_rgba(111,63,24,0.14)] transition hover:-translate-y-0.5 hover:bg-[#fff4dc]" @click="emit('open', item)">
    <div class="mb-2 flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="text-xs font-black text-[#9d5d24]">{{ item.fixtureCode }}</p>
        <h4 class="truncate text-base font-black text-[#342316]">{{ item.fixtureName }}</h4>
      </div>
      <Wrench class="text-[#b45f22]" :size="22" />
    </div>
    <div class="mb-2 flex flex-wrap gap-2">
      <PrimeTag :value="statusLabel(item.status)" :severity="severity(item.status)" />
      <PrimeTag :value="item.applicableStation" severity="secondary" />
    </div>
    <p class="line-clamp-2 text-sm font-bold leading-snug text-[#6f4722]">{{ item.checkStandard }}</p>
  </button>
</template>

