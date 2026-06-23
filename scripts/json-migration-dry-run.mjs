#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { collectPlan, writeSnapshot } from './json-migration-plan.mjs';

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

export function dryRun(options) {
  const plan = collectPlan(options);
  const status = plan.blockers.length
    ? '阻塞迁移'
    : plan.warnings.length
      ? '可迁移但警告'
      : '可迁移';
  return {
    generatedAt: plan.generatedAt,
    status,
    counts: plan.counts,
    duplicates: plan.duplicates,
    invalidRecords: plan.invalidRecords,
    missingRelations: plan.missingRelations,
    missingFiles: plan.missingFiles,
    checksumConflicts: plan.checksumConflicts,
    blockers: plan.blockers,
    warnings: plan.warnings,
    executionOrder: plan.executionOrder,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const metadataRoot = requireString(args, '--metadata-root');
  const uploadsRoot = requireString(args, '--uploads-root');
  const plan = collectPlan({ metadataRoot, uploadsRoot });
  if (args.has('--output')) writeSnapshot(plan, requireString(args, '--output'));
  const result = dryRun({ metadataRoot, uploadsRoot });
  console.log(JSON.stringify(result, null, 2));
  if (result.blockers.length) process.exit(3);
  if (result.warnings.length) process.exit(2);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
