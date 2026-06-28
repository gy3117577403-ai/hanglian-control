import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { toast } from 'vue-sonner'
import {
  completePlan,
  createShiftHandover,
  exceptionHoldPlan,
  getDailyReport,
  getDailyReportText,
  getExecutionPlanDetail,
  getExecutionPlans,
  getExecutionSummary,
  getExecutionTimeline,
  getShiftHandover,
  pausePlan as pausePlanApi,
  preparePlanStart,
  processConfirm as processConfirmApi,
  reportQuantity as reportQuantityApi,
  resumePlan as resumePlanApi,
  startPlanExecution,
} from '@/services/api'
import { useAuthStore } from '@/stores/auth-store'
import { useProductionStore } from '@/stores/production-store'
import type {
  CompletePlanPayload,
  DailyReport,
  ExecutionPlanDetail,
  ExecutionPlanListItem,
  ExecutionReasonPayload,
  ExecutionStatus,
  ExecutionSummary,
  ExecutionTimelineItem,
  ProcessConfirmationPayload,
  QuantityReportPayload,
  ShiftHandoverPayload,
  ShiftHandoverRecord,
  StartPreparationResult,
} from '@/types/production'

function friendlyError(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return '现场执行接口暂时不可用，请确认后端 Mock API 已启动。'
}

export const executionStatusLabels: Record<ExecutionStatus, string> = {
  not_started: '未开工',
  ready_to_start: '待开工',
  running: '生产中',
  paused: '已暂停',
  exception_hold: '异常停线',
  completed: '已完工',
  cancelled: '已取消',
}

export function executionSeverity(status?: ExecutionStatus) {
  if (status === 'running' || status === 'completed') return 'success'
  if (status === 'paused' || status === 'ready_to_start') return 'warn'
  if (status === 'exception_hold' || status === 'cancelled') return 'danger'
  return 'secondary'
}

export const useExecutionStore = defineStore('execution', () => {
  const auth = useAuthStore()
  const production = useProductionStore()
  const summary = ref<ExecutionSummary | null>(null)
  const executionPlans = ref<ExecutionPlanListItem[]>([])
  const selectedExecutionDetail = ref<ExecutionPlanDetail | null>(null)
  const timeline = ref<ExecutionTimelineItem[]>([])
  const dailyReport = ref<DailyReport | null>(null)
  const dailyReportText = ref('')
  const handoverRecords = ref<ShiftHandoverRecord[]>([])
  const startPreparation = ref<StartPreparationResult | null>(null)
  const loading = ref(false)
  const actionLoading = ref(false)
  const selectedExecutionStatus = ref<ExecutionStatus>('not_started')
  const errorMessage = ref('')

  const selectedPlanId = computed(() => production.selectedPlan.id)
  const selectedStatusLabel = computed(() => executionStatusLabels[selectedExecutionStatus.value])
  const canStartWithWarning = computed(() => Boolean(startPreparation.value?.allowWarningStart))
  const hasBlocker = computed(() => Boolean(startPreparation.value?.blockers.length))

  function operatorPayload() {
    return {
      operatorId: auth.currentUser?.userId ?? 'mock-front-leader',
      operatorName: auth.currentUser?.name ?? '组长演示账号',
      operatorRole: auth.currentUser?.roleLabel ?? '前段组长',
    }
  }

  function applyDetail(detail: ExecutionPlanDetail) {
    selectedExecutionDetail.value = detail
    selectedExecutionStatus.value = detail.executionStatus
    timeline.value = detail.timeline
    const index = executionPlans.value.findIndex((item) => item.id === detail.id)
    if (index >= 0) executionPlans.value[index] = detail
  }

  async function loadSummary() {
    summary.value = await getExecutionSummary()
    return summary.value
  }

  async function loadExecutionPlans(query: { scope?: 'today' | 'week' | 'all'; status?: string; keyword?: string } = {}) {
    executionPlans.value = await getExecutionPlans({ scope: production.scope, ...query })
    return executionPlans.value
  }

  async function loadPlanExecutionDetail(planId = selectedPlanId.value) {
    loading.value = true
    errorMessage.value = ''
    try {
      const detail = await getExecutionPlanDetail(planId)
      applyDetail(detail)
      return detail
    } catch (error) {
      errorMessage.value = friendlyError(error)
      toast.error('现场执行详情加载失败', { description: errorMessage.value })
      return null
    } finally {
      loading.value = false
    }
  }

  async function prepareStart(planId = selectedPlanId.value) {
    actionLoading.value = true
    try {
      startPreparation.value = await preparePlanStart(planId)
      selectedExecutionStatus.value = startPreparation.value.preparedStatus
      if (startPreparation.value.blockers.length) {
        toast.error('开工检查存在阻塞项', { description: startPreparation.value.blockers[0] })
      } else if (startPreparation.value.warnings.length) {
        toast.warning('开工检查存在提醒项', { description: '可勾选允许带提醒开工。' })
      } else {
        toast.success('开工检查通过')
      }
      await loadPlanExecutionDetail(planId)
      return startPreparation.value
    } catch (error) {
      errorMessage.value = friendlyError(error)
      toast.error('开工检查失败', { description: errorMessage.value })
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  async function startPlan(allowWarningStart = false, remark = '开工确认') {
    actionLoading.value = true
    try {
      const detail = await startPlanExecution(selectedPlanId.value, {
        ...operatorPayload(),
        allowWarningStart,
        remark,
      })
      applyDetail(detail)
      await refreshAfterAction()
      toast.success('开工确认完成')
      return detail
    } catch (error) {
      errorMessage.value = friendlyError(error)
      toast.error('开工确认失败', { description: errorMessage.value })
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  async function processConfirm(payload: Omit<ProcessConfirmationPayload, 'operatorId' | 'operatorName' | 'operatorRole'>) {
    actionLoading.value = true
    try {
      const result = await processConfirmApi(selectedPlanId.value, { ...payload, ...operatorPayload() })
      await loadPlanExecutionDetail()
      toast.success('过程确认已记录')
      return result
    } catch (error) {
      errorMessage.value = friendlyError(error)
      toast.error('过程确认失败', { description: errorMessage.value })
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  async function reportQuantity(payload: Omit<QuantityReportPayload, 'operatorId' | 'operatorName' | 'operatorRole'>) {
    actionLoading.value = true
    try {
      const result = await reportQuantityApi(selectedPlanId.value, { ...payload, ...operatorPayload() })
      await refreshAfterAction()
      if (result.warning) toast.warning('报工已记录，请复核数量', { description: result.warning })
      else toast.success('数量报工已记录')
      return result
    } catch (error) {
      errorMessage.value = friendlyError(error)
      toast.error('数量报工失败', { description: errorMessage.value })
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  async function pausePlan(reason = '现场暂停') {
    return transitionAction(() => callPausePlan({ reason }), '暂停生产已记录', '暂停生产失败')
  }

  async function resumePlan(reason = '恢复生产') {
    return transitionAction(() => callResumePlan({ reason }), '恢复生产已记录', '恢复生产失败')
  }

  async function exceptionHold(reason = '异常影响生产', feedbackId?: string) {
    return transitionAction(() => exceptionHoldApi({ reason, feedbackId }), '异常停线已记录', '异常停线失败')
  }

  async function completePlanAction(payload: Omit<CompletePlanPayload, 'operatorId' | 'operatorName' | 'operatorRole'>) {
    actionLoading.value = true
    try {
      const detail = await completePlan(selectedPlanId.value, { ...payload, ...operatorPayload() })
      applyDetail(detail)
      await refreshAfterAction()
      toast.success('完工确认已记录')
      return detail
    } catch (error) {
      errorMessage.value = friendlyError(error)
      toast.error('完工确认失败', { description: errorMessage.value })
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  async function loadTimeline(planId = selectedPlanId.value) {
    timeline.value = await getExecutionTimeline(planId)
    return timeline.value
  }

  async function createHandover(payload: Omit<ShiftHandoverPayload, 'operatorId' | 'operatorName' | 'operatorRole'>) {
    actionLoading.value = true
    try {
      const result = await createShiftHandover({ ...payload, ...operatorPayload() })
      handoverRecords.value = [result, ...handoverRecords.value]
      await loadPlanExecutionDetail()
      toast.success('班组交接已记录')
      return result
    } catch (error) {
      errorMessage.value = friendlyError(error)
      toast.error('班组交接失败', { description: errorMessage.value })
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  async function loadHandover(planId = selectedPlanId.value) {
    handoverRecords.value = await getShiftHandover({ planId })
    return handoverRecords.value
  }

  async function loadDailyReport(query: { date?: string; team?: string; processSegment?: string } = {}) {
    dailyReport.value = await getDailyReport(query)
    dailyReportText.value = await getDailyReportText(query)
    return dailyReport.value
  }

  async function refreshAfterAction() {
    await Promise.all([
      loadSummary().catch(() => undefined),
      loadExecutionPlans().catch(() => undefined),
      loadPlanExecutionDetail().catch(() => undefined),
      production.selectPlan(production.selectedPlan.id, false).catch(() => undefined),
    ])
  }

  async function transitionAction(
    action: () => Promise<ExecutionPlanDetail>,
    successMessage: string,
    failureMessage: string,
  ) {
    actionLoading.value = true
    try {
      const detail = await action()
      applyDetail(detail)
      await refreshAfterAction()
      toast.success(successMessage)
      return detail
    } catch (error) {
      errorMessage.value = friendlyError(error)
      toast.error(failureMessage, { description: errorMessage.value })
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  function callPausePlan(payload: ExecutionReasonPayload) {
    return pausePlanApi(selectedPlanId.value, { ...payload, ...operatorPayload() })
  }

  function callResumePlan(payload: ExecutionReasonPayload) {
    return resumePlanApi(selectedPlanId.value, { ...payload, ...operatorPayload() })
  }

  function exceptionHoldApi(payload: ExecutionReasonPayload) {
    return exceptionHoldPlan(selectedPlanId.value, { ...payload, ...operatorPayload() })
  }

  return {
    summary,
    executionPlans,
    selectedExecutionDetail,
    timeline,
    dailyReport,
    dailyReportText,
    handoverRecords,
    startPreparation,
    loading,
    actionLoading,
    selectedExecutionStatus,
    selectedStatusLabel,
    canStartWithWarning,
    hasBlocker,
    errorMessage,
    loadSummary,
    loadExecutionPlans,
    loadPlanExecutionDetail,
    prepareStart,
    startPlan,
    processConfirm,
    reportQuantity,
    pausePlan,
    resumePlan,
    exceptionHold,
    completePlan: completePlanAction,
    loadTimeline,
    createHandover,
    loadHandover,
    loadDailyReport,
  }
})
