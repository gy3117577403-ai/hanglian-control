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
const androidIndex = read('apps/tablet/android/app/src/main/assets/public/index.html')
const capacitor = read('apps/tablet/capacitor.config.ts')
const mainActivity = read('apps/tablet/android/app/src/main/java/com/hanglian/control/MainActivity.java')
const buildGradle = read('apps/tablet/android/app/build.gradle')

if (!packageJson.includes('"android-built-assets:check"')) fail('package.json must expose android-built-assets:check')
requireLockedViewport('dist/index.html', distIndex)
requireLockedViewport('Android assets index.html', androidIndex)
if (distIndex !== androidIndex) fail('Android assets index.html must match dist/index.html after cap sync')
if (!/zoomEnabled:\s*false/.test(capacitor)) fail('android.zoomEnabled=false must remain in capacitor config')
if (/server:\s*{[\s\S]*url\s*:/.test(capacitor)) fail('Capacitor config must not include server.url')
if (!mainActivity.includes('setSupportZoom(false)') || !mainActivity.includes('OVER_SCROLL_NEVER')) {
  fail('MainActivity WebSettings zoom lock must exist')
}
if (!/versionCode\s+1603/.test(buildGradle) || !/versionName\s+"0\.16\.3-debug"/.test(buildGradle)) {
  fail('Android debug version must be 1603 / 0.16.3-debug')
}
if (!/applicationId\s+"com\.hanglian\.control"/.test(buildGradle)) fail('applicationId must remain com.hanglian.control')
if (/localhost:5173|192\.168\.\d+\.\d+:5173|DATABASE_URL|postgres:\/\//.test(distIndex + androidIndex)) {
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
