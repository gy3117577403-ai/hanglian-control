<script setup lang="ts">
import { computed, watch } from 'vue'
import dayjs from 'dayjs'
import { useSettingsStore } from '@/stores/settings-store'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()
const settings = useSettingsStore()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

watch(dialogVisible, (visible) => {
  if (visible) void settings.loadAnnouncements()
}, { immediate: true })
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="试运行公告通知" class="w-[780px]">
    <div class="grid max-h-[68vh] gap-3 overflow-auto pr-1">
      <article v-for="item in settings.announcements" :key="item.id" class="section-bay">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="section-kicker">{{ item.type }}</p>
            <h3 class="text-xl font-black text-[#342316]">{{ item.title }}</h3>
          </div>
          <div class="flex gap-2">
            <PrimeTag :severity="item.active ? 'success' : 'secondary'" :value="item.active ? '有效' : '关闭'" />
            <PrimeTag :severity="item.severity === 'critical' ? 'danger' : item.severity === 'warning' ? 'warn' : 'info'" :value="item.severity" />
          </div>
        </div>
        <p class="mt-3 text-base font-bold text-[#50331b]">{{ item.content }}</p>
        <p class="mt-2 text-sm font-bold text-[#8a6338]">{{ dayjs(item.updatedAt).format('YYYY-MM-DD HH:mm') }} / {{ item.operatorName }}</p>
      </article>
    </div>
  </PrimeDialog>
</template>
