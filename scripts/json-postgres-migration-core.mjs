import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertWritablePathOutsideSources, collectPlan } from './json-migration-plan.mjs';
import { assertPrismaSchemaRoute, createSchemaAwarePrismaPgAdapter } from './prisma-pg-schema-route.mjs';
import {
  documentEffectiveVersionGroupKey,
  documentTypeForDrawingModule,
  requiredProcessForDrawingModule,
} from './document-version-rules.mjs';

export const importStageOrder = [
  'Customers',
  'Products',
  'ProductModules',
  'ProductDocuments',
  'PdfImportBatches',
  'PdfImportItems',
  'OrderImportBatches',
  'OrderImportItems',
  'ProductionOrders',
  'AuditLogs',
  'DeleteLockSetting',
];

const documentTypeToPrisma = {
  drawing_pdf: 'DRAWING_PDF',
  sop_image: 'SOP_IMAGE',
  connector_manual: 'CONNECTOR_MANUAL',
  pinout_diagram: 'PINOUT_DIAGRAM',
  finished_detail_image: 'FINISHED_DETAIL_IMAGE',
  process_card: 'PROCESS_CARD',
};

const documentStatusToPrisma = {
  effective: 'EFFECTIVE',
  pending_review: 'PENDING_REVIEW',
  expired: 'EXPIRED',
  missing: 'MISSING',
  inconsistent: 'INCONSISTENT',
};

const documentSourceToPrisma = {
  mock: 'MOCK',
  wecom_disk: 'WECOM_DISK',
  manual_upload: 'MANUAL_UPLOAD',
  pdf_import: 'PDF_IMPORT',
  manual_create: 'MANUAL_CREATE',
  future_wecom: 'FUTURE_WECOM',
  seed: 'SEED',
  camera_capture: 'MANUAL_UPLOAD',
  wecom_disk_future: 'FUTURE_WECOM',
};

const processToPrisma = {
  front: 'FRONT',
  back: 'BACK',
  common: 'COMMON',
  FRONT: 'FRONT',
  BACK: 'BACK',
  COMMON: 'COMMON',
};

const auditEntityToPrisma = {
  customer: 'CUSTOMER',
  document: 'DOCUMENT',
  plan: 'PLAN',
  feedback: 'FEEDBACK',
  file: 'FILE',
  system: 'SYSTEM',
  import: 'IMPORT',
  knowledge: 'KNOWLEDGE',
  product: 'PRODUCT',
  product_module: 'PRODUCT_MODULE',
  pdf_import_batch: 'PDF_IMPORT_BATCH',
  pdf_import_item: 'PDF_IMPORT_ITEM',
  delete_lock: 'DELETE_LOCK',
};

const auditActionToPrisma = {
  customer_created: 'CUSTOMER_CREATED',
  customer_updated: 'CUSTOMER_UPDATED',
  product_created: 'PRODUCT_CREATED',
  product_updated: 'PRODUCT_UPDATED',
  product_module_updated: 'PRODUCT_MODULE_UPDATED',
  document_uploaded: 'DOCUMENT_UPLOADED',
  pdf_drawing_imported: 'DOCUMENT_UPLOADED',
  document_status_changed: 'DOCUMENT_STATUS_CHANGED',
  document_version_changed: 'DOCUMENT_VERSION_CHANGED',
  document_set_effective: 'DOCUMENT_SET_EFFECTIVE',
  document_archived: 'DOCUMENT_ARCHIVED',
  document_trashed: 'DOCUMENT_TRASHED',
  document_restored: 'DOCUMENT_RESTORED',
  document_purged: 'DOCUMENT_PURGED',
  document_previewed: 'DOCUMENT_PREVIEWED',
  document_downloaded: 'DOCUMENT_DOWNLOADED',
  pdf_import_previewed: 'PDF_IMPORT_PREVIEWED',
  pdf_import_applied: 'PDF_IMPORT_APPLIED',
  pdf_import_product_created: 'BUSINESS_DATA_IMPORTED',
  delete_lock_updated: 'DELETE_LOCK_UPDATED',
  readiness_recalculated: 'READINESS_RECALCULATED',
  migration_preview_generated: 'MIGRATION_PREVIEW_GENERATED',
  business_data_imported: 'BUSINESS_DATA_IMPORTED',
  maintenance_recorded: 'MAINTENANCE_RECORDED',
};

function cleanObject(value) {
  if (Array.isArray(value)) return value.map(cleanObject);
  if (!value || typeof value !== 'object' || value instanceof Date) return value;
  const next = {};
  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined) next[key] = cleanObject(item);
  }
  return next;
}

function text(value, fallback = undefined) {
  if (value === null || value === undefined) return fallback;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : fallback;
}

function intValue(value, fallback = undefined) {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function boolValue(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function dateValue(value, fallback = undefined) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function jsonValue(value, fallback = undefined) {
  if (value === undefined) return fallback;
  return value;
}

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 12);
}

function deterministicModuleId(productId, moduleKey) {
  return `module:${productId}:${moduleKey}`;
}

function normalizeKey(value) {
  return text(value)?.normalize('NFKC').replace(/\s+/g, ' ');
}

function documentTypeForRecord(document) {
  const apiType = text(document.documentType) ?? documentTypeForDrawingModule(text(document.moduleKey));
  if (apiType && documentTypeToPrisma[apiType]) return documentTypeToPrisma[apiType];
  if (document.fileType === 'pdf') return 'DRAWING_PDF';
  if (document.moduleKey === 'finished_images') return 'FINISHED_DETAIL_IMAGE';
  return 'PROCESS_CARD';
}

function requiredProcessForRecord(document) {
  const required = text(document.requiredForProcess) ?? requiredProcessForDrawingModule(text(document.moduleKey));
  return processToPrisma[required] ?? 'COMMON';
}

function documentStatusForRecord(document) {
  const raw = text(document.documentStatus) ?? text(document.status);
  return documentStatusToPrisma[raw] ?? 'PENDING_REVIEW';
}

function documentStatusTextForRecord(document) {
  const raw = text(document.documentStatus) ?? text(document.status);
  return documentStatusToPrisma[raw] ? raw : 'pending_review';
}

function documentSourceForRecord(document) {
  const raw = text(document.source) ?? 'manual_upload';
  return documentSourceToPrisma[raw] ?? 'MANUAL_UPLOAD';
}

function previewTypeForRecord(document) {
  if (document.previewType) return text(document.previewType);
  if (document.fileType === 'pdf' || document.mimeType === 'application/pdf') return 'pdf';
  if (document.fileType === 'text') return 'text';
  if (document.fileType === 'card') return 'card';
  return 'image';
}

function makeKeywordMeta(document, importVersion) {
  const meta = {
    ...(document.keywordMeta && typeof document.keywordMeta === 'object' && !Array.isArray(document.keywordMeta)
      ? document.keywordMeta
      : {}),
  };
  const originalVersion = text(document.version, 'V0');
  if (importVersion !== originalVersion) {
    meta.migrationOriginalVersion = originalVersion;
    meta.migrationImportVersion = importVersion;
    meta.migrationVersionDisambiguated = true;
  }
  return Object.keys(meta).length ? meta : undefined;
}

function computeImportVersions(documents) {
  const enriched = documents.map((document) => {
    const id = text(document.documentId) ?? text(document.id) ?? text(document.itemId);
    const documentType = documentTypeForRecord(document);
    const requiredForProcess = requiredProcessForRecord(document);
    const version = text(document.version, 'V0');
    return {
      id,
      moduleKey: text(document.moduleKey),
      key: [text(document.productId), documentType, requiredForProcess, version].join('\u0000'),
      version,
    };
  });
  const groups = new Map();
  for (const item of enriched) {
    if (!item.id) continue;
    groups.set(item.key, [...(groups.get(item.key) ?? []), item]);
  }
  const versions = new Map();
  for (const group of groups.values()) {
    const sorted = [...group].sort((left, right) => String(left.id).localeCompare(String(right.id)));
    for (const [index, item] of sorted.entries()) {
      if (sorted.length === 1) {
        versions.set(item.id, item.version);
        continue;
      }
      const suffixSource = item.moduleKey ? `${item.moduleKey}-${index + 1}` : item.id;
      versions.set(item.id, `${item.version}#${suffixSource}`);
    }
  }
  return versions;
}

export function assertNoPlainDatabaseUrl(argv) {
  if (argv.some((item) => /^postgres(?:ql)?:\/\//i.test(item) || item === '--database-url')) {
    throw new Error('禁止通过命令行直接传入 DATABASE_URL。');
  }
}

export function requireDatabaseUrlFromEnv(envName = 'DATABASE_URL') {
  const value = process.env[envName];
  if (!value || !String(value).trim()) {
    throw new Error(`${envName} is not configured.`);
  }
  return String(value);
}

function listGeneratedPrismaSources(sourceRoot) {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(file);
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        files.push(file);
      }
    }
  };
  walk(sourceRoot);
  return files;
}

async function transpileGeneratedPrismaClient() {
  const sourceRoot = resolve('apps/api/generated/prisma');
  if (!existsSync(join(sourceRoot, 'client.ts'))) {
    throw new Error(
      'Generated Prisma client source is missing. Run npx prisma generate --schema=apps/api/prisma/schema.prisma before executing PostgreSQL import/parity checks.',
    );
  }
  const sourceFiles = listGeneratedPrismaSources(sourceRoot);
  const signature = createHash('sha256')
    .update(sourceRoot)
    .update('\n')
    .update(
      sourceFiles
        .map((file) => {
          const stat = statSync(file);
          return `${relative(sourceRoot, file)}:${stat.size}:${Math.trunc(stat.mtimeMs)}`;
        })
        .join('\n'),
    )
    .digest('hex')
    .slice(0, 16);
  const outputRoot = resolve('node_modules/.cache', `hanglian-prisma-client-esm-${signature}`);
  const clientPath = join(outputRoot, 'client.js');
  if (existsSync(clientPath)) return clientPath;

  const ts = await import('typescript');
  mkdirSync(outputRoot, { recursive: true });
  writeFileSync(join(outputRoot, 'package.json'), `${JSON.stringify({ type: 'module' })}\n`);
  for (const file of sourceFiles) {
    const outputPath = join(outputRoot, relative(sourceRoot, file).replace(/\.ts$/, '.js'));
    mkdirSync(dirname(outputPath), { recursive: true });
    const result = ts.transpileModule(readFileSync(file, 'utf8'), {
      fileName: file,
      compilerOptions: {
        target: ts.ScriptTarget.ES2023,
        module: ts.ModuleKind.ES2022,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        esModuleInterop: true,
        sourceMap: false,
        inlineSources: false,
        isolatedModules: true,
      },
    });
    writeFileSync(outputPath, result.outputText);
  }
  return clientPath;
}

export async function createPrismaClient(databaseUrl) {
  const clientPath = await transpileGeneratedPrismaClient();
  const { PrismaClient } = await import(pathToFileURL(clientPath).href);
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const { adapter, route } = createSchemaAwarePrismaPgAdapter(PrismaPg, databaseUrl);
  const prisma = new PrismaClient({
    adapter,
    log: ['warn', 'error'],
  });
  await assertPrismaSchemaRoute(prisma, route);
  return prisma;
}

export function readJsonFile(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

export function writeJsonFile(file, payload) {
  mkdirSync(dirname(resolve(file)), { recursive: true });
  writeFileSync(resolve(file), `${JSON.stringify(payload, null, 2)}\n`);
}

export function validateDryRunManifest(plan, manifestPath) {
  if (!manifestPath) throw new Error('--dry-run-manifest is required for --execute.');
  const manifest = readJsonFile(manifestPath);
  const blockers = Array.isArray(manifest.blockers) ? manifest.blockers : [];
  if (blockers.length > 0) {
    throw new Error('dry-run manifest still contains blockers; refusing to execute import.');
  }
  const manifestHashes = manifest.sourceFileHashes;
  if (!manifestHashes || typeof manifestHashes !== 'object') {
    throw new Error('dry-run manifest does not contain sourceFileHashes.');
  }
  const changed = [];
  for (const [key, hash] of Object.entries(manifestHashes)) {
    if ((plan.sourceFileHashes?.[key] ?? null) !== (hash ?? null)) changed.push(key);
  }
  if (changed.length) {
    throw new Error(`source JSON changed since dry-run: ${changed.join(', ')}`);
  }
  return manifest;
}

export function buildImportDataset(plan) {
  const documents = plan.snapshots.documents.map((document) => {
    const id = text(document.documentId) ?? text(document.id) ?? text(document.itemId);
    return { ...document, documentId: id };
  });
  const importVersions = computeImportVersions(documents);
  const coverByDocumentId = new Map();
  for (const module of plan.snapshots.modules) {
    if (module.coverDocumentId) coverByDocumentId.set(module.coverDocumentId, `${module.productId}:${module.moduleKey}`);
  }
  return {
    Customers: plan.snapshots.customers.map(mapCustomer),
    Products: plan.snapshots.products.map(mapProduct),
    ProductModules: plan.snapshots.modules.map(mapProductModule),
    ProductDocuments: documents.map((document) => mapProductDocument(document, importVersions, coverByDocumentId)),
    PdfImportBatches: plan.snapshots.pdfImportBatches.map(mapPdfImportBatch),
    PdfImportItems: plan.snapshots.pdfImportItems.map(mapPdfImportItem),
    OrderImportBatches: plan.snapshots.orderImportBatches.map(mapOrderImportBatch),
    OrderImportItems: plan.snapshots.orderImportItems.map(mapOrderImportItem),
    ProductionOrders: plan.snapshots.orders.map(mapProductionOrder),
    AuditLogs: plan.snapshots.auditLogs.map(mapAuditLog),
    DeleteLockSetting: plan.snapshots.deleteLockSetting.map(mapDeleteLockSetting),
    ProductModuleCovers: plan.snapshots.modules
      .filter((module) => module.coverDocumentId)
      .map((module) => ({
        productId: module.productId,
        moduleKey: module.moduleKey,
        coverDocumentId: module.coverDocumentId,
      })),
  };
}

function mapCustomer(customer) {
  const id = text(customer.customerId) ?? text(customer.id);
  return cleanObject({
    id,
    name: text(customer.name) ?? text(customer.customerName, id),
    code: text(customer.code) ?? text(customer.customerCode) ?? null,
    customerName: text(customer.customerName) ?? text(customer.name, id),
    customerShortName: text(customer.customerShortName) ?? text(customer.customerName) ?? text(customer.name, id),
    customerCode: text(customer.customerCode) ?? text(customer.code) ?? null,
    aliases: jsonValue(Array.isArray(customer.aliases) ? customer.aliases : []),
    status: text(customer.status, 'active'),
    salesOwner: text(customer.salesOwner) ?? null,
    deletedAt: dateValue(customer.deletedAt, null),
    createdAt: dateValue(customer.createdAt),
    updatedAt: dateValue(customer.updatedAt),
  });
}

function mapProduct(product) {
  const id = text(product.productId) ?? text(product.id);
  const model = text(product.productModel) ?? text(product.normalizedProductModel, id);
  return cleanObject({
    id,
    customerId: text(product.customerId),
    productCode: text(product.productCode, id),
    productModel: model,
    normalizedProductModel: normalizeKey(product.normalizedProductModel) ?? normalizeKey(model) ?? id,
    productName: text(product.productName, model),
    currentVersion: text(product.currentVersion) ?? text(product.version, 'V0'),
    drawingStatus: text(product.drawingStatus, 'no_drawing'),
    source: text(product.source, 'json_import'),
    remark: text(product.remark) ?? null,
    searchKeywords: jsonValue(product.searchKeywords ?? product.keywords ?? []),
    processSegment: processToPrisma[text(product.processSegment)] ?? 'COMMON',
    isActive: product.isActive !== false,
    deletedAt: dateValue(product.deletedAt, null),
    createdAt: dateValue(product.createdAt),
    updatedAt: dateValue(product.updatedAt),
  });
}

function mapProductModule(module) {
  return cleanObject({
    id: deterministicModuleId(module.productId, module.moduleKey),
    productId: text(module.productId),
    moduleKey: text(module.moduleKey),
    moduleName: text(module.moduleName, module.moduleKey),
    status: text(module.status, 'empty'),
    remark: text(module.remark) ?? null,
    coverDocumentId: null,
    itemCount: intValue(module.itemCount, 0),
    createdAt: dateValue(module.createdAt),
    updatedAt: dateValue(module.updatedAt),
  });
}

function mapProductDocument(document, importVersions, coverByDocumentId) {
  const id = text(document.documentId) ?? text(document.id) ?? text(document.itemId);
  const moduleKey = text(document.moduleKey);
  const apiDocumentType = text(document.documentType) ?? documentTypeForDrawingModule(moduleKey);
  const apiRequiredForProcess = text(document.requiredForProcess) ?? requiredProcessForDrawingModule(moduleKey);
  const documentType = documentTypeToPrisma[apiDocumentType] ?? documentTypeForRecord(document);
  const requiredForProcess = processToPrisma[apiRequiredForProcess] ?? requiredProcessForRecord(document);
  const version = importVersions.get(id) ?? text(document.version, 'V0');
  const versionGroupKey = text(document.versionGroupKey)
    ?? documentEffectiveVersionGroupKey({
      productId: document.productId,
      moduleKey,
      documentType: apiDocumentType,
      requiredForProcess: apiRequiredForProcess,
    });
  return cleanObject({
    id,
    productId: text(document.productId),
    productionPlanId: text(document.productionPlanId) ?? text(document.planId) ?? null,
    moduleId: moduleKey ? deterministicModuleId(document.productId, moduleKey) : null,
    moduleKey: moduleKey ?? null,
    documentType,
    versionGroupKey: text(versionGroupKey) ?? null,
    title: text(document.title, id),
    version,
    contentKind: text(document.contentKind, 'document'),
    status: documentStatusForRecord(document),
    documentStatus: documentStatusTextForRecord(document),
    source: documentSourceForRecord(document),
    requiredForProcess,
    previewType: previewTypeForRecord(document),
    previewMode: text(document.previewMode) ?? null,
    originalFileName: text(document.originalFileName) ?? null,
    storedFileName: text(document.storedFileName) ?? null,
    mimeType: text(document.mimeType) ?? null,
    fileSize: intValue(document.fileSize, null),
    pageCount: intValue(document.pageCount, null),
    imageWidth: intValue(document.imageWidth, null),
    imageHeight: intValue(document.imageHeight, null),
    previewUrl: text(document.previewUrl) ?? null,
    downloadUrl: text(document.downloadUrl) ?? null,
    storageProvider: text(document.storageProvider) ?? (document.storageKey ? 'local' : null),
    storageKey: text(document.storageKey) ?? null,
    checksum: text(document.checksum) ?? text(document.checksumSha256) ?? null,
    checksumSha256: text(document.checksumSha256) ?? text(document.checksum) ?? null,
    mockPreviewText: text(document.mockPreviewText) ?? text(document.description) ?? null,
    keywords: Array.isArray(document.keywords) ? document.keywords.map(String) : [],
    keywordMeta: makeKeywordMeta(document, version),
    description: text(document.description) ?? null,
    remark: text(document.remark) ?? null,
    sortOrder: intValue(document.sortOrder, 0),
    isCover: coverByDocumentId.has(id),
    effectiveDate: dateValue(document.effectiveDate, documentStatusTextForRecord(document) === 'effective' ? dateValue(document.updatedAt, new Date(0)) : null),
    archived: boolValue(document.archived, Boolean(document.archivedAt)),
    archivedAt: dateValue(document.archivedAt, null),
    archivedBy: text(document.archivedBy) ?? null,
    deleted: boolValue(document.deleted, Boolean(document.deletedAt)),
    deletedAt: dateValue(document.deletedAt, null),
    deletedBy: text(document.deletedBy) ?? null,
    deleteReason: text(document.deleteReason) ?? null,
    restoredAt: dateValue(document.restoredAt, null),
    restoredBy: text(document.restoredBy) ?? null,
    createdAt: dateValue(document.createdAt),
    updatedAt: dateValue(document.updatedAt),
  });
}

function mapPdfImportBatch(batch) {
  const id = text(batch.id) ?? text(batch.importBatchId);
  const createdAt = dateValue(batch.createdAt, new Date(0));
  return cleanObject({
    id,
    customerId: text(batch.customerId),
    status: text(batch.status, 'previewed'),
    totalFiles: intValue(batch.totalFiles ?? batch.total, 0),
    successCount: intValue(batch.successCount ?? batch.importedFiles ?? batch.importedCount, 0),
    skippedCount: intValue(batch.skippedCount ?? batch.skippedFiles, 0),
    errorCount: intValue(batch.errorCount, 0),
    needsConfirmationCount: intValue(batch.needsConfirmationCount, 0),
    expiresAt: dateValue(batch.expiresAt, new Date(createdAt.getTime() + 24 * 60 * 60 * 1000)),
    completedAt: dateValue(batch.completedAt, null),
    appliedAt: dateValue(batch.appliedAt, null),
    applyStatus: text(batch.applyStatus) ?? null,
    applySummary: jsonValue(batch.applySummary ?? null),
    remark: text(batch.remark) ?? null,
    operatorId: text(batch.operatorId) ?? null,
    operatorName: text(batch.operatorName) ?? null,
    createdAt,
    updatedAt: dateValue(batch.updatedAt),
  });
}

function mapPdfImportItem(item) {
  const id = text(item.id) ?? text(item.importItemId);
  return cleanObject({
    id,
    importBatchId: text(item.importBatchId),
    originalFileName: text(item.originalFileName) ?? text(item.fileName, id),
    stagedFileKey: text(item.stagedFileKey, ''),
    mimeType: text(item.mimeType, 'application/pdf'),
    fileSize: intValue(item.fileSize, 0),
    checksumSha256: text(item.checksumSha256) ?? hashRecord(item),
    parsedProductModel: text(item.parsedProductModel) ?? null,
    confirmedProductModel: text(item.confirmedProductModel) ?? null,
    parsedVersion: text(item.parsedVersion) ?? null,
    confirmedVersion: text(item.confirmedVersion) ?? null,
    confidence: item.confidence === undefined ? null : Number(item.confidence),
    needsConfirmation: boolValue(item.needsConfirmation, false),
    parseWarnings: jsonValue(item.parseWarnings ?? []),
    existingProductId: text(item.existingProductId) ?? null,
    existingDocumentId: text(item.existingDocumentId) ?? null,
    action: text(item.action, 'needs_confirmation'),
    selected: item.selected !== false,
    setAsEffective: boolValue(item.setAsEffective, false),
    productName: text(item.productName) ?? null,
    result: text(item.result, 'needs_confirmation'),
    resultProductId: text(item.resultProductId) ?? null,
    resultDocumentId: text(item.resultDocumentId) ?? null,
    message: text(item.message) ?? null,
    errorMessage: text(item.errorMessage) ?? null,
    appliedAt: dateValue(item.appliedAt, null),
    createdAt: dateValue(item.createdAt),
    updatedAt: dateValue(item.updatedAt),
  });
}

function mapOrderImportBatch(batch) {
  const id = text(batch.importBatchId) ?? text(batch.id);
  return cleanObject({
    importBatchId: id,
    scope: text(batch.scope, 'week'),
    fileName: text(batch.fileName) ?? null,
    status: text(batch.status, 'previewed'),
    totalRows: intValue(batch.totalRows ?? batch.items?.length, 0),
    createOrderCount: intValue(batch.createOrderCount, 0),
    alreadyActiveCount: intValue(batch.alreadyActiveCount, 0),
    duplicateInFileCount: intValue(batch.duplicateInFileCount, 0),
    needsConfirmationCount: intValue(batch.needsConfirmationCount, 0),
    productNotFoundCount: intValue(batch.productNotFoundCount, 0),
    errorCount: intValue(batch.errorCount, 0),
    createdCount: intValue(batch.createdCount, null),
    skippedCount: intValue(batch.skippedCount, null),
    appliedAt: dateValue(batch.appliedAt, null),
    expiresAt: dateValue(batch.expiresAt, null),
    operatorId: text(batch.operatorId) ?? null,
    operatorName: text(batch.operatorName) ?? null,
    createdAt: dateValue(batch.createdAt),
    updatedAt: dateValue(batch.updatedAt),
  });
}

function mapOrderImportItem(item) {
  const id = text(item.importItemId) ?? text(item.id);
  const productModel = text(item.productModel) ?? text(item.rawProductModel, id);
  return cleanObject({
    importItemId: id,
    importBatchId: text(item.importBatchId),
    rowNumber: intValue(item.rowNumber, 0),
    rawProductModel: text(item.rawProductModel, productModel),
    productModel,
    normalizedProductModel: normalizeKey(item.normalizedProductModel) ?? normalizeKey(productModel) ?? id,
    productResolutionStatus: text(item.productResolutionStatus, 'unknown'),
    matchedCustomerId: text(item.matchedCustomerId) ?? null,
    matchedCustomerName: text(item.matchedCustomerName) ?? null,
    matchedProductId: text(item.matchedProductId) ?? null,
    recommendedProductionStatus: text(item.recommendedProductionStatus, 'no_drawing'),
    action: text(item.action, 'error'),
    message: text(item.message) ?? null,
    errorMessage: text(item.errorMessage) ?? null,
    applyResult: text(item.applyResult ?? item.result) ?? null,
    applyMessage: text(item.applyMessage) ?? null,
    applyErrorMessage: text(item.applyErrorMessage) ?? null,
    appliedAt: dateValue(item.appliedAt, null),
    createdAt: dateValue(item.createdAt),
    updatedAt: dateValue(item.updatedAt),
  });
}

function mapProductionOrder(order) {
  const productModel = text(order.productModel) ?? text(order.rawProductModel, order.orderId);
  const completed = boolValue(order.completed, false);
  return cleanObject({
    orderId: text(order.orderId),
    scope: text(order.scope, 'week'),
    productModel,
    normalizedProductModel: normalizeKey(order.normalizedProductModel) ?? normalizeKey(productModel) ?? text(order.orderId),
    customerId: text(order.customerId) ?? null,
    customerName: text(order.customerName) ?? null,
    linkedProductId: text(order.linkedProductId) ?? text(order.productId) ?? null,
    productResolutionStatus: text(order.productResolutionStatus, text(order.linkedProductId ?? order.productId) ? 'found' : 'unknown'),
    quantity: intValue(order.quantity, null),
    quantityProvided: boolValue(order.quantityProvided, order.quantity !== undefined && order.quantity !== null),
    productionStatus: text(order.productionStatus) ?? text(order.status, 'no_drawing'),
    completionStatus: text(order.completionStatus, completed ? 'completed' : 'pending'),
    source: text(order.source, 'manual_create'),
    importBatchId: text(order.importBatchId) ?? null,
    importItemId: text(order.importItemId) ?? null,
    remark: text(order.remark) ?? null,
    plannedDate: dateValue(order.plannedDate, null),
    completedAt: dateValue(order.completedAt, null),
    completedBy: text(order.completedBy) ?? null,
    restoredAt: dateValue(order.restoredAt, null),
    restoredBy: text(order.restoredBy) ?? null,
    createdAt: dateValue(order.createdAt),
    updatedAt: dateValue(order.updatedAt),
    deletedAt: dateValue(order.deletedAt, null),
  });
}

function mapAuditLog(log) {
  const entityType = text(log.entityType, 'system');
  const action = text(log.action, 'migration_preview_generated');
  return cleanObject({
    id: text(log.auditLogId) ?? text(log.id) ?? `audit:${hashRecord(log)}`,
    entityType: auditEntityToPrisma[entityType] ?? (auditEntityToPrisma[String(entityType).toLowerCase()] ?? 'SYSTEM'),
    entityId: text(log.entityId) ?? text(log.productId) ?? text(log.customerId) ?? 'system',
    action: auditActionToPrisma[action] ?? (auditActionToPrisma[String(action).toLowerCase()] ?? 'BUSINESS_DATA_IMPORTED'),
    beforeJson: jsonValue(log.before ?? log.beforeJson ?? null),
    afterJson: jsonValue(log.after ?? log.afterJson ?? null),
    message: text(log.message, 'JSON migration audit log'),
    operatorId: text(log.operatorId) ?? null,
    operatorName: text(log.operatorName) ?? null,
    operatorRole: text(log.operatorRole) ?? null,
    planId: text(log.planId) ?? null,
    customerId: text(log.customerId) ?? null,
    productId: text(log.productId) ?? null,
    orderId: text(log.orderId) ?? null,
    createdAt: dateValue(log.createdAt),
  });
}

function mapDeleteLockSetting(setting) {
  return cleanObject({
    id: 'document-delete-lock',
    enabled: setting.enabled !== false,
    passwordHash: text(setting.passwordHash, ''),
    failedAttempts: intValue(setting.failedAttempts, 0),
    lockedUntil: dateValue(setting.lockedUntil, null),
    updatedBy: text(setting.updatedBy) ?? null,
    createdAt: dateValue(setting.createdAt),
    updatedAt: dateValue(setting.updatedAt),
  });
}

const upsertHandlers = {
  Customers: (tx, data) => tx.customer.upsert({ where: { id: data.id }, create: data, update: cleanObject({ ...data, id: undefined }) }),
  Products: (tx, data) => tx.product.upsert({ where: { id: data.id }, create: data, update: cleanObject({ ...data, id: undefined }) }),
  ProductModules: (tx, data) => tx.productModule.upsert({ where: { productId_moduleKey: { productId: data.productId, moduleKey: data.moduleKey } }, create: data, update: cleanObject({ ...data, id: undefined }) }),
  ProductDocuments: (tx, data) => tx.productDocument.upsert({ where: { id: data.id }, create: data, update: cleanObject({ ...data, id: undefined }) }),
  PdfImportBatches: (tx, data) => tx.pdfImportBatch.upsert({ where: { id: data.id }, create: data, update: cleanObject({ ...data, id: undefined }) }),
  PdfImportItems: (tx, data) => tx.pdfImportItem.upsert({ where: { id: data.id }, create: data, update: cleanObject({ ...data, id: undefined }) }),
  OrderImportBatches: (tx, data) => tx.orderImportBatch.upsert({ where: { importBatchId: data.importBatchId }, create: data, update: cleanObject({ ...data, importBatchId: undefined }) }),
  OrderImportItems: (tx, data) => tx.orderImportItem.upsert({ where: { importItemId: data.importItemId }, create: data, update: cleanObject({ ...data, importItemId: undefined }) }),
  ProductionOrders: (tx, data) => tx.productionOrder.upsert({ where: { orderId: data.orderId }, create: data, update: cleanObject({ ...data, orderId: undefined }) }),
  AuditLogs: (tx, data) => tx.auditLog.upsert({ where: { id: data.id }, create: data, update: cleanObject({ ...data, id: undefined }) }),
  DeleteLockSetting: (tx, data) => tx.deleteLockSetting.upsert({ where: { id: data.id }, create: data, update: cleanObject({ ...data, id: undefined }) }),
};

async function updateModuleCovers(prisma, covers, batchSize) {
  for (let index = 0; index < covers.length; index += batchSize) {
    const batch = covers.slice(index, index + batchSize);
    await prisma.$transaction(async (tx) => {
      for (const cover of batch) {
        await tx.productModule.update({
          where: { productId_moduleKey: { productId: cover.productId, moduleKey: cover.moduleKey } },
          data: { coverDocumentId: cover.coverDocumentId },
        });
      }
    }, { timeout: 60_000 });
  }
}

function readExistingProgress(manifestPath) {
  if (!manifestPath || !existsSync(manifestPath)) return {};
  try {
    const manifest = readJsonFile(manifestPath);
    return manifest?.progress && typeof manifest.progress === 'object' ? manifest.progress : {};
  } catch {
    return {};
  }
}

function writeProgressManifest(manifestPath, payload, sourceRoots) {
  if (!manifestPath) return;
  assertWritablePathOutsideSources(manifestPath, sourceRoots);
  writeJsonFile(manifestPath, payload);
}

export async function executeImport(options) {
  const {
    metadataRoot,
    uploadsRoot,
    dryRunManifestPath,
    manifestPath,
    batchSize,
    resumeFrom,
    databaseUrlEnv,
  } = options;
  if (!manifestPath) throw new Error('--manifest is required for --execute so progress can be resumed.');
  const plan = collectPlan({ metadataRoot, uploadsRoot });
  validateDryRunManifest(plan, dryRunManifestPath);
  const dataset = buildImportDataset(plan);
  const databaseUrl = requireDatabaseUrlFromEnv(databaseUrlEnv);
  const prisma = await createPrismaClient(databaseUrl);
  const progress = readExistingProgress(manifestPath);
  const startIndex = resumeFrom ? importStageOrder.indexOf(resumeFrom) : 0;
  if (resumeFrom && startIndex < 0) throw new Error(`Unknown --resume-from stage: ${resumeFrom}`);
  const manifestBase = {
    generatedAt: new Date().toISOString(),
    mode: 'execute',
    databaseUrlEnv,
    dryRunManifest: dryRunManifestPath,
    sourceFileHashes: plan.sourceFileHashes,
    batchSize,
    resumeFrom: resumeFrom ?? null,
    connected: true,
    wroteDatabase: true,
    modifiedMetadata: false,
    modifiedUploads: false,
    progress,
  };
  try {
    await prisma.$connect?.();
    for (const stage of importStageOrder) {
      if (importStageOrder.indexOf(stage) < startIndex) continue;
      if (!resumeFrom && progress[stage]?.status === 'completed') continue;
      const records = dataset[stage] ?? [];
      const handler = upsertHandlers[stage];
      if (!handler) throw new Error(`Missing upsert handler for ${stage}`);
      progress[stage] = { status: 'running', total: records.length, imported: 0, updatedAt: new Date().toISOString() };
      writeProgressManifest(manifestPath, manifestBase, [metadataRoot, uploadsRoot]);
      for (let index = 0; index < records.length; index += batchSize) {
        const batch = records.slice(index, index + batchSize);
        await prisma.$transaction(async (tx) => {
          for (const record of batch) await handler(tx, record);
        }, { timeout: 60_000 });
        progress[stage] = {
          status: 'running',
          total: records.length,
          imported: Math.min(index + batch.length, records.length),
          updatedAt: new Date().toISOString(),
        };
        writeProgressManifest(manifestPath, manifestBase, [metadataRoot, uploadsRoot]);
      }
      progress[stage] = { status: 'completed', total: records.length, imported: records.length, updatedAt: new Date().toISOString() };
      writeProgressManifest(manifestPath, manifestBase, [metadataRoot, uploadsRoot]);
      if (stage === 'ProductDocuments') {
        await updateModuleCovers(prisma, dataset.ProductModuleCovers, batchSize);
        progress.ProductModuleCovers = {
          status: 'completed',
          total: dataset.ProductModuleCovers.length,
          imported: dataset.ProductModuleCovers.length,
          updatedAt: new Date().toISOString(),
        };
        writeProgressManifest(manifestPath, manifestBase, [metadataRoot, uploadsRoot]);
      }
    }
    const completed = {
      ...manifestBase,
      completedAt: new Date().toISOString(),
      progress,
    };
    writeProgressManifest(manifestPath, completed, [metadataRoot, uploadsRoot]);
    return {
      generatedAt: completed.completedAt,
      mode: 'execute',
      executeAllowed: true,
      connected: true,
      wroteDatabase: true,
      modifiedMetadata: false,
      modifiedUploads: false,
      batchSize,
      resumeFrom: resumeFrom ?? null,
      imported: Object.fromEntries(importStageOrder.map((stage) => [stage, dataset[stage]?.length ?? 0])),
      productModuleCovers: dataset.ProductModuleCovers.length,
      manifest: manifestPath,
    };
  } finally {
    await prisma.$disconnect?.();
  }
}

function keySet(records, keySelector) {
  return new Set(records.map(keySelector).filter(Boolean).map(String));
}

function diffSets(expected, actual) {
  return {
    missing: [...expected].filter((key) => !actual.has(key)).sort(),
    extra: [...actual].filter((key) => !expected.has(key)).sort(),
  };
}

function pushMismatch(mismatches, scope, id, field, expected, actual) {
  if (String(expected ?? '') !== String(actual ?? '')) {
    mismatches.push({ scope, id, field, expected, actual });
  }
}

async function collectDatabaseSnapshot(prisma) {
  const [
    customers,
    products,
    modules,
    documents,
    pdfImportBatches,
    pdfImportItems,
    orderImportBatches,
    orderImportItems,
    productionOrders,
    auditLogs,
    deleteLockSettings,
  ] = await Promise.all([
    prisma.customer.findMany(),
    prisma.product.findMany(),
    prisma.productModule.findMany(),
    prisma.productDocument.findMany(),
    prisma.pdfImportBatch.findMany(),
    prisma.pdfImportItem.findMany(),
    prisma.orderImportBatch.findMany(),
    prisma.orderImportItem.findMany(),
    prisma.productionOrder.findMany(),
    prisma.auditLog.findMany(),
    prisma.deleteLockSetting.findMany(),
  ]);
  return {
    customers,
    products,
    modules,
    documents,
    pdfImportBatches,
    pdfImportItems,
    orderImportBatches,
    orderImportItems,
    productionOrders,
    auditLogs,
    deleteLockSettings,
  };
}

export async function runParityCheck(options) {
  const { metadataRoot, uploadsRoot, databaseUrlEnv } = options;
  const plan = collectPlan({ metadataRoot, uploadsRoot });
  const dataset = buildImportDataset(plan);
  const databaseUrl = requireDatabaseUrlFromEnv(databaseUrlEnv);
  const prisma = await createPrismaClient(databaseUrl);
  try {
    await prisma.$connect?.();
    const db = await collectDatabaseSnapshot(prisma);
    const counts = {
      customers: db.customers.length,
      products: db.products.length,
      productModules: db.modules.length,
      productDocuments: db.documents.length,
      pdfImportBatches: db.pdfImportBatches.length,
      pdfImportItems: db.pdfImportItems.length,
      orderImportBatches: db.orderImportBatches.length,
      orderImportItems: db.orderImportItems.length,
      productionOrders: db.productionOrders.length,
      auditLogs: db.auditLogs.length,
      deleteLockSettings: db.deleteLockSettings.length,
    };
    const expectedCounts = {
      customers: dataset.Customers.length,
      products: dataset.Products.length,
      productModules: dataset.ProductModules.length,
      productDocuments: dataset.ProductDocuments.length,
      pdfImportBatches: dataset.PdfImportBatches.length,
      pdfImportItems: dataset.PdfImportItems.length,
      orderImportBatches: dataset.OrderImportBatches.length,
      orderImportItems: dataset.OrderImportItems.length,
      productionOrders: dataset.ProductionOrders.length,
      auditLogs: dataset.AuditLogs.length,
      deleteLockSettings: dataset.DeleteLockSetting.length,
    };
    const countMismatches = Object.entries(expectedCounts)
      .filter(([key, value]) => counts[key] !== value)
      .map(([key, expected]) => ({ key, expected, actual: counts[key] }));

    const primaryKeyDiffs = {
      customers: diffSets(keySet(dataset.Customers, (item) => item.id), keySet(db.customers, (item) => item.id)),
      products: diffSets(keySet(dataset.Products, (item) => item.id), keySet(db.products, (item) => item.id)),
      productModules: diffSets(keySet(dataset.ProductModules, (item) => `${item.productId}:${item.moduleKey}`), keySet(db.modules, (item) => `${item.productId}:${item.moduleKey}`)),
      productDocuments: diffSets(keySet(dataset.ProductDocuments, (item) => item.id), keySet(db.documents, (item) => item.id)),
      pdfImportBatches: diffSets(keySet(dataset.PdfImportBatches, (item) => item.id), keySet(db.pdfImportBatches, (item) => item.id)),
      pdfImportItems: diffSets(keySet(dataset.PdfImportItems, (item) => item.id), keySet(db.pdfImportItems, (item) => item.id)),
      orderImportBatches: diffSets(keySet(dataset.OrderImportBatches, (item) => item.importBatchId), keySet(db.orderImportBatches, (item) => item.importBatchId)),
      orderImportItems: diffSets(keySet(dataset.OrderImportItems, (item) => item.importItemId), keySet(db.orderImportItems, (item) => item.importItemId)),
      productionOrders: diffSets(keySet(dataset.ProductionOrders, (item) => item.orderId), keySet(db.productionOrders, (item) => item.orderId)),
      auditLogs: diffSets(keySet(dataset.AuditLogs, (item) => item.id), keySet(db.auditLogs, (item) => item.id)),
    };

    const fieldMismatches = [];
    const dbProducts = new Map(db.products.map((item) => [item.id, item]));
    for (const product of dataset.Products) {
      const actual = dbProducts.get(product.id);
      if (!actual) continue;
      pushMismatch(fieldMismatches, 'Product', product.id, 'customerId', product.customerId, actual.customerId);
    }
    const dbModules = new Map(db.modules.map((item) => [`${item.productId}:${item.moduleKey}`, item]));
    for (const module of dataset.ProductModules) {
      const actual = dbModules.get(`${module.productId}:${module.moduleKey}`);
      if (!actual) continue;
      const cover = dataset.ProductModuleCovers.find((item) => item.productId === module.productId && item.moduleKey === module.moduleKey);
      pushMismatch(fieldMismatches, 'ProductModule', `${module.productId}:${module.moduleKey}`, 'coverDocumentId', cover?.coverDocumentId ?? '', actual.coverDocumentId ?? '');
      pushMismatch(fieldMismatches, 'ProductModule', `${module.productId}:${module.moduleKey}`, 'itemCount', module.itemCount, actual.itemCount);
    }
    const dbDocuments = new Map(db.documents.map((item) => [item.id, item]));
    for (const document of dataset.ProductDocuments) {
      const actual = dbDocuments.get(document.id);
      if (!actual) continue;
      for (const field of ['productId', 'moduleKey', 'versionGroupKey', 'documentStatus', 'checksumSha256', 'deleted', 'archived', 'isCover']) {
        pushMismatch(fieldMismatches, 'ProductDocument', document.id, field, document[field], actual[field]);
      }
      pushMismatch(fieldMismatches, 'ProductDocument', document.id, 'status', document.status, actual.status);
    }
    const dbOrders = new Map(db.productionOrders.map((item) => [item.orderId, item]));
    for (const order of dataset.ProductionOrders) {
      const actual = dbOrders.get(order.orderId);
      if (!actual) continue;
      for (const field of ['productResolutionStatus', 'linkedProductId', 'productionStatus', 'completionStatus', 'importBatchId', 'importItemId']) {
        pushMismatch(fieldMismatches, 'ProductionOrder', order.orderId, field, order[field], actual[field]);
      }
    }
    if (dataset.DeleteLockSetting.length) {
      const expected = dataset.DeleteLockSetting[0];
      const actual = db.deleteLockSettings.find((item) => item.id === 'document-delete-lock');
      if (actual) {
        for (const field of ['enabled', 'failedAttempts']) {
          pushMismatch(fieldMismatches, 'DeleteLockSetting', expected.id, field, expected[field], actual[field]);
        }
        pushMismatch(fieldMismatches, 'DeleteLockSetting', expected.id, 'passwordHashPresent', Boolean(expected.passwordHash), Boolean(actual.passwordHash));
      }
    }

    const effectiveGroups = new Map();
    let finishedImagesEffectiveCount = 0;
    for (const document of db.documents) {
      if (document.deleted || document.deletedAt || document.archived || document.archivedAt) continue;
      if (document.documentStatus !== 'effective' && document.status !== 'EFFECTIVE') continue;
      if (document.moduleKey === 'finished_images') {
        finishedImagesEffectiveCount += 1;
        continue;
      }
      const key = `${document.productId}::${document.moduleKey}::${document.versionGroupKey}`;
      effectiveGroups.set(key, [...(effectiveGroups.get(key) ?? []), document.id]);
    }
    const ordinaryEffectiveConflicts = [...effectiveGroups.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([key, ids]) => ({ key, ids }));
    const expectedFinishedImagesEffectiveCount = dataset.ProductDocuments
      .filter((document) => document.moduleKey === 'finished_images'
        && document.documentStatus === 'effective'
        && !document.deleted
        && !document.archived)
      .length;
    if (finishedImagesEffectiveCount !== expectedFinishedImagesEffectiveCount) {
      fieldMismatches.push({
        scope: 'ProductDocument',
        id: 'finished_images',
        field: 'effectiveCount',
        expected: expectedFinishedImagesEffectiveCount,
        actual: finishedImagesEffectiveCount,
      });
    }

    const primaryKeyMismatches = Object.entries(primaryKeyDiffs)
      .filter(([, diff]) => diff.missing.length || diff.extra.length)
      .map(([key, diff]) => ({ key, ...diff }));
    const mismatches = [
      ...countMismatches.map((item) => ({ scope: 'count', ...item })),
      ...primaryKeyMismatches.map((item) => ({ scope: 'primaryKeys', ...item })),
      ...fieldMismatches,
      ...ordinaryEffectiveConflicts.map((item) => ({ scope: 'effective', field: 'ordinaryModuleConflict', ...item })),
    ];
    return {
      generatedAt: new Date().toISOString(),
      mode: 'readonly-parity',
      databaseUrlEnv,
      connected: true,
      wroteDatabase: false,
      migrationExecuted: false,
      counts,
      expectedCounts,
      comparisons: {
        counts: countMismatches.length ? 'mismatch' : 'match',
        primaryKeys: primaryKeyMismatches.length ? 'mismatch' : 'match',
        relations: fieldMismatches.some((item) => ['customerId', 'productId', 'moduleKey', 'importBatchId', 'importItemId', 'linkedProductId'].includes(item.field)) ? 'mismatch' : 'match',
        cover: fieldMismatches.some((item) => item.field === 'coverDocumentId' || item.field === 'isCover') ? 'mismatch' : 'match',
        effective: ordinaryEffectiveConflicts.length || fieldMismatches.some((item) => item.field === 'effectiveCount') ? 'mismatch' : 'match',
        checksum: fieldMismatches.some((item) => item.field === 'checksumSha256') ? 'mismatch' : 'match',
        orderStatus: fieldMismatches.some((item) => ['productResolutionStatus', 'productionStatus', 'completionStatus'].includes(item.field)) ? 'mismatch' : 'match',
        deleteLock: fieldMismatches.some((item) => item.scope === 'DeleteLockSetting') ? 'mismatch' : 'match',
      },
      finishedImagesEffectiveCount,
      ordinaryEffectiveConflicts,
      mismatches,
      result: mismatches.length ? 'mismatch' : 'match',
    };
  } finally {
    await prisma.$disconnect?.();
  }
}
