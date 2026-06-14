import { existsSync, readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { networkInterfaces } from 'node:os';

const root = process.cwd();
const warnings = [];
const blockers = [];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readIfExists(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function lanIpv4List() {
  return Object.values(networkInterfaces())
    .flat()
    .filter(Boolean)
    .filter((item) => item.family === 'IPv4' && !item.internal)
    .map((item) => item.address);
}

function requireScript(scripts, name) {
  if (!scripts[name]) blockers.push(`缺少 package 脚本：${name}`);
}

function requireGitIgnore(content, pattern) {
  if (!content.includes(pattern)) blockers.push(`.gitignore 未覆盖：${pattern}`);
}

async function checkDemoAssets() {
  const dir = join(root, 'demo-upload-assets');
  const required = [
    'demo-drawing-rev-a.pdf',
    'demo-drawing-rev-b.pdf',
    'demo-sop-step-01.png',
    'demo-pinout-16p.png',
    'demo-finished-detail.png',
    'demo-unsupported.txt',
  ];

  if (!existsSync(dir)) {
    blockers.push('demo-upload-assets 不存在，请先执行 npm run demo:assets。');
    return;
  }

  const files = await readdir(dir);
  for (const file of required) {
    const svgFallback = file.endsWith('.png') ? file.replace(/\.png$/i, '.svg') : file;
    if (!files.includes(file) && !files.includes(svgFallback)) {
      blockers.push(`演示上传资料缺失：${file}`);
    }
  }
}

function checkEnvLocalhostWarning() {
  const candidates = [
    'apps/tablet/.env',
    'apps/tablet/.env.local',
    'apps/tablet/.env.development',
    'apps/tablet/.env.production',
  ];

  for (const relativePath of candidates) {
    const fullPath = join(root, relativePath);
    const content = readIfExists(fullPath);
    if (!content) continue;
    const hasLocalhostApi = content
      .split(/\r?\n/)
      .some((line) => /^VITE_API_BASE_URL\s*=/.test(line.trim()) && /localhost|127\.0\.0\.1/.test(line));
    if (hasLocalhostApi) {
      warnings.push(`${relativePath} 中 VITE_API_BASE_URL 指向 localhost；平板 LAN 演示建议留空或改用本机 IPv4。`);
    }
  }
}

const rootPackage = readJson(join(root, 'package.json'));
const scripts = rootPackage.scripts ?? {};
[
  'dev:tablet',
  'dev:api',
  'dev:tablet:lan',
  'dev:api:lan',
  'dev:lan',
  'demo:assets',
  'demo:check',
  'maintenance-flow:check',
  'auth-flow:check',
  'knowledge-flow:check',
  'knowledge-validation:check',
  'execution-flow:check',
  'analytics-flow:check',
  'demo:analytics',
  'demo:knowledge',
  'file-flow:check',
  'security:check',
  'build',
  'check',
].forEach((name) => requireScript(scripts, name));

const gitignore = readIfExists(join(root, '.gitignore'));
[
  'apps/api/.env.local',
  'apps/api/storage/uploads/*',
  'apps/api/storage/metadata/documents.json',
  'apps/api/storage/metadata/audit-logs.json',
  'apps/api/storage/metadata/maintenance-records.json',
  'apps/api/storage/metadata/knowledge-fixtures.json',
  'apps/api/storage/metadata/knowledge-abnormal-cases.json',
  'apps/api/storage/metadata/knowledge-quality-standards.json',
  'apps/api/storage/metadata/knowledge-records.json',
  'apps/api/storage/metadata/execution-records.json',
  'apps/api/storage/metadata/plan-status-events.json',
  'apps/api/storage/metadata/quantity-reports.json',
  'apps/api/storage/metadata/shift-handover-records.json',
  'apps/api/storage/metadata/demo-analytics-snapshot.json',
].forEach((pattern) => requireGitIgnore(gitignore, pattern));

await checkDemoAssets();
checkEnvLocalhostWarning();

console.log('V2.6 tablet demo readiness check');
console.log('This check is read-only. It does not start services, connect to a database, run migrations, db push, or seed.');

const lanIps = lanIpv4List();
if (lanIps.length) {
  console.log('\nLAN IPv4 suggestions:');
  for (const ip of lanIps) {
    console.log(`- Tablet UI: http://${ip}:5173`);
    console.log(`- API: http://${ip}:3000/api`);
    console.log(`- Swagger: http://${ip}:3000/api/docs`);
  }
} else {
  warnings.push('未检测到非本地 IPv4，请确认电脑和平板在同一局域网。');
}

if (warnings.length) {
  console.log('\nWarnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (blockers.length) {
  console.log('\nBlockers:');
  for (const blocker of blockers) console.log(`- ${blocker}`);
  process.exit(1);
}

console.log('\nDemo readiness check passed.');
