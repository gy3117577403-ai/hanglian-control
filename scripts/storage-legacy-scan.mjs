import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const metadataDir = process.env.METADATA_ROOT
  ? join(root, process.env.METADATA_ROOT)
  : join(root, 'apps/api/storage/metadata');
const uploadsDir = process.env.STORAGE_ROOT
  ? join(root, process.env.STORAGE_ROOT, 'uploads')
  : join(root, 'apps/api/storage/uploads');
const documentsFile = join(metadataDir, 'documents.json');

function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function listFiles(directory) {
  if (!existsSync(directory)) return [];
  const rows = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) rows.push(...listFiles(fullPath));
    if (entry.isFile() && entry.name !== '.gitkeep') rows.push(fullPath);
  }
  return rows;
}

console.log('V3.10 storage legacy scan');
console.log('This scan is read-only. It does not delete, migrate, upload, or connect to remote storage.');

const documents = Array.isArray(readJson(documentsFile, [])) ? readJson(documentsFile, []) : [];
const uploaded = documents.filter((item) => item?.source === 'manual_upload');
const legacyRecords = uploaded.filter((item) => !item.storageProvider || !item.storageKey);
const localRecords = uploaded.filter((item) => (item.storageProvider ?? 'local') === 'local');
const s3Records = uploaded.filter((item) => item.storageProvider === 's3');
const uploadFiles = listFiles(uploadsDir);

const summary = {
  metadataFileExists: existsSync(documentsFile),
  uploadedDocumentRecords: uploaded.length,
  legacyDocumentRecords: legacyRecords.length,
  localDocumentRecords: localRecords.length,
  s3DocumentRecords: s3Records.length,
  localUploadFileCount: uploadFiles.length,
  localUploadSizeBytes: uploadFiles.reduce((total, file) => total + statSync(file).size, 0),
};

console.log(JSON.stringify(summary, null, 2));

if (s3Records.length) {
  console.log('S3 records are present in metadata, but this scan does not contact S3.');
}

console.log('V3.10 storage legacy scan completed.');
