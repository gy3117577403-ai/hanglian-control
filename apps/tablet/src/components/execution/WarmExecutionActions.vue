<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, ClipboardCheck, FileText, Handshake, Pause, Play, RotateCcw, SquareCheckBig, TimerReset } from 'lucide-vue-next'
import { PERMISSIONS } from '@/lib/permissions'
import { useAuthStore } from '@/stores/auth-store'
import { useExecutionStore } from '@/stores/execution-store'

const emit = defineEmits<{
  'open-start': []
  'open-quantity': []
  'open-process': []
  'open-handover': []
  'open-daily-report': []
  'open-complete': []
}>()

const auth = useAuthStore()
const execution = useExecutionStore()

const status = computed(() => execution.selectedExecutionStatus)
const canStart = computed(() => auth.hasPermission(PERMISSIONS.EXECUTION_START))
const canPause = computed(() => auth.hasPermission(PERMISSIONS.EXECUTION_PAUSE))
const canResume = computed(() => auth.hasPermission(PERMISSIONS.EXECUTION_RESUME))
const canException = computed(() => auth.hasPermission(PERMISSIONS.EXECUTION_EXCEPTION_HOLD))
const canComplete = computed(() => auth.hasPermission(PERMISSIONS.EXECUTION_COMPLETE))
const canQuantity = computed(() => auth.hasPermission(PERMISSIONS.EXECUTION_QUANTITY_REPORT))
const canProcess = computed(() => auth.hasPermission(PERMISSIONS.EXECUTION_PROCESS_CONFIRM))
const canHandover = computed(() => auth.hasPermission(PERMISSIONS.EXECUTION_HANDOVER))
const canDailyReport = computed(() => auth.hasPermission(PERMISSIONS.EXECUTION_DAILY_REPORT_VIEW))

const actions = computed(() => [
  { key: 'start', label: '开工确认', icon: Play, disabled: !canStart.value || ['running', 'completed', 'exception_hold'].includes(status.value), command: () => emit('open-start') },
  { key: 'process', label: '过程确认', icon: ClipboardCheck, disabled: !canProcess.value || !['running', 'paused', 'exception_hold'].includes(status.value), command: () => emit('open-process') },
  { key: 'quantity', label: '数量报工', icon: FileText, disabled: !canQuantity.value || status.value !== 'running', command: () => emit('open-quantity') },
  { key: 'pause', label: '暂停生产', icon: Pause, disabled: !canPause.value || status.value !== 'running', command: () => execution.pausePlan('现场暂停') },
  { key: 'resume', label: '恢复生产', icon: RotateCcw, disabled: !canResume.value || !['paused', 'exception_hold'].includes(status.value), command: () => execution.resumePlan('问题处理完成，恢复生产') },
  { key: 'exception', label: '异常停线', icon: AlertTriangle, disabled: !canException.value || !['running', 'paused'].includes(status.value), command: () => execution.exceptionHold('异常影响生产') },
  { key: 'complete', label: '完工确认', icon: SquareCheckBig, disabled: !canComplete.value || status.value !== 'running', command: () => emit('open-complete') },
  { key: 'handover', label: '班组交接', icon: Handshake, disabled: !canHandover.value, command: () => emit('open-handover') },
  { key: 'daily', label: '现场日报', icon: TimerReset, disabled: !canDailyReport.value, command: () => emit('open-daily-report') },
])
</script>

<template>
  <section class="section-bay warm-enter">
    <div class="section-title">
      <div>
        <p class="section-kicker">FIELD EXECUTION ACTIONS</p>
        <h3 class="text-xl font-black">组长执行操作</h3>
      </div>
      <PrimeTag value="Mock metadata" severity="secondary" />
    </div>

    <div class="mt-3 grid grid-cols-3 gap-2">
      <PrimeButton
        v-for="action in actions"
        :key="action.key"
        :label="action.label"
        :disabled="action.disabled || execution.actionLoading"
        severity="secondary"
        class="justify-start"
        @click="action.command"
      >
        <template #icon>
          <component :is="action.icon" :size="18" />
        </template>
      </PrimeButton>
    </div>
  </section>
</template>
