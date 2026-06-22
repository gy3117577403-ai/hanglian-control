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

const handler = read('apps/tablet/src/native/android-back-handler.ts')
const shell = read('apps/tablet/src/native/native-shell.ts')
const store = read('apps/tablet/src/stores/document-hub-store.ts')
const main = read('apps/tablet/src/main.ts')

assert(handler.includes('isAndroidApp()'), '返回键监听必须只在 Android 原生环境安装')
assert(handler.includes("addListener('backButton'"), '必须监听 Capacitor backButton')
assert(handler.includes('closeTopPrimeDialog'), '必须优先关闭 PrimeVue/native 弹窗')
assert(handler.includes('.p-dialog-mask') && handler.includes('.p-dialog-header-close'), '弹窗关闭必须识别 PrimeVue DOM')
assert(handler.includes('documentViewerOpen') && handler.includes('closeDocumentViewer'), '查看器打开时必须优先关闭查看器')
assert(handler.includes('goBack()'), '产品/模块详情必须复用现有逐级返回')
assert(store.includes('function goBack()') && store.includes('navigation.popReturnPoint'), '现有导航记忆返回逻辑必须保留')
assert(handler.includes('router.back()'), '非 /tablet 路由必须保留 router.back 兜底')
assert(handler.includes('再次返回退出应用'), '根页面首次返回必须提示再次返回退出')
assert(handler.includes('exitApp()'), '根页面双击返回必须调用 App.exitApp')
assert(handler.includes('now - lastRootBackAt < 2000'), '双击返回窗口必须是 2 秒')
assert(handler.includes('handle.remove()'), '返回键监听必须提供 cleanup')
assert(shell.includes('installAndroidBackHandler(router)'), 'Native shell 必须安装 Android 返回键处理')
assert(main.includes('initializeNativeShell(router)'), 'main.ts 必须初始化 Native shell')
assert(!handler.includes('window.addEventListener(\'popstate\''), 'Web 环境不得安装 Android 返回键监听')
assert(!/missing-\w+.*productId|productId.*missing-/s.test(handler), '返回键不得把 missing-* 当作产品 ID 处理')

if (failures.length) {
  console.error('Android back navigation check failed:')
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Android back navigation check passed.')
