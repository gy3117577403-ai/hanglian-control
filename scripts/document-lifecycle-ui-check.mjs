import { existsSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import path from 'node:path'

const root = process.cwd()
const read = (file) => readFileSync(path.join(root, file), 'utf8')
const exists = (file) => existsSync(path.join(root, file))

const files = {
  api: 'apps/tablet/src/services/api.ts',
  store: 'apps/tablet/src/stores/document-hub-store.ts',
  lifecycleTypes: 'apps/tablet/src/types/document-lifecycle.ts',
  viewerTypes: 'apps/tablet/src/types/document-viewer.ts',
  moveDialog: 'apps/tablet/src/components/trash/WarmMoveToTrashDialog.vue',
  trashDialog: 'apps/tablet/src/components/trash/WarmDrawingTrashDialog.vue',
  trashCard: 'apps/tablet/src/components/trash/WarmTrashDocumentCard.vue',
  purgeDialog: 'apps/tablet/src/components/trash/WarmPurgeDocumentDialog.vue',
  hubHeader: 'apps/tablet/src/components/hub/WarmHubHeader.vue',
  dashboard: 'apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue',
  productHome: 'apps/tablet/src/components/drawing/WarmProductDrawingHome.vue',
  moduleGallery: 'apps/tablet/src/components/drawing/WarmDrawingModuleGallery.vue',
  moduleCard: 'apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue',
  viewer: 'apps/tablet/src/components/viewer/WarmDocumentViewer.vue',
}

const checks = []
function check(name, pass) {
  checks.push({ name, pass: Boolean(pass) })
}

function block(source, name) {
  const start = source.indexOf(`function ${name}`)
  if (start < 0) return ''
  const next = source.indexOf('\n  function ', start + 1)
  return source.slice(start, next < 0 ? source.length : next)
}

for (const [name, file] of Object.entries(files)) {
  check(`${name} exists`, exists(file))
}

const api = read(files.api)
const store = read(files.store)
const lifecycleTypes = read(files.lifecycleTypes)
const moveDialog = read(files.moveDialog)
const trashDialog = read(files.trashDialog)
const trashCard = read(files.trashCard)
const purgeDialog = read(files.purgeDialog)
const hubHeader = read(files.hubHeader)
const dashboard = read(files.dashboard)
const productHome = read(files.productHome)
const moduleGallery = read(files.moduleGallery)
const moduleCard = read(files.moduleCard)
const viewer = read(files.viewer)
const viewerTypes = read(files.viewerTypes)

check('new lifecycle types include trash item/query/payloads/lock status', [
  'interface DrawingTrashItem',
  'interface TrashQuery',
  'interface TrashDocumentPayload',
  'interface RestoreDocumentPayload',
  'interface PurgeDocumentPayload',
  'interface DeleteLockStatus',
].every((text) => lifecycleTypes.includes(text)))
check('lifecycle types do not expose passwordHash/storageKey/path', !/passwordHash|storageKey|absolute/i.test(lifecycleTypes))
check('trash query API exists', /export async function getDrawingTrash/.test(api) && api.includes("'/document-hub/trash'"))
check('new trash API method exists', /export async function trashDrawingDocument/.test(api) && api.includes('/trash'))
check('restore API method exists', /export async function restoreDrawingDocument/.test(api) && api.includes('/restore'))
check('purge API method exists', /export async function purgeDrawingDocument/.test(api) && api.includes('/purge'))
check('delete lock status API exists', /export function getDeleteLockStatus/.test(api) && api.includes("'/delete-lock/status'"))
check('drawing lifecycle URL parameters are encoded', (api.match(/encodeURIComponent/g) ?? []).length >= 4)
check('old drawing physical delete endpoint is not called', !/document-hub\/drawings\/products[^`'"]+\/delete/.test(api) && !/deleteHubDrawingItem/.test(api + store))
check('API methods do not use mock fallback', !/trashDrawingDocument[\s\S]*mock|restoreDrawingDocument[\s\S]*mock|purgeDrawingDocument[\s\S]*mock/i.test(api))

check('store lifecycle state exists', [
  'drawingTrashItems',
  'drawingTrashLoading',
  'drawingTrashError',
  'drawingTrashFilters',
  'drawingTrashTotal',
  'drawingTrashDialogOpen',
  'lifecycleActionLoading',
  'lifecycleActionDocumentId',
  'lifecycleError',
  'deleteLockStatus',
  'deleteLockLoading',
  'pendingTrashItem',
  'pendingPurgeItem',
  'lastLifecycleResult',
].every((text) => store.includes(text)))
check('store lifecycle actions exist', [
  'loadDeleteLockStatus',
  'openDrawingTrash',
  'closeDrawingTrash',
  'loadDrawingTrash',
  'trashDocument',
  'restoreDocument',
  'purgeDocument',
  'refreshAfterDocumentLifecycle',
  'clearLifecycleError',
].every((text) => store.includes(text)))
check('password is not persisted in store state', !/password\s*=\s*ref|deletePassword|localStorage\.[^(]*(password|Password)|password.*localStorage/i.test(store))
check('API failure does not locally mutate module business arrays', !/module\.items\.splice|module\.items\s*=\s*module\.items\.filter|toast\.success\('资料已删除/.test(store))
check('success reloads product detail', block(store, 'refreshAfterDocumentLifecycle').includes('refreshCurrentProduct'))
check('success reloads trash', block(store, 'refreshAfterDocumentLifecycle').includes('loadDrawingTrash'))
check('current viewed document closes on trash/purge', block(store, 'trashDocument').includes('closeViewerIfLifecycleTarget') && block(store, 'purgeDocument').includes('closeViewerIfLifecycleTarget'))
check('duplicate same document operations are blocked', store.includes('lifecycleActionDocumentId.value === documentId'))
check('formal sources are protected', store.includes("['manual_upload', 'camera_capture', 'pdf_import']") && store.includes('该资料为系统占位资料，暂不支持删除。'))

check('WarmMoveToTrashDialog is wired locally', moveDialog.includes('移入回收站') && moveDialog.includes('type="password"') && moveDialog.includes('autocomplete="new-password"'))
check('move dialog clears password on close/failure', moveDialog.includes('deleteSecret.value =') && moveDialog.includes('resetForm') && moveDialog.includes('catch'))
check('delete lock hint exists', moveDialog.includes('删除操作已临时锁定，请稍后再试。') && purgeDialog.includes('删除操作已临时锁定，请稍后再试。'))
check('WarmDrawingTrashDialog has filters and pagination', trashDialog.includes('资料回收站') && trashDialog.includes('keyword') && trashDialog.includes('customerId') && trashDialog.includes('moduleKey') && trashDialog.includes('limit: pageSize.value') && trashDialog.includes('offset'))
check('trash list uses card component', trashDialog.includes('WarmTrashDocumentCard') && trashCard.includes('恢复资料') && trashCard.includes('彻底删除'))
check('restore uses confirm dialog and no password', trashDialog.includes("header: '恢复资料'") && trashDialog.includes('资料将恢复到原产品和原模块，是否继续？') && !block(trashDialog, 'restoreTrashItem').includes('password'))
check('purge only appears in recycle bin components', !/彻底删除/.test(productHome + moduleGallery + moduleCard) && /彻底删除/.test(trashDialog + trashCard + purgeDialog))
check('confirm text exact match', purgeDialog.includes("const confirmTextValue = '确认彻底删除'") && purgeDialog.includes('confirmText.value === confirmTextValue'))
check('purge dialog clears only password on failure', block(purgeDialog, 'submit').includes("deleteSecret.value = ''") && !block(purgeDialog, 'submit').includes("confirmText.value = ''\n    localError"))
check('drawing mode recycle bin entry exists', hubHeader.includes('回收站') && hubHeader.includes("store.activeMode === 'drawing'") && dashboard.includes('WarmDrawingTrashDialog'))
check('connector and fixture modes do not show trash entry', !/activeMode === 'connector'[\s\S]{0,120}回收站|activeMode === 'fixture'[\s\S]{0,120}回收站/.test(hubHeader))
check('move-to-trash event wiring exists', productHome.includes('WarmMoveToTrashDialog') && productHome.includes('prepareTrashDocument') && moduleGallery.includes('WarmMoveToTrashDialog') && moduleGallery.includes('prepareTrashDocument'))
check('placeholder protection tooltip exists', moduleCard.includes('该资料为系统占位资料，暂不支持删除。') && moduleGallery.includes('该资料为系统占位资料，暂不支持删除。'))
check('viewer supports trash preview note', viewerTypes.includes('inTrash?: boolean') && viewer.includes('此资料当前位于回收站。') && trashDialog.includes('/api/files/documents/${encodedId}/preview') && trashDialog.includes('/api/files/documents/${encodedId}/download'))
check('no storageKey display in lifecycle UI', !/storageKey|passwordHash|absolute/i.test(moveDialog + trashDialog + trashCard + purgeDialog + viewer))
check('no test delete copy or default password', !/测试删除|本地删除演示|Mock 资料中移除|123456/.test(moveDialog + trashDialog + trashCard + purgeDialog + productHome + moduleGallery + moduleCard + store))
check('no database or cloud connection code in lifecycle UI', !/DATABASE_URL|Prisma|Sealos|S3|db push|migrate/i.test(moveDialog + trashDialog + trashCard + purgeDialog + block(store, 'trashDocument') + block(store, 'restoreDocument') + block(store, 'purgeDocument')))

const changed = execSync('git status --short --untracked-files=all', { cwd: root, encoding: 'utf8' })
  .split(/\r?\n/)
  .map((line) => line.trim().replace(/^[A-Z? ]+\s+/, ''))
  .filter(Boolean)
const allowedBackendChanges = new Set([
  'apps/api/src/document-hub/document-hub.controller.ts',
  'apps/api/src/document-hub/document-hub.module.ts',
  'apps/api/src/document-hub/document-hub.service.ts',
  'apps/api/src/document-hub/drawing-metadata.store.ts',
  'apps/api/src/document-hub/helpers/document-lifecycle-validator.ts',
  'apps/api/src/document-hub/mock/document-hub.seed.ts',
  'apps/api/src/document-hub/document-version.service.ts',
  'apps/api/src/document-hub/dto/create-drawing-product.dto.ts',
  'apps/api/src/document-hub/dto/document-metadata.dto.ts',
  'apps/api/src/document-hub/dto/resolve-drawing-product.dto.ts',
])
check('no backend source changes in working tree', !changed.some((file) => file.startsWith('apps/api/src/') && !allowedBackendChanges.has(file)))
check('no Prisma changes in working tree', !changed.some((file) => file.includes('prisma/schema.prisma')))
check('no connector component/type changes in working tree', !changed.some((file) => file.includes('apps/tablet/src/components/connector/') || file.includes('connector-')))
check('no fixture component/type changes in working tree', !changed.some((file) => file.includes('apps/tablet/src/components/fixture/') || file.includes('fixture-')))

const failed = checks.filter((item) => !item.pass)
if (failed.length) {
  console.error('document-lifecycle-ui check failed:')
  for (const item of failed) console.error(`- ${item.name}`)
  process.exit(1)
}

console.log(`document-lifecycle-ui check passed (${checks.length} checks)`)
