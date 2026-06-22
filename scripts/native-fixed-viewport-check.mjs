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

const app = read('apps/tablet/src/App.vue')
const main = read('apps/tablet/src/main.ts')
const fixedCss = read('apps/tablet/src/styles/native-fixed-viewport.css')
const interactionCss = read('apps/tablet/src/styles/native-interaction-lock.css')
const viewport = read('apps/tablet/src/composables/use-native-app-viewport.ts')
const viewportGuard = read('apps/tablet/src/native/native-viewport-guard.ts')
const dashboard = read('apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue')
const packageJson = read('package.json')

if (!packageJson.includes('"native-fixed-viewport:check"')) fail('package.json must expose native-fixed-viewport:check')
if (!main.includes('./styles/native-fixed-viewport.css')) fail('main.ts must load native-fixed-viewport.css')
if (!main.includes('./styles/native-interaction-lock.css')) fail('main.ts must load native-interaction-lock.css')
if (!app.includes('useNativeAppViewport(performanceTier)')) fail('App.vue must install native app viewport sizing')

for (const selector of [
  'html[data-native-app="true"]',
  'html[data-native-app="true"] body',
  'html[data-native-app="true"] #app',
]) {
  if (!fixedCss.includes(selector)) fail(`Native fixed viewport CSS must target ${selector}`)
}

for (const token of [
  'height: 100vh',
  'height: 100dvh',
  'height: var(--native-app-height, 100dvh)',
  'min-width: 0',
  'min-height: 0',
  'overflow: hidden',
  'overscroll-behavior: none',
  'position: fixed',
  'inset: 0',
  'grid-template-rows: auto minmax(0, 1fr)',
]) {
  if (!(fixedCss.includes(token) || interactionCss.includes(token))) fail(`Native fixed viewport CSS missing: ${token}`)
}

if (!/--native-app-height/.test(viewportGuard) || /setProperty\('--native-app-width'/.test(viewportGuard)) {
  fail('Native viewport guard must write height only and must not control root width from visualViewport')
}
for (const token of [
  'installNativeViewportGuard',
  'window.innerHeight',
  'document.documentElement.clientWidth',
  'visualViewport?.addEventListener',
  "'resize'",
  "'orientationchange'",
  'requestAnimationFrame',
  'visibilitychange',
  'validSize',
]) {
  if (!(viewport.includes(token) || viewportGuard.includes(token))) fail(`Native viewport implementation missing: ${token}`)
}
if (/localStorage|sessionStorage|fetch\(|navigator\.sendBeacon|XMLHttpRequest/.test(viewport + viewportGuard)) {
  fail('Native viewport diagnostics must not persist or upload viewport data')
}
if (!viewport.includes('canExposeDebugObject') || !viewport.includes('android-lan-debug')) {
  fail('Native viewport debug objects must be gated to debug Android LAN builds')
}
if (!(fixedCss + interactionCss).includes('.p-dialog-content') || !(fixedCss + interactionCss).includes('overflow-y: auto')) {
  fail('Native fixed viewport CSS must keep dialog content internally scrollable')
}
if (!dashboard.includes('native-auxiliary-mode')) {
  fail('Dashboard must expose a native auxiliary mode class for one-column layout')
}

const changed = changedFiles()
if (changed.some((file) => file.startsWith('apps/api/') || file.includes('prisma/'))) {
  fail('Native fixed viewport work must not modify backend or Prisma files')
}
if (changed.some((file) => file === 'apps/tablet/src/types/production.ts')) {
  fail('Native fixed viewport work must not modify connector or fixture field definitions')
}

if (failures.length) {
  console.error('Native fixed viewport check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Native fixed viewport check passed.')
