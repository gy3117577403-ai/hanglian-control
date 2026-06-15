import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const blockers = [];

function exists(relativePath) {
  return existsSync(join(root, relativePath));
}

function read(relativePath) {
  return exists(relativePath) ? readFileSync(join(root, relativePath), 'utf8') : '';
}

function requireFile(relativePath) {
  if (!exists(relativePath)) blockers.push(`缺少文件：${relativePath}`);
}

function requireIncludes(relativePath, text, message) {
  if (!read(relativePath).includes(text)) blockers.push(message);
}

function requireNotIncludes(relativePath, text, message) {
  if (read(relativePath).includes(text)) blockers.push(message);
}

[
  'apps/api/src/unified-documents/unified-documents.module.ts',
  'apps/api/src/unified-documents/unified-documents.controller.ts',
  'apps/api/src/unified-documents/unified-documents.service.ts',
  'apps/api/src/unified-documents/helpers/delete-lock.service.ts',
  'apps/api/src/unified-documents/helpers/safe-delete.ts',
  'apps/tablet/src/components/unified/WarmUnifiedDocumentCenter.vue',
  'apps/tablet/src/components/unified/WarmUnifiedSearchBar.vue',
  'apps/tablet/src/components/unified/WarmUnifiedFilterPanel.vue',
  'apps/tablet/src/components/unified/WarmUnifiedResultList.vue',
  'apps/tablet/src/components/unified/WarmUnifiedPreviewPanel.vue',
  'apps/tablet/src/components/unified/WarmUnifiedUploadDialog.vue',
  'apps/tablet/src/components/unified/WarmUnifiedEditDialog.vue',
  'apps/tablet/src/components/unified/WarmTrashDialog.vue',
  'apps/tablet/src/components/unified/WarmDeletePasswordDialog.vue',
  'apps/tablet/src/components/unified/WarmDeleteLockSetupDialog.vue',
  'apps/tablet/src/components/unified/WarmBulkActionBar.vue',
  'apps/tablet/src/stores/unified-document-store.ts',
  'docs/v3.2-unified-query-upload-delete-lock.md',
  'docs/delete-lock-guide.md',
].forEach(requireFile);

[
  "Controller('unified-documents')",
  "Controller('delete-lock')",
  "Post(':id/delete')",
  "Post(':id/restore')",
  "Post(':id/purge')",
  "Post('bulk-delete')",
  "Post('bulk-restore')",
  "Post('bulk-purge')",
].forEach((text) => requireIncludes('apps/api/src/unified-documents/unified-documents.controller.ts', text, `统一资料 API 缺少：${text}`));

[
  'searchUnifiedDocuments',
  'uploadUnifiedDocument',
  'updateUnifiedDocument',
  'deleteUnifiedDocument',
  'restoreUnifiedDocument',
  'purgeUnifiedDocument',
  'getDeleteLockStatus',
  'setupDeleteLock',
].forEach((text) => requireIncludes('apps/tablet/src/services/api.ts', text, `前端 API service 缺少：${text}`));

requireIncludes('apps/tablet/src/views/TabletDashboard.vue', 'WarmUnifiedDocumentCenter', '主页面未挂载统一资料中心。');
requireNotIncludes('apps/tablet/src/views/TabletDashboard.vue', 'WarmStatusBar', '主页面仍渲染顶部状态栏。');
requireNotIncludes('apps/tablet/src/views/TabletDashboard.vue', 'WarmExecutionPanel', '主页面仍渲染生产执行闭环。');
requireNotIncludes('apps/tablet/src/views/TabletDashboard.vue', 'WarmAnalyticsDashboardDialog', '主页面仍渲染统计看板。');
requireNotIncludes('apps/tablet/src/views/TabletDashboard.vue', 'WarmLaunchScreen', '主页面仍渲染启动演示信息。');
requireIncludes('apps/tablet/src/app/routes.ts', "meta: { public: true }", '/tablet 未设置为主流程免登录。');
requireIncludes('apps/tablet/src/config/app-version.ts', "APP_VERSION = 'V3.2'", '版本未更新为 V3.2。');
requireIncludes('apps/tablet/src/config/app-version.ts', 'mock-local-custom-document-center', '构建通道未更新为统一资料中心。');
requireIncludes('.gitignore', 'apps/api/storage/metadata/delete-lock-settings.json', '删除锁 metadata 未加入 .gitignore。');
requireIncludes('scripts/security-check.mjs', 'delete-lock-settings.json', '安全检查未覆盖删除锁 metadata。');
requireNotIncludes('apps/api/src/unified-documents/helpers/delete-lock.service.ts', 'postgresql://', '删除锁模块不应包含数据库连接。');
requireNotIncludes('apps/api/src/unified-documents/unified-documents.service.ts', 'db push', '统一资料模块不应包含数据库写库命令。');

console.log('V3.2 unified documents check');
console.log('该检查只读，不连接数据库，不执行 migrate / db push / seed，不删除文件。');

if (blockers.length) {
  console.log('\n阻塞项：');
  for (const blocker of blockers) console.log(`- ${blocker}`);
  process.exit(1);
}

console.log('\n统一资料中心检查通过。');
