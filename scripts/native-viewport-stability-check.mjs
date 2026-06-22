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

const packageJson = read('package.json')
const guard = read('apps/tablet/src/native/native-viewport-guard.ts')
const appViewport = read('apps/tablet/src/composables/use-native-app-viewport.ts')

if (!packageJson.includes('"native-viewport-stability:check"')) fail('package.json must expose native-viewport-stability:check')
for (const token of [
  'document.documentElement.clientWidth || window.innerWidth',
  'window.innerHeight',
  'visualViewport?.scale',
  'Math.abs(viewportScale() - 1) > 0.02',
  'viewportOffsetLeft',
  'viewportOffsetTop',
  'lastStableWidth',
  'lastStableHeight',
  'ignoredZoomResizeCount',
  'acceptedResizeCount',
  'recordNativeIgnoredZoomResize',
  'requestAnimationFrame',
  'orientationchange',
  'visibilitychange',
]) {
  if (!guard.includes(token)) fail(`Native viewport guard missing ${token}`)
}
if (/setProperty\('--native-app-width'/.test(guard)) fail('Viewport guard must not write --native-app-width')
if (/visualViewport\.scroll|addEventListener\('scroll'/.test(guard)) fail('Viewport guard must not use visualViewport scroll to mutate root layout')
if (/localStorage|sessionStorage|fetch\(|sendBeacon/.test(guard)) fail('Viewport guard must not persist or upload data')
if (!appViewport.includes('installNativeViewportGuard')) fail('useNativeAppViewport must use native viewport guard')

if (failures.length) {
  console.error('Native viewport stability check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Native viewport stability check passed.')
