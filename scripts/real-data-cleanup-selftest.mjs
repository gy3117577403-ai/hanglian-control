import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const storageRoot = join(root, 'apps/api/storage');
const uploadsDir = join(storageRoot, 'uploads');
const metadataDir = join(storageRoot, 'metadata');
const documentsJson = join(metadataDir, 'documents.json');
const auditLogsJson = join(metadataDir, 'audit-logs.json');
const reportPath = join(root, 'docs/generated/real-data-cleanup-selftest-report.md');

const timestamp = Date.now();
const markedId = `cleanup-selftest-marked-${timestamp}`;
const keepId = `cleanup-selftest-keep-${timestamp}`;
const markedFileName = `${markedId}-HL_REAL_DATA_TEST.pdf`;
const keepFileName = `${keepId}.pdf`;
const markedFile = join(uploadsDir, markedFileName);
const keepFile = join(uploadsDir, keepFileName);
const failures = [];
const results = [];

function rel(file) {
  return relative(root, file).split('\\').join('/');
}

function snapshotFile(file) {
  return {
    file,
    exists: existsSync(file),
    raw: existsSync(file) ? readFileSync(file, 'utf8') : '',
  };
}

function parseJsonArray(snapshot, label) {
  if (!snapshot.exists || snapshot.raw.trim() === '') return [];
  const parsed = JSON.parse(snapshot.raw);
  if (!Array.isArray(parsed)) throw new Error(`${label} must be a JSON array for cleanup selftest.`);
  return parsed;
}

function restoreFile(snapshot) {
  if (snapshot.exists) {
    mkdirSync(dirname(snapshot.file), { recursive: true });
    writeFileSync(snapshot.file, snapshot.raw, 'utf8');
    return;
  }
  rmSync(snapshot.file, { force: true });
}

function readJsonArray(file) {
  if (!existsSync(file)) return [];
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  return Array.isArray(parsed) ? parsed : [];
}

function writeReport() {
  mkdirSync(dirname(reportPath), { recursive: true });
  const lines = [
    '# Real Data Cleanup Selftest Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'Database connection or write: no',
    'Sealos connection: no',
    'WeCom disk connection: no',
    'Real voice service connection: no',
    '',
    '## Results',
    '',
    ...results.map((item) => `- ${item}`),
    '',
    '## Conclusion',
    '',
    failures.length
      ? `Failed with ${failures.length} issue(s).`
      : 'Passed. Default cleanup removes tagged test uploads and keeps unmarked local uploads.',
    '',
  ];

  if (failures.length) {
    lines.push('## Failures');
    lines.push('');
    failures.forEach((failure) => lines.push(`- ${failure}`));
    lines.push('');
  }

  writeFileSync(reportPath, lines.join('\n'), 'utf8');
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

console.log('Real data cleanup selftest');
console.log('This script does not connect to a database and does not write to any database.');

const documentsSnapshot = snapshotFile(documentsJson);
const auditSnapshot = snapshotFile(auditLogsJson);

try {
  mkdirSync(uploadsDir, { recursive: true });
  mkdirSync(metadataDir, { recursive: true });

  const originalDocuments = parseJsonArray(documentsSnapshot, rel(documentsJson));
  const originalAuditLogs = parseJsonArray(auditSnapshot, rel(auditLogsJson));

  const markedDocument = {
    documentId: markedId,
    id: markedId,
    title: `HL_REAL_DATA_TEST cleanup selftest marked document`,
    source: 'manual_upload',
    module: 'drawing',
    type: 'drawing',
    version: 'SELFTEST',
    originalFileName: markedFileName,
    storedFileName: markedFileName,
    keywords: ['HL_REAL_DATA_TEST', 'cleanup-selftest'],
    remark: 'Test marker: HL_REAL_DATA_TEST',
    uploadedAt: new Date().toISOString(),
  };

  const keepDocument = {
    documentId: keepId,
    id: keepId,
    title: 'cleanup selftest unmarked document',
    source: 'manual_upload',
    module: 'drawing',
    type: 'drawing',
    version: 'SELFTEST',
    originalFileName: keepFileName,
    storedFileName: keepFileName,
    keywords: ['cleanup-selftest-control'],
    remark: 'Unmarked control document; default cleanup must keep it.',
    uploadedAt: new Date().toISOString(),
  };

  const markedAudit = {
    id: `audit-${markedId}`,
    action: 'selftest-create',
    entityType: 'document',
    entityId: markedId,
    message: `HL_REAL_DATA_TEST cleanup selftest audit ${markedId}`,
    createdAt: new Date().toISOString(),
  };

  const keepAudit = {
    id: `audit-${keepId}`,
    action: 'selftest-create',
    entityType: 'document',
    entityId: keepId,
    message: `cleanup selftest audit ${keepId}`,
    createdAt: new Date().toISOString(),
  };

  writeFileSync(documentsJson, JSON.stringify([...originalDocuments, markedDocument, keepDocument], null, 2), 'utf8');
  writeFileSync(auditLogsJson, JSON.stringify([...originalAuditLogs, markedAudit, keepAudit], null, 2), 'utf8');
  writeFileSync(markedFile, '%PDF-1.4\n% cleanup selftest marked file\n', 'utf8');
  writeFileSync(keepFile, '%PDF-1.4\n% cleanup selftest keep file\n', 'utf8');
  results.push(`Created marked test document ${markedId}.`);
  results.push(`Created unmarked control document ${keepId}.`);

  const command = process.platform === 'win32' ? 'cmd.exe' : 'node';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'node scripts/real-data-test-cleanup.mjs --apply']
    : ['scripts/real-data-test-cleanup.mjs', '--apply'];
  const cleanup = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
    stdio: 'inherit',
    windowsHide: true,
  });

  assert(cleanup.status === 0, `Default cleanup command failed with exit code ${cleanup.status ?? 'unknown'}.`);

  const afterDocuments = readJsonArray(documentsJson);
  const afterAuditLogs = readJsonArray(auditLogsJson);
  assert(!afterDocuments.some((document) => document.documentId === markedId || document.id === markedId), 'Marked document was not removed.');
  assert(afterDocuments.some((document) => document.documentId === keepId || document.id === keepId), 'Unmarked control document was removed.');
  assert(!existsSync(markedFile), 'Marked upload file was not removed.');
  assert(existsSync(keepFile), 'Unmarked control upload file was removed.');
  assert(!afterAuditLogs.some((log) => log.entityId === markedId), 'Marked audit log was not removed.');
  assert(afterAuditLogs.some((log) => log.entityId === keepId), 'Unmarked control audit log was removed.');

  results.push('Default cleanup removed the marked test record and file.');
  results.push('Default cleanup kept the unmarked control record and file.');
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
} finally {
  restoreFile(documentsSnapshot);
  restoreFile(auditSnapshot);
  rmSync(markedFile, { force: true });
  rmSync(keepFile, { force: true });
  results.push('Restored original metadata and removed temporary upload files.');
  writeReport();
}

console.log(`Selftest report: ${resolve(reportPath)}`);

if (failures.length) {
  console.error('Real data cleanup selftest failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Real data cleanup selftest passed.');
