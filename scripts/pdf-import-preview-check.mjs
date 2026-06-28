import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

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
  assert(result.status === 0, 'API build failed before PDF import preview check.');
}

class IsolatedMetadataStorage {
  constructor(storageRoot) {
    this.storageRoot = storageRoot;
    this.metadataDir = join(storageRoot, 'metadata');
    this.tempDir = join(storageRoot, 'temp');
    this.uploadsDir = join(storageRoot, 'uploads');
    mkdirSync(this.metadataDir, { recursive: true });
    mkdirSync(this.tempDir, { recursive: true });
    mkdirSync(this.uploadsDir, { recursive: true });
  }

  getMetadataDir() {
    return this.metadataDir;
  }

  getTempDir() {
    return this.tempDir;
  }

  getUploadsDir() {
    return this.uploadsDir;
  }

  readMetadataArraySync(fileName, fallback = []) {
    const file = this.metadataFilePath(fileName);
    if (!existsSync(file)) this.writeJsonAtomicSync(file, fallback);
    return this.readJsonFileSync(file, fallback);
  }

  writeMetadataArraySync(fileName, records) {
    this.writeJsonAtomicSync(this.metadataFilePath(fileName), records);
  }

  readMetadataSync(fileName, fallback) {
    const file = this.metadataFilePath(fileName);
    if (!existsSync(file)) this.writeJsonAtomicSync(file, fallback);
    return this.readJsonFileSync(file, fallback);
  }

  writeMetadataSync(fileName, value) {
    this.writeJsonAtomicSync(this.metadataFilePath(fileName), value);
  }

  readDocumentsSync() {
    return this.readJsonFileSync(join(this.metadataDir, 'documents.json'), []);
  }

  writeDocumentsSync(documents) {
    this.writeJsonAtomicSync(join(this.metadataDir, 'documents.json'), documents);
  }

  metadataFilePath(fileName) {
    if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) {
      throw new Error(`Unsafe metadata file name in check: ${fileName}`);
    }
    return join(this.metadataDir, fileName);
  }

  readJsonFileSync(file, fallback) {
    try {
      return JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      return fallback;
    }
  }

  writeJsonAtomicSync(file, value) {
    mkdirSync(this.tempDir, { recursive: true });
    const tempFile = join(this.tempDir, `${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
    writeFileSync(tempFile, JSON.stringify(value, null, 2), 'utf8');
    renameSync(tempFile, file);
  }
}

class FakeDocumentsService {
  constructor(documents = []) {
    this.documents = documents;
  }

  async findAll(query) {
    return this.documents.filter((document) => {
      if (query?.productId && document.productId !== query.productId) return false;
      if (query?.documentType && document.documentType !== query.documentType) return false;
      return true;
    });
  }
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
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const absolutePath = join(dir, entry.name);
    return entry.isDirectory() ? listFilesRecursive(absolutePath) : [absolutePath];
  });
}

function assertSafeResponse(response, tempRoot) {
  const text = JSON.stringify(response);
  assert(!text.includes('stagedFileKey'), 'Safe response must not include stagedFileKey.');
  assert(!text.includes('stagedFileName'), 'Safe response must not include stagedFileName.');
  assert(!text.includes(resolve(tempRoot)), 'Safe response must not include absolute temp paths.');
  assert(!text.includes('STORAGE_TEMP_ROOT'), 'Safe response must not expose env names.');
}

function actionFor(response, originalFileName) {
  return response.items.find((item) => item.originalFileName === originalFileName)?.action;
}

function createRuntime(documents = []) {
  const require = createRequire(import.meta.url);
  const { DrawingMetadataStore } = require(join(root, 'apps/api/dist/src/document-hub/drawing-metadata.store.js'));
  const { DocumentHubService } = require(join(root, 'apps/api/dist/src/document-hub/document-hub.service.js'));
  const { DocumentHubController } = require(join(root, 'apps/api/dist/src/document-hub/document-hub.controller.js'));
  const { PdfImportPreviewService } = require(join(root, 'apps/api/dist/src/document-hub/pdf-import-preview.service.js'));
  const { PdfImportTempStorageService } = require(join(root, 'apps/api/dist/src/document-hub/pdf-import-temp-storage.service.js'));
  const { parseProductModelFromPdfName } = require(join(root, 'apps/api/dist/src/document-hub/helpers/pdf-name-parser.js'));

  const tempRoot = mkdtempSync(join(tmpdir(), 'hanglian-pdf-import-preview-'));
  const storage = new IsolatedMetadataStorage(tempRoot);
  const store = new DrawingMetadataStore(storage);
  const documentsService = new FakeDocumentsService(documents);
  const tempStorage = new PdfImportTempStorageService(storage);
  const previewService = new PdfImportPreviewService(store, documentsService, tempStorage);
  const service = new DocumentHubService(
    documentsService,
    storage,
    {},
    { assertVerified() {} },
    store,
    previewService,
  );
  const controller = new DocumentHubController(service);

  return { tempRoot, storage, store, tempStorage, previewService, service, controller, parseProductModelFromPdfName };
}

async function expectHttpStatus(action, status, message) {
  try {
    await action();
    assert(false, message);
  } catch (error) {
    assert(error?.status === status, `${message} Expected HTTP ${status}, got ${error?.status ?? 'unknown'}.`);
  }
}

function seedDrawingData(store, duplicateChecksum) {
  const customer = {
    customerId: 'cust-preview',
    customerName: 'Preview Customer',
    customerShortName: 'PC',
  };
  const existingProduct = {
    productId: 'prod-front',
    customerId: customer.customerId,
    productModel: 'HL-FRONT-2210A',
    productName: 'Front Harness',
    drawingStatus: 'no_drawing',
  };
  const duplicateProduct = {
    productId: 'prod-ctrl',
    customerId: customer.customerId,
    productModel: 'HL-CTRL-1907B',
    productName: 'Control Harness',
    drawingStatus: 'no_drawing',
  };
  const deletedCustomer = {
    customerId: 'cust-deleted',
    customerName: 'Deleted Customer',
    customerShortName: 'DEL',
    deletedAt: '2026-06-20T00:00:00.000Z',
  };

  store.writeCustomers([customer, deletedCustomer]);
  store.writeProducts([existingProduct, duplicateProduct]);
  store.upsertDetail(store.makeProductDetail(customer, existingProduct));
  const duplicateDetail = store.makeProductDetail(customer, duplicateProduct);
  duplicateDetail.modules[0].items.push({
    itemId: 'module-duplicate-doc',
    title: 'Existing original drawing',
    fileType: 'pdf',
    fileName: 'HL-CTRL-1907B.pdf',
    version: 'Rev.A',
    uploadedAt: '2026-06-20T00:00:00.000Z',
    source: 'manual_upload',
    checksumSha256: duplicateChecksum,
    fileSize: 1024,
    mimeType: 'application/pdf',
  });
  store.upsertDetail(duplicateDetail);

  return { customer, existingProduct, duplicateProduct };
}

async function checkPdfImportPreview() {
  const previousDemoMode = process.env.DEMO_DATA_MODE;
  process.env.DEMO_DATA_MODE = 'empty';

  const duplicateBuffer = minimalPdfBuffer('duplicate');
  const duplicateChecksum = sha256(duplicateBuffer);
  const formalDocuments = [
    {
      id: 'doc-duplicate',
      documentId: 'doc-duplicate',
      productId: 'prod-ctrl',
      documentType: 'drawing_pdf',
      title: 'Existing drawing',
      version: 'Rev.A',
      source: 'manual_upload',
      archived: false,
      checksumSha256: duplicateChecksum,
      updatedAt: '2026-06-20T00:00:00.000Z',
      createdAt: '2026-06-20T00:00:00.000Z',
      mimeType: 'application/pdf',
      fileSize: duplicateBuffer.length,
    },
    {
      id: 'doc-deleted',
      documentId: 'doc-deleted',
      productId: 'prod-front',
      documentType: 'drawing_pdf',
      title: 'Deleted duplicate should not count',
      version: 'Rev.Old',
      source: 'manual_upload',
      archived: true,
      checksumSha256: sha256(minimalPdfBuffer('front-new')),
    },
  ];

  const { tempRoot, storage, store, tempStorage, service, controller, parseProductModelFromPdfName } = createRuntime(formalDocuments);
  try {
    service.onModuleInit();
    const { customer } = seedDrawingData(store, duplicateChecksum);
    const productsBefore = JSON.stringify(store.readProducts());
    const detailsBefore = JSON.stringify(store.readDetails());
    const documentsBefore = JSON.stringify(formalDocuments);
    const uploadsBefore = listFilesRecursive(storage.uploadsDir).length;

    const files = [
      makeFile('20260619_HL-BACK-3302C_扫描件.pdf', minimalPdfBuffer('new-product')),
      makeFile('HL-FRONT-2210A 图纸 V2.pdf', minimalPdfBuffer('front-new')),
      makeFile('HL-CTRL-1907B_原图_Rev.A.pdf', duplicateBuffer),
      makeFile('图纸_Rev.A.pdf', minimalPdfBuffer('needs-confirmation')),
      makeFile('../../HL-CONN-16P-A.pdf', minimalPdfBuffer('path-traversal-name')),
      makeFile('not-a-pdf.txt', Buffer.from('plain text'), 'text/plain'),
    ];

    const response = await controller.previewPdfImport({ customerId: customer.customerId }, { files });
    assert(response.importBatchId?.startsWith('PDFIMP-'), 'Preview should return an importBatchId.');
    assert(response.status === 'previewed', 'Preview status should be previewed.');
    assert(response.items.length === files.length, 'Preview should return one item per uploaded file.');
    assertSafeResponse(response, tempRoot);

    assert(actionFor(response, '20260619_HL-BACK-3302C_扫描件.pdf') === 'create_product', 'New model should be create_product.');
    assert(actionFor(response, 'HL-FRONT-2210A 图纸 V2.pdf') === 'add_version', 'Existing product with different checksum should be add_version.');
    assert(actionFor(response, 'HL-CTRL-1907B_原图_Rev.A.pdf') === 'skip_duplicate', 'Existing checksum should be skip_duplicate.');
    assert(actionFor(response, '图纸_Rev.A.pdf') === 'needs_confirmation', 'Unreliable filename should be needs_confirmation.');
    assert(actionFor(response, 'not-a-pdf.txt') === 'error', 'Non-PDF file should become a file-level error.');
    assert(response.summary.error === 1, 'Summary should count file-level errors.');
    assert(response.summary.needsConfirmation >= 1, 'Summary should count confirmation-needed items.');

    const parserExpected = parseProductModelFromPdfName('HL-FRONT-2210A 图纸 V2.pdf');
    const parsedItem = response.items.find((item) => item.originalFileName === 'HL-FRONT-2210A 图纸 V2.pdf');
    assert(parsedItem?.parsedProductModel === parserExpected.productModel, 'Preview should use actual parseProductModelFromPdfName result.');
    assert(parsedItem?.parsedVersion === parserExpected.removedVersion, 'Preview should preserve parser version result.');

    const knownParserCases = [
      ['HL-CTRL-1907B_原图_Rev.A.pdf', 'HL-CTRL-1907B', 'Rev.A'],
      ['HL-FRONT-2210A 图纸 V2.pdf', 'HL-FRONT-2210A', 'V2'],
      ['20260619_HL-BACK-3302C_扫描件.pdf', 'HL-BACK-3302C', undefined],
      ['HL-CONN-16P-A.pdf', 'HL-CONN-16P-A', undefined],
      ['２０２６０６１９＿ＨＬ－ＢＡＣＫ－３３０２Ｃ＿原图.pdf', 'HL-BACK-3302C', undefined],
      ['图纸_Rev.A.pdf', '', 'Rev.A'],
      ['20260619.pdf', '', undefined],
    ];
    for (const [fileName, productModel, version] of knownParserCases) {
      const parsed = parseProductModelFromPdfName(fileName);
      assert(parsed.productModel === productModel, `Parser case failed for ${fileName}.`);
      assert(parsed.removedVersion === version, `Parser version case failed for ${fileName}.`);
    }

    const source = readFileSync(join(root, 'apps/api/src/document-hub/pdf-import-preview.service.ts'), 'utf8');
    assert(source.includes('parseProductModelFromPdfName'), 'Preview service source should call parseProductModelFromPdfName.');

    const batch = store.readImportRecords().find((item) => item.importBatchId === response.importBatchId);
    assert(batch?.status === 'previewed', 'Preview batch should be persisted.');
    assert(batch?.expiresAt, 'Preview batch should include expiresAt.');
    const expiresInMs = new Date(batch?.expiresAt ?? 0).getTime() - new Date(batch?.createdAt ?? 0).getTime();
    assert(expiresInMs > 23 * 60 * 60 * 1000 && expiresInMs <= 24 * 60 * 60 * 1000, 'Preview expiry should be about 24 hours.');

    const stagedItems = batch.items.filter((item) => item.action !== 'error');
    const pdfImportRoot = join(storage.tempDir, 'pdf-import');
    for (const item of stagedItems) {
      assert(item.stagedFileKey?.startsWith(`pdf-import/${batch.importBatchId}/`), 'Internal staged key should be relative under pdf-import.');
      assert(!item.stagedFileKey.includes('..'), 'Internal staged key must not contain traversal.');
      assert(!resolve(item.stagedFileKey).startsWith(resolve(storage.tempDir)), 'Internal staged key should not be an absolute path.');
      assert(item.stagedFileName !== item.originalFileName, 'Temp disk file name must not use original file name.');
      const stagedPath = tempStorage.pathFromStagedFileKey(item.stagedFileKey);
      assert(existsSync(stagedPath), 'Staged PDF should exist in temp storage.');
      assert(relative(resolve(pdfImportRoot), resolve(stagedPath)) && !relative(resolve(pdfImportRoot), resolve(stagedPath)).startsWith('..'), 'Staged PDF should stay inside pdf-import temp root.');
    }
    const stagedPdfFiles = listFilesRecursive(join(pdfImportRoot, batch.importBatchId)).filter((file) => file.endsWith('.pdf'));
    assert(stagedPdfFiles.length === stagedItems.length, 'Only successful preview items should leave staged PDF files.');
    assert(!batch.items.find((item) => item.action === 'error')?.stagedFileKey, 'Error item should not retain stagedFileKey.');

    assert(JSON.stringify(store.readProducts()) === productsBefore, 'Preview must not create or update formal products.');
    assert(JSON.stringify(store.readDetails()) === detailsBefore, 'Preview must not update formal module settings.');
    assert(JSON.stringify(formalDocuments) === documentsBefore, 'Preview must not create formal ProductDocument records.');
    assert(listFilesRecursive(storage.uploadsDir).length === uploadsBefore, 'Preview must not write formal uploads.');

    const reloaded = createRuntime(formalDocuments);
    try {
      reloaded.storage.metadataDir = storage.metadataDir;
      reloaded.storage.tempDir = storage.tempDir;
      reloaded.storage.uploadsDir = storage.uploadsDir;
      const getResponse = reloaded.controller.getPdfImportPreview(response.importBatchId);
      assert(getResponse.importBatchId === response.importBatchId, 'GET should return persisted preview batch.');
      assertSafeResponse(getResponse, tempRoot);
    } finally {
      rmSync(reloaded.tempRoot, { recursive: true, force: true });
    }

    const records = store.readImportRecords();
    const index = records.findIndex((item) => item.importBatchId === response.importBatchId);
    records[index] = {
      ...records[index],
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };
    store.writeImportRecords(records);
    const expiredResponse = controller.getPdfImportPreview(response.importBatchId);
    assert(expiredResponse.status === 'expired', 'Expired preview GET should return status=expired.');
    assert(expiredResponse.message === 'PDF 导入预览已过期，请重新上传文件。', 'Expired preview GET should return Chinese expiry message.');

    await expectHttpStatus(() => controller.previewPdfImport({ customerId: '' }, { files: [files[0]] }), 400, 'Missing customerId should be rejected.');
    await expectHttpStatus(() => controller.previewPdfImport({ customerId: 'missing-customer' }, { files: [files[0]] }), 404, 'Missing customer should be rejected.');
    await expectHttpStatus(() => controller.previewPdfImport({ customerId: 'cust-deleted' }, { files: [files[0]] }), 404, 'Soft-deleted customer should be rejected.');
    await expectHttpStatus(() => controller.previewPdfImport({ customerId: customer.customerId }, { files: [] }), 400, 'Empty upload should be rejected.');
    await expectHttpStatus(
      () => controller.previewPdfImport(
        { customerId: customer.customerId },
        { files: Array.from({ length: 51 }, (_, index) => makeFile(`HL-LIMIT-${index}.pdf`, minimalPdfBuffer(`limit-${index}`))) },
      ),
      400,
      'More than 50 files should be rejected as a batch error.',
    );
    await expectHttpStatus(
      () => controller.previewPdfImport(
        { customerId: customer.customerId },
        { files: Array.from({ length: 6 }, (_, index) => makeFile(`HL-TOTAL-${index}.pdf`, minimalPdfBuffer(`total-${index}`), 'application/pdf', 60 * 1024 * 1024)) },
      ),
      400,
      'Batch total size above 300 MB should be rejected.',
    );

    const oversized = await controller.previewPdfImport(
      { customerId: customer.customerId },
      { files: [makeFile('HL-BIG-3000A.pdf', minimalPdfBuffer('big'), 'application/pdf', 31 * 1024 * 1024)] },
    );
    assert(oversized.items[0]?.action === 'error', 'Single file above 30 MB should be a file-level error.');
    const emptyFile = await controller.previewPdfImport(
      { customerId: customer.customerId },
      { files: [makeFile('HL-EMPTY-3000A.pdf', Buffer.alloc(0), 'application/pdf', 0)] },
    );
    assert(emptyFile.items[0]?.action === 'error', 'Empty PDF should be a file-level error.');

    const controllerSource = readFileSync(join(root, 'apps/api/src/document-hub/document-hub.controller.ts'), 'utf8');
    assert(controllerSource.includes("@Post('drawings/pdf-import/preview')"), 'Controller should expose POST preview route.');
    assert(controllerSource.includes("@Get('drawings/pdf-import/:importBatchId')"), 'Controller should expose GET preview route.');
    assert(controllerSource.includes('FileFieldsInterceptor'), 'Controller should support files and file multipart fields.');
  } finally {
    if (previousDemoMode === undefined) delete process.env.DEMO_DATA_MODE;
    else process.env.DEMO_DATA_MODE = previousDemoMode;
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

console.log('PDF import preview check');
console.log('This check uses isolated temp metadata/temp/uploads and does not connect to a database or network.');

runApiBuild();
if (!blockers.length) await checkPdfImportPreview();

if (blockers.length) {
  console.error('\nPDF import preview check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('PDF import preview check passed.');
