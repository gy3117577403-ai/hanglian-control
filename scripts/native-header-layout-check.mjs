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
const hubHeader = read('apps/tablet/src/components/hub/WarmHubHeader.vue')
const nativeHeader = read('apps/tablet/src/components/native/WarmNativeHeaderActions.vue')
const moreMenu = read('apps/tablet/src/components/native/WarmNativeMoreMenu.vue')
const headerCss = read('apps/tablet/src/styles/native-header-layout.css')

if (!packageJson.includes('"native-header-layout:check"')) fail('package.json must expose native-header-layout:check')
if (!hubHeader.includes('WarmNativeHeaderActions')) fail('WarmHubHeader must route native apps to WarmNativeHeaderActions')
if (!hubHeader.includes('v-else class="hub-header"')) fail('Web header must remain available through the existing header')
for (const token of [
  'native-header-row primary',
  'native-header-row secondary',
  'native-header-search',
  'native-mode-tabs',
  'native-action-cluster',
  '客户与产品',
  'maintenance',
]) {
  if (!nativeHeader.includes(token)) fail(`Native header missing ${token}`)
}
if (!nativeHeader.includes('WarmHubSearchBar')) fail('Native header first row must contain the search bar')
if (!nativeHeader.includes("mode: 'drawing'") || !nativeHeader.includes("mode: 'connector'") || !nativeHeader.includes("mode: 'fixture'")) {
  fail('Native header must expose drawing/connector/fixture mode buttons')
}
if (!moreMenu.includes('<Teleport to="body">')) fail('Native more menu must Teleport to body')
for (const token of ['订单总览', '回收站', '网络诊断']) {
  if (!moreMenu.includes(token)) fail(`Native more menu missing ${token}`)
}
for (const token of [
  'grid-template-rows: 54px 48px',
  'grid-template-columns: auto minmax(280px, 1fr) auto',
  'safe-area-inset-right',
  '.native-action-button.maintenance',
  'min-width: 116px',
  '.native-more-menu-panel',
]) {
  if (!headerCss.includes(token)) fail(`Native header CSS missing ${token}`)
}
if (/\.native-action-cluster\s*{[\s\S]*overflow:\s*hidden/.test(headerCss)) {
  fail('Native primary actions must not be hidden in an overflow area')
}

const changed = changedFiles()
if (changed.some((file) => file.startsWith('apps/api/') || file.includes('prisma/'))) {
  fail('Native header layout must not modify backend or Prisma files')
}

if (failures.length) {
  console.error('Native header layout check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Native header layout check passed.')
