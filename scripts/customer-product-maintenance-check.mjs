import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

function exists(file) {
  return fs.existsSync(path.join(root, file))
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`)
    process.exitCode = 1
  } else {
    console.log(`OK ${message}`)
  }
}

function changedFiles() {
  try {
    return execFileSync('git', ['diff', '--name-only'], { cwd: root, encoding: 'utf8' })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function functionSlice(source, name) {
  const start = source.indexOf(`function ${name}`)
  if (start < 0) return ''
  const next = source.indexOf('\n  async function ', start + 1)
  const nextSync = source.indexOf('\n  function ', start + 1)
  const candidates = [next, nextSync].filter((value) => value > start)
  const end = candidates.length ? Math.min(...candidates) : source.length
  return source.slice(start, end)
}

const files = {
  header: 'apps/tablet/src/components/hub/WarmHubHeader.vue',
  dashboard: 'apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue',
  api: 'apps/tablet/src/services/api.ts',
  store: 'apps/tablet/src/stores/document-hub-store.ts',
  type: 'apps/tablet/src/types/customer-product-maintenance.ts',
  productType: 'apps/tablet/src/types/product-resolution.ts',
  dialog: 'apps/tablet/src/components/maintenance/WarmCustomerProductMaintenanceDialog.vue',
  customerList: 'apps/tablet/src/components/maintenance/WarmCustomerListPanel.vue',
  productList: 'apps/tablet/src/components/maintenance/WarmProductListPanel.vue',
  customerEdit: 'apps/tablet/src/components/maintenance/WarmCustomerEditDialog.vue',
  productEdit: 'apps/tablet/src/components/maintenance/WarmProductEditDialog.vue',
  service: 'apps/api/src/document-hub/document-hub.service.ts',
  createProductDto: 'apps/api/src/document-hub/dto/create-drawing-product.dto.ts',
  updateProductDto: 'apps/api/src/document-hub/dto/update-drawing-product.dto.ts',
}

for (const [name, file] of Object.entries(files)) {
  assert(exists(file), `${name} file exists`)
}

const header = read(files.header)
const dashboard = read(files.dashboard)
const api = read(files.api)
const store = read(files.store)
const dialog = read(files.dialog)
const customerList = read(files.customerList)
const productList = read(files.productList)
const customerEdit = read(files.customerEdit)
const productEdit = read(files.productEdit)
const service = read(files.service)
const createProductDto = read(files.createProductDto)
const updateProductDto = read(files.updateProductDto)
const packageJson = read('package.json')

assert(header.includes('open-maintenance') && header.includes('客户与产品') && header.includes('store.activeMode === \'drawing\''), 'drawing mode maintenance entry exists')
assert(dashboard.includes('WarmCustomerProductMaintenanceDialog') && dashboard.includes('openCustomerProductMaintenance') && dashboard.includes('store.maintenanceOpen'), 'dashboard wires maintenance dialog')
assert(dialog.includes('WarmCustomerListPanel') && dialog.includes('WarmProductListPanel') && dialog.includes('WarmCustomerEditDialog') && dialog.includes('WarmProductEditDialog'), 'maintenance dialog references all child components')
assert(dialog.includes('globalSearch') && dialog.includes('loadMaintenanceCustomers'), 'maintenance dialog has global search and refresh')
assert(customerList.includes('maintenanceCustomerSearch') && customerList.includes('aliases') && customerList.includes('暂无客户资料'), 'customer list supports search and empty state')
assert(productList.includes('maintenanceProductSearch') && productList.includes('打开资料页') && productList.includes('导入 PDF 图纸'), 'product list supports search, product open, and pdf import')
assert(productList.includes('originalDrawingCount') && productList.includes('uploadedModuleCount') && productList.includes('moduleKey'), 'product list shows drawing status and module completeness')
assert(customerEdit.includes('createMaintenanceCustomer') && customerEdit.includes('updateMaintenanceCustomer') && customerEdit.includes('customerId') && !customerEdit.includes('v-model="props.customer.customerId"'), 'customer editor uses real create/update without editing customerId')
assert(productEdit.includes('createMaintenanceProduct') && productEdit.includes('updateMaintenanceProduct') && productEdit.includes(':readonly="isEdit"'), 'product editor uses real create/update and protects product model')
assert(!productEdit.includes('drawingStatus') || productEdit.includes('不能直接修改产品型号'), 'product editor does not expose drawingStatus editing')

const apiFunctions = [
  'getDrawingCustomers',
  'createDrawingCustomer',
  'updateDrawingCustomer',
  'getDrawingProducts',
  'createDrawingProduct',
  'updateDrawingProduct',
  'getDrawingProductDetail',
]
for (const fn of apiFunctions) assert(api.includes(fn), `api exposes ${fn}`)
assert(api.includes('PATCH') && api.includes('/document-hub/drawings/customers/') && api.includes('/document-hub/drawings/products/'), 'api update routes use existing drawing endpoints')

const storeFields = [
  'maintenanceOpen',
  'maintenanceCustomers',
  'maintenanceSelectedCustomerId',
  'maintenanceProducts',
  'maintenanceCustomerSearch',
  'maintenanceProductSearch',
  'maintenanceLoading',
  'maintenanceSaving',
  'maintenanceError',
  'maintenanceProductScrollPosition',
]
for (const field of storeFields) assert(store.includes(field), `store exposes ${field}`)

const storeActions = [
  'openCustomerProductMaintenance',
  'closeCustomerProductMaintenance',
  'loadMaintenanceCustomers',
  'selectMaintenanceCustomer',
  'loadMaintenanceProducts',
  'createMaintenanceCustomer',
  'updateMaintenanceCustomer',
  'createMaintenanceProduct',
  'updateMaintenanceProduct',
  'openProductFromMaintenance',
  'openPdfImportFromMaintenance',
  'refreshAfterMaintenanceWrite',
]
for (const action of storeActions) assert(store.includes(action), `store implements ${action}`)

assert(store.includes('createHubDrawingCustomer') && store.includes('updateHubDrawingCustomer') && store.includes('createHubDrawingProduct') && store.includes('updateHubDrawingProduct'), 'store write actions call real api functions')
const maintenanceWriteBlocks = [
  functionSlice(store, 'createMaintenanceCustomer'),
  functionSlice(store, 'updateMaintenanceCustomer'),
  functionSlice(store, 'createMaintenanceProduct'),
  functionSlice(store, 'updateMaintenanceProduct'),
].join('\n')
assert(!/mockHub|mock-|missing-/.test(maintenanceWriteBlocks), 'maintenance writes do not use mock fallback')
assert(store.includes('refreshOrdersAfterAction()') && store.includes('refreshAfterMaintenanceWrite'), 'maintenance writes refresh order resolution')
assert(store.includes('openPdfImportFromMaintenance') && store.includes('setPdfImportCustomer') && store.includes('pdfImportDialogOpen.value = true'), 'pdf import reuses existing dialog with selected customer')
assert(store.includes("openProduct(product, 'maintenance')") && store.includes('maintenanceReturnPending') && store.includes('返回客户与产品维护'), 'product page return point supports maintenance return')
assert(store.includes('当前客户已停用') && service.includes('当前客户已停用'), 'inactive customer protection exists in frontend and backend')
assert(createProductDto.includes('searchKeywords') && updateProductDto.includes('searchKeywords'), 'product keyword dto fields exist')
assert(packageJson.includes('"customer-product-maintenance:check"'), 'package script registered')

const diffFiles = changedFiles()
const forbidden = diffFiles.filter((file) => (
  (file.includes('/connector/') && file !== 'apps/tablet/src/components/connector/WarmConnectorParameterView.vue') ||
  (file.includes('/fixture/') && file !== 'apps/tablet/src/components/fixture/WarmFixtureParameterView.vue') ||
  file === 'apps/api/prisma/schema.prisma' ||
  file.includes('prisma/migrations') ||
  file.includes('apps/api/storage/uploads') ||
  file.includes('apps/api/storage/metadata') ||
  file.includes('apps/api/storage/tmp') ||
  file.endsWith('.env.local')
))
assert(forbidden.length === 0, `no forbidden files changed${forbidden.length ? `: ${forbidden.join(', ')}` : ''}`)
assert(!store.includes('new PrismaClient') && !service.includes('new PrismaClient'), 'check does not introduce database connection')

if (process.exitCode) process.exit(process.exitCode)
