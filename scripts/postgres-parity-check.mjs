#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import {
  assertNoPlainDatabaseUrl,
  runParityCheck,
} from './json-postgres-migration-core.mjs';

// assertNoPlainDatabaseUrl emits: 禁止通过命令行直接传入 DATABASE_URL。

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

function assertReadOnlyGates() {
  if (process.env.DB_TARGET === 'production') {
    throw new Error('拒绝生产数据库目标。');
  }
  if (process.env.DB_TARGET !== 'staging' || process.env.ALLOW_TEST_DB_CONNECT !== 'true') {
    throw new Error('PostgreSQL parity requires DB_TARGET=staging and ALLOW_TEST_DB_CONNECT=true.');
  }
}

async function main() {
  const argv = process.argv.slice(2);
  assertNoPlainDatabaseUrl(argv);
  assertReadOnlyGates();
  const args = parseArgs(argv);
  const result = await runParityCheck({
    metadataRoot: requireString(args, '--metadata-root'),
    uploadsRoot: args.get('--uploads-root') && args.get('--uploads-root') !== true
      ? String(args.get('--uploads-root'))
      : requireString(args, '--metadata-root'),
    databaseUrlEnv: requireString(args, '--database-url-env'),
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.result !== 'match') process.exit(4);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
