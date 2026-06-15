import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const apply = process.argv.includes('--apply');
const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
const backupRoot = join(root, 'local-backups', `demo-data-cleanup-${timestamp}`);

const demoDirectories = [
  'demo-upload-assets',
  'demo-import-files',
  'demo-knowledge-files',
];

const uploadDirectory = 'apps/api/storage/uploads';
const metadataDirectory = 'apps/api/storage/metadata';

const metadataFiles = [
  'documents.json',
  'audit-logs.json',
  'import-records.json',
  'imported-business-data.json',
  'import-previews.json',
  'maintenance-records.json',
  'knowledge-fixtures.json',
  'knowledge-abnormal-cases.json',
  'knowledge-quality-standards.json',
  'knowledge-records.json',
  'execution-records.json',
  'plan-status-events.json',
  'quantity-reports.json',
  'shift-handover-records.json',
  'demo-analytics-snapshot.json',
  'prisma-seed-preview.json',
  'prisma-migration-preview.sql',
  'system-settings.json',
  'dictionary-settings.json',
  'station-profiles.json',
  'display-settings.json',
  'announcement-records.json',
  'system-feedback-records.json',
  'pilot-check-records.json',
  'settings-records.json',
];

const blockedPrefixes = [
  'apps/api/src',
  'apps/tablet/src',
  'docs',
  'scripts',
  'apps/api/prisma',
];

function toAbsolute(path) {
  return resolve(root, path);
}

function isInside(parent, child) {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !resolve(rel).startsWith('..'));
}

function assertSafeTarget(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  if (blockedPrefixes.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))) {
    throw new Error(`风险阻止：禁止清理源码/文档/脚本路径 ${relativePath}`);
  }

  const allowed =
    demoDirectories.includes(normalized)
    || normalized.startsWith(`${uploadDirectory}/`)
    || normalized === uploadDirectory
    || normalized.startsWith(`${metadataDirectory}/`)
    || normalized === metadataDirectory;

  if (!allowed) throw new Error(`风险阻止：路径不在白名单内 ${relativePath}`);

  const absolute = toAbsolute(relativePath);
  if (!isInside(root, absolute)) throw new Error(`风险阻止：路径越界 ${relativePath}`);
}

function copyToBackup(relativePath) {
  const source = toAbsolute(relativePath);
  if (!existsSync(source)) return false;
  const target = join(backupRoot, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true, force: true });
  return true;
}

function removeTarget(relativePath) {
  assertSafeTarget(relativePath);
  const target = toAbsolute(relativePath);
  if (!existsSync(target)) return 'missing';
  if (!apply) return 'dry-run';
  copyToBackup(relativePath);
  rmSync(target, { recursive: true, force: true });
  return 'cleaned';
}

function cleanDirectoryContents(relativePath, keepNames = []) {
  assertSafeTarget(relativePath);
  const dir = toAbsolute(relativePath);
  if (!existsSync(dir)) return { missing: [relativePath], skipped: [], cleaned: [], backedUp: [] };
  const result = { missing: [], skipped: [], cleaned: [], backedUp: [] };
  for (const name of readdirSync(dir)) {
    const childRelative = `${relativePath}/${name}`;
    if (keepNames.includes(name)) {
      result.skipped.push(childRelative);
      continue;
    }
    assertSafeTarget(childRelative);
    if (!apply) {
      result.cleaned.push(childRelative);
      continue;
    }
    copyToBackup(childRelative);
    result.backedUp.push(childRelative);
    rmSync(toAbsolute(childRelative), { recursive: true, force: true });
    result.cleaned.push(childRelative);
  }
  return result;
}

const report = {
  mode: apply ? 'apply' : 'dry-run',
  backupRoot: apply ? backupRoot : '(dry-run 不创建备份)',
  backedUp: [],
  cleaned: [],
  skipped: [],
  missing: [],
  blocked: [],
};

function recordDirectoryRemoval(relativePath) {
  try {
    assertSafeTarget(relativePath);
    if (!existsSync(toAbsolute(relativePath))) {
      report.missing.push(relativePath);
      return;
    }
    if (apply) {
      copyToBackup(relativePath);
      report.backedUp.push(relativePath);
    }
    const status = removeTarget(relativePath);
    if (status === 'cleaned' || status === 'dry-run') report.cleaned.push(relativePath);
  } catch (error) {
    report.blocked.push(`${relativePath}：${error.message}`);
  }
}

for (const dir of demoDirectories) recordDirectoryRemoval(dir);

for (const item of [cleanDirectoryContents(uploadDirectory, ['.gitkeep'])]) {
  report.cleaned.push(...item.cleaned);
  report.backedUp.push(...item.backedUp);
  report.skipped.push(...item.skipped);
  report.missing.push(...item.missing);
}

for (const file of metadataFiles) {
  const relativePath = `${metadataDirectory}/${file}`;
  try {
    assertSafeTarget(relativePath);
    if (!existsSync(toAbsolute(relativePath))) {
      report.missing.push(relativePath);
      continue;
    }
    if (apply) {
      copyToBackup(relativePath);
      report.backedUp.push(relativePath);
    }
    const status = removeTarget(relativePath);
    if (status === 'cleaned' || status === 'dry-run') report.cleaned.push(relativePath);
  } catch (error) {
    report.blocked.push(`${relativePath}：${error.message}`);
  }
}

if (existsSync(toAbsolute(metadataDirectory))) {
  for (const name of readdirSync(toAbsolute(metadataDirectory))) {
    if (name === '.gitkeep') report.skipped.push(`${metadataDirectory}/${name}`);
  }
}

console.log(`演示数据清理报告（${report.mode}）`);
console.log(`备份目录：${report.backupRoot}`);
console.log(`已备份：${report.backedUp.length ? report.backedUp.join('，') : '无'}`);
console.log(`将清理/已清理：${report.cleaned.length ? report.cleaned.join('，') : '无'}`);
console.log(`跳过：${report.skipped.length ? report.skipped.join('，') : '无'}`);
console.log(`未找到：${report.missing.length ? report.missing.join('，') : '无'}`);
console.log(`风险阻止：${report.blocked.length ? report.blocked.join('，') : '无'}`);
console.log('数据库连接或写库操作：否');

if (report.blocked.length) process.exit(1);

if (apply && existsSync(backupRoot)) {
  const hasBackup = readdirSync(backupRoot).length > 0;
  if (!hasBackup) rmSync(backupRoot, { recursive: true, force: true });
}
