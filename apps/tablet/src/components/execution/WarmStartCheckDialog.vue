<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useExecutionStore } from '@/stores/execution-store'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()

const execution = useExecutionStore()
const allowWarningStart = ref(false)

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

watch(dialogVisible, (visible) => {
  if (visible) {
    allowWarningStart.value = false
    void execution.prepareStart()
  }
})

async function start() {
  await execution.startPlan(allowWarningStart.value)
  dialogVisible.value = false
}
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="开工前检查" class="w-[760px]">
    <div class="grid max-h-[70vh] gap-4 overflow-auto pr-1">
      <PrimeProgressBar v-if="execution.actionLoading" mode="indeterminate" />
      <section class="grid grid-cols-2 gap-3">
        <div class="rounded-2xl bg-[#fff4dc] p-4">
          <p class="text-sm font-black text-[#7b5129]">资料检查</p>
          <strong class="text-3xl text-[#342316]">{{ execution.startPreparation?.readiness.score ?? '-' }}</strong>
          <p class="text-sm font-bold text-[#76512a]">{{ execution.startPreparation?.readiness.summary }}</p>
        </div>
        <div class="rounded-2xl bg-[#fff4dc] p-4">
          <p class="text-sm font-black text-[#7b5129]">知识验证</p>
          <strong class="text-3xl text-[#342316]">{{ execution.startPreparation?.knowledgeValidation.score ?? '-' }}</strong>
          <p class="text-sm font-bold text-[#76512a]">{{ execution.startPreparation?.knowledgeValidation.summary }}</p>
        </div>
      </section>

      <PrimeMessage v-if="execution.startPreparation?.blockers.length" severity="error" :closable="false">
        阻塞项：{{ execution.startPreparation.blockers.join('；') }}
      </PrimeMessage>
      <PrimeMessage v-if="execution.startPreparation?.warnings.length" severity="warn" :closable="false">
        提醒项：{{ execution.startPreparation.warnings.join('；') }}
      </PrimeMessage>
      <PrimeMessage v-if="execution.startPreparation && !execution.startPreparation.blockers.length && !execution.startPreparation.warnings.length" severity="success" :closable="false">
        开工检查通过，可执行组长开工确认。
      </PrimeMessage>

      <div v-if="execution.canStartWithWarning" class="rounded-2xl border border-[#d9772b55] bg-white/70 p-4">
        <label class="flex items-center gap-3 font-bold text-[#342316]">
          <PrimeCheckbox v-model="allowWarningStart" binary />
          我已知晓待复核项，允许带提醒开工
        </label>
      </div>
    </div>

    <template #footer>
      <PrimeButton severity="secondary" label="取消" @click="dialogVisible = false" />
      <PrimeButton
        label="确认开工"
        icon="pi pi-play"
        :disabled="execution.hasBlocker || (execution.canStartWithWarning && !allowWarningStart) || execution.actionLoading"
        @click="start"
      />
    </template>
  </PrimeDialog>
</template>
