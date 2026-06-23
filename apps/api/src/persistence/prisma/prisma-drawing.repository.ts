import { ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DatabaseConfigService } from '../../database/database-config.service';
import type {
  DrawingMetadataStoreInitSummary,
  DrawingModuleState,
  DrawingTrashRecord,
  PdfImportBatchRecord,
} from '../../document-hub/drawing-metadata.store';
import { createDefaultDrawingModules } from '../../document-hub/drawing-metadata.store';
import { normalizeProductModel } from '../../document-hub/helpers/pdf-name-parser';
import type { HubCustomer, HubProductModel, ProductDrawingDetail } from '../../document-hub/mock/document-hub.seed';
import type { DrawingRepository } from '../persistence.types';

function now() {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function idSlug(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

@Injectable()
export class PrismaDrawingRepository implements DrawingRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly databaseConfig: DatabaseConfigService,
  ) {}

  ensureInitialized(): DrawingMetadataStoreInitSummary {
    this.assertReadable();
    return {
      customers: 0,
      products: 0,
      details: 0,
      trash: 0,
      importBatches: 0,
      initializedAt: now(),
    };
  }

  readCustomers(): HubCustomer[] {
    this.assertReadable();
    return [];
  }

  writeCustomers() {
    this.assertWritable();
  }

  readProducts(): HubProductModel[] {
    this.assertReadable();
    return [];
  }

  writeProducts() {
    this.assertWritable();
  }

  readModuleState(): DrawingModuleState {
    this.assertReadable();
    return {
      schemaVersion: 1,
      details: [],
      trash: [],
      updatedAt: now(),
    };
  }

  writeModuleState() {
    this.assertWritable();
  }

  readDetails(): ProductDrawingDetail[] {
    this.assertReadable();
    return [];
  }

  writeDetails() {
    this.assertWritable();
  }

  readTrash(): DrawingTrashRecord[] {
    this.assertReadable();
    return [];
  }

  writeTrash() {
    this.assertWritable();
  }

  upsertDetail(detail: ProductDrawingDetail): ProductDrawingDetail {
    this.assertWritable();
    return clone(detail);
  }

  readImportRecords(): PdfImportBatchRecord[] {
    this.assertReadable();
    return [];
  }

  writeImportRecords() {
    this.assertWritable();
  }

  upsertImportBatch(batch: PdfImportBatchRecord): PdfImportBatchRecord {
    this.assertWritable();
    return clone(batch);
  }

  makeProductId(customerId: string, productModel: string) {
    const customerPart = idSlug(customerId) || 'customer';
    const productPart = idSlug(normalizeProductModel(productModel)) || 'product';
    return `prod-${customerPart}-${productPart}`;
  }

  makeProductDetail(customer: HubCustomer, product: HubProductModel): ProductDrawingDetail {
    return {
      customer: clone(customer),
      product: clone(product),
      modules: createDefaultDrawingModules(),
    };
  }

  clone<T>(value: T): T {
    return clone(value);
  }

  rollbackNewProduct() {
    this.assertWritable();
    throw new ConflictException('PostgreSQL 产品回滚需要在事务补偿流程中执行。');
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
