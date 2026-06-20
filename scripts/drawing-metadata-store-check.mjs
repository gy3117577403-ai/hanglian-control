import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const blockers = [];
const metadataFiles = [
  'drawing-customers.json',
  'drawing-products.json',
  'drawing-module-settings.json',
  'drawing-import-records.json',
];

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

  assert(result.status === 0, 'API build failed before DrawingMetadataStore check.');
  if (result.error) assert(false, `API build could not start: ${result.error.message}`);
}

class IsolatedMetadataStorage {
  constructor(storageRoot) {
    this.storageRoot = storageRoot;
    this.metadataDir = join(storageRoot, 'metadata');
    this.tempDir = join(storageRoot, 'tmp');
    mkdirSync(this.metadataDir, { recursive: true });
    mkdirSync(this.tempDir, { recursive: true });
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

  writeRawJson(fileName, value) {
    this.writeJsonAtomicSync(this.metadataFilePath(fileName), value);
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

function moduleByKey(detail, moduleKey) {
  return detail.modules.find((module) => module.moduleKey === moduleKey);
}

function checkStoreBehavior() {
  const require = createRequire(import.meta.url);
  const { DrawingMetadataStore } = require(join(
    root,
    'apps/api/dist/src/document-hub/drawing-metadata.store.js',
  ));

  const previousDemoMode = process.env.DEMO_DATA_MODE;
  process.env.DEMO_DATA_MODE = 'empty';

  const tempRoot = mkdtempSync(join(tmpdir(), 'hanglian-drawing-store-'));
  const storage = new IsolatedMetadataStorage(tempRoot);
  const store = new DrawingMetadataStore(storage);

  try {
    const init = store.ensureInitialized();
    assert(init.customers === 0, 'Empty initialization should not seed customers.');
    assert(init.products === 0, 'Empty initialization should not seed products.');
    assert(init.details === 0, 'Empty initialization should not seed drawing details.');
    assert(init.importBatches === 0, 'Empty initialization should not seed import batches.');
    for (const fileName of metadataFiles) {
      assert(existsSync(storage.metadataFilePath(fileName)), `Initialization did not create ${fileName}.`);
    }

    store.writeCustomers([
      {
        customerId: 'cust-a',
        customerName: 'Customer A',
        customerShortName: 'CA',
      },
      {
        customerId: 'deleted-customer',
        customerName: 'Deleted',
        customerShortName: 'DEL',
        deletedAt: '2026-06-20T00:00:00.000Z',
      },
    ]);

    const customers = store.readCustomers();
    assert(customers.length === 1, 'readCustomers should filter soft-deleted records.');
    assert(customers[0]?.aliases?.includes('Customer A'), 'Customer aliases should include customerName.');
    assert(customers[0]?.status === 'active', 'Customer status should default to active.');

    store.writeProducts([
      {
        productId: 'prod-a',
        customerId: 'cust-a',
        productModel: 'HL CTRL 1907B',
        productName: 'Harness A',
        drawingStatus: 'no_drawing',
      },
    ]);

    const products = store.readProducts();
    assert(products.length === 1, 'readProducts should return written product.');
    assert(products[0]?.normalizedProductModel === 'HL-CTRL-1907B', 'Product model should be normalized.');
    assert(
      products[0]?.searchKeywords?.includes('HL-CTRL-1907B'),
      'Product searchKeywords should include normalized model.',
    );
    assert(
      store.makeProductId('Cust A', 'HL CTRL 1907B') === 'prod-cust-a-hl-ctrl-1907b',
      'makeProductId should be stable and normalized.',
    );

    const uploadedItem = {
      itemId: 'doc-1',
      title: 'Original drawing',
      fileType: 'pdf',
      fileName: 'HL-CTRL-1907B.pdf',
      version: 'Rev.A',
      uploadedAt: '2026-06-20T01:00:00.000Z',
      source: 'pdf_import',
      isCover: true,
      checksumSha256: 'abc123',
      fileSize: 1200,
      mimeType: 'application/pdf',
    };
    const detail = {
      customer: customers[0],
      product: products[0],
      modules: [
        {
          moduleKey: 'original_drawing',
          moduleName: 'Original',
          status: 'pending',
          items: [uploadedItem],
          updatedAt: '2026-06-20T01:00:00.000Z',
        },
      ],
    };

    const savedDetail = store.upsertDetail(detail);
    assert(savedDetail.modules.length === 6, 'upsertDetail should restore all expected module slots.');
    const originalModule = moduleByKey(savedDetail, 'original_drawing');
    const sopModule = moduleByKey(savedDetail, 'sop');
    assert(originalModule?.status === 'uploaded', 'Original drawing module should become uploaded when it has items.');
    assert(originalModule?.itemCount === 1, 'Original drawing module itemCount should match items.');
    assert(originalModule?.coverDocumentId === 'doc-1', 'Original drawing module should derive coverDocumentId.');
    assert(sopModule?.status === 'pending', 'Missing module slots should be initialized with defaults.');
    assert(store.readDetails().length === 1, 'readDetails should return the upserted detail.');

    store.writeTrash([
      {
        trashId: 'trash-1',
        productId: 'prod-a',
        moduleKey: 'original_drawing',
        item: uploadedItem,
        deletedAt: '2026-06-20T02:00:00.000Z',
        deletedBy: 'tester',
      },
      {
        trashId: 'trash-2',
        productId: 'prod-a',
        moduleKey: 'original_drawing',
        item: uploadedItem,
        deletedAt: '2026-06-20T02:00:00.000Z',
        deletedBy: 'tester',
        purgedAt: '2026-06-20T03:00:00.000Z',
      },
    ]);
    assert(store.readTrash().length === 1, 'readTrash should filter purged records.');

    store.upsertImportBatch({
      importBatchId: 'batch-1',
      customerId: 'cust-a',
      createdAt: '2026-06-20T04:00:00.000Z',
      status: 'previewed',
      totalFiles: 0,
      parsedFiles: 0,
      skippedFiles: 0,
      importedFiles: 0,
      items: [
        {
          importItemId: 'item-1',
          fileName: 'HL-CTRL-1907B.pdf',
          originalFileName: 'HL-CTRL-1907B.pdf',
          checksumSha256: 'abc123',
          fileSize: 1200,
          mimeType: 'application/pdf',
          parsedProductModel: 'HL CTRL 1907B',
          normalizedProductModel: '',
          confidence: 'high',
          status: 'parsed',
          action: 'add_version',
          productId: 'prod-a',
          version: 'Rev.A',
        },
      ],
    });

    const importBatch = store.readImportRecords()[0];
    assert(importBatch?.totalFiles === 1, 'Import batch totalFiles should be derived from items.');
    assert(importBatch?.parsedFiles === 1, 'Import batch parsedFiles should be derived from item statuses.');
    assert(
      importBatch?.items[0]?.normalizedProductModel === 'HL-CTRL-1907B',
      'Import item model should be normalized.',
    );

    storage.writeRawJson('drawing-module-settings.json', {
      schemaVersion: 99,
      details: 'bad-shape',
      trash: 'bad-shape',
      updatedAt: '',
    });
    const safeState = store.readModuleState();
    assert(safeState.schemaVersion === 1, 'Module state schemaVersion should be normalized.');
    assert(Array.isArray(safeState.details), 'Bad detail shape should normalize to an array.');
    assert(Array.isArray(safeState.trash), 'Bad trash shape should normalize to an array.');
    assert(safeState.details.length === 0, 'Bad detail shape should not leak invalid records.');
    assert(safeState.trash.length === 0, 'Bad trash shape should not leak invalid records.');
  } finally {
    if (previousDemoMode === undefined) delete process.env.DEMO_DATA_MODE;
    else process.env.DEMO_DATA_MODE = previousDemoMode;
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

console.log('Drawing metadata store check');
console.log('This check uses an isolated temp metadata root and does not connect to a database.');

runApiBuild();
if (!blockers.length) checkStoreBehavior();

if (blockers.length) {
  console.error('\nDrawing metadata store check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('Drawing metadata store check passed.');
