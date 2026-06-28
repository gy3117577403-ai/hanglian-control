import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function block(source, name) {
  const start = source.indexOf(`function ${name}`);
  if (start < 0) return '';
  const next = source.indexOf('\n  function ', start + 1);
  return source.slice(start, next < 0 ? source.length : next);
}

function changedFiles() {
  return execSync('git status --short --untracked-files=all', { cwd: root, encoding: 'utf8' })
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[A-Z? ]+\s+/, ''))
    .filter(Boolean)
    .map((line) => (line.includes(' -> ') ? line.split(' -> ').pop() ?? line : line))
    .map((line) => line.replaceAll('\\', '/'));
}

const files = {
  api: 'apps/tablet/src/services/api.ts',
  store: 'apps/tablet/src/stores/document-hub-store.ts',
  versionTypes: 'apps/tablet/src/types/document-version.ts',
  productionTypes: 'apps/tablet/src/types/production.ts',
  viewerTypes: 'apps/tablet/src/types/document-viewer.ts',
  actionMenu: 'apps/tablet/src/components/drawing/WarmDocumentActionMenu.vue',
  editDialog: 'apps/tablet/src/components/drawing/WarmEditDocumentDialog.vue',
  effectiveDialog: 'apps/tablet/src/components/drawing/WarmSetEffectiveDialog.vue',
  moduleGallery: 'apps/tablet/src/components/drawing/WarmDrawingModuleGallery.vue',
  moduleCard: 'apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue',
  viewer: 'apps/tablet/src/components/viewer/WarmDocumentViewer.vue',
};

for (const [label, file] of Object.entries(files)) {
  assert(existsSync(join(root, file)), `${label} file is missing: ${file}`);
}

const api = read(files.api);
const store = read(files.store);
const versionTypes = read(files.versionTypes);
const productionTypes = read(files.productionTypes);
const viewerTypes = read(files.viewerTypes);
const actionMenu = read(files.actionMenu);
const editDialog = read(files.editDialog);
const effectiveDialog = read(files.effectiveDialog);
const moduleGallery = read(files.moduleGallery);
const moduleCard = read(files.moduleCard);
const viewer = read(files.viewer);
const visualComponents = [actionMenu, editDialog, effectiveDialog, moduleGallery, moduleCard, viewer].join('\n');

assert([
  'interface DrawingDocumentMetadataPayload',
  'interface DrawingDocumentOperatorPayload',
  'interface DrawingDocumentVersionResponse',
  'keywords?: string[]',
  'changedDocumentIds?: string[]',
  'downgradedDocumentIds?: string[]',
].every((text) => versionTypes.includes(text)), 'document version TypeScript types are incomplete.');
assert(['keywords?: string[]', 'effectiveDate?: string', 'versionGroupKey?: string', 'isCover?: boolean'].every((text) => productionTypes.includes(text)), 'DrawingItem is missing version/cover fields.');
assert(['keywords?: string[]', 'documentStatus?: string', 'effectiveDate?: string', 'versionGroupKey?: string', 'isCover?: boolean'].every((text) => viewerTypes.includes(text)), 'DocumentViewerItem is missing version/cover fields.');

assert(api.includes('updateDrawingDocumentMetadata') && api.includes("method: 'PATCH'"), 'Preview API service must include metadata PATCH.');
assert(api.includes('setDrawingDocumentEffective') && api.includes('/set-effective'), 'API service must include set-effective POST.');
assert(api.includes('setDrawingDocumentCover') && api.includes('/set-cover'), 'API service must include set-cover POST.');
assert((api.match(/encodeURIComponent/g) ?? []).length >= 3, 'document version API paths must encode URL parameters.');
assert(!/updateDrawingDocumentMetadata[\s\S]{0,500}mock|setDrawingDocumentEffective[\s\S]{0,500}mock|setDrawingDocumentCover[\s\S]{0,500}mock/i.test(api), 'document version API must not use mock fallback.');
assert(api.includes('toLifecycleRequestError'), 'document version API should surface backend errors.');

assert([
  'applyDocumentVersionResponse',
  'resolveVersionContext',
  'refreshAfterDocumentVersion',
  'updateDocumentMetadata',
  'setDocumentEffective',
  'setDocumentCover',
].every((text) => store.includes(text)), 'document version store actions are incomplete.');
assert(block(store, 'updateDocumentMetadata').includes('updateDrawingDocumentMetadata'), 'metadata store action must call backend API.');
assert(block(store, 'setDocumentEffective').includes('setDrawingDocumentEffective'), 'set-effective store action must call backend API.');
assert(block(store, 'setDocumentCover').includes('setDrawingDocumentCover'), 'set-cover store action must call backend API.');
assert(block(store, 'refreshAfterDocumentVersion').includes('refreshCurrentProduct') && block(store, 'refreshAfterDocumentVersion').includes('refreshProductList'), 'successful version operations must refresh product detail and product list.');
assert(block(store, 'resolveVersionContext').includes('isFormalLifecycleDrawingItem'), 'placeholder documents must be blocked before mutation.');
assert(block(store, 'setDocumentEffective').includes("context.module.moduleKey === 'finished_images'"), 'finished_images must not call set-effective.');
assert(!/updateDocumentMetadata[\s\S]{0,900}module\.items\s*=|setDocumentEffective[\s\S]{0,900}module\.items\s*=|setDocumentCover[\s\S]{0,900}module\.items\s*=/.test(store), 'version actions must not fake success by locally replacing module arrays.');

assert(actionMenu.includes("['manual_upload', 'camera_capture', 'pdf_import']"), 'action menu must only enable formal metadata sources.');
assert(actionMenu.includes('该资料为系统占位资料，暂不支持维护。'), 'placeholder tooltip is missing.');
assert(actionMenu.includes('isFinishedImages') && actionMenu.includes('!isFinishedImages.value'), 'finished_images must hide set-effective action.');
assert(actionMenu.includes('append-to="body"'), 'action menu popup must append to body.');
assert(['编辑资料信息', '设为当前有效', '当前有效', '设为首页封面', '首页封面', '移入回收站'].every((text) => actionMenu.includes(text)), 'action menu labels are incomplete.');

assert(editDialog.includes('WarmEditDocumentDialog') || editDialog.includes('编辑资料信息'), 'edit dialog shell is missing.');
assert(editDialog.includes('updateDocumentMetadata') && editDialog.includes('keywordsArray'), 'edit dialog must call store metadata action and clean keywords.');
assert(editDialog.includes('visible.value = false'), 'edit dialog should close only after successful submit.');
assert(effectiveDialog.includes('setDocumentEffective') && effectiveDialog.includes('设为当前有效'), 'set-effective confirm dialog is missing.');
assert(effectiveDialog.includes('同组其他当前有效版本会变为历史版本'), 'set-effective dialog must explain downgrade behavior.');

assert(moduleGallery.includes('WarmDocumentActionMenu') && moduleGallery.includes('WarmEditDocumentDialog') && moduleGallery.includes('WarmSetEffectiveDialog'), 'module gallery must expose version actions.');
assert(['当前有效', '待确认', '历史版本', '首页封面'].every((text) => moduleGallery.includes(text)), 'module gallery version/cover tags are incomplete.');
assert(moduleGallery.includes('@set-cover="setCover"') && moduleGallery.includes('@set-effective="openEffectiveDialog"'), 'module gallery action events are incomplete.');
assert(moduleCard.includes('coverStatusText') && moduleCard.includes('首页封面'), 'module home cards must display version/cover state.');
assert(viewer.includes('WarmDocumentActionMenu') && viewer.includes('WarmEditDocumentDialog') && viewer.includes('WarmSetEffectiveDialog'), 'advanced viewer info panel must expose version actions.');
assert(['statusLabel', 'activeIsCover', '关键词', '生效日期', '首页封面'].every((text) => viewer.includes(text)), 'viewer info panel version/cover fields are incomplete.');
assert(viewer.includes('WarmMoveToTrashDialog'), 'viewer should keep move-to-trash action available.');

assert(!/storageKey|checksumSha256|server path|DATABASE_URL|Prisma|Sealos/i.test(visualComponents), 'visual version UI must not display storage internals or deployment/database fields.');

const changed = changedFiles();
assert(!changed.some((file) => file.includes('prisma/schema.prisma')), 'Prisma schema must not be changed.');
assert(!changed.some((file) => file.includes('apps/tablet/src/components/connector/') || file.includes('connector-')), 'connector UI/types must not be changed.');
assert(!changed.some((file) => file.includes('apps/tablet/src/components/fixture/') || file.includes('fixture-')), 'fixture UI/types must not be changed.');
assert(!changed.some((file) => file.includes('apps/api/storage/uploads/') || file.includes('apps/api/storage/tmp/')), 'runtime uploads/tmp files must not be staged or tracked.');

if (failures.length) {
  console.error('document-version-ui check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('document-version-ui check passed');
