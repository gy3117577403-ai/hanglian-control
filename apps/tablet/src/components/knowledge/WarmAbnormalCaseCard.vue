<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'
import type { AbnormalCaseKnowledge } from '@/types/production'

defineProps<{ item: AbnormalCaseKnowledge }>()

const emit = defineEmits<{ open: [item: AbnormalCaseKnowledge] }>()

function severityTone(severity: string) {
  if (severity === 'critical' || severity === 'high') return 'danger'
  if (severity === 'medium') return 'warn'
  return 'info'
}

function severityLabel(severity: string) {
  const labels: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '严重',
  }
  return labels[severity] ?? severity
}
</script>

<template>
  <button type="button" class="rounded-xl border border-[#b8422a33] bg-[#fff3e4]/90 p-3 text-left shadow-[0_14px_30px_rgba(111,63,24,0.14)] transition hover:-translate-y-0.5 hover:bg-[#ffe9d0]" @click="emit('open', item)">
    <div class="mb-2 flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="text-xs font-black text-[#9d4b24]">{{ item.abnormalCode }}</p>
        <h4 class="truncate text-base font-black text-[#342316]">{{ item.title }}</h4>
      </div>
      <AlertTriangle class="text-[#b8422a]" :size="22" />
    </div>
    <div class="mb-2 flex flex-wrap gap-2">
      <PrimeTag :value="severityLabel(item.severity)" :severity="severityTone(item.severity)" />
      <PrimeTag :value="item.station" severity="secondary" />
    </div>
    <p class="line-clamp-2 text-sm font-bold leading-snug text-[#6f4722]">{{ item.solution }}</p>
  </button>
</template>

