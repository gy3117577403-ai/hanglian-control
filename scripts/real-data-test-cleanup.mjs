import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { safeDocumentRef, safeFileRef } from './real-data-privacy.mjs';

const root = process.cwd();
const apply = process.argv.includes('--apply');
const allLocal = process.argv.includes('--all-local');
const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
const backupRoot = join(root, 'local-backups', `real-data-test-cleanup-${timestamp}`);

const storageRoot = join(root, 'apps/api/storage');
const uploadsDir = join(storageRoot, 'uploads');
const metadataDir = join(storageRoot, 'metadata');
const documentsJson = join(metadataDir, 'documents.json');
const auditLogsJson = join(metadataDir, 'audit-logs.json');
const reportPath = join(root, 'docs/generated/real-data-test-cleanup-report.md');

const failures = [];
const cleaned = [];
const backedUp = [];
const skipped = [];
const testMarkers = [
  'HL_REAL_DATA_TEST',
  'HUB-SANDBOX-',
  'UPLOAD-SANDBOX-',
  'document-hub,upload-check',
  'upload-sandbox-check',
];

function toPosix(value) {
  return value.split('\\').join('/');
}

function rel(value) {
  return toPosix(relative(root, value));
}

function isInside(parent, child) {
  const parentResolved = resolve(parent);
  const childResolved = resolve(child);
  const relativePath = relative(parentResolved, childResolved);
  return relativePath === '' || (!relativePath.startsWith('..') && !resolve(relativePath).startsWith('..'));
}

function assertInsideStorage(target) {
  const resolved = resolve(target);
  if (!isInside(storageRoot, resolved)) {
    throw new Error(`Refuse to clean outside local storage: ${rel(resolved)}`);
  }
}

function assertSafeUploadFile(file) {
  assertInsideStorage(file);
  if (!isInside(uploadsDir, file)) throw new Error(`Refuse to clean non-upload file: ${safeFileRef(file)}`);
  if (basename(file) === '.gitkeep') throw new Error('Refuse to remove uploads/.gitkeep');
}

function readJsonArray(file) {
  if (!existsSync(file)) return [];
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    failures.push(`${rel(file)} is not valid JSON; cleanup stopped.`);
    return [];
  }
}

function writeJsonArray(file, value) {
  assertInsideStorage(file);
  writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}

function backupFile(file) {
  if (!existsSync(file)) return;
  const target = join(backupRoot, rel(file));
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(file, target);
  backedUp.push(rel(file));
}

function backupDirectoryChild(file) {
  if (!existsSync(file)) return;
  const target = join(backupRoot, rel(file));
  mkdirSync(dirname(target), { recursive: true });
  cpSync(file, target, { recursive: true, force: true });
  backedUp.push(safeFileRef(file));
}

function listUploadFiles() {
  if (!existsSync(uploadsDir)) return [];
  return readdirSync(uploadsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name !== '.gitkeep')
    .map((entry) => join(uploadsDir, entry.name));
}

function documentId(document) {
  return document?.documentId || document?.id;
}

function auditReferencesDocument(log, documentIds) {
  const entityId = String(log?.entityId ?? '');
  const message = String(log?.message ?? '');
  const after = JSON.stringify(log?.after ?? '');
  const before = JSON.stringify(log?.before ?? '');
  return documentIds.has(entityId)
    || [...documentIds].some((id) => id && (message.includes(id) || after.includes(id) || before.includes(id)));
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

function isTestDocument(document) {
  if (document?.source !== 'manual_upload') return false;
  const text = searchableDocumentText(document);
  return testMarkers.some((marker) => text.includes(marker));
}

function isTestUploadFile(file) {
  const name = basename(file);
  return testMarkers.some((marker) => name.includes(marker));
}

function buildPlan() {
  const documents = readJsonArray(documentsJson);
  const auditLogs = readJsonArray(auditLogsJson);
  const uploadFiles = listUploadFiles();
  const storedFileNames = new Set(documents.map((document) => document?.storedFileName).filter(Boolean));
  const documentsToRemove = allLocal ? documents.filter((document) => document?.source === 'manual_upload') : documents.filter(isTestDocument);
  const documentIds = new Set(documentsToRemove.map(documentId).filter(Boolean));
  const storedFileNamesToRemove = new Set(documentsToRemove.map((document) => document?.storedFileName).filter(Boolean));
  const unreferencedUploads = uploadFiles.filter((file) => !storedFileNames.has(basename(file)));
  const referencedUploads = uploadFiles.filter((file) => storedFileNames.has(basename(file)));
  const uploadFilesToRemove = allLocal
    ? uploadFiles
    : uploadFiles.filter((file) => storedFileNamesToRemove.has(basename(file)) || isTestUploadFile(file));
  const auditLogsToRemove = auditLogs.filter((log) => auditReferencesDocument(log, documentIds));

  return {
    documents,
    documentsToRemove,
    documentsToKeep: documents.filter((document) => !documentIds.has(documentId(document))),
    auditLogs,
    uploadFiles,
    uploadFilesToRemove,
    referencedUploads,
    unreferencedUploads,
    auditLogsToRemove,
    documentIds,
  };
}

function applyCleanup(plan) {
  mkdirSync(backupRoot, { recursive: true });

  if (existsSync(documentsJson)) backupFile(documentsJson);
  if (existsSync(auditLogsJson)) backupFile(auditLogsJson);

  for (const file of plan.uploadFilesToRemove) {
    assertSafeUploadFile(file);
    backupDirectoryChild(file);
    rmSync(file, { force: true });
    cleaned.push(safeFileRef(file));
  }

  if (existsSync(documentsJson)) {
    writeJsonArray(documentsJson, plan.documentsToKeep);
    cleaned.push(rel(documentsJson));
  } else {
    skipped.push(rel(documentsJson));
  }

  if (existsSync(auditLogsJson)) {
    const nextAuditLogs = plan.auditLogs.filter((log) => !auditReferencesDocument(log, plan.documentIds));
    writeJsonArray(auditLogsJson, nextAuditLogs);
    cleaned.push(rel(auditLogsJson));
  } else {
    skipped.push(rel(auditLogsJson));
  }
}

function writeReport(plan) {
  mkdirSync(dirname(reportPath), { recursive: true });
  const lines = [
    '# 真实资料本地测试清理报告',
    '',
    `生成时间：${new Date().toISOString()}`,
    `模式：${apply ? 'apply' : 'dry-run'}`,
    `清理范围：${allLocal ? '全部本机上传资料（--all-local）' : '仅带测试标记的本机上传资料'}`,
    `备份目录：${apply ? rel(backupRoot) : 'dry-run 未创建备份'}`,
    '',
    '数据库连接或写库操作：否',
    'Sealos 接入：否',
    '企业微信微盘接入：否',
    '真实语音接入：否',
    '',
    '隐私规则：本报告不写入真实客户名称、产品型号、资料标题、上传文件名或完整路径，只保留短指纹用于本机排查。',
    '',
    '## 当前本地测试数据',
    '',
    `- 本机上传资料记录总数：${plan.documents.filter((document) => document?.source === 'manual_upload').length}`,
    `- 将清理资料记录：${plan.documentsToRemove.length}`,
    `- 上传文件总数：${plan.uploadFiles.length}`,
    `- 将清理上传文件：${plan.uploadFilesToRemove.length}`,
    `- 与资料记录关联的上传文件：${plan.referencedUploads.length}`,
    `- 未被资料记录引用的上传文件：${plan.unreferencedUploads.length}`,
    `- 将清理的资料审计记录：${plan.auditLogsToRemove.length}`,
    '',
    '## 将清理的资料记录（隐私安全指纹）',
    '',
    ...(plan.documentsToRemove.length
      ? plan.documentsToRemove.map((document) => `- ${safeDocumentRef(document)}`)
      : ['- 无']),
    '',
    '## 将清理的上传文件（隐私安全指纹）',
    '',
    ...(plan.uploadFilesToRemove.length ? plan.uploadFilesToRemove.map((file) => `- ${safeFileRef(file)}`) : ['- 无']),
    '',
    '## 执行结果',
    '',
    `- 已备份：${backedUp.length}`,
    `- 已清理：${cleaned.length}`,
    `- 跳过：${skipped.length}`,
    '',
  ];

  if (failures.length) {
    lines.push('## 风险/失败', '');
    failures.forEach((failure) => lines.push(`- ${failure}`));
    lines.push('');
  }

  lines.push('## 结论', '');
  if (failures.length) {
    lines.push('未通过，请先处理风险项。');
  } else if (apply) {
    lines.push('已完成真实资料本地测试数据清理。请再次执行安全检查并确认不要提交本地 metadata / uploads。');
  } else {
    lines.push(allLocal
      ? 'dry-run 完成。当前为 --all-local 清理范围，确认无误后可执行 `npm run real-data:cleanup:all-local`。'
      : 'dry-run 完成。默认只清理带 HL_REAL_DATA_TEST 或自动化 sandbox 标记的资料，确认无误后可执行 `npm run real-data:cleanup`。');
  }
  lines.push('');

  writeFileSync(reportPath, lines.join('\n'), 'utf8');
}

console.log('真实资料本地测试清理');
console.log(`模式：${apply ? 'apply' : 'dry-run'}`);
console.log(`清理范围：${allLocal ? '全部本机上传资料（--all-local）' : '仅带测试标记的本机上传资料'}`);
console.log('本脚本不连接数据库，不执行数据库写入，只处理本机 storage/uploads 与 documents/audit metadata。');
console.log('本脚本不会把真实客户名、产品型号、资料标题或上传文件名写入报告。');

try {
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  if (!existsSync(metadataDir)) mkdirSync(metadataDir, { recursive: true });
  const plan = buildPlan();

  console.log(`本机上传资料记录总数：${plan.documents.filter((document) => document?.source === 'manual_upload').length}`);
  console.log(`将清理资料记录：${plan.documentsToRemove.length}`);
  console.log(`上传文件总数：${plan.uploadFiles.length}`);
  console.log(`将清理上传文件：${plan.uploadFilesToRemove.length}`);
  console.log(`将清理的资料审计记录：${plan.auditLogsToRemove.length}`);

  if (apply && failures.length === 0) applyCleanup(plan);
  writeReport(plan);
  console.log(`清理报告：${resolve(reportPath)}`);
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
  const plan = buildPlan();
  writeReport(plan);
}

if (failures.length) {
  console.error('真实资料本地测试清理未通过：');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(apply ? '真实资料本地测试数据已清理。' : 'dry-run 完成，未删除任何文件。');
