#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  documentEffectiveConflictKey,
  documentEffectiveVersionGroupKey,
  drawingModuleForDocumentType,
  isInactiveDocumentForEffectiveCheck,
  supportsSingleEffectiveVersion,
} from './document-version-rules.mjs';

const moduleKeys = new Set(['original_drawing', 'sop', 'finished_images', 'accessory_specs', 'notes', 'tooling']);
const executionOrder = [
  'Customers',
  'Products',
  'ProductModules',
  'ProductDocuments',
  'PdfImportBatches',
  'PdfImportItems',
  'ProductionOrders',
  'OrderImportBatches',
  'OrderImportItems',
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
  if (!value || value === true) throw new Error(`${name} is required.`);
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
    .map((record) => {
      const key = keySelector(record);
      return {
        migrationKey: migrationKey(key?.prefix ?? 'record', key?.value ?? JSON.stringify(record)),
        ...record,
      };
    })
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

function collectOrderImportItems(orderImportBatches) {
  const items = [];
  for (const batch of orderImportBatches) {
    const importBatchId = batch?.importBatchId;
    const applyItemsById = new Map(
      (Array.isArray(batch?.applyItems) ? batch.applyItems : [])
        .filter((item) => item?.importItemId)
        .map((item) => [item.importItemId, item]),
    );
    for (const item of Array.isArray(batch?.items) ? batch.items : []) {
      const applyItem = applyItemsById.get(item?.importItemId);
      items.push({
        ...item,
        importBatchId: item?.importBatchId ?? importBatchId,
        applyResult: applyItem?.result,
        orderId: applyItem?.orderId,
        appliedAt: applyItem?.appliedAt,
      });
      if (item?.importItemId) applyItemsById.delete(item.importItemId);
    }
    for (const item of applyItemsById.values()) {
      items.push({ ...item, importBatchId });
    }
  }
  return items;
}

function collectMultipleEffectiveVersions(documents) {
  const groups = new Map();
  for (const document of documents) {
    const status = document?.documentStatus ?? document?.status;
    const productId = document?.productId;
    const moduleKey = document?.moduleKey ?? drawingModuleForDocumentType(document?.documentType);
    const documentId = document?.documentId ?? document?.id ?? document?.itemId;
    const versionGroupKey = documentEffectiveVersionGroupKey({ ...document, moduleKey });
    const conflictKey = documentEffectiveConflictKey({ ...document, moduleKey });
    if (isInactiveDocumentForEffectiveCheck(document)) continue;
    if (!supportsSingleEffectiveVersion(moduleKey)) continue;
    if (status !== 'effective' || !productId || !moduleKey || !documentId) continue;
    const key = conflictKey ?? `${productId}::${moduleKey}::${versionGroupKey ?? 'unknown'}`;
    const group = groups.get(key) ?? { productId, moduleKey, versionGroupKey, conflictKey: key, documentIds: [] };
    group.documentIds.push(documentId);
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter((group) => group.documentIds.length > 1)
    .sort((left, right) => String(left.conflictKey).localeCompare(String(right.conflictKey)));
}

export function assertWritablePathOutsideSources(targetPath, sourceRoots) {
  const target = resolve(targetPath);
  for (const root of sourceRoots.map((item) => resolve(item))) {
    if (target === root || target.startsWith(`${root}${sep}`)) {
      throw new Error('dry-run output path must not be inside metadata-root or uploads-root.');
    }
  }
}

export function writeManifestFile(manifestPath, payload, sourceRoots) {
  assertWritablePathOutsideSources(manifestPath, sourceRoots);
  mkdirSync(dirname(resolve(manifestPath)), { recursive: true });
  writeFileSync(resolve(manifestPath), `${JSON.stringify(payload, null, 2)}\n`);
}

export function collectPlan(options) {
  const metadataRoot = resolve(options.metadataRoot);
  const uploadsRoot = resolve(options.uploadsRoot);
  if (!existsSync(metadataRoot)) throw new Error('metadata-root does not exist.');
  if (!existsSync(uploadsRoot)) throw new Error('uploads-root does not exist.');

  const customers = readArray(join(metadataRoot, 'drawing-customers.json'));
  const products = readArray(join(metadataRoot, 'drawing-products.json'));
  const moduleState = readObject(join(metadataRoot, 'drawing-module-settings.json'));
  const pdfImportBatches = readArray(join(metadataRoot, 'drawing-import-records.json'));
  const productionOrders = readArray(join(metadataRoot, 'production-orders.json'));
  const orderImportBatches = readArray(join(metadataRoot, 'order-import-records.json'));
  const storageDocuments = readArray(join(metadataRoot, 'documents.json'));
  const auditLogs = readArray(join(metadataRoot, 'audit-logs.json'));
  const deleteLockSetting = readObject(join(metadataRoot, 'delete-lock-settings.json'));
  const moduleDocuments = collectDocumentsFromModuleState(moduleState);
  const productDocuments = [...storageDocuments, ...moduleDocuments];
  const productModules = extractProductModules(moduleState);
  const pdfImportItems = pdfImportBatches.flatMap((batch) => (
    Array.isArray(batch?.items) ? batch.items.map((item) => ({ ...item, importBatchId: item?.importBatchId ?? batch?.importBatchId })) : []
  ));
  const orderImportItems = collectOrderImportItems(orderImportBatches);
  const multipleEffectiveVersions = collectMultipleEffectiveVersions(productDocuments);

  const customerIds = new Set(customers.map((item) => item?.customerId).filter(Boolean));
  const productIds = new Set(products.map((item) => item?.productId).filter(Boolean));
  const documentIds = new Set(productDocuments.map((item) => item?.documentId ?? item?.id ?? item?.itemId).filter(Boolean));
  const activeDocumentIds = new Set(productDocuments
    .filter((item) => !isInactiveDocumentForEffectiveCheck(item))
    .map((item) => item?.documentId ?? item?.id ?? item?.itemId)
    .filter(Boolean));
  const pdfImportBatchIds = new Set(pdfImportBatches.map((item) => item?.importBatchId).filter(Boolean));
  const orderImportBatchIds = new Set(orderImportBatches.map((item) => item?.importBatchId).filter(Boolean));
  const orderIds = new Set(productionOrders.map((item) => item?.orderId).filter(Boolean));
  const invalidRecords = [];
  const orphanRelations = [];
  const missingFiles = [];
  const checksumConflicts = [];
  const warnings = [];
  const blockers = [];

  for (const customer of customers) {
    if (!customer?.customerName) invalidRecords.push({ model: 'Customer', id: customer?.customerId, reason: 'customerName is empty' });
    if (customer?.status && !['active', 'inactive'].includes(customer.status)) warnings.push({ model: 'Customer', id: customer.customerId, reason: 'non-standard status' });
  }
  for (const product of products) {
    if (!product?.customerId || !customerIds.has(product.customerId)) orphanRelations.push({ model: 'Product', id: product?.productId, relation: 'customerId' });
    if (!product?.normalizedProductModel) invalidRecords.push({ model: 'Product', id: product?.productId, reason: 'normalizedProductModel is missing' });
  }
  for (const module of productModules) {
    if (!productIds.has(module.productId)) orphanRelations.push({ model: 'ProductModule', id: `${module.productId}:${module.moduleKey}`, relation: 'productId' });
    if (!moduleKeys.has(module.moduleKey)) invalidRecords.push({ model: 'ProductModule', id: `${module.productId}:${module.moduleKey}`, reason: 'invalid moduleKey' });
    if (module.coverDocumentId && (!documentIds.has(module.coverDocumentId) || !activeDocumentIds.has(module.coverDocumentId))) {
      orphanRelations.push({ model: 'ProductModule', id: `${module.productId}:${module.moduleKey}`, relation: 'coverDocumentId' });
    }
  }
  for (const document of productDocuments) {
    const id = document?.documentId ?? document?.id ?? document?.itemId;
    if (document?.productId && !productIds.has(document.productId)) orphanRelations.push({ model: 'ProductDocument', id, relation: 'productId' });
    if (document?.moduleKey && !moduleKeys.has(document.moduleKey)) invalidRecords.push({ model: 'ProductDocument', id, reason: 'invalid moduleKey' });
    const storageKey = document?.storageKey;
    if (storageKey) {
      const file = safeStoragePath(uploadsRoot, storageKey);
      if (!file || !existsSync(file)) {
        missingFiles.push({ model: 'ProductDocument', id, storageKey });
      } else {
        const size = statSync(file).size;
        if (Number.isFinite(Number(document.fileSize)) && Number(document.fileSize) !== size) {
          warnings.push({ model: 'ProductDocument', id, reason: 'fileSize does not match upload file size' });
        }
        if (document.checksumSha256) {
          const checksum = sha256File(file);
          if (checksum && checksum !== document.checksumSha256) checksumConflicts.push({ model: 'ProductDocument', id, storageKey });
        }
      }
    }
  }
  for (const order of productionOrders) {
    if (order?.linkedProductId && !productIds.has(order.linkedProductId)) orphanRelations.push({ model: 'ProductionOrder', id: order?.orderId, relation: 'linkedProductId' });
    if (order?.productResolutionStatus === 'found' && !order.linkedProductId) invalidRecords.push({ model: 'ProductionOrder', id: order?.orderId, reason: 'found order has no linkedProductId' });
    if (order?.productResolutionStatus !== 'found' && ['front', 'back'].includes(order?.productionStatus)) invalidRecords.push({ model: 'ProductionOrder', id: order?.orderId, reason: 'unresolved product should not be front/back' });
  }
  for (const item of pdfImportItems) {
    if (item?.importBatchId && !pdfImportBatchIds.has(item.importBatchId)) orphanRelations.push({ model: 'PdfImportItem', id: item?.importItemId, relation: 'importBatchId' });
    if (item?.stagedFileKey && String(item.stagedFileKey).startsWith('documents/')) warnings.push({ model: 'PdfImportItem', id: item?.importItemId, reason: 'stagedFileKey points to formal document storage' });
  }
  for (const item of orderImportItems) {
    if (item?.importBatchId && !orderImportBatchIds.has(item.importBatchId)) orphanRelations.push({ model: 'OrderImportItem', id: item?.importItemId, relation: 'importBatchId' });
    if (item?.orderId && !orderIds.has(item.orderId)) orphanRelations.push({ model: 'OrderImportItem', id: item.importItemId, relation: 'orderId' });
  }
  for (const log of auditLogs) {
    const text = JSON.stringify(log);
    if (/DATABASE_URL|passwordHash|Token|Secret/i.test(text)) warnings.push({ model: 'AuditLog', id: log?.id ?? log?.auditLogId, reason: 'audit log contains sensitive-looking field names' });
  }
  if (deleteLockSetting.password) invalidRecords.push({ model: 'DeleteLockSetting', id: 'delete-lock', reason: 'plain password field exists' });
  if (deleteLockSetting.failedAttempts !== undefined && Number(deleteLockSetting.failedAttempts) < 0) invalidRecords.push({ model: 'DeleteLockSetting', id: 'delete-lock', reason: 'failedAttempts is invalid' });

  const duplicateRecords = {
    customerId: duplicateValues(customers, (item) => item?.customerId),
    productId: duplicateValues(products, (item) => item?.productId),
    productModelByCustomer: duplicateValues(products, (item) => item?.customerId && item?.normalizedProductModel ? `${item.customerId}:${item.normalizedProductModel}` : ''),
    productModule: duplicateValues(productModules, (item) => item?.productId && item?.moduleKey ? `${item.productId}:${item.moduleKey}` : ''),
    documentId: duplicateValues(productDocuments, (item) => item?.documentId ?? item?.id ?? item?.itemId),
    pdfImportBatchId: duplicateValues(pdfImportBatches, (item) => item?.importBatchId),
    pdfImportItemId: duplicateValues(pdfImportItems, (item) => item?.importBatchId && item?.importItemId ? `${item.importBatchId}:${item.importItemId}` : ''),
    orderId: duplicateValues(productionOrders, (item) => item?.orderId),
    orderImportBatchId: duplicateValues(orderImportBatches, (item) => item?.importBatchId),
    orderImportItemId: duplicateValues(orderImportItems, (item) => item?.importBatchId && item?.importItemId ? `${item.importBatchId}:${item.importItemId}` : ''),
  };

  if (Object.values(duplicateRecords).some((items) => items.length)) blockers.push('duplicate primary or unique keys exist.');
  if (invalidRecords.length) blockers.push('invalid records block migration.');
  if (orphanRelations.length) blockers.push('orphan relations exist.');
  if (missingFiles.length) warnings.push({ model: 'ProductDocument', reason: 'missing uploaded files require manual review before import.' });
  if (checksumConflicts.length) blockers.push('checksum conflicts exist.');
  if (multipleEffectiveVersions.length) blockers.push('multiple effective document versions exist.');

  const counts = {
    customers: customers.length,
    products: products.length,
    productModules: productModules.length,
    productDocuments: productDocuments.length,
    pdfImportBatches: pdfImportBatches.length,
    pdfImportItems: pdfImportItems.length,
    productionOrders: productionOrders.length,
    orderImportBatches: orderImportBatches.length,
    orderImportItems: orderImportItems.length,
    auditLogs: auditLogs.length,
    deleteLockSettings: Object.keys(deleteLockSetting).length ? 1 : 0,
    duplicateRecords: Object.values(duplicateRecords).reduce((total, items) => total + items.length, 0),
    orphanRelations: orphanRelations.length,
    missingFiles: missingFiles.length,
    checksumConflicts: checksumConflicts.length,
    multipleEffectiveVersions: multipleEffectiveVersions.length,
    blockers: blockers.length,
    warnings: warnings.length,
    modules: productModules.length,
    documents: productDocuments.length,
    drawingImportBatches: pdfImportBatches.length,
    drawingImportItems: pdfImportItems.length,
    orders: productionOrders.length,
    deleteLockSetting: Object.keys(deleteLockSetting).length ? 1 : 0,
  };

  const modelPlan = {
    Customers: customers.length,
    Products: products.length,
    ProductModules: productModules.length,
    ProductDocuments: productDocuments.length,
    PdfImportBatches: pdfImportBatches.length,
    PdfImportItems: pdfImportItems.length,
    ProductionOrders: productionOrders.length,
    OrderImportBatches: orderImportBatches.length,
    OrderImportItems: orderImportItems.length,
    AuditLogs: auditLogs.length,
    DeleteLockSetting: Object.keys(deleteLockSetting).length ? 1 : 0,
  };

  return {
    generatedAt: new Date().toISOString(),
    dryRunOnly: true,
    databaseAccess: false,
    sourceRoot: {
      metadataRootLabel: basename(metadataRoot),
      uploadsRootLabel: basename(uploadsRoot),
      metadataRootConfigured: true,
      uploadsRootConfigured: true,
    },
    counts,
    duplicates: duplicateRecords,
    duplicateRecords,
    invalidRecords,
    missingRelations: orphanRelations,
    orphanRelations,
    missingFiles,
    checksumConflicts,
    multipleEffectiveVersions,
    modelPlan,
    executionOrder,
    blockers,
    warnings,
    snapshots: {
      customers: normalizeArray(customers, (item) => ({ prefix: 'customer', value: item?.customerId })),
      products: normalizeArray(products, (item) => ({ prefix: 'product', value: item?.productId })),
      modules: normalizeArray(productModules, (item) => ({ prefix: 'module', value: `${item?.productId}:${item?.moduleKey}` })),
      documents: normalizeArray(productDocuments, (item) => ({ prefix: 'document', value: item?.documentId ?? item?.id ?? item?.itemId })),
      pdfImportBatches: normalizeArray(pdfImportBatches, (item) => ({ prefix: 'pdf-batch', value: item?.importBatchId })),
      pdfImportItems: normalizeArray(pdfImportItems, (item) => ({ prefix: 'pdf-item', value: `${item?.importBatchId}:${item?.importItemId}` })),
      orders: normalizeArray(productionOrders, (item) => ({ prefix: 'order', value: item?.orderId })),
      orderImportBatches: normalizeArray(orderImportBatches, (item) => ({ prefix: 'order-batch', value: item?.importBatchId })),
      orderImportItems: normalizeArray(orderImportItems, (item) => ({ prefix: 'order-item', value: `${item?.importBatchId}:${item?.importItemId}` })),
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
    'order-import-batches.json': plan.snapshots.orderImportBatches,
    'order-import-items.json': plan.snapshots.orderImportItems,
    'audit-logs.json': plan.snapshots.auditLogs,
    'delete-lock-setting.json': plan.snapshots.deleteLockSetting,
  };
  for (const [fileName, records] of Object.entries(files)) {
    writeFileSync(join(target, fileName), `${JSON.stringify(records, null, 2)}\n`);
  }
  writeFileSync(join(target, 'manifest.json'), `${JSON.stringify({
    generatedAt: plan.generatedAt,
    dryRunOnly: true,
    databaseAccess: false,
    executionOrder: plan.executionOrder,
    sourceFileHashes: plan.sourceFileHashes,
    counts: plan.counts,
    duplicateRecords: plan.duplicateRecords,
    orphanRelations: plan.orphanRelations,
    missingFiles: plan.missingFiles,
    checksumConflicts: plan.checksumConflicts,
    multipleEffectiveVersions: plan.multipleEffectiveVersions,
    blockers: plan.blockers,
    warnings: plan.warnings,
    files: Object.fromEntries(Object.entries(files).map(([fileName, records]) => [fileName, records.length])),
  }, null, 2)}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const metadataRoot = requireString(args, '--metadata-root');
  const uploadsRoot = requireString(args, '--uploads-root');
  const plan = collectPlan({ metadataRoot, uploadsRoot });
  if (args.has('--output')) {
    const outputDir = requireString(args, '--output');
    assertWritablePathOutsideSources(outputDir, [metadataRoot, uploadsRoot]);
    writeSnapshot(plan, outputDir);
  }
  const { snapshots: _snapshots, ...printable } = plan;
  if (args.has('--manifest')) {
    writeManifestFile(requireString(args, '--manifest'), printable, [metadataRoot, uploadsRoot]);
  }
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
