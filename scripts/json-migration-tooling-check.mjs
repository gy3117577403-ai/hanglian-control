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
const manifestFile = join(root, 'dry-run-manifest.json');
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

function moduleState(productId, modules) {
  return {
    schemaVersion: 1,
    updatedAt: new Date(0).toISOString(),
    trash: [],
    details: [{
      customer: { customerId: 'cust-a', customerName: 'Customer A' },
      product: { productId, customerId: 'cust-a', productModel: 'HL-A', normalizedProductModel: 'HL-A' },
      modules,
    }],
  };
}

function drawingModule(moduleKey, items, coverDocumentId = undefined) {
  return {
    moduleKey,
    moduleName: moduleKey,
    status: items.length ? 'uploaded' : 'pending',
    coverDocumentId,
    items,
  };
}

function documentItem(id, patch = {}) {
  return {
    itemId: id,
    documentId: id,
    title: id,
    fileType: 'image',
    source: 'manual_upload',
    documentStatus: 'effective',
    ...patch,
  };
}

function writeSingleProductFixture(modules) {
  writeJson('drawing-products.json', [{ productId: 'prod-a', customerId: 'cust-a', productModel: 'HL-A', normalizedProductModel: 'HL-A', drawingStatus: 'available' }]);
  writeJson('drawing-module-settings.json', moduleState('prod-a', modules));
}

function runDryRunForFixture() {
  const result = run(['scripts/json-migration-dry-run.mjs', '--metadata-root', metadataRoot, '--uploads-root', uploadsRoot]);
  return {
    result,
    output: result.stdout ? JSON.parse(result.stdout) : undefined,
  };
}

function assertNoBlockersOrWarnings(label) {
  const { result, output } = runDryRunForFixture();
  if (result.status !== 0) throw new Error(`${label} should pass: ${result.stderr || result.stdout}`);
  if (output.blockers.length || output.warnings.length) throw new Error(`${label} should not produce blockers or warnings`);
}

function assertBlocked(label, expectedText) {
  const { result, output } = runDryRunForFixture();
  if (result.status !== 3) throw new Error(`${label} should block migration`);
  if (!JSON.stringify(output).includes(expectedText)) throw new Error(`${label} blocker did not include ${expectedText}`);
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

  result = run([
    'scripts/json-migration-dry-run.mjs',
    '--dry-run',
    '--metadata-root',
    metadataRoot,
    '--uploads-root',
    uploadsRoot,
    '--output',
    outputRoot,
    '--manifest',
    manifestFile,
  ]);
  if (result.status !== 0) throw new Error(`dry-run failed: ${result.stderr}`);
  if (!readFileSync(join(outputRoot, 'manifest.json'), 'utf8').includes('sourceFileHashes')) throw new Error('snapshot manifest missing hashes');
  const dryRun = JSON.parse(result.stdout);
  for (const key of [
    'customers',
    'products',
    'productModules',
    'productDocuments',
    'pdfImportBatches',
    'pdfImportItems',
    'productionOrders',
    'orderImportBatches',
    'orderImportItems',
    'auditLogs',
    'deleteLockSettings',
    'duplicateRecords',
    'orphanRelations',
    'missingFiles',
    'checksumConflicts',
    'multipleEffectiveVersions',
    'blockers',
    'warnings',
  ]) {
    if (typeof dryRun.counts[key] !== 'number') throw new Error(`dry-run count missing: ${key}`);
  }
  if (dryRun.databaseAccess !== false || dryRun.wrotePostgres !== false || dryRun.modifiedMetadata !== false || dryRun.modifiedUploads !== false) {
    throw new Error('dry-run safety flags invalid');
  }
  if (!readFileSync(manifestFile, 'utf8').includes('"mode": "dry-run"')) throw new Error('dry-run manifest missing');
  if (sourceHash !== sha(join(metadataRoot, 'drawing-customers.json'))) throw new Error('source JSON was modified');

  writeSingleProductFixture([
    drawingModule('accessory_specs', [
      documentItem('as-shared', { versionGroupKey: 'prod-a::process_card::common' }),
    ], 'as-shared'),
    drawingModule('notes', [
      documentItem('nt-shared', { versionGroupKey: 'prod-a::process_card::common' }),
    ], 'nt-shared'),
    drawingModule('tooling', [
      documentItem('tg-shared', { versionGroupKey: 'prod-a::process_card::common' }),
    ], 'tg-shared'),
  ]);
  assertNoBlockersOrWarnings('different modules sharing a compatible versionGroupKey');

  writeSingleProductFixture([
    drawingModule('accessory_specs', [
      documentItem('as-a', { versionGroupKey: 'prod-a::process_card::common' }),
      documentItem('as-b', { versionGroupKey: 'prod-a::process_card::common' }),
    ], 'as-a'),
  ]);
  assertBlocked('same module duplicate effective version group', 'multiple effective document versions exist');

  writeSingleProductFixture([
    drawingModule('accessory_specs', [
      documentItem('as-module-a', { versionGroupKey: 'prod-a::process_card::common' }),
    ], 'as-module-a'),
    drawingModule('notes', [
      documentItem('nt-module-a', { versionGroupKey: 'prod-a::process_card::common' }),
    ], 'nt-module-a'),
  ]);
  assertNoBlockersOrWarnings('same product different modules with one effective each');

  writeSingleProductFixture([
    drawingModule('accessory_specs', [
      documentItem('as-vg-a', { versionGroupKey: 'prod-a::process_card::common::a' }),
      documentItem('as-vg-b', { versionGroupKey: 'prod-a::process_card::common::b' }),
    ], 'as-vg-a'),
  ]);
  assertNoBlockersOrWarnings('same module different version groups');

  writeSingleProductFixture([
    drawingModule('finished_images', [
      documentItem('fi-a', { versionGroupKey: 'prod-a::finished_images::gallery' }),
      documentItem('fi-b', { versionGroupKey: 'prod-a::finished_images::gallery' }),
      documentItem('fi-c', { versionGroupKey: 'prod-a::finished_images::gallery' }),
    ], 'fi-a'),
  ]);
  assertNoBlockersOrWarnings('finished_images multiple effective documents');

  writeSingleProductFixture([
    drawingModule('finished_images', [
      documentItem('fi-cover-a', { versionGroupKey: 'prod-a::finished_images::gallery' }),
      documentItem('fi-cover-b', { versionGroupKey: 'prod-a::finished_images::gallery' }),
      documentItem('fi-cover-c', { versionGroupKey: 'prod-a::finished_images::gallery' }),
    ], 'fi-cover-b'),
  ]);
  assertNoBlockersOrWarnings('finished_images independent cover document');

  writeSingleProductFixture([
    drawingModule('original_drawing', [
      documentItem('od-a', { fileType: 'pdf', versionGroupKey: 'prod-a::drawing_pdf::common' }),
      documentItem('od-b', { fileType: 'pdf', versionGroupKey: 'prod-a::drawing_pdf::common' }),
    ], 'od-a'),
  ]);
  assertBlocked('original_drawing duplicate effective version group', 'multiple effective document versions exist');

  writeSingleProductFixture([
    drawingModule('sop', [
      documentItem('sop-a', { versionGroupKey: 'prod-a::sop_image::back::line-a' }),
      documentItem('sop-b', { versionGroupKey: 'prod-a::sop_image::back::line-b' }),
    ], 'sop-a'),
  ]);
  assertNoBlockersOrWarnings('sop different version groups');

  writeSingleProductFixture([
    drawingModule('original_drawing', [
      documentItem('od-deleted', { fileType: 'pdf', versionGroupKey: 'prod-a::drawing_pdf::common', deletedAt: new Date(0).toISOString() }),
      documentItem('od-active', { fileType: 'pdf', versionGroupKey: 'prod-a::drawing_pdf::common' }),
    ], 'od-active'),
  ]);
  assertNoBlockersOrWarnings('deleted effective document is excluded');

  writeSingleProductFixture([
    drawingModule('finished_images', [
      documentItem('deleted-cover', { deletedAt: new Date(0).toISOString() }),
      documentItem('fi-active', {}),
    ], 'deleted-cover'),
  ]);
  assertBlocked('deleted cover document', 'coverDocumentId');

  result = run(['scripts/json-migration-dry-run.mjs', '--metadata-root', metadataRoot, '--uploads-root', uploadsRoot, '--output', metadataRoot]);
  if (result.status === 0) throw new Error('dry-run accepted output inside metadata-root');

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

  result = run(['scripts/postgres-parity-check.mjs', '--metadata-root', metadataRoot, '--uploads-root', uploadsRoot, '--database-url-env', 'FAKE_POSTGRES_URL'], {
    DB_TARGET: 'staging',
    ALLOW_TEST_DB_CONNECT: 'true',
    FAKE_POSTGRES_URL: 'postgresql://redacted',
  });
  if (result.status === 0) throw new Error('parity check must not return a mock success without a reachable PostgreSQL test database');

  result = run([
    'scripts/json-to-postgres-import.mjs',
    '--dry-run',
    '--metadata-root',
    metadataRoot,
    '--uploads-root',
    uploadsRoot,
    '--manifest',
    join(root, 'import-dry-run-manifest.json'),
  ]);
  if (result.status !== 3) throw new Error('import dry-run should reuse dry-run blockers and exit 3');

  const dockerfile = readFileSync('Dockerfile.migrate', 'utf8');
  const core = readFileSync('scripts/json-postgres-migration-core.mjs', 'utf8');
  const schemaRoute = readFileSync('scripts/prisma-pg-schema-route.mjs', 'utf8');
  if (!core.includes('assertPrismaSchemaRoute') || !core.includes('createSchemaAwarePrismaPgAdapter')) {
    throw new Error('import core must assert PrismaPg schema routing');
  }
  if (!schemaRoute.includes('{ schema: route.schema }') || !schemaRoute.includes('search_path') || !schemaRoute.includes('current_schema()')) {
    throw new Error('PrismaPg route helper must use schema option, search_path, and current_schema assertion');
  }
  for (const script of [
    'scripts/document-version-rules.mjs',
    'scripts/json-migration-plan.mjs',
    'scripts/json-migration-dry-run.mjs',
    'scripts/prisma-pg-schema-route.mjs',
    'scripts/json-postgres-migration-core.mjs',
    'scripts/json-to-postgres-import.mjs',
    'scripts/postgres-parity-check.mjs',
  ]) {
    if (!dockerfile.includes(script)) throw new Error(`Migration Runner Dockerfile does not copy ${script}`);
  }

  console.log('JSON migration tooling check passed.');
} finally {
  rmSync(root, { recursive: true, force: true });
}
