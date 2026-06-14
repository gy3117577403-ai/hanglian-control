<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useExecutionStore } from '@/stores/execution-store'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()

const execution = useExecutionStore()
const form = reactive({
  finalCompletedQuantity: 0,
  finalDefectQuantity: 0,
  remark: '完工确认',
})

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

watch(dialogVisible, (visible) => {
  if (visible) {
    form.finalCompletedQuantity = execution.selectedExecutionDetail?.completedQuantity ?? 0
    form.finalDefectQuantity = 0
    form.remark = '完工确认'
  }
})

async function submit() {
  await execution.completePlan({ ...form })
  dialogVisible.value = false
}
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="完工确认" class="w-[620px]">
    <div class="grid gap-4">
      <PrimeMessage severity="warn" :closable="false">
        完工确认后，当前计划状态会进入“已完工”。当前仍为本地 Mock / metadata。
      </PrimeMessage>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm font-black text-[#68411f]">最终完成数量</label>
          <PrimeInputNumber v-model="form.finalCompletedQuantity" class="mt-2 w-full" :min="0" show-buttons />
        </div>
        <div>
          <label class="text-sm font-black text-[#68411f]">最终不良数量</label>
          <PrimeInputNumber v-model="form.finalDefectQuantity" class="mt-2 w-full" :min="0" show-buttons />
        </div>
      </div>
      <PrimeTextarea v-model="form.remark" class="min-h-24 w-full" />
    </div>
    <template #footer>
      <PrimeButton severity="secondary" label="取消" @click="dialogVisible = false" />
      <PrimeButton label="确认完工" icon="pi pi-check-circle" :disabled="execution.actionLoading" @click="submit" />
    </template>
  </PrimeDialog>
</template>
