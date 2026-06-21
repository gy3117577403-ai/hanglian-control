import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  assert(result.status === 0, 'API build failed before order metadata check.');
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

function createRuntime(mode = 'empty') {
  const require = createRequire(import.meta.url);
  const tempRoot = mkdtempSync(join(tmpdir(), 'hanglian-order-metadata-'));
  const storageRoot = join(tempRoot, 'storage');
  const env = {
    DEMO_DATA_MODE: mode,
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
    const { DrawingMetadataStore } = require(join(root, 'apps/api/dist/src/document-hub/drawing-metadata.store.js'));
    const { OrderMetadataStore } = require(join(root, 'apps/api/dist/src/document-hub/order-metadata.store.js'));

    const config = new StorageConfigService();
    const keyService = new StorageKeyService();
    const safety = new StorageSafetyService();
    const localProvider = new LocalStorageProvider(config, keyService, safety);
    const s3Provider = new S3StorageProvider(config, keyService, safety);
    const storageService = new StorageService(config, localProvider, s3Provider);
    const localStorage = new LocalStorageService(config, storageService);
    localStorage.ensureStorageSync();
    const drawingStore = new DrawingMetadataStore(localStorage);
    drawingStore.ensureInitialized();
    const orderStore = new OrderMetadataStore(localStorage, drawingStore);

    return {
      tempRoot,
      config,
      localStorage,
      drawingStore,
      orderStore,
      cleanup() {
        rmSync(tempRoot, { recursive: true, force: true });
      },
    };
  });
}

function checkEmptyAndPersistence() {
  const runtime = createRuntime('empty');
  try {
    const summary = runtime.orderStore.ensureInitialized();
    assert(summary.orders === 0, 'Empty mode should not seed production orders.');
    assert(summary.importBatches === 0, 'Empty mode should create empty order import batches.');
    assert(existsSync(join(runtime.config.metadataRoot, 'production-orders.json')), 'production-orders.json should be created.');
    assert(existsSync(join(runtime.config.metadataRoot, 'order-import-records.json')), 'order-import-records.json should be created.');

    const created = runtime.orderStore.createOrder({
      scope: 'week',
      productModel: 'HL META 1001A',
      quantity: null,
      quantityProvided: false,
      productionStatus: 'no_drawing',
      productResolutionStatus: 'product_not_found',
      source: 'excel_import',
    });
    assert(created.quantity === null, 'Missing Excel quantity should persist as null.');
    assert(created.quantityProvided === false, 'Missing Excel quantity should persist quantityProvided=false.');
    assert(created.normalizedProductModel === 'HL-META-1001A', 'Order product model should be normalized.');

    const completed = runtime.orderStore.completeOrder(created.orderId, 'tester');
    assert(completed?.completionStatus === 'completed', 'completeOrder should persist completionStatus=completed.');
    assert(runtime.orderStore.listOrders({ scope: 'week', completionStatus: 'pending' }).length === 0, 'Default pending query should remove completed orders.');
    const restored = runtime.orderStore.restoreOrder(created.orderId, 'tester', 'no_drawing');
    assert(restored?.completionStatus === 'pending', 'restoreOrder should return completed order to pending.');

    runtime.orderStore.saveImportBatch({
      importBatchId: 'batch-meta',
      scope: 'week',
      status: 'previewed',
      totalRows: 0,
      createOrderCount: 0,
      alreadyActiveCount: 0,
      duplicateInFileCount: 0,
      needsConfirmationCount: 0,
      productNotFoundCount: 0,
      errorCount: 0,
      createdAt: '2026-06-21T00:00:00.000Z',
      updatedAt: '2026-06-21T00:00:00.000Z',
      items: [],
    });
    assert(runtime.orderStore.getImportBatch('batch-meta')?.status === 'previewed', 'Import batch should persist.');

    const restarted = new (runtime.orderStore.constructor)(runtime.localStorage, runtime.drawingStore);
    assert(restarted.getOrderById(created.orderId)?.completionStatus === 'pending', 'Restarted store should preserve orders.');
    assert(restarted.getImportBatch('batch-meta')?.importBatchId === 'batch-meta', 'Restarted store should preserve import batches.');
  } finally {
    runtime.cleanup();
  }
}

function checkDemoSeedAndDamageProtection() {
  const runtime = createRuntime('demo');
  try {
    const seeded = runtime.orderStore.initializeFromSeedIfEmpty();
    assert(seeded.orders > 0, 'Demo mode should seed order metadata only when empty.');
    const first = runtime.orderStore.listOrders({ scope: 'all', completionStatus: 'all' })[0];
    runtime.orderStore.updateOrder(first.orderId, { remark: 'persisted wins' });
    const countBefore = runtime.orderStore.listOrders({ scope: 'all', completionStatus: 'all' }).length;
    runtime.orderStore.initializeFromSeedIfEmpty();
    assert(runtime.orderStore.listOrders({ scope: 'all', completionStatus: 'all' }).length === countBefore, 'Seed should not overwrite existing persisted orders.');
    assert(runtime.orderStore.getOrderById(first.orderId)?.remark === 'persisted wins', 'Persisted data should win over seed.');

    writeFileSync(join(runtime.config.metadataRoot, 'production-orders.json'), '{ broken json', 'utf8');
    try {
      runtime.orderStore.ensureInitialized();
      assert(false, 'Damaged production-orders.json should not be silently overwritten.');
    } catch {
      const raw = readFileSync(join(runtime.config.metadataRoot, 'production-orders.json'), 'utf8');
      assert(raw.includes('broken json'), 'Damaged JSON should remain for manual repair.');
    }
  } finally {
    runtime.cleanup();
  }
}

console.log('Order metadata check');
console.log('This check uses isolated temp metadata and does not connect to a database.');

runApiBuild();
if (!blockers.length) {
  checkEmptyAndPersistence();
  checkDemoSeedAndDamageProtection();
}

if (blockers.length) {
  console.error('\nOrder metadata check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('Order metadata check passed.');
