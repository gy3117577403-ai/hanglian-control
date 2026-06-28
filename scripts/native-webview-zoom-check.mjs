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
const capacitor = read('apps/tablet/capacitor.config.ts')
const mainActivity = read('apps/tablet/android/app/src/main/java/com/hanglian/control/MainActivity.java')
const viteConfig = read('apps/tablet/vite.config.ts')

if (!packageJson.includes('"native-webview-zoom:check"')) fail('package.json must expose native-webview-zoom:check')
if (!/zoomEnabled:\s*false/.test(capacitor)) fail('Capacitor android.zoomEnabled must be false')
for (const token of [
  'WebView webView = getBridge().getWebView()',
  'WebSettings settings = webView.getSettings()',
  'settings.setSupportZoom(false)',
  'settings.setBuiltInZoomControls(false)',
  'settings.setDisplayZoomControls(false)',
  'webView.setOverScrollMode(View.OVER_SCROLL_NEVER)',
]) {
  if (!mainActivity.includes(token)) fail(`MainActivity missing ${token}`)
}
if (/setInitialScale|setTextZoom|setLayerType|loadUrl/.test(mainActivity)) {
  fail('MainActivity must not use scale hacks, software layer changes or remote page loading')
}
for (const token of ['maximum-scale=1', 'minimum-scale=1', 'user-scalable=no']) {
  if (!viteConfig.includes(token)) fail(`Android viewport missing ${token}`)
}

if (failures.length) {
  console.error('Native WebView zoom check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Native WebView zoom check passed.')
