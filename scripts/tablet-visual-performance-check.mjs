import { execSync } from 'node:child_process'
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
    fail(`Missing required file: ${relativePath}`)
    return ''
  }
  return readFileSync(fullPath, 'utf8')
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) walk(fullPath, files)
    else files.push(fullPath)
  }
  return files
}

function assertContains(relativePath, content, pattern, message) {
  if (!pattern.test(content)) fail(`${relativePath}: ${message}`)
}

function assertNotContains(relativePath, content, pattern, message) {
  if (pattern.test(content)) fail(`${relativePath}: ${message}`)
}

const main = read('apps/tablet/src/main.ts')
const app = read('apps/tablet/src/App.vue')
const perfCss = read('apps/tablet/src/styles/tablet-performance.css')
const moduleCard = read('apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue')
const orderCard = read('apps/tablet/src/components/orders/WarmOrderCard.vue')
const productList = read('apps/tablet/src/components/maintenance/WarmProductListPanel.vue')
const searchItem = read('apps/tablet/src/components/search/WarmDrawingSearchResultItem.vue')
const searchResults = read('apps/tablet/src/components/search/WarmDrawingSearchResults.vue')
const trashCard = read('apps/tablet/src/components/trash/WarmTrashDocumentCard.vue')
const hubContent = read('apps/tablet/src/components/hub/WarmHubContent.vue')
const hubHeader = read('apps/tablet/src/components/hub/WarmHubHeader.vue')
const hubSearch = read('apps/tablet/src/components/hub/WarmHubSearchBar.vue')
const functionOrb = read('apps/tablet/src/components/hub/WarmFunctionOrb.vue')
const dashboard = read('apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue')

assertContains('apps/tablet/src/main.ts', main, /tablet-performance\.css/, 'tablet performance stylesheet must be loaded')
assertContains('apps/tablet/src/App.vue', app, /data-performance-tier/, 'root must expose performance tier')
assertContains('apps/tablet/src/App.vue', app, /useTabletPerformance/, 'root must use tablet performance detection')
assertContains('apps/tablet/src/styles/tablet-performance.css', perfCss, /--warm-shadow-card/, 'shared warm shadow variable is required')
assertContains('apps/tablet/src/styles/tablet-performance.css', perfCss, /data-performance-tier='reduced'/, 'reduced performance mode is required')
assertContains('apps/tablet/src/styles/tablet-performance.css', perfCss, /prefers-reduced-motion:\s*reduce/, 'prefers-reduced-motion fallback is required')
assertContains('apps/tablet/src/styles/tablet-performance.css', perfCss, /button:active/, 'button press feedback must remain available')

for (const [relativePath, content] of [
  ['apps/tablet/src/components/orders/WarmOrderCard.vue', orderCard],
  ['apps/tablet/src/components/maintenance/WarmProductListPanel.vue', productList],
  ['apps/tablet/src/components/search/WarmDrawingSearchResultItem.vue', searchItem],
  ['apps/tablet/src/components/trash/WarmTrashDocumentCard.vue', trashCard],
  ['apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue', moduleCard],
]) {
  assertNotContains(relativePath, content, /backdrop-filter/, 'scrolling cards/results must not use backdrop-filter')
  assertContains(relativePath, content, /content-visibility:\s*auto|content-visibility:\s*auto/s, 'scrolling cards/results need content-visibility protection')
}

assertNotContains('apps/tablet/src/components/search/WarmDrawingSearchResults.vue', searchResults, /backdrop-filter/, 'search results shell must not use backdrop-filter')

assertNotContains('apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue', moduleCard, /filter:\s*blur/, 'module cards must not use blur decoration')
assertNotContains('apps/tablet/src/components/hub/WarmHubContent.vue', hubContent, /filter:\s*blur|backdrop-filter/, 'content shell must avoid extra blur layers')
assertNotContains('apps/tablet/src/components/hub/WarmHubHeader.vue', hubHeader, /backdrop-filter/, 'header toolbox must avoid extra blur layers')
assertNotContains('apps/tablet/src/components/hub/WarmHubSearchBar.vue', hubSearch, /backdrop-filter/, 'search bar must avoid extra blur layers')
assertNotContains('apps/tablet/src/components/hub/WarmFunctionOrb.vue', functionOrb, /backdrop-filter/, 'mode orb must avoid extra blur layers')
assertContains('apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue', dashboard, /backdrop-filter:\s*blur\(8px\)/, 'only the top dashboard shell may retain one light backdrop-filter')

const sourceFiles = walk(path.join(root, 'apps/tablet/src'))
  .filter((file) => /\.(vue|ts|css)$/.test(file))
for (const file of sourceFiles) {
  const relativePath = path.relative(root, file).replaceAll(path.sep, '/')
  const content = readFileSync(file, 'utf8')
  assertNotContains(relativePath, content, /transition:\s*all\b/, 'transition: all is not allowed on tablet UI')
}

const changedFiles = execSync('git diff --name-only', { cwd: root, encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
if (changedFiles.some((file) => file.startsWith('apps/api/') || file.includes('prisma/'))) {
  fail('Visual performance pass must not modify backend or Prisma files')
}
if (changedFiles.some((file) => {
  if (file === 'apps/tablet/src/types/production.ts') return true
  if (file === 'apps/tablet/src/components/fixture/WarmFixtureParameterView.vue') return false
  return file.includes('/fixtures/') || file.includes('/fixture/')
})) {
  fail('Visual performance pass must not modify connector or fixture field definitions')
}

if (failures.length) {
  console.error('Tablet visual performance check failed:')
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Tablet visual performance check passed.')
