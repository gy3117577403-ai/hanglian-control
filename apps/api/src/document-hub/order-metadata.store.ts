import { Injectable, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LocalStorageService } from '../storage/local-storage.service';
import { DrawingMetadataStore } from './drawing-metadata.store';
import { normalizeProductModel } from './helpers/pdf-name-parser';
import type { HubOrder, HubProductModel } from './mock/document-hub.seed';
import { hubOrders } from './mock/document-hub.seed';

export type OrderScope = 'today' | 'week';
export type OrderProductionStatus = 'front' | 'back' | 'no_drawing';
export type OrderCompletionStatus = 'pending' | 'completed';
export type OrderSource = 'excel_import' | 'manual_create' | 'seed';
export type ProductResolutionStatus =
  | 'found'
  | 'product_not_found'
  | 'customer_not_found'
  | 'ambiguous'
  | 'unknown';
export type OrderImportAction =
  | 'create_order'
  | 'already_active'
  | 'duplicate_in_file'
  | 'needs_customer_confirmation'
  | 'product_not_found'
  | 'error';
export type OrderImportApplyResult =
  | 'created'
  | 'skipped_duplicate'
  | 'already_active'
  | 'needs_confirmation'
  | 'skipped_by_user'
  | 'error';

export interface ProductionOrderRecord {
  orderId: string;
  scope: OrderScope;
  productModel: string;
  normalizedProductModel: string;
  customerId?: string | null;
  customerName?: string | null;
  linkedProductId?: string | null;
  productResolutionStatus: ProductResolutionStatus;
  quantity?: number | null;
  quantityProvided: boolean;
  productionStatus: OrderProductionStatus;
  completionStatus: OrderCompletionStatus;
  source: OrderSource;
  importBatchId?: string | null;
  importItemId?: string | null;
  remark?: string | null;
  plannedDate?: string | null;
  completedAt?: string | null;
  completedBy?: string | null;
  restoredAt?: string | null;
  restoredBy?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface OrderImportPreviewItemRecord {
  importItemId: string;
  rowNumber: number;
  rawProductModel: string;
  productModel: string;
  normalizedProductModel: string;
  productResolutionStatus: ProductResolutionStatus;
  matchedCustomerId?: string | null;
  matchedCustomerName?: string | null;
  matchedProductId?: string | null;
  recommendedProductionStatus: OrderProductionStatus;
  action: OrderImportAction;
  message?: string;
  errorMessage?: string;
}

export interface OrderImportApplyItemRecord {
  importItemId: string;
  orderId?: string;
  result: OrderImportApplyResult;
  message: string;
  errorMessage?: string;
  appliedAt?: string;
}

export interface OrderImportBatchRecord {
  importBatchId: string;
  scope: OrderScope;
  fileName?: string;
  status: 'previewed' | 'expired' | 'applying' | 'completed' | 'partially_applied' | 'failed';
  totalRows: number;
  createOrderCount: number;
  alreadyActiveCount: number;
  duplicateInFileCount: number;
  needsConfirmationCount: number;
  productNotFoundCount: number;
  errorCount: number;
  createdCount?: number;
  skippedCount?: number;
  appliedAt?: string | null;
  expiresAt?: string | null;
  operatorId?: string | null;
  operatorName?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderImportPreviewItemRecord[];
  applyItems?: OrderImportApplyItemRecord[];
}

export interface OrderListFilters {
  scope?: OrderScope | 'all';
  completionStatus?: OrderCompletionStatus | 'all';
  productionStatus?: OrderProductionStatus;
  keyword?: string;
  customerId?: string;
  linkedProductId?: string;
  includeDeleted?: boolean;
}

export interface CreateProductionOrderInput {
  orderId?: string;
  scope: OrderScope;
  productModel: string;
  normalizedProductModel?: string;
  customerId?: string | null;
  customerName?: string | null;
  linkedProductId?: string | null;
  productResolutionStatus?: ProductResolutionStatus;
  quantity?: number | null;
  quantityProvided?: boolean;
  productionStatus?: OrderProductionStatus;
  completionStatus?: OrderCompletionStatus;
  source: OrderSource;
  importBatchId?: string | null;
  importItemId?: string | null;
  remark?: string | null;
  plannedDate?: string | null;
  completedAt?: string | null;
  completedBy?: string | null;
  restoredAt?: string | null;
  restoredBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface OrderMetadataSummary {
  orders: number;
  activeOrders: number;
  pendingOrders: number;
  completedOrders: number;
  importBatches: number;
  initializedAt: string;
}

const ordersFile = 'production-orders.json';
const orderImportRecordsFile = 'order-import-records.json';
const scopes: OrderScope[] = ['today', 'week'];
const productionStatuses: OrderProductionStatus[] = ['front', 'back', 'no_drawing'];
const completionStatuses: OrderCompletionStatus[] = ['pending', 'completed'];
const sources: OrderSource[] = ['excel_import', 'manual_create', 'seed'];
const resolutionStatuses: ProductResolutionStatus[] = [
  'found',
  'product_not_found',
  'customer_not_found',
  'ambiguous',
  'unknown',
];
const importActions: OrderImportAction[] = [
  'create_order',
  'already_active',
  'duplicate_in_file',
  'needs_customer_confirmation',
  'product_not_found',
  'error',
];
const importStatuses: OrderImportBatchRecord['status'][] = [
  'previewed',
  'expired',
  'applying',
  'completed',
  'partially_applied',
  'failed',
];
const applyResults: OrderImportApplyResult[] = [
  'created',
  'skipped_duplicate',
  'already_active',
  'needs_confirmation',
  'skipped_by_user',
  'error',
];

let writeLocked = false;

function clone<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function now() {
  return new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/g, ' ') : '';
}

function optionalText(value: unknown) {
  const normalized = text(value);
  return normalized || undefined;
}

function optionalNullableText(value: unknown) {
  const normalized = text(value);
  return normalized || null;
}

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === 'string' && options.includes(value as T) ? (value as T) : fallback;
}

function timestamp(value: unknown, fallback = now()) {
  return text(value) || fallback;
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function orderId() {
  return `ORD-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

function normalizeScope(value: unknown): OrderScope {
  return oneOf(value, scopes, 'week');
}

export function normalizeOrderProductModel(value: string) {
  return normalizeProductModel(value)
    .replace(/[-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeProductionStatus(value: unknown, fallback: OrderProductionStatus = 'no_drawing') {
  return oneOf(value, productionStatuses, fallback);
}

function normalizeCompletionStatus(value: unknown, fallback: OrderCompletionStatus = 'pending') {
  return oneOf(value, completionStatuses, fallback);
}

function normalizeOrderProductionStatus(input: {
  productionStatus: OrderProductionStatus;
  completionStatus: OrderCompletionStatus;
  productResolutionStatus: ProductResolutionStatus;
  linkedProductId?: string | null;
}) {
  if (
    input.completionStatus === 'pending' &&
    (input.productResolutionStatus !== 'found' || !input.linkedProductId)
  ) {
    return 'no_drawing';
  }
  return input.productionStatus;
}

function normalizeOrder(value: unknown): ProductionOrderRecord | undefined {
  if (!isRecord(value)) return undefined;
  const productModel = text(value.productModel);
  const normalizedProductModel = normalizeOrderProductModel(text(value.normalizedProductModel) || productModel);
  const id = text(value.orderId);
  const createdAt = timestamp(value.createdAt);
  const completionStatus = normalizeCompletionStatus(
    value.completionStatus,
    value.completed === true ? 'completed' : 'pending',
  );
  const quantity = numberOrNull(value.quantity);
  const explicitQuantityProvided = typeof value.quantityProvided === 'boolean'
    ? value.quantityProvided
    : quantity !== null;

  if (!id || !productModel || !normalizedProductModel) return undefined;
  const linkedProductId = optionalNullableText(value.linkedProductId ?? value.productId);
  const productResolutionStatus = oneOf(value.productResolutionStatus, resolutionStatuses, 'unknown');
  const productionStatus = normalizeOrderProductionStatus({
    productionStatus: normalizeProductionStatus(value.productionStatus ?? value.status),
    completionStatus,
    productResolutionStatus,
    linkedProductId,
  });

  return {
    orderId: id,
    scope: normalizeScope(value.scope),
    productModel,
    normalizedProductModel,
    customerId: optionalNullableText(value.customerId),
    customerName: optionalNullableText(value.customerName),
    linkedProductId,
    productResolutionStatus,
    quantity,
    quantityProvided: explicitQuantityProvided,
    productionStatus,
    completionStatus,
    source: oneOf(value.source, sources, 'manual_create'),
    importBatchId: optionalNullableText(value.importBatchId),
    importItemId: optionalNullableText(value.importItemId),
    remark: optionalNullableText(value.remark),
    plannedDate: optionalNullableText(value.plannedDate),
    completedAt: value.completedAt === null ? null : optionalNullableText(value.completedAt),
    completedBy: value.completedBy === null ? null : optionalNullableText(value.completedBy),
    restoredAt: value.restoredAt === null ? null : optionalNullableText(value.restoredAt),
    restoredBy: value.restoredBy === null ? null : optionalNullableText(value.restoredBy),
    createdAt,
    updatedAt: timestamp(value.updatedAt, createdAt),
    deletedAt: value.deletedAt === null ? null : optionalNullableText(value.deletedAt),
  };
}

function normalizeImportPreviewItem(value: unknown): OrderImportPreviewItemRecord | undefined {
  if (!isRecord(value)) return undefined;
  const importItemId = text(value.importItemId);
  const rowNumber = Number(value.rowNumber);
  const rawProductModel = text(value.rawProductModel);
  const productModel = text(value.productModel) || rawProductModel;
  const normalizedProductModel = normalizeOrderProductModel(text(value.normalizedProductModel) || productModel);
  if (!importItemId || !Number.isFinite(rowNumber)) return undefined;

  return {
    importItemId,
    rowNumber,
    rawProductModel,
    productModel,
    normalizedProductModel,
    productResolutionStatus: oneOf(value.productResolutionStatus, resolutionStatuses, 'unknown'),
    matchedCustomerId: optionalNullableText(value.matchedCustomerId),
    matchedCustomerName: optionalNullableText(value.matchedCustomerName),
    matchedProductId: optionalNullableText(value.matchedProductId),
    recommendedProductionStatus: normalizeProductionStatus(value.recommendedProductionStatus),
    action: oneOf(value.action, importActions, 'error'),
    message: optionalText(value.message),
    errorMessage: optionalText(value.errorMessage),
  };
}

function normalizeApplyItem(value: unknown): OrderImportApplyItemRecord | undefined {
  if (!isRecord(value)) return undefined;
  const importItemId = text(value.importItemId);
  if (!importItemId) return undefined;
  return {
    importItemId,
    orderId: optionalText(value.orderId),
    result: oneOf(value.result, applyResults, 'error'),
    message: text(value.message),
    errorMessage: optionalText(value.errorMessage),
    appliedAt: optionalText(value.appliedAt),
  };
}

function normalizeImportBatch(value: unknown): OrderImportBatchRecord | undefined {
  if (!isRecord(value)) return undefined;
  const importBatchId = text(value.importBatchId);
  const items = Array.isArray(value.items)
    ? value.items.map(normalizeImportPreviewItem).filter(Boolean) as OrderImportPreviewItemRecord[]
    : [];
  const applyItems = Array.isArray(value.applyItems)
    ? value.applyItems.map(normalizeApplyItem).filter(Boolean) as OrderImportApplyItemRecord[]
    : [];
  if (!importBatchId) return undefined;
  const createdAt = timestamp(value.createdAt);

  return {
    importBatchId,
    scope: normalizeScope(value.scope),
    fileName: optionalText(value.fileName),
    status: oneOf(value.status, importStatuses, 'previewed'),
    totalRows: items.length,
    createOrderCount: items.filter((item) => item.action === 'create_order').length,
    alreadyActiveCount: items.filter((item) => item.action === 'already_active').length,
    duplicateInFileCount: items.filter((item) => item.action === 'duplicate_in_file').length,
    needsConfirmationCount: items.filter((item) => item.action === 'needs_customer_confirmation').length,
    productNotFoundCount: items.filter((item) => item.action === 'product_not_found').length,
    errorCount: items.filter((item) => item.action === 'error').length,
    createdCount: numberOrNull(value.createdCount) ?? applyItems.filter((item) => item.result === 'created').length,
    skippedCount: numberOrNull(value.skippedCount) ?? applyItems.filter((item) => item.result !== 'created').length,
    appliedAt: value.appliedAt === null ? null : optionalNullableText(value.appliedAt),
    expiresAt: value.expiresAt === null ? null : optionalNullableText(value.expiresAt),
    operatorId: optionalNullableText(value.operatorId),
    operatorName: optionalNullableText(value.operatorName),
    createdAt,
    updatedAt: timestamp(value.updatedAt, createdAt),
    items,
    applyItems,
  };
}

@Injectable()
export class OrderMetadataStore {
  constructor(
    private readonly localStorageService: LocalStorageService,
    @Optional() private readonly drawingMetadataStore?: DrawingMetadataStore,
  ) {}

  ensureInitialized(): OrderMetadataSummary {
    const orders = this.readAllOrders();
    const importBatches = this.readImportBatches();
    return {
      orders: orders.length,
      activeOrders: orders.filter((order) => !order.deletedAt).length,
      pendingOrders: orders.filter((order) => !order.deletedAt && order.completionStatus === 'pending').length,
      completedOrders: orders.filter((order) => !order.deletedAt && order.completionStatus === 'completed').length,
      importBatches: importBatches.length,
      initializedAt: now(),
    };
  }

  initializeFromSeedIfEmpty(): OrderMetadataSummary {
    this.assertMetadataReadable();
    const existing = this.readAllOrders();
    if (!existing.length && process.env.DEMO_DATA_MODE !== 'empty') {
      this.writeOrders(hubOrders.map((order) => this.seedToOrder(order)));
    }
    this.readImportBatches();
    return this.getSafeSummary();
  }

  listOrders(filters: OrderListFilters = {}) {
    const keyword = text(filters.keyword).toLowerCase();
    return this.readAllOrders()
      .filter((order) => filters.includeDeleted || !order.deletedAt)
      .filter((order) => !filters.scope || filters.scope === 'all' || order.scope === filters.scope)
      .filter((order) => !filters.completionStatus || filters.completionStatus === 'all' || order.completionStatus === filters.completionStatus)
      .filter((order) => !filters.productionStatus || order.productionStatus === filters.productionStatus)
      .filter((order) => !filters.customerId || order.customerId === filters.customerId)
      .filter((order) => !filters.linkedProductId || order.linkedProductId === filters.linkedProductId)
      .filter((order) => !keyword || [
        order.orderId,
        order.productModel,
        order.normalizedProductModel,
        order.customerName,
        order.remark,
      ].some((value) => String(value ?? '').toLowerCase().includes(keyword)))
      .sort((left, right) => {
        const scopeDiff = left.scope.localeCompare(right.scope);
        if (scopeDiff) return scopeDiff;
        return right.createdAt.localeCompare(left.createdAt);
      })
      .map(clone);
  }

  getOrderById(orderId: string) {
    const order = this.readAllOrders().find((item) => item.orderId === orderId && !item.deletedAt);
    return order ? clone(order) : undefined;
  }

  createOrder(input: CreateProductionOrderInput) {
    const orders = this.readAllOrders();
    const record = this.normalizeInput(input);
    this.writeOrders([record, ...orders]);
    return clone(record);
  }

  createOrders(inputs: CreateProductionOrderInput[]) {
    const orders = this.readAllOrders();
    const records = inputs.map((input) => this.normalizeInput(input));
    this.writeOrders([...records, ...orders]);
    return clone(records);
  }

  updateOrder(orderIdInput: string, patch: Partial<CreateProductionOrderInput>) {
    const orderIdValue = text(orderIdInput);
    const orders = this.readAllOrders();
    const current = orders.find((order) => order.orderId === orderIdValue && !order.deletedAt);
    if (!current) return undefined;
    const next = normalizeOrder({
      ...current,
      ...patch,
      orderId: current.orderId,
      productModel: patch.productModel ?? current.productModel,
      normalizedProductModel: patch.normalizedProductModel ?? current.normalizedProductModel,
      updatedAt: now(),
    });
    if (!next) return undefined;
    this.writeOrders(orders.map((order) => order.orderId === orderIdValue ? next : order));
    return clone(next);
  }

  completeOrder(orderIdInput: string, operator = 'local-operator') {
    const timestampValue = now();
    return this.updateOrder(orderIdInput, {
      completionStatus: 'completed',
      completedAt: timestampValue,
      completedBy: operator,
      updatedAt: timestampValue,
    });
  }

  restoreOrder(orderIdInput: string, operator = 'local-operator', productionStatus?: OrderProductionStatus) {
    const timestampValue = now();
    return this.updateOrder(orderIdInput, {
      completionStatus: 'pending',
      restoredAt: timestampValue,
      restoredBy: operator,
      completedAt: null,
      completedBy: null,
      productionStatus,
      updatedAt: timestampValue,
    });
  }

  saveImportBatch(batch: OrderImportBatchRecord) {
    const normalized = normalizeImportBatch(batch);
    if (!normalized) return batch;
    const batches = this.readImportBatches();
    const index = batches.findIndex((item) => item.importBatchId === normalized.importBatchId);
    const next = index >= 0
      ? batches.map((item) => item.importBatchId === normalized.importBatchId ? normalized : item)
      : [normalized, ...batches];
    this.writeImportBatches(next);
    return clone(normalized);
  }

  getImportBatch(importBatchIdInput: string) {
    const importBatchId = text(importBatchIdInput);
    const batch = this.readImportBatches().find((item) => item.importBatchId === importBatchId);
    return batch ? clone(batch) : undefined;
  }

  listImportBatches() {
    return this.readImportBatches().map(clone);
  }

  updateImportBatch(importBatchIdInput: string, patch: Partial<OrderImportBatchRecord>) {
    const importBatchId = text(importBatchIdInput);
    const batch = this.getImportBatch(importBatchId);
    if (!batch) return undefined;
    return this.saveImportBatch({
      ...batch,
      ...patch,
      importBatchId,
      updatedAt: now(),
    });
  }

  getSafeSummary(): OrderMetadataSummary {
    return this.ensureInitialized();
  }

  private normalizeInput(input: CreateProductionOrderInput): ProductionOrderRecord {
    const timestampValue = now();
    const productModel = text(input.productModel);
    const normalizedProductModel = normalizeOrderProductModel(input.normalizedProductModel ?? productModel);
    const quantity = numberOrNull(input.quantity);
    const record = normalizeOrder({
      ...input,
      orderId: input.orderId ?? orderId(),
      productModel,
      normalizedProductModel,
      quantity,
      quantityProvided: input.quantityProvided ?? quantity !== null,
      productionStatus: input.productionStatus ?? 'no_drawing',
      completionStatus: input.completionStatus ?? 'pending',
      productResolutionStatus: input.productResolutionStatus ?? 'unknown',
      createdAt: input.createdAt ?? timestampValue,
      updatedAt: input.updatedAt ?? timestampValue,
    });
    if (!record) throw new Error('Invalid order metadata input.');
    return record;
  }

  private seedToOrder(order: HubOrder): ProductionOrderRecord {
    const product = this.resolveSeedProduct(order);
    const customer = product
      ? this.drawingMetadataStore?.readCustomers().find((item) => item.customerId === product.customerId)
      : undefined;
    const timestampValue = now();
    const normalizedProductModel = normalizeOrderProductModel(order.productModel);
    const rawStatus = order.status === 'front' || order.status === 'back' ? order.status : 'no_drawing';
    return this.normalizeInput({
      orderId: order.orderId,
      scope: order.scope,
      productModel: order.productModel,
      normalizedProductModel,
      customerId: customer?.customerId ?? product?.customerId ?? null,
      customerName: customer?.customerName ?? order.customerName,
      linkedProductId: product?.productId ?? order.productId ?? null,
      productResolutionStatus: product || order.productId ? 'found' : 'product_not_found',
      quantity: order.quantity ?? null,
      quantityProvided: order.quantity !== undefined,
      productionStatus: rawStatus,
      completionStatus: order.completed ? 'completed' : 'pending',
      source: 'seed',
      remark: order.remark,
      completedAt: order.completedAt ?? null,
      createdAt: timestampValue,
      updatedAt: timestampValue,
    });
  }

  private resolveSeedProduct(order: HubOrder): HubProductModel | undefined {
    const products = this.drawingMetadataStore?.readProducts() ?? [];
    if (order.productId) {
      const byId = products.find((product) => product.productId === order.productId);
      if (byId) return byId;
    }
    const normalized = normalizeOrderProductModel(order.productModel);
    return products.find((product) => (
      (product.normalizedProductModel ?? normalizeOrderProductModel(product.productModel)) === normalized
    ));
  }

  private readAllOrders(): ProductionOrderRecord[] {
    return this.readArray(ordersFile, normalizeOrder);
  }

  private readImportBatches(): OrderImportBatchRecord[] {
    return this.readArray(orderImportRecordsFile, normalizeImportBatch);
  }

  private writeOrders(orders: ProductionOrderRecord[]) {
    this.writeArray(ordersFile, orders, normalizeOrder);
  }

  private writeImportBatches(batches: OrderImportBatchRecord[]) {
    this.writeArray(orderImportRecordsFile, batches, normalizeImportBatch);
  }

  private assertMetadataReadable() {
    for (const fileName of [ordersFile, orderImportRecordsFile]) {
      const file = this.metadataFilePath(fileName);
      if (!existsSync(file)) continue;
      JSON.parse(readFileSync(file, 'utf8'));
    }
  }

  private readArray<T>(fileName: string, normalize: (value: unknown) => T | undefined): T[] {
    const file = this.metadataFilePath(fileName);
    if (!existsSync(file)) this.writeRawArray(file, []);
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    return (Array.isArray(raw) ? raw : []).map(normalize).filter(Boolean) as T[];
  }

  private writeArray<T>(fileName: string, records: T[], normalize: (value: unknown) => T | undefined) {
    const normalized = records.map(normalize).filter(Boolean);
    this.writeRawArray(this.metadataFilePath(fileName), normalized);
  }

  private writeRawArray(file: string, records: unknown[]) {
    if (writeLocked) throw new Error('Order metadata write is already in progress.');
    writeLocked = true;
    try {
      mkdirSync(this.localStorageService.getMetadataDir(), { recursive: true });
      mkdirSync(this.localStorageService.getTempDir(), { recursive: true });
      const tempFile = join(this.localStorageService.getTempDir(), `${Date.now()}-${randomUUID()}.tmp`);
      writeFileSync(tempFile, JSON.stringify(records, null, 2), 'utf8');
      renameSync(tempFile, file);
    } finally {
      writeLocked = false;
    }
  }

  private metadataFilePath(fileName: string) {
    if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) {
      throw new Error(`Unsafe order metadata file name: ${fileName}`);
    }
    mkdirSync(this.localStorageService.getMetadataDir(), { recursive: true });
    return join(this.localStorageService.getMetadataDir(), fileName);
  }
}
