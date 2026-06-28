import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const uploadsDir = join(root, 'apps/api/storage/uploads');
const metadataDir = join(root, 'apps/api/storage/metadata');
const documentsJson = join(metadataDir, 'documents.json');
const auditLogsJson = join(metadataDir, 'audit-logs.json');
const demoDir = join(root, 'demo-upload-assets');
const allowedPreviewExts = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);
const suspiciousKeywords = ['客户', '比亚迪', '吉利', '理想', '小鹏', '蔚来', '特斯拉', 'BYD', 'Tesla', '图纸', 'SOP', '真实', '量产'];
const warnings = [];

async function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path));
    if (entry.isFile()) files.push(path);
  }
  return files;
}

async function warnLargeFiles(files) {
  for (const file of files) {
    const info = await stat(file);
    if (info.size > 30 * 1024 * 1024) {
      warnings.push(`${relative(root, file)} 超过 30MB，平板预览可能较慢。`);
    }
  }
}

function warnSuspiciousUploadNames(files) {
  for (const file of files) {
    const rel = relative(root, file);
    const hit = suspiciousKeywords.find((keyword) => rel.toLowerCase().includes(keyword.toLowerCase()));
    if (hit) warnings.push(`${rel} 文件名包含疑似真实客户/生产关键词：${hit}`);
  }
}

function warnUnsupportedUploadNames(files) {
  for (const file of files) {
    if (file.endsWith('.gitkeep')) continue;
    const ext = extname(file).toLowerCase();
    if (!allowedPreviewExts.has(ext)) {
      warnings.push(`${relative(root, file)} 不是当前在线预览支持格式。`);
    }
  }
}

async function checkGitIgnored(path) {
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync('git', ['check-ignore', path], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) warnings.push(`${path} 未被 .gitignore 忽略，请勿提交本地 metadata。`);
}

async function checkDemoAssets() {
  const required = [
    'demo-drawing-rev-a.pdf',
    'demo-drawing-rev-b.pdf',
    'demo-sop-step-01.png',
    'demo-pinout-16p.png',
    'demo-finished-detail.png',
    'demo-unsupported.txt',
  ];
  if (!existsSync(demoDir)) {
    warnings.push('demo-upload-assets 不存在，请先执行 npm run demo:assets。');
    return;
  }
  for (const name of required) {
    const pngFallback = name.endsWith('.png') ? name.replace(/\.png$/i, '.svg') : name;
    if (!existsSync(join(demoDir, name)) && !existsSync(join(demoDir, pngFallback))) {
      warnings.push(`演示资料缺失：${name}`);
    }
  }

  const textFiles = ['demo-drawing-rev-a.pdf', 'demo-drawing-rev-b.pdf', 'demo-unsupported.txt'];
  for (const name of textFiles) {
    const file = join(demoDir, name);
    if (!existsSync(file)) continue;
    const sample = await readFile(file, 'utf8');
    if (!sample.includes('DEMO ONLY') || !sample.includes('non-real customer material')) {
      warnings.push(`${relative(root, file)} 未检测到演示资料声明。`);
    }
  }
}

console.log('V1.4 file-flow local check');
console.log(`uploads: ${existsSync(uploadsDir) ? 'exists' : 'missing'}`);
console.log(`metadata: ${existsSync(metadataDir) ? 'exists' : 'missing'}`);
console.log(`documents.json: ${existsSync(documentsJson) ? 'exists' : 'not created yet'}`);
console.log(`audit-logs.json: ${existsSync(auditLogsJson) ? 'exists' : 'not created yet'}`);

await checkGitIgnored('apps/api/storage/metadata/documents.json');
await checkGitIgnored('apps/api/storage/metadata/audit-logs.json');

const uploadFiles = (await listFiles(uploadsDir)).filter((file) => !file.endsWith('.gitkeep'));
if (uploadFiles.length > 0) {
  warnings.push(`apps/api/storage/uploads 下存在 ${uploadFiles.length} 个本地上传文件，请确认不是客户真实资料，且不要提交。`);
}
warnSuspiciousUploadNames(uploadFiles);
warnUnsupportedUploadNames(uploadFiles);
await warnLargeFiles(uploadFiles);
await checkDemoAssets();

const demoFiles = await listFiles(demoDir);
await warnLargeFiles(demoFiles);

if (warnings.length) {
  console.log('\nWarnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
} else {
  console.log('\nNo file-flow warnings found.');
}

console.log('\nThis check is read-only. It does not connect to a database and does not delete files.');
