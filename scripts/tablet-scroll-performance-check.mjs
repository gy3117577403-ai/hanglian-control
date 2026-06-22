import { execSync } from 'node:child_process'
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
    fail(`Missing required file: ${relativePath}`)
    return ''
  }
  return readFileSync(fullPath, 'utf8')
}

function assertContains(relativePath, content, pattern, message) {
  if (!pattern.test(content)) fail(`${relativePath}: ${message}`)
}

function assertNotContains(relativePath, content, pattern, message) {
  if (pattern.test(content)) fail(`${relativePath}: ${message}`)
}

const progressive = read('apps/tablet/src/composables/use-progressive-list.ts')
const orderSidebar = read('apps/tablet/src/components/orders/WarmOrderSidebar.vue')
const customerList = read('apps/tablet/src/components/maintenance/WarmCustomerListPanel.vue')
const productList = read('apps/tablet/src/components/maintenance/WarmProductListPanel.vue')
const trashDialog = read('apps/tablet/src/components/trash/WarmDrawingTrashDialog.vue')
const orderCard = read('apps/tablet/src/components/orders/WarmOrderCard.vue')
const customerCard = read('apps/tablet/src/components/maintenance/WarmCustomerListPanel.vue')
const productCard = read('apps/tablet/src/components/maintenance/WarmProductListPanel.vue')
const trashCard = read('apps/tablet/src/components/trash/WarmTrashDocumentCard.vue')

assertContains('apps/tablet/src/composables/use-progressive-list.ts', progressive, /requestAnimationFrame/, 'scroll loading must be throttled with requestAnimationFrame')
assertContains('apps/tablet/src/composables/use-progressive-list.ts', progressive, /threshold/, 'large-list threshold protection is required')
assertContains('apps/tablet/src/composables/use-progressive-list.ts', progressive, /onBeforeUnmount/, 'scroll frame cleanup is required')

for (const [relativePath, content, visibleName] of [
  ['apps/tablet/src/components/orders/WarmOrderSidebar.vue', orderSidebar, 'visibleOrders'],
  ['apps/tablet/src/components/maintenance/WarmCustomerListPanel.vue', customerList, 'visibleCustomers'],
  ['apps/tablet/src/components/maintenance/WarmProductListPanel.vue', productList, 'visibleProducts'],
  ['apps/tablet/src/components/trash/WarmDrawingTrashDialog.vue', trashDialog, 'visibleTrashItems'],
]) {
  assertContains(relativePath, content, /useProgressiveList/, 'must use progressive list rendering')
  assertContains(relativePath, content, new RegExp(visibleName), `must render ${visibleName}`)
  assertContains(relativePath, content, /@scroll\.passive=/, 'scroll handler must be passive')
  assertNotContains(relativePath, content, /v-auto-animate|useAutoAnimate/, 'large lists must not use AutoAnimate')
}

for (const [relativePath, content] of [
  ['apps/tablet/src/components/orders/WarmOrderCard.vue', orderCard],
  ['apps/tablet/src/components/maintenance/WarmCustomerListPanel.vue', customerCard],
  ['apps/tablet/src/components/maintenance/WarmProductListPanel.vue', productCard],
  ['apps/tablet/src/components/trash/WarmTrashDocumentCard.vue', trashCard],
]) {
  assertContains(relativePath, content, /content-visibility:\s*auto/, 'list cards need content-visibility')
  assertContains(relativePath, content, /contain-intrinsic-size/, 'list cards need intrinsic size hints')
}

for (const relativePath of [
  'apps/tablet/src/components/drawing/WarmModuleCoverPreview.vue',
  'apps/tablet/src/components/viewer/WarmImageThumbnail.vue',
  'apps/tablet/src/components/viewer/WarmImageViewer.vue',
  'apps/tablet/src/components/upload/WarmUploadPreviewGrid.vue',
  'apps/tablet/src/components/upload/WarmCameraCaptureDialog.vue',
  'apps/tablet/src/components/drawing/WarmImageDetailViewer.vue',
  'apps/tablet/src/components/document/WarmImagePreview.vue',
]) {
  const content = read(relativePath)
  assertContains(relativePath, content, /loading="lazy"/, 'images should use lazy loading')
  assertContains(relativePath, content, /decoding="async"/, 'images should use async decoding')
}

const changedFiles = execSync('git diff --name-only', { cwd: root, encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
if (changedFiles.some((file) => file.startsWith('apps/api/') || file.includes('prisma/'))) {
  fail('Scroll performance pass must not modify backend or Prisma files')
}
if (changedFiles.some((file) => file === 'apps/tablet/src/types/production.ts' || file.includes('/fixtures/') || file.includes('/fixture/'))) {
  fail('Scroll performance pass must not modify connector or fixture field definitions')
}

if (failures.length) {
  console.error('Tablet scroll performance check failed:')
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Tablet scroll performance check passed.')
