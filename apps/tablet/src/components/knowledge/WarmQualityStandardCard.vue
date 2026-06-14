<script setup lang="ts">
import { ShieldCheck } from 'lucide-vue-next'
import type { QualityStandardKnowledge } from '@/types/production'

defineProps<{ item: QualityStandardKnowledge }>()

const emit = defineEmits<{ open: [item: QualityStandardKnowledge] }>()

function severity(status: string) {
  if (status === 'effective') return 'success'
  if (status === 'pending_review') return 'warn'
  return 'danger'
}

function defectLabel(level: string) {
  const labels: Record<string, string> = {
    minor: '轻微',
    major: '主要',
    critical: '严重',
  }
  return labels[level] ?? level
}
</script>

<template>
  <button type="button" class="rounded-xl border border-[#8c6a2433] bg-[#fff9e8]/90 p-3 text-left shadow-[0_14px_30px_rgba(111,63,24,0.14)] transition hover:-translate-y-0.5 hover:bg-[#fff1cf]" @click="emit('open', item)">
    <div class="mb-2 flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="text-xs font-black text-[#9d6b24]">{{ item.qualityCode }}</p>
        <h4 class="truncate text-base font-black text-[#342316]">{{ item.title }}</h4>
      </div>
      <ShieldCheck class="text-[#9b741f]" :size="22" />
    </div>
    <div class="mb-2 flex flex-wrap gap-2">
      <PrimeTag :value="defectLabel(item.defectLevel)" :severity="item.defectLevel === 'critical' ? 'danger' : 'warn'" />
      <PrimeTag :value="item.status" :severity="severity(item.status)" />
    </div>
    <p class="line-clamp-2 text-sm font-bold leading-snug text-[#6f4722]">{{ item.inspectionItem }} / {{ item.standardValue }} / {{ item.tolerance }}</p>
  </button>
</template>

