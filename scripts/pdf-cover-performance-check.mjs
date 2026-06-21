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

const queue = read('apps/tablet/src/composables/use-pdf-cover-queue.ts')
const preview = read('apps/tablet/src/components/drawing/WarmPdfFirstPagePreview.vue')
const main = read('apps/tablet/src/main.ts')
const app = read('apps/tablet/src/App.vue')
const dashboard = read('apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue')
const hubContent = read('apps/tablet/src/components/hub/WarmHubContent.vue')

assertContains('apps/tablet/src/composables/use-pdf-cover-queue.ts', queue, /STANDARD_PDF_COVER_CONCURRENCY\s*=\s*2/, 'standard PDF cover concurrency must be 2')
assertContains('apps/tablet/src/composables/use-pdf-cover-queue.ts', queue, /REDUCED_PDF_COVER_CONCURRENCY\s*=\s*1/, 'reduced PDF cover concurrency must be 1')
assertContains('apps/tablet/src/composables/use-pdf-cover-queue.ts', queue, /isReducedTabletPerformance/, 'queue must use tablet performance tier')
assertContains('apps/tablet/src/composables/use-pdf-cover-queue.ts', queue, /cancelAllPdfCoverTasks/, 'queue must expose cleanup')
assertContains('apps/tablet/src/composables/use-pdf-cover-queue.ts', queue, /pagehide/, 'queue must clean pending work on pagehide')
assertContains('apps/tablet/src/composables/use-pdf-cover-queue.ts', queue, /runningKeys/, 'queue must enforce shared concurrency')

assertContains('apps/tablet/src/components/drawing/WarmPdfFirstPagePreview.vue', preview, /usePdfCoverQueue/, 'PDF cover preview must use shared queue')
assertContains('apps/tablet/src/components/drawing/WarmPdfFirstPagePreview.vue', preview, /enqueue\(renderKey\.value/, 'PDF cover rendering must enqueue by stable key')
assertContains('apps/tablet/src/components/drawing/WarmPdfFirstPagePreview.vue', preview, /getPage\(1\)/, 'only first page should be rendered for covers')
assertContains('apps/tablet/src/components/drawing/WarmPdfFirstPagePreview.vue', preview, /IntersectionObserver/, 'PDF cover rendering must be viewport gated')
assertContains('apps/tablet/src/components/drawing/WarmPdfFirstPagePreview.vue', preview, /queuedRender\?\.cancel\(\)/, 'queued PDF work must be cancellable')
assertContains('apps/tablet/src/components/drawing/WarmPdfFirstPagePreview.vue', preview, /renderTask\?\.cancel\(\)/, 'active PDF render task must be cancellable')
assertContains('apps/tablet/src/components/drawing/WarmPdfFirstPagePreview.vue', preview, /onBeforeUnmount/, 'PDF cover component must cleanup on unmount')
assertContains('apps/tablet/src/components/drawing/WarmPdfFirstPagePreview.vue', preview, /workerSrc\s*=\s*pdfWorkerUrl/, 'PDF.js worker must still be configured explicitly')
assertContains('apps/tablet/src/components/drawing/WarmPdfFirstPagePreview.vue', preview, /import\(\/\*\s*@vite-ignore\s*\*\/\s*pdfjsUrl\)/, 'PDF.js must remain dynamically imported')

for (const [relativePath, content] of [
  ['apps/tablet/src/main.ts', main],
  ['apps/tablet/src/App.vue', app],
  ['apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue', dashboard],
  ['apps/tablet/src/components/hub/WarmHubContent.vue', hubContent],
]) {
  assertNotContains(relativePath, content, /pdfjs-dist/, 'PDF.js must not be imported by the first-screen shell')
}

const changedFiles = execSync('git diff --name-only', { cwd: root, encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
if (changedFiles.some((file) => file.startsWith('apps/api/') || file.includes('prisma/'))) {
  fail('PDF cover performance pass must not modify backend or Prisma files')
}

if (failures.length) {
  console.error('PDF cover performance check failed:')
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log('PDF cover performance check passed.')
