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
const content = read('apps/tablet/src/components/hub/WarmHubContent.vue')
const drawing = read('apps/tablet/src/components/drawing/WarmDrawingLibraryView.vue')
const connector = read('apps/tablet/src/components/connector/WarmConnectorParameterView.vue')
const fixture = read('apps/tablet/src/components/fixture/WarmFixtureParameterView.vue')
const store = read('apps/tablet/src/stores/document-hub-store.ts')

if (!packageJson.includes('"native-mode-switch:check"')) fail('package.json must expose native-mode-switch:check')
if (!content.includes('<KeepAlive :max="3">')) fail('Main mode views must be wrapped in KeepAlive max=3')
if (!content.includes(':key="store.activeMode"')) fail('Mode component key must be stable store.activeMode')
if (content.includes('mode="out-in"')) fail('Mode transition must not use mode=out-in')
if (/Date\.now\(\)|Math\.random\(\)/.test(content)) fail('Mode component key must not use Date.now or Math.random')
for (const token of ['drawing: WarmDrawingLibraryView', 'connector: WarmConnectorParameterView', 'fixture: WarmFixtureParameterView']) {
  if (!content.includes(token)) fail(`Mode component map missing ${token}`)
}
for (const [name, source] of [['drawing', drawing], ['connector', connector], ['fixture', fixture]]) {
  if (!source.includes('onActivated')) fail(`${name} view must handle onActivated`)
  if (!source.includes('onDeactivated')) fail(`${name} view must handle onDeactivated`)
  if (!source.includes('scrollTop')) fail(`${name} view must preserve scrollTop`)
}
if (!store.includes('recordNativeModeSwitch') || !store.includes('recordNativeModeFirstPaint')) {
  fail('Store must expose native mode switch timing diagnostics')
}
if (!/loadConnectors\(undefined,\s*{ background: connectorRows\.value\.length > 0 }/.test(store)) {
  fail('Connector mode switch must use background refresh when cached rows exist')
}
if (!/loadFixtures\(undefined,\s*{ background: fixtureRows\.value\.length > 0 }/.test(store)) {
  fail('Fixture mode switch must use background refresh when cached rows exist')
}
if (/connectorRows\.value\s*=\s*\[\]|fixtureRows\.value\s*=\s*\[\]/.test(store)) {
  fail('Mode switching must not clear connector or fixture rows before refresh')
}

const changed = changedFiles()
if (changed.some((file) => file.startsWith('apps/api/') || file.includes('prisma/'))) {
  fail('Native mode switch work must not modify backend or Prisma files')
}

if (failures.length) {
  console.error('Native mode switch check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Native mode switch check passed.')
