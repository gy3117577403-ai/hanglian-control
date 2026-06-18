import { defineStore } from 'pinia'
import { computed, nextTick, ref } from 'vue'
import { toast } from 'vue-sonner'
import {
  completeHubOrder,
  createHubConnector,
  deleteHubConnector,
  deleteHubDrawingItem,
  getHubCustomers,
  getHubOrderOverview,
  getHubOrders,
  getHubProductByModel,
  getHubProductDetail,
  getHubProducts,
  getHubConnectors,
  getHubFixtures,
  importHubConnectors,
  updateHubConnector,
  uploadHubDrawingItem,
} from '@/services/api'
import {
  mockConnectorParameters,
  mockDrawingDetails,
  mockFixtureParameters,
  mockHubCustomers,
  mockHubOrders,
  mockHubProducts,
} from '@/mock/order-hub-data'
import { useNavigationMemoryStore } from './navigation-memory-store'
import type {
  ConnectorParameter,
  ConnectorImportResult,
  ConnectorParameterPayload,
  DocumentHubUploadPayload,
  DrawingItem,
  DrawingModule,
  DrawingModuleKey,
  DrawingViewLevel,
  FixtureParameter,
  HubCustomer,
  HubMode,
  HubOrder,
  HubOrderStatus,
  HubProductModel,
  ProductDrawingDetail,
} from '@/types/production'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function withFallback<T>(remote: T[], fallback: T[]) {
  return remote.length ? remote : clone(fallback)
}

function match(value: unknown, keyword: string) {
  return String(value ?? '').toLowerCase().includes(keyword)
}

const connectorStatusRank: Record<string, number> = {
  启用: 0,
  复核中: 1,
  停用: 2,
}

function compareConnectors(a: ConnectorParameter, b: ConnectorParameter) {
  const statusDiff = (connectorStatusRank[a.status ?? ''] ?? 9) - (connectorStatusRank[b.status ?? ''] ?? 9)
  if (statusDiff) return statusDiff
  return a.connectorModel.localeCompare(b.connectorModel, 'zh-Hans-CN', { numeric: true })
}

function sortConnectors(rows: ConnectorParameter[]) {
  return [...rows].sort(compareConnectors)
}

function connectorFieldSearch(item: ConnectorParameter, normalizedKeyword: string) {
  const fieldSearches = [
    { aliases: ['入长', '入长mm', '入长毫米'], value: item.insertionLengthMm },
    { aliases: ['外剥', '外剥皮', '外剥长度', '外剥mm', '外剥皮mm'], value: item.outerStripLengthMm },
    { aliases: ['内剥', '内剥皮', '内剥长度', '内剥mm', '内剥皮mm'], value: item.innerStripLengthMm },
  ]
  return fieldSearches.some(({ aliases, value }) => aliases.some((alias) => {
    if (!normalizedKeyword.startsWith(alias)) return false
    const numericText = normalizedKeyword
      .replace(alias, '')
      .replace(/mm|毫米/g, '')
      .trim()
    return numericText ? String(value ?? '').includes(numericText) : value !== null && value !== undefined
  }))
}

function connectorMatchesKeyword(item: ConnectorParameter, keyword: string) {
  if (!keyword) return true
  const normalizedKeyword = keyword.replace(/\s+/g, '').toLowerCase()
  const outerBlankWords = ['外剥空', '外剥为空', '未填外剥', '无外剥', '空外剥', '外剥留空']
  if (outerBlankWords.some((word) => normalizedKeyword.includes(word))) {
    return item.outerStripLengthMm === null || item.outerStripLengthMm === undefined
  }
  if (connectorFieldSearch(item, normalizedKeyword)) return true
  return [
    item.connectorModel,
    item.insertionLengthMm,
    item.outerStripLengthMm,
    item.innerStripLengthMm,
    item.remark,
    item.status,
  ].some((value) => match(value, keyword))
}

function fileTypeFromFile(file?: File | null): DrawingItem['fileType'] {
  if (file?.type === 'application/pdf') return 'pdf'
  if (file?.type?.startsWith('image/')) return 'image'
  return 'card'
}

const orderStatusRank: Record<HubOrderStatus, number> = {
  back: 0,
  front: 1,
  no_drawing: 2,
  exception: 3,
}

function sortOrders(orders: HubOrder[]) {
  return [...orders].sort((a, b) => {
    const statusDiff = orderStatusRank[a.status] - orderStatusRank[b.status]
    if (statusDiff) return statusDiff
    const customerDiff = a.customerName.localeCompare(b.customerName, 'zh-Hans-CN')
    if (customerDiff) return customerDiff
    return a.productModel.localeCompare(b.productModel, 'zh-Hans-CN')
  })
}

function createEmptyModule(moduleKey: DrawingModuleKey, moduleName: string): DrawingModule {
  return {
    moduleKey,
    moduleName,
    status: moduleKey === 'original_drawing' ? 'no_drawing' : 'pending',
    items: [],
    remark: moduleKey === 'original_drawing' ? '未发图 / 待上传资料。' : '待上传补充资料。',
    updatedAt: new Date().toISOString(),
  }
}

function createMissingDetail(order: HubOrder): ProductDrawingDetail {
  const product: HubProductModel = {
    productId: `missing-${order.orderId}`,
    customerId: 'pending-customer',
    productModel: order.productModel,
    productName: '待补充产品资料',
    drawingStatus: 'no_drawing',
    remark: '该订单型号暂无图纸资料，待上传补充。',
  }
  return {
    product,
    customer: {
      customerId: 'pending-customer',
      customerName: order.customerName || '待补充客户资料',
      customerShortName: '待补充',
    },
    modules: [
      createEmptyModule('original_drawing', '原图'),
      createEmptyModule('sop', 'SOP 指导书'),
      createEmptyModule('finished_images', '成品图'),
      createEmptyModule('accessory_specs', '辅料规格'),
      createEmptyModule('notes', '注意事项'),
      createEmptyModule('tooling', '配套工装'),
    ],
  }
}

export const useDocumentHubStore = defineStore('document-hub-store', () => {
  const navigation = useNavigationMemoryStore()
  const activeMode = ref<HubMode>('drawing')
  const searchKeyword = ref('')
  const todayOrders = ref<HubOrder[]>([])
  const weekOrders = ref<HubOrder[]>([])
  const completedOrders = ref<HubOrder[]>([])
  const customers = ref<HubCustomer[]>([])
  const productModels = ref<HubProductModel[]>([])
  const selectedCustomer = ref<HubCustomer | null>(null)
  const selectedProduct = ref<HubProductModel | null>(null)
  const selectedModule = ref<DrawingModule | null>(null)
  const selectedDrawingItem = ref<DrawingItem | null>(null)
  const productDrawingDetail = ref<ProductDrawingDetail | null>(null)
  const drawingViewLevel = ref<DrawingViewLevel>('customers')
  const connectorRows = ref<ConnectorParameter[]>([])
  const fixtureRows = ref<FixtureParameter[]>([])
  const selectedConnector = ref<ConnectorParameter | null>(null)
  const selectedFixture = ref<FixtureParameter | null>(null)
  const connectorImportResult = ref<ConnectorImportResult | null>(null)
  const connectorImportError = ref('')
  const connectorMutationLoading = ref(false)
  const orderOverviewOpen = ref(false)
  const uploadDialogOpen = ref(false)
  const uploadDialogSource = ref<'top' | 'module'>('top')
  const orderSidebarCollapsed = ref(false)
  const connectorDetailOpen = ref(false)
  const fixtureDetailOpen = ref(false)
  const loading = ref(false)
  const localOrders = ref<HubOrder[]>(clone(mockHubOrders))
  const localDetails = ref<ProductDrawingDetail[]>(clone(mockDrawingDetails))
  const localConnectors = ref<ConnectorParameter[]>(clone(mockConnectorParameters))
  const localFixtures = ref<FixtureParameter[]>(clone(mockFixtureParameters))
  let productDetailRequestId = 0

  const currentSearchPlaceholder = computed(() => {
    if (activeMode.value === 'connector') return '搜索连接器型号、入长、外剥长度、内剥长度、备注；外剥可为空'
    if (activeMode.value === 'fixture') return '搜索治具编号、治具名称、工位、适用产品'
    return '搜索客户、产品型号、图纸、SOP、成品图'
  })

  const visibleTodayOrders = computed(() => sortOrders(todayOrders.value.filter((order) => !order.completed)))
  const visibleWeekOrders = computed(() => sortOrders(weekOrders.value.filter((order) => !order.completed)))

  function patchOrder(orderId: string, patch: Partial<HubOrder>) {
    for (const list of [localOrders.value, todayOrders.value, weekOrders.value, completedOrders.value]) {
      const item = list.find((entry) => entry.orderId === orderId)
      if (item) Object.assign(item, patch)
    }
  }

  async function initialize() {
    loading.value = true
    try {
      await Promise.all([loadOrders(), loadCustomers(), loadConnectors(), loadFixtures()])
      if (!productDrawingDetail.value) {
        const firstOrder = visibleWeekOrders.value[0] ?? visibleTodayOrders.value[0]
        if (firstOrder) await openOrderProduct(firstOrder, 'orders')
      }
    } finally {
      loading.value = false
    }
  }

  async function loadOrders() {
    try {
      const [today, week, overview] = await Promise.all([
        getHubOrders('today', false),
        getHubOrders('week', false),
        getHubOrderOverview(),
      ])
      const fallbackToday = localOrders.value.filter((order) => order.scope === 'today' && !order.completed)
      const fallbackWeek = localOrders.value.filter((order) => order.scope === 'week' && !order.completed)
      const fallbackCompleted = localOrders.value.filter((order) => order.completed)
      todayOrders.value = withFallback(today, fallbackToday)
      weekOrders.value = withFallback(week, fallbackWeek)
      completedOrders.value = withFallback(overview.completedOrders, fallbackCompleted)
    } catch {
      todayOrders.value = localOrders.value.filter((order) => order.scope === 'today' && !order.completed)
      weekOrders.value = localOrders.value.filter((order) => order.scope === 'week' && !order.completed)
      completedOrders.value = localOrders.value.filter((order) => order.completed)
    }
  }

  async function completeOrder(order: HubOrder) {
    saveCurrentScroll('orders')
    saveCurrentScroll('week-orders')
    saveCurrentScroll('order-overview')
    try {
      await completeHubOrder(order.orderId)
    } catch {
      patchOrder(order.orderId, { completed: true, completedAt: new Date().toISOString() })
    }
    await loadOrders()
    await restoreScroll('orders')
    await restoreScroll('week-orders')
    await restoreScroll('order-overview')
    toast.success(`已完成：${order.productModel}`)
  }

  function updateOrderStatus(order: HubOrder, status: HubOrderStatus) {
    patchOrder(order.orderId, { status })
    toast.success('订单状态已更新', { description: order.productModel })
  }

  async function reopenOrder(order: HubOrder) {
    const restored = { ...order, completed: false, completedAt: undefined }
    const local = localOrders.value.find((item) => item.orderId === order.orderId)
    if (local) {
      local.completed = false
      local.completedAt = undefined
    }
    completedOrders.value = completedOrders.value.filter((item) => item.orderId !== order.orderId)
    if (restored.scope === 'today' && !todayOrders.value.some((item) => item.orderId === restored.orderId)) {
      todayOrders.value.unshift(restored)
    }
    if (restored.scope === 'week' && !weekOrders.value.some((item) => item.orderId === restored.orderId)) {
      weekOrders.value.unshift(restored)
    }
    toast.success('已重新加入待完成', { description: order.productModel })
  }

  async function loadCustomers() {
    try {
      customers.value = withFallback(await getHubCustomers(), mockHubCustomers)
    } catch {
      customers.value = clone(mockHubCustomers)
    }
  }

  async function openCustomer(customer: HubCustomer) {
    saveCurrentScroll('customers')
    selectedCustomer.value = customer
    selectedProduct.value = null
    productDrawingDetail.value = null
    drawingViewLevel.value = 'products'
    navigation.rememberBreadcrumb([{ level: 'customers' }, { level: 'products', customerId: customer.customerId }])
    try {
      productModels.value = await getHubProducts(customer.customerId)
    } catch {
      productModels.value = mockHubProducts.filter((product) => product.customerId === customer.customerId)
    }
    await restoreScroll('products')
  }

  async function openProduct(product: HubProductModel, source: 'drawing' | 'orders' | 'overview' | 'search' = 'drawing') {
    const requestId = ++productDetailRequestId
    saveCurrentScroll(drawingViewLevel.value)
    selectedProduct.value = product
    selectedModule.value = null
    selectedDrawingItem.value = null
    drawingViewLevel.value = 'product'
    if (source !== 'drawing') {
      navigation.pushReturnPoint({
        source,
        label: source === 'orders' ? '返回订单列表' : source === 'overview' ? '返回订单总览' : '返回搜索结果',
        state: { level: 'product', productId: product.productId },
        scrollKey: source === 'overview' ? 'order-overview' : source,
      })
    }
    const localDetail = localDetails.value.find((detail) => detail.product.productId === product.productId) ?? null
    productDrawingDetail.value = localDetail
    try {
      const remoteDetail = await getHubProductDetail(product.productId)
      if (requestId === productDetailRequestId && selectedProduct.value?.productId === product.productId) {
        productDrawingDetail.value = remoteDetail
      }
    } catch {
      if (requestId === productDetailRequestId && selectedProduct.value?.productId === product.productId) {
        productDrawingDetail.value = localDetail
      }
    }
    navigation.rememberBreadcrumb([
      { level: 'customers' },
      { level: 'products', customerId: selectedCustomer.value?.customerId ?? product.customerId },
      { level: 'product', productId: product.productId },
    ])
    await restoreScroll('product')
  }

  async function openOrderProduct(order: HubOrder, source: 'orders' | 'overview' = 'orders') {
    activeMode.value = 'drawing'
    navigation.rememberFunction('drawing')
    const product = order.productId ? mockHubProducts.find((item) => item.productId === order.productId) : undefined
    if (product) {
      selectedCustomer.value = mockHubCustomers.find((customer) => customer.customerId === product.customerId) ?? null
      await openProduct(product, source)
      return
    }
    const missingDetail = createMissingDetail(order)
    productDrawingDetail.value = missingDetail
    selectedCustomer.value = missingDetail.customer ?? null
    selectedProduct.value = missingDetail.product
    drawingViewLevel.value = 'product'
    navigation.pushReturnPoint({
      source,
      label: source === 'overview' ? '返回订单总览' : '返回订单列表',
      state: { level: 'product', productId: selectedProduct.value.productId },
      scrollKey: source === 'overview' ? 'order-overview' : 'orders',
    })
    try {
      const detail = await getHubProductByModel(order.productModel)
      if (detail?.product) {
        selectedCustomer.value = detail.customer ?? null
        selectedProduct.value = detail.product
        productDrawingDetail.value = detail
        drawingViewLevel.value = 'product'
        return
      }
    } catch {
      // Use local missing detail below.
    }
  }

  function openModule(module: DrawingModule) {
    saveCurrentScroll('product')
    selectedModule.value = module
    selectedDrawingItem.value = null
    drawingViewLevel.value = 'module'
    navigation.rememberBreadcrumb([
      ...navigation.drawingBreadcrumb,
      { level: 'module', productId: selectedProduct.value?.productId, moduleKey: module.moduleKey },
    ])
    void restoreScroll('module')
  }

  function openImageDetail(item: DrawingItem) {
    saveCurrentScroll('module')
    selectedDrawingItem.value = item
    drawingViewLevel.value = 'image'
    navigation.rememberBreadcrumb([
      ...navigation.drawingBreadcrumb,
      { level: 'image', productId: selectedProduct.value?.productId, moduleKey: selectedModule.value?.moduleKey, itemId: item.itemId },
    ])
  }

  async function goBack() {
    if (drawingViewLevel.value === 'image') {
      drawingViewLevel.value = 'module'
      selectedDrawingItem.value = null
      await restoreScroll('module')
      return
    }
    if (drawingViewLevel.value === 'module') {
      drawingViewLevel.value = 'product'
      selectedModule.value = null
      await restoreScroll('product')
      return
    }
    if (drawingViewLevel.value === 'product') {
      const returnPoint = navigation.popReturnPoint()
      if (returnPoint?.source === 'orders') {
        drawingViewLevel.value = 'customers'
        selectedProduct.value = null
        productDrawingDetail.value = null
        await restoreScroll('orders')
        return
      }
      if (returnPoint?.source === 'overview') {
        drawingViewLevel.value = 'customers'
        selectedProduct.value = null
        productDrawingDetail.value = null
        orderOverviewOpen.value = true
        await restoreScroll('order-overview')
        return
      }
      drawingViewLevel.value = selectedCustomer.value ? 'products' : 'customers'
      selectedProduct.value = null
      productDrawingDetail.value = null
      await restoreScroll(drawingViewLevel.value)
      return
    }
    if (drawingViewLevel.value === 'products') {
      drawingViewLevel.value = 'customers'
      selectedCustomer.value = null
      productModels.value = []
      await restoreScroll('customers')
    }
  }

  async function searchCurrentMode() {
    const q = searchKeyword.value.trim().toLowerCase()
    navigation.lastSearchState = { keyword: searchKeyword.value, mode: activeMode.value }
    if (activeMode.value === 'connector') {
      await loadConnectors(searchKeyword.value)
      return
    }
    if (activeMode.value === 'fixture') {
      await loadFixtures(searchKeyword.value)
      return
    }
    if (!q) {
      await loadCustomers()
      drawingViewLevel.value = 'customers'
      return
    }
    const details = localDetails.value.filter((detail) => [
      detail.customer?.customerName,
      detail.customer?.customerShortName,
      detail.product.productModel,
      detail.product.productName,
      detail.product.remark,
      ...detail.modules.flatMap((module) => [module.moduleName, module.remark, ...module.items.flatMap((item) => [item.title, item.fileName, item.remark])]),
    ].some((value) => match(value, q)))
    productModels.value = details.map((detail) => detail.product)
    selectedCustomer.value = null
    drawingViewLevel.value = 'products'
  }

  async function loadConnectors(q = '') {
    const keyword = q.trim().toLowerCase()
    const localMatches = sortConnectors(localConnectors.value.filter((item) => connectorMatchesKeyword(item, keyword)))
    try {
      connectorRows.value = sortConnectors(withFallback(await getHubConnectors(q), localMatches))
    } catch {
      connectorRows.value = localMatches
    }
  }

  async function loadFixtures(q = '') {
    const keyword = q.trim().toLowerCase()
    const localMatches = localFixtures.value.filter((item) => !keyword || [
      item.fixtureCode,
      item.fixtureName,
      item.station,
      item.applicableProduct,
    ].some((value) => match(value, keyword)))
    try {
      fixtureRows.value = withFallback(await getHubFixtures(q), localMatches)
    } catch {
      fixtureRows.value = localMatches
    }
  }

  function setActiveMode(mode: HubMode) {
    activeMode.value = mode
    navigation.rememberFunction(mode)
    searchKeyword.value = ''
    selectedConnector.value = null
    selectedFixture.value = null
    selectedModule.value = null
    selectedDrawingItem.value = null
    if (mode === 'drawing' && !productDrawingDetail.value) drawingViewLevel.value = 'customers'
    if (mode === 'connector') void loadConnectors()
    if (mode === 'fixture') void loadFixtures()
  }

  function openTopUpload() {
    uploadDialogSource.value = 'top'
    uploadDialogOpen.value = true
  }

  function openModuleUpload(module: DrawingModule) {
    selectedModule.value = module
    uploadDialogSource.value = 'module'
    uploadDialogOpen.value = true
  }

  function openConnectorDetail(row: ConnectorParameter) {
    selectedConnector.value = row
    connectorDetailOpen.value = true
  }

  function patchConnector(connectorId: string, patch: Partial<ConnectorParameter>) {
    for (const list of [localConnectors.value, connectorRows.value]) {
      const item = list.find((entry) => entry.connectorId === connectorId)
      if (item) Object.assign(item, patch)
    }
    if (selectedConnector.value?.connectorId === connectorId) {
      selectedConnector.value = { ...selectedConnector.value, ...patch }
    }
  }

  function normalizeConnectorPayload(payload: ConnectorParameterPayload): ConnectorParameterPayload {
    const outerStripLengthMm = payload.outerStripLengthMm === null || payload.outerStripLengthMm === undefined
      ? null
      : Number(payload.outerStripLengthMm)
    return {
      connectorModel: payload.connectorModel.trim(),
      specification: payload.specification?.trim() ?? '',
      insertionLengthMm: Number(payload.insertionLengthMm),
      outerStripLengthMm,
      innerStripLengthMm: Number(payload.innerStripLengthMm),
      remark: payload.remark?.trim() ?? '',
      status: payload.status?.trim() || '启用',
    }
  }

  function upsertConnector(connector: ConnectorParameter) {
    for (const list of [localConnectors.value, connectorRows.value]) {
      const existing = list.find((entry) => entry.connectorId === connector.connectorId)
      if (existing) Object.assign(existing, connector)
      else list.unshift({ ...connector })
      list.sort(compareConnectors)
    }
    if (selectedConnector.value?.connectorId === connector.connectorId) {
      selectedConnector.value = { ...selectedConnector.value, ...connector }
    }
  }

  function removeConnector(connectorId: string) {
    localConnectors.value = localConnectors.value.filter((entry) => entry.connectorId !== connectorId)
    connectorRows.value = connectorRows.value.filter((entry) => entry.connectorId !== connectorId)
    if (selectedConnector.value?.connectorId === connectorId) {
      selectedConnector.value = null
      connectorDetailOpen.value = false
    }
  }

  async function saveConnector(payload: ConnectorParameterPayload, connectorId?: string) {
    const normalized = normalizeConnectorPayload(payload)
    if (!normalized.connectorModel) {
      toast.error('请填写连接器型号')
      return false
    }
    if ([normalized.insertionLengthMm, normalized.innerStripLengthMm].some((value) => !Number.isFinite(value) || value < 0)) {
      toast.error('入长、内剥长度必须是有效数字')
      return false
    }
    if (normalized.outerStripLengthMm !== null && (!Number.isFinite(normalized.outerStripLengthMm) || normalized.outerStripLengthMm < 0)) {
      toast.error('外剥长度可以留空；如果填写，必须是有效数字')
      return false
    }
    const duplicatedModel = [...localConnectors.value, ...connectorRows.value]
      .some((item) => {
        if (item.connectorId === connectorId) return false
        return item.connectorModel.toLowerCase() === normalized.connectorModel.toLowerCase()
      })
    if (duplicatedModel) {
      toast.warning('连接器型号已存在', { description: '请编辑原记录，或在 Excel 导入时选择跳过/覆盖重复。' })
      return false
    }

    connectorMutationLoading.value = true
    try {
      if (connectorId) {
        patchConnector(connectorId, normalized)
        const updated = await updateHubConnector(connectorId, normalized)
        upsertConnector(updated)
        toast.success('连接器参数已更新', { description: normalized.connectorModel })
      } else {
        const created = await createHubConnector(normalized)
        upsertConnector(created)
        toast.success('连接器参数已新增', { description: normalized.connectorModel })
      }
      return true
    } catch {
      if (connectorId) {
        patchConnector(connectorId, normalized)
        toast.warning('后端暂不可用，已保留本地演示修改', { description: normalized.connectorModel })
        return true
      }
      const localConnector: ConnectorParameter = {
        connectorId: `local-conn-${Date.now()}`,
        ...normalized,
      }
      upsertConnector(localConnector)
      toast.warning('后端暂不可用，已新增到本地演示数据', { description: normalized.connectorModel })
      return true
    } finally {
      connectorMutationLoading.value = false
    }
  }

  async function deleteConnector(row: ConnectorParameter) {
    connectorMutationLoading.value = true
    try {
      await deleteHubConnector(row.connectorId)
      removeConnector(row.connectorId)
      toast.success('连接器参数已删除', { description: row.connectorModel })
      return true
    } catch {
      removeConnector(row.connectorId)
      toast.warning('后端暂不可用，已从本地演示列表移除', { description: row.connectorModel })
      return true
    } finally {
      connectorMutationLoading.value = false
    }
  }

  async function importConnectorExcel(file: File, duplicateStrategy: 'review' | 'skip' | 'overwrite' = 'review') {
    connectorMutationLoading.value = true
    connectorImportResult.value = null
    connectorImportError.value = ''
    try {
      const result = await importHubConnectors(file, duplicateStrategy)
      connectorImportResult.value = result
      if (result.requiresDecision || result.requiresOverwrite) {
        toast.warning('发现重复连接器型号', {
          description: `共 ${result.duplicateRows?.length ?? 0} 条重复，请选择跳过、覆盖或取消。`,
        })
        return result
      }
      localConnectors.value = sortConnectors(clone(result.connectors))
      connectorRows.value = sortConnectors(clone(result.connectors))
      if (searchKeyword.value.trim()) await loadConnectors(searchKeyword.value)
      toast.success('Excel 导入完成', {
        description: `新增 ${result.createdRows} 条，更新 ${result.updatedRows} 条，跳过 ${result.skippedRows} 条，错误 ${result.errorRows ?? 0} 条`,
      })
      return result
    } catch (error) {
      const apiError = error as { data?: { message?: string | string[] }; message?: string }
      const rawMessage = apiError.data?.message ?? apiError.message
      const message = Array.isArray(rawMessage) ? rawMessage.join('；') : rawMessage
      connectorImportError.value = message || '后端服务未响应，或 Excel 表头/格式不符合当前连接器导入规则。'
      toast.error('Excel 导入失败', {
        description: connectorImportError.value,
      })
      return null
    } finally {
      connectorMutationLoading.value = false
    }
  }

  async function updateConnectorRemark(connectorId: string, remark: string) {
    const nextRemark = remark.trim()
    patchConnector(connectorId, { remark: nextRemark })
    try {
      const updated = await updateHubConnector(connectorId, { remark: nextRemark })
      patchConnector(connectorId, updated)
    } catch {
      // Keep local mock edits available when the API service is offline.
    }
    toast.success('连接器备注已更新')
  }

  function openFixtureDetail(row: FixtureParameter) {
    selectedFixture.value = row
    fixtureDetailOpen.value = true
  }

  async function uploadToModule(payload: DocumentHubUploadPayload) {
    const targetDetail = productDrawingDetail.value ?? localDetails.value.find((detail) => detail.product.productId === payload.productId)
    if (!targetDetail) {
      toast.error('请先选择产品型号后再上传资料')
      return
    }
    if (!payload.file) {
      toast.error('请先选择 PDF / JPG / PNG / WEBP 文件')
      return
    }
    productDrawingDetail.value = targetDetail
    const moduleKey = payload.moduleKey ?? selectedModule.value?.moduleKey
    if (!moduleKey) {
      toast.error('请选择资料模块')
      return
    }
    try {
      const response = await uploadHubDrawingItem(targetDetail.product.productId, moduleKey, payload)
      if (response.detail) productDrawingDetail.value = response.detail
      const persistedModule = response.detail?.modules.find((item) => item.moduleKey === moduleKey)
        ?? response.module
        ?? productDrawingDetail.value?.modules.find((item) => item.moduleKey === moduleKey)
      if (persistedModule) selectedModule.value = persistedModule
      selectedDrawingItem.value = response.item
      uploadDialogOpen.value = false
      toast.success('资料已上传到本地沙盒存储', { description: `${persistedModule?.moduleName ?? moduleKey} / ${response.item.title}` })
      return
    } catch {
      // Local fallback below.
    }
    const module = targetDetail.modules.find((item) => item.moduleKey === moduleKey)
    if (!module) return
    const nextItem: DrawingItem = {
      itemId: `manual-${Date.now()}`,
      title: payload.title,
      fileType: fileTypeFromFile(payload.file),
      fileName: payload.file?.name ?? `${payload.title}.png`,
      version: payload.version,
      remark: payload.remark || '模块内手动补充资料。',
      uploadedAt: new Date().toISOString(),
      source: 'manual_upload',
    }
    module.items.unshift(nextItem)
    module.status = 'uploaded'
    module.updatedAt = nextItem.uploadedAt
    selectedModule.value = module
    selectedDrawingItem.value = nextItem
    uploadDialogOpen.value = false
    toast.success('资料已补充到当前产品模块', { description: `${module.moduleName} / ${payload.title}` })
  }

  function toggleOrderSidebar() {
    orderSidebarCollapsed.value = !orderSidebarCollapsed.value
  }

  async function deleteModuleCoverItem(module: DrawingModule, password: string) {
    const trimmedPassword = password.trim()
    if (!trimmedPassword) {
      toast.error('请输入删除密码')
      return false
    }
    if (!module.items.length) {
      toast.warning('该模块暂无可删除资料')
      return false
    }
    const coverItem = module.items[0]
    const productId = productDrawingDetail.value?.product.productId
    if (coverItem.source === 'manual_upload' && productId) {
      try {
        const response = await deleteHubDrawingItem(productId, module.moduleKey, coverItem.itemId, {
          password: trimmedPassword,
          reason: '主页面资料库删除',
        })
        if (response.detail) productDrawingDetail.value = response.detail
        selectedModule.value = response.module ?? productDrawingDetail.value?.modules.find((item) => item.moduleKey === module.moduleKey) ?? null
        if (selectedDrawingItem.value?.itemId === coverItem.itemId) selectedDrawingItem.value = null
        toast.success('本地上传资料已删除', { description: coverItem.title })
        return true
      } catch {
        toast.error('删除失败，请确认后端服务可用并重新输入删除密码')
        return false
      }
    }
    if (trimmedPassword !== '123456') {
      toast.error('删除密码不正确')
      return false
    }
    const [removed] = module.items.splice(0, 1)
    module.status = module.items.length ? 'uploaded' : module.moduleKey === 'original_drawing' ? 'no_drawing' : 'pending'
    module.updatedAt = new Date().toISOString()
    if (selectedDrawingItem.value?.itemId === removed?.itemId) selectedDrawingItem.value = null
    toast.success('资料已删除', { description: removed?.title ?? module.moduleName })
    return true
  }

  async function deleteDrawingItem(item: DrawingItem, password: string) {
    const trimmedPassword = password.trim()
    if (!trimmedPassword) {
      toast.error('请输入删除密码')
      return false
    }
    const module = selectedModule.value
    if (!module) return false
    const productId = productDrawingDetail.value?.product.productId
    if (item.source === 'manual_upload' && productId) {
      try {
        const response = await deleteHubDrawingItem(productId, module.moduleKey, item.itemId, {
          password: trimmedPassword,
          reason: '主页面资料库删除',
        })
        if (response.detail) productDrawingDetail.value = response.detail
        selectedModule.value = response.module ?? productDrawingDetail.value?.modules.find((entry) => entry.moduleKey === module.moduleKey) ?? null
        if (selectedDrawingItem.value?.itemId === item.itemId) selectedDrawingItem.value = null
        toast.success('本地上传资料已删除', { description: item.title })
        return true
      } catch {
        toast.error('删除失败，请确认后端服务可用并重新输入删除密码')
        return false
      }
    }
    if (trimmedPassword !== '123456') {
      toast.error('删除密码不正确')
      return false
    }
    const index = module.items.findIndex((entry) => entry.itemId === item.itemId)
    if (index < 0) return false
    const [removed] = module.items.splice(index, 1)
    module.status = module.items.length ? 'uploaded' : module.moduleKey === 'original_drawing' ? 'no_drawing' : 'pending'
    module.updatedAt = new Date().toISOString()
    if (selectedDrawingItem.value?.itemId === removed?.itemId) selectedDrawingItem.value = null
    toast.success('资料已删除', { description: removed?.title ?? module.moduleName })
    return true
  }
  function saveCurrentScroll(key: string) {
    const el = document.querySelector(`[data-scroll-key="${key}"]`)
    navigation.saveScrollPosition(key, el?.scrollTop ?? 0)
  }

  async function restoreScroll(key: string) {
    await nextTick()
    const el = document.querySelector(`[data-scroll-key="${key}"]`)
    if (el) el.scrollTop = navigation.restoreScrollPosition(key)
  }

  return {
    activeMode,
    searchKeyword,
    todayOrders,
    weekOrders,
    completedOrders,
    customers,
    productModels,
    selectedCustomer,
    selectedProduct,
    selectedModule,
    selectedDrawingItem,
    productDrawingDetail,
    drawingViewLevel,
    connectorRows,
    fixtureRows,
    selectedConnector,
    selectedFixture,
    connectorImportResult,
    connectorImportError,
    connectorMutationLoading,
    orderOverviewOpen,
    uploadDialogOpen,
    uploadDialogSource,
    orderSidebarCollapsed,
    connectorDetailOpen,
    fixtureDetailOpen,
    loading,
    currentSearchPlaceholder,
    visibleTodayOrders,
    visibleWeekOrders,
    initialize,
    loadOrders,
    completeOrder,
    updateOrderStatus,
    reopenOrder,
    loadCustomers,
    openCustomer,
    openProduct,
    openOrderProduct,
    openModule,
    openImageDetail,
    goBack,
    searchCurrentMode,
    loadConnectors,
    loadFixtures,
    setActiveMode,
    openTopUpload,
    openModuleUpload,
    openConnectorDetail,
    saveConnector,
    deleteConnector,
    importConnectorExcel,
    updateConnectorRemark,
    openFixtureDetail,
    uploadToModule,
    toggleOrderSidebar,
    deleteModuleCoverItem,
    deleteDrawingItem,
    saveCurrentScroll,
    restoreScroll,
  }
})
