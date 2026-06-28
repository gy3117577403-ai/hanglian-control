import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const blockers = [];

function read(relativePath) {
  const file = join(root, relativePath);
  if (!existsSync(file)) {
    blockers.push(`Missing file: ${relativePath}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function requireIncludes(relativePath, needle, message) {
  if (!read(relativePath).includes(needle)) blockers.push(message);
}

function requireAnyIncludes(candidates, message) {
  const matched = candidates.some(({ relativePath, needles }) => {
    const source = read(relativePath);
    return needles.every((needle) => source.includes(needle));
  });
  if (!matched) blockers.push(message);
}

function requireNotIncludes(relativePath, needle, message) {
  if (read(relativePath).includes(needle)) blockers.push(message);
}

console.log('V3.10 storage flow check');
console.log('This check is local-only. It does not connect to a database, Sealos, S3, or object storage.');

[
  'apps/api/src/storage/storage.service.ts',
  'apps/api/src/storage/storage.config.ts',
  'apps/api/src/storage/providers/local-storage.provider.ts',
  'apps/api/src/storage/providers/s3-storage.provider.ts',
  'apps/api/src/storage/controllers/storage-status.controller.ts',
  'apps/api/src/documents/documents.service.ts',
  'apps/api/src/files/files.controller.ts',
  'apps/api/src/files/files.service.ts',
  'apps/api/src/document-hub/document-hub.service.ts',
  'apps/api/src/document-hub/document-lifecycle.service.ts',
  'apps/api/src/document-hub/helpers/document-lifecycle-validator.ts',
  'apps/api/src/unified-documents/unified-documents.service.ts',
  'apps/api/src/common/types/production.types.ts',
].forEach((file) => read(file));

requireIncludes('apps/api/src/documents/documents.service.ts', 'this.storageService.putObject', 'Documents upload must write through StorageService.');
requireIncludes('apps/api/src/documents/documents.service.ts', 'storageProvider: stored.provider', 'Uploaded document must persist storageProvider.');
requireIncludes('apps/api/src/documents/documents.service.ts', 'storageKey: stored.storageKey', 'Uploaded document must persist storageKey.');
requireIncludes('apps/api/src/documents/documents.service.ts', 'checksumSha256: stored.checksumSha256', 'Uploaded document must persist checksumSha256.');
requireIncludes('apps/api/src/files/files.controller.ts', "Get('documents/:documentId/preview')", 'FilesController must expose document preview route.');
requireIncludes('apps/api/src/files/files.controller.ts', "Get('documents/:documentId/download')", 'FilesController must expose document download route.');
requireIncludes('apps/api/src/files/files.service.ts', 'getDocumentFile', 'FilesService must resolve files by document id.');
requireAnyIncludes([
  {
    relativePath: 'apps/api/src/document-hub/document-hub.service.ts',
    needles: ['deleteDocumentObject'],
  },
  {
    relativePath: 'apps/api/src/document-hub/document-lifecycle.service.ts',
    needles: [
      'async trash',
      'async restore',
      'async purge',
      'StorageService',
      'assertSafeLifecycleStorageKey',
      'const storageKey = assertSafeLifecycleStorageKey',
      'this.storageService.deleteObject(storageKey)',
    ],
  },
], 'DocumentHub delete must use StorageService.');
requireIncludes('apps/api/src/document-hub/helpers/document-lifecycle-validator.ts', "normalized.includes('..')", 'Document lifecycle storage key validation must reject path traversal.');
requireIncludes('apps/api/src/document-hub/helpers/document-lifecycle-validator.ts', 'normalized.split', 'Document lifecycle storage key validation must inspect path segments.');
requireIncludes('apps/api/src/unified-documents/unified-documents.service.ts', 'deleteDocumentObject', 'Unified purge must use StorageService.');
requireIncludes('apps/api/src/storage/local-storage.service.ts', 'writeTextAtomic', 'Local metadata writes must use atomic temp-file replacement.');
requireIncludes('apps/api/src/storage/storage.config.ts', "env('FILE_STORAGE_PROVIDER', 'local')", 'Storage provider must default to local.');
requireIncludes('apps/api/src/storage/storage.config.ts', "env('STORAGE_ROOT')", 'Storage root must be environment-configurable.');
requireIncludes('apps/api/src/storage/storage.config.ts', "env('METADATA_ROOT')", 'Metadata root must be environment-configurable.');
requireIncludes('apps/api/src/storage/storage.config.ts', "env('STORAGE_TEMP_ROOT')", 'Temp root must be environment-configurable.');
requireIncludes('apps/api/src/storage/storage.service.ts', 'S3 storage is selected but not fully configured', 'S3 provider must fail closed when incomplete.');
requireIncludes('apps/api/.env.example', 'FILE_STORAGE_PROVIDER=local', 'API env example must default storage provider to local.');
requireIncludes('apps/api/.env.example', 'S3_ENDPOINT=', 'API env example must keep S3 endpoint as placeholder.');
requireIncludes('apps/api/.env.local.example', 'FILE_STORAGE_PROVIDER=local', 'Local env example must default storage provider to local.');
requireIncludes('.gitignore', 'apps/api/storage/tmp/*', 'Storage temp directory must be ignored.');
requireNotIncludes('apps/api/src/storage/controllers/storage-status.controller.ts', 'DATABASE_URL', 'Storage status must not expose DATABASE_URL.');

if (blockers.length) {
  console.error('\nStorage flow check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('V3.10 storage flow check passed.');
