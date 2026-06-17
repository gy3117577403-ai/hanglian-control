import { defineStore } from 'pinia'
import { computed, nextTick, ref } from 'vue'
import { toast } from 'vue-sonner'
import {
  completeHubOrder,
  deleteHubDrawingItem,
  getHubCustomers,
  getHubOrderOverview,
  getHubOrders,
  getHubProductByModel,
  getHubProductDetail,
  getHubProducts,
  getHubConnectors,
  getHubFixtures,
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
    if (activeMode.value === 'connector') return '搜索连接器型号、端子型号、孔位数、厂家'
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
    const localMatches = localConnectors.value.filter((item) => !keyword || [
      item.connectorModel,
      item.terminalModel,
      item.pinCount,
      item.manufacturer,
      item.processSegment,
    ].some((value) => match(value, keyword)))
    try {
      connectorRows.value = withFallback(await getHubConnectors(q), localMatches)
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
    openFixtureDetail,
    uploadToModule,
    toggleOrderSidebar,
    deleteModuleCoverItem,
    deleteDrawingItem,
    saveCurrentScroll,
    restoreScroll,
  }
})
