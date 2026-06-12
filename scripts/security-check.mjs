import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

const rootDir = process.cwd();
const warnings = [];
const blockers = [];

const ignoredDirectories = new Set([
  '.git',
  '.codex',
  'node_modules',
  'dist',
  'build',
  '.vite',
  'coverage',
  'generated',
]);

const contentScanSkipFiles = new Set(['scripts/security-check.mjs']);
const maxWarnSize = 20 * 1024 * 1024;
const maxTextReadSize = 5 * 1024 * 1024;

function toPosix(path) {
  return path.split('\\').join('/');
}

function normalizeRelative(path) {
  return toPosix(relative(rootDir, path));
}

function addWarning(file, type) {
  warnings.push({ file, type });
}

function addBlocker(file, type) {
  blockers.push({ file, type });
}

function runGit(args) {
  try {
    execFileSync('git', args, {
      cwd: rootDir,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function isGitRepo() {
  return runGit(['rev-parse', '--is-inside-work-tree']);
}

const insideGit = isGitRepo();

function isTracked(path) {
  return insideGit && runGit(['ls-files', '--error-unmatch', path]);
}

function isIgnored(path) {
  return insideGit && runGit(['check-ignore', '-q', path]);
}

function shouldSkipDirectory(relativePath) {
  const parts = toPosix(relativePath).split('/');
  if (parts.some((part) => ignoredDirectories.has(part))) {
    return true;
  }

  return toPosix(relativePath).startsWith('apps/api/storage/uploads');
}

function looksBinary(buffer) {
  const sampleLength = Math.min(buffer.length, 8192);
  for (let index = 0; index < sampleLength; index += 1) {
    if (buffer[index] === 0) {
      return true;
    }
  }
  return false;
}

function stripValue(value) {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function isPlaceholder(value) {
  const lower = value.toLowerCase();
  return (
    value === '' ||
    lower.includes('example') ||
    lower.includes('placeholder') ||
    lower.includes('changeme') ||
    lower.includes('your_') ||
    lower.includes('user:password@host') ||
    lower === 'password' ||
    lower === 'secret' ||
    lower === 'apikey' ||
    lower === 'api_key' ||
    lower === 'private_key' ||
    lower === 'mock' ||
    lower === 'demo'
  );
}

function checkContent(file, content) {
  const relativeFile = normalizeRelative(file);
  const lines = content.split(/\r?\n/);

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
      return;
    }

    const databaseMatch = trimmed.match(/^(?:export\s+)?DATABASE_URL\s*=\s*(postgresql:\/\/[^\s"'`]+)/i);
    if (databaseMatch) {
      const value = stripValue(databaseMatch[1]);
      const isExampleDatabaseUrl =
        value === 'postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public' ||
        value.includes('USER:PASSWORD@HOST') ||
        value.includes('localhost') ||
        value.includes('127.0.0.1');

      if (!isExampleDatabaseUrl) {
        addBlocker(relativeFile, '疑似真实 PostgreSQL DATABASE_URL');
      }
    }

    if (/^(?:export\s+)?ALLOW_PRISMA_WRITE\s*=\s*true\b/i.test(trimmed)) {
      addBlocker(relativeFile, '写库开关被开启');
    }

    if (/^(?:export\s+)?ALLOW_DESTRUCTIVE_DB_ACTIONS\s*=\s*true\b/i.test(trimmed)) {
      addBlocker(relativeFile, '危险数据库操作开关被开启');
    }

    const sensitiveAssignment = trimmed.match(
      /^(?:export\s+)?["']?(wecom[\s_-]*secret|corpsecret|api[_-]?key|apikey|private[_-]?key|secret|password)["']?\s*[:=]\s*["']?([^"'\s#]+)/i,
    );

    if (sensitiveAssignment) {
      const riskType = sensitiveAssignment[1].replace(/\s+/g, ' ');
      const value = stripValue(sensitiveAssignment[2]);
      if (!isPlaceholder(value)) {
        addBlocker(relativeFile, `疑似敏感字段：${riskType}`);
      }
    }
  });
}

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    const relativePath = normalizeRelative(fullPath);

    if (entry.isDirectory()) {
      if (!shouldSkipDirectory(relativePath)) {
        walk(fullPath);
      }
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const stats = statSync(fullPath);
    if (stats.size > maxWarnSize) {
      addWarning(relativePath, '文件超过 20MB，请确认是否应提交');
      continue;
    }

    if (contentScanSkipFiles.has(relativePath) || stats.size > maxTextReadSize) {
      continue;
    }

    const buffer = readFileSync(fullPath);
    if (looksBinary(buffer)) {
      continue;
    }

    checkContent(fullPath, buffer.toString('utf8'));
  }
}

function checkLocalOnlyFile(relativePath) {
  const fullPath = join(rootDir, relativePath);
  if (!existsSync(fullPath)) {
    return;
  }

  if (isTracked(relativePath)) {
    addBlocker(relativePath, '本地敏感文件已被 Git 跟踪');
    return;
  }

  if (insideGit && !isIgnored(relativePath)) {
    addBlocker(relativePath, '本地敏感文件未被 .gitignore 忽略');
    return;
  }

  addWarning(relativePath, '本地存在，但已被忽略；不要手动提交');
}

function listFiles(directory, base = directory) {
  const files = [];
  if (!existsSync(directory)) {
    return files;
  }

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath, base));
      continue;
    }
    if (entry.isFile()) {
      files.push(toPosix(relative(rootDir, fullPath)));
    }
  }
  return files;
}

function checkUploadFiles() {
  const uploadFiles = listFiles(join(rootDir, 'apps/api/storage/uploads')).filter(
    (file) => !file.endsWith('/.gitkeep'),
  );

  uploadFiles.forEach((file) => checkLocalOnlyFile(file));
}

walk(rootDir);

[
  'apps/api/.env.local',
  '.env.local',
  'apps/api/storage/metadata/documents.json',
  'apps/api/storage/metadata/audit-logs.json',
  'apps/api/storage/metadata/import-records.json',
  'apps/api/storage/metadata/imported-business-data.json',
  'apps/api/storage/metadata/import-previews.json',
  'apps/api/storage/metadata/prisma-seed-preview.json',
  'apps/api/storage/metadata/prisma-migration-preview.sql',
].forEach((file) => checkLocalOnlyFile(file));

checkUploadFiles();

console.log('GitHub 上传前安全检查报告');
console.log('==========================');

if (warnings.length === 0 && blockers.length === 0) {
  console.log('安全通过：未发现警告项或阻塞项。');
}

if (warnings.length > 0) {
  console.log('\n警告项：');
  warnings.forEach((warning) => {
    console.log(`- ${warning.file}：${warning.type}`);
  });
}

if (blockers.length > 0) {
  console.log('\n阻塞项：');
  blockers.forEach((blocker) => {
    console.log(`- ${blocker.file}：${blocker.type}`);
  });
  console.log('\n安全检查未通过：请先处理阻塞项。');
  process.exit(1);
}

if (warnings.length > 0) {
  console.log('\n安全检查通过，但存在需要注意的警告项。');
} else {
  console.log('\n安全检查通过。');
}
