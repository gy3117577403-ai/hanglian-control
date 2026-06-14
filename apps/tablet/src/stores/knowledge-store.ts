import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { toast } from 'vue-sonner'
import {
  createAbnormalCase,
  createFixture,
  createQualityStandard,
  getAbnormalCases,
  getFixtures,
  getKnowledgeHistory,
  getPlanKnowledgeSummary,
  getProductKnowledgeSummary,
  getQualityStandards,
  searchKnowledge,
  updateAbnormalCase,
  updateAbnormalStatus,
  updateFixture,
  updateFixtureStatus,
  updateQualityStandard,
  updateQualityStatus,
  type KnowledgeQuery,
} from '@/services/api'
import type {
  AbnormalCaseKnowledge,
  AbnormalStatus,
  FixtureKnowledge,
  KnowledgeProcessSegment,
  KnowledgeRecord,
  KnowledgeSearchResult,
  KnowledgeStatus,
  KnowledgeSummary,
  QualityStandardKnowledge,
  QualityStatus,
} from '@/types/production'

function friendlyError(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return '现场知识库接口暂时不可用，请确认后端 Mock API 已启动。'
}

export const useKnowledgeStore = defineStore('knowledge', () => {
  const fixtures = ref<FixtureKnowledge[]>([])
  const abnormalCases = ref<AbnormalCaseKnowledge[]>([])
  const qualityStandards = ref<QualityStandardKnowledge[]>([])
  const summary = ref<KnowledgeSummary | null>(null)
  const history = ref<KnowledgeRecord[]>([])
  const searchResults = ref<KnowledgeSearchResult[]>([])
  const keyword = ref('')
  const activeTab = ref<'fixtures' | 'abnormal' | 'quality' | 'history'>('fixtures')
  const loading = ref(false)
  const saving = ref(false)
  const errorMessage = ref('')

  const totalCount = computed(() => fixtures.value.length + abnormalCases.value.length + qualityStandards.value.length)
  const hasRisk = computed(() =>
    fixtures.value.some((item) => item.status === 'pending_review' || item.status === 'abnormal')
    || abnormalCases.value.some((item) => item.status !== 'closed' && ['high', 'critical'].includes(item.severity))
    || qualityStandards.value.some((item) => item.status !== 'effective' || item.defectLevel === 'critical'),
  )

  function query(extra: KnowledgeQuery = {}): KnowledgeQuery {
    return {
      keyword: keyword.value || undefined,
      ...extra,
    }
  }

  async function loadSummaryForPlan(planId: string, processSegment?: KnowledgeProcessSegment) {
    loading.value = true
    errorMessage.value = ''
    try {
      summary.value = await getPlanKnowledgeSummary(planId, processSegment)
      fixtures.value = summary.value.fixtures
      abnormalCases.value = summary.value.abnormalCases
      qualityStandards.value = summary.value.qualityStandards
    } catch (error) {
      errorMessage.value = friendlyError(error)
      toast.error('现场知识加载失败', { description: errorMessage.value })
    } finally {
      loading.value = false
    }
  }

  async function loadSummaryForProduct(productId: string, processSegment?: KnowledgeProcessSegment) {
    loading.value = true
    errorMessage.value = ''
    try {
      summary.value = await getProductKnowledgeSummary(productId, processSegment)
      fixtures.value = summary.value.fixtures
      abnormalCases.value = summary.value.abnormalCases
      qualityStandards.value = summary.value.qualityStandards
    } catch (error) {
      errorMessage.value = friendlyError(error)
    } finally {
      loading.value = false
    }
  }

  async function loadFixtures(extra: KnowledgeQuery = {}) {
    fixtures.value = await getFixtures(query(extra))
  }

  async function loadAbnormalCases(extra: KnowledgeQuery = {}) {
    abnormalCases.value = await getAbnormalCases(query(extra))
  }

  async function loadQualityStandards(extra: KnowledgeQuery = {}) {
    qualityStandards.value = await getQualityStandards(query(extra))
  }

  async function loadHistory(extra: { entityType?: string; entityId?: string; keyword?: string; limit?: string | number } = {}) {
    history.value = await getKnowledgeHistory({ keyword: keyword.value || undefined, limit: 120, ...extra })
  }

  async function loadAll(extra: KnowledgeQuery = {}) {
    loading.value = true
    errorMessage.value = ''
    try {
      await Promise.all([
        loadFixtures(extra),
        loadAbnormalCases(extra),
        loadQualityStandards(extra),
        loadHistory(),
      ])
    } catch (error) {
      errorMessage.value = friendlyError(error)
      toast.error('知识库加载失败', { description: errorMessage.value })
    } finally {
      loading.value = false
    }
  }

  async function search(q = keyword.value, planId?: string, productId?: string) {
    const value = q.trim()
    keyword.value = value
    if (!value) {
      searchResults.value = []
      return []
    }
    loading.value = true
    try {
      searchResults.value = await searchKnowledge(value, planId, productId)
      return searchResults.value
    } catch (error) {
      errorMessage.value = friendlyError(error)
      toast.error('知识库搜索失败', { description: errorMessage.value })
      return []
    } finally {
      loading.value = false
    }
  }

  async function createRecord(type: 'fixture' | 'abnormal_case' | 'quality_standard', payload: Record<string, unknown>) {
    saving.value = true
    try {
      if (type === 'fixture') await createFixture(payload as Partial<FixtureKnowledge>)
      if (type === 'abnormal_case') await createAbnormalCase(payload as Partial<AbnormalCaseKnowledge>)
      if (type === 'quality_standard') await createQualityStandard(payload as Partial<QualityStandardKnowledge>)
      await loadAll()
      toast.success('知识库记录已新增', { description: '已写入本地 Mock metadata，不连接数据库。' })
    } catch (error) {
      errorMessage.value = friendlyError(error)
      toast.error('新增知识库记录失败', { description: errorMessage.value })
      throw error
    } finally {
      saving.value = false
    }
  }

  async function updateRecord(type: 'fixture' | 'abnormal_case' | 'quality_standard', id: string, payload: Record<string, unknown>) {
    saving.value = true
    try {
      if (type === 'fixture') await updateFixture(id, payload as Partial<FixtureKnowledge>)
      if (type === 'abnormal_case') await updateAbnormalCase(id, payload as Partial<AbnormalCaseKnowledge>)
      if (type === 'quality_standard') await updateQualityStandard(id, payload as Partial<QualityStandardKnowledge>)
      await loadAll()
      toast.success('知识库记录已维护')
    } catch (error) {
      errorMessage.value = friendlyError(error)
      toast.error('维护知识库记录失败', { description: errorMessage.value })
      throw error
    } finally {
      saving.value = false
    }
  }

  async function updateStatus(type: 'fixture' | 'abnormal_case' | 'quality_standard', id: string, status: string, reason = 'V2.3 知识库状态维护') {
    saving.value = true
    try {
      if (type === 'fixture') await updateFixtureStatus(id, status as KnowledgeStatus, reason)
      if (type === 'abnormal_case') await updateAbnormalStatus(id, status as AbnormalStatus, reason)
      if (type === 'quality_standard') await updateQualityStatus(id, status as QualityStatus, reason)
      await loadAll()
      toast.success('知识库状态已更新')
    } catch (error) {
      errorMessage.value = friendlyError(error)
      toast.error('更新知识库状态失败', { description: errorMessage.value })
      throw error
    } finally {
      saving.value = false
    }
  }

  return {
    fixtures,
    abnormalCases,
    qualityStandards,
    summary,
    history,
    searchResults,
    keyword,
    activeTab,
    loading,
    saving,
    errorMessage,
    totalCount,
    hasRisk,
    loadSummaryForPlan,
    loadSummaryForProduct,
    loadFixtures,
    loadAbnormalCases,
    loadQualityStandards,
    loadHistory,
    loadAll,
    search,
    createRecord,
    updateRecord,
    updateStatus,
  }
})

