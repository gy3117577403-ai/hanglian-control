import { existsSync, readFileSync } from 'node:fs'
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

const viewport = read('apps/tablet/src/composables/use-native-app-viewport.ts')
const dashboard = read('apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue')
const table = read('apps/tablet/src/components/connectors/WarmNativeConnectorTable.vue')
const packageJson = read('package.json')

if (!packageJson.includes('"native-connector-runtime:check"')) fail('package.json must expose native-connector-runtime:check')
if (!viewport.includes('__HANGLIAN_NATIVE_LAYOUT__')) fail('Debug native layout object must exist')
if (!viewport.includes('canExposeDebugObject')) fail('Native runtime diagnostics must be debug-gated')
if (!viewport.includes('android-lan-debug')) fail('Native runtime diagnostics must only expose in debug Android LAN builds')
for (const metric of [
  'appHeight',
  'appWidth',
  'bodyClientHeight',
  'bodyScrollHeight',
  'bodyScrollTop',
  'appClientHeight',
  'connectorClientHeight',
  'connectorScrollHeight',
  'connectorScrollTop',
  'activeMode',
  'orderSidebarMounted',
  'connectorVirtualized',
  'connectorItemCount',
]) {
  if (!viewport.includes(metric)) fail(`Native layout diagnostics missing metric: ${metric}`)
}
if (!viewport.includes('delete window.__HANGLIAN_NATIVE_LAYOUT__')) {
  fail('Native layout diagnostics must clean up the debug object')
}
if (/localStorage|sessionStorage|fetch\(|navigator\.sendBeacon|XMLHttpRequest/.test(viewport)) {
  fail('Native runtime diagnostics must not persist or upload layout data')
}
for (const forbidden of ['connectorModel', 'customerName', 'productModel', 'deviceId', 'fingerprint']) {
  if (viewport.includes(forbidden)) fail(`Native runtime diagnostics must not include business/device data: ${forbidden}`)
}
if (!dashboard.includes('useNativeLayoutDiagnostics')) fail('Dashboard must install native layout diagnostics')
if (!table.includes('data-native-connector-list')) fail('Native connector list must expose a diagnostic scroll target')
if (!table.includes('data-connector-virtualized')) fail('Native connector table must expose virtualized state for diagnostics')
if (!table.includes('data-connector-item-count')) fail('Native connector table must expose item count for diagnostics')

if (failures.length) {
  console.error('Native connector runtime check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Native connector runtime check passed.')
