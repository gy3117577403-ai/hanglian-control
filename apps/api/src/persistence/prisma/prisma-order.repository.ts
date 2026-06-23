import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DatabaseConfigService } from '../../database/database-config.service';
import type {
  CreateProductionOrderInput,
  OrderImportBatchRecord,
  OrderListFilters,
  OrderMetadataSummary,
  OrderProductionStatus,
  ProductionOrderRecord,
} from '../../document-hub/order-metadata.store';
import type { OrderRepository } from '../persistence.types';

function now() {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

@Injectable()
export class PrismaOrderRepository implements OrderRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly databaseConfig: DatabaseConfigService,
  ) {}

  ensureInitialized(): OrderMetadataSummary {
    this.assertReadable();
    return this.getSafeSummary();
  }

  initializeFromSeedIfEmpty(): OrderMetadataSummary {
    return this.ensureInitialized();
  }

  listOrders(_filters: OrderListFilters = {}): ProductionOrderRecord[] {
    this.assertReadable();
    return [];
  }

  getOrderById(): ProductionOrderRecord | undefined {
    this.assertReadable();
    return undefined;
  }

  createOrder(input: CreateProductionOrderInput): ProductionOrderRecord {
    this.assertWritable();
    return clone({
      ...input,
      orderId: input.orderId ?? `ORD-${Date.now()}`,
      normalizedProductModel: input.normalizedProductModel ?? input.productModel,
      quantityProvided: input.quantityProvided ?? input.quantity !== undefined,
      productionStatus: input.productionStatus ?? 'no_drawing',
      completionStatus: input.completionStatus ?? 'pending',
      productResolutionStatus: input.productResolutionStatus ?? 'unknown',
      createdAt: input.createdAt ?? now(),
      updatedAt: input.updatedAt ?? now(),
    }) as ProductionOrderRecord;
  }

  createOrders(inputs: CreateProductionOrderInput[]): ProductionOrderRecord[] {
    return inputs.map((input) => this.createOrder(input));
  }

  updateOrder(): ProductionOrderRecord | undefined {
    this.assertWritable();
    return undefined;
  }

  completeOrder(): ProductionOrderRecord | undefined {
    this.assertWritable();
    return undefined;
  }

  restoreOrder(_orderId: string, _operator?: string, _productionStatus?: OrderProductionStatus): ProductionOrderRecord | undefined {
    this.assertWritable();
    return undefined;
  }

  saveImportBatch(batch: OrderImportBatchRecord): OrderImportBatchRecord {
    this.assertWritable();
    return clone(batch);
  }

  getImportBatch(): OrderImportBatchRecord | undefined {
    this.assertReadable();
    return undefined;
  }

  listImportBatches(): OrderImportBatchRecord[] {
    this.assertReadable();
    return [];
  }

  updateImportBatch(): OrderImportBatchRecord | undefined {
    this.assertWritable();
    return undefined;
  }

  getSafeSummary(): OrderMetadataSummary {
    return {
      orders: 0,
      activeOrders: 0,
      pendingOrders: 0,
      completedOrders: 0,
      importBatches: 0,
      initializedAt: now(),
    };
  }

  private assertReadable() {
    this.databaseConfig.assertCanStartPostgres();
    if (!this.prismaService.getSafeStatus().databaseConnected) {
      throw new ServiceUnavailableException('PostgreSQL 连接尚未就绪。');
    }
  }

  private assertWritable() {
    this.databaseConfig.assertWriteAllowed();
    this.assertReadable();
  }
}
