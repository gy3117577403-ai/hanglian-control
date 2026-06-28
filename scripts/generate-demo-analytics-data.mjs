import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const metadataDir = join(root, 'apps', 'api', 'storage', 'metadata');
const snapshotFile = join(metadataDir, 'demo-analytics-snapshot.json');

function readJson(relativePath, fallback) {
  try {
    return JSON.parse(readFileSync(join(root, relativePath), 'utf8'));
  } catch {
    return fallback;
  }
}

function dateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const existingMetadata = [
  'apps/api/storage/metadata/execution-records.json',
  'apps/api/storage/metadata/plan-status-events.json',
  'apps/api/storage/metadata/quantity-reports.json',
  'apps/api/storage/metadata/documents.json',
  'apps/api/storage/metadata/knowledge-records.json',
].filter((file) => existsSync(join(root, file)));

const quantityReports = readJson('apps/api/storage/metadata/quantity-reports.json', []);
const statusEvents = readJson('apps/api/storage/metadata/plan-status-events.json', []);
const documents = readJson('apps/api/storage/metadata/documents.json', []);
const knowledgeRecords = readJson('apps/api/storage/metadata/knowledge-records.json', []);

const trends = [-6, -5, -4, -3, -2, -1, 0].map((offset, index) => {
  const completed = quantityReports
    .filter((item) => String(item.createdAt ?? '').slice(0, 10) === dateOffset(offset))
    .reduce((total, item) => total + Number(item.completedQuantity ?? 0), 0);
  const defects = quantityReports
    .filter((item) => String(item.createdAt ?? '').slice(0, 10) === dateOffset(offset))
    .reduce((total, item) => total + Number(item.defectQuantity ?? 0), 0);
  return {
    date: dateOffset(offset),
    completionRate: Math.min(96, 55 + index * 6 + Math.floor(completed / 100)),
    defectRate: Math.max(0.25, Number(((defects / Math.max(completed, 1)) * 100 || 1.5 - index * 0.12).toFixed(2))),
    exceptionCount: statusEvents.filter((item) => String(item.createdAt ?? '').slice(0, 10) === dateOffset(offset) && item.toStatus === 'exception_hold').length || (index % 3),
    pendingReviewDocuments: documents.filter((item) => item.documentStatus === 'pending_review').length || Math.max(1, 8 - index),
    missingFiles: documents.filter((item) => item.documentStatus === 'missing').length || Math.max(0, 4 - Math.floor(index / 2)),
    pendingKnowledge: knowledgeRecords.filter((item) => String(item.createdAt ?? '').slice(0, 10) === dateOffset(offset)).length || Math.max(1, 7 - index),
  };
});

const snapshot = {
  generatedAt: new Date().toISOString(),
  source: 'demo-analytics-snapshot',
  trends,
  notes: [
    'V2.6 demo analytics snapshot.',
    'This file is generated from local mock/metadata only.',
    'No database connection, migration, db push, seed, Sealos, WeCom disk, or real voice integration is used.',
    existingMetadata.length
      ? `Detected existing local metadata and kept it untouched: ${existingMetadata.join(', ')}`
      : 'No existing local metadata was required.',
  ],
};

mkdirSync(metadataDir, { recursive: true });
writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2), 'utf8');

console.log('Demo analytics snapshot generated.');
console.log(`Output: ${snapshotFile}`);
if (existingMetadata.length) {
  console.log('Existing local metadata detected and not overwritten:');
  for (const file of existingMetadata) console.log(`- ${file}`);
}
console.log('This script does not connect to a database and does not write execution/documents/knowledge metadata.');
