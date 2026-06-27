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
    fail(`Missing file: ${relativePath}`)
    return ''
  }
  return readFileSync(fullPath, 'utf8')
}

function readJson(relativePath) {
  try {
    return JSON.parse(read(relativePath))
  } catch {
    fail(`Invalid JSON: ${relativePath}`)
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
const mainActivity = read('apps/tablet/android/app/src/main/java/com/hanglian/control/MainActivity.java')
const strings = read('apps/tablet/android/app/src/main/res/values/strings.xml')
const gitignore = read('.gitignore')
const formalAppName = '\u7ebf\u675f\u8d44\u6599\u5de5\u4f5c\u53f0'

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
  assert(/^(\^|~)?8\./.test(dependencies[pkg] ?? ''), `${pkg} must use Capacitor 8.`)
}
assert(Boolean(dependencies['@capacitor/assets']), '@capacitor/assets must be installed.')

assert(existsSync(path.join(root, 'apps/tablet/android')), 'Android project directory must exist.')
assert(config.includes("appId: 'com.hanglian.control'"), 'Capacitor appId must remain com.hanglian.control.')
assert(config.includes(`appName: '${formalAppName}'`), 'Capacitor appName must be the formal app name.')
assert(config.includes("webDir: 'dist'"), 'Capacitor webDir must be dist.')
assert(/CAPACITOR_REMOTE_WEB_URL/.test(config), 'Release remote entry must be controlled by CAPACITOR_REMOTE_WEB_URL.')
assert(/const server = remoteWebUrl\s*\?/.test(config), 'Capacitor server.url must only be enabled by the controlled remote entry.')
assert(/url:\s*remoteWebUrl/.test(config), 'Capacitor server.url must not be hardcoded in source.')
assert(/cleartext:\s*false/.test(config), 'Release remote entry must disable cleartext traffic.')
assert(/errorPath:\s*'offline\.html'/.test(config), 'Release remote entry must configure offline.html as errorPath.')
assert(/hostname:\s*'localhost'/.test(config), 'Capacitor hostname should stay localhost for bundled mode.')
assert(/androidScheme:\s*'https'/.test(config), 'Android scheme must be https.')
assert(/allowMixedContent:\s*lanDebug/.test(config), 'allowMixedContent must only be controlled by CAPACITOR_LAN_DEBUG.')
assert(/CAPACITOR_LAN_DEBUG/.test(config), 'LAN debug switch must remain explicit.')
assert(/zoomEnabled:\s*false/.test(config), 'Android WebView zoom must be disabled.')
assert(/const loggingBehavior = lanDebug \? 'debug' : 'none'/.test(config), 'Release logging must default to none.')
assert(/loggingBehavior,\s*[\r\n]/.test(config), 'Capacitor loggingBehavior must reuse the controlled value.')

assert(manifest.includes('android.permission.INTERNET'), 'Manifest must request INTERNET.')
assert(manifest.includes('android.permission.CAMERA'), 'Manifest must prepare CAMERA permission.')
assert(manifest.includes('android.hardware.camera.any') && manifest.includes('android:required="false"'), 'Camera feature must be optional.')
assert(manifest.includes('android:screenOrientation="sensorLandscape"'), 'MainActivity must default to sensorLandscape.')
assert(manifest.includes('android:windowSoftInputMode="adjustResize"'), 'MainActivity must use adjustResize.')
assert(!manifest.includes('RECORD_AUDIO'), 'This stage must not request RECORD_AUDIO.')
assert(!manifest.includes('READ_CONTACTS') && !manifest.includes('ACCESS_FINE_LOCATION'), 'This stage must not request contacts or location.')
assert(manifest.includes('android:usesCleartextTraffic="false"'), 'Main Manifest must explicitly disable cleartext traffic.')
assert(debugManifest.includes('android:usesCleartextTraffic="true"'), 'Debug Manifest must separately allow cleartext traffic.')
assert(/versionCode\s+1603/.test(buildGradle), 'Debug versionCode must remain 1603.')
assert(/versionName\s+"0\.16\.3-debug"/.test(buildGradle), 'Debug versionName must remain 0.16.3-debug.')
assert(/production\s*\{[\s\S]*versionCode\s+1801[\s\S]*versionName\s+"0\.18\.1"[\s\S]*\}/.test(buildGradle), 'Production release version must be 0.18.1 / 1801.')
assert(/HANG_LIAN_RELEASE_STORE_FILE/.test(buildGradle), 'Release store file must only be read from HANG_LIAN_RELEASE_STORE_FILE.')
assert(/HANG_LIAN_RELEASE_STORE_PASSWORD/.test(buildGradle), 'Release store password must only be read from HANG_LIAN_RELEASE_STORE_PASSWORD.')
assert(/HANG_LIAN_RELEASE_KEY_ALIAS/.test(buildGradle), 'Release key alias must only be read from HANG_LIAN_RELEASE_KEY_ALIAS.')
assert(/HANG_LIAN_RELEASE_KEY_PASSWORD/.test(buildGradle), 'Release key password must only be read from HANG_LIAN_RELEASE_KEY_PASSWORD.')
assert(!/(storePassword|keyPassword)\s+["'][^"']+["']/.test(buildGradle), 'build.gradle must not hardcode release signing passwords.')
assert(strings.includes(formalAppName), 'Android app name must be the formal app name.')
assert(strings.includes('app_name') && strings.includes('package_name') && strings.includes('custom_url_scheme'), 'Android string resources must include app identity strings.')
assert(mainActivity.includes('setDownloadListener') && mainActivity.includes('DownloadManager.Request'), 'MainActivity must handle WebView downloads.')

for (const scriptName of ['android:check', 'android:sync', 'android:build:debug']) {
  assert(rootPackage.scripts?.[scriptName], `Root package.json missing ${scriptName}.`)
}
for (const scriptName of ['build:android', 'cap:sync:android', 'cap:open:android', 'android:assemble:debug']) {
  assert(tabletPackage.scripts?.[scriptName], `Tablet package.json missing ${scriptName}.`)
}

for (const ignored of [
  'apps/tablet/.env.android.local',
  'apps/tablet/android/local.properties',
  'apps/tablet/android/.gradle',
  'apps/tablet/android/app/build',
  'apps/tablet/android/app/src/main/assets/public',
]) {
  assert(gitignore.includes(ignored) || gitCheckIgnored(ignored), `${ignored} must be ignored.`)
}

const scanFiles = walk('apps/tablet')
  .filter((file) => /\.(ts|vue|xml|gradle|json|md|properties)$/.test(file))
  .filter((file) => !file.endsWith('.env.android.local'))
  .filter((file) => !/\.env\.android\.[^.]+\.local$/.test(file))
  .filter((file) => file !== 'apps/tablet/android/local.properties')

for (const file of scanFiles) {
  const stats = statSync(path.join(root, file))
  if (stats.size > 2 * 1024 * 1024) continue
  const content = readFileSync(path.join(root, file), 'utf8')
  assert(!/(DATABASE_URL|S3_SECRET|WECOM_SECRET|CORPSECRET|GITHUB_TOKEN|SEALOS_TOKEN)\s*[:=]\s*['"][^'"]{8,}/i.test(content), `${file} must not contain sensitive configuration.`)
  assert(!/192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}/.test(content), `${file} must not hardcode LAN IPs.`)
  if (file === 'apps/tablet/android/app/build.gradle') {
    assert(!/\.jks|\.keystore/i.test(content), `${file} must not contain release signing file paths.`)
    assert(!/(storePassword|keyPassword)\s+["'][^"']+["']/i.test(content), `${file} must not hardcode release signing passwords.`)
  } else {
    assert(!/\.jks|\.keystore|storePassword|keyPassword/i.test(content), `${file} must not contain release signing material.`)
  }
}

if (failures.length) {
  console.error('Android app foundation check failed:')
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Android app foundation check passed.')
