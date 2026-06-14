<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useProductionStore } from '@/stores/production-store'
import { useExecutionStore } from '@/stores/execution-store'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()

const production = useProductionStore()
const execution = useExecutionStore()

const form = reactive({
  fromTeam: 'A班',
  toTeam: 'B班',
  summary: '交接当前计划执行状态、未完成数量和待复核风险。',
  riskItems: '孔位图待复核',
  unfinishedItems: '尾数继续生产',
})

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

async function submit() {
  await execution.createHandover({
    fromTeam: form.fromTeam,
    toTeam: form.toTeam,
    planIds: [production.selectedPlan.id],
    summary: form.summary,
    riskItems: form.riskItems.split(/[,\n，]/).map((item) => item.trim()).filter(Boolean),
    unfinishedItems: form.unfinishedItems.split(/[,\n，]/).map((item) => item.trim()).filter(Boolean),
  })
  dialogVisible.value = false
}
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="班组交接" class="w-[680px]">
    <div class="grid gap-4">
      <div class="grid grid-cols-2 gap-3">
        <PrimeInputText v-model="form.fromTeam" placeholder="当前班组" />
        <PrimeInputText v-model="form.toTeam" placeholder="接收班组" />
      </div>
      <PrimeTextarea v-model="form.summary" class="min-h-24 w-full" placeholder="交接摘要" />
      <PrimeTextarea v-model="form.riskItems" class="min-h-20 w-full" placeholder="风险项，逗号或换行分隔" />
      <PrimeTextarea v-model="form.unfinishedItems" class="min-h-20 w-full" placeholder="未完成事项，逗号或换行分隔" />
      <PrimeMessage severity="info" :closable="false">
        当前关联计划：{{ production.selectedPlan.productCode }} / {{ production.selectedPlan.productName }}
      </PrimeMessage>
    </div>
    <template #footer>
      <PrimeButton severity="secondary" label="取消" @click="dialogVisible = false" />
      <PrimeButton label="提交交接" icon="pi pi-send" :disabled="execution.actionLoading" @click="submit" />
    </template>
  </PrimeDialog>
</template>
