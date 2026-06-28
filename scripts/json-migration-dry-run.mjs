#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import {
  assertWritablePathOutsideSources,
  collectPlan,
  writeManifestFile,
  writeSnapshot,
} from './json-migration-plan.mjs';

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
  if (!value || value === true) throw new Error(`${name} is required.`);
  return String(value);
}

export function dryRun(options) {
  const plan = collectPlan(options);
  const status = plan.blockers.length
    ? 'blocked'
    : plan.warnings.length
      ? 'ready_with_warnings'
      : 'ready';
  return {
    generatedAt: plan.generatedAt,
    mode: 'dry-run',
    status,
    dryRunOnly: true,
    databaseAccess: false,
    wrotePostgres: false,
    modifiedMetadata: false,
    modifiedUploads: false,
    counts: plan.counts,
    duplicates: plan.duplicates,
    duplicateRecords: plan.duplicateRecords,
    invalidRecords: plan.invalidRecords,
    missingRelations: plan.missingRelations,
    orphanRelations: plan.orphanRelations,
    missingFiles: plan.missingFiles,
    checksumConflicts: plan.checksumConflicts,
    multipleEffectiveVersions: plan.multipleEffectiveVersions,
    blockers: plan.blockers,
    warnings: plan.warnings,
    executionOrder: plan.executionOrder,
    sourceFileHashes: plan.sourceFileHashes,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.has('--execute')) throw new Error('dry-run command does not support --execute.');
  const metadataRoot = requireString(args, '--metadata-root');
  const uploadsRoot = requireString(args, '--uploads-root');
  const plan = collectPlan({ metadataRoot, uploadsRoot });
  if (args.has('--output')) {
    const outputDir = requireString(args, '--output');
    assertWritablePathOutsideSources(outputDir, [metadataRoot, uploadsRoot]);
    writeSnapshot(plan, outputDir);
  }
  const result = dryRun({ metadataRoot, uploadsRoot });
  if (args.has('--manifest')) {
    writeManifestFile(requireString(args, '--manifest'), result, [metadataRoot, uploadsRoot]);
  }
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
