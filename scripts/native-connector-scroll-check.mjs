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
const performanceCss = read('apps/tablet/src/styles/tablet-performance.css')
const nativeViewport = read('apps/tablet/src/composables/use-native-viewport.ts')
const appVue = read('apps/tablet/src/App.vue')
const primeVue = read('apps/tablet/src/plugins/primevue.ts')
const manifest = read('apps/tablet/android/app/src/main/AndroidManifest.xml')
const packageJson = read('package.json')

if (!packageJson.includes('"native-connector-scroll:check"')) {
  fail('package.json must expose npm run native-connector-scroll:check')
}

const scrollArea = cssBlock(parameterView, '.scroll-area')
if (!/overflow-y:\s*auto/.test(scrollArea)) fail('Connector scroll area must use overflow-y: auto')
if (!/overflow-x:\s*hidden/.test(scrollArea)) fail('Connector scroll area must use overflow-x: hidden')
if (!/touch-action:\s*pan-y/.test(scrollArea)) fail('Connector scroll area must use touch-action: pan-y')
if (!/overscroll-behavior:\s*contain/.test(scrollArea)) fail('Connector scroll area must contain overscroll')

const connectorSource = [table, parameterView].join('\n')
if (/touchmove/.test(connectorSource)) fail('Connector list must not bind touchmove handlers')
if (/preventDefault/.test(connectorSource)) fail('Connector list must not call preventDefault in scroll paths')
if (/useAutoAnimate|v-auto-animate/.test(connectorSource)) fail('Connector list must not use AutoAnimate')
if (/content-visibility:\s*auto/.test(connectorSource)) fail('Small connector lists must not use content-visibility')
if (/transition:\s*all/.test(connectorSource)) fail('Connector list must not use transition: all')

const tableStyle = table.slice(table.indexOf('<style'))
if (/backdrop-filter:/.test(tableStyle) || /-webkit-backdrop-filter:/.test(tableStyle)) {
  fail('Connector row/table styles must not use backdrop-filter')
}
if (/filter:\s*(?!none)/.test(tableStyle)) fail('Connector row/table styles must not use filter or blur')
const connectorCellBlocks = [
  cssBlock(table, '.metric-card'),
  cssBlock(table, '.remark-cell'),
  cssBlock(table, '.model-cell'),
]
if (connectorCellBlocks.some((block) => /box-shadow:/.test(block))) {
  fail('Connector cells should avoid layered box-shadow')
}
if (!/transition:\s*\n\s*transform/.test(tableStyle) || !/background-color/.test(tableStyle)) {
  fail('Connector row transitions should be limited to transform/background/border')
}

if (!performanceCss.includes('html[data-native-app="true"] :is(.parameter-row, .metric-card, .remark-cell, .model-cell)')) {
  fail('Native performance CSS must downgrade connector row visual effects')
}
if (!performanceCss.includes('display: none !important') || !performanceCss.includes('.p-ink')) {
  fail('Native performance CSS must suppress connector row ripple artifacts')
}

if (!nativeViewport.includes('requestAnimationFrame')) fail('Native viewport diagnostics must throttle updates with requestAnimationFrame')
if (!nativeViewport.includes('{ passive: true }')) fail('Native viewport diagnostics must use passive listeners')
if (!nativeViewport.includes('onBeforeUnmount')) fail('Native viewport diagnostics must clean up listeners')
if (!nativeViewport.includes('android-lan-debug')) fail('Native viewport diagnostics must only expose in debug Android LAN builds')
if (!nativeViewport.includes('delete window.__HANGLIAN_NATIVE_VIEWPORT__')) fail('Native viewport diagnostics must clean its debug object')
if (!appVue.includes('useNativeViewport(performanceTier)')) fail('App must install native viewport diagnostics')

if (/hardwareAccelerated\s*=\s*"false"/.test(manifest)) fail('Android manifest must not disable hardware acceleration')
if (!primeVue.includes('ripple: true')) fail('PrimeVue ripple setting should not be globally rewritten for web behavior')

const changed = changedFiles()
if (changed.some((file) => file.startsWith('apps/api/') || file.includes('prisma/'))) {
  fail('Native connector scroll fix must not modify backend or Prisma files')
}
if (changed.some((file) => file.includes('/fixture/') || file.includes('Fixture'))) {
  fail('Native connector scroll fix must not modify fixture files')
}

if (failures.length) {
  console.error('Native connector scroll check failed:')
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Native connector scroll check passed.')
