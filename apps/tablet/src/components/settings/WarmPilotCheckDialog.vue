<script setup lang="ts">
import { computed, watch } from 'vue'
import { ClipboardCheck } from 'lucide-vue-next'
import { useSettingsStore } from '@/stores/settings-store'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()
const settings = useSettingsStore()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const statusSeverity = (status: string) => status === 'pass' ? 'success' : status === 'fail' ? 'danger' : 'warn'

function copyResult() {
  if (!settings.pilotCheck || !navigator.clipboard) return
  const text = [
    `现场试运行检查：${settings.pilotCheck.score} 分`,
    settings.pilotCheck.summary,
    ...settings.pilotCheck.items.map((item) => `${item.status} - ${item.label}: ${item.message}`),
  ].join('\n')
  void navigator.clipboard.writeText(text)
}

watch(dialogVisible, (visible) => {
  if (visible) void settings.loadPilotCheck()
}, { immediate: true })
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="现场试运行检查" class="w-[860px]">
    <div class="grid max-h-[70vh] gap-4 overflow-auto pr-1">
      <section class="section-bay">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="grid h-14 w-14 place-items-center rounded-2xl bg-[#d8732a] text-white">
              <ClipboardCheck :size="27" />
            </div>
            <div>
              <p class="section-kicker">FIELD PILOT CHECK</p>
              <h3 class="text-2xl font-black text-[#342316]">{{ settings.pilotCheck?.score ?? '--' }} 分</h3>
              <p class="text-sm font-bold text-[#76512a]">{{ settings.pilotCheck?.summary ?? '尚未运行检查' }}</p>
            </div>
          </div>
          <PrimeTag :severity="statusSeverity(settings.pilotCheck?.status ?? 'warning')" :value="settings.pilotCheck?.status ?? '待检查'" />
        </div>
      </section>
      <div class="grid gap-2">
        <article v-for="item in settings.pilotCheck?.items ?? []" :key="item.key" class="rounded-2xl border border-[#ead0a8] bg-[#fffaf0] p-3">
          <div class="flex items-center justify-between gap-3">
            <h4 class="text-lg font-black text-[#342316]">{{ item.label }}</h4>
            <PrimeTag :severity="statusSeverity(item.status)" :value="item.status" />
          </div>
          <p class="mt-1 text-sm font-bold text-[#50331b]">{{ item.message }}</p>
          <p class="mt-1 text-sm font-bold text-[#9b5a22]">建议：{{ item.recommendedAction }}</p>
        </article>
      </div>
    </div>
    <template #footer>
      <PrimeButton severity="secondary" label="复制结果" @click="copyResult" />
      <PrimeButton label="运行检查" :loading="settings.saving" @click="settings.runPilotCheck" />
    </template>
  </PrimeDialog>
</template>
