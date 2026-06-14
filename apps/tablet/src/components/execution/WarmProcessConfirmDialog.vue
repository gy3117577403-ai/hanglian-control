<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useProductionStore } from '@/stores/production-store'
import { useExecutionStore } from '@/stores/execution-store'
import type { ProcessConfirmResult, ProcessConfirmType } from '@/types/production'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()

const execution = useExecutionStore()
const production = useProductionStore()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const frontItems: Array<{ label: string; type: ProcessConfirmType }> = [
  { label: '裁线长度已确认', type: 'front_parameter_checked' },
  { label: '剥皮长度已确认', type: 'front_parameter_checked' },
  { label: '端子型号已确认', type: 'front_parameter_checked' },
  { label: '压接高度已确认', type: 'front_parameter_checked' },
  { label: '拉力标准已确认', type: 'front_parameter_checked' },
  { label: '治具点检已确认', type: 'fixture_checked' },
  { label: '首件检查已确认', type: 'first_piece_checked' },
]

const backItems: Array<{ label: string; type: ProcessConfirmType }> = [
  { label: '连接器型号已确认', type: 'back_document_checked' },
  { label: '孔位图已确认', type: 'back_document_checked' },
  { label: 'SOP 已确认', type: 'back_document_checked' },
  { label: '成品细节图已确认', type: 'back_document_checked' },
  { label: '治具点检已确认', type: 'fixture_checked' },
  { label: '质量标准已确认', type: 'quality_checked' },
  { label: '首件检查已确认', type: 'first_piece_checked' },
]

const items = computed(() => production.activeProcess === 'front' ? frontItems : backItems)
const form = reactive({
  label: '',
  confirmType: 'front_parameter_checked' as ProcessConfirmType,
  result: 'pass' as ProcessConfirmResult,
  remark: '已确认',
})

function pick(item: { label: string; type: ProcessConfirmType }) {
  form.label = item.label
  form.confirmType = item.type
  form.remark = item.label
}

async function submit() {
  await execution.processConfirm({
    confirmType: form.confirmType,
    result: form.result,
    remark: form.remark || form.label,
  })
  dialogVisible.value = false
}
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="过程确认" class="w-[760px]">
    <div class="grid gap-4">
      <div class="grid grid-cols-2 gap-2">
        <PrimeButton
          v-for="item in items"
          :key="item.label"
          severity="secondary"
          :label="item.label"
          class="justify-start"
          @click="pick(item)"
        />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <PrimeSelect
          v-model="form.result"
          :options="[
            { label: '通过', value: 'pass' },
            { label: '提醒', value: 'warning' },
            { label: '失败', value: 'fail' },
          ]"
          option-label="label"
          option-value="value"
        />
        <PrimeInputText v-model="form.remark" placeholder="确认说明" />
      </div>
      <PrimeMessage severity="info" :closable="false">
        当前为 {{ production.activeProcess === 'front' ? '前段' : '后段' }} 执行清单，记录写入本地 Mock metadata。
      </PrimeMessage>
    </div>
    <template #footer>
      <PrimeButton severity="secondary" label="取消" @click="dialogVisible = false" />
      <PrimeButton label="提交确认" icon="pi pi-check" :disabled="execution.actionLoading" @click="submit" />
    </template>
  </PrimeDialog>
</template>
