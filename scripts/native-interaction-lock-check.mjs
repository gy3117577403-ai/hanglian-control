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
const capacitor = read('apps/tablet/capacitor.config.ts')
const mainActivity = read('apps/tablet/android/app/src/main/java/com/hanglian/control/MainActivity.java')
const viteConfig = read('apps/tablet/vite.config.ts')
const indexHtml = read('apps/tablet/index.html')
const viewportGuard = read('apps/tablet/src/native/native-viewport-guard.ts')
const gestureLock = read('apps/tablet/src/native/native-gesture-lock.ts')
const interactionCss = read('apps/tablet/src/styles/native-interaction-lock.css')
const appViewport = read('apps/tablet/src/composables/use-native-app-viewport.ts')

if (!packageJson.includes('"native-interaction-lock:check"')) fail('package.json must expose native-interaction-lock:check')
if (!/android:\s*{[\s\S]*zoomEnabled:\s*false/.test(capacitor)) fail('Capacitor android.zoomEnabled must be false')
for (const token of [
  'setSupportZoom(false)',
  'setBuiltInZoomControls(false)',
  'setDisplayZoomControls(false)',
  'OVER_SCROLL_NEVER',
]) {
  if (!mainActivity.includes(token)) fail(`MainActivity missing ${token}`)
}
for (const token of ['minimum-scale=1', 'maximum-scale=1', 'user-scalable=no', 'viewport-fit=cover', 'transformIndexHtml']) {
  if (!viteConfig.includes(token)) fail(`Android viewport transform missing ${token}`)
}
if (/user-scalable\s*=\s*no/.test(indexHtml)) fail('Plain web index.html must not force user-scalable=no')
if (!viewportGuard.includes('document.documentElement.clientWidth') && !viewportGuard.includes('window.innerWidth')) {
  fail('Native viewport guard must use layout viewport width')
}
if (/root\.style\.setProperty\('--native-app-width'/.test(viewportGuard)) {
  fail('Native viewport guard must not write --native-app-width from visualViewport')
}
for (const token of [
  'visualViewport?.scale',
  'viewportScale()',
  'recordNativeIgnoredZoomResize',
  'lastStableWidth',
  'lastStableHeight',
  'orientationchange',
]) {
  if (!viewportGuard.includes(token)) fail(`Native viewport guard missing ${token}`)
}
if (!gestureLock.includes('event.touches.length > 1')) fail('Gesture lock must only block multi-touch')
if (!gestureLock.includes('preventDefault()')) fail('Gesture lock must prevent native page pinch')
if (!gestureLock.includes('passive: false') || !gestureLock.includes('capture: true')) fail('Gesture lock must use non-passive capture listeners')
if (/touchmove['"],\s*\([^)]*\)\s*=>\s*[^}]*preventDefault/.test(gestureLock)) fail('Gesture lock must not block all single-finger touchmove')
for (const token of [
  'html[data-native-app="true"]',
  'height: var(--native-app-height, 100dvh)',
  'overflow: hidden',
  'overscroll-behavior: none',
  'position: fixed',
  'touch-action: pan-x pan-y',
  '.p-dialog-content',
  'touch-action: pan-y',
]) {
  if (!interactionCss.includes(token)) fail(`Native interaction CSS missing ${token}`)
}
if (!appViewport.includes('installNativeViewportGuard')) fail('useNativeAppViewport must install the native viewport guard')

const changed = changedFiles()
if (changed.some((file) => file.startsWith('apps/api/') || file.includes('prisma/'))) {
  fail('Native interaction lock must not modify backend or Prisma files')
}

if (failures.length) {
  console.error('Native interaction lock check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Native interaction lock check passed.')
