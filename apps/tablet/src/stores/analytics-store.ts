import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { toast } from 'vue-sonner'
import {
  getAnalyticsDocuments,
  getAnalyticsExceptions,
  getAnalyticsKnowledge,
  getAnalyticsOverview,
  getAnalyticsProduction,
  getAnalyticsQuantity,
  getAnalyticsRankings,
  getAnalyticsSummaryText,
  getAnalyticsTrends,
} from '@/services/api'
import type {
  AnalyticsDocuments,
  AnalyticsExceptions,
  AnalyticsKnowledge,
  AnalyticsOverview,
  AnalyticsProcessSegment,
  AnalyticsProduction,
  AnalyticsQuantity,
  AnalyticsQuery,
  AnalyticsRange,
  AnalyticsRankings,
  AnalyticsTrends,
} from '@/types/production'

function friendlyError(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return '现场统计接口暂时不可用，请确认后端 Mock API 已启动。'
}

export const useAnalyticsStore = defineStore('analytics', () => {
  const filters = reactive<Required<Pick<AnalyticsQuery, 'range' | 'processSegment'>> & AnalyticsQuery>({
    range: 'today',
    processSegment: 'all',
  })
  const overview = ref<AnalyticsOverview | null>(null)
  const production = ref<AnalyticsProduction | null>(null)
  const quantity = ref<AnalyticsQuantity | null>(null)
  const exceptions = ref<AnalyticsExceptions | null>(null)
  const documents = ref<AnalyticsDocuments | null>(null)
  const knowledge = ref<AnalyticsKnowledge | null>(null)
  const trends = ref<AnalyticsTrends | null>(null)
  const rankings = ref<AnalyticsRankings | null>(null)
  const summaryText = ref('')
  const loading = ref(false)
  const errorMessage = ref('')

  function query(): AnalyticsQuery {
    return {
      range: filters.range,
      processSegment: filters.processSegment,
      team: filters.team,
      customerId: filters.customerId,
      productId: filters.productId,
      role: filters.role,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    }
  }

  function updateFilters(next: Partial<AnalyticsQuery>) {
    Object.assign(filters, next)
    if (!filters.range) filters.range = 'today'
    if (!filters.processSegment) filters.processSegment = 'all'
  }

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
    overview.value = await guarded(() => getAnalyticsOverview(query()), '加载现场总览')
    return overview.value
  }

  async function loadProduction() {
    production.value = await guarded(() => getAnalyticsProduction(query()), '加载生产执行统计')
    return production.value
  }

  async function loadQuantity() {
    quantity.value = await guarded(() => getAnalyticsQuantity(query()), '加载数量质量统计')
    return quantity.value
  }

  async function loadExceptions() {
    exceptions.value = await guarded(() => getAnalyticsExceptions(query()), '加载异常趋势')
    return exceptions.value
  }

  async function loadDocuments() {
    documents.value = await guarded(() => getAnalyticsDocuments(query()), '加载资料问题统计')
    return documents.value
  }

  async function loadKnowledge() {
    knowledge.value = await guarded(() => getAnalyticsKnowledge(query()), '加载知识库统计')
    return knowledge.value
  }

  async function loadTrends() {
    trends.value = await guarded(() => getAnalyticsTrends(query()), '加载趋势数据')
    return trends.value
  }

  async function loadRankings() {
    rankings.value = await guarded(() => getAnalyticsRankings(query()), '加载排行数据')
    return rankings.value
  }

  async function loadAll() {
    loading.value = true
    errorMessage.value = ''
    try {
      const currentQuery = query()
      const [
        overviewResult,
        productionResult,
        quantityResult,
        exceptionsResult,
        documentsResult,
        knowledgeResult,
        trendsResult,
        rankingsResult,
      ] = await Promise.all([
        getAnalyticsOverview(currentQuery),
        getAnalyticsProduction(currentQuery),
        getAnalyticsQuantity(currentQuery),
        getAnalyticsExceptions(currentQuery),
        getAnalyticsDocuments(currentQuery),
        getAnalyticsKnowledge(currentQuery),
        getAnalyticsTrends(currentQuery),
        getAnalyticsRankings(currentQuery),
      ])
      overview.value = overviewResult
      production.value = productionResult
      quantity.value = quantityResult
      exceptions.value = exceptionsResult
      documents.value = documentsResult
      knowledge.value = knowledgeResult
      trends.value = trendsResult
      rankings.value = rankingsResult
    } catch (error) {
      errorMessage.value = friendlyError(error)
      toast.error('现场统计加载失败', { description: errorMessage.value })
    } finally {
      loading.value = false
    }
  }

  async function copySummaryText() {
    summaryText.value = await guarded(() => getAnalyticsSummaryText(query()), '生成统计摘要')
    try {
      await navigator.clipboard?.writeText(summaryText.value)
      toast.success('统计摘要已复制')
    } catch {
      toast.warning('浏览器未允许自动复制，可在文本框中手动复制')
    }
    return summaryText.value
  }

  return {
    filters,
    overview,
    production,
    quantity,
    exceptions,
    documents,
    knowledge,
    trends,
    rankings,
    summaryText,
    loading,
    errorMessage,
    updateFilters,
    loadOverview,
    loadProduction,
    loadQuantity,
    loadExceptions,
    loadDocuments,
    loadKnowledge,
    loadTrends,
    loadRankings,
    loadAll,
    copySummaryText,
  }
})

export const analyticsRangeOptions: Array<{ label: string; value: AnalyticsRange }> = [
  { label: '今日', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '全部', value: 'all' },
]

export const analyticsProcessOptions: Array<{ label: string; value: AnalyticsProcessSegment }> = [
  { label: '全部', value: 'all' },
  { label: '前段', value: 'front' },
  { label: '后段', value: 'back' },
  { label: '通用', value: 'common' },
]
