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

const nativePlatform = read('apps/tablet/src/native/native-platform.ts')
const apiBase = read('apps/tablet/src/config/api-base.ts')
const runtimeConfig = read('apps/tablet/src/config/runtime-config.ts')
const apiService = read('apps/tablet/src/services/api.ts')
const envExample = read('apps/tablet/.env.android.example')
const gitignore = read('.gitignore')
const cors = read('apps/api/src/config/cors.config.ts')
const networkDialog = read('apps/tablet/src/components/system/WarmNetworkDiagnosticsDialog.vue')

assert(nativePlatform.includes('Capacitor.isNativePlatform'), '必须通过 Capacitor 判断原生环境')
assert(nativePlatform.includes('VITE_NATIVE_API_BASE_URL'), '原生 API 必须从 VITE_NATIVE_API_BASE_URL 读取')
assert(nativePlatform.includes('NATIVE_API_MISSING_MESSAGE'), '必须提供原生 API 缺失提示')
assert(!/localhost:3000/.test(nativePlatform), '原生 API 解析不得 fallback 到设备 localhost:3000')
assert(!/192\.168\.\d{1,3}\.\d{1,3}/.test(nativePlatform), '原生 API 解析不得硬编码 LAN IP')

const apiRuntimeFunction = apiBase.slice(apiBase.indexOf('export function getApiRuntimeConfig'))
assert(apiRuntimeFunction.indexOf('if (isNativeApp())') >= 0 && apiRuntimeFunction.indexOf('if (isNativeApp())') < apiRuntimeFunction.indexOf('readPublicRuntimeConfig'), '原生 API 优先级必须高于 Web runtime config')
assert(apiBase.includes('native-env') && apiBase.includes('native-missing'), 'API source 必须包含 native-env/native-missing')
assert(runtimeConfig.includes('window.__HANGLIAN_RUNTIME_CONFIG__'), 'Web/PWA runtime config 读取必须保留')
assert(runtimeConfig.includes('VITE_API_BASE_URL') === false, 'VITE_API_BASE_URL 应由 api-base.ts 处理，不应混入 runtime-config.ts')
assert(apiBase.includes('import.meta.env.VITE_API_BASE_URL'), 'Web/PWA VITE_API_BASE_URL 优先级必须保留')
assert(apiBase.includes('resolveAutomaticApiBaseUrl()'), 'Web/PWA 自动 LAN/local 逻辑必须保留')
assert(apiService.includes("API_RUNTIME_CONFIG.source === 'native-missing'"), '缺失原生 API 时必须阻止请求')
assert(apiService.includes('APP 尚未配置服务器地址。') || apiService.includes('NATIVE_API_MISSING_MESSAGE'), '缺失原生 API 必须显示中文提示')

assert(envExample.includes('VITE_NATIVE_API_BASE_URL=https://YOUR_API_DOMAIN/api'), '.env.android.example 必须使用 HTTPS 占位')
assert(envExample.includes('VITE_NATIVE_API_ENV=android'), '.env.android.example 必须声明 android 环境')
assert(gitignore.includes('apps/tablet/.env.android.local'), '.env.android.local 必须被忽略')
assert(!read('apps/tablet/capacitor.config.ts').includes('server: {\n    url'), 'Capacitor config 不得配置 server.url')
assert(!/\/api\/api/.test([nativePlatform, apiBase, runtimeConfig].join('\n')), 'API 地址解析不得产生 /api/api')

assert(cors.includes("url.protocol !== 'http:' && url.protocol !== 'https:'"), 'CORS 本地开发来源必须限制 http/https')
assert(cors.includes("url.hostname === 'localhost'") && cors.includes("url.hostname === '127.0.0.1'"), 'CORS 本地开发必须允许 localhost/127.0.0.1')
assert(cors.includes('process.env.NODE_ENV === \'production\'') && cors.includes('CORS_ORIGINS'), '生产 CORS 必须依赖显式 CORS_ORIGINS')
assert(!/fallback\s*=.*\*/.test(cors), '生产或默认 CORS 不得使用 *')
assert(networkDialog.includes('getDataSourceStatus'), '网络诊断仍可读取数据源状态')
assert(!/ALLOW_PRISMA_WRITE\s*=\s*true|ALLOW_DESTRUCTIVE_DB_ACTIONS\s*=\s*true|new\s+PrismaClient|prisma\s+(migrate|db push|db seed)/i.test([nativePlatform, apiBase, networkDialog].join('\n')), '原生 API 配置不得引入写库或迁移')

if (failures.length) {
  console.error('Native API config check failed:')
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Native API config check passed.')
