#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import {
  assertWritablePathOutsideSources,
  collectPlan,
  writeManifestFile,
  writeSnapshot,
} from './json-migration-plan.mjs';
import { dryRun as buildDryRunResult } from './json-migration-dry-run.mjs';
import {
  assertNoPlainDatabaseUrl,
  executeImport,
  importStageOrder,
} from './json-postgres-migration-core.mjs';

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

function optionalString(args, name) {
  const value = args.get(name);
  return value && value !== true ? String(value) : undefined;
}

function requireString(args, name) {
  const value = optionalString(args, name);
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function writeDryRunArtifacts(args, metadataRoot, uploadsRoot) {
  const plan = collectPlan({ metadataRoot, uploadsRoot });
  if (args.has('--output')) {
    const outputDir = requireString(args, '--output');
    assertWritablePathOutsideSources(outputDir, [metadataRoot, uploadsRoot]);
    writeSnapshot(plan, outputDir);
  }
  const result = buildDryRunResult({ metadataRoot, uploadsRoot });
  if (args.has('--manifest')) {
    writeManifestFile(requireString(args, '--manifest'), result, [metadataRoot, uploadsRoot]);
  }
  return result;
}

function assertExecuteGates(execute) {
  const gatesReady = process.env.DB_TARGET === 'staging'
    && process.env.ALLOW_TEST_DB_CONNECT === 'true'
    && process.env.ALLOW_PRISMA_WRITE === 'true'
    && process.env.MIGRATION_CONFIRMATION === 'IMPORT_JSON_TO_STAGING_POSTGRES';

  if (process.env.DB_TARGET === 'production') {
    throw new Error('拒绝生产数据库目标。Refusing production database target.');
  }
  if (execute && !gatesReady) {
    throw new Error('JSON import execute requires --execute, staging gates, write gate, and explicit confirmation.');
  }
}

function parseBatchSize(args) {
  const value = Number(args.get('--batch-size') ?? 100);
  if (!Number.isInteger(value) || value < 1 || value > 1000) {
    throw new Error('--batch-size must be an integer between 1 and 1000.');
  }
  return value;
}

async function main() {
  const argv = process.argv.slice(2);
  assertNoPlainDatabaseUrl(argv);
  const args = parseArgs(argv);
  const execute = args.has('--execute');
  const dryRun = !execute || args.has('--dry-run');
  assertExecuteGates(execute);

  if (dryRun) {
    const metadataRoot = requireString(args, '--metadata-root');
    const uploadsRoot = requireString(args, '--uploads-root');
    const result = writeDryRunArtifacts(args, metadataRoot, uploadsRoot);
    console.log(JSON.stringify({
      ...result,
      executeAllowed: false,
      connected: false,
      wroteDatabase: false,
    }, null, 2));
    if (result.blockers.length) process.exit(3);
    if (result.warnings.length) process.exit(2);
    return;
  }

  const resumeFrom = optionalString(args, '--resume-from');
  if (resumeFrom && !importStageOrder.includes(resumeFrom)) {
    throw new Error(`--resume-from must be one of: ${importStageOrder.join(', ')}`);
  }

  const result = await executeImport({
    metadataRoot: requireString(args, '--metadata-root'),
    uploadsRoot: requireString(args, '--uploads-root'),
    dryRunManifestPath: requireString(args, '--dry-run-manifest'),
    manifestPath: requireString(args, '--manifest'),
    batchSize: parseBatchSize(args),
    resumeFrom,
    databaseUrlEnv: optionalString(args, '--database-url-env') ?? 'DATABASE_URL',
  });
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
