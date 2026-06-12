<script setup lang="ts">
import { LockKeyhole, PackageCheck } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import type { ProductionPlan } from '@/types/production'

defineProps<{
  plan: ProductionPlan
}>()
</script>

<template>
  <section class="rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 text-sm font-semibold text-emerald-100">
        <LockKeyhole class="size-4" />
        当前锁定产品
      </div>
      <Badge class="border border-emerald-300/30 bg-emerald-300/10 text-emerald-100">{{ plan.productVersion }}</Badge>
    </div>
    <div class="mt-4 flex items-start gap-3">
      <div class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-emerald-300/15 text-emerald-200">
        <PackageCheck class="size-6" />
      </div>
      <div class="min-w-0">
        <p class="truncate text-lg font-semibold text-slate-50">{{ plan.productCode }}</p>
        <p class="mt-1 text-sm text-slate-300">{{ plan.productName }}</p>
        <p class="mt-2 text-xs text-slate-400">{{ plan.customer }} / {{ plan.owner }}</p>
      </div>
    </div>
  </section>
</template>
