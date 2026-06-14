import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { toast } from 'vue-sonner'
import {
  bulkUpdateMaintenanceStatus,
  getMaintenanceBackPackages,
  getMaintenanceCustomers,
  getMaintenanceDocuments,
  getMaintenanceFrontParameters,
  getMaintenanceHistory,
  getMaintenanceProductionPlans,
  getMaintenanceProducts,
  getMaintenanceReviewQueue,
  getMaintenanceSummary,
  resolveMaintenanceReviewItem,
  setMaintenanceDocumentEffective,
  updateMaintenanceBackPackage,
  updateMaintenanceCustomer,
  updateMaintenanceDocument,
  updateMaintenanceFrontParameter,
  updateMaintenanceProduct,
  updateMaintenanceProductionPlan,
} from '@/services/api'
import type {
  MaintenanceBackPackage,
  MaintenanceCustomer,
  MaintenanceDocument,
  MaintenanceEntityType,
  MaintenanceFrontParameter,
  MaintenanceProduct,
  MaintenanceProductionPlan,
  MaintenanceQuery,
  MaintenanceRecord,
  MaintenanceReviewItem,
  MaintenanceSummary,
} from '@/types/production'

type MaintenanceTab =
  | 'overview'
  | 'customers'
  | 'products'
  | 'plans'
  | 'front'
  | 'back'
  | 'documents'
  | 'review'
  | 'history'

const defaultSummary: MaintenanceSummary = {
  customers: 0,
  products: 0,
  productionPlans: 0,
  frontParameters: 0,
  backPackages: 0,
  documents: 0,
  pendingReview: 0,
  expiredDocuments: 0,
  inconsistentItems: 0,
}

function friendlyError(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return '资料维护接口暂时不可用，请确认后端 Mock API 已启动。'
}

export const useMaintenanceStore = defineStore('maintenance', () => {
  const activeTab = ref<MaintenanceTab>('overview')
  const keyword = ref('')
  const loading = ref(false)
  const saving = ref(false)
  const errorMessage = ref('')
  const summary = ref<MaintenanceSummary>({ ...defaultSummary })
  const customers = ref<MaintenanceCustomer[]>([])
  const products = ref<MaintenanceProduct[]>([])
  const productionPlans = ref<MaintenanceProductionPlan[]>([])
  const frontParameters = ref<MaintenanceFrontParameter[]>([])
  const backPackages = ref<MaintenanceBackPackage[]>([])
  const documents = ref<MaintenanceDocument[]>([])
  const reviewQueue = ref<MaintenanceReviewItem[]>([])
  const history = ref<MaintenanceRecord[]>([])

  const hasReviewRisk = computed(() => summary.value.pendingReview > 0 || summary.value.expiredDocuments > 0 || summary.value.inconsistentItems > 0)

  function query(extra: MaintenanceQuery = {}): MaintenanceQuery {
    return {
      keyword: keyword.value || undefined,
      ...extra,
    }
  }

  async function loadSummary() {
    summary.value = await getMaintenanceSummary()
  }

  async function loadCustomers() {
    customers.value = await getMaintenanceCustomers(query())
  }

  async function loadProducts() {
    products.value = await getMaintenanceProducts(query())
  }

  async function loadProductionPlans() {
    productionPlans.value = await getMaintenanceProductionPlans(query({ scope: 'week' }))
  }

  async function loadFrontParameters() {
    frontParameters.value = await getMaintenanceFrontParameters(query())
  }

  async function loadBackPackages() {
    backPackages.value = await getMaintenanceBackPackages(query())
  }

  async function loadDocuments() {
    documents.value = await getMaintenanceDocuments(query())
  }

  async function loadReviewQueue() {
    reviewQueue.value = await getMaintenanceReviewQueue(query())
  }

  async function loadHistory() {
    history.value = await getMaintenanceHistory(query({ limit: 120 }))
  }

  async function loadTab(tab = activeTab.value) {
    activeTab.value = tab
    loading.value = true
    errorMessage.value = ''
    try {
      await loadSummary()
      if (tab === 'overview') {
        await Promise.all([loadReviewQueue(), loadHistory()])
      }
      if (tab === 'customers') await loadCustomers()
      if (tab === 'products') await loadProducts()
      if (tab === 'plans') await loadProductionPlans()
      if (tab === 'front') await loadFrontParameters()
      if (tab === 'back') await loadBackPackages()
      if (tab === 'documents') await loadDocuments()
      if (tab === 'review') await loadReviewQueue()
      if (tab === 'history') await loadHistory()
    } catch (error) {
      errorMessage.value = friendlyError(error)
      toast.error('资料维护加载失败', { description: errorMessage.value })
    } finally {
      loading.value = false
    }
  }

  async function loadAll() {
    loading.value = true
    errorMessage.value = ''
    try {
      await Promise.all([
        loadSummary(),
        loadCustomers(),
        loadProducts(),
        loadProductionPlans(),
        loadFrontParameters(),
        loadBackPackages(),
        loadDocuments(),
        loadReviewQueue(),
        loadHistory(),
      ])
    } catch (error) {
      errorMessage.value = friendlyError(error)
      toast.error('资料维护中心加载失败', { description: errorMessage.value })
    } finally {
      loading.value = false
    }
  }

  async function refreshAfterChange() {
    await Promise.all([loadSummary(), loadTab(activeTab.value), loadHistory(), loadReviewQueue()])
  }

  async function updateEntity(entityType: MaintenanceEntityType, id: string, payload: Record<string, unknown>) {
    saving.value = true
    errorMessage.value = ''
    try {
      if (entityType === 'customer') await updateMaintenanceCustomer(id, payload)
      if (entityType === 'product') await updateMaintenanceProduct(id, payload)
      if (entityType === 'production_plan') await updateMaintenanceProductionPlan(id, payload)
      if (entityType === 'front_parameter') await updateMaintenanceFrontParameter(id, payload)
      if (entityType === 'back_package') await updateMaintenanceBackPackage(id, payload)
      if (entityType === 'document') await updateMaintenanceDocument(id, payload)
      await refreshAfterChange()
      toast.success('资料维护已记录', { description: '本次修改已写入本地维护历史，不连接真实数据库。' })
    } catch (error) {
      errorMessage.value = friendlyError(error)
      toast.error('资料维护失败', { description: errorMessage.value })
      throw error
    } finally {
      saving.value = false
    }
  }

  async function markDocumentEffective(id: string, reason?: string) {
    saving.value = true
    try {
      await setMaintenanceDocumentEffective(id, { reason })
      await refreshAfterChange()
      toast.success('已设为当前有效版本')
    } finally {
      saving.value = false
    }
  }

  async function bulkUpdateStatus(entityType: MaintenanceEntityType, ids: string[], status: string, reason?: string) {
    saving.value = true
    try {
      await bulkUpdateMaintenanceStatus({ entityType, ids, status, reason })
      await refreshAfterChange()
      toast.success('批量状态已更新', { description: `已处理 ${ids.length} 条资料。` })
    } finally {
      saving.value = false
    }
  }

  async function resolveReview(id: string, action: 'mark_reviewed' | 'mark_pending' | 'mark_inconsistent', remark?: string) {
    saving.value = true
    try {
      await resolveMaintenanceReviewItem(id, { action, remark })
      await refreshAfterChange()
      toast.success('复核队列已处理')
    } finally {
      saving.value = false
    }
  }

  return {
    activeTab,
    keyword,
    loading,
    saving,
    errorMessage,
    summary,
    customers,
    products,
    productionPlans,
    frontParameters,
    backPackages,
    documents,
    reviewQueue,
    history,
    hasReviewRisk,
    loadTab,
    loadAll,
    loadSummary,
    loadCustomers,
    loadProducts,
    loadProductionPlans,
    loadFrontParameters,
    loadBackPackages,
    loadDocuments,
    loadReviewQueue,
    loadHistory,
    updateEntity,
    markDocumentEffective,
    bulkUpdateStatus,
    resolveReview,
  }
})
