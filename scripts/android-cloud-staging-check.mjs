import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []
const apkPath = path.join(root, 'local-test-assets/android/hanglian-control-v0.17.0-staging-debug.apk')
const builtAssetsDir = path.join(root, 'apps/tablet/android/app/src/main/assets/public')

function fail(message) {
  failures.push(message)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function read(relativePath) {
  const fullPath = path.join(root, relativePath)
  if (!existsSync(fullPath)) {
    fail(`Missing file: ${relativePath}`)
    return ''
  }
  return readFileSync(fullPath, 'utf8')
}

function gitLsFiles(pattern) {
  try {
    return execFileSync('git', ['ls-files', pattern], { cwd: root, encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

function collectTextFiles(dir, files = []) {
  if (!existsSync(dir)) return files
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      collectTextFiles(fullPath, files)
    } else if (entry.isFile() && /\.(html|js|css|json|txt|svg)$/i.test(entry.name)) {
      files.push(fullPath)
    }
  }
  return files
}

console.log('V3.17 Android cloud staging check')
console.log('This check is local-only and does not install APKs or connect to external services.')

const rootPackage = read('package.json')
const tabletPackage = read('apps/tablet/package.json')
const viteConfig = read('apps/tablet/vite.config.ts')
const capacitor = read('apps/tablet/capacitor.config.ts')
const buildGradle = read('apps/tablet/android/app/build.gradle')
const mainManifest = read('apps/tablet/android/app/src/main/AndroidManifest.xml')
const debugManifest = read('apps/tablet/android/app/src/debug/AndroidManifest.xml')
const stagingDebugManifest = read('apps/tablet/android/app/src/stagingDebug/AndroidManifest.xml')
const mainActivity = read('apps/tablet/android/app/src/main/java/com/hanglian/control/MainActivity.java')
const nativeViewport = read('apps/tablet/src/native/native-viewport-guard.ts')
const stagingExample = read('apps/tablet/.env.android.staging.example')
const stagingLocalPath = path.join(root, 'apps/tablet/.env.android.staging.local')
const stagingLocal = existsSync(stagingLocalPath) ? readFileSync(stagingLocalPath, 'utf8') : ''
const gitignore = read('.gitignore')

assert(rootPackage.includes('"android-cloud-staging:check"'), 'Root package must expose android-cloud-staging:check.')
assert(rootPackage.includes('"android:build:staging-debug"'), 'Root package must expose android:build:staging-debug.')
assert(rootPackage.includes('"build:android:staging"'), 'Root package must expose build:android:staging.')
assert(rootPackage.includes('"cap:sync:android:staging"'), 'Root package must expose cap:sync:android:staging.')
assert(tabletPackage.includes('"build:android:staging"') && tabletPackage.includes('--mode android-staging'), 'Tablet package must build android-staging mode.')
assert(tabletPackage.includes('"android:assemble:staging-debug"') && tabletPackage.includes('assembleStagingDebug'), 'Tablet package must assemble staging debug variant.')

assert(viteConfig.includes('android-staging'), 'Vite config must support android-staging mode.')
assert(viteConfig.includes('loadAndroidNativeEnv') && viteConfig.includes('`.env.android.${envName}.local`'), 'Vite config must load the ignored staging env file through the native env loader.')
assert(viteConfig.includes('androidViewportPlugin(nativeAndroidBuild)'), 'Android staging must keep the viewport lock plugin.')
assert(stagingExample.includes('VITE_NATIVE_API_BASE_URL=https://YOUR_SEALOS_API_DOMAIN/api'), 'Staging example must use HTTPS placeholder.')
if (stagingLocal) {
  assert(stagingLocal.includes('VITE_NATIVE_API_BASE_URL=https://fyeboolnlvqv.sealoshzh.site/api'), 'Local staging env must point to the Sealos HTTPS API.')
  assert(stagingLocal.includes('VITE_NATIVE_API_ENV=android-cloud-staging'), 'Local staging env must set the android cloud staging env name.')
  assert(!/http:\/\/|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|localhost:3000|DATABASE_URL|S3_|SECRET|TOKEN/i.test(stagingLocal), 'Local staging env must not include LAN, localhost, database, storage, or secret values.')
}
assert(gitignore.includes('apps/tablet/.env.android.staging.local'), 'Local staging env must be ignored.')
assert(!gitLsFiles('apps/tablet/.env.android.staging.local'), 'Local staging env must not be tracked by Git.')

assert(capacitor.includes("androidScheme: 'https'"), 'Capacitor Android scheme must remain https.')
assert(capacitor.includes('allowMixedContent: lanDebug'), 'allowMixedContent must remain controlled by CAPACITOR_LAN_DEBUG.')
assert(capacitor.includes('zoomEnabled: false'), 'Capacitor zoom lock must remain enabled.')
assert(!/server\s*:\s*{[\s\S]*url\s*:/.test(capacitor), 'Capacitor config must not include server.url.')
assert(!mainManifest.includes('android:usesCleartextTraffic="true"'), 'Main manifest must not enable cleartext.')
assert(debugManifest.includes('android:usesCleartextTraffic="true"'), 'Local debug manifest may keep LAN cleartext isolated to debug.')
assert(stagingDebugManifest.includes('android:usesCleartextTraffic="false"'), 'Staging debug manifest must force cleartext=false.')
assert(stagingDebugManifest.includes('tools:replace="android:usesCleartextTraffic"'), 'Staging debug manifest must override the debug cleartext flag.')

assert(buildGradle.includes('flavorDimensions "environment"'), 'Android build must define an environment flavor dimension.')
assert(buildGradle.includes('staging {') && buildGradle.includes('versionCode 1700'), 'Staging flavor must set versionCode 1700.')
assert(buildGradle.includes('versionName "0.17.0-staging-debug"'), 'Staging flavor must set versionName 0.17.0-staging-debug.')
assert(buildGradle.includes('applicationId "com.hanglian.control"'), 'applicationId must remain com.hanglian.control.')
assert(mainActivity.includes('setSupportZoom(false)') && mainActivity.includes('setBuiltInZoomControls(false)') && mainActivity.includes('setDisplayZoomControls(false)'), 'MainActivity must keep WebView zoom disabled.')
assert(mainActivity.includes('setDownloadListener') && mainActivity.includes('DownloadManager.Request'), 'MainActivity must keep native WebView downloads enabled.')
assert(nativeViewport.includes('Math.abs(viewportScale() - 1) > 0.02') || nativeViewport.includes('Math.abs(scale - 1) > 0.02'), 'Native viewport scale guard must remain in place.')

for (const content of [viteConfig, capacitor, buildGradle, mainManifest, stagingDebugManifest]) {
  assert(!/DATABASE_URL|S3_SECRET|WECOM|VOICE|CORPSECRET|GITHUB_TOKEN|SEALOS_TOKEN/i.test(content), 'Android staging source files must not contain secret names or credentials.')
}

if (existsSync(apkPath)) {
  const stats = statSync(apkPath)
  assert(stats.size > 1024 * 1024, 'Cloud staging APK must be larger than 1 MB when present.')
  assert(!gitLsFiles('local-test-assets/android/hanglian-control-v0.17.0-staging-debug.apk'), 'Cloud staging APK must not be tracked by Git.')
}

const builtAssets = collectTextFiles(builtAssetsDir)
if (builtAssets.length) {
  const builtText = builtAssets.map((file) => readFileSync(file, 'utf8')).join('\n')
  if (builtText.includes('android-cloud-staging')) {
    assert(builtText.includes('https://fyeboolnlvqv.sealoshzh.site/api'), 'Built Android staging assets must contain the Sealos HTTPS API URL.')
    assert(!/localhost:3000|http:\/\/(127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)|DATABASE_URL|S3_SECRET|CORPSECRET|VOICE_SECRET/i.test(builtText), 'Built Android staging assets must not contain LAN, localhost API, database, or secret markers.')
  }
}

if (failures.length) {
  console.error('Android cloud staging check failed:')
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Android cloud staging check passed.')
