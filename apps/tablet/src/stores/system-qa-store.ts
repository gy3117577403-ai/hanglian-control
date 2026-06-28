import { ref } from 'vue'
import { defineStore } from 'pinia'
import { toast } from 'vue-sonner'
import {
  getSystemQaAcceptanceReport,
  getSystemQaAcceptanceReportText,
  getSystemQaBusinessFlow,
  getSystemQaDataConsistency,
  getSystemQaDemoReadiness,
  getSystemQaOverview,
  getSystemQaPermissionRegression,
} from '@/services/api'
import type {
  SystemQaAcceptanceReport,
  SystemQaListReport,
  SystemQaOverview,
  SystemQaPermissionRegression,
} from '@/types/production'

function friendlyError(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return '全流程总验收接口暂时不可用，请确认后端 Mock API 已启动。'
}

export const useSystemQaStore = defineStore('system-qa', () => {
  const overview = ref<SystemQaOverview | null>(null)
  const dataConsistency = ref<SystemQaListReport | null>(null)
  const businessFlow = ref<SystemQaListReport | null>(null)
  const permissionRegression = ref<SystemQaPermissionRegression | null>(null)
  const demoReadiness = ref<SystemQaListReport | null>(null)
  const acceptanceReport = ref<SystemQaAcceptanceReport | null>(null)
  const acceptanceReportText = ref('')
  const loading = ref(false)
  const activeTab = ref('overview')
  const errorMessage = ref('')

  async function guarded<T>(action: () => Promise<T>, label: string) {
    loading.value = true
    errorMessage.value = ''
    try {
      return await action()
    } catch (error) {
      errorMessage.value = friendlyError(error)
      toast.error(`${label}失败`, { description: errorMessage.value })
      throw error
    } finally {
      loading.value = false
    }
  }

  async function loadOverview() {
    overview.value = await guarded(getSystemQaOverview, '加载总览')
    return overview.value
  }

  async function loadDataConsistency() {
    dataConsistency.value = await guarded(getSystemQaDataConsistency, '加载数据一致性')
    return dataConsistency.value
  }

  async function loadBusinessFlow() {
    businessFlow.value = await guarded(getSystemQaBusinessFlow, '加载业务链路')
    return businessFlow.value
  }

  async function loadPermissionRegression() {
    permissionRegression.value = await guarded(getSystemQaPermissionRegression, '加载权限回归')
    return permissionRegression.value
  }

  async function loadDemoReadiness() {
    demoReadiness.value = await guarded(getSystemQaDemoReadiness, '加载演示准备')
    return demoReadiness.value
  }

  async function loadAcceptanceReport() {
    acceptanceReport.value = await guarded(getSystemQaAcceptanceReport, '加载验收报告')
    return acceptanceReport.value
  }

  async function loadAll() {
    loading.value = true
    errorMessage.value = ''
    try {
      const [overviewResult, consistencyResult, businessResult, permissionResult, readinessResult, reportResult] = await Promise.all([
        getSystemQaOverview(),
        getSystemQaDataConsistency(),
        getSystemQaBusinessFlow(),
        getSystemQaPermissionRegression(),
        getSystemQaDemoReadiness(),
        getSystemQaAcceptanceReport(),
      ])
      overview.value = overviewResult
      dataConsistency.value = consistencyResult
      businessFlow.value = businessResult
      permissionRegression.value = permissionResult
      demoReadiness.value = readinessResult
      acceptanceReport.value = reportResult
    } catch (error) {
      errorMessage.value = friendlyError(error)
      toast.error('全流程总验收加载失败', { description: errorMessage.value })
    } finally {
      loading.value = false
    }
  }

  async function copyAcceptanceReportText() {
    acceptanceReportText.value = await guarded(getSystemQaAcceptanceReportText, '生成验收报告')
    try {
      await navigator.clipboard?.writeText(acceptanceReportText.value)
      toast.success('验收报告已复制')
    } catch {
      toast.warning('浏览器未允许自动复制，可在文本框中手动复制')
    }
    return acceptanceReportText.value
  }

  return {
    overview,
    dataConsistency,
    businessFlow,
    permissionRegression,
    demoReadiness,
    acceptanceReport,
    acceptanceReportText,
    loading,
    activeTab,
    errorMessage,
    loadOverview,
    loadDataConsistency,
    loadBusinessFlow,
    loadPermissionRegression,
    loadDemoReadiness,
    loadAcceptanceReport,
    loadAll,
    copyAcceptanceReportText,
  }
})
