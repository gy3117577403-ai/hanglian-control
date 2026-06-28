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
  if (result.error) {
    fail(`Could not inspect git status: ${result.error.message}`)
    return []
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.slice(3).trim())
    .filter(Boolean)
    .map((line) => line.includes(' -> ') ? line.split(' -> ').pop() ?? line : line)
    .map((line) => line.replaceAll('\\', '/'))
}

const view = read('apps/tablet/src/components/connector/WarmConnectorParameterView.vue')
const table = read('apps/tablet/src/components/connectors/WarmNativeConnectorTable.vue')
const row = read('apps/tablet/src/components/connectors/WarmNativeConnectorRow.vue')
const lightCss = read('apps/tablet/src/styles/native-connector-light.css')
const dashboard = read('apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue')
const store = read('apps/tablet/src/stores/document-hub-store.ts')
const productionTypes = read('apps/tablet/src/types/production.ts')
const packageJson = read('package.json')

if (!packageJson.includes('"native-connector-light:check"')) fail('package.json must expose native-connector-light:check')
if (!view.includes('WarmNativeConnectorTable')) fail('Connector view must use the native connector table in native mode')
if (!view.includes('native-connector-view')) fail('Connector view must expose native-connector-view class')
if (!view.includes('isNativeApp()')) fail('Connector view must gate native layout to Capacitor native mode')

if (!dashboard.includes('nativeAuxiliaryMode') || !dashboard.includes('store.activeMode !== \'drawing\'')) {
  fail('Dashboard must detect native connector/fixture mode')
}
if (!dashboard.includes('<WarmOrderSidebar v-if="mountOrderSidebar"')) {
  fail('Native connector/fixture mode must avoid mounting the full order sidebar DOM')
}
if (!dashboard.includes('grid-template-columns: minmax(0, 1fr)')) {
  fail('Native auxiliary mode must use a single content column')
}

for (const token of [
  'grid-template-rows: 84px minmax(0, 1fr)',
  '--native-connector-grid-columns',
  'grid-template-rows: 42px minmax(0, 1fr)',
  'grid-template-columns: var(--native-connector-grid-columns)',
  'height: 72px',
  'overflow-y: auto',
  'overflow-x: hidden',
  'touch-action: pan-y',
  '-webkit-overflow-scrolling: touch',
]) {
  if (!lightCss.includes(token)) fail(`Native connector light CSS missing: ${token}`)
}

for (const label of ['连接器型号', '入长', '外剥长度', '内剥长度', '备注', '操作']) {
  if (!table.includes(label)) fail(`Native connector header must keep field label: ${label}`)
}
if (!row.includes("return '—'")) fail('Native connector blank values must render as dash')
if (/return [`'"]0[`'"]/.test(row)) fail('Native connector blanks must not render as zero')
if (!row.includes('hasMm(row.outerStripLengthMm)')) fail('Native connector row must keep optional mm display without hiding the cell')
if (!row.includes('row.connectorModel') || !row.includes('row.insertionLengthMm') || !row.includes('row.outerStripLengthMm') || !row.includes('row.innerStripLengthMm') || !row.includes('row.remark')) {
  fail('Native connector row must render the five connector business fields')
}
if (!row.includes('@click.stop="emit(\'edit\', row)"') || !row.includes('@click.stop="emit(\'delete\', row)"') || !row.includes('@click.stop="emit(\'open\', row)"')) {
  fail('Native connector row must keep edit/delete/detail actions')
}
if (!table.includes('props.rows.length > 40')) fail('Native connector table must virtualize only above 40 rows')
if (!table.includes('itemSize = 72')) fail('Native connector virtual window must use fixed 72px item size')
if (!table.includes('@scroll.passive="handleScroll"')) fail('Native connector scroll listener must be passive')
if (!table.includes('requestAnimationFrame')) fail('Native connector scroll tracking must be rAF-throttled')
const heavyEffectLines = `${row}\n${lightCss}`.split(/\r?\n/).map((line) => line.trim())
function declarationValue(line, property) {
  const match = new RegExp(`^${property}:\\s*([^;]+)`).exec(line)
  return match?.[1]?.replace(/\s*!important\b/g, '').trim().toLowerCase() ?? null
}

const hasHeavyEffect = heavyEffectLines.some((line) => {
  const backdropFilter = declarationValue(line, 'backdrop-filter')
  if (backdropFilter && backdropFilter !== 'none') return true
  const webkitBackdropFilter = declarationValue(line, '-webkit-backdrop-filter')
  if (webkitBackdropFilter && webkitBackdropFilter !== 'none') return true
  if (/^filter:\s*blur/.test(line)) return true
  if (/^transition:\s*all/.test(line)) return true
  if (/translateZ/.test(line)) return true
  const willChange = declarationValue(line, 'will-change')
  if (willChange && willChange !== 'auto') return true
  return false
})
if (hasHeavyEffect) {
  fail('Native connector row must not use heavy blur, transition-all, translateZ, or will-change effects')
}
if (/useAutoAnimate|v-auto-animate/.test(view + table + row)) fail('Native connector list must not use AutoAnimate')

for (const field of ['connectorModel', 'insertionLengthMm', 'outerStripLengthMm', 'innerStripLengthMm', 'remark']) {
  if (!productionTypes.includes(field)) fail(`Connector type must still contain field: ${field}`)
}
if (!store.includes('importConnectorExcel') || !store.includes('saveConnector') || !store.includes('deleteConnector')) {
  fail('Connector import/edit/delete store actions must remain wired')
}

const changed = changedFiles()
if (changed.some((file) => file.startsWith('apps/api/') || file.includes('prisma/'))) {
  fail('Native connector light work must not modify backend or Prisma files')
}
if (changed.some((file) => file === 'apps/tablet/src/types/production.ts')) {
  fail('Native connector light work must not modify connector field definitions')
}
if (changed.some((file) => file.includes('/fixture/') && !file.endsWith('WarmFixtureParameterView.vue'))) {
  fail('Native connector light work must not modify fixture business files')
}

if (failures.length) {
  console.error('Native connector light check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Native connector light check passed.')
