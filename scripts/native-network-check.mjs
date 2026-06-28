import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []

function fail(message) {
  failures.push(message)
}

function read(relativePath) {
  const fullPath = path.join(root, relativePath)
  if (!existsSync(fullPath)) {
    fail(`缺少文件：${relativePath}`)
    return ''
  }
  return readFileSync(fullPath, 'utf8')
}

function assert(condition, message) {
  if (!condition) fail(message)
}

const network = read('apps/tablet/src/native/native-network.ts')
const banner = read('apps/tablet/src/components/native/WarmNativeNetworkBanner.vue')
const shell = read('apps/tablet/src/native/native-shell.ts')
const app = read('apps/tablet/src/App.vue')

assert(network.includes('Network.getStatus()'), '必须读取 Capacitor Network.getStatus')
assert(network.includes("addListener('networkStatusChange'"), '必须监听 networkStatusChange')
assert(network.includes('handle.remove()'), '网络监听必须 cleanup')
assert(network.includes('navigator.onLine'), 'Web fallback 必须使用 navigator.onLine')
assert(network.includes('网络已断开，部分资料暂时无法加载。'), '必须有中文离线提示')
assert(network.includes('网络已恢复。'), '必须有中文恢复提示')
assert(!/uploadAllItems|retryFailedItems|applyPdfImport|applyOrderImport|completeOrder|updateOrderStatus/.test(network), '网络恢复不得自动重放写操作')
assert(shell.includes('initializeNativeNetwork()'), 'Native shell 必须初始化网络监听')
assert(shell.includes('refreshNativeNetworkStatus()'), 'resume 时必须轻量刷新网络状态')
assert(shell.includes('closeActiveCameraStream'), 'pause 时必须关闭相机流')
assert(shell.includes('SplashScreen.hide'), 'Native shell 必须隐藏 Splash Screen')
assert(shell.includes('StatusBar.setOverlaysWebView') && shell.includes('StatusBar.setStyle'), 'Native shell 必须处理状态栏')
assert(banner.includes('nativeNetworkState'), 'Banner 必须消费原生网络状态')
assert(banner.includes('NATIVE_API_MISSING_MESSAGE'), 'Banner 必须展示原生 API 缺失提示')
assert(banner.includes('role="status"') && banner.includes('aria-live="polite"'), 'Banner 必须是轻量状态提示')
assert(app.includes('WarmNativeNetworkBanner'), 'App.vue 必须挂载 Native 网络提示')

if (failures.length) {
  console.error('Native network check failed:')
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Native network check passed.')
