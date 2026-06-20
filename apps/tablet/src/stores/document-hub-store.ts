import { defineStore } from 'pinia'
import { computed, nextTick, ref } from 'vue'
import { toast } from 'vue-sonner'
import {
  applyDrawingPdfImport,
  completeHubOrder,
  createHubConnector,
  deleteHubConnector,
  getDrawingPdfImportBatch,
  getDeleteLockStatus,
  getDrawingTrash,
  getHubCustomers,
  getHubOrderOverview,
  getHubOrders,
  getHubProductByModel,
  getHubProductDetail,
  getHubProducts,
  getHubConnectors,
  getHubFixtures,
  importHubConnectors,
  previewDrawingPdfImport,
  purgeDrawingDocument,
  restoreDrawingDocument,
  trashDrawingDocument,
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
  DocumentHubUploadContext,
  DocumentHubUploadItem,
  DocumentHubUploadProgress,
  DocumentHubUploadPayload,
  DocumentHubUploadResult,
  DocumentHubUploadSource,
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
import type {
  PdfImportApplyRequest,
  PdfImportApplyResponse,
  PdfImportEditableItemPatch,
  PdfImportPreviewItemState,
  PdfImportPreviewResponse,
} from '@/types/pdf-import'
import type {
  DeleteLockStatus,
  DrawingLifecycleResponse,
  DrawingTrashItem,
  PurgeDocumentPayload,
  RestoreDocumentPayload,
  TrashDocumentPayload,
  TrashQuery,
} from '@/types/document-lifecycle'

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

const PDF_IMPORT_MAX_FILES = 50
const PDF_IMPORT_MAX_FILE_SIZE = 30 * 1024 * 1024
const pdfImportItemPatchFields = ['selected', 'confirmedProductModel', 'confirmedVersion', 'productName', 'setAsEffective'] as const
const UPLOAD_MAX_FILE_SIZE = 30 * 1024 * 1024
const UPLOAD_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const LIFECYCLE_MUTABLE_SOURCES = ['manual_upload', 'camera_capture', 'pdf_import'] as const
const PLACEHOLDER_SOURCE_HINT = '该资料为系统占位资料，暂不支持删除。'
const DEFAULT_TRASH_FILTERS: TrashQuery = { limit: 20, offset: 0 }

function cleanText(value: unknown) {
  return String(value ?? '').trim()
}

function lifecycleDocumentId(item?: DrawingItem | DrawingTrashItem | null) {
  if (!item) return ''
  if ('documentId' in item && item.documentId) return item.documentId
  if ('itemId' in item && item.itemId) return item.itemId
  return ''
}

function isFormalLifecycleDrawingItem(item?: DrawingItem | null) {
  return Boolean(item && LIFECYCLE_MUTABLE_SOURCES.includes(item.source as typeof LIFECYCLE_MUTABLE_SOURCES[number]))
}

function lifecycleErrorMessage(error: unknown, fallback = '网络连接失败，请检查网络。') {
  const value = error as {
    data?: { message?: string | string[]; error?: string }
    response?: { _data?: { message?: string | string[]; error?: string } }
    message?: string
  }
  const raw = value?.data?.message
    ?? value?.response?._data?.message
    ?? value?.data?.error
    ?? value?.response?._data?.error
    ?? value?.message
  const message = Array.isArray(raw) ? raw.join('；') : cleanText(raw)
  if (!message || /Failed to fetch|NetworkError|timeout|fetch/i.test(message)) return fallback
  return message
}

function mergeTrashFilters(current: TrashQuery, patch?: TrashQuery): TrashQuery {
  const next = {
    ...current,
    ...(patch ?? {}),
  }
  return {
    customerId: cleanText(next.customerId) || undefined,
    productId: cleanText(next.productId) || undefined,
    moduleKey: cleanText(next.moduleKey) || undefined,
    keyword: cleanText(next.keyword) || undefined,
    limit: Number(next.limit ?? DEFAULT_TRASH_FILTERS.limit),
    offset: Number(next.offset ?? DEFAULT_TRASH_FILTERS.offset),
  }
}

function uploadItemId() {
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function titleFromFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').trim() || '未命名资料'
}

function isSupportedUploadFile(file: File) {
  return UPLOAD_ALLOWED_TYPES.includes(file.type)
}

function uploadFileError(file: File) {
  if (!isSupportedUploadFile(file)) return '仅支持 PDF、JPG、PNG 和 WEBP 文件。'
  if (file.size <= 0) return `文件内容为空：${file.name}`
  if (file.size > UPLOAD_MAX_FILE_SIZE) return `文件超过 30 MB：${file.name}`
  return ''
}

function pdfImportErrorMessage(error: unknown, fallback = 'PDF 导入请求失败，请检查网络连接。') {
  const value = error as {
    data?: { message?: string | string[]; error?: string; statusCode?: number }
    response?: { _data?: { message?: string | string[]; error?: string; statusCode?: number } }
    message?: string
  }
  const raw = value?.data?.message
    ?? value?.response?._data?.message
    ?? value?.data?.error
    ?? value?.response?._data?.error
    ?? value?.message
  const message = Array.isArray(raw) ? raw.join('；') : cleanText(raw)
  if (!message || /Failed to fetch|NetworkError|timeout|fetch/i.test(message)) return fallback
  return message
}

function isPdfFile(file: File) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

function normalizePdfImportFiles(files: readonly File[] | FileList) {
  const input = Array.from(files)
  const seenRefs = new Set<File>()
  const seenKeys = new Set<string>()
  const result: File[] = []
  for (const file of input) {
    if (seenRefs.has(file)) continue
    seenRefs.add(file)
    const key = `${file.name}::${file.size}`
    if (seenKeys.has(key)) continue
    seenKeys.add(key)
    result.push(file)
  }
  return result
}

function toPdfImportItemState(
  item: PdfImportPreviewResponse['items'][number],
  previous?: PdfImportPreviewItemState,
): PdfImportPreviewItemState {
  return {
    ...item,
    selected: previous?.selected ?? (item.action !== 'skip_duplicate' && item.action !== 'skip' && item.action !== 'error'),
    confirmedProductModel: previous?.confirmedProductModel ?? item.confirmedProductModel ?? item.parsedProductModel,
    confirmedVersion: previous?.confirmedVersion ?? item.parsedVersion,
    productName: previous?.productName,
    setAsEffective: previous?.setAsEffective ?? item.action === 'create_product',
  }
}

function pickPdfImportItemPatch(patch: PdfImportEditableItemPatch | Record<string, unknown>): PdfImportEditableItemPatch {
  const next: PdfImportEditableItemPatch = {}
  for (const field of pdfImportItemPatchFields) {
    if (!(field in patch)) continue
    const value = (patch as Record<string, unknown>)[field]
    if (field === 'selected') next.selected = Boolean(value)
    if (field === 'setAsEffective') next.setAsEffective = Boolean(value)
    if (field === 'confirmedProductModel') next.confirmedProductModel = typeof value === 'string' ? value : cleanText(value)
    if (field === 'confirmedVersion') next.confirmedVersion = typeof value === 'string' ? value : cleanText(value)
    if (field === 'productName') next.productName = typeof value === 'string' ? value : cleanText(value)
  }
  return next
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
  const documentViewerOpen = ref(false)
  const documentViewerInitialItemId = ref('')
  const documentViewerReturnLevel = ref<DrawingViewLevel>('product')
  const connectorRows = ref<ConnectorParameter[]>([])
  const fixtureRows = ref<FixtureParameter[]>([])
  const selectedConnector = ref<ConnectorParameter | null>(null)
  const selectedFixture = ref<FixtureParameter | null>(null)
  const connectorImportResult = ref<ConnectorImportResult | null>(null)
  const connectorImportError = ref('')
  const connectorMutationLoading = ref(false)
  const pdfImportPreview = ref<PdfImportPreviewResponse | null>(null)
  const pdfImportBatchId = ref('')
  const pdfImportPreviewLoading = ref(false)
  const pdfImportApplyLoading = ref(false)
  const pdfImportBatchLoading = ref(false)
  const pdfImportError = ref('')
  const pdfImportSelectedCustomerId = ref<string | null>(null)
  const pdfImportFiles = ref<File[]>([])
  const pdfImportItems = ref<PdfImportPreviewItemState[]>([])
  const pdfImportApplyResult = ref<PdfImportApplyResponse | null>(null)
  const pdfImportLastUpdatedAt = ref<string | null>(null)
  const orderOverviewOpen = ref(false)
  const uploadDialogOpen = ref(false)
  const uploadDialogSource = ref<'top' | 'module'>('top')
  const uploadContext = ref<DocumentHubUploadContext>({ entry: 'top' })
  const uploadSource = ref<DocumentHubUploadSource | null>(null)
  const uploadFiles = ref<File[]>([])
  const capturedPhotos = ref<File[]>([])
  const uploadItems = ref<DocumentHubUploadItem[]>([])
  const uploadProgress = ref<DocumentHubUploadProgress>({ total: 0, completed: 0, failed: 0 })
  const uploadLoading = ref(false)
  const uploadError = ref('')
  const uploadResult = ref<DocumentHubUploadResult | null>(null)
  const cameraActive = ref(false)
  const cameraPermission = ref<'idle' | 'prompt' | 'granted' | 'denied' | 'unsupported'>('idle')
  const drawingTrashItems = ref<DrawingTrashItem[]>([])
  const drawingTrashLoading = ref(false)
  const drawingTrashError = ref('')
  const drawingTrashFilters = ref<TrashQuery>({ ...DEFAULT_TRASH_FILTERS })
  const drawingTrashTotal = ref(0)
  const drawingTrashDialogOpen = ref(false)
  const lifecycleActionLoading = ref(false)
  const lifecycleActionDocumentId = ref('')
  const lifecycleError = ref('')
  const deleteLockStatus = ref<DeleteLockStatus | null>(null)
  const deleteLockLoading = ref(false)
  const pendingTrashItem = ref<DrawingItem | null>(null)
  const pendingTrashModule = ref<DrawingModule | null>(null)
  const pendingPurgeItem = ref<DrawingTrashItem | null>(null)
  const lastLifecycleResult = ref<DrawingLifecycleResponse | null>(null)
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

  function resetDocumentViewerState() {
    documentViewerOpen.value = false
    documentViewerInitialItemId.value = ''
    selectedDrawingItem.value = null
  }

  function isDeletedDrawingItem(item: DrawingItem) {
    return Boolean(item.deleted || item.deletedAt)
  }

  function drawingItemDate(item: DrawingItem) {
    return new Date(item.uploadedAt || '').getTime() || 0
  }

  function latestDrawingItems(items: DrawingItem[]) {
    return [...items].sort((a, b) => drawingItemDate(b) - drawingItemDate(a))
  }

  function selectViewerInitialItem(module: DrawingModule, item?: DrawingItem | null) {
    if (item && !isDeletedDrawingItem(item)) return item
    const activeItems = module.items.filter((entry) => !isDeletedDrawingItem(entry))
    const candidateItems = activeItems.some((entry) => Boolean(entry.previewUrl))
      ? activeItems.filter((entry) => Boolean(entry.previewUrl))
      : activeItems
    const coverId = module.coverDocumentId
    if (coverId) {
      const cover = candidateItems.find((entry) => entry.itemId === coverId || entry.documentId === coverId)
      if (cover) return cover
    }
    const effective = latestDrawingItems(candidateItems.filter((entry) => (entry.documentStatus ?? entry.status) === 'effective'))[0]
    if (effective) return effective
    const preferred = latestDrawingItems(candidateItems.filter((entry) => (
      entry.source === 'manual_upload' || entry.source === 'camera_capture' || entry.source === 'pdf_import'
    )))[0]
    return preferred ?? latestDrawingItems(candidateItems)[0] ?? candidateItems[0] ?? null
  }

  async function openCustomer(customer: HubCustomer) {
    saveCurrentScroll('customers')
    resetDocumentViewerState()
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
    resetDocumentViewerState()
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
    resetDocumentViewerState()
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
    resetDocumentViewerState()
    selectedModule.value = module
    selectedDrawingItem.value = null
    drawingViewLevel.value = 'module'
    navigation.rememberBreadcrumb([
      ...navigation.drawingBreadcrumb,
      { level: 'module', productId: selectedProduct.value?.productId, moduleKey: module.moduleKey },
    ])
    void restoreScroll('module')
  }

  function openModuleViewer(module: DrawingModule, item?: DrawingItem | null) {
    saveCurrentScroll(drawingViewLevel.value)
    selectedModule.value = module
    const initialItem = selectViewerInitialItem(module, item)
    selectedDrawingItem.value = initialItem
    documentViewerInitialItemId.value = initialItem?.itemId ?? initialItem?.documentId ?? ''
    documentViewerReturnLevel.value = drawingViewLevel.value
    documentViewerOpen.value = true
    navigation.rememberBreadcrumb([
      ...navigation.drawingBreadcrumb,
      { level: 'image', productId: selectedProduct.value?.productId, moduleKey: module.moduleKey, itemId: initialItem?.itemId },
    ])
  }

  function openImageDetail(item: DrawingItem) {
    if (selectedModule.value) {
      openModuleViewer(selectedModule.value, item)
      return
    }
    selectedDrawingItem.value = item
    documentViewerInitialItemId.value = item.itemId
    documentViewerReturnLevel.value = drawingViewLevel.value
    documentViewerOpen.value = true
  }

  async function closeDocumentViewer() {
    documentViewerOpen.value = false
    documentViewerInitialItemId.value = ''
    selectedDrawingItem.value = null
    if (documentViewerReturnLevel.value === 'product') selectedModule.value = null
    await restoreScroll(documentViewerReturnLevel.value)
  }

  async function goBack() {
    if (documentViewerOpen.value) {
      await closeDocumentViewer()
      return
    }
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
    resetDocumentViewerState()
    selectedConnector.value = null
    selectedFixture.value = null
    selectedModule.value = null
    selectedDrawingItem.value = null
    if (mode === 'drawing' && !productDrawingDetail.value) drawingViewLevel.value = 'customers'
    if (mode === 'connector') void loadConnectors()
    if (mode === 'fixture') void loadFixtures()
  }

  function revokeUploadItem(item: DocumentHubUploadItem) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
  }

  function resetUploadState() {
    uploadItems.value.forEach(revokeUploadItem)
    uploadSource.value = null
    uploadFiles.value = []
    capturedPhotos.value = []
    uploadItems.value = []
    uploadProgress.value = { total: 0, completed: 0, failed: 0 }
    uploadLoading.value = false
    uploadError.value = ''
    uploadResult.value = null
    cameraActive.value = false
    cameraPermission.value = 'idle'
  }

  function setUploadSource(source: DocumentHubUploadSource) {
    uploadSource.value = source
  }

  function makeUploadItem(file: File, source: 'manual_upload' | 'camera_capture'): DocumentHubUploadItem {
    const error = uploadFileError(file)
    return {
      id: uploadItemId(),
      file,
      source,
      captureSource: source === 'camera_capture' ? 'environment_camera' : undefined,
      title: titleFromFileName(file.name),
      version: '',
      keywords: '',
      remark: '',
      previewUrl: isSupportedUploadFile(file) && file.size > 0 ? URL.createObjectURL(file) : '',
      fileType: file.type === 'application/pdf' ? 'pdf' : 'image',
      status: error ? 'error' : 'ready',
      progress: 0,
      error,
    }
  }

  function appendUploadFiles(files: readonly File[], source: 'manual_upload' | 'camera_capture') {
    uploadError.value = ''
    let duplicateCount = 0
    const existingKeys = new Set(uploadItems.value.map((item) => (
      `${item.file.name}::${item.file.size}::${item.file.lastModified}`
    )))
    const nextItems: DocumentHubUploadItem[] = []
    for (const file of files) {
      const key = `${file.name}::${file.size}::${file.lastModified}`
      if (existingKeys.has(key)) {
        duplicateCount += 1
        continue
      }
      existingKeys.add(key)
      nextItems.push(makeUploadItem(file, source))
    }
    if (source === 'manual_upload') uploadFiles.value = [...uploadFiles.value, ...nextItems.map((item) => item.file)]
    if (source === 'camera_capture') capturedPhotos.value = [...capturedPhotos.value, ...nextItems.map((item) => item.file)]
    uploadItems.value = [...uploadItems.value, ...nextItems]
    if (duplicateCount) uploadError.value = '已忽略重复选择的文件。'
  }

  function addSelectedFiles(files: readonly File[] | FileList) {
    appendUploadFiles(Array.from(files), 'manual_upload')
  }

  function addCapturedPhoto(file: File) {
    appendUploadFiles([file], 'camera_capture')
  }

  function removeUploadItem(itemId: string) {
    const target = uploadItems.value.find((item) => item.id === itemId)
    if (target) revokeUploadItem(target)
    uploadItems.value = uploadItems.value.filter((item) => item.id !== itemId)
    uploadFiles.value = uploadItems.value.filter((item) => item.source === 'manual_upload').map((item) => item.file)
    capturedPhotos.value = uploadItems.value.filter((item) => item.source === 'camera_capture').map((item) => item.file)
  }

  function updateUploadItemMetadata(itemId: string, patch: Partial<Pick<DocumentHubUploadItem, 'title' | 'version' | 'keywords' | 'remark'>>) {
    const target = uploadItems.value.find((item) => item.id === itemId)
    if (!target) return
    Object.assign(target, patch)
  }

  function openTopUpload() {
    uploadDialogSource.value = 'top'
    uploadContext.value = {
      entry: 'top',
      customerId: productDrawingDetail.value?.customer?.customerId ?? selectedCustomer.value?.customerId,
      productId: productDrawingDetail.value?.product.productId ?? selectedProduct.value?.productId,
      moduleKey: selectedModule.value?.moduleKey ?? 'original_drawing',
    }
    resetUploadState()
    uploadDialogOpen.value = true
  }

  function openModuleUpload(module: DrawingModule) {
    selectedModule.value = module
    uploadDialogSource.value = 'module'
    uploadContext.value = {
      entry: 'module',
      customerId: productDrawingDetail.value?.customer?.customerId ?? selectedCustomer.value?.customerId,
      productId: productDrawingDetail.value?.product.productId ?? selectedProduct.value?.productId,
      moduleKey: module.moduleKey,
    }
    resetUploadState()
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

  function clearPdfImportSession(keepCustomer = false) {
    pdfImportPreview.value = null
    pdfImportBatchId.value = ''
    pdfImportFiles.value = []
    pdfImportItems.value = []
    pdfImportApplyResult.value = null
    pdfImportError.value = ''
    pdfImportLastUpdatedAt.value = null
    if (!keepCustomer) pdfImportSelectedCustomerId.value = null
  }

  function setPdfImportCustomer(customerId: string | null) {
    const nextCustomerId = cleanText(customerId) || null
    if (pdfImportSelectedCustomerId.value !== nextCustomerId) {
      clearPdfImportSession(true)
      pdfImportSelectedCustomerId.value = nextCustomerId
    }
  }

  function setPdfImportFiles(files: readonly File[] | FileList) {
    const nextFiles = normalizePdfImportFiles(files)
    const nonPdf = nextFiles.find((file) => !isPdfFile(file))
    if (nonPdf) {
      pdfImportError.value = '仅支持 PDF 图纸文件。'
      return false
    }
    if (nextFiles.length > PDF_IMPORT_MAX_FILES) {
      pdfImportError.value = '单次最多选择 50 个 PDF 文件。'
      return false
    }
    const oversized = nextFiles.find((file) => file.size > PDF_IMPORT_MAX_FILE_SIZE)
    if (oversized) {
      pdfImportError.value = `文件超过 30 MB：${oversized.name}`
      return false
    }
    pdfImportFiles.value = nextFiles
    pdfImportPreview.value = null
    pdfImportBatchId.value = ''
    pdfImportItems.value = []
    pdfImportApplyResult.value = null
    pdfImportError.value = ''
    pdfImportLastUpdatedAt.value = null
    return true
  }

  function savePdfImportPreview(response: PdfImportPreviewResponse) {
    const previousItems = new Map(pdfImportItems.value.map((item) => [item.importItemId, item]))
    pdfImportPreview.value = response
    pdfImportBatchId.value = response.importBatchId
    pdfImportSelectedCustomerId.value = response.customer.customerId
    pdfImportItems.value = response.items.map((item) => toPdfImportItemState(item, previousItems.get(item.importItemId)))
    pdfImportLastUpdatedAt.value = new Date().toISOString()
  }

  async function previewPdfImport() {
    if (!pdfImportSelectedCustomerId.value) {
      pdfImportError.value = '请选择客户。'
      return null
    }
    if (!pdfImportFiles.value.length) {
      pdfImportError.value = '请选择 PDF 图纸文件。'
      return null
    }
    pdfImportPreviewLoading.value = true
    pdfImportError.value = ''
    pdfImportApplyResult.value = null
    try {
      const response = await previewDrawingPdfImport(pdfImportSelectedCustomerId.value, pdfImportFiles.value)
      savePdfImportPreview(response)
      return response
    } catch (error) {
      pdfImportPreview.value = null
      pdfImportBatchId.value = ''
      pdfImportItems.value = []
      pdfImportError.value = pdfImportErrorMessage(error)
      return null
    } finally {
      pdfImportPreviewLoading.value = false
    }
  }

  async function loadPdfImportBatch(importBatchId: string) {
    const cleanImportBatchId = cleanText(importBatchId)
    if (!cleanImportBatchId) {
      pdfImportError.value = 'PDF 导入预览记录不存在。'
      return null
    }
    pdfImportBatchLoading.value = true
    pdfImportError.value = ''
    try {
      const response = await getDrawingPdfImportBatch(cleanImportBatchId)
      savePdfImportPreview(response)
      return response
    } catch (error) {
      pdfImportError.value = pdfImportErrorMessage(error)
      return null
    } finally {
      pdfImportBatchLoading.value = false
    }
  }

  function updatePdfImportItem(importItemId: string, patch: PdfImportEditableItemPatch | Record<string, unknown>) {
    const cleanImportItemId = cleanText(importItemId)
    const safePatch = pickPdfImportItemPatch(patch)
    pdfImportItems.value = pdfImportItems.value.map((item) => (
      item.importItemId === cleanImportItemId ? { ...item, ...safePatch } : item
    ))
  }

  function isPdfImportPreviewExpired() {
    if (pdfImportPreview.value?.status === 'expired') return true
    const expiresAt = pdfImportPreview.value?.expiresAt
    return Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now())
  }

  function makePdfImportApplyPayload(): PdfImportApplyRequest {
    const selectedItems = pdfImportItems.value.filter((item) => item.selected)
    return {
      importBatchId: pdfImportBatchId.value,
      items: selectedItems.map((item) => {
        const confirmedProductModel = cleanText(item.confirmedProductModel || item.parsedProductModel)
        const confirmedVersion = cleanText(item.confirmedVersion || item.parsedVersion)
        const productName = cleanText(item.productName)
        return {
          importItemId: item.importItemId,
          selected: true,
          ...(confirmedProductModel ? { confirmedProductModel } : {}),
          ...(confirmedVersion ? { confirmedVersion } : {}),
          ...(productName ? { productName } : {}),
          ...(typeof item.setAsEffective === 'boolean' ? { setAsEffective: item.setAsEffective } : {}),
        }
      }),
    }
  }

  async function refreshDrawingDataAfterPdfApply(result: PdfImportApplyResponse) {
    const customerId = result.customer.customerId
    await loadCustomers()
    if (selectedCustomer.value?.customerId === customerId || pdfImportSelectedCustomerId.value === customerId) {
      try {
        productModels.value = await getHubProducts(customerId)
      } catch {
        // Keep the current view unchanged if the refresh fails after a successful apply.
      }
    }

    const affectedProductIds = new Set(result.items.map((item) => item.productId).filter(Boolean) as string[])
    const currentProductId = selectedProduct.value?.productId
    if (!currentProductId || !affectedProductIds.has(currentProductId)) return
    try {
      const detail = await getHubProductDetail(currentProductId)
      productDrawingDetail.value = detail
      selectedProduct.value = detail.product
      if (selectedModule.value) {
        selectedModule.value = detail.modules.find((module) => module.moduleKey === selectedModule.value?.moduleKey) ?? selectedModule.value
      }
    } catch {
      // The apply result remains authoritative; a failed refresh should not create local fake data.
    }
  }

  async function applyPdfImport() {
    if (pdfImportApplyLoading.value) {
      pdfImportError.value = '不允许重复点击。'
      return null
    }
    if (!pdfImportBatchId.value) {
      pdfImportError.value = 'PDF 导入预览记录不存在。'
      return null
    }
    if (isPdfImportPreviewExpired()) {
      pdfImportError.value = 'PDF 导入预览已过期，请重新选择文件。'
      return null
    }
    const selectedItems = pdfImportItems.value.filter((item) => item.selected)
    if (!selectedItems.length) {
      pdfImportError.value = '请至少选择一项需要导入的 PDF。'
      return null
    }
    const unconfirmedItem = selectedItems.find((item) => (
      (item.needsConfirmation || item.action === 'needs_confirmation') &&
      !cleanText(item.confirmedProductModel)
    ))
    if (unconfirmedItem) {
      pdfImportError.value = '请先确认所有待确认文件的产品型号。'
      return null
    }

    pdfImportApplyLoading.value = true
    pdfImportError.value = ''
    try {
      const response = await applyDrawingPdfImport(makePdfImportApplyPayload())
      pdfImportApplyResult.value = response
      pdfImportLastUpdatedAt.value = new Date().toISOString()
      if (response.status === 'partially_applied') {
        pdfImportError.value = 'PDF 导入部分完成，请检查失败项。'
      } else if (response.status === 'failed') {
        pdfImportError.value = 'PDF 导入失败，请检查失败项。'
      }
      await refreshDrawingDataAfterPdfApply(response)
      return response
    } catch (error) {
      pdfImportError.value = pdfImportErrorMessage(error)
      return null
    } finally {
      pdfImportApplyLoading.value = false
    }
  }

  function resetPdfImport() {
    clearPdfImportSession(false)
  }

  async function retryPdfImportBatch() {
    if (!pdfImportFiles.value.length) {
      pdfImportError.value = '请重新选择 PDF 图纸文件。'
      return null
    }
    return previewPdfImport()
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

  async function uploadAllItems(input?: { customerId?: string; productId?: string; moduleKey?: DrawingModuleKey; retryFailedOnly?: boolean }) {
    const productId = input?.productId ?? uploadContext.value.productId ?? productDrawingDetail.value?.product.productId
    const moduleKey = input?.moduleKey ?? uploadContext.value.moduleKey ?? selectedModule.value?.moduleKey
    const customerId = input?.customerId ?? uploadContext.value.customerId ?? productDrawingDetail.value?.customer?.customerId ?? selectedCustomer.value?.customerId
    uploadError.value = ''
    uploadResult.value = null
    if (!customerId) {
      uploadError.value = '请选择客户。'
      return null
    }
    if (!productId) {
      uploadError.value = '请选择产品型号。'
      return null
    }
    if (!moduleKey) {
      uploadError.value = '请选择资料模块。'
      return null
    }
    const invalid = uploadItems.value.find((item) => item.status === 'error' || !item.title.trim())
    if (invalid) {
      uploadError.value = invalid.status === 'error' ? (invalid.error || '请先移除无法上传的文件。') : '请填写所有待上传资料的标题。'
      return null
    }
    const candidates = uploadItems.value.filter((item) => (
      input?.retryFailedOnly ? item.status === 'failed' : item.status === 'ready' || item.status === 'failed'
    ))
    if (!candidates.length) {
      uploadError.value = '请选择需要上传的资料。'
      return null
    }
    uploadLoading.value = true
    uploadProgress.value = { total: candidates.length, completed: 0, failed: 0 }
    let latestDetail: ProductDrawingDetail | null = null
    try {
      for (const item of candidates) {
        item.status = 'uploading'
        item.progress = 20
        item.error = ''
        try {
          const response = await uploadHubDrawingItem(productId, moduleKey, {
            customerId,
            productId,
            moduleKey,
            title: item.title.trim(),
            version: item.version.trim(),
            keywords: item.keywords.trim(),
            remark: item.remark.trim(),
            source: item.source,
            captureSource: item.captureSource,
            file: item.file,
          })
          item.status = 'success'
          item.progress = 100
          item.resultItemId = response.item.itemId
          if (response.detail) {
            latestDetail = response.detail
            productDrawingDetail.value = response.detail
          }
          const persistedModule = response.detail?.modules.find((module) => module.moduleKey === moduleKey) ?? response.module
          if (persistedModule) selectedModule.value = persistedModule
          selectedDrawingItem.value = response.item
          uploadProgress.value.completed += 1
        } catch (error) {
          item.status = 'failed'
          item.progress = 0
          item.error = pdfImportErrorMessage(error, '资料上传失败，请检查文件或网络。')
          uploadProgress.value.failed += 1
        }
      }
      const successCount = uploadProgress.value.completed
      const failedCount = uploadProgress.value.failed
      uploadResult.value = {
        status: failedCount === 0 ? 'success' : successCount > 0 ? 'partial' : 'failed',
        successCount,
        failedCount,
        total: candidates.length,
        message: failedCount === 0 ? '资料上传成功。' : successCount > 0 ? '部分资料上传失败，请查看明细。' : '资料上传失败，请检查文件或网络。',
      }
      if (failedCount === 0) {
        toast.success('资料上传成功。')
      } else {
        uploadError.value = uploadResult.value.message
        toast.error(uploadResult.value.message)
      }
      return latestDetail ?? productDrawingDetail.value
    } finally {
      uploadLoading.value = false
    }
  }

  function retryFailedItems(input?: { customerId?: string; productId?: string; moduleKey?: DrawingModuleKey }) {
    return uploadAllItems({ ...input, retryFailedOnly: true })
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
      toast.success('资料上传成功。', { description: `${persistedModule?.moduleName ?? moduleKey} / ${response.item.title}` })
      return
    } catch (error) {
      toast.error(pdfImportErrorMessage(error, '资料上传失败，请检查文件或网络。'))
      throw error
    }
  }

  function toggleOrderSidebar() {
    orderSidebarCollapsed.value = !orderSidebarCollapsed.value
  }

  function clearLifecycleError() {
    lifecycleError.value = ''
  }

  async function loadDeleteLockStatus() {
    deleteLockLoading.value = true
    try {
      deleteLockStatus.value = await getDeleteLockStatus()
      return deleteLockStatus.value
    } catch (error) {
      const message = lifecycleErrorMessage(error)
      lifecycleError.value = message
      toast.error(message)
      throw error
    } finally {
      deleteLockLoading.value = false
    }
  }

  async function loadDrawingTrash(filters?: TrashQuery) {
    const nextFilters = mergeTrashFilters(drawingTrashFilters.value, filters)
    drawingTrashFilters.value = nextFilters
    drawingTrashLoading.value = true
    drawingTrashError.value = ''
    try {
      const response = await getDrawingTrash(nextFilters)
      drawingTrashItems.value = response.items
      drawingTrashTotal.value = response.total
      drawingTrashFilters.value = {
        ...nextFilters,
        limit: response.limit,
        offset: response.offset,
      }
      return response
    } catch (error) {
      const message = lifecycleErrorMessage(error)
      drawingTrashError.value = message
      throw error
    } finally {
      drawingTrashLoading.value = false
    }
  }

  async function openDrawingTrash() {
    drawingTrashDialogOpen.value = true
    await loadDrawingTrash({ ...drawingTrashFilters.value, offset: drawingTrashFilters.value.offset ?? 0 })
  }

  function closeDrawingTrash() {
    drawingTrashDialogOpen.value = false
    pendingPurgeItem.value = null
  }

  async function prepareTrashDocument(item: DrawingItem, module: DrawingModule) {
    clearLifecycleError()
    if (!isFormalLifecycleDrawingItem(item)) {
      toast.warning(PLACEHOLDER_SOURCE_HINT)
      return false
    }
    pendingTrashItem.value = item
    pendingTrashModule.value = module
    try {
      await loadDeleteLockStatus()
    } catch {
      // The dialog can still show the network or lock error from lifecycleError.
    }
    return true
  }

  function closeMoveToTrashDialog() {
    pendingTrashItem.value = null
    pendingTrashModule.value = null
  }

  function applyLifecycleResponse(response: DrawingLifecycleResponse) {
    lastLifecycleResult.value = response
    if (response.detail) {
      productDrawingDetail.value = response.detail
      selectedProduct.value = response.detail.product
      if (selectedModule.value) {
        selectedModule.value = response.detail.modules.find((item) => item.moduleKey === selectedModule.value?.moduleKey) ?? null
      }
    } else {
      if (response.product) selectedProduct.value = response.product
      if (response.module && selectedModule.value?.moduleKey === response.module.moduleKey) selectedModule.value = response.module
    }
  }

  function isCurrentViewerTarget(item: DrawingItem | DrawingTrashItem) {
    const targetId = lifecycleDocumentId(item)
    const selectedId = lifecycleDocumentId(selectedDrawingItem.value)
    return Boolean(targetId && selectedId && targetId === selectedId)
  }

  async function closeViewerIfLifecycleTarget(item: DrawingItem | DrawingTrashItem) {
    if (!isCurrentViewerTarget(item)) return
    documentViewerOpen.value = false
    documentViewerInitialItemId.value = ''
    selectedDrawingItem.value = null
    await restoreScroll(documentViewerReturnLevel.value)
  }

  async function refreshCurrentProduct(productId?: string, moduleKey?: DrawingModuleKey) {
    const targetProductId = productId ?? productDrawingDetail.value?.product.productId ?? selectedProduct.value?.productId
    if (!targetProductId) return
    const detail = await getHubProductDetail(targetProductId)
    productDrawingDetail.value = detail
    selectedProduct.value = detail.product
    if (moduleKey || selectedModule.value) {
      const targetModuleKey = moduleKey ?? selectedModule.value?.moduleKey
      selectedModule.value = detail.modules.find((item) => item.moduleKey === targetModuleKey) ?? null
    }
    const selectedId = lifecycleDocumentId(selectedDrawingItem.value)
    if (selectedId) {
      const stillExists = detail.modules.some((module) => module.items.some((item) => lifecycleDocumentId(item) === selectedId))
      if (!stillExists) selectedDrawingItem.value = null
    }
  }

  async function refreshProductList(customerId?: string) {
    const targetCustomerId = customerId ?? selectedCustomer.value?.customerId ?? productDrawingDetail.value?.customer?.customerId
    if (!targetCustomerId) return
    if (selectedCustomer.value?.customerId === targetCustomerId || productDrawingDetail.value?.customer?.customerId === targetCustomerId) {
      productModels.value = await getHubProducts(targetCustomerId)
    }
  }

  async function refreshAfterDocumentLifecycle(item: DrawingItem | DrawingTrashItem) {
    const productId = 'productId' in item ? item.productId : productDrawingDetail.value?.product.productId
    const customerId = 'customerId' in item ? item.customerId : productDrawingDetail.value?.customer?.customerId
    const moduleKey = 'moduleKey' in item ? item.moduleKey : pendingTrashModule.value?.moduleKey ?? selectedModule.value?.moduleKey
    const refreshes: Promise<unknown>[] = [
      loadCustomers(),
      refreshProductList(customerId),
      refreshCurrentProduct(productId, moduleKey),
      loadDrawingTrash(),
    ]
    const results = await Promise.allSettled(refreshes)
    const failed = results.find((result) => result.status === 'rejected')
    if (failed) {
      toast.warning('资料状态已更新，局部刷新失败，请手动刷新页面。')
    }
  }

  async function trashDocument(item: DrawingItem, payload: TrashDocumentPayload) {
    const documentId = lifecycleDocumentId(item)
    const module = pendingTrashModule.value ?? selectedModule.value
    const productId = productDrawingDetail.value?.product.productId ?? selectedProduct.value?.productId
    clearLifecycleError()
    if (!isFormalLifecycleDrawingItem(item)) {
      lifecycleError.value = PLACEHOLDER_SOURCE_HINT
      toast.warning(PLACEHOLDER_SOURCE_HINT)
      throw new Error(PLACEHOLDER_SOURCE_HINT)
    }
    if (!documentId || !module || !productId) {
      lifecycleError.value = '资料状态已变化，请刷新后重试。'
      toast.error(lifecycleError.value)
      throw new Error(lifecycleError.value)
    }
    if (lifecycleActionLoading.value && lifecycleActionDocumentId.value === documentId) {
      throw new Error('该资料正在处理，请稍后再试。')
    }
    lifecycleActionLoading.value = true
    lifecycleActionDocumentId.value = documentId
    try {
      const response = await trashDrawingDocument(productId, module.moduleKey, documentId, payload)
      applyLifecycleResponse(response)
      await closeViewerIfLifecycleTarget(item)
      await refreshAfterDocumentLifecycle({ ...item, productId, moduleKey: module.moduleKey } as DrawingItem & { productId: string; moduleKey: DrawingModuleKey })
      closeMoveToTrashDialog()
      toast.success('资料已移入回收站。')
      if (response.warning) toast.warning(response.warning)
      return response
    } catch (error) {
      const message = lifecycleErrorMessage(error)
      lifecycleError.value = message
      toast.error(message)
      throw error
    } finally {
      lifecycleActionLoading.value = false
      lifecycleActionDocumentId.value = ''
    }
  }

  async function restoreDocument(item: DrawingTrashItem, payload: RestoreDocumentPayload = {}) {
    const documentId = lifecycleDocumentId(item)
    clearLifecycleError()
    if (!documentId || !item.productId || !item.moduleKey) {
      lifecycleError.value = '资料状态已变化，请刷新后重试。'
      toast.error(lifecycleError.value)
      throw new Error(lifecycleError.value)
    }
    if (lifecycleActionLoading.value && lifecycleActionDocumentId.value === documentId) {
      throw new Error('该资料正在处理，请稍后再试。')
    }
    lifecycleActionLoading.value = true
    lifecycleActionDocumentId.value = documentId
    try {
      const response = await restoreDrawingDocument(item.productId, item.moduleKey, documentId, payload)
      applyLifecycleResponse(response)
      await refreshAfterDocumentLifecycle(item)
      toast.success('资料已恢复。')
      if (response.warning) toast.warning(response.warning)
      return response
    } catch (error) {
      const message = lifecycleErrorMessage(error)
      lifecycleError.value = message
      toast.error(message)
      throw error
    } finally {
      lifecycleActionLoading.value = false
      lifecycleActionDocumentId.value = ''
    }
  }

  async function purgeDocument(item: DrawingTrashItem, payload: PurgeDocumentPayload) {
    const documentId = lifecycleDocumentId(item)
    clearLifecycleError()
    if (!documentId || !item.productId || !item.moduleKey) {
      lifecycleError.value = '资料状态已变化，请刷新后重试。'
      toast.error(lifecycleError.value)
      throw new Error(lifecycleError.value)
    }
    if (lifecycleActionLoading.value && lifecycleActionDocumentId.value === documentId) {
      throw new Error('该资料正在处理，请稍后再试。')
    }
    lifecycleActionLoading.value = true
    lifecycleActionDocumentId.value = documentId
    try {
      const response = await purgeDrawingDocument(item.productId, item.moduleKey, documentId, payload)
      applyLifecycleResponse(response)
      await closeViewerIfLifecycleTarget(item)
      await refreshAfterDocumentLifecycle(item)
      pendingPurgeItem.value = null
      if (response.message === '文件本体已不存在，资料记录已清理。') {
        toast.warning(response.message)
      } else {
        toast.success('资料已彻底删除。')
      }
      return response
    } catch (error) {
      const message = lifecycleErrorMessage(error)
      lifecycleError.value = message
      toast.error(message)
      throw error
    } finally {
      lifecycleActionLoading.value = false
      lifecycleActionDocumentId.value = ''
    }
  }

  // Legacy smoke markers: deleteModuleCoverItem/deleteDrawingItem now route through trashDocument UI.

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
    documentViewerOpen,
    documentViewerInitialItemId,
    connectorRows,
    fixtureRows,
    selectedConnector,
    selectedFixture,
    connectorImportResult,
    connectorImportError,
    connectorMutationLoading,
    pdfImportPreview,
    pdfImportBatchId,
    pdfImportPreviewLoading,
    pdfImportApplyLoading,
    pdfImportBatchLoading,
    pdfImportError,
    pdfImportSelectedCustomerId,
    pdfImportFiles,
    pdfImportItems,
    pdfImportApplyResult,
    pdfImportLastUpdatedAt,
    orderOverviewOpen,
    uploadDialogOpen,
    uploadDialogSource,
    uploadContext,
    uploadSource,
    uploadFiles,
    capturedPhotos,
    uploadItems,
    uploadProgress,
    uploadLoading,
    uploadError,
    uploadResult,
    cameraActive,
    cameraPermission,
    drawingTrashItems,
    drawingTrashLoading,
    drawingTrashError,
    drawingTrashFilters,
    drawingTrashTotal,
    drawingTrashDialogOpen,
    lifecycleActionLoading,
    lifecycleActionDocumentId,
    lifecycleError,
    deleteLockStatus,
    deleteLockLoading,
    pendingTrashItem,
    pendingTrashModule,
    pendingPurgeItem,
    lastLifecycleResult,
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
    openModuleViewer,
    openImageDetail,
    closeDocumentViewer,
    goBack,
    searchCurrentMode,
    loadConnectors,
    loadFixtures,
    setActiveMode,
    openTopUpload,
    openModuleUpload,
    setUploadSource,
    addSelectedFiles,
    addCapturedPhoto,
    removeUploadItem,
    updateUploadItemMetadata,
    uploadAllItems,
    retryFailedItems,
    resetUploadState,
    openConnectorDetail,
    saveConnector,
    deleteConnector,
    importConnectorExcel,
    setPdfImportCustomer,
    setPdfImportFiles,
    previewPdfImport,
    loadPdfImportBatch,
    updatePdfImportItem,
    applyPdfImport,
    resetPdfImport,
    retryPdfImportBatch,
    updateConnectorRemark,
    openFixtureDetail,
    uploadToModule,
    toggleOrderSidebar,
    loadDeleteLockStatus,
    openDrawingTrash,
    closeDrawingTrash,
    loadDrawingTrash,
    prepareTrashDocument,
    closeMoveToTrashDialog,
    trashDocument,
    restoreDocument,
    purgeDocument,
    refreshAfterDocumentLifecycle,
    clearLifecycleError,
    saveCurrentScroll,
    restoreScroll,
  }
})
