import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const blockers = [];
const defaultDeletePassword = ['1', '2', '3'].join('');
const wrongDeletePassword = ['b', 'a', 'd'].join('');
const confirmText = '\u786e\u8ba4\u5f7b\u5e95\u5220\u9664';

function assert(condition, message) {
  if (!condition) blockers.push(message);
}

function runApiBuild() {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm run build -w api'] : ['run', 'build', '-w', 'api'];
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
  });

  if (result.error) assert(false, `API build could not start: ${result.error.message}`);
  assert(result.status === 0, 'API build failed before document lifecycle backend check.');
}

function minimalPdfBuffer(label) {
  return Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n% ${label}\ntrailer\n<<>>\n%%EOF\n`);
}

function protectedBody(secret, extra = {}) {
  return Object.assign({}, extra, { ['password']: secret });
}

function purgeBody(secret, extra = {}) {
  return Object.assign({ confirmText }, extra, { ['password']: secret });
}

async function expectHttpStatus(action, status, message) {
  try {
    await action();
    assert(false, message);
  } catch (error) {
    assert(error?.status === status, `${message} Expected HTTP ${status}, got ${error?.status ?? 'unknown'}.`);
  }
}

function documentId(document) {
  return document.documentId ?? document.id;
}

function isDeleted(document) {
  return document?.deleted === true || Boolean(document?.deletedAt);
}

function filePathFor(runtime, document) {
  return join(runtime.config.uploadsRoot, document.storageKey ?? document.storedFileName);
}

function readDocument(runtime, id) {
  return runtime.localStorage.readDocumentsSync().find((document) => documentId(document) === id);
}

function countAudit(runtime, action) {
  return runtime.localStorage.readAuditLogsSync().filter((audit) => audit.action === action).length;
}

function assertSafeResponse(response, tempRoot) {
  const text = JSON.stringify(response);
  assert(!text.includes('passwordHash'), 'Lifecycle response must not expose passwordHash.');
  assert(!text.includes('storageKey'), 'Lifecycle response must not expose storageKey.');
  assert(!text.includes('checksum'), 'Lifecycle response must not expose checksums.');
  assert(!text.includes(resolve(tempRoot)), 'Lifecycle response must not expose absolute local paths.');
}

function assertNoPasswordFieldsInMetadata(runtime) {
  const lock = runtime.localStorage.readMetadataSync('delete-lock-settings.json', {});
  assert(!Object.prototype.hasOwnProperty.call(lock, 'password'), 'Delete lock metadata must not store plain password fields.');
  assert(typeof lock.passwordHash === 'string' && lock.passwordHash !== defaultDeletePassword, 'Delete lock metadata should keep only a hash.');
  const auditsText = JSON.stringify(runtime.localStorage.readAuditLogsSync());
  assert(!auditsText.includes('passwordHash') && !auditsText.includes('"password"'), 'Audit records must not store password fields.');
}

function createRuntime() {
  const require = createRequire(import.meta.url);
  const previousEnv = {
    DEMO_DATA_MODE: process.env.DEMO_DATA_MODE,
    FILE_STORAGE_PROVIDER: process.env.FILE_STORAGE_PROVIDER,
    STORAGE_ROOT: process.env.STORAGE_ROOT,
    METADATA_ROOT: process.env.METADATA_ROOT,
    STORAGE_TEMP_ROOT: process.env.STORAGE_TEMP_ROOT,
  };
  const tempRoot = mkdtempSync(join(tmpdir(), 'hanglian-document-lifecycle-'));
  const storageRoot = join(tempRoot, 'storage');
  process.env.DEMO_DATA_MODE = 'empty';
  process.env.FILE_STORAGE_PROVIDER = 'local';
  process.env.STORAGE_ROOT = storageRoot;
  process.env.METADATA_ROOT = join(storageRoot, 'metadata');
  process.env.STORAGE_TEMP_ROOT = join(storageRoot, 'tmp');

  const { StorageConfigService } = require(join(root, 'apps/api/dist/src/storage/storage.config.js'));
  const { StorageKeyService } = require(join(root, 'apps/api/dist/src/storage/storage-key.service.js'));
  const { StorageSafetyService } = require(join(root, 'apps/api/dist/src/storage/storage-safety.service.js'));
  const { LocalStorageProvider } = require(join(root, 'apps/api/dist/src/storage/providers/local-storage.provider.js'));
  const { S3StorageProvider } = require(join(root, 'apps/api/dist/src/storage/providers/s3-storage.provider.js'));
  const { StorageService } = require(join(root, 'apps/api/dist/src/storage/storage.service.js'));
  const { LocalStorageService } = require(join(root, 'apps/api/dist/src/storage/local-storage.service.js'));
  const { MockDocumentRepository } = require(join(root, 'apps/api/dist/src/repositories/mock/mock-document.repository.js'));
  const { MockAuditRepository } = require(join(root, 'apps/api/dist/src/repositories/mock/mock-audit.repository.js'));
  const { AuditService } = require(join(root, 'apps/api/dist/src/audit/audit.service.js'));
  const { DocumentsService } = require(join(root, 'apps/api/dist/src/documents/documents.service.js'));
  const { DeleteLockService } = require(join(root, 'apps/api/dist/src/unified-documents/helpers/delete-lock.service.js'));
  const { DrawingMetadataStore } = require(join(root, 'apps/api/dist/src/document-hub/drawing-metadata.store.js'));
  const { DocumentHubService } = require(join(root, 'apps/api/dist/src/document-hub/document-hub.service.js'));
  const { DocumentHubController } = require(join(root, 'apps/api/dist/src/document-hub/document-hub.controller.js'));
  const { DocumentLifecycleService } = require(join(root, 'apps/api/dist/src/document-hub/document-lifecycle.service.js'));
  const { documentToLifecycleItem } = require(join(root, 'apps/api/dist/src/document-hub/helpers/document-lifecycle-validator.js'));

  const config = new StorageConfigService();
  const keyService = new StorageKeyService();
  const safety = new StorageSafetyService();
  const localProvider = new LocalStorageProvider(config, keyService, safety);
  const s3Provider = new S3StorageProvider(config, keyService, safety);
  const storageService = new StorageService(config, localProvider, s3Provider);
  const localStorage = new LocalStorageService(config, storageService);
  localStorage.ensureStorageSync();

  const documentRepository = new MockDocumentRepository(localStorage);
  const auditRepository = new MockAuditRepository(localStorage);
  const auditService = new AuditService(auditRepository);
  const documentsService = new DocumentsService(documentRepository, storageService, auditService);
  const deleteLockService = new DeleteLockService(localStorage);
  const store = new DrawingMetadataStore(localStorage);
  const lifecycle = new DocumentLifecycleService(
    store,
    documentsService,
    localStorage,
    storageService,
    deleteLockService,
    auditService,
  );
  const service = new DocumentHubService(
    documentsService,
    localStorage,
    storageService,
    deleteLockService,
    store,
    undefined,
    undefined,
    lifecycle,
  );
  const controller = new DocumentHubController(service, lifecycle);

  function cleanup() {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(tempRoot, { recursive: true, force: true });
  }

  return {
    tempRoot,
    config,
    localStorage,
    storageService,
    documentsService,
    deleteLockService,
    auditService,
    store,
    lifecycle,
    service,
    controller,
    documentToLifecycleItem,
    cleanup,
  };
}

function seedCustomerAndProduct(runtime, suffix = 'main') {
  const customer = {
    customerId: `cust-life-${suffix}`,
    customerName: `Lifecycle Customer ${suffix}`,
    customerShortName: `LC ${suffix}`,
  };
  const product = {
    productId: `prod-life-${suffix}`,
    customerId: customer.customerId,
    productModel: `HL-LIFE-${suffix.toUpperCase()}`,
    normalizedProductModel: `HL-LIFE-${suffix.toUpperCase()}`,
    productName: `Lifecycle Product ${suffix}`,
    drawingStatus: 'no_drawing',
    source: 'manual_create',
  };
  runtime.store.writeCustomers([...runtime.store.readCustomers(), customer]);
  runtime.store.writeProducts([...runtime.store.readProducts(), product]);
  runtime.store.upsertDetail(runtime.store.makeProductDetail(customer, product));
  return { customer, product };
}

async function createDrawingDocument(runtime, product, input) {
  return runtime.documentsService.createStoredDocumentMetadata({
    documentId: input.documentId,
    productId: product.productId,
    documentType: 'drawing_pdf',
    title: input.title,
    version: input.version,
    status: input.status,
    source: 'manual_upload',
    requiredForProcess: 'common',
    keywords: [product.productModel, input.version],
    remark: input.title,
    originalFileName: input.originalFileName,
    mimeType: 'application/pdf',
    fileSize: input.buffer.length,
    buffer: input.buffer,
    skipAudit: true,
  });
}

function attachOriginalItems(runtime, product, documents, coverDocumentId) {
  const detail = runtime.store.readDetails().find((item) => item.product.productId === product.productId);
  const original = detail.modules.find((module) => module.moduleKey === 'original_drawing');
  original.items = documents.map((document) => runtime.documentToLifecycleItem(document));
  original.status = original.items.length ? 'uploaded' : 'no_drawing';
  original.itemCount = original.items.length;
  original.coverDocumentId = coverDocumentId;
  runtime.store.upsertDetail(detail);
}

async function checkDefaultDeleteLock(runtime) {
  const status = runtime.deleteLockService.status();
  assert(status.enabled === true, 'Delete lock should be enabled by default.');
  assert(status.hasPassword === true, 'Delete lock should initialize a default hash.');
  assert(!Object.prototype.hasOwnProperty.call(status, 'passwordHash'), 'Delete lock status must not return passwordHash.');
  runtime.deleteLockService.assertVerified(defaultDeletePassword);
  assert(runtime.deleteLockService.status().failedAttempts === 0, 'Default delete password should verify and reset failed attempts.');
  assertNoPasswordFieldsInMetadata(runtime);
}

async function checkTrashRestorePurge(runtime) {
  const { product } = seedCustomerAndProduct(runtime, 'main');
  const first = await createDrawingDocument(runtime, product, {
    documentId: 'doc-life-first',
    title: 'Lifecycle first drawing',
    version: 'Rev.A',
    status: 'effective',
    originalFileName: 'life-first.pdf',
    buffer: minimalPdfBuffer('first'),
  });
  const second = await createDrawingDocument(runtime, product, {
    documentId: 'doc-life-second',
    title: 'Lifecycle second drawing',
    version: 'Rev.B',
    status: 'pending_review',
    originalFileName: 'life-second.pdf',
    buffer: minimalPdfBuffer('second'),
  });
  attachOriginalItems(runtime, product, [first, second], first.documentId);

  await expectHttpStatus(
    () => runtime.controller.trashDrawingItem(
      product.productId,
      'original_drawing',
      first.documentId,
      protectedBody(wrongDeletePassword, { reason: 'wrong password' }),
    ),
    400,
    'Wrong delete password should reject trash.',
  );
  assert(runtime.deleteLockService.status().failedAttempts === 1, 'Wrong password should increase failedAttempts.');
  assert(!isDeleted(readDocument(runtime, first.documentId)), 'Wrong password must not change metadata.');
  assert(existsSync(filePathFor(runtime, first)), 'Wrong password must not delete files.');

  const trash = await runtime.controller.trashDrawingItem(
    product.productId,
    'original_drawing',
    first.documentId,
    protectedBody(defaultDeletePassword, {
      reason: 'lifecycle check trash',
      operatorId: 'tester',
      operatorName: 'Lifecycle Tester',
    }),
  );
  assertSafeResponse(trash, runtime.tempRoot);
  assert(trash.deleted === true && trash.movedToTrash === true, 'Trash response should mark movedToTrash.');
  assert(trash.warning, 'Trashing the only effective version should return a warning.');
  assert(runtime.deleteLockService.status().failedAttempts === 0, 'Correct password should reset failedAttempts.');
  assert(isDeleted(readDocument(runtime, first.documentId)), 'Trash should mark document deleted.');
  assert(existsSync(filePathFor(runtime, first)), 'Trash must keep the underlying file.');
  const activeDocuments = await runtime.documentsService.findAll({ productId: product.productId });
  assert(!activeDocuments.some((document) => documentId(document) === first.documentId), 'Ordinary document list should hide trashed document.');
  const detailAfterTrash = await runtime.service.getProduct(product.productId);
  const originalAfterTrash = detailAfterTrash.modules.find((module) => module.moduleKey === 'original_drawing');
  assert(!originalAfterTrash.items.some((item) => item.itemId === first.documentId), 'Product detail should hide trashed document.');
  assert(originalAfterTrash.itemCount === 1, 'Module itemCount should count only active items after trash.');
  assert(originalAfterTrash.coverDocumentId === second.documentId, 'Trashing the cover should switch cover to the next active item.');
  assert(readDocument(runtime, second.documentId).documentStatus === 'pending_review', 'Trash must not promote historical or pending versions automatically.');
  assert(countAudit(runtime, 'document_trashed') === 1, 'Trash should create one audit record.');

  const trashList = await runtime.controller.getTrash({ productId: product.productId });
  assertSafeResponse(trashList, runtime.tempRoot);
  assert(trashList.items.some((item) => item.documentId === first.documentId), 'Trash list should show trashed document.');
  assert(trashList.items[0].canRestore === true && trashList.items[0].canPurge === true, 'Trash list should expose restore/purge capabilities.');

  await runtime.controller.trashDrawingItem(
    product.productId,
    'original_drawing',
    first.documentId,
    protectedBody(wrongDeletePassword, { reason: 'repeat trash should be idempotent' }),
  );
  assert(countAudit(runtime, 'document_trashed') === 1, 'Repeated trash should not duplicate audits.');
  assert(runtime.deleteLockService.status().failedAttempts === 0, 'Repeated trash should not verify password or increase failed attempts.');

  const restore = await runtime.controller.restoreDrawingItem(
    product.productId,
    'original_drawing',
    first.documentId,
    { operatorId: 'tester', operatorName: 'Lifecycle Tester', remark: 'restore check' },
  );
  assertSafeResponse(restore, runtime.tempRoot);
  assert(restore.restored === true && restore.deleted === false, 'Restore response should mark restored.');
  assert(!isDeleted(readDocument(runtime, first.documentId)), 'Restore should clear deleted metadata.');
  const detailAfterRestore = await runtime.service.getProduct(product.productId);
  const originalAfterRestore = detailAfterRestore.modules.find((module) => module.moduleKey === 'original_drawing');
  assert(originalAfterRestore.items.some((item) => item.itemId === first.documentId), 'Product detail should show restored document.');
  assert(originalAfterRestore.coverDocumentId === second.documentId, 'Restored item should not steal an existing active cover.');
  assert((await runtime.controller.getTrash({ productId: product.productId })).items.length === 0, 'Trash list should hide restored document.');
  assert(countAudit(runtime, 'document_restored') === 1, 'Restore should create one audit record.');

  await runtime.controller.restoreDrawingItem(product.productId, 'original_drawing', first.documentId, {});
  assert(countAudit(runtime, 'document_restored') === 1, 'Repeated restore should be idempotent.');

  await expectHttpStatus(
    () => runtime.controller.purgeDrawingItem(
      product.productId,
      'original_drawing',
      first.documentId,
      purgeBody(defaultDeletePassword, { reason: 'not trashed' }),
    ),
    409,
    'Purge should reject active documents.',
  );

  await runtime.controller.trashDrawingItem(
    product.productId,
    'original_drawing',
    first.documentId,
    protectedBody(defaultDeletePassword, { reason: 'trash before purge' }),
  );
  await expectHttpStatus(
    () => runtime.controller.purgeDrawingItem(
      product.productId,
      'original_drawing',
      first.documentId,
      purgeBody(defaultDeletePassword, { confirmText: 'wrong confirm' }),
    ),
    400,
    'Purge should reject wrong confirm text.',
  );
  await expectHttpStatus(
    () => runtime.controller.purgeDrawingItem(
      product.productId,
      'original_drawing',
      first.documentId,
      purgeBody(wrongDeletePassword, { reason: 'wrong purge password' }),
    ),
    400,
    'Purge should reject wrong password.',
  );
  assert(runtime.deleteLockService.status().failedAttempts === 1, 'Wrong purge password should increase failedAttempts.');

  const purge = await runtime.controller.purgeDrawingItem(
    product.productId,
    'original_drawing',
    first.documentId,
    purgeBody(defaultDeletePassword, {
      reason: 'purge check',
      operatorId: 'tester',
      operatorName: 'Lifecycle Tester',
    }),
  );
  assertSafeResponse(purge, runtime.tempRoot);
  assert(purge.purged === true && purge.fileDeleted === true && purge.metadataDeleted === true, 'Purge should delete file and metadata.');
  assert(!existsSync(filePathFor(runtime, first)), 'Purge should delete the formal file through StorageService.');
  assert(!readDocument(runtime, first.documentId), 'Purge should remove formal metadata.');
  assert(countAudit(runtime, 'document_purged') === 1, 'Purge should create an audit record.');
  await expectHttpStatus(
    () => runtime.controller.purgeDrawingItem(
      product.productId,
      'original_drawing',
      first.documentId,
      purgeBody(defaultDeletePassword),
    ),
    404,
    'Repeated purge should report missing document.',
  );

  await runtime.controller.trashDrawingItem(
    product.productId,
    'original_drawing',
    second.documentId,
    protectedBody(defaultDeletePassword, { reason: 'last document' }),
  );
  await runtime.controller.purgeDrawingItem(
    product.productId,
    'original_drawing',
    second.documentId,
    purgeBody(defaultDeletePassword, { reason: 'purge last document' }),
  );
  const detailAfterLastPurge = await runtime.service.getProduct(product.productId);
  const moduleAfterLastPurge = detailAfterLastPurge.modules.find((module) => module.moduleKey === 'original_drawing');
  assert(moduleAfterLastPurge.itemCount === 0, 'Purging the last item should make module itemCount zero.');
  assert(!moduleAfterLastPurge.coverDocumentId, 'Purging the last item should clear coverDocumentId.');
  assert(detailAfterLastPurge.product.drawingStatus === 'no_drawing', 'Purging the last drawing should update product drawingStatus.');
}

async function checkMissingFileAndPathSafety(runtime) {
  const { product } = seedCustomerAndProduct(runtime, 'missing');
  const missing = await createDrawingDocument(runtime, product, {
    documentId: 'doc-life-missing',
    title: 'Lifecycle missing file',
    version: 'Rev.M',
    status: 'effective',
    originalFileName: 'life-missing.pdf',
    buffer: minimalPdfBuffer('missing'),
  });
  attachOriginalItems(runtime, product, [missing], missing.documentId);
  await runtime.controller.trashDrawingItem(
    product.productId,
    'original_drawing',
    missing.documentId,
    protectedBody(defaultDeletePassword, { reason: 'missing file setup' }),
  );
  rmSync(filePathFor(runtime, missing), { force: true });
  const purgeMissing = await runtime.controller.purgeDrawingItem(
    product.productId,
    'original_drawing',
    missing.documentId,
    purgeBody(defaultDeletePassword, { reason: 'orphan metadata cleanup' }),
  );
  assert(purgeMissing.fileMissing === true && purgeMissing.metadataDeleted === true, 'Purge should clean orphan metadata when file is missing.');
  assert(countAudit(runtime, 'document_purged') >= 1, 'Missing-file purge should still audit document_purged.');

  const malicious = {
    id: 'doc-life-unsafe',
    documentId: 'doc-life-unsafe',
    productId: product.productId,
    type: 'drawing',
    documentType: 'drawing_pdf',
    title: 'Unsafe key document',
    version: 'Rev.X',
    status: '有效',
    documentStatus: 'effective',
    effectiveDate: '2026-06-20',
    updatedAt: '2026-06-20T00:00:00.000Z',
    createdAt: '2026-06-20T00:00:00.000Z',
    source: 'manual_upload',
    requiredForProcess: 'common',
    previewType: 'pdf',
    mockPreviewText: 'unsafe',
    keywords: [],
    description: 'unsafe',
    localMockLabel: 'PDF drawing',
    originalFileName: 'unsafe.pdf',
    storedFileName: '../outside.pdf',
    storageProvider: 'local',
    storageKey: '../outside.pdf',
    mimeType: 'application/pdf',
    fileSize: 10,
    deleted: true,
    deletedAt: '2026-06-20T00:00:00.000Z',
    deletedBy: 'tester',
    archived: false,
    versionGroupKey: `${product.productId}::drawing_pdf::common`,
  };
  runtime.localStorage.writeDocumentsSync([...runtime.localStorage.readDocumentsSync(), malicious]);
  await expectHttpStatus(
    () => runtime.controller.purgeDrawingItem(
      product.productId,
      'original_drawing',
      malicious.documentId,
      purgeBody(defaultDeletePassword, { reason: 'unsafe key' }),
    ),
    400,
    'Purge should reject path traversal storage keys.',
  );
  assert(readDocument(runtime, malicious.documentId), 'Unsafe storage key rejection must keep metadata.');
}

async function checkPlaceholderProtection(runtime) {
  const { product } = seedCustomerAndProduct(runtime, 'seed');
  const detail = runtime.store.readDetails().find((item) => item.product.productId === product.productId);
  const sop = detail.modules.find((module) => module.moduleKey === 'sop');
  sop.items = [{
    itemId: 'seed-placeholder-item',
    title: 'Seed placeholder',
    fileType: 'card',
    version: 'A',
    uploadedAt: '2026-06-20T00:00:00.000Z',
    source: 'seed',
  }];
  sop.status = 'uploaded';
  sop.itemCount = 1;
  runtime.store.upsertDetail(detail);
  await expectHttpStatus(
    () => runtime.controller.trashDrawingItem(
      product.productId,
      'sop',
      'seed-placeholder-item',
      protectedBody(defaultDeletePassword, { reason: 'placeholder' }),
    ),
    409,
    'Seed placeholders without formal metadata should be protected from delete.',
  );
}

function checkSourceSurface() {
  const controllerSource = readFileSync(join(root, 'apps/api/src/document-hub/document-hub.controller.ts'), 'utf8');
  const lifecycleSource = readFileSync(join(root, 'apps/api/src/document-hub/document-lifecycle.service.ts'), 'utf8');
  const helperSource = readFileSync(join(root, 'apps/api/src/document-hub/helpers/document-lifecycle-validator.ts'), 'utf8');
  const serviceSource = readFileSync(join(root, 'apps/api/src/document-hub/document-hub.service.ts'), 'utf8');
  const packageJson = readFileSync(join(root, 'package.json'), 'utf8');

  assert(controllerSource.includes("@Get('trash')"), 'Controller should expose GET /document-hub/trash.');
  assert(controllerSource.includes("@Post('drawings/products/:productId/modules/:moduleKey/items/:itemId/trash')"), 'Controller should expose trash route.');
  assert(controllerSource.includes("@Post('drawings/products/:productId/modules/:moduleKey/items/:itemId/restore')"), 'Controller should expose restore route.');
  assert(controllerSource.includes("@Post('drawings/products/:productId/modules/:moduleKey/items/:itemId/purge')"), 'Controller should expose purge route.');
  assert(controllerSource.includes('deprecated: true'), 'Old delete route should be marked deprecated.');
  assert(controllerSource.includes('lifecycleService().trash(productId, moduleKey, itemId, dto)'), 'Old delete route should call lifecycle trash.');
  assert(serviceSource.includes('documentLifecycleService.trash'), 'DocumentHubService delete wrapper should delegate to lifecycle trash.');
  assert(!serviceSource.includes('deleteDocumentObject(document)'), 'DocumentHubService should no longer physically delete drawing items.');
  assert(lifecycleSource.includes('documentLocks'), 'Lifecycle service should include process-level document locks.');
  assert(lifecycleSource.includes('deleteLockService.assertVerified'), 'Lifecycle service should reuse DeleteLockService.');
  assert(lifecycleSource.includes('storageService.deleteObject'), 'Purge should delete files through StorageService.deleteObject.');
  assert(helperSource.includes('assertSafeLifecycleStorageKey'), 'Lifecycle helper should include storage key traversal protection.');
  assert(packageJson.includes('"document-lifecycle-backend:check": "node scripts/document-lifecycle-backend-check.mjs"'), 'Root package.json should expose document-lifecycle-backend:check.');
}

console.log('Document lifecycle backend check');
console.log('This check uses isolated temp metadata/uploads and does not connect to a database, S3, or Sealos.');

runApiBuild();
if (!blockers.length) {
  checkSourceSurface();
  const runtime = createRuntime();
  try {
    runtime.service.onModuleInit();
    await checkDefaultDeleteLock(runtime);
    await checkTrashRestorePurge(runtime);
    await checkMissingFileAndPathSafety(runtime);
    await checkPlaceholderProtection(runtime);
    assertNoPasswordFieldsInMetadata(runtime);
  } finally {
    runtime.cleanup();
  }
}

if (blockers.length) {
  console.error('\nDocument lifecycle backend check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('Document lifecycle backend check passed.');
