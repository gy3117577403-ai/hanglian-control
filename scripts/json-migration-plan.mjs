#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleKeys = new Set(['original_drawing', 'sop', 'finished_images', 'accessory_specs', 'notes', 'tooling']);
const executionOrder = [
  'Customers',
  'Products',
  'ProductModules',
  'ProductDocuments',
  'PdfImportBatches',
  'PdfImportItems',
  'ProductionOrders',
  'AuditLogs',
  'DeleteLockSetting',
];

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith('--')) continue;
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) args.set(key, true);
    else {
      args.set(key, next);
      index += 1;
    }
  }
  return args;
}

function requireString(args, name) {
  const value = args.get(name);
  if (!value || value === true) {
    throw new Error(`${name} 为必填参数。`);
  }
  return String(value);
}

function sha256File(file) {
  if (!existsSync(file)) return null;
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  return JSON.parse(readFileSync(file, 'utf8'));
}

function readArray(file) {
  const value = readJson(file, []);
  return Array.isArray(value) ? value : [];
}

function readObject(file) {
  const value = readJson(file, {});
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function safeStoragePath(root, storageKey) {
  if (!storageKey || typeof storageKey !== 'string') return undefined;
  if (storageKey.includes('..') || storageKey.startsWith('/') || /^[A-Za-z]:[\\/]/.test(storageKey)) return undefined;
  const full = resolve(root, storageKey.replaceAll('/', sep));
  const normalizedRoot = resolve(root);
  return full === normalizedRoot || full.startsWith(`${normalizedRoot}${sep}`) ? full : undefined;
}

function duplicateValues(records, keySelector) {
  const seen = new Set();
  const duplicates = new Set();
  for (const record of records) {
    const key = keySelector(record);
    if (!key) continue;
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  }
  return [...duplicates].sort();
}

function migrationKey(prefix, value) {
  return `${prefix}:${createHash('sha256').update(String(value ?? '')).digest('hex').slice(0, 20)}`;
}

function normalizeArray(records, keySelector) {
  return [...records]
    .map((record) => ({
      migrationKey: migrationKey(keySelector(record)?.prefix ?? 'record', keySelector(record)?.value ?? JSON.stringify(record)),
      ...record,
    }))
    .sort((left, right) => String(left.migrationKey).localeCompare(String(right.migrationKey)));
}

function extractProductModules(moduleState) {
  const modules = [];
  const details = Array.isArray(moduleState.details) ? moduleState.details : [];
  for (const detail of details) {
    const productId = detail?.product?.productId;
    for (const module of Array.isArray(detail?.modules) ? detail.modules : []) {
      modules.push({
        productId,
        moduleKey: module?.moduleKey,
        moduleName: module?.moduleName,
        status: module?.status,
        coverDocumentId: module?.coverDocumentId ?? null,
        itemCount: Array.isArray(module?.items) ? module.items.length : 0,
      });
    }
  }
  return modules;
}

function collectDocumentsFromModuleState(moduleState) {
  const documents = [];
  const details = Array.isArray(moduleState.details) ? moduleState.details : [];
  for (const detail of details) {
    const productId = detail?.product?.productId;
    for (const module of Array.isArray(detail?.modules) ? detail.modules : []) {
      for (const item of Array.isArray(module?.items) ? module.items : []) {
        documents.push({
          ...item,
          productId,
          moduleKey: module?.moduleKey,
          documentId: item?.documentId ?? item?.itemId,
        });
      }
    }
  }
  return documents;
}

export function collectPlan(options) {
  const metadataRoot = resolve(options.metadataRoot);
  const uploadsRoot = resolve(options.uploadsRoot);
  if (!existsSync(metadataRoot)) throw new Error('metadata-root 不存在。');
  if (!existsSync(uploadsRoot)) throw new Error('uploads-root 不存在。');

  const customers = readArray(join(metadataRoot, 'drawing-customers.json'));
  const products = readArray(join(metadataRoot, 'drawing-products.json'));
  const moduleState = readObject(join(metadataRoot, 'drawing-module-settings.json'));
  const drawingImportBatches = readArray(join(metadataRoot, 'drawing-import-records.json'));
  const orders = readArray(join(metadataRoot, 'production-orders.json'));
  const orderImportBatches = readArray(join(metadataRoot, 'order-import-records.json'));
  const storageDocuments = readArray(join(metadataRoot, 'documents.json'));
  const auditLogs = readArray(join(metadataRoot, 'audit-logs.json'));
  const deleteLockSetting = readObject(join(metadataRoot, 'delete-lock-settings.json'));
  const moduleDocuments = collectDocumentsFromModuleState(moduleState);
  const documents = [...storageDocuments, ...moduleDocuments];
  const modules = extractProductModules(moduleState);
  const pdfImportItems = drawingImportBatches.flatMap((batch) => (
    Array.isArray(batch?.items) ? batch.items.map((item) => ({ ...item, importBatchId: item.importBatchId ?? batch.importBatchId })) : []
  ));

  const customerIds = new Set(customers.map((item) => item?.customerId).filter(Boolean));
  const productIds = new Set(products.map((item) => item?.productId).filter(Boolean));
  const documentIds = new Set(documents.map((item) => item?.documentId ?? item?.id ?? item?.itemId).filter(Boolean));
  const importBatchIds = new Set(drawingImportBatches.map((item) => item?.importBatchId).filter(Boolean));
  const invalidRecords = [];
  const missingRelations = [];
  const missingFiles = [];
  const checksumConflicts = [];
  const warnings = [];
  const blockers = [];

  for (const customer of customers) {
    if (!customer?.customerName) invalidRecords.push({ model: 'Customer', id: customer?.customerId, reason: 'customerName 为空' });
    if (customer?.status && !['active', 'inactive'].includes(customer.status)) warnings.push({ model: 'Customer', id: customer.customerId, reason: 'status 非标准值' });
  }
  for (const product of products) {
    if (!product?.customerId || !customerIds.has(product.customerId)) missingRelations.push({ model: 'Product', id: product?.productId, relation: 'customerId' });
    if (!product?.normalizedProductModel) invalidRecords.push({ model: 'Product', id: product?.productId, reason: 'normalizedProductModel 缺失' });
  }
  for (const module of modules) {
    if (!productIds.has(module.productId)) missingRelations.push({ model: 'ProductModule', id: `${module.productId}:${module.moduleKey}`, relation: 'productId' });
    if (!moduleKeys.has(module.moduleKey)) invalidRecords.push({ model: 'ProductModule', id: `${module.productId}:${module.moduleKey}`, reason: 'moduleKey 非法' });
    if (module.coverDocumentId && !documentIds.has(module.coverDocumentId)) missingRelations.push({ model: 'ProductModule', id: `${module.productId}:${module.moduleKey}`, relation: 'coverDocumentId' });
  }
  for (const document of documents) {
    const id = document?.documentId ?? document?.id ?? document?.itemId;
    if (document?.productId && !productIds.has(document.productId)) missingRelations.push({ model: 'ProductDocument', id, relation: 'productId' });
    if (document?.moduleKey && !moduleKeys.has(document.moduleKey)) invalidRecords.push({ model: 'ProductDocument', id, reason: 'moduleKey 非法' });
    const storageKey = document?.storageKey;
    if (storageKey) {
      const file = safeStoragePath(uploadsRoot, storageKey);
      if (!file || !existsSync(file)) {
        missingFiles.push({ model: 'ProductDocument', id, storageKey });
      } else {
        const size = statSync(file).size;
        if (Number.isFinite(Number(document.fileSize)) && Number(document.fileSize) !== size) {
          warnings.push({ model: 'ProductDocument', id, reason: 'fileSize 不一致' });
        }
        if (document.checksumSha256) {
          const checksum = sha256File(file);
          if (checksum && checksum !== document.checksumSha256) checksumConflicts.push({ model: 'ProductDocument', id, storageKey });
        }
      }
    }
  }
  for (const order of orders) {
    if (order?.linkedProductId && !productIds.has(order.linkedProductId)) missingRelations.push({ model: 'ProductionOrder', id: order?.orderId, relation: 'linkedProductId' });
    if (order?.productResolutionStatus === 'found' && !order.linkedProductId) invalidRecords.push({ model: 'ProductionOrder', id: order?.orderId, reason: 'found 但 linkedProductId 为空' });
    if (order?.productResolutionStatus !== 'found' && ['front', 'back'].includes(order?.productionStatus)) invalidRecords.push({ model: 'ProductionOrder', id: order?.orderId, reason: '未建档订单不应为 front/back' });
  }
  for (const item of pdfImportItems) {
    if (item?.importBatchId && !importBatchIds.has(item.importBatchId)) missingRelations.push({ model: 'PdfImportItem', id: item?.importItemId, relation: 'importBatchId' });
    if (item?.stagedFileKey && String(item.stagedFileKey).startsWith('documents/')) warnings.push({ model: 'PdfImportItem', id: item?.importItemId, reason: 'stagedFileKey 指向正式资料路径' });
  }
  for (const log of auditLogs) {
    const text = JSON.stringify(log);
    if (/DATABASE_URL|passwordHash|Token|Secret/i.test(text)) warnings.push({ model: 'AuditLog', id: log?.id ?? log?.auditLogId, reason: '审计日志包含敏感字段名' });
  }
  if (deleteLockSetting.password) invalidRecords.push({ model: 'DeleteLockSetting', id: 'delete-lock', reason: '存在明文 password' });
  if (deleteLockSetting.failedAttempts !== undefined && Number(deleteLockSetting.failedAttempts) < 0) invalidRecords.push({ model: 'DeleteLockSetting', id: 'delete-lock', reason: 'failedAttempts 非法' });

  const duplicates = {
    customerId: duplicateValues(customers, (item) => item?.customerId),
    productId: duplicateValues(products, (item) => item?.productId),
    productModelByCustomer: duplicateValues(products, (item) => item?.customerId && item?.normalizedProductModel ? `${item.customerId}:${item.normalizedProductModel}` : ''),
    productModule: duplicateValues(modules, (item) => item?.productId && item?.moduleKey ? `${item.productId}:${item.moduleKey}` : ''),
    documentId: duplicateValues(documents, (item) => item?.documentId ?? item?.id ?? item?.itemId),
    orderId: duplicateValues(orders, (item) => item?.orderId),
  };

  if (Object.values(duplicates).some((items) => items.length)) blockers.push('存在重复主键或唯一键。');
  if (invalidRecords.length) blockers.push('存在阻塞迁移的非法记录。');
  if (missingRelations.length) blockers.push('存在孤立关联。');
  if (missingFiles.length) warnings.push({ model: 'ProductDocument', reason: '存在缺失文件，需人工确认是否允许只迁移 metadata。' });
  if (checksumConflicts.length) blockers.push('存在 checksum 冲突。');

  const modelPlan = {
    Customers: customers.length,
    Products: products.length,
    ProductModules: modules.length,
    ProductDocuments: documents.length,
    PdfImportBatches: drawingImportBatches.length + orderImportBatches.length,
    PdfImportItems: pdfImportItems.length,
    ProductionOrders: orders.length,
    AuditLogs: auditLogs.length,
    DeleteLockSetting: Object.keys(deleteLockSetting).length ? 1 : 0,
  };

  return {
    generatedAt: new Date().toISOString(),
    sourceRoot: {
      metadataRootLabel: basename(metadataRoot),
      uploadsRootLabel: basename(uploadsRoot),
      metadataRootConfigured: true,
      uploadsRootConfigured: true,
    },
    counts: {
      customers: customers.length,
      products: products.length,
      modules: modules.length,
      documents: documents.length,
      drawingImportBatches: drawingImportBatches.length,
      drawingImportItems: pdfImportItems.length,
      orderImportBatches: orderImportBatches.length,
      orders: orders.length,
      auditLogs: auditLogs.length,
      deleteLockSetting: Object.keys(deleteLockSetting).length ? 1 : 0,
    },
    duplicates,
    invalidRecords,
    missingRelations,
    missingFiles,
    checksumConflicts,
    modelPlan,
    executionOrder,
    blockers,
    warnings,
    snapshots: {
      customers: normalizeArray(customers, (item) => ({ prefix: 'customer', value: item?.customerId })),
      products: normalizeArray(products, (item) => ({ prefix: 'product', value: item?.productId })),
      modules: normalizeArray(modules, (item) => ({ prefix: 'module', value: `${item?.productId}:${item?.moduleKey}` })),
      documents: normalizeArray(documents, (item) => ({ prefix: 'document', value: item?.documentId ?? item?.id ?? item?.itemId })),
      pdfImportBatches: normalizeArray(drawingImportBatches, (item) => ({ prefix: 'pdf-batch', value: item?.importBatchId })),
      pdfImportItems: normalizeArray(pdfImportItems, (item) => ({ prefix: 'pdf-item', value: item?.importItemId })),
      orders: normalizeArray(orders, (item) => ({ prefix: 'order', value: item?.orderId })),
      auditLogs: normalizeArray(auditLogs, (item) => ({ prefix: 'audit', value: item?.auditLogId ?? item?.id ?? item?.createdAt })),
      deleteLockSetting: Object.keys(deleteLockSetting).length ? [{ migrationKey: 'delete-lock:default', ...deleteLockSetting }] : [],
    },
    sourceFileHashes: {
      customers: sha256File(join(metadataRoot, 'drawing-customers.json')),
      products: sha256File(join(metadataRoot, 'drawing-products.json')),
      moduleState: sha256File(join(metadataRoot, 'drawing-module-settings.json')),
      drawingImportRecords: sha256File(join(metadataRoot, 'drawing-import-records.json')),
      documents: sha256File(join(metadataRoot, 'documents.json')),
      productionOrders: sha256File(join(metadataRoot, 'production-orders.json')),
      orderImportRecords: sha256File(join(metadataRoot, 'order-import-records.json')),
      auditLogs: sha256File(join(metadataRoot, 'audit-logs.json')),
      deleteLockSetting: sha256File(join(metadataRoot, 'delete-lock-settings.json')),
    },
  };
}

export function writeSnapshot(plan, outputDir) {
  const target = resolve(outputDir);
  mkdirSync(target, { recursive: true });
  const files = {
    'customers.json': plan.snapshots.customers,
    'products.json': plan.snapshots.products,
    'modules.json': plan.snapshots.modules,
    'documents.json': plan.snapshots.documents,
    'pdf-import-batches.json': plan.snapshots.pdfImportBatches,
    'pdf-import-items.json': plan.snapshots.pdfImportItems,
    'orders.json': plan.snapshots.orders,
    'audit-logs.json': plan.snapshots.auditLogs,
    'delete-lock-setting.json': plan.snapshots.deleteLockSetting,
  };
  for (const [fileName, records] of Object.entries(files)) {
    writeFileSync(join(target, fileName), `${JSON.stringify(records, null, 2)}\n`);
  }
  writeFileSync(join(target, 'manifest.json'), `${JSON.stringify({
    generatedAt: plan.generatedAt,
    executionOrder: plan.executionOrder,
    sourceFileHashes: plan.sourceFileHashes,
    counts: plan.counts,
    files: Object.fromEntries(Object.entries(files).map(([fileName, records]) => [fileName, records.length])),
  }, null, 2)}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const metadataRoot = requireString(args, '--metadata-root');
  const uploadsRoot = requireString(args, '--uploads-root');
  const plan = collectPlan({ metadataRoot, uploadsRoot });
  if (args.has('--output')) writeSnapshot(plan, requireString(args, '--output'));
  const { snapshots: _snapshots, ...printable } = plan;
  console.log(JSON.stringify(printable, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
