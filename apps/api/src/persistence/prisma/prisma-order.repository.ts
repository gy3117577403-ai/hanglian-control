import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { DatabaseConfigService } from '../../database/database-config.service';
import {
  normalizeOrderProductModel,
  type CreateProductionOrderInput,
  type OrderCompletionStatus,
  type OrderImportApplyItemRecord,
  type OrderImportBatchRecord,
  type OrderImportPreviewItemRecord,
  type OrderListFilters,
  type OrderMetadataSummary,
  type OrderProductionStatus,
  type OrderScope,
  type OrderSource,
  type ProductResolutionStatus,
  type ProductionOrderRecord,
} from '../../document-hub/order-metadata.store';
import type { OrderRepository } from '../persistence.types';

type AnyRecord = Record<string, any>;

function now() {
  return new Date().toISOString();
}

function orderId() {
  return `ORD-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

function dateOrNull(value?: string | null) {
  return value ? new Date(value) : null;
}

function dateOrUndefined(value?: string | null) {
  return value ? new Date(value) : undefined;
}

function iso(value?: Date | string | null) {
  return value ? new Date(value).toISOString() : null;
}

function clean(value?: string | null) {
  const normalized = value?.normalize('NFKC').trim().replace(/\s+/g, ' ');
  return normalized || null;
}

function productionStatusFor(input: {
  productionStatus?: OrderProductionStatus;
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
  return input.productionStatus ?? 'no_drawing';
}

function mapOrder(row: AnyRecord): ProductionOrderRecord {
  return {
    orderId: row.orderId,
    scope: row.scope as OrderScope,
    productModel: row.productModel,
    normalizedProductModel: row.normalizedProductModel,
    customerId: row.customerId ?? null,
    customerName: row.customerName ?? null,
    linkedProductId: row.linkedProductId ?? null,
    productResolutionStatus: row.productResolutionStatus as ProductResolutionStatus,
    quantity: row.quantity ?? null,
    quantityProvided: row.quantityProvided,
    productionStatus: row.productionStatus as OrderProductionStatus,
    completionStatus: row.completionStatus as OrderCompletionStatus,
    source: row.source as OrderSource,
    importBatchId: row.importBatchId ?? null,
    importItemId: row.importItemId ?? null,
    remark: row.remark ?? null,
    plannedDate: iso(row.plannedDate),
    completedAt: iso(row.completedAt),
    completedBy: row.completedBy ?? null,
    restoredAt: iso(row.restoredAt),
    restoredBy: row.restoredBy ?? null,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    deletedAt: iso(row.deletedAt),
  };
}

function mapPreviewItem(row: AnyRecord): OrderImportPreviewItemRecord {
  return {
    importItemId: row.importItemId,
    rowNumber: row.rowNumber,
    rawProductModel: row.rawProductModel,
    productModel: row.productModel,
    normalizedProductModel: row.normalizedProductModel,
    productResolutionStatus: row.productResolutionStatus as ProductResolutionStatus,
    matchedCustomerId: row.matchedCustomerId ?? null,
    matchedCustomerName: row.matchedCustomerName ?? null,
    matchedProductId: row.matchedProductId ?? null,
    recommendedProductionStatus: row.recommendedProductionStatus as OrderProductionStatus,
    action: row.action,
    message: row.message ?? undefined,
    errorMessage: row.errorMessage ?? undefined,
  };
}

function mapApplyItem(row: AnyRecord): OrderImportApplyItemRecord | undefined {
  if (!row.applyResult) return undefined;
  return {
    importItemId: row.importItemId,
    orderId: row.order?.orderId,
    result: row.applyResult,
    message: row.applyMessage ?? '',
    errorMessage: row.applyErrorMessage ?? undefined,
    appliedAt: iso(row.appliedAt) ?? undefined,
  };
}

function mapBatch(row: AnyRecord): OrderImportBatchRecord {
  const items = [...(row.items ?? [])].sort((left, right) => left.rowNumber - right.rowNumber);
  return {
    importBatchId: row.importBatchId,
    scope: row.scope as OrderScope,
    fileName: row.fileName ?? undefined,
    status: row.status,
    totalRows: row.totalRows,
    createOrderCount: row.createOrderCount,
    alreadyActiveCount: row.alreadyActiveCount,
    duplicateInFileCount: row.duplicateInFileCount,
    needsConfirmationCount: row.needsConfirmationCount,
    productNotFoundCount: row.productNotFoundCount,
    errorCount: row.errorCount,
    createdCount: row.createdCount ?? undefined,
    skippedCount: row.skippedCount ?? undefined,
    appliedAt: iso(row.appliedAt),
    expiresAt: iso(row.expiresAt),
    operatorId: row.operatorId ?? null,
    operatorName: row.operatorName ?? null,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    items: items.map(mapPreviewItem),
    applyItems: items.map(mapApplyItem).filter(Boolean) as OrderImportApplyItemRecord[],
  };
}

@Injectable()
export class PrismaOrderRepository implements OrderRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly databaseConfig: DatabaseConfigService,
  ) {}

  async ensureInitialized(): Promise<OrderMetadataSummary> {
    this.assertReadable();
    return this.getSafeSummary();
  }

  async initializeFromSeedIfEmpty(): Promise<OrderMetadataSummary> {
    return this.ensureInitialized();
  }

  async listOrders(filters: OrderListFilters = {}): Promise<ProductionOrderRecord[]> {
    this.assertReadable();
    const keyword = clean(filters.keyword);
    const rows = await this.prismaService.client.productionOrder.findMany({
      where: {
        ...(filters.includeDeleted ? {} : { deletedAt: null }),
        ...(filters.scope && filters.scope !== 'all' ? { scope: filters.scope } : {}),
        ...(filters.completionStatus && filters.completionStatus !== 'all'
          ? { completionStatus: filters.completionStatus }
          : {}),
        ...(filters.productionStatus ? { productionStatus: filters.productionStatus } : {}),
        ...(filters.customerId ? { customerId: filters.customerId } : {}),
        ...(filters.linkedProductId ? { linkedProductId: filters.linkedProductId } : {}),
        ...(keyword
          ? {
              OR: [
                { orderId: { contains: keyword, mode: 'insensitive' } },
                { productModel: { contains: keyword, mode: 'insensitive' } },
                { normalizedProductModel: { contains: keyword, mode: 'insensitive' } },
                { customerName: { contains: keyword, mode: 'insensitive' } },
                { remark: { contains: keyword, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ scope: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map(mapOrder);
  }

  async getOrderById(orderIdValue: string): Promise<ProductionOrderRecord | undefined> {
    this.assertReadable();
    const row = await this.prismaService.client.productionOrder.findFirst({
      where: { orderId: orderIdValue, deletedAt: null },
    });
    return row ? mapOrder(row) : undefined;
  }

  async createOrder(input: CreateProductionOrderInput): Promise<ProductionOrderRecord> {
    this.assertWritable();
    const data = this.orderDataFromInput(input);
    const row = await this.prismaService.client.productionOrder.create({ data });
    return mapOrder(row);
  }

  async createOrders(inputs: CreateProductionOrderInput[]): Promise<ProductionOrderRecord[]> {
    this.assertWritable();
    const created: ProductionOrderRecord[] = [];
    for (const input of inputs) {
      created.push(await this.createOrder(input));
    }
    return created;
  }

  async updateOrder(orderIdValue: string, patch: Partial<CreateProductionOrderInput>): Promise<ProductionOrderRecord | undefined> {
    this.assertWritable();
    const current = await this.getOrderById(orderIdValue);
    if (!current) return undefined;
    const data = this.orderDataFromInput({
      ...current,
      ...patch,
      orderId: current.orderId,
      productModel: patch.productModel ?? current.productModel,
      normalizedProductModel: patch.normalizedProductModel ?? current.normalizedProductModel,
      updatedAt: now(),
    });
    const row = await this.prismaService.client.productionOrder.update({
      where: { orderId: orderIdValue },
      data,
    });
    return mapOrder(row);
  }

  async completeOrder(orderIdValue: string, operator = 'local-operator'): Promise<ProductionOrderRecord | undefined> {
    return this.updateOrder(orderIdValue, {
      completionStatus: 'completed',
      completedAt: now(),
      completedBy: operator,
    });
  }

  async restoreOrder(
    orderIdValue: string,
    operator = 'local-operator',
    productionStatus?: OrderProductionStatus,
  ): Promise<ProductionOrderRecord | undefined> {
    return this.updateOrder(orderIdValue, {
      completionStatus: 'pending',
      productionStatus,
      completedAt: null,
      completedBy: null,
      restoredAt: now(),
      restoredBy: operator,
    });
  }

  async saveImportBatch(batch: OrderImportBatchRecord): Promise<OrderImportBatchRecord> {
    this.assertWritable();
    await this.prismaService.client.orderImportBatch.upsert({
      where: { importBatchId: batch.importBatchId },
      create: this.batchData(batch),
      update: this.batchData(batch),
    });
    const itemIds = batch.items.map((item) => item.importItemId);
    for (const item of batch.items) {
      const applyItem = batch.applyItems?.find((entry) => entry.importItemId === item.importItemId);
      const data = this.itemData(batch.importBatchId, item, applyItem);
      await this.prismaService.client.orderImportItem.upsert({
        where: { importItemId: item.importItemId },
        create: data,
        update: data,
      });
    }
    await this.prismaService.client.orderImportItem.deleteMany({
      where: {
        importBatchId: batch.importBatchId,
        importItemId: { notIn: itemIds },
      },
    });
    return (await this.getImportBatch(batch.importBatchId)) ?? batch;
  }

  async getImportBatch(importBatchId: string): Promise<OrderImportBatchRecord | undefined> {
    this.assertReadable();
    const row = await this.prismaService.client.orderImportBatch.findUnique({
      where: { importBatchId },
      include: {
        items: {
          include: { order: true },
          orderBy: { rowNumber: 'asc' },
        },
      },
    });
    return row ? mapBatch(row) : undefined;
  }

  async listImportBatches(): Promise<OrderImportBatchRecord[]> {
    this.assertReadable();
    const rows = await this.prismaService.client.orderImportBatch.findMany({
      include: {
        items: {
          include: { order: true },
          orderBy: { rowNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapBatch);
  }

  async updateImportBatch(
    importBatchId: string,
    patch: Partial<OrderImportBatchRecord>,
  ): Promise<OrderImportBatchRecord | undefined> {
    const current = await this.getImportBatch(importBatchId);
    if (!current) return undefined;
    return this.saveImportBatch({
      ...current,
      ...patch,
      importBatchId,
      items: patch.items ?? current.items,
      applyItems: patch.applyItems ?? current.applyItems,
      updatedAt: now(),
    });
  }

  async getSafeSummary(): Promise<OrderMetadataSummary> {
    this.assertReadable();
    const [orders, activeOrders, pendingOrders, completedOrders, importBatches] = await Promise.all([
      this.prismaService.client.productionOrder.count(),
      this.prismaService.client.productionOrder.count({ where: { deletedAt: null } }),
      this.prismaService.client.productionOrder.count({ where: { deletedAt: null, completionStatus: 'pending' } }),
      this.prismaService.client.productionOrder.count({ where: { deletedAt: null, completionStatus: 'completed' } }),
      this.prismaService.client.orderImportBatch.count(),
    ]);
    return {
      orders,
      activeOrders,
      pendingOrders,
      completedOrders,
      importBatches,
      initializedAt: now(),
    };
  }

  private orderDataFromInput(input: CreateProductionOrderInput) {
    const productModel = clean(input.productModel) ?? '';
    const normalizedProductModel = clean(input.normalizedProductModel) ?? normalizeOrderProductModel(productModel);
    const completionStatus = input.completionStatus ?? 'pending';
    const linkedProductId = clean(input.linkedProductId);
    const productResolutionStatus = input.productResolutionStatus ?? 'unknown';
    const quantity = typeof input.quantity === 'number' ? input.quantity : null;
    return {
      orderId: input.orderId ?? orderId(),
      scope: input.scope,
      productModel,
      normalizedProductModel,
      customerId: clean(input.customerId),
      customerName: clean(input.customerName),
      linkedProductId,
      productResolutionStatus,
      quantity,
      quantityProvided: input.quantityProvided ?? quantity !== null,
      productionStatus: productionStatusFor({
        productionStatus: input.productionStatus,
        completionStatus,
        productResolutionStatus,
        linkedProductId,
      }),
      completionStatus,
      source: input.source,
      importBatchId: clean(input.importBatchId),
      importItemId: clean(input.importItemId),
      remark: clean(input.remark),
      plannedDate: dateOrNull(input.plannedDate),
      completedAt: dateOrNull(input.completedAt),
      completedBy: clean(input.completedBy),
      restoredAt: dateOrNull(input.restoredAt),
      restoredBy: clean(input.restoredBy),
      createdAt: dateOrUndefined(input.createdAt),
      updatedAt: dateOrUndefined(input.updatedAt),
      deletedAt: dateOrNull(input.deletedAt),
    };
  }

  private batchData(batch: OrderImportBatchRecord) {
    return {
      importBatchId: batch.importBatchId,
      scope: batch.scope,
      fileName: clean(batch.fileName),
      status: batch.status,
      totalRows: batch.totalRows,
      createOrderCount: batch.createOrderCount,
      alreadyActiveCount: batch.alreadyActiveCount,
      duplicateInFileCount: batch.duplicateInFileCount,
      needsConfirmationCount: batch.needsConfirmationCount,
      productNotFoundCount: batch.productNotFoundCount,
      errorCount: batch.errorCount,
      createdCount: batch.createdCount,
      skippedCount: batch.skippedCount,
      appliedAt: dateOrNull(batch.appliedAt),
      expiresAt: dateOrNull(batch.expiresAt),
      operatorId: clean(batch.operatorId),
      operatorName: clean(batch.operatorName),
      createdAt: dateOrUndefined(batch.createdAt),
      updatedAt: dateOrUndefined(batch.updatedAt),
    };
  }

  private itemData(
    importBatchId: string,
    item: OrderImportPreviewItemRecord,
    applyItem?: OrderImportApplyItemRecord,
  ) {
    return {
      importItemId: item.importItemId,
      importBatchId,
      rowNumber: item.rowNumber,
      rawProductModel: item.rawProductModel,
      productModel: item.productModel,
      normalizedProductModel: item.normalizedProductModel,
      productResolutionStatus: item.productResolutionStatus,
      matchedCustomerId: clean(item.matchedCustomerId),
      matchedCustomerName: clean(item.matchedCustomerName),
      matchedProductId: clean(item.matchedProductId),
      recommendedProductionStatus: item.recommendedProductionStatus,
      action: item.action,
      message: clean(item.message),
      errorMessage: clean(item.errorMessage),
      applyResult: applyItem?.result,
      applyMessage: clean(applyItem?.message),
      applyErrorMessage: clean(applyItem?.errorMessage),
      appliedAt: dateOrNull(applyItem?.appliedAt),
    };
  }

  private assertReadable() {
    this.databaseConfig.assertCanStartPostgres();
    if (!this.prismaService.getSafeStatus().databaseConnected) {
      throw new ServiceUnavailableException('PostgreSQL connection is not ready.');
    }
  }

  private assertWritable() {
    this.databaseConfig.assertWriteAllowed();
    this.assertReadable();
  }
}
