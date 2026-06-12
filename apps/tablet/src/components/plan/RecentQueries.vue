<script setup lang="ts">
import { History } from 'lucide-vue-next'
import type { QueryRecord } from '@/types/production'

defineProps<{
  records: QueryRecord[]
}>()
</script>

<template>
  <section class="rounded-lg border border-slate-700/80 bg-slate-900/70 p-4">
    <div class="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
      <History class="size-4 text-cyan-300" />
      最近查询记录
    </div>
    <div class="space-y-2">
      <div
        v-for="record in records"
        :key="record.id"
        class="flex items-start justify-between gap-3 rounded-md bg-slate-950/70 px-3 py-2"
      >
        <div class="min-w-0">
          <p class="truncate text-sm text-slate-200">{{ record.text }}</p>
          <p class="mt-0.5 text-xs text-slate-500">{{ record.source }}</p>
        </div>
        <span class="shrink-0 text-xs text-cyan-200">{{ record.time }}</span>
      </div>
    </div>
  </section>
</template>
