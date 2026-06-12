import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import dayjs from 'dayjs'
import { toast } from 'vue-sonner'
import { productionPlans } from '@/mock/production-data'
import {
  confirmProductionPlan,
  archiveDocument as archiveDocumentApi,
  compareDocuments,
  exportMigrationSeed,
  getDatabaseSafety,
  getDataSourceStatus,
  getAuditLogs,
  getDocumentFileHealth,
  getDocuments,
  getDocumentDetail,
  getDocumentVersions,
  getFeedback,
  getHealth,
  getMigrationPreview,
  getPrismaSeedPreview,
  getPlanReadiness,
  getProductionPlanDetail,
  getProductionPlans,
  searchDocuments,
  setDocumentEffective,
  submitFeedback as submitFeedbackApi,
  validateMigration,
  updateDocumentStatus as updateDocumentStatusApi,
  updateDocumentVersion as updateDocumentVersionApi,
  uploadDocument as uploadDocumentApi,
} from '@/services/api'
import type {
  ActiveProcess,
  AuditLog,
  AuditLogQuery,
  DatabaseSafetyStatus,
  DataSourceStatus,
  DocumentFileHealthResponse,
  DocumentFileHealthItem,
  DocumentCompareResult,
  DocumentTab,
  DocumentVersionsResponse,
  FeedbackRecord,
  FeedbackType,
  MigrationPreview,
  MigrationValidation,
  PlanReadiness,
  PlanScope,
  PrismaSeedPreview,
  ProductDocument,
  ProductionPlan,
  QueryRecord,
  SearchHit,
  SetEffectiveDocumentPayload,
  UpdateDocumentStatusPayload,
  UpdateDocumentVersionPayload,
} from '@/types/production'

const STORAGE_KEYS = {
  scope: 'hanglian.scope',
  selectedPlanId: 'hanglian.selectedPlanId',
  activeProcess: 'hanglian.activeProcess',
  queryLogs: 'hanglian.queryLogs',
}

const clonePlans = (): ProductionPlan[] => JSON.parse(JSON.stringify(productionPlans))

function readStorage(key: string) {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(key)
}

function writeStorage(key: string, value: string) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(key, value)
}

function normalizePlan(plan: ProductionPlan): ProductionPlan {
  return {
    ...plan,
    versionStatus: plan.versionStatus ?? {
      status: plan.front.parameterStatus === '有效' && plan.back.materialStatus === '有效' ? '有效' : '待确认',
      message: plan.front.parameterStatus === '有效' && plan.back.materialStatus === '有效'
        ? '资料版本有效，可进入组长确认。'
        : '存在待确认资料，请组长复核。',
      redLine: plan.front.parameterStatus !== '有效' || plan.back.materialStatus !== '有效',
    },
    querySuggestions: plan.querySuggestions ?? [
      plan.back.pinMap,
      plan.back.sop,
      plan.back.connectorModel,
      plan.front.terminalModel,
    ],
  }
}

function localSearch(keyword: string, source: ProductionPlan[], planId?: string): SearchHit[] {
  const value = keyword.trim().toLowerCase()
  if (!value) return []

  return source
    .filter((plan) => !planId || plan.id === planId)
    .flatMap((plan) => {
      const rows: Array<[SearchHit['type'], string, string]> = [
        ['plan', `${plan.customer} ${plan.productCode} ${plan.productName}`, '计划基础信息'],
        ['front-parameter', plan.front.wireLength, '裁线长度'],
        ['front-parameter', plan.front.strippingLength, '剥皮长度'],
        ['front-parameter', plan.front.terminalModel, '端子型号'],
        ['front-parameter', plan.front.pullForceStandard, '拉力标准'],
        ['front-parameter', plan.front.crimpHeight, '压接高度'],
        ['connector', plan.back.connectorModel, '连接器型号'],
        ['back-document', plan.back.assemblyManual, '连接器装配说明书'],
        ['back-document', plan.back.pinMap, '插接孔位图'],
        ['sop', plan.back.sop, '作业流程 SOP'],
        ['detail-image', `${plan.back.finishedImageCount} 张成品细节图`, '成品细节图'],
        ...plan.documents.map((doc) => [doc.type === 'drawing' ? 'drawing' : doc.type === 'sop' ? 'sop' : doc.type === 'finish' ? 'detail-image' : 'back-document', `${doc.title} ${doc.description}`, '文件资料'] as Array<string> as [SearchHit['type'], string, string]),
      ]

      return rows
        .filter(([, text]) => text.toLowerCase().includes(value))
        .map(([type, text, matchedField], index) => ({
          id: `LOCAL-${plan.id}-${index}`,
          planId: plan.id,
          type,
          title: type === 'plan' ? `${plan.productCode} ${plan.productName}` : text,
          subtitle: `${plan.customer} / ${plan.productCode}`,
          matchedField,
          snippet: text,
        }))
    })
    .slice(0, 20)
}

function materialToCheckStatus(status: ProductionPlan['front']['parameterStatus']): PlanReadiness['checkItems'][number]['status'] {
  if (status === '有效') return 'pass'
  if (status === '待确认') return 'warning'
  return 'fail'
}

function localReadiness(plan: ProductionPlan): PlanReadiness {
  const items: PlanReadiness['checkItems'] = []
  const addValue = (key: string, label: string, value?: string | number) => {
    const ok = value !== undefined && value !== null && String(value).trim().length > 0 && value !== 0
    items.push({
      key,
      label,
      required: true,
      status: ok ? 'pass' : 'fail',
      message: ok ? '已配置' : '缺失/异常',
    })
  }
  const addVersion = (key: string, label: string, status: ProductionPlan['front']['parameterStatus']) => {
    const checkStatus = materialToCheckStatus(status)
    items.push({
      key,
      label,
      required: true,
      status: checkStatus,
      message: checkStatus === 'pass' ? '当前有效' : checkStatus === 'warning' ? '需确认' : '已失效',
    })
  }

  if (plan.segment !== '后段') {
    addValue('front_drawing_pdf', 'PDF 图纸', plan.documents.find((doc) => doc.type === 'drawing')?.title)
    addValue('front_cut_length', '裁线长度', plan.front.wireLength)
    addValue('front_strip_length', '剥皮长度', plan.front.strippingLength)
    addValue('front_terminal', '端子型号', plan.front.terminalModel)
    addValue('front_pull_force', '拉力标准', plan.front.pullForceStandard)
    addValue('front_crimp_height', '压接高度', plan.front.crimpHeight)
    addVersion('front_parameter_status', '前段参数版本', plan.front.parameterStatus)
  }

  if (plan.segment !== '前段') {
    addValue('back_connector', '连接器型号', plan.back.connectorModel)
    addValue('back_manual', '连接器装配说明书', plan.back.assemblyManual)
    addValue('back_pin_map', '插接孔位图', plan.back.pinMap)
    addValue('back_sop', '作业流程 SOP', plan.back.sop)
    addValue('back_finished_image', '成品细节图', plan.back.finishedImageCount)
    addVersion('back_material_status', '后段资料版本', plan.back.materialStatus)
  }

  const versionAlerts: PlanReadiness['versionAlerts'] = []
  if (plan.front.parameterStatus === '待确认') versionAlerts.push({ level: 'warning', message: `前段参数 ${plan.front.drawingVersion} 待确认` })
  if (plan.back.materialStatus === '待确认') versionAlerts.push({ level: 'warning', message: `后段资料 ${plan.back.sopVersion} 待确认` })
  if (plan.front.parameterStatus === '失效') versionAlerts.push({ level: 'danger', message: `前段参数 ${plan.front.drawingVersion} 已失效` })
  if (plan.back.materialStatus === '失效') versionAlerts.push({ level: 'danger', message: `后段资料 ${plan.back.sopVersion} 已失效` })
  for (const doc of plan.documents) {
    if (doc.status === '失效') versionAlerts.push({ level: 'danger', message: `${doc.title} ${doc.version} 已失效` })
    if (doc.status === '待确认') versionAlerts.push({ level: 'warning', message: `${doc.title} ${doc.version} 待确认` })
  }

  const score = Math.round((items.reduce((total, item) => total + (item.status === 'pass' ? 1 : item.status === 'warning' ? 0.7 : 0), 0) / Math.max(items.length, 1)) * 100)
  const hasFail = items.some((item) => item.status === 'fail') || versionAlerts.some((alert) => alert.level === 'danger')
  const hasWarning = items.some((item) => item.status === 'warning') || versionAlerts.length > 0
  const readinessStatus = hasFail ? 'blocked' : hasWarning ? 'need_review' : 'ready'

  return {
    planId: plan.id,
    readinessStatus,
    score,
    summary: readinessStatus === 'ready' ? '资料完整，可开工' : readinessStatus === 'need_review' ? '资料需复核' : '资料阻塞，不建议开工',
    checkItems: items,
    versionAlerts: versionAlerts.slice(0, 8),
  }
}

function localFileHealth(plan: ProductionPlan): DocumentFileHealthResponse {
  const items: DocumentFileHealthItem[] = plan.documents.map((document) => {
    const isDemoOnly = document.source !== 'manual_upload'
    const canPreview = !isDemoOnly && Boolean(document.previewUrl || document.downloadUrl)
    const healthStatus = isDemoOnly ? 'demo' : canPreview ? 'ok' : 'broken'
    return {
      documentId: document.documentId ?? document.id,
      title: document.title,
      documentType: document.documentType ?? 'drawing_pdf',
      version: document.version,
      source: document.source ?? 'mock',
      previewType: document.previewType,
      hasStoredFile: Boolean(document.storedFileName),
      fileExists: canPreview,
      canPreview,
      isDemoOnly,
      healthStatus,
      message: healthStatus === 'demo'
        ? '当前为离线演示资料'
        : healthStatus === 'ok'
          ? '文件可预览'
          : '预览地址异常',
    }
  })

  return {
    scope: {
      planId: plan.id,
      productId: plan.productId,
    },
    summary: {
      totalDocuments: items.length,
      uploadedDocuments: items.filter((item) => item.source === 'manual_upload').length,
      mockDocuments: items.filter((item) => item.source === 'mock').length,
      previewableDocuments: items.filter((item) => item.canPreview).length,
      missingFiles: items.filter((item) => item.healthStatus === 'missing_file').length,
      brokenPreview: items.filter((item) => item.healthStatus === 'broken').length,
      demoOnly: items.filter((item) => item.healthStatus === 'demo').length,
    },
    items,
  }
}

export const useProductionStore = defineStore('production', () => {
  const persistedScope = readStorage(STORAGE_KEYS.scope) as PlanScope | null
  const persistedProcess = readStorage(STORAGE_KEYS.activeProcess) as ActiveProcess | null
  const persistedPlanId = readStorage(STORAGE_KEYS.selectedPlanId)
  const persistedLogs = readStorage(STORAGE_KEYS.queryLogs)

  const fallbackPlans = clonePlans().map(normalizePlan)
  const plans = ref<ProductionPlan[]>(fallbackPlans.filter((plan) => plan.date === '2026-06-11'))
  const selectedPlanId = ref(persistedPlanId || plans.value[0]?.id || fallbackPlans[0].id)
  const selectedPlanDetail = ref<ProductionPlan | null>(plans.value.find((plan) => plan.id === selectedPlanId.value) ?? plans.value[0] ?? fallbackPlans[0])
  const scope = ref<PlanScope>(persistedScope === 'week' ? 'week' : 'today')
  const activeProcess = ref<ActiveProcess>(persistedProcess === 'back' ? 'back' : 'front')
  const activeDocumentTab = ref<DocumentTab>('drawing')
  const searchKeyword = ref('')
  const searchResults = ref<SearchHit[]>([])
  const documents = ref<ProductDocument[]>([])
  const uploadDialogOpen = ref(false)
  const uploadLoading = ref(false)
  const selectedDocument = ref<ProductDocument | null>(null)
  const previewDocument = ref<ProductDocument | null>(null)
  const documentVersions = ref<DocumentVersionsResponse | null>(null)
  const versionCompareResult = ref<DocumentCompareResult | null>(null)
  const auditLogs = ref<AuditLog[]>([])
  const migrationPreview = ref<MigrationPreview | null>(null)
  const migrationValidation = ref<MigrationValidation | null>(null)
  const prismaSeedPreview = ref<PrismaSeedPreview | null>(null)
  const versionDialogOpen = ref(false)
  const compareDialogOpen = ref(false)
  const auditDialogOpen = ref(false)
  const migrationDialogOpen = ref(false)
  const readiness = ref<PlanReadiness>(localReadiness(selectedPlanDetail.value ?? fallbackPlans[0]))
  const readinessLoading = ref(false)
  const queryLogs = ref<QueryRecord[]>(persistedLogs ? JSON.parse(persistedLogs) as QueryRecord[] : [
    {
      id: 'Q-001',
      text: '查看 HL-EV-4821A 后段 SOP',
      time: dayjs().subtract(18, 'minute').format('HH:mm'),
      planId: 'PLN-20260611-001',
      source: '搜索',
    },
  ])
  const feedbackRecords = ref<FeedbackRecord[]>([])
  const loading = ref(false)
  const fileHealth = ref<DocumentFileHealthResponse | null>(null)
  const fileHealthLoading = ref(false)
  const apiOnline = ref(false)
  const offlineDemoMode = ref(false)
  const errorMessage = ref('')
  const dataSourceStatus = ref<DataSourceStatus>({
    dataSource: 'mock',
    databaseConfigured: false,
    message: '当前使用 Mock Repository，尚未连接 Sealos PostgreSQL',
  })
  const databaseSafety = ref<DatabaseSafetyStatus | null>(null)

  const selectedPlan = computed(() => {
    return selectedPlanDetail.value
      ?? plans.value.find((plan) => plan.id === selectedPlanId.value)
      ?? plans.value[0]
      ?? fallbackPlans[0]
  })

  const visiblePlans = computed(() => plans.value)
  const scopedPlans = computed(() => plans.value)
  const activeSegment = computed(() => activeProcess.value === 'front' ? '前段' : '后段')

  const searchHits = computed<SearchHit[]>(() => {
    if (searchResults.value.length > 0) return searchResults.value
    return [
      {
        id: 'SUGGESTION-LOCKED',
        planId: selectedPlan.value.id,
        title: selectedPlan.value.back.pinMap,
        subtitle: `${selectedPlan.value.customer} / ${selectedPlan.value.productCode}`,
        type: 'back-document',
        matchedField: '推荐查询',
        snippet: selectedPlan.value.back.pinMap,
      },
    ]
  })

  const selectedFeedbackRecords = computed(() => {
    return feedbackRecords.value.filter((record) => record.planId === selectedPlan.value.id)
  })

  const fileHealthByDocumentId = computed(() => {
    return new Map((fileHealth.value?.items ?? []).map((item) => [item.documentId, item]))
  })

  function fileHealthForDocument(document: ProductDocument) {
    return fileHealthByDocumentId.value.get(document.documentId ?? document.id) ?? null
  }

  watch(scope, (value) => writeStorage(STORAGE_KEYS.scope, value))
  watch(selectedPlanId, (value) => writeStorage(STORAGE_KEYS.selectedPlanId, value))
  watch(activeProcess, (value) => writeStorage(STORAGE_KEYS.activeProcess, value))
  watch(queryLogs, (value) => writeStorage(STORAGE_KEYS.queryLogs, JSON.stringify(value.slice(0, 8))), { deep: true })

  async function checkApiHealth() {
    try {
      const health = await getHealth()
      apiOnline.value = health.status === 'ok'
      offlineDemoMode.value = !apiOnline.value
      errorMessage.value = apiOnline.value ? '' : '后端 API 未返回健康状态，已切换离线演示模式。'
      if (apiOnline.value) {
        dataSourceStatus.value = await getDataSourceStatus()
        databaseSafety.value = await getDatabaseSafety()
      }
      return apiOnline.value
    } catch {
      apiOnline.value = false
      offlineDemoMode.value = true
      errorMessage.value = '后端 API 不可用，当前为离线演示模式。'
      dataSourceStatus.value = {
        dataSource: 'mock',
        databaseConfigured: false,
        message: '后端不可用，当前使用前端本地离线演示数据',
      }
      databaseSafety.value = null
      return false
    }
  }

  async function loadPlans(nextScope: PlanScope = scope.value) {
    loading.value = true
    scope.value = nextScope
    try {
      if (!apiOnline.value) {
        await checkApiHealth()
      }

      if (apiOnline.value) {
        plans.value = (await getProductionPlans(nextScope)).map(normalizePlan)
        offlineDemoMode.value = false
        errorMessage.value = ''
      } else {
        plans.value = fallbackPlans.filter((plan) => nextScope === 'week' || plan.date === '2026-06-11')
      }
    } catch {
      apiOnline.value = false
      offlineDemoMode.value = true
      plans.value = fallbackPlans.filter((plan) => nextScope === 'week' || plan.date === '2026-06-11')
      errorMessage.value = '计划数据请求失败，已使用本地 Mock fallback。'
    } finally {
      const nextPlan = plans.value.find((plan) => plan.id === selectedPlanId.value) ?? plans.value[0] ?? fallbackPlans[0]
      await selectPlan(nextPlan.id, false)
      loading.value = false
    }
  }

  async function syncReadiness(plan: ProductionPlan) {
    readinessLoading.value = true
    try {
      if (plan.readiness) {
        readiness.value = plan.readiness
      } else if (apiOnline.value) {
        readiness.value = await getPlanReadiness(plan.id)
      } else {
        readiness.value = localReadiness(plan)
      }
    } catch {
      readiness.value = localReadiness(plan)
      offlineDemoMode.value = true
      errorMessage.value = '资料完整性检查请求失败，已使用本地检查结果。'
    } finally {
      readinessLoading.value = false
    }
  }

  async function loadDocuments(plan = selectedPlan.value) {
    try {
      documents.value = apiOnline.value
        ? await getDocuments({ planId: plan.id, productId: plan.productId })
        : plan.documents
    } catch {
      documents.value = plan.documents
      errorMessage.value = '资料列表请求失败，已使用当前资料包数据。'
    }
  }

  async function loadFileHealth(plan = selectedPlan.value) {
    fileHealthLoading.value = true
    try {
      fileHealth.value = apiOnline.value
        ? await getDocumentFileHealth({ planId: plan.id, productId: plan.productId })
        : localFileHealth(plan)
    } catch {
      fileHealth.value = localFileHealth(plan)
      errorMessage.value = '文件健康检查请求失败，已使用本地演示检查结果。'
    } finally {
      fileHealthLoading.value = false
    }
  }

  async function selectPlan(planId: string, shouldLog = true) {
    selectedPlanId.value = planId
    loading.value = true
    try {
      if (apiOnline.value) {
        selectedPlanDetail.value = normalizePlan(await getProductionPlanDetail(planId))
        await syncReadiness(selectedPlanDetail.value)
        await loadDocuments(selectedPlanDetail.value)
        await loadFileHealth(selectedPlanDetail.value)
        feedbackRecords.value = await getFeedback(planId)
      } else {
        selectedPlanDetail.value = normalizePlan(fallbackPlans.find((plan) => plan.id === planId) ?? fallbackPlans[0])
        await syncReadiness(selectedPlanDetail.value)
        await loadDocuments(selectedPlanDetail.value)
        await loadFileHealth(selectedPlanDetail.value)
      }
      if (shouldLog) addQueryLog(`切换到生产计划 ${planId}`, '切换', planId)
    } catch {
      selectedPlanDetail.value = normalizePlan(fallbackPlans.find((plan) => plan.id === planId) ?? fallbackPlans[0])
      readiness.value = localReadiness(selectedPlanDetail.value)
      documents.value = selectedPlanDetail.value.documents
      fileHealth.value = localFileHealth(selectedPlanDetail.value)
      offlineDemoMode.value = true
      apiOnline.value = false
      errorMessage.value = '计划详情请求失败，已使用本地资料包。'
    } finally {
      loading.value = false
    }
  }

  async function setScope(nextScope: PlanScope) {
    await loadPlans(nextScope)
  }

  function setSearchKeyword(keyword: string | number) {
    searchKeyword.value = String(keyword)
    if (!searchKeyword.value.trim()) searchResults.value = []
  }

  async function search(keyword = searchKeyword.value) {
    const value = keyword.trim()
    searchKeyword.value = value
    if (!value) {
      searchResults.value = []
      return
    }

    loading.value = true
    try {
      searchResults.value = apiOnline.value
        ? await searchDocuments(value, selectedPlan.value.id)
        : localSearch(value, fallbackPlans, selectedPlan.value.id)
      addQueryLog(`搜索：${value}`, '搜索', selectedPlan.value.id)
    } catch {
      searchResults.value = localSearch(value, fallbackPlans, selectedPlan.value.id)
      offlineDemoMode.value = true
      apiOnline.value = false
      errorMessage.value = '搜索接口请求失败，已使用本地搜索。'
    } finally {
      loading.value = false
    }
  }

  function setSegment(segment: '前段' | '后段') {
    activeProcess.value = segment === '前段' ? 'front' : 'back'
    addQueryLog(`查看当前产品${segment}资料`, '切换', selectedPlan.value.id)
  }

  function setDocumentTab(tab: DocumentTab) {
    activeDocumentTab.value = tab
  }

  function addQueryLog(text: string, source: QueryRecord['source'], planId = selectedPlan.value.id) {
    queryLogs.value.unshift({
      id: `Q-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      text,
      time: dayjs().format('HH:mm'),
      planId,
      source,
    })
    queryLogs.value = queryLogs.value.slice(0, 8)
  }

  async function simulateVoiceQuery() {
    const text = '查询当前产品后段孔位图'
    activeProcess.value = 'back'
    activeDocumentTab.value = 'pin-map'
    searchKeyword.value = selectedPlan.value.back.pinMap
    await search(selectedPlan.value.back.pinMap)
    addQueryLog(text, '语音', selectedPlan.value.id)
    toast.info('已模拟语音查询', { description: text })
  }

  async function confirmCurrentPlan() {
    loading.value = true
    try {
      const confirmed = apiOnline.value
        ? await confirmProductionPlan(selectedPlan.value.id, {
            userId: 'demo-leader',
            userName: '组长演示账号',
            role: activeProcess.value === 'front' ? '前段组长' : '后段组长',
          })
        : { ...selectedPlan.value, confirmationStatus: '已确认' as const }

      const normalizedConfirmed = normalizePlan(confirmed)
      selectedPlanDetail.value = normalizedConfirmed
      readiness.value = normalizedConfirmed.readiness ?? localReadiness(normalizedConfirmed)
      plans.value = plans.value.map((plan) => plan.id === confirmed.id ? normalizedConfirmed : plan)
      addQueryLog(`组长确认 ${confirmed.productCode} ${confirmed.productVersion}`, '确认', confirmed.id)
      toast.success('组长确认完成', {
        description: apiOnline.value ? '已通过后端 Mock API 写入确认状态。' : '已写入本地离线演示状态。',
      })
    } catch {
      errorMessage.value = '组长确认失败，请检查后端 API 状态。'
      toast.error('组长确认失败', { description: errorMessage.value })
    } finally {
      loading.value = false
    }
  }

  async function submitFeedback(type: FeedbackType = '资料缺失', description = '现场发现资料异常，等待工艺复核。') {
    loading.value = true
    try {
      const payload = {
        planId: selectedPlan.value.id,
        type,
        description,
        userId: 'demo-leader',
        userName: '组长演示账号',
      }
      const response = apiOnline.value
        ? await submitFeedbackApi(payload)
        : {
            success: true,
            message: '离线 Mock 反馈已记录',
            record: {
              id: `FB-${Date.now()}`,
              ...payload,
              createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
            },
          }

      feedbackRecords.value.unshift(response.record)
      selectedPlanDetail.value = normalizePlan({
        ...selectedPlan.value,
        status: '异常',
        confirmationStatus: '需复核',
      })
      readiness.value = localReadiness(selectedPlanDetail.value)
      plans.value = plans.value.map((plan) => plan.id === selectedPlan.value.id ? selectedPlan.value : plan)
      addQueryLog(`提交异常反馈：${type}`, '搜索', selectedPlan.value.id)
      toast.warning('异常反馈已提交', { description: response.message })
    } catch {
      errorMessage.value = '异常反馈提交失败，请检查后端 API 状态。'
      toast.error('异常反馈提交失败', { description: errorMessage.value })
    } finally {
      loading.value = false
    }
  }

  async function uploadCurrentDocument(formData: FormData) {
    if (!apiOnline.value) {
      toast.error('离线演示模式暂不支持上传文件')
      return
    }

    uploadLoading.value = true
    try {
      formData.set('planId', selectedPlan.value.id)
      formData.set('productId', selectedPlan.value.productId ?? selectedPlan.value.productCode)
      const document = await uploadDocumentApi(formData)
      selectedDocument.value = document
      previewDocument.value = document
      uploadDialogOpen.value = false
      await selectPlan(selectedPlan.value.id, false)
      if (searchKeyword.value.trim()) {
        searchResults.value = await searchDocuments(searchKeyword.value.trim(), selectedPlan.value.id).catch(() => searchResults.value)
      }
      toast.success('资料上传成功', { description: `${document.title} ${document.version}` })
    } catch {
      toast.error('资料上传失败', { description: '请确认文件类型、大小和后端 API 状态。' })
    } finally {
      uploadLoading.value = false
    }
  }

  async function refreshDocumentDetail(id: string) {
    selectedDocument.value = apiOnline.value
      ? await getDocumentDetail(id)
      : documents.value.find((doc) => doc.documentId === id || doc.id === id) ?? null
    return selectedDocument.value
  }

  async function updateCurrentDocumentStatus(id: string, payload: UpdateDocumentStatusPayload) {
    if (!apiOnline.value) return
    try {
      const document = await updateDocumentStatusApi(id, payload)
      selectedDocument.value = document
      previewDocument.value = document
      await selectPlan(selectedPlan.value.id, false)
      toast.success('资料状态已更新')
    } catch (error) {
      errorMessage.value = '资料状态更新失败，请确认该资料来自本地上传。'
      throw error
    }
  }

  async function updateCurrentDocumentVersion(id: string, payload: UpdateDocumentVersionPayload) {
    if (!apiOnline.value) return
    try {
      const document = await updateDocumentVersionApi(id, payload)
      selectedDocument.value = document
      previewDocument.value = document
      await selectPlan(selectedPlan.value.id, false)
      toast.success('资料版本已更新')
    } catch (error) {
      errorMessage.value = '资料版本更新失败，请确认该资料来自本地上传。'
      throw error
    }
  }

  async function archiveCurrentDocument(id: string) {
    if (!apiOnline.value) return
    try {
      const document = await archiveDocumentApi(id)
      selectedDocument.value = document
      previewDocument.value = null
      await selectPlan(selectedPlan.value.id, false)
      toast.warning('资料已归档')
    } catch (error) {
      errorMessage.value = '资料归档失败，请确认该资料来自本地上传。'
      throw error
    }
  }

  async function loadDocumentVersions(id: string) {
    if (!apiOnline.value) return null
    try {
      documentVersions.value = await getDocumentVersions(id)
      versionDialogOpen.value = true
      return documentVersions.value
    } catch (error) {
      errorMessage.value = '资料版本历史加载失败。'
      toast.error('资料版本历史加载失败', { description: errorMessage.value })
      throw error
    }
  }

  async function setCurrentDocumentEffective(id: string, payload: SetEffectiveDocumentPayload = {}) {
    if (!apiOnline.value) return
    try {
      const result = await setDocumentEffective(id, {
        operatorId: 'demo-leader',
        operatorName: '组长演示账号',
        operatorRole: '组长',
        ...payload,
      })
      selectedDocument.value = result.document
      previewDocument.value = result.document
      documentVersions.value = result.versions
      if (result.readiness) readiness.value = result.readiness
      await selectPlan(selectedPlan.value.id, false)
      toast.success('已设置为当前有效版本', { description: `${result.document.title} ${result.document.version}` })
      return result
    } catch (error) {
      errorMessage.value = '设置当前有效版本失败。'
      toast.error('设置当前有效版本失败', { description: errorMessage.value })
      throw error
    }
  }

  async function compareDocumentVersions(documentIds: string[]) {
    if (!apiOnline.value) return null
    try {
      versionCompareResult.value = await compareDocuments({ documentIds })
      compareDialogOpen.value = true
      return versionCompareResult.value
    } catch (error) {
      errorMessage.value = '资料版本对比失败。'
      toast.error('资料版本对比失败', { description: errorMessage.value })
      throw error
    }
  }

  async function loadAuditLogs(query: AuditLogQuery) {
    if (!apiOnline.value) return []
    try {
      auditLogs.value = await getAuditLogs(query)
      auditDialogOpen.value = true
      return auditLogs.value
    } catch (error) {
      errorMessage.value = '审计记录加载失败。'
      toast.error('审计记录加载失败', { description: errorMessage.value })
      throw error
    }
  }

  async function loadMigrationPreview() {
    if (!apiOnline.value) return null
    try {
      const [preview, validation, seedPreview, safety] = await Promise.all([
        getMigrationPreview(),
        validateMigration(),
        getPrismaSeedPreview(),
        getDatabaseSafety(),
      ])
      migrationPreview.value = preview
      migrationValidation.value = validation
      prismaSeedPreview.value = seedPreview
      databaseSafety.value = safety
      migrationDialogOpen.value = true
      return migrationPreview.value
    } catch (error) {
      errorMessage.value = '迁移预览加载失败。'
      toast.error('迁移预览加载失败', { description: errorMessage.value })
      throw error
    }
  }

  async function exportSeedPreview() {
    if (!apiOnline.value) return null
    const result = await exportMigrationSeed()
    toast.success('已生成 seed JSON 预览', { description: '仅返回 JSON，不写入数据库。' })
    return result
  }

  async function loadDatabaseSafety() {
    if (!apiOnline.value) return null
    databaseSafety.value = await getDatabaseSafety()
    return databaseSafety.value
  }

  async function initialize() {
    await checkApiHealth()
    await loadPlans(scope.value)
  }

  return {
    plans,
    selectedPlanId,
    selectedPlan,
    selectedPlanDetail,
    scopedPlans,
    visiblePlans,
    scope,
    activeProcess,
    activeSegment,
    activeDocumentTab,
    searchKeyword,
    searchResults,
    searchHits,
    readiness,
    readinessLoading,
    queryLogs,
    queryRecords: queryLogs,
    feedbackRecords,
    selectedFeedbackRecords,
    fileHealth,
    fileHealthLoading,
    fileHealthByDocumentId,
    fileHealthForDocument,
    documents,
    uploadDialogOpen,
    uploadLoading,
    selectedDocument,
    previewDocument,
    documentVersions,
    versionCompareResult,
    auditLogs,
    migrationPreview,
    migrationValidation,
    prismaSeedPreview,
    versionDialogOpen,
    compareDialogOpen,
    auditDialogOpen,
    migrationDialogOpen,
    loading,
    apiOnline,
    offlineDemoMode,
    errorMessage,
    dataSourceStatus,
    databaseSafety,
    initialize,
    checkApiHealth,
    loadPlans,
    setScope,
    selectPlan,
    setSearchKeyword,
    search,
    setSegment,
    setDocumentTab,
    addQueryLog,
    addQuery: addQueryLog,
    simulateVoiceQuery,
    runVoiceQuery: simulateVoiceQuery,
    confirmCurrentPlan,
    confirmSelectedPlan: confirmCurrentPlan,
    submitFeedback,
    loadDocuments,
    loadFileHealth,
    uploadCurrentDocument,
    refreshDocumentDetail,
    updateCurrentDocumentStatus,
    updateCurrentDocumentVersion,
    archiveCurrentDocument,
    loadDocumentVersions,
    setCurrentDocumentEffective,
    compareDocumentVersions,
    loadAuditLogs,
    loadMigrationPreview,
    loadDatabaseSafety,
    exportSeedPreview,
  }
})
