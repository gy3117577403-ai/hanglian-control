<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Bell, X } from 'lucide-vue-next'
import { useSettingsStore } from '@/stores/settings-store'

const emit = defineEmits<{ open: [] }>()
const settings = useSettingsStore()
const dismissed = ref<string[]>([])
const storageKey = 'hanglian.v31.dismissed-announcements'

const current = computed(() => settings.activeAnnouncements.find((item) => !dismissed.value.includes(item.id)))
const severityClass = computed(() => current.value?.severity === 'critical' ? 'border-[#c2410c] bg-[#fff1e6]' : 'border-[#edc07d] bg-[#fff8ea]')

function close() {
  if (!current.value) return
  dismissed.value = [...dismissed.value, current.value.id]
  localStorage.setItem(storageKey, JSON.stringify(dismissed.value))
}

onMounted(() => {
  try {
    dismissed.value = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as string[]
  } catch {
    dismissed.value = []
  }
  void settings.loadAnnouncements()
})
</script>

<template>
  <section v-if="current" :class="['warm-enter mx-4 mb-3 rounded-[22px] border p-3 shadow-[0_16px_36px_rgba(91,55,20,0.14)]', severityClass]">
    <div class="flex items-center gap-3">
      <div class="grid h-11 w-11 place-items-center rounded-2xl bg-[#d8732a] text-white">
        <Bell :size="22" />
      </div>
      <button type="button" class="min-w-0 flex-1 text-left" @click="emit('open')">
        <p class="text-sm font-black uppercase tracking-[0.18em] text-[#9b5a22]">现场试运行公告</p>
        <h3 class="truncate text-xl font-black text-[#342316]">{{ current.title }}</h3>
        <p class="truncate text-sm font-bold text-[#76512a]">{{ current.content }}</p>
      </button>
      <PrimeTag :severity="current.severity === 'critical' ? 'danger' : current.severity === 'warning' ? 'warn' : 'info'" :value="current.type" />
      <PrimeButton severity="secondary" text rounded aria-label="关闭公告" @click="close">
        <template #icon><X :size="18" /></template>
      </PrimeButton>
    </div>
  </section>
</template>
