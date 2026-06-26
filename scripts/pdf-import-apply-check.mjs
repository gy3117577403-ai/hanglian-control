import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const blockers = [];

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
  assert(result.status === 0, 'API build failed before PDF import apply check.');
}

function minimalPdfBuffer(label) {
  return Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n% ${label}\ntrailer\n<<>>\n%%EOF\n`);
}

function makeFile(originalname, buffer, mimetype = 'application/pdf', size = buffer.length) {
  return {
    fieldname: 'files',
    originalname,
    encoding: '7bit',
    mimetype,
    size,
    buffer,
  };
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function listFilesRecursive(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(dir, entry.name);
    return entry.isDirectory() ? listFilesRecursive(absolutePath) : [absolutePath];
  });
}

function assertSafeResponse(response, tempRoot) {
  const text = JSON.stringify(response);
  assert(!text.includes('stagedFileKey'), 'Response must not expose stagedFileKey.');
  assert(!text.includes('stagedFileName'), 'Response must not expose stagedFileName.');
  assert(!text.includes(resolve(tempRoot)), 'Response must not expose absolute temp paths.');
}

function byName(response, originalFileName) {
  return response.items.find((item) => item.originalFileName === originalFileName);
}

function requestForItems(items, defaults = {}) {
  return items.map((item) => ({
    importItemId: item.importItemId,
    selected: true,
    confirmedProductModel: item.confirmedProductModel || item.parsedProductModel,
    confirmedVersion: item.parsedVersion,
    setAsEffective: true,
    ...defaults,
  }));
}

async function expectHttpStatus(action, status, message) {
  try {
    await action();
    assert(false, message);
  } catch (error) {
    assert(error?.status === status, `${message} Expected HTTP ${status}, got ${error?.status ?? 'unknown'}.`);
  }
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
  const tempRoot = mkdtempSync(join(tmpdir(), 'hanglian-pdf-import-apply-'));
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
  const { DrawingMetadataStore } = require(join(root, 'apps/api/dist/src/document-hub/drawing-metadata.store.js'));
  const { DocumentHubService } = require(join(root, 'apps/api/dist/src/document-hub/document-hub.service.js'));
  const { DocumentHubController } = require(join(root, 'apps/api/dist/src/document-hub/document-hub.controller.js'));
  const { PdfImportPreviewService } = require(join(root, 'apps/api/dist/src/document-hub/pdf-import-preview.service.js'));
  const { PdfImportApplyService } = require(join(root, 'apps/api/dist/src/document-hub/pdf-import-apply.service.js'));
  const { PdfImportTempStorageService } = require(join(root, 'apps/api/dist/src/document-hub/pdf-import-temp-storage.service.js'));

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
  const store = new DrawingMetadataStore(localStorage);
  const tempStorage = new PdfImportTempStorageService(localStorage);
  const previewService = new PdfImportPreviewService(store, documentsService, tempStorage);
  const applyService = new PdfImportApplyService(store, documentsService, tempStorage, auditService);
  const service = new DocumentHubService(
    documentsService,
    localStorage,
    storageService,
    { assertVerified() {} },
    store,
    previewService,
    applyService,
  );
  const controller = new DocumentHubController(service);

  function cleanup() {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(tempRoot, { recursive: true, force: true });
  }

  return {
    tempRoot,
    storageRoot,
    config,
    localStorage,
    storageService,
    documentsService,
    auditService,
    store,
    tempStorage,
    previewService,
    applyService,
    service,
    controller,
    cleanup,
    DocumentsService,
  };
}

function seedCustomerAndProducts(store, localStorage, duplicateBuffer) {
  const customer = {
    customerId: 'cust-apply',
    customerName: 'Apply Customer',
    customerShortName: 'AC',
  };
  const existingProduct = {
    productId: 'prod-existing',
    customerId: customer.customerId,
    productModel: 'HL-EXIST-2002B',
    normalizedProductModel: 'HL-EXIST-2002B',
    productName: 'Existing Harness',
    drawingStatus: 'no_drawing',
  };
  const duplicateProduct = {
    productId: 'prod-duplicate',
    customerId: customer.customerId,
    productModel: 'HL-DUP-3003C',
    normalizedProductModel: 'HL-DUP-3003C',
    productName: 'Duplicate Harness',
    drawingStatus: 'no_drawing',
  };
  store.writeCustomers([customer]);
  store.writeProducts([existingProduct, duplicateProduct]);
  store.upsertDetail(store.makeProductDetail(customer, existingProduct));
  store.upsertDetail(store.makeProductDetail(customer, duplicateProduct));

  localStorage.writeDocumentsSync([
    {
      id: 'doc-existing-effective',
      documentId: 'doc-existing-effective',
      productId: existingProduct.productId,
      documentType: 'drawing_pdf',
      title: 'Existing effective drawing',
      version: 'Rev.A',
      status: '有效',
      documentStatus: 'effective',
      effectiveDate: '2026-06-20',
      updatedAt: '2026-06-20T00:00:00.000Z',
      createdAt: '2026-06-20T00:00:00.000Z',
      source: 'manual_upload',
      requiredForProcess: 'common',
      previewType: 'pdf',
      mockPreviewText: 'existing',
      keywords: ['HL-EXIST-2002B'],
      description: 'existing',
      localMockLabel: 'PDF drawing',
      originalFileName: 'HL-EXIST-2002B Rev.A.pdf',
      checksumSha256: sha256(minimalPdfBuffer('existing-old')),
      mimeType: 'application/pdf',
      fileSize: 128,
      archived: false,
      versionGroupKey: `${existingProduct.productId}::drawing_pdf::common`,
    },
    {
      id: 'doc-duplicate',
      documentId: 'doc-duplicate',
      productId: duplicateProduct.productId,
      documentType: 'drawing_pdf',
      title: 'Duplicate drawing',
      version: 'Rev.A',
      status: '有效',
      documentStatus: 'effective',
      effectiveDate: '2026-06-20',
      updatedAt: '2026-06-20T00:00:00.000Z',
      createdAt: '2026-06-20T00:00:00.000Z',
      source: 'manual_upload',
      requiredForProcess: 'common',
      previewType: 'pdf',
      mockPreviewText: 'duplicate',
      keywords: ['HL-DUP-3003C'],
      description: 'duplicate',
      localMockLabel: 'PDF drawing',
      originalFileName: 'HL-DUP-3003C Rev.A.pdf',
      checksumSha256: sha256(duplicateBuffer),
      mimeType: 'application/pdf',
      fileSize: duplicateBuffer.length,
      archived: false,
      versionGroupKey: `${duplicateProduct.productId}::drawing_pdf::common`,
    },
  ]);
  return { customer, existingProduct, duplicateProduct };
}

async function checkSuccessfulApplyAndIdempotency() {
  const runtime = createRuntime();
  try {
    await runtime.service.onModuleInit();
    const duplicateBuffer = minimalPdfBuffer('duplicate');
    const { customer, existingProduct, duplicateProduct } = seedCustomerAndProducts(runtime.store, runtime.localStorage, duplicateBuffer);
    const newBuffer = minimalPdfBuffer('new-product');
    const existingNewBuffer = minimalPdfBuffer('existing-new');
    const preview = await runtime.controller.previewPdfImport(
      { customerId: customer.customerId },
      {
        files: [
          makeFile('HL-NEW-1001A.pdf', newBuffer),
          makeFile('HL-EXIST-2002B Rev.B.pdf', existingNewBuffer),
          makeFile('HL-DUP-3003C Rev.A.pdf', duplicateBuffer),
        ],
      },
    );
    assertSafeResponse(preview, runtime.tempRoot);
    assert(byName(preview, 'HL-NEW-1001A.pdf')?.action === 'create_product', 'Apply check setup should preview a new product.');
    assert(byName(preview, 'HL-EXIST-2002B Rev.B.pdf')?.action === 'add_version', 'Apply check setup should preview an added version.');
    assert(byName(preview, 'HL-DUP-3003C Rev.A.pdf')?.action === 'skip_duplicate', 'Apply check setup should preview a duplicate skip.');

    const beforeDocumentCount = runtime.localStorage.readDocumentsSync().length;
    const beforeUploadCount = listFilesRecursive(runtime.config.uploadsRoot).length;
    const apply = await runtime.controller.applyPdfImport({
      importBatchId: preview.importBatchId,
      items: requestForItems(preview.items, {
        checksumSha256: 'client-tamper-value',
        stagedFileKey: '../../client-tamper.pdf',
      }),
      remark: 'apply check',
      operatorId: 'tester',
      operatorName: 'Apply Tester',
    });
    assertSafeResponse(apply, runtime.tempRoot);
    assert(apply.status === 'completed', 'Successful apply with duplicate skips should complete.');
    assert(apply.summary.createdProduct === 1, 'Apply should create one product.');
    assert(apply.summary.addedVersion === 1, 'Apply should add one version.');
    assert(apply.summary.skippedDuplicate === 1, 'Apply should skip one duplicate.');

    const documents = runtime.localStorage.readDocumentsSync();
    const pdfImportDocuments = documents.filter((document) => document.source === 'pdf_import');
    assert(documents.length === beforeDocumentCount + 2, 'Apply should create formal metadata only for imported PDFs.');
    assert(pdfImportDocuments.length === 2, 'Formal PDF import documents should be marked source=pdf_import.');
    assert(pdfImportDocuments.every((document) => document.storageProvider === 'local' && document.storageKey?.startsWith('documents/')), 'Imported PDFs should be written through StorageService.');
    assert(pdfImportDocuments.every((document) => existsSync(join(runtime.config.uploadsRoot, document.storageKey))), 'Formal StorageService files should exist.');
    assert(listFilesRecursive(runtime.config.uploadsRoot).length === beforeUploadCount + 2, 'Apply should write two formal upload files.');
    assert(pdfImportDocuments.some((document) => document.checksumSha256 === sha256(newBuffer)), 'Formal metadata should use server-side staged checksum, not client tamper values.');

    const existingVersions = documents.filter((document) => document.productId === existingProduct.productId && document.documentType === 'drawing_pdf');
    assert(existingVersions.some((document) => document.source === 'pdf_import' && document.documentStatus === 'effective'), 'Added version should become effective when requested.');
    assert(existingVersions.some((document) => document.documentId === 'doc-existing-effective' && document.documentStatus === 'expired'), 'Setting effective should expire the previous version.');
    assert(!documents.some((document) => document.productId === duplicateProduct.productId && document.source === 'pdf_import'), 'Duplicate skip must not create formal metadata.');

    const createdProduct = runtime.store.readProducts().find((product) => product.normalizedProductModel === 'HL-NEW-1001A');
    assert(createdProduct?.source === 'pdf_import', 'New product should be created from pdf_import source.');
    assert(createdProduct?.drawingStatus !== 'no_drawing', 'Product drawing status should be updated after apply.');
    const createdDetail = runtime.store.readDetails().find((detail) => detail.product.productId === createdProduct?.productId);
    assert(createdDetail?.modules.length === 6, 'New product should have six modules.');
    const originalModule = createdDetail?.modules.find((module) => module.moduleKey === 'original_drawing');
    assert(originalModule?.status === 'uploaded', 'Original drawing module status should be uploaded.');
    assert(originalModule?.items.some((item) => item.source === 'pdf_import'), 'Original module should contain imported PDF drawing item.');

    const audits = runtime.localStorage.readAuditLogsSync();
    assert(audits.some((audit) => audit.action === 'pdf_drawing_imported'), 'Apply should write drawing import audit records.');
    assert(audits.some((audit) => audit.action === 'pdf_import_product_created'), 'Apply should audit new product creation.');

    const getPreview = await runtime.controller.getPdfImportPreview(preview.importBatchId);
    assert(getPreview.applySummary?.createdProduct === 1, 'Preview GET should expose applySummary after apply.');
    assert(getPreview.applyItems?.length === 3, 'Preview GET should expose safe applyItems after apply.');
    assertSafeResponse(getPreview, runtime.tempRoot);

    const tempBatchDir = join(runtime.config.tempRoot, 'pdf-import', preview.importBatchId);
    assert(!existsSync(tempBatchDir), 'Completed apply should remove temp PDF batch directory.');

    const repeat = await runtime.controller.applyPdfImport({
      importBatchId: preview.importBatchId,
      items: requestForItems(preview.items),
    });
    assert(repeat.status === apply.status, 'Completed apply should be idempotent.');
    assert(runtime.localStorage.readDocumentsSync().length === documents.length, 'Idempotent apply must not create duplicate metadata.');
  } finally {
    runtime.cleanup();
  }
}

async function checkPartialFailureAndRetry() {
  const runtime = createRuntime();
  try {
    await runtime.service.onModuleInit();
    const customer = { customerId: 'cust-partial', customerName: 'Partial Customer', customerShortName: 'PC' };
    runtime.store.writeCustomers([customer]);
    runtime.store.writeProducts([]);

    const okFileName = 'HL-OK-5005E.pdf';
    const badFileName = 'HL-BAD-5006F.pdf';
    const needsFileName = 'drawing Rev.A.pdf';
    const preview = await runtime.controller.previewPdfImport(
      { customerId: customer.customerId },
      {
        files: [
          makeFile(okFileName, minimalPdfBuffer('partial-ok')),
          makeFile(badFileName, minimalPdfBuffer('partial-bad')),
          makeFile(needsFileName, minimalPdfBuffer('partial-needs')),
        ],
      },
    );

    const batch = runtime.store.readImportRecords().find((record) => record.importBatchId === preview.importBatchId);
    const badPreviewRecord = batch.items.find((item) => item.originalFileName === badFileName);
    const badPath = runtime.tempStorage.pathFromStagedFileKey(badPreviewRecord.stagedFileKey);
    const badBytes = Buffer.from(readFileSync(badPath));
    badBytes[badBytes.length - 1] = badBytes[badBytes.length - 1] === 48 ? 49 : 48;
    writeFileSync(badPath, badBytes);

    const apply = await runtime.controller.applyPdfImport({
      importBatchId: preview.importBatchId,
      items: [
        { importItemId: byName(preview, okFileName).importItemId, selected: true, confirmedProductModel: 'HL-OK-5005E' },
        { importItemId: byName(preview, badFileName).importItemId, selected: true, confirmedProductModel: 'HL-BAD-5006F' },
        { importItemId: byName(preview, needsFileName).importItemId, selected: true },
      ],
    });
    assert(apply.status === 'partially_applied', 'Mixed success/failure apply should be partially_applied.');
    assert(apply.summary.createdProduct === 1, 'Partial apply should keep the successful item.');
    assert(apply.summary.error === 1, 'Tampered staged PDF should be reported as an item error.');
    assert(apply.summary.needsConfirmation === 1, 'Unconfirmed model should remain needs_confirmation.');
    assert(runtime.store.readProducts().some((product) => product.normalizedProductModel === 'HL-OK-5005E'), 'Successful item should persist despite other item failures.');

    const retry = await runtime.controller.applyPdfImport({
      importBatchId: preview.importBatchId,
      items: [
        {
          importItemId: byName(preview, needsFileName).importItemId,
          selected: true,
          confirmedProductModel: 'HL-FIX-5007G',
          productName: 'Fixed model product',
        },
      ],
      remark: 'retry fixed model',
    });
    assert(retry.summary.createdProduct === 2, 'Partial retry should apply corrected model without redoing previous success.');
    assert(runtime.store.readProducts().some((product) => product.normalizedProductModel === 'HL-FIX-5007G'), 'Corrected model should be created on retry.');
  } finally {
    runtime.cleanup();
  }
}

async function checkSkippedUserAndBatchValidation() {
  const runtime = createRuntime();
  try {
    await runtime.service.onModuleInit();
    const customer = { customerId: 'cust-validation', customerName: 'Validation Customer', customerShortName: 'VC' };
    runtime.store.writeCustomers([customer]);
    runtime.store.writeProducts([]);
    const preview = await runtime.controller.previewPdfImport(
      { customerId: customer.customerId },
      { files: [makeFile('HL-SKIP-6006F.pdf', minimalPdfBuffer('skip'))] },
    );
    const item = preview.items[0];
    const batch = runtime.store.readImportRecords().find((record) => record.importBatchId === preview.importBatchId);
    const stagedPath = runtime.tempStorage.pathFromStagedFileKey(batch.items[0].stagedFileKey);
    assert(existsSync(stagedPath), 'Skipped-user setup should have staged file.');
    const apply = await runtime.controller.applyPdfImport({
      importBatchId: preview.importBatchId,
      items: [{ importItemId: item.importItemId, selected: false }],
    });
    assert(apply.summary.skippedByUser === 1, 'selected=false should become skipped_by_user.');
    assert(existsSync(stagedPath), 'selected=false should keep the staged PDF until batch expiry.');

    const validationPreview = await runtime.controller.previewPdfImport(
      { customerId: customer.customerId },
      { files: [makeFile('HL-VALID-7007G.pdf', minimalPdfBuffer('validation'))] },
    );
    const validationItem = validationPreview.items[0];
    await expectHttpStatus(
      () => runtime.controller.applyPdfImport({
        importBatchId: validationPreview.importBatchId,
        items: [{ importItemId: 'PDFITEM-not-in-batch', selected: true, confirmedProductModel: 'HL-VALID-7007G' }],
      }),
      400,
      'Apply should reject item IDs outside the server-side batch.',
    );
    await expectHttpStatus(
      () => runtime.controller.applyPdfImport({
        importBatchId: validationPreview.importBatchId,
        items: [
          { importItemId: validationItem.importItemId, selected: true, confirmedProductModel: 'HL-VALID-7007G' },
          { importItemId: validationItem.importItemId, selected: true, confirmedProductModel: 'HL-VALID-7007G' },
        ],
      }),
      400,
      'Apply should reject duplicate submitted item IDs.',
    );

    const records = runtime.store.readImportRecords();
    const current = records.find((record) => record.importBatchId === validationPreview.importBatchId);
    runtime.store.writeImportRecords(records.map((record) => (
      record.importBatchId === validationPreview.importBatchId ? { ...record, status: 'applying', applyStatus: 'applying' } : record
    )));
    await expectHttpStatus(
      () => runtime.controller.applyPdfImport({
        importBatchId: validationPreview.importBatchId,
        items: [{ importItemId: validationItem.importItemId, selected: true, confirmedProductModel: 'HL-VALID-7007G' }],
      }),
      409,
      'Apply should reject batches already marked applying.',
    );

    runtime.store.writeImportRecords(records.map((record) => (
      record.importBatchId === validationPreview.importBatchId
        ? { ...current, expiresAt: new Date(Date.now() - 1000).toISOString(), status: 'previewed', applyStatus: 'idle' }
        : record
    )));
    await expectHttpStatus(
      () => runtime.controller.applyPdfImport({
        importBatchId: validationPreview.importBatchId,
        items: [{ importItemId: validationItem.importItemId, selected: true, confirmedProductModel: 'HL-VALID-7007G' }],
      }),
      410,
      'Apply should reject expired preview batches.',
    );
  } finally {
    runtime.cleanup();
  }
}

async function checkCompensationCleanup() {
  const runtime = createRuntime();
  try {
    const failingRepository = {
      findDocuments() {
        return [];
      },
      createDocument() {
        throw new Error('metadata write failed');
      },
    };
    const failingDocumentsService = new runtime.DocumentsService(failingRepository, runtime.storageService, runtime.auditService);
    const beforeFiles = listFilesRecursive(runtime.config.uploadsRoot).length;
    try {
      await failingDocumentsService.createStoredDocumentMetadata({
        productId: 'prod-compensation',
        documentType: 'drawing_pdf',
        title: 'Compensation document',
        version: 'Rev.A',
        status: 'effective',
        source: 'pdf_import',
        requiredForProcess: 'common',
        originalFileName: 'HL-COMP-8008H.pdf',
        mimeType: 'application/pdf',
        fileSize: minimalPdfBuffer('compensation').length,
        buffer: minimalPdfBuffer('compensation'),
        skipAudit: true,
      });
      assert(false, 'Compensation setup should throw.');
    } catch {
      assert(listFilesRecursive(runtime.config.uploadsRoot).length === beforeFiles, 'Stored file should be deleted when formal metadata creation fails.');
    }

    await runtime.service.onModuleInit();
    const customer = { customerId: 'cust-rollback', customerName: 'Rollback Customer', customerShortName: 'RC' };
    runtime.store.writeCustomers([customer]);
    runtime.store.writeProducts([]);
    const preview = await runtime.controller.previewPdfImport(
      { customerId: customer.customerId },
      { files: [makeFile('HL-ROLL-9009J.pdf', minimalPdfBuffer('rollback'))] },
    );
    const fakeDocumentsService = {
      async findAll() {
        return [];
      },
      async createStoredDocumentMetadata() {
        throw new Error('formal write failed');
      },
    };
    const { PdfImportApplyService } = createRequire(import.meta.url)(join(root, 'apps/api/dist/src/document-hub/pdf-import-apply.service.js'));
    const failingApply = new PdfImportApplyService(runtime.store, fakeDocumentsService, runtime.tempStorage, runtime.auditService);
    const result = await failingApply.apply({
      importBatchId: preview.importBatchId,
      items: [{ importItemId: preview.items[0].importItemId, selected: true, confirmedProductModel: 'HL-ROLL-9009J' }],
    });
    assert(result.summary.error === 1, 'Apply item should report error when formal document write fails.');
    assert(!runtime.store.readProducts().some((product) => product.normalizedProductModel === 'HL-ROLL-9009J'), 'New product should be rolled back when its formal document write fails.');
  } finally {
    runtime.cleanup();
  }
}

function checkSourceSurface() {
  const controllerSource = readFileSync(join(root, 'apps/api/src/document-hub/document-hub.controller.ts'), 'utf8');
  const serviceSource = readFileSync(join(root, 'apps/api/src/document-hub/pdf-import-apply.service.ts'), 'utf8');
  assert(controllerSource.includes("@Post('drawings/pdf-import/apply')"), 'Controller should expose POST /drawings/pdf-import/apply.');
  assert(serviceSource.includes('applyingLocks'), 'Apply service should include a process-level applying lock.');
  assert(serviceSource.includes('readStagedPdf'), 'Apply service should re-read staged PDF server-side.');
  assert(serviceSource.includes("source: 'pdf_import'"), 'Apply service should mark formal metadata as pdf_import.');
}

console.log('PDF import apply check');
console.log('This check uses isolated temp metadata/temp/uploads and does not connect to a database or network.');

runApiBuild();
if (!blockers.length) {
  checkSourceSurface();
  await checkSuccessfulApplyAndIdempotency();
  await checkPartialFailureAndRetry();
  await checkSkippedUserAndBatchValidation();
  await checkCompensationCleanup();
}

if (blockers.length) {
  console.error('\nPDF import apply check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('PDF import apply check passed.');
