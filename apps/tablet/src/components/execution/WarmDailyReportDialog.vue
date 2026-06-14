<script setup lang="ts">
import { computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useExecutionStore } from '@/stores/execution-store'
import { useAuthStore } from '@/stores/auth-store'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()

const execution = useExecutionStore()
const auth = useAuthStore()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

watch(dialogVisible, (visible) => {
  if (visible) void execution.loadDailyReport({ team: auth.currentUser?.team })
})

function copyText() {
  void navigator.clipboard?.writeText(execution.dailyReportText)
  toast.success('现场日报文本已复制')
}
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="现场日报" class="w-[760px]">
    <div class="grid gap-4">
      <div class="grid grid-cols-4 gap-3">
        <div class="rounded-2xl bg-[#fff4dc] p-3">
          <p class="text-xs font-black text-[#7b5129]">计划数</p>
          <strong>{{ execution.dailyReport?.planCount ?? 0 }}</strong>
        </div>
        <div class="rounded-2xl bg-[#fff4dc] p-3">
          <p class="text-xs font-black text-[#7b5129]">完成数量</p>
          <strong>{{ execution.dailyReport?.completedQuantity ?? 0 }}</strong>
        </div>
        <div class="rounded-2xl bg-[#fff4dc] p-3">
          <p class="text-xs font-black text-[#7b5129]">异常停线</p>
          <strong>{{ execution.dailyReport?.exceptionHoldPlans ?? 0 }}</strong>
        </div>
        <div class="rounded-2xl bg-[#fff4dc] p-3">
          <p class="text-xs font-black text-[#7b5129]">交接记录</p>
          <strong>{{ execution.dailyReport?.handovers.length ?? 0 }}</strong>
        </div>
      </div>
      <pre class="max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-[#fff8ea] p-4 text-sm font-bold text-[#3b2514]">{{ execution.dailyReportText }}</pre>
    </div>
    <template #footer>
      <PrimeButton severity="secondary" label="关闭" @click="dialogVisible = false" />
      <PrimeButton label="复制文本日报" icon="pi pi-copy" @click="copyText" />
    </template>
  </PrimeDialog>
</template>
