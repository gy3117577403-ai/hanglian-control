import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
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
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
  });

  if (result.error) assert(false, `API build could not start: ${result.error.message}`);
  assert(result.status === 0, 'API build failed before customer/product write check.');
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
  async findAll() {
    return [];
  }
}

function createRuntime() {
  const require = createRequire(import.meta.url);
  const { DrawingMetadataStore } = require(join(
    root,
    'apps/api/dist/src/document-hub/drawing-metadata.store.js',
  ));
  const { DocumentHubService } = require(join(
    root,
    'apps/api/dist/src/document-hub/document-hub.service.js',
  ));
  const { DocumentHubController } = require(join(
    root,
    'apps/api/dist/src/document-hub/document-hub.controller.js',
  ));

  const tempRoot = mkdtempSync(join(tmpdir(), 'hanglian-drawing-write-'));
  const storage = new IsolatedMetadataStorage(tempRoot);
  const store = new DrawingMetadataStore(storage);
  const service = new DocumentHubService(
    new FakeDocumentsService(),
    storage,
    {},
    { assertVerified() {} },
    store,
  );
  const controller = new DocumentHubController(service);

  return { tempRoot, service, controller };
}

async function expectConflict(action, message) {
  try {
    await action();
    assert(false, message);
  } catch (error) {
    assert(error?.status === 409, `${message} Expected HTTP 409, got ${error?.status ?? 'unknown'}.`);
  }
}

function checkControllerRoutes() {
  const source = readFileSync(join(root, 'apps/api/src/document-hub/document-hub.controller.ts'), 'utf8');
  [
    "@Post('drawings/customers')",
    "@Patch('drawings/customers/:customerId')",
    "@Post('drawings/products')",
    "@Patch('drawings/products/:productId')",
  ].forEach((needle) => {
    assert(source.includes(needle), `Controller is missing route ${needle}.`);
  });
}

async function checkCustomerProductWrites() {
  const previousDemoMode = process.env.DEMO_DATA_MODE;
  process.env.DEMO_DATA_MODE = 'empty';
  const { tempRoot, service, controller } = createRuntime();

  try {
    service.onModuleInit();

    const customer = controller.createDrawingCustomer({
      customerName: '  Acme   Harness  ',
      aliases: [' Acme ', 'Acme', '', 'Harness'],
    });
    assert(customer.customerName === 'Acme Harness', 'Customer name should be trimmed and whitespace-normalized.');
    assert(customer.customerShortName === 'Acme Harness', 'Customer short name should default to customerName.');
    assert(customer.status === 'active', 'Customer status should default to active.');
    assert(customer.aliases.includes('Acme Harness'), 'Customer aliases should include normalized customerName.');
    assert(customer.aliases.includes('Harness'), 'Customer aliases should preserve useful aliases.');
    assert(new Set(customer.aliases).size === customer.aliases.length, 'Customer aliases should be unique.');
    assert(service.getCustomers().some((item) => item.customerId === customer.customerId), 'Created customer should be immediately readable.');

    await expectConflict(
      () => controller.createDrawingCustomer({ customerName: 'Acme Harness' }),
      'Duplicate customer name should be rejected.',
    );

    const updatedCustomer = controller.updateDrawingCustomer(customer.customerId, {
      customerName: 'Acme Harness East',
      customerShortName: 'AHE',
      customerCode: ' AHE-01 ',
      aliases: ['AHE', 'East'],
    });
    assert(updatedCustomer.customerName === 'Acme Harness East', 'Customer update should change customerName.');
    assert(updatedCustomer.customerShortName === 'AHE', 'Customer update should change short name.');
    assert(updatedCustomer.customerCode === 'AHE-01', 'Customer update should trim customerCode.');
    assert(service.getCustomers({ q: 'East' }).length === 1, 'Updated customer should be searchable.');

    const secondCustomer = controller.createDrawingCustomer({
      customerName: 'Second Customer',
      customerShortName: 'SC',
    });
    await expectConflict(
      () => controller.updateDrawingCustomer(secondCustomer.customerId, { customerName: 'Acme   Harness East' }),
      'Updating customer to duplicate normalized name should be rejected.',
    );

    const product = controller.createDrawingProduct({
      customerId: customer.customerId,
      productModel: ' HL CTRL 1907B ',
      remark: ' first product ',
    });
    assert(product.customerId === customer.customerId, 'Created product should belong to the requested customer.');
    assert(product.productModel === 'HL CTRL 1907B', 'Product model should be trimmed.');
    assert(product.normalizedProductModel === 'HL-CTRL-1907B', 'Product model should be normalized.');
    assert(product.productName === 'HL CTRL 1907B', 'Product name should default to productModel.');
    assert(product.drawingStatus === 'no_drawing', 'New product drawingStatus should default to no_drawing.');
    assert(service.getProducts(customer.customerId).some((item) => item.productId === product.productId), 'Created product should be immediately readable.');

    const detail = await service.getProduct(product.productId);
    assert(detail.product.productId === product.productId, 'Created product detail should be readable.');
    assert(detail.customer.customerId === customer.customerId, 'Created product detail should include customer.');
    assert(detail.modules.length === 6, 'Created product should have six default modules.');
    assert(detail.modules.every((module) => module.items.length === 0), 'Created product modules should start empty.');

    await expectConflict(
      () => controller.createDrawingProduct({
        customerId: customer.customerId,
        productModel: 'HL-CTRL-1907B',
      }),
      'Duplicate product model under same customer should be rejected.',
    );

    const sameModelOtherCustomer = controller.createDrawingProduct({
      customerId: secondCustomer.customerId,
      productModel: 'HL-CTRL-1907B',
      productName: 'Allowed under another customer',
    });
    assert(
      sameModelOtherCustomer.customerId === secondCustomer.customerId,
      'Same product model should be allowed under another customer.',
    );

    const secondProduct = controller.createDrawingProduct({
      customerId: customer.customerId,
      productModel: 'HL-BACK-3302C',
      productName: 'Back harness',
    });
    await expectConflict(
      () => controller.updateDrawingProduct(secondProduct.productId, { productModel: 'HL CTRL 1907B' }),
      'Updating product to duplicate model under same customer should be rejected.',
    );

    const updatedProduct = controller.updateDrawingProduct(product.productId, {
      productModel: 'HL-FRONT-2210A',
      productName: 'Front harness',
      remark: ' updated ',
    });
    assert(updatedProduct.normalizedProductModel === 'HL-FRONT-2210A', 'Product update should normalize model.');
    assert(updatedProduct.productName === 'Front harness', 'Product update should change productName.');
    assert(updatedProduct.remark === 'updated', 'Product update should trim remark.');

    const updatedDetail = await service.getProduct(product.productId);
    assert(updatedDetail.product.normalizedProductModel === 'HL-FRONT-2210A', 'Product detail should reflect updated product.');
    const byModel = await service.getProductByModel('HL-FRONT-2210A');
    assert(byModel?.product.productId === product.productId, 'Updated product should be readable by new model.');
  } finally {
    if (previousDemoMode === undefined) delete process.env.DEMO_DATA_MODE;
    else process.env.DEMO_DATA_MODE = previousDemoMode;
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

console.log('Drawing customer/product write check');
console.log('This check uses isolated temp metadata and does not connect to a database.');

runApiBuild();
if (!blockers.length) {
  checkControllerRoutes();
  await checkCustomerProductWrites();
}

if (blockers.length) {
  console.error('\nDrawing customer/product write check failed:');
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exit(1);
}

console.log('Drawing customer/product write check passed.');
