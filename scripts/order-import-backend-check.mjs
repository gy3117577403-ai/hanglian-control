import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const blockers = [];

function assert(condition, message) {
  if (!condition) blockers.push(message);
}

function runApiBuild() {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm run build -w api'] : ['run', 'build', '-w', 'api'];
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error) assert(false, `API build could not start: ${result.error.message}`);
  assert(result.status === 0, 'API build failed before order import backend check.');
}

function withEnv(env, work) {
  const previous = {};
  for (const [key, value] of Object.entries(env)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }
  try {
    return work();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function createRuntime() {
  const require = createRequire(import.meta.url);
  const tempRoot = mkdtempSync(join(tmpdir(), 'hanglian-order-import-'));
  const storageRoot = join(tempRoot, 'storage');
  const env = {
    DEMO_DATA_MODE: 'empty',
    FILE_STORAGE_PROVIDER: 'local',
    STORAGE_ROOT: storageRoot,
    METADATA_ROOT: join(storageRoot, 'metadata'),
    STORAGE_TEMP_ROOT: join(storageRoot, 'tmp'),
  };

  return withEnv(env, () => {
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
    const { OrderMetadataStore } = require(join(root, 'apps/api/dist/src/document-hub/order-metadata.store.js'));
    const { OrderStatusSyncService } = require(join(root, 'apps/api/dist/src/document-hub/order-status-sync.service.js'));
    const { OrderImportService } = require(join(root, 'apps/api/dist/src/document-hub/order-import.service.js'));

    const config = new StorageConfigService();
    const keyService = new StorageKeyService();
    const safety = new StorageSafetyService();
    const localProvider = new LocalStorageProvider(config, keyService, safety);
    const s3Provider = new S3StorageProvider(config, keyService, safety);
    const storageService = new StorageService(config, localProvider, s3Provider);
    const localStorage = new LocalStorageService(config, storageService);
    localStorage.ensureStorageSync();
    const auditService = new AuditService(new MockAuditRepository(localStorage));
    const documentsService = new DocumentsService(new MockDocumentRepository(localStorage), storageService, auditService);
    const drawingStore = new DrawingMetadataStore(localStorage);
    const orderStore = new OrderMetadataStore(localStorage, drawingStore);
    drawingStore.ensureInitialized();
    orderStore.ensureInitialized();
    const syncService = new OrderStatusSyncService(orderStore, drawingStore, documentsService, auditService);
    const importService = new OrderImportService(orderStore, drawingStore, syncService, auditService);

    return {
      tempRoot,
      config,
      localStorage,
      drawingStore,
      orderStore,
      syncService,
      importService,
      cleanup() {
        rmSync(tempRoot, { recursive: true, force: true });
      },
    };
  });
}

async function makeXlsx(productModels) {
  const require = createRequire(import.meta.url);
  const { Workbook } = require('exceljs');
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet('orders');
  sheet.addRow(['产品型号']);
  for (const model of productModels) sheet.addRow([model]);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function makeFile(buffer) {
  return {
    fieldname: 'file',
    originalname: 'orders.xlsx',
    encoding: '7bit',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: buffer.length,
    buffer,
  };
}

function seedDrawingMetadata(runtime) {
  const customers = [
    { customerId: 'cust-order-a', customerName: 'Order Customer A', customerShortName: 'OCA' },
    { customerId: 'cust-order-b', customerName: 'Order Customer B', customerShortName: 'OCB' },
    { customerId: 'cust-order-c', customerName: 'Order Customer C', customerShortName: 'OCC' },
  ];
  const products = [
    {
      productId: 'prod-order-unique',
      customerId: 'cust-order-a',
      productModel: 'HL-ORDER-1001A',
      normalizedProductModel: 'HL-ORDER-1001A',
      productName: 'Unique order product',
      drawingStatus: 'available',
    },
    {
      productId: 'prod-order-amb-a',
      customerId: 'cust-order-a',
      productModel: 'HL-AMB-2002B',
      normalizedProductModel: 'HL-AMB-2002B',
      productName: 'Ambiguous A',
      drawingStatus: 'no_drawing',
    },
    {
      productId: 'prod-order-amb-b',
      customerId: 'cust-order-b',
      productModel: 'HL-AMB-2002B',
      normalizedProductModel: 'HL-AMB-2002B',
      productName: 'Ambiguous B',
      drawingStatus: 'no_drawing',
    },
    {
      productId: 'prod-order-active',
      customerId: 'cust-order-c',
      productModel: 'HL-ACTIVE-3003C',
      normalizedProductModel: 'HL-ACTIVE-3003C',
      productName: 'Active order product',
      drawingStatus: 'no_drawing',
    },
  ];
  runtime.drawingStore.writeCustomers(customers);
  runtime.drawingStore.writeProducts(products);
  const detail = runtime.drawingStore.makeProductDetail(customers[0], products[0]);
  const original = detail.modules.find((module) => module.moduleKey === 'original_drawing');
  original.items.push({
    itemId: 'doc-order-unique',
    title: 'HL-ORDER-1001A original',
    fileType: 'pdf',
    fileName: 'HL-ORDER-1001A.pdf',
    version: 'Rev.A',
    uploadedAt: '2026-06-21T00:00:00.000Z',
    source: 'manual_upload',
    documentStatus: 'effective',
  });
  original.status = 'uploaded';
  runtime.drawingStore.upsertDetail(detail);
  runtime.drawingStore.upsertDetail(runtime.drawingStore.makeProductDetail(customers[0], products[1]));
  runtime.drawingStore.upsertDetail(runtime.drawingStore.makeProductDetail(customers[1], products[2]));
  runtime.drawingStore.upsertDetail(runtime.drawingStore.makeProductDetail(customers[2], products[3]));
  runtime.orderStore.createOrder({
    scope: 'week',
    productModel: 'HL-ACTIVE-3003C',
    normalizedProductModel: 'HL-ACTIVE-3003C',
    customerId: 'cust-order-c',
    customerName: 'Order Customer C',
    linkedProductId: 'prod-order-active',
    productResolutionStatus: 'found',
    quantity: 12,
    quantityProvided: true,
    productionStatus: 'no_drawing',
    completionStatus: 'pending',
    source: 'manual_create',
  });
}

function byModel(preview, model) {
  return preview.items.find((item) => item.normalizedProductModel === model);
}

async function checkImportPreviewAndApply() {
  const runtime = createRuntime();
  try {
    seedDrawingMetadata(runtime);
    const initialOrderCount = runtime.orderStore.listOrders({ scope: 'all', completionStatus: 'all' }).length;
    const file = makeFile(await makeXlsx([
      'HL-ORDER-1001A',
      'HL-MISS-4004D',
      'HL-AMB-2002B',
      'HL-ORDER-1001A',
      'HL-ACTIVE-3003C',
      '测试产品',
      '2026-06-21',
    ]));

    const preview = await runtime.importService.preview({ scope: 'week' }, file);
    assert(preview.scope === 'week', 'Preview should preserve requested week scope.');
    assert(runtime.orderStore.listOrders({ scope: 'all', completionStatus: 'all' }).length === initialOrderCount, 'Preview must not create formal orders.');
    assert(byModel(preview, 'HL-ORDER-1001A')?.action === 'create_order', 'Unique product should preview create_order.');
    assert(byModel(preview, 'HL-ORDER-1001A')?.recommendedProductionStatus === 'front', 'Unique product with original drawing should recommend front.');
    assert(byModel(preview, 'HL-MISS-4004D')?.action === 'product_not_found', 'Missing product should be importable as product_not_found.');
    assert(byModel(preview, 'HL-AMB-2002B')?.action === 'needs_customer_confirmation', 'Same model across customers should require confirmation.');
    assert(preview.items.filter((item) => item.action === 'duplicate_in_file').length === 1, 'File duplicate should be detected.');
    assert(byModel(preview, 'HL-ACTIVE-3003C')?.action === 'already_active', 'Active order duplicate should be detected.');
    assert(preview.items.filter((item) => item.action === 'error').length === 2, 'Illegal rows should remain item errors.');

    const amb = byModel(preview, 'HL-AMB-2002B');
    const applyItems = preview.items.map((item) => ({
      importItemId: item.importItemId,
      selected: true,
      confirmedCustomerId: item.importItemId === amb.importItemId ? 'cust-order-a' : undefined,
      confirmedProductId: item.importItemId === amb.importItemId ? 'prod-order-amb-a' : undefined,
    }));
    const apply = await runtime.importService.apply({
      importBatchId: preview.importBatchId,
      items: applyItems,
      operatorId: 'tester',
      operatorName: 'Order Import Tester',
    });
    assert(apply.summary.created === 3, 'Apply should create unique, missing-product, and confirmed ambiguous orders.');
    assert(apply.summary.alreadyActive === 1, 'Apply should skip already active orders.');
    assert(apply.summary.skippedDuplicate === 1, 'Apply should skip duplicate-in-file rows.');
    assert(apply.summary.error === 2, 'Apply should keep illegal rows as errors.');

    const orders = runtime.orderStore.listOrders({ scope: 'week', completionStatus: 'pending' });
    const imported = orders.filter((order) => order.source === 'excel_import');
    assert(imported.length === 3, 'Apply should persist exactly three imported orders.');
    assert(imported.every((order) => order.quantity === null && order.quantityProvided === false), 'Excel import must not fake quantity.');
    assert(imported.find((order) => order.normalizedProductModel === 'HL-ORDER-1001A')?.productionStatus === 'front', 'Linked order with original should be front.');
    assert(imported.find((order) => order.normalizedProductModel === 'HL-MISS-4004D')?.productionStatus === 'no_drawing', 'Missing product order should be no_drawing.');
    assert(imported.find((order) => order.normalizedProductModel === 'HL-AMB-2002B')?.linkedProductId === 'prod-order-amb-a', 'Confirmed ambiguous order should bind selected product.');

    const repeat = await runtime.importService.apply({
      importBatchId: preview.importBatchId,
      items: applyItems,
    });
    assert(repeat.summary.created === apply.summary.created, 'Repeated apply should be idempotent.');
    assert(runtime.orderStore.listOrders({ scope: 'week', completionStatus: 'pending' }).filter((order) => order.source === 'excel_import').length === 3, 'Repeated apply must not duplicate orders.');
  } finally {
    runtime.cleanup();
  }
}

console.log('Order import backend check');
console.log('This check uses isolated XLSX buffers/temp metadata and does not connect to a database.');

runApiBuild();
if (!blockers.length) await checkImportPreviewAndApply();

if (blockers.length) {
  console.error('\nOrder import backend check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('Order import backend check passed.');
