import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const root = process.cwd()
const failures = []

function fail(message) {
  failures.push(message)
}

function read(relativePath) {
  const fullPath = join(root, relativePath)
  if (!existsSync(fullPath)) {
    fail(`Missing required file: ${relativePath}`)
    return ''
  }
  return readFileSync(fullPath, 'utf8')
}

function changedFiles() {
  const result = spawnSync('git', ['status', '--short', '--untracked-files=all'], { cwd: root, encoding: 'utf8' })
  if (result.error) return []
  return result.stdout.split(/\r?\n/).map((line) => line.slice(3).trim()).filter(Boolean).map((line) => line.replaceAll('\\', '/'))
}

const packageJson = read('package.json')
const cache = read('apps/tablet/src/composables/use-stale-while-revalidate.ts')
const idle = read('apps/tablet/src/composables/use-idle-prefetch.ts')
const modeCache = read('apps/tablet/src/composables/use-native-mode-cache.ts')
const store = read('apps/tablet/src/stores/document-hub-store.ts')
const dashboard = read('apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue')

if (!packageJson.includes('"native-cache-first:check"')) fail('package.json must expose native-cache-first:check')
for (const token of [
  'record?.data !== undefined',
  'loadOptions.onUpdate?.(record.data)',
  'void refresh(key, loader, { ...loadOptions, background: true })',
  'current?.promise',
  'onDeduplicatedRequest',
  'onBackgroundRefresh',
  'current?.data',
  'records.clear()',
]) {
  if (!cache.includes(token)) fail(`Stale-while-revalidate cache missing ${token}`)
}
if (/localStorage|sessionStorage/.test(cache)) fail('Cache must not write browser storage')
if (/PDFDocumentProxy|FileReader|Blob/.test(cache)) fail('Cache must not cache File/Blob/PDF objects')
for (const token of [
  'customerListCache',
  'connectorListCache',
  'fixtureListCache',
  'LIGHT_DATA_CACHE_TTL_MS = 30_000',
  'ORDER_CACHE_TTL_MS = 10_000',
  'invalidateDrawingListCache',
  'invalidateConnectorListCache',
]) {
  if (!store.includes(token)) fail(`Store cache integration missing ${token}`)
}
if (!store.includes('connectorListCache.load') || !store.includes('fixtureListCache.load') || !store.includes('customerListCache.load')) {
  fail('Store must use cache-first loading for customer, connector and fixture lists')
}
for (const token of [
  'requestIdleCallback',
  'setTimeout',
  'timeout',
  'detectTabletPerformanceTier',
  'reduced',
  'navigator.onLine',
  'visibilitychange',
  'recordNativePrefetchedChunk',
]) {
  if (!idle.includes(token)) fail(`Idle prefetch missing ${token}`)
}
if (/pdfjs|pdf\.worker|ExcelJS|xlsx|WarmPdfViewer|WarmDocumentViewer|WarmPdfImportDialog/i.test(idle)) {
  fail('Idle prefetch must not preload PDF.js, ExcelJS or heavy viewers')
}
for (const token of ['connector-view', 'fixture-view', 'customer-product-maintenance', 'order-overview', 'drawing-trash', 'hub-upload']) {
  if (!dashboard.includes(token)) fail(`Dashboard idle prefetch missing ${token}`)
}
if (!modeCache.includes('__HANGLIAN_NATIVE_PERF__')) fail('Native debug performance object must exist')
for (const forbidden of ['customerName', 'productModel', 'apiResponse', 'deviceId', 'localStorage']) {
  if (modeCache.includes(forbidden)) fail(`Native perf diagnostics must not include ${forbidden}`)
}

const changed = changedFiles()
if (changed.some((file) => file.startsWith('apps/api/') || file.includes('prisma/'))) {
  fail('Native cache-first work must not modify backend or Prisma files')
}

if (failures.length) {
  console.error('Native cache-first check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Native cache-first check passed.')
