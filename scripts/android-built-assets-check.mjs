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

function readOptional(relativePath) {
  const fullPath = join(root, relativePath)
  if (!existsSync(fullPath)) return ''
  return readFileSync(fullPath, 'utf8')
}

function viewportContent(html) {
  const matches = [...html.matchAll(/<meta\s+name=["']viewport["'][^>]*content=["']([^"']+)["'][^>]*>/gi)]
  if (matches.length !== 1) fail(`Expected exactly one viewport meta, found ${matches.length}`)
  return matches[0]?.[1] ?? ''
}

function requireLockedViewport(label, html) {
  const content = viewportContent(html)
  for (const token of ['width=device-width', 'initial-scale=1', 'minimum-scale=1', 'maximum-scale=1', 'user-scalable=no', 'viewport-fit=cover']) {
    if (!content.includes(token)) fail(`${label} viewport missing ${token}`)
  }
  if (/maximum-scale\s*=\s*[2-9]/.test(content) || /minimum-scale\s*=\s*0/.test(content) || /shrink-to-fit\s*=\s*yes/.test(content)) {
    fail(`${label} viewport allows unsafe scaling`)
  }
}

const packageJson = read('package.json')
const distIndex = read('apps/tablet/dist/index.html')
const androidIndex = readOptional('apps/tablet/android/app/src/main/assets/public/index.html')
const androidOffline = readOptional('apps/tablet/android/app/src/main/assets/public/offline.html')
const generatedCapacitorConfig = readOptional('apps/tablet/android/app/src/main/assets/capacitor.config.json')
const capacitor = read('apps/tablet/capacitor.config.ts')
const mainActivity = read('apps/tablet/android/app/src/main/java/com/hanglian/control/MainActivity.java')
const buildGradle = read('apps/tablet/android/app/build.gradle')
const remoteEntryEnabled = /"server"\s*:\s*\{[\s\S]*"url"\s*:\s*"https:\/\/[^"]+\/tablet"[\s\S]*"cleartext"\s*:\s*false[\s\S]*\}/.test(generatedCapacitorConfig)

if (!packageJson.includes('"android-built-assets:check"')) fail('package.json must expose android-built-assets:check')
requireLockedViewport('dist/index.html', distIndex)
if (androidIndex) {
  requireLockedViewport('Android assets index.html', androidIndex)
  if (distIndex !== androidIndex) fail('Android assets index.html must match dist/index.html after cap sync')
} else if (remoteEntryEnabled) {
  if (!/"cleartext"\s*:\s*false/.test(generatedCapacitorConfig)) fail('Remote Android entry must disable cleartext traffic')
  if (!/"errorPath"\s*:\s*"offline\.html"/.test(generatedCapacitorConfig)) fail('Remote Android entry must configure offline.html as errorPath')
  if (!androidOffline) fail('Remote Android entry must package offline.html')
  if (androidOffline) requireLockedViewport('Android offline.html', androidOffline)
} else {
  fail('Android assets index.html is missing and no safe remote Tablet entry was generated')
}
if (!/zoomEnabled:\s*false/.test(capacitor)) fail('android.zoomEnabled=false must remain in capacitor config')
if (!/CAPACITOR_REMOTE_WEB_URL/.test(capacitor) || !/url:\s*remoteWebUrl/.test(capacitor)) {
  fail('Capacitor remote server.url must be controlled by CAPACITOR_REMOTE_WEB_URL')
}
if (/url:\s*['"]https?:\/\//.test(capacitor)) fail('Capacitor source config must not hardcode remote server.url')
if (!mainActivity.includes('setSupportZoom(false)') || !mainActivity.includes('OVER_SCROLL_NEVER')) {
  fail('MainActivity WebSettings zoom lock must exist')
}
if (!/versionCode\s+1603/.test(buildGradle) || !/versionName\s+"0\.16\.3-debug"/.test(buildGradle)) {
  fail('Android debug version must be 1603 / 0.16.3-debug')
}
if (!/production\s*\{[\s\S]*versionCode\s+1800[\s\S]*versionName\s+"0\.18\.0"[\s\S]*\}/.test(buildGradle)) {
  fail('Android production release version must be 1800 / 0.18.0')
}
if (!/applicationId\s+"com\.hanglian\.control"/.test(buildGradle)) fail('applicationId must remain com.hanglian.control')
if (/localhost:5173|192\.168\.\d+\.\d+:5173|DATABASE_URL|postgres:\/\//.test(distIndex + androidIndex + androidOffline + generatedCapacitorConfig)) {
  fail('Built Android assets must not contain dev frontend URLs or database credentials')
}
if (/pdfjs-dist|exceljs/i.test(distIndex)) {
  fail('Android index.html must not synchronously include PDF.js or ExcelJS')
}

if (failures.length) {
  console.error('Android built assets check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Android built assets check passed.')
