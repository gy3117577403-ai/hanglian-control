import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { safeDocumentRef, safeFileRef, safeGroupRef, safeProductRef } from './real-data-privacy.mjs';

const root = process.cwd();
const requireDocuments = process.argv.includes('--require-documents');
const uploadsDir = join(root, 'apps/api/storage/uploads');
const metadataDir = join(root, 'apps/api/storage/metadata');
const documentsJson = join(metadataDir, 'documents.json');
const auditLogsJson = join(metadataDir, 'audit-logs.json');
const reportPath = join(root, 'docs/generated/real-data-post-upload-check-report.md');
const allowedPreviewExts = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);
const maxFileSize = 30 * 1024 * 1024;
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

function documentId(document) {
  return document?.documentId || document?.id || '';
}

function versionKey(document) {
  return [
    document?.productId ?? '',
    document?.documentType ?? '',
    document?.requiredForProcess ?? '',
    document?.version ?? '',
  ].join('::');
}

function inspectDocuments(documents, uploadFiles) {
  const uploadNames = new Set(uploadFiles.map((file) => basename(file)));
  const referencedNames = new Set();
  const duplicateGroups = new Map();
  const documentItems = [];

  for (const document of documents) {
    const id = documentId(document);
    const docRef = safeDocumentRef(document);
    const storedFileName = document?.storedFileName;
    const hasFile = Boolean(storedFileName);
    const fileRef = hasFile ? safeFileRef(storedFileName) : 'file-missing';
    const filePath = storedFileName ? join(uploadsDir, storedFileName) : '';
    const ext = storedFileName ? extname(storedFileName).toLowerCase() : '';
    const exists = hasFile && existsSync(filePath);
    const size = exists ? statSync(filePath).size : 0;
    const key = versionKey(document);
    duplicateGroups.set(key, [...(duplicateGroups.get(key) ?? []), docRef]);

    if (storedFileName) referencedNames.add(storedFileName);
    if (!id) failures.push(`资料记录缺少 documentId/id：${docRef}`);
    if (!document?.productId) failures.push(`资料记录缺少 productId：${docRef}`);
    if (!document?.documentType) failures.push(`资料记录缺少 documentType：${docRef}`);
    if (!document?.title) warnings.push(`资料记录缺少 title：${docRef}`);
    if (!document?.version) warnings.push(`资料记录缺少 version：${docRef}`);
    if (!storedFileName) failures.push(`资料记录缺少 storedFileName：${docRef}`);
    if (storedFileName && !exists) failures.push(`资料文件不存在：${docRef} / ${fileRef}`);
    if (storedFileName && !allowedPreviewExts.has(ext)) failures.push(`资料文件格式不支持在线预览：${fileRef}`);
    if (size > maxFileSize) warnings.push(`资料文件超过 30MB，平板预览可能较慢：${fileRef}`);
    if (!document?.previewUrl) failures.push(`资料记录缺少 previewUrl：${docRef}`);
    if (!document?.downloadUrl) warnings.push(`资料记录缺少 downloadUrl：${docRef}`);
    if (document?.source && document.source !== 'manual_upload') {
      warnings.push(`真实资料测试记录 source 不是 manual_upload：${docRef} / ${document.source}`);
    }

    documentItems.push({
      ref: docRef,
      productRef: safeProductRef(document?.productId ?? ''),
      documentType: document?.documentType ?? '',
      requiredForProcess: document?.requiredForProcess ?? '',
      versionRef: document?.version ? safeGroupRef(document.version) : '',
      fileRef,
      exists,
      size,
    });
  }

  const orphanUploads = uploadFiles.filter((file) => !referencedNames.has(basename(file)));
  orphanUploads.forEach((file) => failures.push(`存在未被 documents.json 引用的上传文件：${safeFileRef(file)}`));

  for (const [key, refs] of duplicateGroups) {
    if (refs.length > 1) warnings.push(`存在同产品/类型/工序/版本的重复资料：${safeGroupRef(key)} -> ${refs.join(', ')}`);
  }

  for (const name of referencedNames) {
    if (!uploadNames.has(name)) failures.push(`documents.json 引用了不存在的上传文件：${safeFileRef(name)}`);
  }

  return { documentItems, orphanUploads };
}

function inspectAuditLogs(auditLogs, documents) {
  const documentIds = new Set(documents.map(documentId).filter(Boolean));
  const related = auditLogs.filter((log) => documentIds.has(String(log?.entityId ?? '')));
  const uploaded = related.filter((log) => log?.action === 'document_uploaded');
  if (documents.length && uploaded.length === 0) {
    warnings.push('存在资料记录，但没有对应 document_uploaded 审计记录。');
  }
  return { related, uploaded };
}

function inspectGitIgnore() {
  const ignoredPathChecks = [
    ['apps/api/storage/uploads/*', 'apps/api/storage/uploads/__real-data-postcheck__.pdf'],
    ['apps/api/storage/metadata/documents.json', 'apps/api/storage/metadata/documents.json'],
    ['apps/api/storage/metadata/audit-logs.json', 'apps/api/storage/metadata/audit-logs.json'],
  ];
  for (const [label, path] of ignoredPathChecks) {
    if (!isGitIgnored(path)) failures.push(`${label} 未被 .gitignore 忽略。`);
  }

  for (const path of ['apps/api/storage/metadata/documents.json', 'apps/api/storage/metadata/audit-logs.json']) {
    if (existsSync(join(root, path)) && isGitTracked(path)) failures.push(`${path} 已被 Git 跟踪。`);
  }

  for (const file of listUploadFiles()) {
    const relativeFile = rel(file);
    if (isGitTracked(relativeFile)) failures.push(`上传文件已被 Git 跟踪：${safeFileRef(file)}`);
  }
}

function writeReport(summary) {
  mkdirSync(dirname(reportPath), { recursive: true });
  const lines = [
    '# 真实资料上传后只读检查报告',
    '',
    `生成时间：${new Date().toISOString()}`,
    `严格要求存在资料：${requireDocuments ? '是' : '否'}`,
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
    `- 资料记录：${summary.documents.length}`,
    `- 上传文件：${summary.uploadFiles.length}`,
    `- 孤儿上传文件：${summary.orphanUploads.length}`,
    `- 资料相关审计记录：${summary.audit.related.length}`,
    `- document_uploaded 审计记录：${summary.audit.uploaded.length}`,
    `- 警告：${warnings.length}`,
    `- 阻塞：${failures.length}`,
    '',
    '## 资料清单（隐私安全指纹）',
    '',
    '| 资料指纹 | 产品指纹 | 类型 | 工序 | 版本指纹 | 文件指纹 | 状态 |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...(summary.documentItems.length
      ? summary.documentItems.map((item) => `| ${item.ref} | ${item.productRef} | ${item.documentType} | ${item.requiredForProcess} | ${item.versionRef} | ${item.fileRef} | ${item.exists ? '文件存在' : '文件缺失'} |`)
      : ['| 无 |  |  |  |  |  |  |']),
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
    lines.push('未通过，请修复阻塞项后再用于现场或后续真实数据逻辑开发。');
  } else if (!requireDocuments && summary.documents.length === 0) {
    lines.push('通过。当前尚未上传真实资料，处于待上传检查状态；上传真实资料后请重新执行 `npm run real-data:postcheck`。');
  } else if (warnings.length) {
    lines.push('通过，但存在警告。可继续测试，但建议先处理警告项。');
  } else {
    lines.push('通过，真实资料本地上传结果健康。测试结束后请执行 `npm run real-data:cleanup:dry`，默认只清理带 `HL_REAL_DATA_TEST` 或自动化 sandbox 标记的资料。');
  }
  lines.push('');

  writeFileSync(reportPath, lines.join('\n'), 'utf8');
}

console.log('真实资料上传后只读检查');
console.log('本脚本不连接数据库，不执行数据库写入，不删除任何文件。');
console.log('本脚本不会把真实客户名、产品型号、资料标题或上传文件名写入报告。');

const documents = readJsonArray(documentsJson, 'documents.json');
const auditLogs = readJsonArray(auditLogsJson, 'audit-logs.json');
const uploadFiles = listUploadFiles();
if (requireDocuments && documents.length === 0) failures.push('当前没有资料记录；严格模式要求至少上传 1 条真实资料后再检查。');
if (!requireDocuments && documents.length === 0) warnings.push('当前没有资料记录；上传真实资料后请重新执行该检查。');

inspectGitIgnore();
const inspected = inspectDocuments(documents, uploadFiles);
const audit = inspectAuditLogs(auditLogs, documents);

const summary = {
  documents,
  auditLogs,
  uploadFiles,
  audit,
  ...inspected,
};

writeReport(summary);

console.log(`资料记录：${documents.length}`);
console.log(`上传文件：${uploadFiles.length}`);
console.log(`警告：${warnings.length}`);
console.log(`阻塞：${failures.length}`);
console.log(`检查报告：${resolve(reportPath)}`);

if (failures.length) {
  console.error('真实资料上传后检查未通过：');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(warnings.length ? '真实资料上传后检查通过，但存在警告。' : '真实资料上传后检查通过。');
