import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function runApiBuild() {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm run build -w api'] : ['run', 'build', '-w', 'api'];
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error) assert(false, `API build could not start: ${result.error.message}`);
  assert(result.status === 0, 'API build failed before document version backend check.');
}

function block(source, name) {
  const start = source.indexOf(name);
  if (start < 0) return '';
  const next = source.indexOf('\n  ', start + name.length);
  return source.slice(start, next < 0 ? source.length : next);
}

function docId(document) {
  return document.documentId ?? document.id;
}

function auditCount(runtime, action) {
  return runtime.localStorage.readAuditLogsSync().filter((item) => item.action === action).length;
}

function findDocument(runtime, id) {
  return runtime.localStorage.readDocumentsSync().find((document) => docId(document) === id);
}

async function expectHttpStatus(action, status, message) {
  try {
    await action();
    assert(false, message);
  } catch (error) {
    const actual = typeof error?.getStatus === 'function' ? error.getStatus() : error?.status;
    assert(actual === status, `${message} Expected HTTP ${status}, got ${actual ?? 'unknown'}.`);
  }
}

function minimalPdfBuffer(label) {
  return Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n% ${label}\ntrailer\n<<>>\n%%EOF\n`);
}

function minimalPngBuffer() {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f,
    0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59,
    0xe7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
    0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
}

function immutableFields(document) {
  return {
    storageKey: document.storageKey,
    checksumSha256: document.checksumSha256,
    mimeType: document.mimeType,
    fileSize: document.fileSize,
    originalFileName: document.originalFileName,
  };
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
  const tempRoot = mkdtempSync(join(tmpdir(), 'hanglian-document-version-'));
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
  const { DocumentVersionService } = require(join(root, 'apps/api/dist/src/document-hub/document-version.service.js'));
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
  const store = new DrawingMetadataStore(localStorage);
  const versionService = new DocumentVersionService(store, localStorage, auditService);

  function cleanup() {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(tempRoot, { recursive: true, force: true });
  }

  return {
    localStorage,
    documentsService,
    auditService,
    store,
    versionService,
    documentToLifecycleItem,
    cleanup,
  };
}

function seedProduct(runtime) {
  const customer = {
    customerId: 'cust-version-main',
    customerName: 'Version Customer',
    customerShortName: 'VC',
  };
  const product = {
    productId: 'prod-version-main',
    customerId: customer.customerId,
    productModel: 'HL-VERSION-001',
    normalizedProductModel: 'HL-VERSION-001',
    productName: 'Version Product',
    drawingStatus: 'no_drawing',
    source: 'manual_create',
  };
  runtime.store.writeCustomers([customer]);
  runtime.store.writeProducts([product]);
  runtime.store.upsertDetail(runtime.store.makeProductDetail(customer, product));
  return { customer, product };
}

function attachItems(runtime, productId, moduleKey, documents, coverDocumentId) {
  const detail = runtime.store.readDetails().find((item) => item.product.productId === productId);
  const module = detail.modules.find((item) => item.moduleKey === moduleKey);
  module.items = documents.map((document) => runtime.documentToLifecycleItem(document));
  module.status = module.items.length ? 'uploaded' : 'pending';
  module.itemCount = module.items.length;
  module.coverDocumentId = coverDocumentId;
  runtime.store.upsertDetail(detail);
}

async function createDocument(runtime, product, input) {
  return runtime.documentsService.createStoredDocumentMetadata({
    documentId: input.documentId,
    productId: product.productId,
    documentType: input.documentType,
    title: input.title,
    version: input.version,
    status: input.status,
    source: 'manual_upload',
    requiredForProcess: input.requiredForProcess,
    keywords: input.keywords ?? [product.productModel, input.version],
    remark: input.remark ?? input.title,
    originalFileName: input.originalFileName,
    mimeType: input.mimeType,
    fileSize: input.buffer.length,
    buffer: input.buffer,
    skipAudit: true,
  });
}

function addPlaceholder(runtime, productId) {
  const detail = runtime.store.readDetails().find((item) => item.product.productId === productId);
  const module = detail.modules.find((item) => item.moduleKey === 'notes');
  module.items.push({
    itemId: 'placeholder-note',
    title: 'System placeholder',
    fileType: 'card',
    fileName: 'placeholder',
    version: '-',
    uploadedAt: new Date().toISOString(),
    source: 'seed',
    status: 'pending_review',
    documentStatus: 'pending_review',
  });
  module.itemCount = module.items.length;
  runtime.store.upsertDetail(detail);
}

async function runBehaviorCheck() {
  const runtime = createRuntime();
  try {
    const { product } = seedProduct(runtime);
    const first = await createDocument(runtime, product, {
      documentId: 'doc-version-first',
      documentType: 'drawing_pdf',
      requiredForProcess: 'common',
      title: 'First drawing',
      version: 'A',
      status: 'effective',
      originalFileName: 'first.pdf',
      mimeType: 'application/pdf',
      buffer: minimalPdfBuffer('first'),
    });
    const second = await createDocument(runtime, product, {
      documentId: 'doc-version-second',
      documentType: 'drawing_pdf',
      requiredForProcess: 'common',
      title: 'Second drawing',
      version: 'B',
      status: 'pending_review',
      originalFileName: 'second.pdf',
      mimeType: 'application/pdf',
      buffer: minimalPdfBuffer('second'),
    });
    const image = await createDocument(runtime, product, {
      documentId: 'doc-version-image',
      documentType: 'finished_detail_image',
      requiredForProcess: 'back',
      title: 'Finished image',
      version: 'IMG',
      status: 'pending_review',
      originalFileName: 'finished.png',
      mimeType: 'image/png',
      buffer: minimalPngBuffer(),
    });

    attachItems(runtime, product.productId, 'original_drawing', [first, second], first.documentId);
    attachItems(runtime, product.productId, 'finished_images', [image], image.documentId);
    addPlaceholder(runtime, product.productId);

    const beforeSecond = immutableFields(findDocument(runtime, second.documentId));
    await runtime.versionService.updateMetadata(product.productId, 'original_drawing', second.documentId, {
      title: ' Second drawing revised ',
      version: ' B2 ',
      keywords: [' main ', 'main', '', ' pdf '],
      remark: ' Revised remark ',
      operatorName: 'checker',
    });
    const afterSecond = findDocument(runtime, second.documentId);
    assert(afterSecond.title === 'Second drawing revised', 'metadata edit should trim and update title.');
    assert(afterSecond.version === 'B2', 'metadata edit should trim and update version.');
    assert(afterSecond.remark === 'Revised remark', 'metadata edit should trim and update remark.');
    assert(JSON.stringify(afterSecond.keywords) === JSON.stringify(['main', 'pdf']), 'metadata edit should clean keywords.');
    assert(JSON.stringify(immutableFields(afterSecond)) === JSON.stringify(beforeSecond), 'metadata edit must not modify file body fields.');
    assert(auditCount(runtime, 'document_metadata_updated') === 1, 'metadata edit should write one audit record.');

    await runtime.versionService.setEffective(product.productId, 'original_drawing', second.documentId, {
      operatorName: 'checker',
    });
    const effectiveSecond = findDocument(runtime, second.documentId);
    const expiredFirst = findDocument(runtime, first.documentId);
    assert(effectiveSecond.documentStatus === 'effective', 'set-effective should promote target to effective.');
    assert(Boolean(effectiveSecond.effectiveDate), 'set-effective should write effectiveDate.');
    assert(expiredFirst.documentStatus === 'expired', 'set-effective should expire same group current effective document.');
    const originalModule = runtime.store.readDetails()[0].modules.find((module) => module.moduleKey === 'original_drawing');
    assert(originalModule.coverDocumentId === second.documentId, 'set-effective should set the module cover by default.');
    assert(auditCount(runtime, 'document_set_effective') === 1, 'set-effective should write one audit record.');
    const idempotentEffective = await runtime.versionService.setEffective(product.productId, 'original_drawing', second.documentId, {});
    assert(idempotentEffective.idempotent === true, 'set-effective should be idempotent.');
    assert(auditCount(runtime, 'document_set_effective') === 1, 'idempotent set-effective must not write duplicate audits.');

    const statusBeforeCover = runtime.localStorage.readDocumentsSync().map((document) => [docId(document), document.documentStatus]);
    await runtime.versionService.setCover(product.productId, 'original_drawing', first.documentId, {
      operatorName: 'checker',
    });
    const coverModule = runtime.store.readDetails()[0].modules.find((module) => module.moduleKey === 'original_drawing');
    assert(coverModule.coverDocumentId === first.documentId, 'set-cover should update coverDocumentId.');
    const statusAfterCover = runtime.localStorage.readDocumentsSync().map((document) => [docId(document), document.documentStatus]);
    assert(JSON.stringify(statusAfterCover) === JSON.stringify(statusBeforeCover), 'set-cover must not change document statuses.');
    assert(auditCount(runtime, 'document_cover_updated') === 1, 'set-cover should write one audit record.');
    const idempotentCover = await runtime.versionService.setCover(product.productId, 'original_drawing', first.documentId, {});
    assert(idempotentCover.idempotent === true, 'set-cover should be idempotent.');
    assert(auditCount(runtime, 'document_cover_updated') === 1, 'idempotent set-cover must not write duplicate audits.');

    await expectHttpStatus(
      () => runtime.versionService.setEffective(product.productId, 'finished_images', image.documentId, {}),
      400,
      'finished_images must reject set-effective.',
    );
    await expectHttpStatus(
      () => runtime.versionService.updateMetadata(product.productId, 'notes', 'placeholder-note', { title: 'Nope' }),
      409,
      'placeholder module items must reject maintenance.',
    );
  } finally {
    runtime.cleanup();
  }
}

function runStaticCheck() {
  const files = {
    controller: 'apps/api/src/document-hub/document-hub.controller.ts',
    service: 'apps/api/src/document-hub/document-hub.service.ts',
    versionService: 'apps/api/src/document-hub/document-version.service.ts',
    dto: 'apps/api/src/document-hub/dto/document-metadata.dto.ts',
    store: 'apps/api/src/document-hub/drawing-metadata.store.ts',
    module: 'apps/api/src/document-hub/document-hub.module.ts',
  };
  for (const [label, file] of Object.entries(files)) {
    assert(existsSync(join(root, file)), `${label} file is missing: ${file}`);
  }

  const controller = read(files.controller);
  const service = read(files.service);
  const versionService = read(files.versionService);
  const dto = read(files.dto);
  const store = read(files.store);
  const module = read(files.module);

  assert(controller.includes("@Patch('drawings/products/:productId/modules/:moduleKey/items/:itemId')"), 'metadata PATCH route is missing.');
  assert(controller.includes("set-effective") && controller.includes("set-cover"), 'set-effective or set-cover route is missing.');
  assert(module.includes('DocumentVersionService'), 'DocumentVersionService must be registered in the module.');
  assert(service.includes('requireDocumentVersionService') && service.includes('safeDocumentVersionDetail'), 'DocumentHubService must delegate to DocumentVersionService and redact responses.');
  assert(service.includes('storageKey: _storageKey') && service.includes('checksumSha256: _checksumSha256'), 'version responses should strip storageKey and checksum.');
  assert([
    'UpdateDrawingDocumentMetadataDto',
    'title?: string',
    'version?: string',
    'keywords?: string[]',
    'remark?: string',
    'operatorId?: string',
    'operatorName?: string',
  ].every((text) => dto.includes(text)), 'metadata DTO fields are incomplete.');
  assert(versionService.includes('document_metadata_updated'), 'metadata edit audit is missing.');
  assert(versionService.includes('document_set_effective'), 'set-effective audit is missing.');
  assert(versionService.includes('document_cover_updated'), 'set-cover audit is missing.');
  assert(
    versionService.includes('supportsSingleEffectiveVersion(moduleKey)')
      && !versionService.includes('effectiveModuleKeys'),
    'finished_images must be excluded from set-effective.',
  );
  assert(versionService.includes('documentLocks') && versionService.includes('withDocumentLock'), 'document version mutations need a per-document lock.');
  assert(versionService.includes('idempotent') && versionService.includes('auditWritten: false'), 'idempotent handling is missing.');
  assert(versionService.includes('isFormalLifecycleDocument') && versionService.includes('ConflictException(placeholderMessage)'), 'formal metadata and placeholder protection are required.');
  assert(versionService.includes('normalizeKeywords') && versionService.includes('new Set'), 'keyword cleanup must remove empty values and duplicates.');
  assert(!block(versionService, 'updateMetadata').includes('storageKey:') && !block(versionService, 'updateMetadata').includes('checksumSha256:'), 'metadata edit must not rewrite storageKey or checksum.');
  assert(store.includes('coverDocumentId') && store.includes('isCover') && store.includes('versionGroupKey'), 'DrawingMetadataStore must persist cover/version fields.');
  assert(!/DATABASE_URL|PrismaClient|db push|migrate|Sealos|S3/i.test(versionService + dto), 'document version backend must not connect database/cloud deployment paths.');
}

runApiBuild();
runStaticCheck();
await runBehaviorCheck();

if (failures.length) {
  console.error('document-version-backend check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('document-version-backend check passed');
