import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return '';
  }
  return readFileSync(absolutePath, 'utf8');
}

function requireIncludes(relativePath, needle, message) {
  const content = read(relativePath);
  if (!content.includes(needle)) failures.push(message);
}

function requireNotIncludes(relativePath, needle, message) {
  const content = read(relativePath);
  if (content.includes(needle)) failures.push(message);
}

function requireAny(relativePath, needles, message) {
  const content = read(relativePath);
  if (!needles.some((needle) => content.includes(needle))) failures.push(message);
}

function requireNoLikelyMojibake(relativePath) {
  const content = read(relativePath);
  const suspicious = [
    '璧勬枡',
    '璇峰',
    '閫夋嫨',
    '涓婁紶',
    '鏈湴',
    '娌欑洅',
    '瀛樺偍',
    '銆',
    '锛',
    '妫',
    '鐪',
  ];
  const hit = suspicious.find((needle) => content.includes(needle));
  if (hit) failures.push(`${relativePath} contains likely mojibake text: ${hit}`);
}

console.log('Tablet UI smoke check');
console.log('This check is read-only. It does not connect to a database and does not write data.');

requireIncludes(
  'apps/tablet/src/components/hub/WarmFunctionOrb.vue',
  ':aria-expanded="expanded"',
  'Function orb must expose expanded state for the compact document hub menu.',
);
requireIncludes(
  'apps/tablet/src/components/hub/WarmFunctionOrb.vue',
  ':aria-hidden="!expanded"',
  'Collapsed function menu must be hidden from assistive technology.',
);
requireIncludes(
  'apps/tablet/src/components/hub/WarmFunctionOrb.vue',
  ':inert="!expanded"',
  'Collapsed function menu must not remain focusable/clickable.',
);
requireIncludes(
  'apps/tablet/src/components/hub/WarmFunctionOrb.vue',
  ':tabindex="expanded ? 0 : -1"',
  'Collapsed function menu buttons must be removed from keyboard tab order.',
);

requireIncludes(
  'apps/tablet/src/components/drawing/WarmImageDetailViewer.vue',
  '返回资料列表',
  'Large image viewer must use a clear back-to-list control.',
);
requireNotIncludes(
  'apps/tablet/src/components/drawing/WarmImageDetailViewer.vue',
  'title="关闭"',
  'Large image viewer must not label the return control as close.',
);

requireIncludes(
  'apps/tablet/src/components/drawing/WarmProductDrawingHome.vue',
  'primary-grid',
  'Drawing product page must keep original drawing and SOP in the primary A4 grid.',
);
requireIncludes(
  'apps/tablet/src/components/drawing/WarmProductDrawingHome.vue',
  "['original_drawing', 'sop']",
  'Drawing product page must keep original drawing and SOP as the first row.',
);
requireIncludes(
  'apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue',
  'linear-gradient(122deg',
  'A4 module cards must retain warm transparent gradient glass styling.',
);
requireIncludes(
  'apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue',
  'box-shadow:',
  'A4 module cards must keep warm depth through lightweight shadows.',
);
requireIncludes(
  'apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue',
  'content-visibility: auto',
  'A4 module cards should keep offscreen rendering optimization.',
);
requireIncludes(
  'apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue',
  'perspective: 1400px',
  'Document hub shell must keep the 3D glass perspective layer.',
);
requireIncludes(
  'apps/tablet/src/components/hub/WarmHubSearchBar.vue',
  'linear-gradient(112deg',
  'Search bar must keep the transparent warm capsule treatment without requiring backdrop blur.',
);
requireNotIncludes(
  'apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue',
  'rgba(245, 182, 94, 0.92)',
  'A4 preview cards must not regress to the old solid orange block.',
);
requireNotIncludes(
  'apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue',
  'linear-gradient(145deg, #f5b65e, #be6427)',
  'A4 preview cards must not use the old solid orange gradient.',
);

requireIncludes(
  'apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue',
  ':title="`上传${module.moduleName}`"',
  'A4 module cards must keep the icon upload action.',
);
requireIncludes(
  'apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue',
  ':title="`查看全部${module.moduleName}`"',
  'A4 module cards must keep the icon view-all action.',
);
requireIncludes(
  'apps/tablet/src/components/drawing/WarmDrawingModuleCard.vue',
  '删除${module.moduleName}首页资料',
  'A4 module cards must keep the icon delete action.',
);
requireIncludes(
  'apps/tablet/src/components/drawing/WarmDrawingModuleGallery.vue',
  'title="返回图纸详情"',
  'Module gallery must return to the product drawing detail, not the home page.',
);
requireIncludes(
  'apps/tablet/src/components/drawing/WarmDrawingModuleGallery.vue',
  'title="查看大图"',
  'Module gallery must keep the large image viewer entry.',
);

requireIncludes(
  'apps/tablet/src/components/orders/WarmOrderSidebar.vue',
  ':class="{ collapsed: store.orderSidebarCollapsed }"',
  'Order sidebar must keep the compact collapsed rail.',
);
requireNotIncludes(
  'apps/tablet/src/components/orders/WarmOrderSidebar.vue',
  'v-if="store.orderSidebarCollapsed"',
  'Order sidebar collapse rail must not remount on every toggle.',
);
requireIncludes(
  'apps/tablet/src/components/orders/WarmOrderSidebar.vue',
  'class="expanded-panel"',
  'Order sidebar expanded panel must stay mounted for smoother toggles.',
);
requireNotIncludes(
  'apps/tablet/src/components/hub/WarmDocumentHubDashboard.vue',
  'transition: grid-template-columns',
  'Order sidebar width changes must not animate grid-template-columns because it janks on tablet.',
);
requireIncludes(
  'apps/tablet/src/components/orders/WarmOrderSidebar.vue',
  'store.setActiveOrderScope',
  'Main order sidebar must support today/week order switching.',
);
requireIncludes(
  'apps/tablet/src/components/orders/WarmOrderSidebar.vue',
  'visibleActiveScopeOrders',
  'Main order sidebar must bind the active order scope list.',
);
requireIncludes(
  'apps/tablet/src/components/orders/WarmOrderCard.vue',
  '确认完成订单',
  'Homepage order cards should expose the order completion action.',
);
requireIncludes(
  'apps/tablet/src/components/orders/WarmOrderOverviewDialog.vue',
  'statusOptions',
  'Order overview must expose editable order status options.',
);
requireIncludes(
  'apps/tablet/src/components/orders/WarmOrderOverviewDialog.vue',
  'updateOrderStatus',
  'Order overview must update order status through the store.',
);
requireIncludes(
  'apps/tablet/src/components/orders/WarmOrderOverviewDialog.vue',
  '确认完成',
  'Order completion must move into the order overview dialog.',
);
requireIncludes(
  'apps/tablet/src/components/orders/WarmOrderCard.vue',
  'overflow: visible',
  'Order cards must not clip status controls.',
);
requireNotIncludes(
  'apps/tablet/src/components/orders/WarmOrderCard.vue',
  'contain: layout paint style',
  'Order cards must not use paint containment that can clip status controls.',
);
requireIncludes(
  'apps/tablet/src/components/orders/WarmOrderCard.vue',
  '--customer-accent',
  'Order cards must keep a visible customer color accent.',
);
requireIncludes(
  'apps/tablet/src/components/orders/WarmOrderSidebar.vue',
  'customerToneMap',
  'Order sidebar must assign consistent customer tones.',
);
requireIncludes(
  'apps/tablet/src/stores/document-hub-store.ts',
  'orderStatusRank',
  'Visible order lists must keep the default back/front/no-drawing ordering.',
);
requireNotIncludes(
  'apps/tablet/src/components/orders/WarmOrderCard.vue',
  'backdrop-filter',
  'Individual order cards must not use backdrop-filter because it hurts scroll performance.',
);
requireIncludes(
  'apps/tablet/src/components/orders/WarmOrderSidebar.vue',
  'scrollbar-gutter: stable',
  'Order lists should reserve scrollbar space to reduce layout shift.',
);

requireIncludes(
  'apps/tablet/src/stores/document-hub-store.ts',
  'function goBack',
  'Document hub store must keep layered back navigation.',
);
requireIncludes(
  'apps/tablet/src/stores/document-hub-store.ts',
  'productDetailRequestId',
  'Document hub store must guard against stale product detail requests.',
);
requireIncludes(
  'apps/tablet/src/stores/document-hub-store.ts',
  'productDrawingDetail.value = localDetail',
  'Order-driven product detail should show local fallback before slow API responses.',
);
requireIncludes(
  'apps/tablet/src/stores/document-hub-store.ts',
  'restoreScroll',
  'Document hub store must preserve scroll position when returning.',
);
requireIncludes(
  'apps/tablet/src/stores/document-hub-store.ts',
  'deleteModuleCoverItem',
  'Document hub store must keep password-gated module cover deletion.',
);
requireIncludes(
  'apps/tablet/src/stores/document-hub-store.ts',
  'deleteDrawingItem',
  'Document hub store must keep password-gated gallery item deletion.',
);
requireAny(
  'apps/tablet/src/stores/document-hub-store.ts',
  ['openModuleUpload', 'openTopUpload'],
  'Document hub store must keep upload entry points.',
);
requireIncludes(
  'apps/tablet/src/stores/document-hub-store.ts',
  'UPLOAD_MAX_FILE_SIZE',
  'Unified upload store must keep a front-end file size guard.',
);
requireIncludes(
  'apps/tablet/src/stores/document-hub-store.ts',
  'UPLOAD_ALLOWED_TYPES',
  'Unified upload store must keep a front-end file type guard.',
);
requireIncludes(
  'apps/tablet/src/stores/document-hub-store.ts',
  'uploadFileError',
  'Unified upload store must keep clear file validation errors.',
);
requireIncludes(
  'apps/tablet/src/stores/document-hub-store.ts',
  'existingKeys',
  'Unified upload store must de-duplicate repeated file selections.',
);
requireIncludes(
  'apps/tablet/src/components/upload/WarmUploadPreviewGrid.vue',
  'store.removeUploadItem',
  'Unified upload preview must allow users to clear selected files before uploading.',
);
requireIncludes(
  'apps/tablet/src/components/hub/WarmHubUploadDialog.vue',
  'WarmUploadSourcePicker',
  'Unified upload dialog must expose the shared upload source picker.',
);
requireIncludes(
  'apps/tablet/src/components/hub/WarmHubUploadDialog.vue',
  'WarmFileSelectionPanel',
  'Unified upload dialog must expose the shared file selection panel.',
);
requireIncludes(
  'apps/tablet/src/components/hub/WarmHubUploadDialog.vue',
  'WarmCameraCaptureDialog',
  'Unified upload dialog must expose the shared camera capture panel.',
);
requireIncludes(
  'apps/tablet/src/components/hub/WarmHubUploadDialog.vue',
  'store.uploadAllItems',
  'Unified upload submit must call the real shared upload action.',
);
requireIncludes(
  'apps/tablet/src/components/upload/WarmUploadPreviewGrid.vue',
  'item.error',
  'Unified upload preview must show per-file validation and upload errors.',
);
requireNotIncludes(
  'apps/tablet/src/components/hub/WarmHubUploadDialog.vue',
  'real-data-guard',
  'Unified upload dialog must not keep the old local test guard.',
);
requireNotIncludes(
  'apps/tablet/src/components/hub/WarmHubUploadDialog.vue',
  'testAcknowledged',
  'Unified upload submit must not require the old local test acknowledgement.',
);
requireNotIncludes(
  'apps/tablet/src/components/hub/WarmHubUploadDialog.vue',
  'HL_REAL_DATA_TEST',
  'Unified upload dialog must not keep local test guard copy.',
);

[
  'apps/tablet/src/stores/document-hub-store.ts',
  'apps/tablet/src/components/hub/WarmHubUploadDialog.vue',
  'apps/tablet/src/components/upload/WarmFileSelectionPanel.vue',
  'apps/tablet/src/components/upload/WarmCameraCaptureDialog.vue',
  'apps/tablet/src/components/upload/WarmUploadPreviewGrid.vue',
  'apps/tablet/src/components/upload/WarmUploadProgress.vue',
  'apps/tablet/src/components/drawing/WarmProductDrawingHome.vue',
  'apps/tablet/src/components/drawing/WarmDrawingModuleGallery.vue',
  'apps/tablet/src/components/drawing/WarmImageDetailViewer.vue',
].forEach(requireNoLikelyMojibake);

if (failures.length) {
  console.error('\nTablet UI smoke check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Tablet UI smoke check passed.');
