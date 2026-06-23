import type { AuditLogQuery, CreateAuditLogPayload, ProductDocument } from '../common/types/production.types';
import type {
  DrawingMetadataStoreInitSummary,
  DrawingModuleState,
  DrawingTrashRecord,
  PdfImportBatchRecord,
} from '../document-hub/drawing-metadata.store';
import type {
  CreateProductionOrderInput,
  OrderImportBatchRecord,
  OrderListFilters,
  OrderMetadataSummary,
  OrderProductionStatus,
  ProductionOrderRecord,
} from '../document-hub/order-metadata.store';
import type { HubCustomer, HubProductModel, ProductDrawingDetail } from '../document-hub/mock/document-hub.seed';
import type { DocumentRepositoryInterface } from '../repositories/interfaces/document.repository.interface';

export type MaybePromise<T> = T | Promise<T>;

export interface DrawingRepository {
  ensureInitialized(): DrawingMetadataStoreInitSummary;
  initializeFromSeedIfEmpty?(): DrawingMetadataStoreInitSummary;
  readCustomers(): HubCustomer[];
  writeCustomers(customers: HubCustomer[]): void;
  readProducts(): HubProductModel[];
  writeProducts(products: HubProductModel[]): void;
  readModuleState(): DrawingModuleState;
  writeModuleState(state: DrawingModuleState): void;
  readDetails(): ProductDrawingDetail[];
  writeDetails(details: ProductDrawingDetail[]): void;
  readTrash(): DrawingTrashRecord[];
  writeTrash(trash: DrawingTrashRecord[]): void;
  upsertDetail(detail: ProductDrawingDetail): ProductDrawingDetail;
  readImportRecords(): PdfImportBatchRecord[];
  writeImportRecords(records: PdfImportBatchRecord[]): void;
  upsertImportBatch(batch: PdfImportBatchRecord): PdfImportBatchRecord;
  makeProductId(customerId: string, productModel: string): string;
  makeProductDetail(customer: HubCustomer, product: HubProductModel): ProductDrawingDetail;
  clone<T>(value: T): T;
  rollbackNewProduct(productId: string): void;
}

export type DocumentRepository = DocumentRepositoryInterface;

export interface OrderRepository {
  ensureInitialized(): MaybePromise<OrderMetadataSummary>;
  initializeFromSeedIfEmpty(): MaybePromise<OrderMetadataSummary>;
  listOrders(filters?: OrderListFilters): MaybePromise<ProductionOrderRecord[]>;
  getOrderById(orderId: string): MaybePromise<ProductionOrderRecord | undefined>;
  createOrder(input: CreateProductionOrderInput): MaybePromise<ProductionOrderRecord>;
  createOrders(inputs: CreateProductionOrderInput[]): MaybePromise<ProductionOrderRecord[]>;
  updateOrder(orderId: string, patch: Partial<CreateProductionOrderInput>): MaybePromise<ProductionOrderRecord | undefined>;
  completeOrder(orderId: string, operator?: string): MaybePromise<ProductionOrderRecord | undefined>;
  restoreOrder(orderId: string, operator?: string, productionStatus?: OrderProductionStatus): MaybePromise<ProductionOrderRecord | undefined>;
  saveImportBatch(batch: OrderImportBatchRecord): MaybePromise<OrderImportBatchRecord>;
  getImportBatch(importBatchId: string): MaybePromise<OrderImportBatchRecord | undefined>;
  listImportBatches(): MaybePromise<OrderImportBatchRecord[]>;
  updateImportBatch(importBatchId: string, patch: Partial<OrderImportBatchRecord>): MaybePromise<OrderImportBatchRecord | undefined>;
  getSafeSummary(): MaybePromise<OrderMetadataSummary>;
}

export interface AuditRepository {
  findAuditLogs(query: AuditLogQuery): MaybePromise<unknown[]>;
  createAuditLog(payload: CreateAuditLogPayload): MaybePromise<unknown>;
}

export interface DeleteLockSetting {
  enabled: boolean;
  passwordHash?: string;
  updatedAt?: string;
  updatedBy?: string;
  failedAttempts: number;
  lockedUntil: string | null;
}

export interface DeleteLockRepository {
  readSettings(): MaybePromise<DeleteLockSetting>;
  writeSettings(setting: DeleteLockSetting): MaybePromise<void>;
  updateFailedAttempts(failedAttempts: number, lockedUntil: string | null): MaybePromise<DeleteLockSetting>;
  updateLockedUntil(lockedUntil: string | null): MaybePromise<DeleteLockSetting>;
  updatePasswordHash(passwordHash: string, updatedBy: string): MaybePromise<DeleteLockSetting>;
  resetLockState(): MaybePromise<DeleteLockSetting>;
}

export interface PersistenceUnitOfWork {
  run<T>(work: () => MaybePromise<T>): Promise<T>;
  runInTransaction<T>(work: () => MaybePromise<T>): Promise<T>;
}

export interface StoredFileCompensationPlan {
  newStorageKeys: string[];
  existingStorageKeys: string[];
  metadataCommitted: boolean;
  rollbackReason?: string;
}
