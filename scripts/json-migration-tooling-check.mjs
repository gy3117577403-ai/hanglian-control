#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = mkdtempSync(join(tmpdir(), 'hanglian-json-migration-'));
const metadataRoot = join(root, 'metadata');
const uploadsRoot = join(root, 'uploads');
const outputRoot = join(root, 'snapshot');
mkdirSync(metadataRoot, { recursive: true });
mkdirSync(join(uploadsRoot, 'documents'), { recursive: true });

function writeJson(name, value) {
  writeFileSync(join(metadataRoot, name), `${JSON.stringify(value, null, 2)}\n`);
}

function sha(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function run(args, env = {}) {
  return spawnSync('node', args, {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

try {
  const fileBuffer = Buffer.from('fake pdf payload');
  const checksum = createHash('sha256').update(fileBuffer).digest('hex');
  writeFileSync(join(uploadsRoot, 'documents', 'demo.pdf'), fileBuffer);
  writeJson('drawing-customers.json', [{ customerId: 'cust-a', customerName: '客户A', status: 'active' }]);
  writeJson('drawing-products.json', [{ productId: 'prod-a', customerId: 'cust-a', productModel: 'HL-A', normalizedProductModel: 'HL-A', drawingStatus: 'available' }]);
  writeJson('drawing-module-settings.json', {
    schemaVersion: 1,
    updatedAt: new Date(0).toISOString(),
    trash: [],
    details: [{
      customer: { customerId: 'cust-a', customerName: '客户A' },
      product: { productId: 'prod-a', customerId: 'cust-a', productModel: 'HL-A', normalizedProductModel: 'HL-A' },
      modules: [{
        moduleKey: 'original_drawing',
        moduleName: '原图',
        status: 'uploaded',
        items: [{
          itemId: 'doc-a',
          documentId: 'doc-a',
          title: 'HL-A 原图',
          fileType: 'pdf',
          source: 'manual_upload',
          storageKey: 'documents/demo.pdf',
          fileSize: fileBuffer.length,
          checksumSha256: checksum,
          documentStatus: 'effective',
        }],
      }],
    }],
  });
  writeJson('drawing-import-records.json', [{ importBatchId: 'pdf-batch-a', customerId: 'cust-a', status: 'previewed', totalFiles: 1, parsedFiles: 1, skippedFiles: 0, importedFiles: 0, items: [] }]);
  writeJson('production-orders.json', [{ orderId: 'order-a', scope: 'week', productModel: 'HL-A', normalizedProductModel: 'HL-A', linkedProductId: 'prod-a', productResolutionStatus: 'found', quantityProvided: true, quantity: 1, productionStatus: 'front', completionStatus: 'pending', source: 'manual_create', createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() }]);
  writeJson('order-import-records.json', []);
  writeJson('documents.json', []);
  writeJson('audit-logs.json', [{ auditLogId: 'audit-a', entityId: 'prod-a', action: 'product_created', createdAt: new Date(0).toISOString() }]);
  writeJson('delete-lock-settings.json', { enabled: true, passwordHash: '$2b$hash', failedAttempts: 0, lockedUntil: null });

  const sourceHash = sha(join(metadataRoot, 'drawing-customers.json'));
  let result = run(['scripts/json-migration-plan.mjs', '--metadata-root', metadataRoot, '--uploads-root', uploadsRoot]);
  if (result.status !== 0) throw new Error(`plan failed: ${result.stderr}`);
  const plan = JSON.parse(result.stdout);
  if (plan.counts.customers !== 1 || plan.executionOrder[0] !== 'Customers') throw new Error('plan counts/order invalid');

  result = run(['scripts/json-migration-dry-run.mjs', '--metadata-root', metadataRoot, '--uploads-root', uploadsRoot, '--output', outputRoot]);
  if (result.status !== 0) throw new Error(`dry-run failed: ${result.stderr}`);
  if (!readFileSync(join(outputRoot, 'manifest.json'), 'utf8').includes('sourceFileHashes')) throw new Error('snapshot manifest missing hashes');
  if (sourceHash !== sha(join(metadataRoot, 'drawing-customers.json'))) throw new Error('source JSON was modified');

  writeJson('drawing-products.json', [
    { productId: 'prod-a', customerId: 'missing-customer', productModel: 'HL-A', normalizedProductModel: 'HL-A' },
    { productId: 'prod-a', customerId: 'missing-customer', productModel: 'HL-A', normalizedProductModel: 'HL-A' },
  ]);
  result = run(['scripts/json-migration-dry-run.mjs', '--metadata-root', metadataRoot, '--uploads-root', uploadsRoot]);
  if (result.status !== 3) throw new Error('invalid fixture should block migration');
  const blocked = JSON.parse(result.stdout);
  if (!blocked.blockers.length) throw new Error('blockers missing');

  result = run(['scripts/json-migration-plan.mjs']);
  if (result.status === 0) throw new Error('plan accepted missing required args');

  result = run(['scripts/postgres-parity-check.mjs', '--metadata-root', metadataRoot, '--uploads-root', uploadsRoot, '--database-url-env', 'FAKE_DATABASE_URL'], {
    DB_TARGET: 'staging',
    ALLOW_TEST_DB_CONNECT: 'true',
    FAKE_DATABASE_URL: 'postgresql://redacted',
  });
  if (result.status !== 0) throw new Error(`parity mock check failed: ${result.stderr}`);

  console.log('JSON migration tooling check passed.');
} finally {
  rmSync(root, { recursive: true, force: true });
}
