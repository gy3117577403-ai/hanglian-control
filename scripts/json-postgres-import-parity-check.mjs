#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from 'pg';

const root = process.cwd();
const testDatabaseUrlEnv = 'JSON_POSTGRES_TEST_URL';
const testDatabaseUrl = process.env[testDatabaseUrlEnv];
const integrationSchema = 'hanglian_v318_staging';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(file) {
  return readFileSync(join(root, file), 'utf8');
}

function sha(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function writeJson(base, name, value) {
  writeFileSync(join(base, name), `${JSON.stringify(value, null, 2)}\n`);
}

function run(command, args, env = {}) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function assertNoSourceMutation(before, files) {
  for (const file of files) {
    const after = sha(file);
    if (before.get(file) !== after) throw new Error(`source file was modified: ${file}`);
  }
}

function staticCheck() {
  const importCli = read('scripts/json-to-postgres-import.mjs');
  const parityCli = read('scripts/postgres-parity-check.mjs');
  const core = read('scripts/json-postgres-migration-core.mjs');
  const dockerfile = read('Dockerfile.migrate');
  const workflow = read('.github/workflows/build-images-manual.yml');
  assert(importCli.includes('executeImport') && importCli.includes('--dry-run-manifest'), 'import CLI must implement --execute with dry-run manifest verification');
  assert(core.includes('$transaction') && core.includes('upsert') && core.includes('batchSize'), 'import core must use Prisma transaction upserts with batch-size support');
  assert(core.includes('resumeFrom') && core.includes('progress') && core.includes('sourceFileHashes'), 'import core must support resume/progress manifest and source hash verification');
  assert(core.includes('finished_images') && core.includes('ProductModuleCovers') && core.includes('checksumSha256'), 'import core must preserve finished_images, covers, and checksums');
  assert(parityCli.includes('runParityCheck') && core.includes('readonly-parity') && core.includes('wroteDatabase: false'), 'parity CLI must run true read-only parity checks');
  assert(dockerfile.includes('scripts/json-postgres-migration-core.mjs'), 'Migration Runner image must copy import/parity core');
  assert(dockerfile.includes('apps/api/dist') && dockerfile.includes('apps/api/generated'), 'Migration Runner image must include compiled Prisma client artifacts');
  assert(workflow.includes('json-postgres-import-parity:check'), 'image workflow must run JSON PostgreSQL import/parity check');
}

function safeLocalTestDatabaseUrl(urlText) {
  const url = new URL(urlText);
  assert(['localhost', '127.0.0.1', '::1'].includes(url.hostname), 'temporary test database must be local, not Sealos');
  assert(!/sealos|sealoshzh|aliyun|amazonaws|rds/i.test(urlText), 'temporary test database URL must not point to cloud infrastructure');
}

async function resetTemporaryDatabase() {
  safeLocalTestDatabaseUrl(testDatabaseUrl);
  const url = new URL(testDatabaseUrl);
  assert(url.searchParams.get('schema') === integrationSchema, `temporary test DATABASE_URL must target schema=${integrationSchema}`);
  if (process.env.ALLOW_DESTRUCTIVE_TEST_DB_RESET !== 'true') {
    throw new Error('ALLOW_DESTRUCTIVE_TEST_DB_RESET=true is required for the local temporary database surrogate.');
  }
  const client = new Client({ connectionString: testDatabaseUrl });
  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query(`DROP SCHEMA IF EXISTS ${integrationSchema} CASCADE`);
    await client.query(`CREATE SCHEMA ${integrationSchema}`);
    await client.query(`SET search_path TO ${integrationSchema}`);
    const migrations = [
      'apps/api/prisma/migrations/20260617000100_initial_schema/migration.sql',
      'apps/api/prisma/migrations/20260623010000_v318_persistence_upgrade/migration.sql',
    ];
    for (const migration of migrations) {
      await client.query(read(migration));
    }
    const publicCustomer = await client.query('SELECT to_regclass($1) AS table_name', ['public."Customer"']);
    assert(publicCustomer.rows[0]?.table_name === null, 'public.Customer must not exist in non-public schema integration test');
    const targetCustomer = await client.query('SELECT to_regclass($1) AS table_name', [`${integrationSchema}."Customer"`]);
    assert(targetCustomer.rows[0]?.table_name !== null, 'target schema Customer table must exist');
  } finally {
    await client.end();
  }
}

async function assertTargetSchemaRows() {
  const client = new Client({ connectionString: testDatabaseUrl });
  await client.connect();
  try {
    const publicCustomer = await client.query('SELECT to_regclass($1) AS table_name', ['public."Customer"']);
    assert(publicCustomer.rows[0]?.table_name === null, 'public.Customer must remain absent after import');
    const targetCount = await client.query(`SELECT count(*)::int AS count FROM ${integrationSchema}."Customer"`);
    assert(targetCount.rows[0]?.count === 1, 'target schema Customer row must be inserted');
  } finally {
    await client.end();
  }
}

async function assertApiRepositoryUsesTargetSchema() {
  process.env.DATA_SOURCE = 'postgres';
  process.env.DB_TARGET = 'staging';
  process.env.ALLOW_TEST_DB_CONNECT = 'true';
  process.env.ALLOW_PRISMA_WRITE = 'false';
  process.env.RUN_PRISMA_MIGRATE_DEPLOY = 'false';
  process.env.DATABASE_URL = testDatabaseUrl;
  const { PrismaService } = await import('../apps/api/dist/src/database/prisma.service.js');
  const { PrismaDeleteLockRepository } = await import('../apps/api/dist/src/persistence/prisma/prisma-delete-lock.repository.js');
  const databaseConfig = {
    isMockMode: () => false,
    assertCanStartPostgres: () => undefined,
    assertWriteAllowed: () => undefined,
    getStatus: () => ({
      dataSource: 'postgres',
      dbTarget: 'staging',
      canWriteDatabase: false,
      safeSummary: { provider: 'postgresql', hostConfigured: true },
    }),
  };
  const prismaService = new PrismaService(databaseConfig);
  await prismaService.onModuleInit();
  try {
    const repository = new PrismaDeleteLockRepository(prismaService, databaseConfig);
    const setting = await repository.readSettings();
    assert(setting.enabled === true, 'API Prisma repository must read DeleteLockSetting from target schema');
  } finally {
    await prismaService.onModuleDestroy();
  }
}

function writeFixture(metadataRoot, uploadsRoot) {
  const now = new Date(0).toISOString();
  const fileBuffer = Buffer.from('fake postgres import fixture file');
  const checksum = createHash('sha256').update(fileBuffer).digest('hex');
  mkdirSync(join(uploadsRoot, 'documents'), { recursive: true });
  writeFileSync(join(uploadsRoot, 'documents', 'fixture.pdf'), fileBuffer);
  writeFileSync(join(uploadsRoot, 'documents', 'fixture-a.png'), fileBuffer);
  writeFileSync(join(uploadsRoot, 'documents', 'fixture-b.png'), fileBuffer);
  writeFileSync(join(uploadsRoot, 'documents', 'fixture-c.png'), fileBuffer);

  writeJson(metadataRoot, 'drawing-customers.json', [{
    customerId: 'cust-import-a',
    customerName: 'Import Customer A',
    customerShortName: 'ICA',
    status: 'active',
    aliases: ['ICA'],
    createdAt: now,
    updatedAt: now,
  }]);
  writeJson(metadataRoot, 'drawing-products.json', [{
    productId: 'prod-import-a',
    customerId: 'cust-import-a',
    productModel: 'HL-IMPORT-A',
    normalizedProductModel: 'HL-IMPORT-A',
    productName: 'Import Product A',
    drawingStatus: 'available',
    source: 'json_import',
    createdAt: now,
    updatedAt: now,
  }]);
  writeJson(metadataRoot, 'drawing-module-settings.json', {
    schemaVersion: 1,
    updatedAt: now,
    trash: [],
    details: [{
      customer: { customerId: 'cust-import-a', customerName: 'Import Customer A' },
      product: { productId: 'prod-import-a', customerId: 'cust-import-a', productModel: 'HL-IMPORT-A', normalizedProductModel: 'HL-IMPORT-A' },
      modules: [
        {
          moduleKey: 'original_drawing',
          moduleName: 'Original',
          status: 'uploaded',
          coverDocumentId: 'doc-original-a',
          items: [{
            itemId: 'doc-original-a',
            documentId: 'doc-original-a',
            title: 'Original A',
            fileType: 'pdf',
            source: 'manual_upload',
            storageKey: 'documents/fixture.pdf',
            fileSize: fileBuffer.length,
            checksumSha256: checksum,
            version: 'Rev.A',
            documentStatus: 'effective',
            versionGroupKey: 'prod-import-a::drawing_pdf::common',
            createdAt: now,
            updatedAt: now,
          }],
        },
        {
          moduleKey: 'finished_images',
          moduleName: 'Finished Images',
          status: 'uploaded',
          coverDocumentId: 'doc-fi-b',
          items: ['a', 'b', 'c'].map((suffix) => ({
            itemId: `doc-fi-${suffix}`,
            documentId: `doc-fi-${suffix}`,
            title: `Finished ${suffix}`,
            fileType: 'image',
            source: 'manual_upload',
            storageKey: `documents/fixture-${suffix}.png`,
            fileSize: fileBuffer.length,
            checksumSha256: checksum,
            version: 'IMG-A',
            documentStatus: 'effective',
            versionGroupKey: 'prod-import-a::finished_images::gallery',
            createdAt: now,
            updatedAt: now,
          })),
        },
        {
          moduleKey: 'accessory_specs',
          moduleName: 'Accessory',
          status: 'uploaded',
          coverDocumentId: 'doc-as-a',
          items: [{
            itemId: 'doc-as-a',
            documentId: 'doc-as-a',
            title: 'Accessory',
            fileType: 'card',
            source: 'manual_upload',
            version: 'A1',
            documentStatus: 'effective',
            versionGroupKey: 'prod-import-a::process_card::common',
            createdAt: now,
            updatedAt: now,
          }],
        },
        {
          moduleKey: 'notes',
          moduleName: 'Notes',
          status: 'uploaded',
          coverDocumentId: 'doc-nt-a',
          items: [{
            itemId: 'doc-nt-a',
            documentId: 'doc-nt-a',
            title: 'Notes',
            fileType: 'text',
            source: 'manual_upload',
            version: 'A1',
            documentStatus: 'effective',
            versionGroupKey: 'prod-import-a::process_card::common',
            createdAt: now,
            updatedAt: now,
          }],
        },
      ],
    }],
  });
  writeJson(metadataRoot, 'drawing-import-records.json', [{
    importBatchId: 'pdf-batch-a',
    customerId: 'cust-import-a',
    status: 'applied',
    totalFiles: 1,
    importedFiles: 1,
    skippedFiles: 0,
    errorCount: 0,
    expiresAt: new Date(86_400_000).toISOString(),
    appliedAt: now,
    createdAt: now,
    updatedAt: now,
    items: [{
      id: 'pdf-item-a',
      importItemId: 'pdf-item-a',
      originalFileName: 'fixture.pdf',
      stagedFileKey: 'pdf-import/pdf-batch-a/fixture.pdf',
      mimeType: 'application/pdf',
      fileSize: fileBuffer.length,
      checksumSha256: checksum,
      existingProductId: 'prod-import-a',
      existingDocumentId: 'doc-original-a',
      resultProductId: 'prod-import-a',
      resultDocumentId: 'doc-original-a',
      action: 'update_existing',
      result: 'imported',
      appliedAt: now,
      createdAt: now,
      updatedAt: now,
    }],
  }]);
  writeJson(metadataRoot, 'order-import-records.json', [{
    importBatchId: 'order-batch-a',
    scope: 'week',
    fileName: 'orders.xlsx',
    status: 'applied',
    totalRows: 1,
    createdCount: 1,
    skippedCount: 0,
    appliedAt: now,
    createdAt: now,
    updatedAt: now,
    items: [{
      importItemId: 'order-item-a',
      importBatchId: 'order-batch-a',
      rowNumber: 1,
      rawProductModel: 'HL-IMPORT-A',
      productModel: 'HL-IMPORT-A',
      normalizedProductModel: 'HL-IMPORT-A',
      productResolutionStatus: 'found',
      matchedCustomerId: 'cust-import-a',
      matchedCustomerName: 'Import Customer A',
      matchedProductId: 'prod-import-a',
      recommendedProductionStatus: 'front',
      action: 'create_order',
      createdAt: now,
      updatedAt: now,
    }],
    applyItems: [{
      importItemId: 'order-item-a',
      result: 'created',
      orderId: 'order-a',
      appliedAt: now,
    }],
  }]);
  writeJson(metadataRoot, 'production-orders.json', [{
    orderId: 'order-a',
    scope: 'week',
    productModel: 'HL-IMPORT-A',
    normalizedProductModel: 'HL-IMPORT-A',
    customerId: 'cust-import-a',
    customerName: 'Import Customer A',
    linkedProductId: 'prod-import-a',
    productResolutionStatus: 'found',
    quantity: 10,
    quantityProvided: true,
    productionStatus: 'front',
    completionStatus: 'pending',
    source: 'order_import',
    importBatchId: 'order-batch-a',
    importItemId: 'order-item-a',
    createdAt: now,
    updatedAt: now,
  }]);
  writeJson(metadataRoot, 'documents.json', []);
  writeJson(metadataRoot, 'audit-logs.json', [{
    auditLogId: 'audit-a',
    entityType: 'product',
    entityId: 'prod-import-a',
    productId: 'prod-import-a',
    action: 'product_created',
    message: 'Fixture product created',
    createdAt: now,
  }]);
  writeJson(metadataRoot, 'delete-lock-settings.json', {
    enabled: true,
    passwordHash: '$2b$fixturehash',
    failedAttempts: 0,
    lockedUntil: null,
    updatedBy: 'fixture',
    createdAt: now,
    updatedAt: now,
  });
}

async function integrationCheck() {
  await resetTemporaryDatabase();
  const tmpRoot = join(tmpdir(), `hanglian-json-postgres-${Date.now()}`);
  const metadataRoot = join(tmpRoot, 'metadata');
  const uploadsRoot = join(tmpRoot, 'uploads');
  const outputRoot = join(tmpRoot, 'dry-run-v3');
  const dryRunManifest = join(outputRoot, 'dry-run-manifest.json');
  const importManifest = join(tmpRoot, 'import-manifest.json');
  mkdirSync(metadataRoot, { recursive: true });
  mkdirSync(uploadsRoot, { recursive: true });
  try {
    writeFixture(metadataRoot, uploadsRoot);
    const sourceFiles = [
      join(metadataRoot, 'drawing-customers.json'),
      join(metadataRoot, 'drawing-products.json'),
      join(metadataRoot, 'drawing-module-settings.json'),
      join(metadataRoot, 'drawing-import-records.json'),
      join(metadataRoot, 'order-import-records.json'),
      join(metadataRoot, 'production-orders.json'),
      join(metadataRoot, 'documents.json'),
      join(metadataRoot, 'audit-logs.json'),
      join(metadataRoot, 'delete-lock-settings.json'),
      join(uploadsRoot, 'documents', 'fixture.pdf'),
    ];
    const sourceHashes = new Map(sourceFiles.map((file) => [file, sha(file)]));
    let result = run('node', [
      'scripts/json-migration-dry-run.mjs',
      '--metadata-root', metadataRoot,
      '--uploads-root', uploadsRoot,
      '--output', outputRoot,
      '--manifest', dryRunManifest,
    ]);
    assert(result.status === 0, `dry-run fixture failed: ${result.stderr || result.stdout}`);
    const dryRun = JSON.parse(result.stdout);
    assert(dryRun.blockers.length === 0, 'dry-run fixture must have no blockers');

    const executeEnv = {
      DB_TARGET: 'staging',
      ALLOW_TEST_DB_CONNECT: 'true',
      ALLOW_PRISMA_WRITE: 'true',
      MIGRATION_CONFIRMATION: 'IMPORT_JSON_TO_STAGING_POSTGRES',
      [testDatabaseUrlEnv]: testDatabaseUrl,
    };
    result = run('node', [
      'scripts/json-to-postgres-import.mjs',
      '--execute',
      '--metadata-root', metadataRoot,
      '--uploads-root', uploadsRoot,
      '--dry-run-manifest', dryRunManifest,
      '--manifest', importManifest,
      '--batch-size', '2',
      '--database-url-env', testDatabaseUrlEnv,
    ], executeEnv);
    assert(result.status === 0, `execute import failed: ${result.stderr || result.stdout}`);
    const imported = JSON.parse(result.stdout);
    assert(imported.wroteDatabase === true && imported.modifiedMetadata === false && imported.modifiedUploads === false, 'execute safety flags invalid');
    await assertTargetSchemaRows();

    result = run('node', [
      'scripts/json-to-postgres-import.mjs',
      '--execute',
      '--metadata-root', metadataRoot,
      '--uploads-root', uploadsRoot,
      '--dry-run-manifest', dryRunManifest,
      '--manifest', importManifest,
      '--batch-size', '2',
      '--resume-from', 'ProductDocuments',
      '--database-url-env', testDatabaseUrlEnv,
    ], executeEnv);
    assert(result.status === 0, `resume/idempotent import failed: ${result.stderr || result.stdout}`);

    result = run('node', [
      'scripts/postgres-parity-check.mjs',
      '--metadata-root', metadataRoot,
      '--uploads-root', uploadsRoot,
      '--database-url-env', testDatabaseUrlEnv,
    ], {
      DB_TARGET: 'staging',
      ALLOW_TEST_DB_CONNECT: 'true',
      [testDatabaseUrlEnv]: testDatabaseUrl,
    });
    assert(result.status === 0, `parity failed: ${result.stderr || result.stdout}`);
    const parity = JSON.parse(result.stdout);
    assert(parity.result === 'match', 'parity result must match');
    assert(parity.finishedImagesEffectiveCount === 3, 'finished_images multiple effective documents must be preserved');
    await assertApiRepositoryUsesTargetSchema();
    assertNoSourceMutation(sourceHashes, sourceFiles);
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
}

try {
  staticCheck();
  if (!testDatabaseUrl) {
    console.log('JSON PostgreSQL import/parity check static gates passed; integration skipped because JSON_POSTGRES_TEST_URL is not configured.');
  } else {
    await integrationCheck();
    console.log('JSON PostgreSQL import/parity integration check passed.');
  }
} catch (error) {
  if (process.env.GITHUB_ACTIONS === 'true') {
    const message = String(error instanceof Error ? error.message : error).replace(/\r?\n/g, ' ');
    console.error(`::error title=JSON PostgreSQL import/parity check failed::${message}`);
  }
  console.error('JSON PostgreSQL import/parity check failed:');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
