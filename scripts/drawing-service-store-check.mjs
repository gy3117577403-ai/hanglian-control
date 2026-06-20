import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const blockers = [];
const drawingMetadataFiles = [
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

  if (result.error) assert(false, `API build could not start: ${result.error.message}`);
  assert(result.status === 0, 'API build failed before Drawing service store check.');
}

class IsolatedMetadataStorage {
  constructor(storageRoot) {
    this.storageRoot = storageRoot;
    this.metadataDir = join(storageRoot, 'metadata');
    this.tempDir = join(storageRoot, 'tmp');
    mkdirSync(this.metadataDir, { recursive: true });
    mkdirSync(this.tempDir, { recursive: true });
  }

  getMetadataDir() {
    return this.metadataDir;
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
    return [];
  }

  writeDocumentsSync() {}

  writeRawJson(fileName, value) {
    this.writeJsonAtomicSync(this.metadataFilePath(fileName), value);
  }

  writeRawText(fileName, value) {
    writeFileSync(this.metadataFilePath(fileName), value, 'utf8');
  }

  readRawText(fileName) {
    return readFileSync(this.metadataFilePath(fileName), 'utf8');
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

function createRuntime(documents = []) {
  const require = createRequire(import.meta.url);
  const { DrawingMetadataStore } = require(join(
    root,
    'apps/api/dist/src/document-hub/drawing-metadata.store.js',
  ));
  const { DocumentHubService } = require(join(
    root,
    'apps/api/dist/src/document-hub/document-hub.service.js',
  ));

  const tempRoot = mkdtempSync(join(tmpdir(), 'hanglian-drawing-service-'));
  const storage = new IsolatedMetadataStorage(tempRoot);
  const store = new DrawingMetadataStore(storage);
  const service = new DocumentHubService(
    new FakeDocumentsService(documents),
    storage,
    {},
    { assertVerified() {} },
    store,
  );

  return { tempRoot, storage, store, service };
}

function moduleByKey(detail, moduleKey) {
  return detail.modules.find((module) => module.moduleKey === moduleKey);
}

async function checkEmptyModeStoreReadChain() {
  const previousDemoMode = process.env.DEMO_DATA_MODE;
  process.env.DEMO_DATA_MODE = 'empty';

  const manualDocument = {
    id: 'manual-doc-1',
    documentId: 'manual-doc-1',
    productId: 'prod-a',
    documentType: 'sop_image',
    requiredForProcess: 'back',
    title: 'Manual SOP',
    version: 'SOP-1',
    source: 'manual_upload',
    archived: false,
    previewType: 'image',
    previewUrl: '/files/documents/manual-doc-1/preview',
    originalFileName: 'manual-sop.png',
    remark: 'manual upload kept',
    updatedAt: '2026-06-20T08:00:00.000Z',
    createdAt: '2026-06-20T08:00:00.000Z',
    storageProvider: 'local',
    storageKey: 'documents/manual-sop.png',
    checksumSha256: 'abc123',
    fileSize: 2048,
    mimeType: 'image/png',
  };

  const { tempRoot, storage, store, service } = createRuntime([manualDocument]);

  try {
    service.onModuleInit();
    for (const fileName of drawingMetadataFiles) {
      assert(existsSync(storage.metadataFilePath(fileName)), `Service init did not create ${fileName}.`);
    }
    assert(service.getCustomers().length === 0, 'Empty mode should not create demo customers through service init.');

    store.writeCustomers([
      {
        customerId: 'cust-a',
        customerName: 'Customer A',
        customerShortName: 'CA',
      },
      {
        customerId: 'deleted-customer',
        customerName: 'Deleted Customer',
        customerShortName: 'DEL',
        deletedAt: '2026-06-20T00:00:00.000Z',
      },
    ]);
    store.writeProducts([
      {
        productId: 'prod-a',
        customerId: 'cust-a',
        productModel: 'HL CTRL 1907B',
        productName: 'Harness A',
        drawingStatus: 'no_drawing',
        remark: 'from store',
      },
      {
        productId: 'deleted-product',
        customerId: 'cust-a',
        productModel: 'HL-DELETED-1',
        productName: 'Deleted Product',
        drawingStatus: 'no_drawing',
        deletedAt: '2026-06-20T00:00:00.000Z',
      },
    ]);
    store.upsertDetail({
      customer: store.readCustomers()[0],
      product: store.readProducts()[0],
      modules: [
        {
          moduleKey: 'original_drawing',
          moduleName: 'Original',
          status: 'pending',
          items: [
            {
              itemId: 'seed-doc-1',
              title: 'Seed original drawing',
              fileType: 'pdf',
              fileName: 'HL-CTRL-1907B.pdf',
              version: 'Rev.A',
              uploadedAt: '2026-06-20T07:00:00.000Z',
              source: 'seed',
            },
          ],
          updatedAt: '2026-06-20T07:00:00.000Z',
        },
      ],
    });

    const customers = service.getCustomers();
    assert(customers.length === 1, 'Service getCustomers should read active customers from DrawingMetadataStore.');
    assert(customers[0]?.customerId === 'cust-a', 'Service getCustomers returned the wrong customer.');
    assert(service.getCustomers({ q: 'CA' }).length === 1, 'Service customer search should include short name.');

    const products = service.getProducts('cust-a');
    assert(products.length === 1, 'Service getProducts should read active products from DrawingMetadataStore.');
    assert(products[0]?.normalizedProductModel === 'HL-CTRL-1907B', 'Service getProducts should preserve normalized model.');
    assert(service.getProducts('cust-a', { q: '1907B' }).length === 1, 'Service product search should include model.');

    const detail = await service.getProduct('prod-a');
    assert(detail.product.productId === 'prod-a', 'Service getProduct returned wrong product.');
    assert(detail.customer?.customerId === 'cust-a', 'Service getProduct should attach customer from store.');
    assert(detail.modules.length === 6, 'Service getProduct should preserve six drawing modules.');
    assert(
      moduleByKey(detail, 'original_drawing')?.items.some((item) => item.itemId === 'seed-doc-1'),
      'Service getProduct should keep store/seed placeholder items.',
    );
    const sopModule = moduleByKey(detail, 'sop');
    assert(
      sopModule?.items.some((item) => item.itemId === 'manual-doc-1' && item.storageKey === 'documents/manual-sop.png'),
      'Service getProduct should merge manual uploaded documents with storage metadata.',
    );

    const byModel = await service.getProductByModel('HL-CTRL-1907B');
    assert(byModel?.product.productId === 'prod-a', 'Service getProductByModel should use store product lookup.');

    const moduleResult = await service.getModule('prod-a', 'sop');
    assert(moduleResult.module.items.some((item) => item.itemId === 'manual-doc-1'), 'Service getModule should include merged manual upload item.');

    const searchResult = await service.search({ mode: 'drawing', q: 'Manual SOP' });
    assert(searchResult.items.length === 1, 'Service drawing search should read store details and merged uploads.');
  } finally {
    if (previousDemoMode === undefined) delete process.env.DEMO_DATA_MODE;
    else process.env.DEMO_DATA_MODE = previousDemoMode;
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function checkPersistedDataWinsInDemoMode() {
  const previousDemoMode = process.env.DEMO_DATA_MODE;
  delete process.env.DEMO_DATA_MODE;
  const { tempRoot, storage, service } = createRuntime();

  try {
    storage.writeRawJson('drawing-customers.json', [
      {
        customerId: 'persisted-customer',
        customerName: 'Persisted Customer',
        customerShortName: 'PC',
      },
    ]);
    storage.writeRawJson('drawing-products.json', []);
    storage.writeRawJson('drawing-module-settings.json', {
      schemaVersion: 1,
      details: [],
      trash: [],
      updatedAt: '2026-06-20T00:00:00.000Z',
    });
    storage.writeRawJson('drawing-import-records.json', []);

    service.onModuleInit();
    const customers = service.getCustomers();
    assert(customers.length === 1, 'Demo mode should not overwrite existing persisted customers with seed data.');
    assert(customers[0]?.customerId === 'persisted-customer', 'Persisted customer should remain first-class data.');
  } finally {
    if (previousDemoMode === undefined) delete process.env.DEMO_DATA_MODE;
    else process.env.DEMO_DATA_MODE = previousDemoMode;
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function checkCorruptJsonAbortsInitialization() {
  const previousDemoMode = process.env.DEMO_DATA_MODE;
  delete process.env.DEMO_DATA_MODE;
  const { tempRoot, storage, service } = createRuntime();

  try {
    storage.writeRawText('drawing-customers.json', '{not-json');
    service.logger.error = () => {};
    let failed = false;
    try {
      service.onModuleInit();
    } catch {
      failed = true;
    }
    assert(failed, 'Service init should fail when an existing drawing metadata JSON file is damaged.');
    assert(storage.readRawText('drawing-customers.json') === '{not-json', 'Damaged metadata should not be overwritten during failed init.');
  } finally {
    if (previousDemoMode === undefined) delete process.env.DEMO_DATA_MODE;
    else process.env.DEMO_DATA_MODE = previousDemoMode;
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

console.log('Drawing service store check');
console.log('This check uses isolated temp metadata and does not connect to a database.');

runApiBuild();
if (!blockers.length) {
  await checkEmptyModeStoreReadChain();
  checkPersistedDataWinsInDemoMode();
  checkCorruptJsonAbortsInitialization();
}

if (blockers.length) {
  console.error('\nDrawing service store check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('Drawing service store check passed.');
