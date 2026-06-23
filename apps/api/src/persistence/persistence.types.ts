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
  ensureInitialized(): OrderMetadataSummary;
  initializeFromSeedIfEmpty(): OrderMetadataSummary;
  listOrders(filters?: OrderListFilters): ProductionOrderRecord[];
  getOrderById(orderId: string): ProductionOrderRecord | undefined;
  createOrder(input: CreateProductionOrderInput): ProductionOrderRecord;
  createOrders(inputs: CreateProductionOrderInput[]): ProductionOrderRecord[];
  updateOrder(orderId: string, patch: Partial<CreateProductionOrderInput>): ProductionOrderRecord | undefined;
  completeOrder(orderId: string, operator?: string): ProductionOrderRecord | undefined;
  restoreOrder(orderId: string, operator?: string, productionStatus?: OrderProductionStatus): ProductionOrderRecord | undefined;
  saveImportBatch(batch: OrderImportBatchRecord): OrderImportBatchRecord;
  getImportBatch(importBatchId: string): OrderImportBatchRecord | undefined;
  listImportBatches(): OrderImportBatchRecord[];
  updateImportBatch(importBatchId: string, patch: Partial<OrderImportBatchRecord>): OrderImportBatchRecord | undefined;
  getSafeSummary(): OrderMetadataSummary;
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
  readSettings(): DeleteLockSetting;
  writeSettings(setting: DeleteLockSetting): void;
  updateFailedAttempts(failedAttempts: number, lockedUntil: string | null): DeleteLockSetting;
  updateLockedUntil(lockedUntil: string | null): DeleteLockSetting;
  updatePasswordHash(passwordHash: string, updatedBy: string): DeleteLockSetting;
  resetLockState(): DeleteLockSetting;
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
