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

function count(source, pattern) {
  return source.match(pattern)?.length ?? 0
}

function cssBlock(source, selector) {
  const start = source.indexOf(selector)
  if (start < 0) return ''
  const brace = source.indexOf('{', start)
  if (brace < 0) return ''
  let depth = 0
  for (let index = brace; index < source.length; index += 1) {
    const char = source[index]
    if (char === '{') depth += 1
    if (char === '}') depth -= 1
    if (depth === 0) return source.slice(start, index + 1)
  }
  return ''
}

const table = read('apps/tablet/src/components/connector/WarmConnectorTable.vue')
const parameterView = read('apps/tablet/src/components/connector/WarmConnectorParameterView.vue')
const detailDialog = read('apps/tablet/src/components/connector/WarmConnectorDetailDialog.vue')
const dashboard = read('apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue')
const sidebar = read('apps/tablet/src/components/orders/WarmOrderSidebar.vue')
const store = read('apps/tablet/src/stores/document-hub-store.ts')
const types = read('apps/tablet/src/types/production.ts')
const buildGradle = read('apps/tablet/android/app/build.gradle')
const manifest = read('apps/tablet/android/app/src/main/AndroidManifest.xml')
const packageJson = read('package.json')

if (!packageJson.includes('"native-connector-layout:check"')) {
  fail('package.json must expose npm run native-connector-layout:check')
}

if (!table.includes('--connector-grid-template')) fail('Connector table must define one shared grid template variable')
if (count(table, /grid-template-columns:\s*var\(--connector-grid-template\)/g) < 2) {
  fail('Connector table header and rows must both use the same grid template')
}
for (const className of ['model-cell', 'metric-card', 'metric-card optional', 'remark-cell', 'row-actions']) {
  if (!table.includes(className)) fail(`Connector row must keep fixed area: ${className}`)
}
for (const label of ['连接器型号', '入长', '外剥长度', '内剥长度', '备注']) {
  if (!table.includes(label)) fail(`Connector table must keep business field label: ${label}`)
}
if (!/return '—'/.test(table)) fail('Blank connector values must render as —')
if (/metricText\(|未设|v-if="hasMm\(row\.outerStripLengthMm\)"\s*>\s*<section/.test(table)) {
  fail('Blank connector values must not be replaced by legacy "未设" or hidden cells')
}
if (/未设/.test(detailDialog)) {
  fail('Connector detail dialog must use the same dash placeholder for blank values')
}
if (/min-width:\s*9\d{2}px/.test(table)) fail('Connector table must not force a 900px+ minimum width')
if (!/@container\s*\(max-width:\s*900px\)/.test(table)) fail('Connector table needs a compact two-layer layout below 900px')
if (!/grid-column:\s*1\s*\/\s*-1/.test(table)) fail('Compact remark row should span the full row')
const parameterRowBlock = cssBlock(table, '.parameter-row')
if (/overflow:\s*hidden;/.test(parameterRowBlock)) {
  fail('Connector rows must not clip remarks or action buttons with row overflow hidden')
}

if (!/grid-template-columns:\s*minmax\(260px,\s*1fr\)\s*minmax\(360px,\s*auto\)/.test(parameterView)) {
  fail('Connector toolbar should use a two-zone compact grid')
}
if (!/overflow-x:\s*hidden/.test(parameterView)) fail('Connector scroll area must suppress horizontal scrolling')
if (!/overflow-y:\s*auto/.test(parameterView)) fail('Connector scroll area must own vertical scrolling')

if (!store.includes('auxiliaryOrderSidebarExpanded')) fail('Connector/fixture mode needs session-only order rail expansion state')
if (!store.includes('effectiveOrderSidebarCollapsed')) fail('Store must expose effective order sidebar collapse state')
if (!/activeMode\.value === 'drawing'\)\s*return orderSidebarCollapsed\.value/.test(store)) {
  fail('Drawing mode must restore the normal order sidebar collapse state')
}
if (!/return !auxiliaryOrderSidebarExpanded\.value/.test(store)) {
  fail('Connector/fixture modes must default to a compact order sidebar')
}
if (!dashboard.includes('store.effectiveOrderSidebarCollapsed') || !sidebar.includes('store.effectiveOrderSidebarCollapsed')) {
  fail('Dashboard and order sidebar must consume effective collapsed state')
}

for (const field of ['connectorModel', 'insertionLengthMm', 'outerStripLengthMm', 'innerStripLengthMm', 'remark']) {
  if (!types.includes(field)) fail(`Connector type must still contain field: ${field}`)
}

if (!buildGradle.includes('versionCode 1602') || !buildGradle.includes('versionName "0.16.2-debug"')) {
  fail('Android debug version must be 1602 / 0.16.2-debug')
}
if (!buildGradle.includes('applicationId "com.hanglian.control"')) fail('Android applicationId must remain com.hanglian.control')
if (/hardwareAccelerated\s*=\s*"false"/.test(manifest) || /hardwareAccelerated\s*=\s*"false"/.test(buildGradle)) {
  fail('Android hardware acceleration must not be disabled')
}

const changed = changedFiles()
if (changed.some((file) => file.startsWith('apps/api/') || file.includes('prisma/'))) {
  fail('Native connector layout fix must not modify backend or Prisma files')
}
if (changed.some((file) => (file.includes('/fixture/') || file.includes('Fixture')) && file !== 'apps/tablet/src/components/fixture/WarmFixtureParameterView.vue')) {
  fail('Native connector layout fix must not modify fixture files')
}
if (changed.some((file) => file === 'apps/tablet/src/types/production.ts')) {
  fail('Native connector layout fix must not modify connector field definitions')
}

if (failures.length) {
  console.error('Native connector layout check failed:')
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Native connector layout check passed.')
