import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LocalStorageService } from '../storage/local-storage.service';
import {
  DrawingItem,
  DrawingModule,
  DrawingModuleKey,
  DrawingStatus,
  HubCustomer,
  HubProductModel,
  ProductDrawingDetail,
  drawingDetails,
  hubCustomers,
  hubProducts,
} from './mock/document-hub.seed';
import { normalizeProductModel } from './helpers/pdf-name-parser';

export interface DrawingTrashRecord {
  trashId: string;
  productId: string;
  moduleKey: DrawingModuleKey;
  item: DrawingItem;
  deletedAt: string;
  deletedBy: string;
  reason?: string;
  sourceDocumentId?: string;
  purgedAt?: string;
}

export interface DrawingModuleState {
  schemaVersion: 1;
  details: ProductDrawingDetail[];
  trash: DrawingTrashRecord[];
  updatedAt: string;
}

export interface DrawingMetadataStoreInitSummary {
  customers: number;
  products: number;
  details: number;
  trash: number;
  importBatches: number;
  initializedAt: string;
}

export interface PdfImportItemRecord {
  importItemId: string;
  importBatchId?: string;
  fileName: string;
  stagedFileName?: string;
  stagedFileKey?: string;
  originalFileName: string;
  checksumSha256: string;
  fileSize: number;
  mimeType: string;
  parsedProductModel: string;
  confirmedProductModel?: string;
  normalizedProductModel: string;
  parsedVersion?: string;
  parseWarnings?: string[];
  needsConfirmation?: boolean;
  confidence: 'high' | 'medium' | 'low';
  status: 'parsed' | 'needs_confirmation' | 'error' | 'skipped' | 'imported';
  action: 'create_product' | 'add_version' | 'skip' | 'skip_duplicate' | 'needs_confirmation' | 'error';
  message?: string;
  errorMessage?: string;
  reason?: string;
  productId?: string;
  existingProductId?: string;
  existingDocumentId?: string;
  version?: string;
}

export interface PdfImportBatchRecord {
  importBatchId: string;
  customerId: string;
  createdAt: string;
  appliedAt?: string;
  expiresAt?: string;
  completedAt?: string | null;
  status: 'previewed' | 'expired' | 'applying' | 'completed' | 'partially_applied' | 'failed' | 'applied' | 'partial' | 'error';
  applyStatus?: 'idle' | 'applying' | 'completed' | 'partially_applied' | 'failed';
  applySummary?: PdfImportApplySummaryRecord;
  applyItems?: PdfImportApplyItemRecord[];
  remark?: string;
  operatorId?: string;
  operatorName?: string;
  totalFiles: number;
  successCount?: number;
  skippedCount?: number;
  errorCount?: number;
  needsConfirmationCount?: number;
  parsedFiles: number;
  skippedFiles: number;
  importedFiles: number;
  items: PdfImportItemRecord[];
}

export interface PdfImportApplySummaryRecord {
  total: number;
  createdProduct: number;
  addedVersion: number;
  skippedDuplicate: number;
  needsConfirmation: number;
  skippedByUser: number;
  error: number;
}

export interface PdfImportApplyItemRecord {
  importItemId: string;
  originalFileName: string;
  confirmedProductModel: string;
  productId?: string;
  documentId?: string;
  result: 'created_product' | 'added_version' | 'skipped_duplicate' | 'needs_confirmation' | 'skipped_by_user' | 'error';
  message: string;
  documentStatus?: 'effective' | 'pending_review' | 'expired' | 'missing' | 'inconsistent';
  setAsEffective?: boolean;
  errorMessage?: string;
  appliedAt?: string;
}

const customersFile = 'drawing-customers.json';
const productsFile = 'drawing-products.json';
const moduleStateFile = 'drawing-module-settings.json';
const importRecordsFile = 'drawing-import-records.json';

const drawingModuleKeys: DrawingModuleKey[] = [
  'original_drawing',
  'sop',
  'finished_images',
  'accessory_specs',
  'notes',
  'tooling',
];

const drawingModuleDefaults: Record<DrawingModuleKey, Pick<DrawingModule, 'moduleName' | 'status' | 'remark'>> = {
  original_drawing: {
    moduleName: '\u539f\u56fe',
    status: 'no_drawing',
    remark: '\u7b49\u5f85\u4e0a\u4f20 PDF \u539f\u56fe',
  },
  sop: {
    moduleName: 'SOP \u6307\u5bfc\u4e66',
    status: 'pending',
    remark: '\u7b49\u5f85\u8865\u5145 SOP',
  },
  finished_images: {
    moduleName: '\u6210\u54c1\u56fe',
    status: 'pending',
    remark: '\u7b49\u5f85\u8865\u5145\u6210\u54c1\u56fe',
  },
  accessory_specs: {
    moduleName: '\u8f85\u6599\u89c4\u683c',
    status: 'pending',
    remark: '\u7b49\u5f85\u8865\u5145\u8f85\u6599\u89c4\u683c',
  },
  notes: {
    moduleName: '\u6ce8\u610f\u4e8b\u9879',
    status: 'pending',
    remark: '\u7b49\u5f85\u8865\u5145\u6ce8\u610f\u4e8b\u9879',
  },
  tooling: {
    moduleName: '\u914d\u5957\u5de5\u88c5',
    status: 'pending',
    remark: '\u7b49\u5f85\u8865\u5145\u914d\u5957\u5de5\u88c5',
  },
};

const drawingStatuses: DrawingStatus[] = ['available', 'no_drawing', 'partial'];
const moduleStatuses: DrawingModule['status'][] = ['uploaded', 'pending', 'no_drawing'];
const itemFileTypes: DrawingItem['fileType'][] = ['pdf', 'image', 'text', 'card'];
const itemDocumentStatuses: NonNullable<DrawingItem['documentStatus']>[] = [
  'effective',
  'pending',
  'pending_review',
  'expired',
  'missing',
  'inconsistent',
];
const itemSources: DrawingItem['source'][] = [
  'mock',
  'manual_upload',
  'wecom_disk_future',
  'pdf_import',
  'camera_capture',
  'future_wecom',
  'seed',
];
const productSources: NonNullable<HubProductModel['source']>[] = [
  'pdf_import',
  'manual_create',
  'future_wecom',
  'seed',
];
const importStatuses: PdfImportItemRecord['status'][] = [
  'parsed',
  'needs_confirmation',
  'error',
  'skipped',
  'imported',
];
const importActions: PdfImportItemRecord['action'][] = [
  'create_product',
  'add_version',
  'skip',
  'skip_duplicate',
  'needs_confirmation',
  'error',
];
const batchStatuses: PdfImportBatchRecord['status'][] = [
  'previewed',
  'expired',
  'applying',
  'completed',
  'partially_applied',
  'failed',
  'applied',
  'partial',
  'error',
];
const applyStatuses: NonNullable<PdfImportBatchRecord['applyStatus']>[] = [
  'idle',
  'applying',
  'completed',
  'partially_applied',
  'failed',
];
const applyResults: PdfImportApplyItemRecord['result'][] = [
  'created_product',
  'added_version',
  'skipped_duplicate',
  'needs_confirmation',
  'skipped_by_user',
  'error',
];

function clone<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function now() {
  return new Date().toISOString();
}

function seedEnabled() {
  return process.env.DEMO_DATA_MODE !== 'empty';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isOneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === 'string' && options.includes(value as T) ? (value as T) : fallback;
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalText(value: unknown) {
  const normalized = text(value);
  return normalized || undefined;
}

function timestamp(value: unknown, fallback = now()) {
  const normalized = text(value);
  return normalized || fallback;
}

function numberOr(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function uniqueTexts(values: unknown[]) {
  return [...new Set(values.map(text).filter(Boolean))];
}

function active<T extends { deletedAt?: string }>(records: T[]) {
  return records.filter((record) => !record.deletedAt);
}

function seedCustomers() {
  return hubCustomers.map((customer) => normalizeCustomer(customer)).filter(Boolean) as HubCustomer[];
}

function seedProducts() {
  return hubProducts.map((product) => normalizeProduct(product)).filter(Boolean) as HubProductModel[];
}

function seedDetails() {
  return drawingDetails.map((detail) => normalizeDetail(detail)).filter(Boolean) as ProductDrawingDetail[];
}

export function createDefaultDrawingModules(createdAt = now()): DrawingModule[] {
  return drawingModuleKeys.map((moduleKey) => ({
    moduleKey,
    moduleName: drawingModuleDefaults[moduleKey].moduleName,
    status: drawingModuleDefaults[moduleKey].status,
    items: [],
    itemCount: 0,
    remark: drawingModuleDefaults[moduleKey].remark,
    updatedAt: createdAt,
  }));
}

function normalizeCustomer(value: unknown): HubCustomer | undefined {
  if (!isRecord(value)) return undefined;
  const customerId = text(value.customerId);
  const customerName = text(value.customerName);
  const customerShortName = text(value.customerShortName) || customerName;
  const createdAt = timestamp(value.createdAt);
  const updatedAt = timestamp(value.updatedAt, createdAt);

  if (!customerId || !customerName || !customerShortName) return undefined;

  return {
    customerId,
    customerName,
    customerShortName,
    customerCode: optionalText(value.customerCode),
    aliases: uniqueTexts([...(Array.isArray(value.aliases) ? value.aliases : []), customerName, customerShortName]),
    status: isOneOf(value.status, ['active', 'disabled'] as const, 'active'),
    createdAt,
    updatedAt,
    deletedAt: optionalText(value.deletedAt),
  };
}

function normalizeProduct(value: unknown): HubProductModel | undefined {
  if (!isRecord(value)) return undefined;
  const productId = text(value.productId);
  const customerId = text(value.customerId);
  const productModel = text(value.productModel);
  const productName = text(value.productName) || productModel;
  const createdAt = timestamp(value.createdAt);
  const updatedAt = timestamp(value.updatedAt, createdAt);
  const normalizedProductModel = normalizeProductModel(text(value.normalizedProductModel) || productModel);

  if (!productId || !customerId || !productModel || !normalizedProductModel) return undefined;

  return {
    productId,
    customerId,
    productModel,
    normalizedProductModel,
    productName,
    drawingStatus: isOneOf(value.drawingStatus, drawingStatuses, 'no_drawing'),
    source: isOneOf(value.source, productSources, 'manual_create'),
    searchKeywords: uniqueTexts([
      ...(Array.isArray(value.searchKeywords) ? value.searchKeywords : []),
      productModel,
      normalizedProductModel,
      productName,
      value.remark,
    ]),
    createdAt,
    updatedAt,
    deletedAt: optionalText(value.deletedAt),
    remark: optionalText(value.remark),
  };
}

function normalizeItem(value: unknown): DrawingItem | undefined {
  if (!isRecord(value)) return undefined;
  const itemId = text(value.itemId);
  const title = text(value.title) || text(value.fileName) || itemId;
  const uploadedAt = timestamp(value.uploadedAt);

  if (!itemId || !title) return undefined;

  return {
    itemId,
    documentId: optionalText(value.documentId),
    title,
    fileType: isOneOf(value.fileType, itemFileTypes, 'pdf'),
    contentKind: isOneOf(value.contentKind, itemFileTypes, isOneOf(value.fileType, itemFileTypes, 'pdf')),
    previewUrl: optionalText(value.previewUrl),
    downloadUrl: optionalText(value.downloadUrl),
    fileName: optionalText(value.fileName),
    version: text(value.version) || 'A',
    remark: optionalText(value.remark),
    description: optionalText(value.description),
    uploadedAt,
    source: isOneOf(value.source, itemSources, 'manual_upload'),
    storageProvider: optionalText(value.storageProvider),
    storageKey: optionalText(value.storageKey),
    checksumSha256: optionalText(value.checksumSha256),
    fileSize: numberOr(value.fileSize, 0) || undefined,
    mimeType: optionalText(value.mimeType),
    keywords: uniqueTexts(Array.isArray(value.keywords) ? value.keywords : []),
    effectiveDate: optionalText(value.effectiveDate),
    versionGroupKey: optionalText(value.versionGroupKey),
    pageCount: numberOr(value.pageCount, 0) || undefined,
    imageWidth: numberOr(value.imageWidth, 0) || undefined,
    imageHeight: numberOr(value.imageHeight, 0) || undefined,
    isCover: value.isCover === true || undefined,
    documentStatus: isOneOf(value.documentStatus, itemDocumentStatuses, 'effective'),
    deletedAt: optionalText(value.deletedAt),
    deletedBy: optionalText(value.deletedBy),
    restoredAt: optionalText(value.restoredAt),
    restoredBy: optionalText(value.restoredBy),
  };
}

function normalizeModule(value: unknown, moduleKey: DrawingModuleKey, fallbackUpdatedAt = now()): DrawingModule {
  const record = isRecord(value) ? value : {};
  const defaults = drawingModuleDefaults[moduleKey];
  const items = asArray(record.items).map(normalizeItem).filter(Boolean) as DrawingItem[];
  const explicitStatus = isOneOf(record.status, moduleStatuses, defaults.status);
  const status = items.length ? 'uploaded' : explicitStatus === 'uploaded' ? defaults.status : explicitStatus;
  const coverDocumentId = optionalText(record.coverDocumentId) ?? items.find((item) => item.isCover)?.itemId ?? items[0]?.itemId;

  return {
    moduleKey,
    moduleName: text(record.moduleName) || defaults.moduleName,
    status,
    items,
    coverDocumentId,
    itemCount: items.length,
    remark: text(record.remark) || defaults.remark,
    updatedAt: timestamp(record.updatedAt, fallbackUpdatedAt),
  };
}

function normalizeModules(value: unknown, fallbackUpdatedAt = now()) {
  const incoming = asArray(value);
  const byKey = new Map<DrawingModuleKey, unknown>();

  for (const module of incoming) {
    if (!isRecord(module)) continue;
    const moduleKey = module.moduleKey;
    if (drawingModuleKeys.includes(moduleKey as DrawingModuleKey)) {
      byKey.set(moduleKey as DrawingModuleKey, module);
    }
  }

  return drawingModuleKeys.map((moduleKey) => normalizeModule(byKey.get(moduleKey), moduleKey, fallbackUpdatedAt));
}

function deriveDrawingStatus(modules: DrawingModule[]): DrawingStatus {
  const original = modules.find((module) => module.moduleKey === 'original_drawing');
  if (!original || !original.items.length) return 'no_drawing';
  return modules.every((module) => module.status === 'uploaded' || module.moduleKey !== 'original_drawing')
    ? 'available'
    : 'partial';
}

function normalizeDetail(value: unknown): ProductDrawingDetail | undefined {
  if (!isRecord(value)) return undefined;
  const product = normalizeProduct(value.product);
  if (!product) return undefined;

  const modules = normalizeModules(value.modules, product.updatedAt);
  const customer = normalizeCustomer(value.customer);
  const drawingStatus = product.drawingStatus === 'no_drawing' ? deriveDrawingStatus(modules) : product.drawingStatus;

  return {
    product: {
      ...product,
      drawingStatus,
    },
    customer,
    modules,
  };
}

function normalizeTrashRecord(value: unknown): DrawingTrashRecord | undefined {
  if (!isRecord(value)) return undefined;
  const productId = text(value.productId);
  const moduleKey = isOneOf(value.moduleKey, drawingModuleKeys, 'original_drawing');
  const item = normalizeItem(value.item);
  const deletedAt = timestamp(value.deletedAt);
  const trashId = text(value.trashId) || ['trash', productId, moduleKey, item?.itemId, deletedAt].filter(Boolean).join('-');

  if (!productId || !item || !trashId) return undefined;

  return {
    trashId,
    productId,
    moduleKey,
    item,
    deletedAt,
    deletedBy: text(value.deletedBy) || 'system',
    reason: optionalText(value.reason),
    sourceDocumentId: optionalText(value.sourceDocumentId),
    purgedAt: optionalText(value.purgedAt),
  };
}

function emptyModuleState(createdAt = now()): DrawingModuleState {
  return {
    schemaVersion: 1,
    details: seedEnabled() ? seedDetails() : [],
    trash: [],
    updatedAt: createdAt,
  };
}

function normalizeModuleState(value: unknown): DrawingModuleState {
  const fallback = emptyModuleState();
  if (!isRecord(value)) return fallback;

  return {
    schemaVersion: 1,
    details: asArray(value.details).map(normalizeDetail).filter(Boolean) as ProductDrawingDetail[],
    trash: asArray(value.trash).map(normalizeTrashRecord).filter(Boolean) as DrawingTrashRecord[],
    updatedAt: timestamp(value.updatedAt),
  };
}

function normalizeImportItem(value: unknown): PdfImportItemRecord | undefined {
  if (!isRecord(value)) return undefined;
  const importItemId = text(value.importItemId);
  const fileName = text(value.fileName) || text(value.stagedFileName) || text(value.originalFileName);
  const parsedProductModel = text(value.parsedProductModel);
  const confirmedProductModel = text(value.confirmedProductModel) || parsedProductModel;
  const normalizedProductModel = normalizeProductModel(text(value.normalizedProductModel) || confirmedProductModel || parsedProductModel);
  const action = isOneOf(value.action, importActions, normalizedProductModel ? 'add_version' : 'needs_confirmation');
  const fallbackStatus: PdfImportItemRecord['status'] = action === 'error'
    ? 'error'
    : action === 'needs_confirmation'
      ? 'needs_confirmation'
      : action === 'skip' || action === 'skip_duplicate'
        ? 'skipped'
        : 'parsed';
  const status = isOneOf(value.status, importStatuses, fallbackStatus);

  if (!importItemId || !fileName) return undefined;

  return {
    importItemId,
    importBatchId: optionalText(value.importBatchId),
    fileName,
    stagedFileName: optionalText(value.stagedFileName),
    stagedFileKey: optionalText(value.stagedFileKey),
    originalFileName: text(value.originalFileName) || fileName,
    checksumSha256: text(value.checksumSha256),
    fileSize: numberOr(value.fileSize, 0),
    mimeType: text(value.mimeType) || 'application/pdf',
    parsedProductModel,
    confirmedProductModel,
    normalizedProductModel,
    parsedVersion: optionalText(value.parsedVersion) ?? optionalText(value.version),
    parseWarnings: uniqueTexts(Array.isArray(value.parseWarnings) ? value.parseWarnings : [value.reason]).filter(Boolean),
    needsConfirmation: value.needsConfirmation === true || status === 'needs_confirmation' || action === 'needs_confirmation',
    confidence: isOneOf(value.confidence, ['high', 'medium', 'low'], 'low'),
    status,
    action,
    message: optionalText(value.message),
    errorMessage: optionalText(value.errorMessage),
    reason: optionalText(value.reason),
    productId: optionalText(value.productId),
    existingProductId: optionalText(value.existingProductId) ?? optionalText(value.productId),
    existingDocumentId: optionalText(value.existingDocumentId),
    version: optionalText(value.version),
  };
}

function normalizeApplyItem(value: unknown): PdfImportApplyItemRecord | undefined {
  if (!isRecord(value)) return undefined;
  const importItemId = text(value.importItemId);
  if (!importItemId) return undefined;
  return {
    importItemId,
    originalFileName: text(value.originalFileName),
    confirmedProductModel: text(value.confirmedProductModel),
    productId: optionalText(value.productId),
    documentId: optionalText(value.documentId),
    result: isOneOf(value.result, applyResults, 'error'),
    message: text(value.message),
    documentStatus: isOneOf(
      value.documentStatus,
      ['effective', 'pending_review', 'expired', 'missing', 'inconsistent'] as const,
      'pending_review',
    ),
    setAsEffective: value.setAsEffective === true || undefined,
    errorMessage: optionalText(value.errorMessage),
    appliedAt: optionalText(value.appliedAt),
  };
}

function normalizeApplySummary(value: unknown, items: PdfImportApplyItemRecord[]): PdfImportApplySummaryRecord {
  const record = isRecord(value) ? value : {};
  return {
    total: numberOr(record.total, items.length),
    createdProduct: numberOr(record.createdProduct, items.filter((item) => item.result === 'created_product').length),
    addedVersion: numberOr(record.addedVersion, items.filter((item) => item.result === 'added_version').length),
    skippedDuplicate: numberOr(record.skippedDuplicate, items.filter((item) => item.result === 'skipped_duplicate').length),
    needsConfirmation: numberOr(record.needsConfirmation, items.filter((item) => item.result === 'needs_confirmation').length),
    skippedByUser: numberOr(record.skippedByUser, items.filter((item) => item.result === 'skipped_by_user').length),
    error: numberOr(record.error, items.filter((item) => item.result === 'error').length),
  };
}

function normalizeImportBatch(value: unknown): PdfImportBatchRecord | undefined {
  if (!isRecord(value)) return undefined;
  const importBatchId = text(value.importBatchId);
  const customerId = text(value.customerId);
  const items = asArray(value.items).map(normalizeImportItem).filter(Boolean) as PdfImportItemRecord[];
  const applyItems = asArray(value.applyItems).map(normalizeApplyItem).filter(Boolean) as PdfImportApplyItemRecord[];
  const totalFiles = items.length;
  const parsedFiles = items.filter((item) => ['parsed', 'imported'].includes(item.status)).length;
  const skippedFiles = items.filter((item) => item.status === 'skipped' || item.action === 'skip_duplicate' || item.action === 'skip').length;
  const importedFiles = items.filter((item) => item.status === 'imported').length;
  const errorCount = items.filter((item) => item.status === 'error' || item.action === 'error').length;
  const needsConfirmationCount = items.filter((item) => item.needsConfirmation || item.action === 'needs_confirmation').length;
  const skippedCount = items.filter((item) => item.action === 'skip_duplicate' || item.action === 'skip').length;
  const successCount = items.filter((item) => item.action === 'create_product' || item.action === 'add_version').length;

  if (!importBatchId || !customerId) return undefined;

  return {
    importBatchId,
    customerId,
    createdAt: timestamp(value.createdAt),
    appliedAt: optionalText(value.appliedAt),
    expiresAt: optionalText(value.expiresAt),
    completedAt: value.completedAt === null ? null : optionalText(value.completedAt),
    status: isOneOf(value.status, batchStatuses, 'previewed'),
    applyStatus: isOneOf(value.applyStatus, applyStatuses, applyItems.length ? 'completed' : 'idle'),
    applySummary: applyItems.length ? normalizeApplySummary(value.applySummary, applyItems) : undefined,
    applyItems,
    remark: optionalText(value.remark),
    operatorId: optionalText(value.operatorId),
    operatorName: optionalText(value.operatorName),
    totalFiles,
    successCount,
    skippedCount,
    errorCount,
    needsConfirmationCount,
    parsedFiles,
    skippedFiles,
    importedFiles,
    items,
  };
}

function productSlug(value: string) {
  return normalizeProductModel(value).replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function idSlug(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

@Injectable()
export class DrawingMetadataStore {
  constructor(private readonly localStorageService: LocalStorageService) {}

  ensureInitialized(): DrawingMetadataStoreInitSummary {
    this.assertMetadataReadable();
    const customers = this.readCustomers();
    const products = this.readProducts();
    const moduleState = this.readModuleState();
    const importRecords = this.readImportRecords();

    return {
      customers: customers.length,
      products: products.length,
      details: moduleState.details.length,
      trash: moduleState.trash.length,
      importBatches: importRecords.length,
      initializedAt: now(),
    };
  }

  readCustomers() {
    return active(this.readArray(customersFile, seedEnabled() ? seedCustomers() : [], normalizeCustomer));
  }

  writeCustomers(customers: HubCustomer[]) {
    this.writeArray(customersFile, customers, normalizeCustomer);
  }

  readProducts() {
    return active(this.readArray(productsFile, seedEnabled() ? seedProducts() : [], normalizeProduct));
  }

  writeProducts(products: HubProductModel[]) {
    this.writeArray(productsFile, products, normalizeProduct);
  }

  readModuleState(): DrawingModuleState {
    const fallback = emptyModuleState();
    const raw = this.localStorageService.readMetadataSync<unknown>(moduleStateFile, clone(fallback));
    return normalizeModuleState(raw);
  }

  writeModuleState(state: DrawingModuleState) {
    this.localStorageService.writeMetadataSync(moduleStateFile, {
      ...normalizeModuleState(state),
      updatedAt: now(),
    });
  }

  readDetails() {
    return this.readModuleState().details.filter((detail) => !detail.product.deletedAt);
  }

  writeDetails(details: ProductDrawingDetail[]) {
    const state = this.readModuleState();
    this.writeModuleState({ ...state, details });
  }

  readTrash() {
    return this.readModuleState().trash.filter((item) => !item.purgedAt);
  }

  writeTrash(trash: DrawingTrashRecord[]) {
    const state = this.readModuleState();
    this.writeModuleState({ ...state, trash });
  }

  upsertDetail(detail: ProductDrawingDetail) {
    const normalizedDetail = normalizeDetail(detail);
    if (!normalizedDetail) return detail;

    const state = this.readModuleState();
    const details = state.details;
    const index = details.findIndex((item) => item.product.productId === normalizedDetail.product.productId);
    if (index >= 0) details[index] = normalizedDetail;
    else details.unshift(normalizedDetail);
    this.writeModuleState({ ...state, details });
    return clone(normalizedDetail);
  }

  readImportRecords() {
    return this.readArray(importRecordsFile, [], normalizeImportBatch);
  }

  writeImportRecords(records: PdfImportBatchRecord[]) {
    this.writeArray(importRecordsFile, records, normalizeImportBatch);
  }

  upsertImportBatch(batch: PdfImportBatchRecord) {
    const normalizedBatch = normalizeImportBatch(batch);
    if (!normalizedBatch) return batch;

    const records = this.readImportRecords();
    const index = records.findIndex((item) => item.importBatchId === normalizedBatch.importBatchId);
    if (index >= 0) records[index] = normalizedBatch;
    else records.unshift(normalizedBatch);
    this.writeImportRecords(records);
    return clone(normalizedBatch);
  }

  makeProductId(customerId: string, productModel: string) {
    const customerPart = idSlug(customerId) || 'customer';
    const productPart = productSlug(productModel) || 'product';
    return `prod-${customerPart}-${productPart}`;
  }

  makeProductDetail(customer: HubCustomer, product: HubProductModel): ProductDrawingDetail {
    const normalizedCustomer = normalizeCustomer(customer) ?? customer;
    const normalizedProduct = normalizeProduct({
      ...product,
      customerId: product.customerId || normalizedCustomer.customerId,
    }) ?? product;

    return {
      customer: clone(normalizedCustomer),
      product: clone(normalizedProduct),
      modules: createDefaultDrawingModules(),
    };
  }

  clone<T>(value: T): T {
    return clone(value);
  }

  rollbackNewProduct(productId: string) {
    const details = this.readDetails();
    const detail = details.find((item) => item.product.productId === productId);
    if (detail?.modules.some((module) => module.items.some((item) => !item.deletedAt))) {
      throw new Error('Refuse to roll back product that already has formal drawing items.');
    }

    this.writeProducts(this.readProducts().filter((product) => product.productId !== productId));
    this.writeDetails(details.filter((item) => item.product.productId !== productId));
  }

  private assertMetadataReadable() {
    const metadataDir = this.localStorageService.getMetadataDir();
    for (const fileName of [customersFile, productsFile, moduleStateFile, importRecordsFile]) {
      const file = join(metadataDir, fileName);
      if (!existsSync(file)) continue;
      try {
        JSON.parse(readFileSync(file, 'utf8'));
      } catch (error) {
        throw new Error(`Drawing metadata file is not valid JSON: ${fileName}. Fix or move the damaged file before startup.`);
      }
    }
  }

  private readArray<T>(fileName: string, fallback: T[], normalize: (value: unknown) => T | undefined): T[] {
    const raw = this.localStorageService.readMetadataArraySync<unknown>(fileName, clone(fallback) as unknown[]) as unknown;
    return asArray(raw).map(normalize).filter(Boolean) as T[];
  }

  private writeArray<T>(fileName: string, records: T[], normalize: (value: unknown) => T | undefined) {
    const normalized = asArray(records).map(normalize).filter(Boolean) as T[];
    this.localStorageService.writeMetadataArraySync(fileName, normalized);
  }
}
