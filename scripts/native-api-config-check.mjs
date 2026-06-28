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
    fail(`Missing file: ${relativePath}`)
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
const releaseBuild = read('scripts/android-release-build.mjs')
const envExample = read('apps/tablet/.env.android.example')
const gitignore = read('.gitignore')
const cors = read('apps/api/src/config/cors.config.ts')
const networkDialog = read('apps/tablet/src/components/system/WarmNetworkDiagnosticsDialog.vue')
const capacitorConfig = read('apps/tablet/capacitor.config.ts')

assert(nativePlatform.includes('Capacitor.isNativePlatform'), 'Native environment must be detected through Capacitor.')
assert(nativePlatform.includes('VITE_NATIVE_API_BASE_URL'), 'Native API must read VITE_NATIVE_API_BASE_URL.')
assert(nativePlatform.includes('NATIVE_API_MISSING_MESSAGE'), 'Native API missing message must remain available.')
assert(nativePlatform.includes('DEFAULT_ANDROID_ENTRY_URL'), 'Android release must declare a default Tablet entry URL.')
assert(nativePlatform.includes('DEFAULT_ANDROID_API_BASE_URL'), 'Android release must declare a default API base URL.')
assert(nativePlatform.includes('https://fyeboolnlvqv.sealoshzh.site/tablet'), 'Android default entry must point to the production Tablet URL.')
assert(nativePlatform.includes('https://fyeboolnlvqv.sealoshzh.site/api'), 'Android default API must point to the production API URL.')
assert(nativePlatform.includes('getSameOriginApiBaseUrl'), 'Native API fallback must prefer same-origin /api for the production Web entry.')
assert(!/localhost:3000/.test(nativePlatform), 'Native API resolution must not fall back to localhost:3000.')
assert(!/192\.168\.\d{1,3}\.\d{1,3}/.test(nativePlatform), 'Native API resolution must not hardcode a LAN IP.')

assert(releaseBuild.includes('CAPACITOR_REMOTE_WEB_URL'), 'Android release build must configure the remote Tablet entry.')
assert(releaseBuild.includes('VITE_NATIVE_API_BASE_URL') && releaseBuild.includes('releaseApiBaseUrl'), 'Android release build must inject VITE_NATIVE_API_BASE_URL.')
assert(releaseBuild.includes('https://fyeboolnlvqv.sealoshzh.site/tablet'), 'Android release build must default to the production Tablet URL.')
assert(releaseBuild.includes('https://fyeboolnlvqv.sealoshzh.site/api'), 'Android release build must default to the production API URL.')
assert(releaseBuild.includes('VITE_NATIVE_API_ENV') && releaseBuild.includes('android-cloud-release'), 'Android release build must mark the native API environment.')

const apiRuntimeFunction = apiBase.slice(apiBase.indexOf('export function getApiRuntimeConfig'))
assert(
  apiRuntimeFunction.indexOf('if (isNativeApp())') >= 0
    && apiRuntimeFunction.indexOf('if (isNativeApp())') < apiRuntimeFunction.indexOf('readPublicRuntimeConfig'),
  'Native API priority must stay above Web runtime config.',
)
assert(apiBase.includes('native-env') && apiBase.includes('native-missing'), 'API source must include native-env/native-missing.')
assert(runtimeConfig.includes('window.__HANGLIAN_RUNTIME_CONFIG__'), 'Web/PWA runtime config reading must remain.')
assert(!runtimeConfig.includes('VITE_API_BASE_URL'), 'VITE_API_BASE_URL must be handled by api-base.ts, not runtime-config.ts.')
assert(apiBase.includes('import.meta.env.VITE_API_BASE_URL'), 'Web/PWA VITE_API_BASE_URL priority must remain.')
assert(apiBase.includes('resolveAutomaticApiBaseUrl()'), 'Web/PWA automatic LAN/local API logic must remain.')
assert(apiService.includes("API_RUNTIME_CONFIG.source === 'native-missing'"), 'Missing native API must still block requests when no default exists.')
assert(apiService.includes('NATIVE_API_MISSING_MESSAGE'), 'Missing native API must display the standard message.')

assert(envExample.includes('VITE_NATIVE_API_BASE_URL=https://YOUR_API_DOMAIN/api'), '.env.android.example must use an HTTPS placeholder.')
assert(envExample.includes('VITE_NATIVE_API_ENV=android'), '.env.android.example must declare the android environment.')
assert(gitignore.includes('apps/tablet/.env.android.local'), '.env.android.local must be ignored.')
assert(!capacitorConfig.includes('server: {\n    url'), 'Capacitor source config must not hardcode server.url.')
assert(!/\/api\/api/.test([nativePlatform, apiBase, runtimeConfig].join('\n')), 'API URL resolution must not produce /api/api.')

assert(cors.includes("url.protocol !== 'http:' && url.protocol !== 'https:'"), 'CORS local origins must be limited to http/https.')
assert(cors.includes("url.hostname === 'localhost'") && cors.includes("url.hostname === '127.0.0.1'"), 'CORS local development must allow localhost/127.0.0.1.')
assert(cors.includes("process.env.NODE_ENV === 'production'") && cors.includes('CORS_ORIGINS'), 'Production CORS must depend on explicit CORS_ORIGINS.')
assert(!/fallback\s*=.*\*/.test(cors), 'Production/default CORS must not use wildcard fallback.')
assert(networkDialog.includes('getDataSourceStatus'), 'Network diagnostics must still read data-source status.')
assert(
  !/ALLOW_PRISMA_WRITE\s*=\s*true|ALLOW_DESTRUCTIVE_DB_ACTIONS\s*=\s*true|new\s+PrismaClient|prisma\s+(migrate|db push|db seed)/i
    .test([nativePlatform, apiBase, networkDialog].join('\n')),
  'Native API config must not introduce database writes or migration commands.',
)

if (failures.length) {
  console.error('Native API config check failed:')
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Native API config check passed.')
