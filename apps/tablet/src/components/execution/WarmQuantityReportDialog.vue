<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useExecutionStore } from '@/stores/execution-store'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()

const execution = useExecutionStore()
const form = reactive({
  completedQuantity: 50,
  defectQuantity: 0,
  reworkQuantity: 0,
  scrapQuantity: 0,
  remark: '本时段报工',
})

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const detail = computed(() => execution.selectedExecutionDetail)
const remaining = computed(() => Math.max((detail.value?.plannedQuantity ?? 0) - (detail.value?.completedQuantity ?? 0), 0))
const warning = computed(() => {
  if (form.defectQuantity + form.reworkQuantity + form.scrapQuantity > form.completedQuantity) return '不良、返工、报废合计不能超过本次完成数量。'
  if ((detail.value?.completedQuantity ?? 0) + form.completedQuantity > (detail.value?.plannedQuantity ?? 0)) return '累计完成数量将超过计划数量，请复核。'
  return ''
})

async function submit() {
  if (warning.value && warning.value.includes('不能超过')) return
  await execution.reportQuantity({ ...form })
  dialogVisible.value = false
}
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="数量报工" class="w-[680px]">
    <div class="grid gap-4">
      <div class="grid grid-cols-4 gap-3">
        <div class="rounded-2xl bg-[#fff4dc] p-3">
          <p class="text-xs font-black text-[#7b5129]">计划数量</p>
          <strong>{{ detail?.plannedQuantity ?? 0 }}</strong>
        </div>
        <div class="rounded-2xl bg-[#fff4dc] p-3">
          <p class="text-xs font-black text-[#7b5129]">已完成</p>
          <strong>{{ detail?.completedQuantity ?? 0 }}</strong>
        </div>
        <div class="rounded-2xl bg-[#fff4dc] p-3">
          <p class="text-xs font-black text-[#7b5129]">剩余</p>
          <strong>{{ remaining }}</strong>
        </div>
        <div class="rounded-2xl bg-[#fff4dc] p-3">
          <p class="text-xs font-black text-[#7b5129]">完成率</p>
          <strong>{{ detail?.completionRate ?? 0 }}%</strong>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <PrimeInputNumber v-model="form.completedQuantity" input-id="completedQuantity" :min="0" show-buttons fluid />
        <PrimeInputNumber v-model="form.defectQuantity" input-id="defectQuantity" :min="0" show-buttons fluid />
        <PrimeInputNumber v-model="form.reworkQuantity" input-id="reworkQuantity" :min="0" show-buttons fluid />
        <PrimeInputNumber v-model="form.scrapQuantity" input-id="scrapQuantity" :min="0" show-buttons fluid />
      </div>
      <div class="grid grid-cols-2 gap-3 text-sm font-black text-[#68411f]">
        <span>本次完成数量</span>
        <span>不良数量</span>
        <span>返工数量</span>
        <span>报废数量</span>
      </div>
      <PrimeTextarea v-model="form.remark" class="min-h-24 w-full" />
      <PrimeMessage v-if="warning" severity="warn" :closable="false">{{ warning }}</PrimeMessage>
    </div>
    <template #footer>
      <PrimeButton severity="secondary" label="取消" @click="dialogVisible = false" />
      <PrimeButton label="提交报工" icon="pi pi-send" :disabled="execution.actionLoading || warning.includes('不能超过')" @click="submit" />
    </template>
  </PrimeDialog>
</template>
