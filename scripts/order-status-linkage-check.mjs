import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
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
  assert(result.status === 0, 'API build failed before order status linkage check.');
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
  const tempRoot = mkdtempSync(join(tmpdir(), 'hanglian-order-status-'));
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
    return {
      tempRoot,
      localStorage,
      drawingStore,
      orderStore,
      syncService,
      cleanup() {
        rmSync(tempRoot, { recursive: true, force: true });
      },
    };
  });
}

function seedLinkedOrder(runtime) {
  const customer = { customerId: 'cust-status-a', customerName: 'Status Customer A', customerShortName: 'SCA' };
  const product = {
    productId: 'prod-status-a',
    customerId: customer.customerId,
    productModel: 'HL-STATUS-1001A',
    normalizedProductModel: 'HL-STATUS-1001A',
    productName: 'Status Product',
    drawingStatus: 'no_drawing',
  };
  runtime.drawingStore.writeCustomers([customer]);
  runtime.drawingStore.writeProducts([product]);
  runtime.drawingStore.upsertDetail(runtime.drawingStore.makeProductDetail(customer, product));
  const order = runtime.orderStore.createOrder({
    scope: 'week',
    productModel: product.productModel,
    normalizedProductModel: product.normalizedProductModel,
    customerId: customer.customerId,
    customerName: customer.customerName,
    linkedProductId: product.productId,
    productResolutionStatus: 'found',
    quantity: null,
    quantityProvided: false,
    productionStatus: 'no_drawing',
    completionStatus: 'pending',
    source: 'manual_create',
  });
  return { customer, product, order };
}

function setOriginalItem(runtime, product, customer, item) {
  const detail = runtime.drawingStore.makeProductDetail(customer, product);
  const original = detail.modules.find((module) => module.moduleKey === 'original_drawing');
  if (item) {
    original.items.push(item);
    original.status = 'uploaded';
    original.itemCount = 1;
  }
  runtime.drawingStore.upsertDetail(detail);
}

async function checkLinkageBehavior() {
  const runtime = createRuntime();
  try {
    const { customer, product, order } = seedLinkedOrder(runtime);
    await runtime.syncService.assertCanSetProductionStatus(order, 'front')
      .then(() => assert(false, 'Front/back should be rejected when product has no original drawing.'))
      .catch((error) => assert(error?.status === 400, 'Front/back rejection should be HTTP 400.'));

    await runtime.syncService.syncOrdersForProduct(product.productId);
    assert(runtime.orderStore.getOrderById(order.orderId)?.productionStatus === 'no_drawing', 'No original drawing should keep order no_drawing.');

    setOriginalItem(runtime, product, customer, {
      itemId: 'doc-status-original',
      title: 'HL-STATUS-1001A original',
      fileType: 'pdf',
      fileName: 'HL-STATUS-1001A.pdf',
      version: 'Rev.A',
      uploadedAt: '2026-06-21T00:00:00.000Z',
      source: 'manual_upload',
      documentStatus: 'effective',
    });
    await runtime.syncService.syncOrdersForProduct(product.productId);
    assert(runtime.orderStore.getOrderById(order.orderId)?.productionStatus === 'front', 'Original upload should auto move pending no_drawing orders to front.');

    runtime.orderStore.updateOrder(order.orderId, { productionStatus: 'back' });
    await runtime.syncService.syncOrdersForProduct(product.productId);
    assert(runtime.orderStore.getOrderById(order.orderId)?.productionStatus === 'back', 'Pending back order should stay back while original exists.');

    setOriginalItem(runtime, product, customer, undefined);
    await runtime.syncService.syncOrdersForProduct(product.productId);
    assert(runtime.orderStore.getOrderById(order.orderId)?.productionStatus === 'no_drawing', 'Removing all originals should move pending linked orders to no_drawing.');

    setOriginalItem(runtime, product, customer, {
      itemId: 'doc-status-original-restored',
      title: 'HL-STATUS-1001A restored original',
      fileType: 'pdf',
      fileName: 'HL-STATUS-1001A.pdf',
      version: 'Rev.B',
      uploadedAt: '2026-06-21T01:00:00.000Z',
      source: 'manual_upload',
      documentStatus: 'effective',
    });
    await runtime.syncService.syncOrdersForProduct(product.productId);
    assert(runtime.orderStore.getOrderById(order.orderId)?.productionStatus === 'front', 'Restoring original should move pending no_drawing orders to front.');

    runtime.orderStore.completeOrder(order.orderId, 'tester');
    setOriginalItem(runtime, product, customer, undefined);
    await runtime.syncService.syncOrdersForProduct(product.productId);
    assert(runtime.orderStore.getOrderById(order.orderId)?.productionStatus === 'front', 'Completed orders should not be auto changed by sync.');

    const audits = runtime.localStorage.readAuditLogsSync();
    assert(audits.some((audit) => audit.action === 'order_status_auto_synced'), 'Status sync should write audit records.');
  } finally {
    runtime.cleanup();
  }
}

function checkSourceWiring() {
  const hubService = readFileSync(join(root, 'apps/api/src/document-hub/document-hub.service.ts'), 'utf8');
  const lifecycle = readFileSync(join(root, 'apps/api/src/document-hub/document-lifecycle.service.ts'), 'utf8');
  const module = readFileSync(join(root, 'apps/api/src/document-hub/document-hub.module.ts'), 'utf8');
  assert(hubService.includes('syncOrdersAfterOriginalDrawingChange'), 'Normal/camera upload path should call order sync helper.');
  assert(hubService.includes('syncOrdersForOriginalDrawingProducts'), 'PDF apply path should sync imported original drawing products.');
  assert(lifecycle.includes('withOrderSyncWarning'), 'Trash/restore/purge lifecycle should append order sync warning.');
  assert(module.includes('OrderStatusSyncService'), 'DocumentHubModule should register OrderStatusSyncService.');
}

console.log('Order status linkage check');
console.log('This check uses isolated temp metadata and does not connect to a database.');

runApiBuild();
if (!blockers.length) {
  checkSourceWiring();
  await checkLinkageBehavior();
}

if (blockers.length) {
  console.error('\nOrder status linkage check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('Order status linkage check passed.');
