#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { collectPlan } from './json-migration-plan.mjs';

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

function requireString(args, name) {
  const value = args.get(name);
  if (!value || value === true) throw new Error(`${name} 为必填参数。`);
  return String(value);
}

function assertNoPlainDatabaseUrl(argv) {
  if (argv.some((item) => /^postgres(?:ql)?:\/\//i.test(item) || item === '--database-url')) {
    throw new Error('禁止通过命令行直接传入 DATABASE_URL。');
  }
}

function main() {
  const argv = process.argv.slice(2);
  assertNoPlainDatabaseUrl(argv);
  const args = parseArgs(argv);
  const metadataRoot = requireString(args, '--metadata-root');
  const databaseUrlEnv = requireString(args, '--database-url-env');
  const uploadsRoot = args.get('--uploads-root') && args.get('--uploads-root') !== true
    ? String(args.get('--uploads-root'))
    : metadataRoot;
  const databaseUrlConfigured = Boolean(process.env[databaseUrlEnv]);
  const gateReady = process.env.DB_TARGET === 'staging' && process.env.ALLOW_TEST_DB_CONNECT === 'true';
  const plan = collectPlan({ metadataRoot, uploadsRoot });
  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: 'mock-query-only',
    databaseUrlEnv,
    databaseUrlConfigured,
    dbTarget: process.env.DB_TARGET ?? 'unset',
    allowTestDbConnect: process.env.ALLOW_TEST_DB_CONNECT === 'true',
    gateReady,
    connected: false,
    wroteDatabase: false,
    migrationExecuted: false,
    result: gateReady && databaseUrlConfigured ? 'ready_for_future_readonly_parity' : 'missing_gate_or_url',
    comparisons: {
      counts: { status: 'mock', expected: plan.counts },
      primaryKeys: { status: 'mock' },
      customerProductRelations: { status: plan.missingRelations.length ? 'mismatch' : 'match' },
      modules: { status: Object.values(plan.duplicates).some((items) => items.length) ? 'mismatch' : 'match' },
      documentChecksum: { status: plan.checksumConflicts.length ? 'mismatch' : 'match' },
      deleteLock: { status: 'mock', hashPrinted: false },
    },
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
