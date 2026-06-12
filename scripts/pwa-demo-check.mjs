import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const blockers = [];
const warnings = [];

function exists(relativePath) {
  return existsSync(join(root, relativePath));
}

function read(relativePath) {
  return exists(relativePath) ? readFileSync(join(root, relativePath), 'utf8') : '';
}

function requireFile(relativePath) {
  if (!exists(relativePath)) blockers.push(`缺少文件：${relativePath}`);
}

function requireScript(scripts, name) {
  if (!scripts[name]) blockers.push(`缺少 package 脚本：${name}`);
}

function requireGitIgnore(content, pattern) {
  if (!content.includes(pattern)) blockers.push(`.gitignore 未覆盖：${pattern}`);
}

const rootPackage = JSON.parse(read('package.json'));
const scripts = rootPackage.scripts ?? {};
const viteConfig = read('apps/tablet/vite.config.ts');
const gitignore = read('.gitignore');

[
  'apps/tablet/src/components/system/WarmPwaInstallPrompt.vue',
  'apps/tablet/src/components/system/WarmLandscapeGuard.vue',
  'apps/tablet/src/components/system/WarmPwaDiagnosticsDialog.vue',
  'apps/tablet/src/components/system/WarmLaunchScreen.vue',
  'apps/tablet/public/pwa/icon.svg',
  'apps/tablet/public/pwa/maskable-icon.svg',
  'apps/tablet/public/pwa/shortcut-plan.svg',
  'apps/tablet/public/pwa/shortcut-upload.svg',
  'start-field-demo.bat',
  'start-field-demo.ps1',
  'docs/tablet-install-guide.md',
  'docs/v1.9-pwa-tablet-package.md',
].forEach(requireFile);

[
  'pwa:assets',
  'pwa:check',
  'demo:assets',
  'demo:check',
  'demo:release-check',
  'demo:freeze-check',
  'file-flow:check',
  'security:check',
  'build',
  'check',
].forEach((name) => requireScript(scripts, name));

if (!viteConfig.includes('VitePWA')) blockers.push('apps/tablet/vite.config.ts 未检测到 VitePWA 配置。');
if (!viteConfig.includes("name: '线束车间资料管控'")) blockers.push('PWA manifest 未检测到应用名称。');
if (!viteConfig.includes("start_url: '/tablet'")) blockers.push('PWA manifest 未检测到 start_url /tablet。');
if (!viteConfig.includes('runtimeCaching: []')) warnings.push('未检测到 runtimeCaching 空配置，请确认 API 和文件流不会被离线缓存。');
if (!viteConfig.includes('API 和 /api/files 文件流不做离线缓存')) warnings.push('未检测到 API / 文件流不缓存说明。');

[
  'apps/api/.env.local',
  'apps/api/storage/uploads/*',
  'apps/api/storage/metadata/documents.json',
  'apps/api/storage/metadata/audit-logs.json',
].forEach((pattern) => requireGitIgnore(gitignore, pattern));

console.log('V1.9 PWA tablet demo check');
console.log('This check is read-only. It does not connect to a database, run migrations, db push, seed, or delete files.');
console.log('局域网 HTTP 可能不能完整 PWA；HTTPS 部署后体验更完整。');

if (warnings.length) {
  console.log('\nWarnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (blockers.length) {
  console.log('\nBlockers:');
  for (const blocker of blockers) console.log(`- ${blocker}`);
  process.exit(1);
}

console.log('\nPWA tablet demo check passed.');
