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

function requireText(relativePath, expected, label = expected) {
  const content = read(relativePath);
  if (!content.includes(expected)) blockers.push(`${relativePath} 未检测到：${label}`);
}

const packageJson = JSON.parse(read('package.json'));

[
  'apps/api/src/auth/auth.module.ts',
  'apps/api/src/auth/auth.controller.ts',
  'apps/api/src/auth/auth.service.ts',
  'apps/api/src/auth/mock-users.ts',
  'apps/api/src/auth/guards/mock-permission.guard.ts',
  'apps/api/src/auth/decorators/require-permissions.decorator.ts',
  'apps/api/src/auth/decorators/current-user.decorator.ts',
  'apps/tablet/src/stores/auth-store.ts',
  'apps/tablet/src/views/WarmLoginView.vue',
  'apps/tablet/src/components/auth/WarmPermissionDenied.vue',
  'apps/tablet/src/lib/permissions.ts',
  'docs/v2.2-role-permission.md',
  'docs/permission-matrix.md',
].forEach(requireFile);

requireText('package.json', '"auth-flow:check"', 'auth-flow:check 脚本');
requireText('apps/tablet/src/app/routes.ts', "path: '/login'", '/login 路由');
requireText('apps/tablet/src/app/routes.ts', 'router.beforeEach', '路由守卫');
requireText('apps/tablet/src/config/app-version.ts', "APP_VERSION = 'V2.2'", 'APP_VERSION V2.2');
requireText('apps/tablet/src/config/app-version.ts', "APP_STAGE = '角色权限演示版'", 'APP_STAGE 角色权限演示版');
requireText('apps/tablet/src/config/app-version.ts', "APP_BUILD_CHANNEL = 'mock-local-rbac-demo'", 'mock-local-rbac-demo');
requireText('apps/api/src/auth/mock-users.ts', 'mock-front-leader', '前段组长 Mock 用户');
requireText('apps/api/src/auth/mock-users.ts', 'mock-admin', '管理员 Mock 用户');
requireText('apps/api/src/auth/mock-users.ts', 'document.set_effective', '资料设为有效权限');
requireText('apps/api/src/production-plans/production-plans.controller.ts', "RequirePermissions('plan.confirm')", '计划确认权限守卫');
requireText('apps/api/src/feedback/feedback.controller.ts', "RequirePermissions('plan.feedback')", '异常反馈权限守卫');
requireText('apps/api/src/documents/documents.controller.ts', "RequirePermissions('document.upload')", '资料上传权限守卫');
requireText('apps/api/src/imports/imports.controller.ts', "RequirePermissions('import.apply')", '应用导入权限守卫');
requireText('apps/api/src/maintenance/maintenance.controller.ts', 'maintenance.customer.update', '维护中心权限守卫');
requireText('apps/tablet/src/components/warm/WarmStatusBar.vue', '切换本地 Mock 角色', '顶栏切换角色');
requireText('apps/tablet/src/components/warm/WarmStatusBar.vue', '权限说明', '顶栏权限说明');
requireText('apps/tablet/src/services/api.ts', 'x-mock-user-id', 'Mock 用户请求头');

if (!packageJson.scripts?.['auth-flow:check']) blockers.push('package.json scripts 缺少 auth-flow:check');

console.log('V2.2 auth flow check');
console.log('This check is read-only. It does not connect to a database, run migrations, db push, seed, or delete files.');

if (blockers.length) {
  console.log('\nBlockers:');
  for (const blocker of blockers) console.log(`- ${blocker}`);
  process.exit(1);
}

console.log('\nAuth flow check passed.');
