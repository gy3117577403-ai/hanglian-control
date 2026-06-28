import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { safeDocumentRef, safeFileRef } from './real-data-privacy.mjs';

const root = process.cwd();
const expectEmpty = process.argv.includes('--expect-empty');
const uploadsDir = join(root, 'apps/api/storage/uploads');
const metadataDir = join(root, 'apps/api/storage/metadata');
const documentsJson = join(metadataDir, 'documents.json');
const auditLogsJson = join(metadataDir, 'audit-logs.json');
const reportPath = join(root, 'docs/generated/real-data-test-status-report.md');
const testMarkers = ['HL_REAL_DATA_TEST', 'HUB-SANDBOX-', 'UPLOAD-SANDBOX-', 'document-hub,upload-check', 'upload-sandbox-check'];
const warnings = [];
const failures = [];

function toPosix(value) {
  return value.split('\\').join('/');
}

function rel(value) {
  return toPosix(relative(root, value));
}

function readJsonArray(file, label) {
  if (!existsSync(file)) return [];
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    if (!Array.isArray(parsed)) {
      failures.push(`${label} is not an array.`);
      return [];
    }
    return parsed;
  } catch {
    failures.push(`${label} is not valid JSON.`);
    return [];
  }
}

function listUploadFiles() {
  if (!existsSync(uploadsDir)) return [];
  return readdirSync(uploadsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name !== '.gitkeep')
    .map((entry) => join(uploadsDir, entry.name));
}

function git(args) {
  return spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe',
    windowsHide: true,
  });
}

function isGitIgnored(path) {
  return git(['check-ignore', '-q', path]).status === 0;
}

function isGitTracked(path) {
  return git(['ls-files', '--error-unmatch', path]).status === 0;
}

function searchableDocumentText(document) {
  return [
    document?.documentId,
    document?.id,
    document?.title,
    document?.version,
    document?.remark,
    document?.description,
    document?.mockPreviewText,
    document?.originalFileName,
    document?.storedFileName,
    ...(Array.isArray(document?.keywords) ? document.keywords : []),
  ].filter(Boolean).join('\n');
}

function hasTestMarker(value) {
  return testMarkers.some((marker) => String(value ?? '').includes(marker));
}

function isMarkedTestDocument(document) {
  return document?.source === 'manual_upload' && hasTestMarker(searchableDocumentText(document));
}

function isMarkedTestFile(file) {
  return hasTestMarker(basename(file));
}

function fileSizeTotal(files) {
  return files.reduce((sum, file) => {
    try {
      return sum + statSync(file).size;
    } catch {
      return sum;
    }
  }, 0);
}

function mb(value) {
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function inspectGitSafety(uploadFiles) {
  const ignoreChecks = [
    ['apps/api/storage/uploads/*', 'apps/api/storage/uploads/__real-data-status__.pdf'],
    ['apps/api/storage/metadata/documents.json', 'apps/api/storage/metadata/documents.json'],
    ['apps/api/storage/metadata/audit-logs.json', 'apps/api/storage/metadata/audit-logs.json'],
  ];

  for (const [label, path] of ignoreChecks) {
    if (!isGitIgnored(path)) failures.push(`${label} 未被 .gitignore 忽略。`);
  }

  for (const path of ['apps/api/storage/metadata/documents.json', 'apps/api/storage/metadata/audit-logs.json']) {
    if (existsSync(join(root, path)) && isGitTracked(path)) failures.push(`${path} 已被 Git 跟踪。`);
  }

  for (const file of uploadFiles) {
    if (isGitTracked(rel(file))) failures.push(`上传文件已被 Git 跟踪：${safeFileRef(file)}`);
  }
}

function writeReport(summary) {
  mkdirSync(dirname(reportPath), { recursive: true });
  const lines = [
    '# 真实资料本地测试状态报告',
    '',
    `生成时间：${new Date().toISOString()}`,
    `要求沙盒为空：${expectEmpty ? '是' : '否'}`,
    '',
    '数据库连接或写库操作：否',
    'Sealos 接入：否',
    '企业微信微盘接入：否',
    '真实语音接入：否',
    '',
    '隐私规则：本报告不写入真实客户名称、产品型号、资料标题、上传文件名或完整路径，只保留短指纹用于本机排查。',
    '',
    '## 汇总',
    '',
    `- 本机上传资料记录：${summary.manualDocuments.length}`,
    `- 带测试标记资料记录：${summary.markedDocuments.length}`,
    `- 未带测试标记资料记录：${summary.unmarkedDocuments.length}`,
    `- 上传文件：${summary.uploadFiles.length}`,
    `- 带测试标记上传文件：${summary.markedUploadFiles.length}`,
    `- 未带测试标记上传文件：${summary.unmarkedUploadFiles.length}`,
    `- 上传文件总大小：${mb(summary.totalUploadBytes)}`,
    `- 审计记录：${summary.auditLogs.length}`,
    `- 警告：${warnings.length}`,
    `- 阻塞：${failures.length}`,
    '',
    '## 未带测试标记的本机上传资料（隐私安全指纹）',
    '',
    ...(summary.unmarkedDocuments.length ? summary.unmarkedDocuments.map((document) => `- ${safeDocumentRef(document)}`) : ['- 无']),
    '',
    '## 未带测试标记的上传文件（隐私安全指纹）',
    '',
    ...(summary.unmarkedUploadFiles.length ? summary.unmarkedUploadFiles.map((file) => `- ${safeFileRef(file)}`) : ['- 无']),
    '',
  ];

  if (warnings.length) {
    lines.push('## 警告', '');
    warnings.forEach((warning) => lines.push(`- ${warning}`));
    lines.push('');
  }

  if (failures.length) {
    lines.push('## 阻塞', '');
    failures.forEach((failure) => lines.push(`- ${failure}`));
    lines.push('');
  }

  lines.push('## 结论', '');
  if (failures.length) {
    lines.push('未通过，请先处理阻塞项。');
  } else if (summary.manualDocuments.length || summary.uploadFiles.length) {
    lines.push('通过，但本机存在上传测试数据。测试结束后请先执行 `npm run real-data:cleanup:dry`，确认后再执行清理。');
  } else {
    lines.push('通过，本机上传沙盒为空，可以进入真实资料上传测试前状态。');
  }
  lines.push('');

  writeFileSync(reportPath, lines.join('\n'), 'utf8');
}

console.log('真实资料本地测试状态检查');
console.log('本脚本只读，不连接数据库，不删除文件，不写库。');
console.log('本脚本不会把真实客户名、产品型号、资料标题或上传文件名写入报告。');

const documents = readJsonArray(documentsJson, 'documents.json');
const auditLogs = readJsonArray(auditLogsJson, 'audit-logs.json');
const uploadFiles = listUploadFiles();
const manualDocuments = documents.filter((document) => document?.source === 'manual_upload');
const markedDocuments = manualDocuments.filter(isMarkedTestDocument);
const unmarkedDocuments = manualDocuments.filter((document) => !isMarkedTestDocument(document));
const markedUploadFiles = uploadFiles.filter(isMarkedTestFile);
const unmarkedUploadFiles = uploadFiles.filter((file) => !isMarkedTestFile(file));
const totalUploadBytes = fileSizeTotal(uploadFiles);

inspectGitSafety(uploadFiles);

if (unmarkedDocuments.length) warnings.push(`存在 ${unmarkedDocuments.length} 条未带 HL_REAL_DATA_TEST 标记的本机上传资料记录。`);
if (unmarkedUploadFiles.length) warnings.push(`存在 ${unmarkedUploadFiles.length} 个未带测试标记的上传文件。`);
if (expectEmpty && manualDocuments.length) failures.push(`expect-empty 要求本机上传资料记录为 0，当前为 ${manualDocuments.length}。`);
if (expectEmpty && uploadFiles.length) failures.push(`expect-empty 要求上传文件为 0，当前为 ${uploadFiles.length}。`);

const summary = {
  documents,
  auditLogs,
  uploadFiles,
  manualDocuments,
  markedDocuments,
  unmarkedDocuments,
  markedUploadFiles,
  unmarkedUploadFiles,
  totalUploadBytes,
};

writeReport(summary);

console.log(`本机上传资料记录：${manualDocuments.length}`);
console.log(`上传文件：${uploadFiles.length}`);
console.log(`未带测试标记资料记录：${unmarkedDocuments.length}`);
console.log(`未带测试标记上传文件：${unmarkedUploadFiles.length}`);
console.log(`警告：${warnings.length}`);
console.log(`阻塞：${failures.length}`);
console.log(`状态报告：${resolve(reportPath)}`);

if (failures.length) {
  console.error('真实资料本地测试状态检查未通过：');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(warnings.length ? '真实资料本地测试状态检查通过，但存在警告。' : '真实资料本地测试状态检查通过。');
