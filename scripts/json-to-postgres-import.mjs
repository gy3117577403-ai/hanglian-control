#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith('--')) continue;
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) args.set(key, true);
    else {
      args.set(key, next);
      index += 1;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const execute = args.has('--execute');
  const dryRun = !execute || args.has('--dry-run');
  const gatesReady = process.env.DB_TARGET === 'staging'
    && process.env.ALLOW_TEST_DB_CONNECT === 'true'
    && process.env.ALLOW_PRISMA_WRITE === 'true'
    && process.env.MIGRATION_CONFIRMATION === 'IMPORT_JSON_TO_STAGING_POSTGRES';

  if (process.env.DB_TARGET === 'production') {
    throw new Error('拒绝生产数据库目标。');
  }
  if (execute && !gatesReady) {
    throw new Error('迁移执行需要 --execute、staging 闸门、写入闸门和明确确认词。');
  }

  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: dryRun ? 'dry-run' : 'execute',
    executeAllowed: execute && gatesReady,
    batchSize: Number(args.get('--batch-size') ?? 100),
    resumeFrom: args.get('--resume-from') || null,
    manifest: args.get('--manifest') || null,
    idempotentUpsert: true,
    transactionPerBatch: true,
    migrationLog: true,
    stopOnFailure: true,
    deletesSourceJson: false,
    deletesUploads: false,
    connected: false,
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
