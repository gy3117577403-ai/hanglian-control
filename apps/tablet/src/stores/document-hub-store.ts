import { defineStore } from 'pinia'
import { computed, nextTick, ref } from 'vue'
import { toast } from 'vue-sonner'
import {
  completeHubOrder,
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
  HubProductModel,
  ProductDrawingDetail,
} from '@/types/production'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function match(value: unknown, keyword: string) {
  return String(value ?? '').toLowerCase().includes(keyword)
}

function fileTypeFromFile(file?: File | null): DrawingItem['fileType'] {
  if (file?.type === 'application/pdf') return 'pdf'
  if (file?.type?.startsWith('image/')) return 'image'
  return 'card'
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
  const connectorDetailOpen = ref(false)
  const fixtureDetailOpen = ref(false)
  const loading = ref(false)
  const localOrders = ref<HubOrder[]>(clone(mockHubOrders))
  const localDetails = ref<ProductDrawingDetail[]>(clone(mockDrawingDetails))
  const localConnectors = ref<ConnectorParameter[]>(clone(mockConnectorParameters))
  const localFixtures = ref<FixtureParameter[]>(clone(mockFixtureParameters))

  const currentSearchPlaceholder = computed(() => {
    if (activeMode.value === 'connector') return '搜索连接器型号 / 端子型号 / 孔位数 / 厂家'
    if (activeMode.value === 'fixture') return '搜索治具编号 / 治具名称 / 工位 / 适用产品'
    return '搜索客户 / 产品型号 / 图纸 / SOP / 成品图'
  })

  const visibleTodayOrders = computed(() => todayOrders.value.filter((order) => !order.completed))
  const visibleWeekOrders = computed(() => weekOrders.value.filter((order) => !order.completed))

  async function initialize() {
    loading.value = true
    try {
      await Promise.all([loadOrders(), loadCustomers(), loadConnectors(), loadFixtures()])
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
      todayOrders.value = today
      weekOrders.value = week
      completedOrders.value = overview.completedOrders
    } catch {
      todayOrders.value = localOrders.value.filter((order) => order.scope === 'today' && !order.completed)
      weekOrders.value = localOrders.value.filter((order) => order.scope === 'week' && !order.completed)
      completedOrders.value = localOrders.value.filter((order) => order.completed)
    }
  }

  async function completeOrder(order: HubOrder) {
    try {
      await completeHubOrder(order.orderId)
    } catch {
      const local = localOrders.value.find((item) => item.orderId === order.orderId)
      if (local) {
        local.completed = true
        local.completedAt = new Date().toISOString()
      }
    }
    await loadOrders()
    toast.success('订单已完成', { description: order.productModel })
  }

  async function loadCustomers() {
    try {
      customers.value = await getHubCustomers()
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

  async function openProduct(product: HubProductModel, source: 'drawing' | 'orders' | 'search' = 'drawing') {
    saveCurrentScroll(drawingViewLevel.value)
    selectedProduct.value = product
    selectedModule.value = null
    selectedDrawingItem.value = null
    drawingViewLevel.value = 'product'
    if (source !== 'drawing') {
      navigation.pushReturnPoint({
        source,
        label: source === 'orders' ? '返回订单列表' : '返回搜索结果',
        state: { level: 'product', productId: product.productId },
        scrollKey: source,
      })
    }
    try {
      productDrawingDetail.value = await getHubProductDetail(product.productId)
    } catch {
      productDrawingDetail.value = localDetails.value.find((detail) => detail.product.productId === product.productId) ?? null
    }
    navigation.rememberBreadcrumb([
      { level: 'customers' },
      { level: 'products', customerId: selectedCustomer.value?.customerId ?? product.customerId },
      { level: 'product', productId: product.productId },
    ])
    await restoreScroll('product')
  }

  async function openOrderProduct(order: HubOrder) {
    activeMode.value = 'drawing'
    navigation.rememberFunction('drawing')
    const product = order.productId ? mockHubProducts.find((item) => item.productId === order.productId) : undefined
    if (product) {
      selectedCustomer.value = mockHubCustomers.find((customer) => customer.customerId === product.customerId) ?? null
      await openProduct(product, 'orders')
      return
    }
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
    productDrawingDetail.value = createMissingDetail(order)
    selectedCustomer.value = productDrawingDetail.value.customer ?? null
    selectedProduct.value = productDrawingDetail.value.product
    drawingViewLevel.value = 'product'
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
    try {
      connectorRows.value = await getHubConnectors(q)
    } catch {
      const keyword = q.trim().toLowerCase()
      connectorRows.value = localConnectors.value.filter((item) => !keyword || [
        item.connectorModel,
        item.terminalModel,
        item.pinCount,
        item.manufacturer,
        item.processSegment,
      ].some((value) => match(value, keyword)))
    }
  }

  async function loadFixtures(q = '') {
    try {
      fixtureRows.value = await getHubFixtures(q)
    } catch {
      const keyword = q.trim().toLowerCase()
      fixtureRows.value = localFixtures.value.filter((item) => !keyword || [
        item.fixtureCode,
        item.fixtureName,
        item.station,
        item.applicableProduct,
      ].some((value) => match(value, keyword)))
    }
  }

  function setActiveMode(mode: HubMode) {
    activeMode.value = mode
    navigation.rememberFunction(mode)
    searchKeyword.value = ''
    if (mode === 'drawing' && !productDrawingDetail.value) drawingViewLevel.value = 'customers'
    if (mode === 'connector') void loadConnectors()
    if (mode === 'fixture') void loadFixtures()
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
    if (!productDrawingDetail.value || !selectedModule.value) return
    const moduleKey = payload.moduleKey ?? selectedModule.value.moduleKey
    try {
      await uploadHubDrawingItem(productDrawingDetail.value.product.productId, moduleKey, payload)
    } catch {
      // Local fallback below.
    }
    const module = productDrawingDetail.value.modules.find((item) => item.moduleKey === moduleKey)
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
    uploadDialogOpen.value = false
    toast.success('资料已补充到当前产品模块', { description: `${module.moduleName} / ${payload.title}` })
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
    connectorDetailOpen,
    fixtureDetailOpen,
    loading,
    currentSearchPlaceholder,
    visibleTodayOrders,
    visibleWeekOrders,
    initialize,
    loadOrders,
    completeOrder,
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
    openConnectorDetail,
    openFixtureDetail,
    uploadToModule,
    saveCurrentScroll,
    restoreScroll,
  }
})
