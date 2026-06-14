<script setup lang="ts">
import { computed } from 'vue'
import { useExecutionStore } from '@/stores/execution-store'

const execution = useExecutionStore()

const rows = computed(() => [...execution.timeline].slice().reverse().slice(0, 8))
</script>

<template>
  <section class="section-bay warm-enter">
    <div class="section-title">
      <div>
        <p class="section-kicker">EXECUTION TIMELINE</p>
        <h3 class="text-xl font-black">执行时间线</h3>
      </div>
      <PrimeTag :value="`${rows.length} 条`" severity="secondary" />
    </div>

    <div v-auto-animate class="mt-3 space-y-2">
      <article
        v-for="item in rows"
        :key="item.id"
        class="rounded-2xl border border-[#8b5a2a24] bg-white/65 px-4 py-3"
      >
        <div class="flex items-center justify-between gap-3">
          <strong class="text-[#342316]">{{ item.title }}</strong>
          <PrimeTag :value="item.severity" :severity="item.severity === 'danger' ? 'danger' : item.severity === 'warn' ? 'warn' : item.severity === 'success' ? 'success' : 'secondary'" />
        </div>
        <p class="mt-1 text-sm font-bold text-[#76512a]">{{ item.description }}</p>
        <p class="mt-1 text-xs font-bold text-[#9a6a35]">{{ item.operatorName ?? '系统' }} / {{ item.createdAt }}</p>
      </article>
      <div v-if="!rows.length" class="rounded-2xl border border-dashed border-[#c98a4a66] bg-white/45 p-5 text-center font-bold text-[#76512a]">
        暂无执行记录，完成开工检查后会形成时间线。
      </div>
    </div>
  </section>
</template>
