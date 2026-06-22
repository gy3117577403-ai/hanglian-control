import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
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

function readJson(relativePath) {
  try {
    return JSON.parse(read(relativePath))
  } catch {
    fail(`JSON 无法解析：${relativePath}`)
    return {}
  }
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function gitCheckIgnored(relativePath) {
  try {
    execFileSync('git', ['check-ignore', '-q', relativePath], { cwd: root, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function walk(relativeDir, files = []) {
  const fullDir = path.join(root, relativeDir)
  if (!existsSync(fullDir)) return files
  for (const entry of readdirSync(fullDir, { withFileTypes: true })) {
    const relativePath = path.posix.join(relativeDir.replaceAll(path.sep, '/'), entry.name)
    if (entry.isDirectory()) {
      if (
        relativePath.includes('node_modules')
        || relativePath.includes('/dist')
        || relativePath.includes('/android/app/src/main/assets/public')
        || relativePath.includes('/android/app/build')
        || relativePath.includes('/android/.gradle')
      ) continue
      walk(relativePath, files)
      continue
    }
    if (entry.isFile()) files.push(relativePath)
  }
  return files
}

const rootPackage = readJson('package.json')
const tabletPackage = readJson('apps/tablet/package.json')
const config = read('apps/tablet/capacitor.config.ts')
const manifest = read('apps/tablet/android/app/src/main/AndroidManifest.xml')
const debugManifest = read('apps/tablet/android/app/src/debug/AndroidManifest.xml')
const buildGradle = read('apps/tablet/android/app/build.gradle')
const strings = read('apps/tablet/android/app/src/main/res/values/strings.xml')
const gitignore = read('.gitignore')

const dependencies = { ...(tabletPackage.dependencies ?? {}), ...(tabletPackage.devDependencies ?? {}) }
for (const pkg of [
  '@capacitor/core',
  '@capacitor/android',
  '@capacitor/app',
  '@capacitor/network',
  '@capacitor/status-bar',
  '@capacitor/splash-screen',
  '@capacitor/screen-orientation',
  '@capacitor/camera',
  '@capacitor/cli',
]) {
  assert(/^(\^|~)?8\./.test(dependencies[pkg] ?? ''), `${pkg} 必须使用 Capacitor 8`)
}
assert(Boolean(dependencies['@capacitor/assets']), '@capacitor/assets 必须安装')

assert(existsSync(path.join(root, 'apps/tablet/android')), 'Android 工程目录必须存在')
assert(config.includes("appId: 'com.hanglian.control'"), 'Capacitor appId 必须是 com.hanglian.control')
assert(config.includes("appName: '线束资料工作台'"), 'Capacitor appName 必须是线束资料工作台')
assert(config.includes("webDir: 'dist'"), 'Capacitor webDir 必须是 dist')
assert(!/server\s*:\s*{[^}]*url\s*:/s.test(config), 'Capacitor 正式配置不得包含 server.url')
assert(/hostname:\s*'localhost'/.test(config), 'Capacitor hostname 应保持 localhost')
assert(/androidScheme:\s*'https'/.test(config), 'Android scheme 必须是 https')
assert(/allowMixedContent:\s*lanDebug/.test(config), 'allowMixedContent 只能由 CAPACITOR_LAN_DEBUG 控制')
assert(/CAPACITOR_LAN_DEBUG/.test(config), '必须保留 LAN Debug 开关')
assert(/zoomEnabled:\s*false/.test(config), 'Android WebView 必须禁用缩放')
assert(/const loggingBehavior = lanDebug \? 'debug' : 'none'/.test(config), 'Release 默认必须关闭调试日志，Debug 阶段由 CAPACITOR_LAN_DEBUG 启用')
assert(/loggingBehavior,\s*[\r\n]/.test(config), 'Capacitor loggingBehavior 必须复用受控配置')

assert(manifest.includes('android.permission.INTERNET'), 'Manifest 必须申请 INTERNET')
assert(manifest.includes('android.permission.CAMERA'), 'Manifest 必须预备 CAMERA 权限')
assert(manifest.includes('android.hardware.camera.any') && manifest.includes('android:required="false"'), '摄像头 feature 必须是非必需')
assert(manifest.includes('android:screenOrientation="sensorLandscape"'), 'MainActivity 必须默认 sensorLandscape')
assert(manifest.includes('android:windowSoftInputMode="adjustResize"'), 'MainActivity 必须 adjustResize')
assert(!manifest.includes('RECORD_AUDIO'), '本阶段不得申请录音权限')
assert(!manifest.includes('READ_CONTACTS') && !manifest.includes('ACCESS_FINE_LOCATION'), '本阶段不得申请联系人或定位权限')
assert(!manifest.includes('android:usesCleartextTraffic="true"'), '主 Manifest 不得开启全局明文网络')
assert(debugManifest.includes('android:usesCleartextTraffic="true"'), 'Debug Manifest 必须隔离开启明文网络')
assert(/versionCode\s+1601/.test(buildGradle), 'versionCode 必须是 1601')
assert(/versionName\s+"0\.16\.1-debug"/.test(buildGradle), 'versionName 必须是 0.16.1-debug')
assert(strings.includes('线束资料工作台'), 'Android app name 必须是线束资料工作台')

for (const scriptName of ['android:check', 'android:sync', 'android:build:debug']) {
  assert(rootPackage.scripts?.[scriptName], `根 package.json 缺少 ${scriptName}`)
}
for (const scriptName of ['build:android', 'cap:sync:android', 'cap:open:android', 'android:assemble:debug']) {
  assert(tabletPackage.scripts?.[scriptName], `tablet package.json 缺少 ${scriptName}`)
}

for (const ignored of [
  'apps/tablet/.env.android.local',
  'apps/tablet/android/local.properties',
  'apps/tablet/android/.gradle',
  'apps/tablet/android/app/build',
  'apps/tablet/android/app/src/main/assets/public',
]) {
  assert(gitignore.includes(ignored) || gitCheckIgnored(ignored), `${ignored} 必须被忽略`)
}

const scanFiles = walk('apps/tablet')
  .filter((file) => /\.(ts|vue|xml|gradle|json|md|properties)$/.test(file))
  .filter((file) => !file.endsWith('.env.android.local'))
for (const file of scanFiles) {
  const stats = statSync(path.join(root, file))
  if (stats.size > 2 * 1024 * 1024) continue
  const content = readFileSync(path.join(root, file), 'utf8')
  assert(!/(DATABASE_URL|S3_SECRET|WECOM_SECRET|CORPSECRET|GITHUB_TOKEN|SEALOS_TOKEN)\s*[:=]\s*['"][^'"]{8,}/i.test(content), `${file} 不得包含敏感配置`)
  assert(!/192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}/.test(content), `${file} 不得硬编码 LAN IP`)
  assert(!/\.jks|\.keystore|storePassword|keyPassword/i.test(content), `${file} 不得包含正式签名材料`)
}

if (failures.length) {
  console.error('Android app foundation check failed:')
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Android app foundation check passed.')
