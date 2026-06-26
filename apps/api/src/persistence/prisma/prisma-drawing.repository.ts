import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DatabaseConfigService } from '../../database/database-config.service';
import type {
  DrawingMetadataStoreInitSummary,
  DrawingModuleState,
  DrawingTrashRecord,
  PdfImportBatchRecord,
  PdfImportItemRecord,
} from '../../document-hub/drawing-metadata.store';
import { createDefaultDrawingModules } from '../../document-hub/drawing-metadata.store';
import { normalizeProductModel } from '../../document-hub/helpers/pdf-name-parser';
import type {
  DrawingItem,
  DrawingModule,
  DrawingModuleKey,
  DrawingModuleStatus,
  DrawingStatus,
  HubCustomer,
  HubProductModel,
  ProductDrawingDetail,
} from '../../document-hub/mock/document-hub.seed';
import {
  documentEffectiveVersionGroupKey,
  documentTypeForDrawingModule,
  requiredProcessForDrawingModule,
  supportsSingleEffectiveVersion,
} from '../../common/utils/document-version-rules';
import type { DrawingRepository } from '../persistence.types';

type AnyRecord = Record<string, any>;

const drawingModuleKeys: DrawingModuleKey[] = [
  'original_drawing',
  'sop',
  'finished_images',
  'accessory_specs',
  'notes',
  'tooling',
];

const moduleStatuses = new Set<DrawingModuleStatus>(['uploaded', 'pending', 'no_drawing']);
const drawingStatuses = new Set<DrawingStatus>(['available', 'partial', 'no_drawing']);

const documentStatusToPrisma: Record<string, string> = {
  effective: 'EFFECTIVE',
  pending: 'PENDING_REVIEW',
  pending_review: 'PENDING_REVIEW',
  expired: 'EXPIRED',
  missing: 'MISSING',
  inconsistent: 'INCONSISTENT',
};

const documentStatusFromPrisma: Record<string, DrawingItem['documentStatus']> = {
  EFFECTIVE: 'effective',
  PENDING_REVIEW: 'pending_review',
  EXPIRED: 'expired',
  MISSING: 'missing',
  INCONSISTENT: 'inconsistent',
};

const documentSourceToPrisma: Record<string, string> = {
  mock: 'MOCK',
  wecom_disk: 'WECOM_DISK',
  wecom_disk_future: 'FUTURE_WECOM',
  manual_upload: 'MANUAL_UPLOAD',
  pdf_import: 'PDF_IMPORT',
  camera_capture: 'MANUAL_UPLOAD',
  manual_create: 'MANUAL_CREATE',
  future_wecom: 'FUTURE_WECOM',
  seed: 'SEED',
};

const documentSourceFromPrisma: Record<string, DrawingItem['source']> = {
  MOCK: 'mock',
  WECOM_DISK: 'wecom_disk_future',
  MANUAL_UPLOAD: 'manual_upload',
  PDF_IMPORT: 'pdf_import',
  MANUAL_CREATE: 'manual_upload',
  FUTURE_WECOM: 'future_wecom',
  SEED: 'seed',
};

const processToPrisma: Record<string, string> = {
  front: 'FRONT',
  back: 'BACK',
  common: 'COMMON',
  FRONT: 'FRONT',
  BACK: 'BACK',
  COMMON: 'COMMON',
};

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

function iso(value?: Date | string | null) {
  return value ? new Date(value).toISOString() : undefined;
}

function dateOrUndefined(value?: string | Date | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function dateOrNull(value?: string | Date | null) {
  return dateOrUndefined(value) ?? null;
}

function text(value: unknown, fallback = '') {
  const normalized = typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/g, ' ') : '';
  return normalized || fallback;
}

function optionalText(value: unknown) {
  const normalized = text(value);
  return normalized || undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.map((item) => text(item)).filter(Boolean))]
    : [];
}

function cleanObject<T extends Record<string, any>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

function removeId<T extends { id?: unknown }>(value: T) {
  const { id: _id, ...rest } = value;
  return cleanObject(rest);
}

function moduleId(productId: string, moduleKey: DrawingModuleKey) {
  return `module:${productId}:${moduleKey}`;
}

function productSource(value: unknown): HubProductModel['source'] {
  const normalized = text(value);
  if (['pdf_import', 'manual_create', 'future_wecom', 'seed'].includes(normalized)) {
    return normalized as HubProductModel['source'];
  }
  return 'manual_create';
}

function drawingStatus(value: unknown): DrawingStatus {
  const normalized = text(value);
  return drawingStatuses.has(normalized as DrawingStatus) ? normalized as DrawingStatus : 'no_drawing';
}

function moduleStatus(value: unknown, moduleKey: DrawingModuleKey, itemCount: number): DrawingModuleStatus {
  const normalized = text(value);
  if (moduleStatuses.has(normalized as DrawingModuleStatus)) return normalized as DrawingModuleStatus;
  if (itemCount > 0) return 'uploaded';
  return moduleKey === 'original_drawing' ? 'no_drawing' : 'pending';
}

function documentStatusApi(value: AnyRecord): NonNullable<DrawingItem['documentStatus']> {
  const rawText = text(value.documentStatus);
  if (documentStatusToPrisma[rawText]) return rawText === 'pending' ? 'pending_review' : rawText as NonNullable<DrawingItem['documentStatus']>;
  return documentStatusFromPrisma[text(value.status)] ?? 'pending_review';
}

function documentStatusPrisma(value?: string) {
  return documentStatusToPrisma[text(value)] ?? 'PENDING_REVIEW';
}

function documentTypePrisma(moduleKey: DrawingModuleKey) {
  const type = documentTypeForDrawingModule(moduleKey);
  const map: Record<string, string> = {
    drawing_pdf: 'DRAWING_PDF',
    sop_image: 'SOP_IMAGE',
    connector_manual: 'CONNECTOR_MANUAL',
    pinout_diagram: 'PINOUT_DIAGRAM',
    finished_detail_image: 'FINISHED_DETAIL_IMAGE',
    process_card: 'PROCESS_CARD',
  };
  return map[type] ?? 'PROCESS_CARD';
}

function documentTypeApi(row: AnyRecord) {
  const map: Record<string, string> = {
    DRAWING_PDF: 'drawing_pdf',
    SOP_IMAGE: 'sop_image',
    CONNECTOR_MANUAL: 'connector_manual',
    PINOUT_DIAGRAM: 'pinout_diagram',
    FINISHED_DETAIL_IMAGE: 'finished_detail_image',
    PROCESS_CARD: 'process_card',
  };
  return map[text(row.documentType)] ?? 'process_card';
}

function moduleKeyForDocument(row: AnyRecord): DrawingModuleKey {
  const moduleKey = text(row.moduleKey);
  if (drawingModuleKeys.includes(moduleKey as DrawingModuleKey)) return moduleKey as DrawingModuleKey;
  const documentType = documentTypeApi(row);
  if (documentType === 'drawing_pdf') return 'original_drawing';
  if (documentType === 'sop_image' || documentType === 'connector_manual') return 'sop';
  if (documentType === 'finished_detail_image') return 'finished_images';
  if (documentType === 'pinout_diagram') return 'notes';
  return 'accessory_specs';
}

function requiredProcessPrisma(moduleKey: DrawingModuleKey) {
  return processToPrisma[requiredProcessForDrawingModule(moduleKey)] ?? 'COMMON';
}

function requiredProcessApi(row: AnyRecord) {
  const map: Record<string, 'front' | 'back' | 'common'> = {
    FRONT: 'front',
    BACK: 'back',
    COMMON: 'common',
  };
  return map[text(row.requiredForProcess)] ?? 'common';
}

function fileType(row: AnyRecord): DrawingItem['fileType'] {
  const previewType = text(row.previewType);
  if (previewType === 'pdf') return 'pdf';
  if (previewType === 'image') return 'image';
  if (previewType === 'text') return 'text';
  if (previewType === 'card') return 'card';
  if (text(row.mimeType) === 'application/pdf') return 'pdf';
  if (text(row.mimeType).startsWith('image/')) return 'image';
  return 'card';
}

function confidenceText(value?: number | null): PdfImportItemRecord['confidence'] {
  if (typeof value !== 'number') return 'medium';
  if (value >= 0.85) return 'high';
  if (value >= 0.6) return 'medium';
  return 'low';
}

function confidenceNumber(value?: PdfImportItemRecord['confidence']) {
  if (value === 'high') return 0.95;
  if (value === 'low') return 0.45;
  return 0.7;
}

function importStatusFromRow(row: AnyRecord): PdfImportItemRecord['status'] {
  if (row.result === 'imported' || row.result === 'created_product' || row.result === 'added_version') return 'imported';
  if (row.result === 'error' || row.action === 'error') return 'error';
  if (row.result === 'skipped_duplicate' || row.action === 'skip' || row.action === 'skip_duplicate') return 'skipped';
  if (row.needsConfirmation || row.action === 'needs_confirmation') return 'needs_confirmation';
  return 'parsed';
}

@Injectable()
export class PrismaDrawingRepository implements DrawingRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly databaseConfig: DatabaseConfigService,
  ) {}

  async ensureInitialized(): Promise<DrawingMetadataStoreInitSummary> {
    this.assertReadable();
    const [customers, products, details, trash, importBatches] = await Promise.all([
      this.prismaService.client.customer.count({ where: { deletedAt: null } }),
      this.prismaService.client.product.count({ where: { deletedAt: null } }),
      this.prismaService.client.product.count({ where: { deletedAt: null } }),
      this.prismaService.client.productDocument.count({ where: { OR: [{ deleted: true }, { deletedAt: { not: null } }] } }),
      this.prismaService.client.pdfImportBatch.count(),
    ]);
    return { customers, products, details, trash, importBatches, initializedAt: now() };
  }

  async initializeFromSeedIfEmpty(): Promise<DrawingMetadataStoreInitSummary> {
    return this.ensureInitialized();
  }

  async readCustomers(): Promise<HubCustomer[]> {
    this.assertReadable();
    const rows = await this.prismaService.client.customer.findMany({
      where: { deletedAt: null },
      orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
    });
    return rows.map((row: AnyRecord) => this.mapCustomer(row));
  }

  async writeCustomers(customers: HubCustomer[]): Promise<void> {
    this.assertWritable();
    await (this.prismaService.client.$transaction as any)(async (tx: AnyRecord) => {
      for (const customer of customers) {
        const data = this.customerData(customer);
        await tx.customer.upsert({
          where: { id: data.id },
          create: data,
          update: removeId(data),
        });
      }
    });
  }

  async readProducts(): Promise<HubProductModel[]> {
    this.assertReadable();
    const rows = await this.prismaService.client.product.findMany({
      where: { deletedAt: null },
      orderBy: [{ customerId: 'asc' }, { normalizedProductModel: 'asc' }],
    });
    return rows.map((row: AnyRecord) => this.mapProduct(row));
  }

  async writeProducts(products: HubProductModel[]): Promise<void> {
    this.assertWritable();
    await (this.prismaService.client.$transaction as any)(async (tx: AnyRecord) => {
      for (const product of products) {
        const data = this.productData(product);
        await tx.product.upsert({
          where: { id: data.id },
          create: data,
          update: removeId(data),
        });
      }
    });
  }

  async readModuleState(): Promise<DrawingModuleState> {
    this.assertReadable();
    const [details, trash] = await Promise.all([this.readDetails(), this.readTrash()]);
    return {
      schemaVersion: 1,
      details,
      trash,
      updatedAt: now(),
    };
  }

  async writeModuleState(state: DrawingModuleState): Promise<void> {
    this.assertWritable();
    await this.writeDetails(state.details);
    await this.writeTrash(state.trash);
  }

  async readDetails(): Promise<ProductDrawingDetail[]> {
    this.assertReadable();
    const rows = await this.prismaService.client.product.findMany({
      where: { deletedAt: null },
      include: {
        customer: true,
        modules: {
          include: {
            coverDocument: true,
          },
          orderBy: [{ moduleKey: 'asc' }],
        },
        documents: {
          orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
        },
      },
      orderBy: [{ customerId: 'asc' }, { normalizedProductModel: 'asc' }],
    });
    return rows.map((row: AnyRecord) => this.mapDetail(row));
  }

  async writeDetails(details: ProductDrawingDetail[]): Promise<void> {
    this.assertWritable();
    await (this.prismaService.client.$transaction as any)(async (tx: AnyRecord) => {
      for (const detail of details) {
        await this.upsertDetailInTransaction(tx, detail);
      }
    });
  }

  async readTrash(): Promise<DrawingTrashRecord[]> {
    this.assertReadable();
    const rows = await this.prismaService.client.productDocument.findMany({
      where: { OR: [{ deleted: true }, { deletedAt: { not: null } }] },
      orderBy: [{ deletedAt: 'desc' }, { updatedAt: 'desc' }],
    });
    return rows.map((row: AnyRecord) => this.mapTrash(row));
  }

  async writeTrash(trash: DrawingTrashRecord[]): Promise<void> {
    this.assertWritable();
    await (this.prismaService.client.$transaction as any)(async (tx: AnyRecord) => {
      for (const record of trash) {
        const documentId = record.sourceDocumentId ?? record.item.documentId ?? record.item.itemId;
        if (!documentId) continue;
        await tx.productDocument.updateMany({
          where: { id: documentId },
          data: {
            deleted: true,
            deletedAt: dateOrUndefined(record.deletedAt) ?? new Date(),
            deletedBy: optionalText(record.deletedBy) ?? 'system',
            deleteReason: optionalText(record.reason) ?? null,
          },
        });
      }
    });
  }

  async upsertDetail(detail: ProductDrawingDetail): Promise<ProductDrawingDetail> {
    this.assertWritable();
    await (this.prismaService.client.$transaction as any)(async (tx: AnyRecord) => {
      await this.upsertDetailInTransaction(tx, detail);
    });
    return (await this.readDetails()).find((item) => item.product.productId === detail.product.productId) ?? clone(detail);
  }

  async readImportRecords(): Promise<PdfImportBatchRecord[]> {
    this.assertReadable();
    const rows = await this.prismaService.client.pdfImportBatch.findMany({
      include: {
        items: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
    return rows.map((row: AnyRecord) => this.mapImportBatch(row));
  }

  async writeImportRecords(records: PdfImportBatchRecord[]): Promise<void> {
    this.assertWritable();
    await (this.prismaService.client.$transaction as any)(async (tx: AnyRecord) => {
      for (const record of records) {
        await this.upsertImportBatchInTransaction(tx, record);
      }
    });
  }

  async upsertImportBatch(batch: PdfImportBatchRecord): Promise<PdfImportBatchRecord> {
    this.assertWritable();
    await (this.prismaService.client.$transaction as any)(async (tx: AnyRecord) => {
      await this.upsertImportBatchInTransaction(tx, batch);
    });
    return (await this.readImportRecords()).find((item) => item.importBatchId === batch.importBatchId) ?? clone(batch);
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

  async rollbackNewProduct(productId: string): Promise<void> {
    this.assertWritable();
    const timestamp = new Date();
    await (this.prismaService.client.$transaction as any)(async (tx: AnyRecord) => {
      await tx.productDocument.updateMany({
        where: { productId, deletedAt: null },
        data: {
          deleted: true,
          deletedAt: timestamp,
          deletedBy: 'system',
          deleteReason: 'rollback_new_product',
          status: 'EXPIRED',
          documentStatus: 'expired',
        },
      });
      await tx.product.updateMany({
        where: { id: productId, deletedAt: null },
        data: {
          deletedAt: timestamp,
          isActive: false,
          drawingStatus: 'no_drawing',
          remark: 'rollback_new_product',
        },
      });
    });
  }

  private mapCustomer(row: AnyRecord): HubCustomer {
    const name = text(row.customerName) || text(row.name, row.id);
    return {
      customerId: row.id,
      customerName: name,
      customerShortName: text(row.customerShortName) || name,
      customerCode: optionalText(row.customerCode) ?? optionalText(row.code),
      aliases: asStringArray(row.aliases),
      status: row.status === 'disabled' ? 'disabled' : 'active',
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
      deletedAt: iso(row.deletedAt),
    };
  }

  private mapProduct(row: AnyRecord): HubProductModel {
    const model = text(row.productModel) || text(row.productCode, row.id);
    return {
      productId: row.id,
      customerId: row.customerId,
      productModel: model,
      normalizedProductModel: text(row.normalizedProductModel) || normalizeProductModel(model),
      productName: text(row.productName, model),
      drawingStatus: drawingStatus(row.drawingStatus),
      source: productSource(row.source),
      searchKeywords: asStringArray(row.searchKeywords),
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
      deletedAt: iso(row.deletedAt),
      remark: optionalText(row.remark),
    };
  }

  private mapDetail(row: AnyRecord): ProductDrawingDetail {
    const product = this.mapProduct(row);
    const customer = row.customer ? this.mapCustomer(row.customer) : undefined;
    const activeDocuments = (row.documents ?? []).filter((document: AnyRecord) => !document.deleted && !document.deletedAt);
    const moduleRows = new Map<string, AnyRecord>((row.modules ?? []).map((module: AnyRecord) => [module.moduleKey, module]));
    const modules = createDefaultDrawingModules().map((module) => {
      const moduleRow = moduleRows.get(module.moduleKey);
      const documents = activeDocuments
        .filter((document: AnyRecord) => moduleKeyForDocument(document) === module.moduleKey)
        .sort((left: AnyRecord, right: AnyRecord) => {
          const order = (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
          return order || String(right.updatedAt ?? '').localeCompare(String(left.updatedAt ?? ''));
        });
      const coverDocumentId = moduleRow?.coverDocumentId
        ?? documents.find((document: AnyRecord) => document.isCover)?.id
        ?? documents.find((document: AnyRecord) => documentStatusApi(document) === 'effective')?.id
        ?? documents[0]?.id;
      const items = documents.map((document: AnyRecord) => this.mapDocumentItem(document, coverDocumentId));
      return {
        ...module,
        moduleName: text(moduleRow?.moduleName) || module.moduleName,
        status: moduleStatus(moduleRow?.status, module.moduleKey, items.length),
        items,
        coverDocumentId,
        itemCount: moduleRow?.itemCount ?? items.length,
        remark: optionalText(moduleRow?.remark) ?? module.remark,
        updatedAt: iso(moduleRow?.updatedAt) ?? module.updatedAt,
      };
    });
    return { product, customer, modules };
  }

  private mapDocumentItem(row: AnyRecord, coverDocumentId?: string): DrawingItem {
    const type = fileType(row);
    const id = row.id;
    const status = documentStatusApi(row);
    return {
      itemId: id,
      documentId: id,
      title: text(row.title, id),
      fileType: type,
      contentKind: text(row.contentKind) as DrawingItem['contentKind'] || type,
      previewUrl: optionalText(row.previewUrl),
      downloadUrl: optionalText(row.downloadUrl),
      fileName: optionalText(row.originalFileName) ?? optionalText(row.storedFileName) ?? text(row.title, id),
      version: text(row.version, 'V0'),
      remark: optionalText(row.remark),
      description: optionalText(row.description) ?? optionalText(row.mockPreviewText),
      uploadedAt: iso(row.updatedAt) ?? iso(row.createdAt) ?? now(),
      source: documentSourceFromPrisma[text(row.source)] ?? 'manual_upload',
      storageProvider: optionalText(row.storageProvider),
      storageKey: optionalText(row.storageKey),
      checksumSha256: optionalText(row.checksumSha256) ?? optionalText(row.checksum),
      fileSize: typeof row.fileSize === 'number' ? row.fileSize : undefined,
      mimeType: optionalText(row.mimeType),
      keywords: asStringArray(row.keywords),
      effectiveDate: iso(row.effectiveDate),
      versionGroupKey: optionalText(row.versionGroupKey),
      pageCount: typeof row.pageCount === 'number' ? row.pageCount : undefined,
      imageWidth: typeof row.imageWidth === 'number' ? row.imageWidth : undefined,
      imageHeight: typeof row.imageHeight === 'number' ? row.imageHeight : undefined,
      isCover: row.isCover === true || (coverDocumentId ? row.id === coverDocumentId : undefined),
      documentStatus: status,
      deletedAt: iso(row.deletedAt),
      deletedBy: optionalText(row.deletedBy),
      restoredAt: iso(row.restoredAt),
      restoredBy: optionalText(row.restoredBy),
    };
  }

  private mapTrash(row: AnyRecord): DrawingTrashRecord {
    const moduleKey = moduleKeyForDocument(row);
    return {
      trashId: `trash:${row.id}`,
      productId: row.productId,
      moduleKey,
      item: this.mapDocumentItem(row, undefined),
      deletedAt: iso(row.deletedAt) ?? iso(row.updatedAt) ?? now(),
      deletedBy: text(row.deletedBy, 'system'),
      reason: optionalText(row.deleteReason),
      sourceDocumentId: row.id,
    };
  }

  private mapImportBatch(row: AnyRecord): PdfImportBatchRecord {
    const items = (row.items ?? []).map((item: AnyRecord) => this.mapImportItem(item, row.id));
    return {
      importBatchId: row.id,
      customerId: row.customerId,
      createdAt: iso(row.createdAt) ?? now(),
      appliedAt: iso(row.appliedAt),
      expiresAt: iso(row.expiresAt),
      completedAt: iso(row.completedAt) ?? null,
      status: row.status,
      applyStatus: row.applyStatus ?? undefined,
      applySummary: row.applySummary ?? undefined,
      remark: optionalText(row.remark),
      operatorId: optionalText(row.operatorId),
      operatorName: optionalText(row.operatorName),
      totalFiles: row.totalFiles,
      successCount: row.successCount,
      skippedCount: row.skippedCount,
      errorCount: row.errorCount,
      needsConfirmationCount: row.needsConfirmationCount,
      parsedFiles: row.totalFiles,
      skippedFiles: row.skippedCount,
      importedFiles: row.successCount,
      items,
      applyItems: items
        .filter((item) => item.status === 'imported' || item.status === 'error')
        .map((item) => ({
          importItemId: item.importItemId,
          originalFileName: item.originalFileName,
          confirmedProductModel: item.confirmedProductModel ?? item.parsedProductModel,
          productId: item.productId,
          documentId: item.existingDocumentId,
          result: item.status === 'error' ? 'error' : 'added_version',
          message: item.message ?? '',
          errorMessage: item.errorMessage,
          appliedAt: row.appliedAt ? iso(row.appliedAt) : undefined,
        })),
    };
  }

  private mapImportItem(row: AnyRecord, importBatchId: string): PdfImportItemRecord {
    const status = importStatusFromRow(row);
    return {
      importItemId: row.id,
      importBatchId,
      fileName: row.originalFileName,
      stagedFileName: row.stagedFileKey,
      stagedFileKey: row.stagedFileKey,
      originalFileName: row.originalFileName,
      checksumSha256: row.checksumSha256,
      fileSize: row.fileSize,
      mimeType: row.mimeType,
      parsedProductModel: row.parsedProductModel ?? row.confirmedProductModel ?? '',
      confirmedProductModel: row.confirmedProductModel ?? undefined,
      normalizedProductModel: normalizeProductModel(row.confirmedProductModel ?? row.parsedProductModel ?? ''),
      parsedVersion: row.parsedVersion ?? undefined,
      parseWarnings: Array.isArray(row.parseWarnings) ? row.parseWarnings.map(String) : undefined,
      needsConfirmation: row.needsConfirmation,
      confidence: confidenceText(row.confidence),
      status,
      action: row.action,
      message: row.message ?? undefined,
      errorMessage: row.errorMessage ?? undefined,
      productId: row.resultProductId ?? row.existingProductId ?? undefined,
      existingProductId: row.existingProductId ?? undefined,
      existingDocumentId: row.resultDocumentId ?? row.existingDocumentId ?? undefined,
      version: row.confirmedVersion ?? row.parsedVersion ?? undefined,
    };
  }

  private customerData(customer: HubCustomer) {
    const customerName = text(customer.customerName, customer.customerId);
    return cleanObject({
      id: customer.customerId,
      name: customerName,
      code: optionalText(customer.customerCode) ?? null,
      customerName,
      customerShortName: text(customer.customerShortName, customerName),
      customerCode: optionalText(customer.customerCode) ?? null,
      aliases: customer.aliases ?? [],
      status: customer.status ?? 'active',
      deletedAt: dateOrNull(customer.deletedAt),
      createdAt: dateOrUndefined(customer.createdAt),
      updatedAt: dateOrUndefined(customer.updatedAt),
    });
  }

  private productData(product: HubProductModel) {
    const model = text(product.productModel, product.productId);
    return cleanObject({
      id: product.productId,
      customerId: product.customerId,
      productCode: product.productId,
      productModel: model,
      normalizedProductModel: text(product.normalizedProductModel) || normalizeProductModel(model),
      productName: text(product.productName, model),
      currentVersion: 'V1',
      drawingStatus: drawingStatus(product.drawingStatus),
      source: product.source ?? 'manual_create',
      remark: optionalText(product.remark) ?? null,
      searchKeywords: product.searchKeywords ?? [],
      processSegment: 'COMMON',
      isActive: !product.deletedAt,
      deletedAt: dateOrNull(product.deletedAt),
      createdAt: dateOrUndefined(product.createdAt),
      updatedAt: dateOrUndefined(product.updatedAt),
    });
  }

  private moduleData(productId: string, module: DrawingModule) {
    const activeItems = module.items.filter((item) => !item.deletedAt);
    return cleanObject({
      id: moduleId(productId, module.moduleKey),
      productId,
      moduleKey: module.moduleKey,
      moduleName: module.moduleName,
      status: moduleStatus(module.status, module.moduleKey, activeItems.length),
      remark: optionalText(module.remark) ?? null,
      coverDocumentId: null,
      itemCount: module.itemCount ?? activeItems.length,
      createdAt: dateOrUndefined(module.updatedAt),
      updatedAt: dateOrUndefined(module.updatedAt),
    });
  }

  private documentData(productId: string, module: DrawingModule, item: DrawingItem) {
    const documentId = item.documentId ?? item.itemId;
    const moduleKey = module.moduleKey;
    const documentType = documentTypePrisma(moduleKey);
    const requiredForProcess = requiredProcessPrisma(moduleKey);
    const apiDocumentType = documentTypeForDrawingModule(moduleKey);
    const apiRequiredForProcess = requiredProcessForDrawingModule(moduleKey);
    const versionGroupKey = item.versionGroupKey ?? documentEffectiveVersionGroupKey({
      productId,
      moduleKey,
      documentType: apiDocumentType,
      requiredForProcess: apiRequiredForProcess,
    });
    const status = documentStatusPrisma(item.documentStatus);
    return cleanObject({
      id: documentId,
      productId,
      moduleId: moduleId(productId, moduleKey),
      moduleKey,
      documentType,
      versionGroupKey,
      title: text(item.title, documentId),
      version: text(item.version, 'V0'),
      contentKind: item.contentKind ?? item.fileType,
      status,
      documentStatus: status === 'EFFECTIVE'
        ? 'effective'
        : status === 'EXPIRED'
          ? 'expired'
          : status === 'MISSING'
            ? 'missing'
            : status === 'INCONSISTENT'
              ? 'inconsistent'
              : 'pending_review',
      source: documentSourceToPrisma[item.source ?? 'manual_upload'] ?? 'MANUAL_UPLOAD',
      requiredForProcess,
      previewType: (item as AnyRecord).previewType ?? item.contentKind ?? item.fileType,
      previewMode: optionalText((item as AnyRecord).previewMode) ?? null,
      originalFileName: optionalText(item.fileName) ?? null,
      storedFileName: optionalText((item as AnyRecord).storedFileName) ?? null,
      mimeType: optionalText(item.mimeType) ?? null,
      fileSize: typeof item.fileSize === 'number' ? item.fileSize : null,
      pageCount: typeof item.pageCount === 'number' ? item.pageCount : null,
      imageWidth: typeof item.imageWidth === 'number' ? item.imageWidth : null,
      imageHeight: typeof item.imageHeight === 'number' ? item.imageHeight : null,
      previewUrl: optionalText(item.previewUrl) ?? null,
      downloadUrl: optionalText(item.downloadUrl) ?? null,
      storageProvider: optionalText(item.storageProvider) ?? (item.storageKey ? 'local' : null),
      storageKey: optionalText(item.storageKey) ?? null,
      checksum: optionalText(item.checksumSha256) ?? null,
      checksumSha256: optionalText(item.checksumSha256) ?? null,
      mockPreviewText: optionalText(item.description) ?? null,
      keywords: item.keywords ?? [],
      keywordMeta: null,
      description: optionalText(item.description) ?? null,
      remark: optionalText(item.remark) ?? null,
      isCover: item.isCover === true || module.coverDocumentId === documentId,
      effectiveDate: dateOrUndefined(item.effectiveDate) ?? (status === 'EFFECTIVE' ? dateOrUndefined(item.uploadedAt) ?? new Date() : null),
      archived: Boolean((item as AnyRecord).archived),
      archivedAt: dateOrNull((item as AnyRecord).archivedAt),
      deleted: Boolean(item.deletedAt),
      deletedAt: dateOrNull(item.deletedAt),
      deletedBy: optionalText(item.deletedBy) ?? null,
      restoredAt: dateOrNull(item.restoredAt),
      restoredBy: optionalText(item.restoredBy) ?? null,
      createdAt: dateOrUndefined((item as AnyRecord).createdAt) ?? dateOrUndefined(item.uploadedAt),
      updatedAt: dateOrUndefined(item.uploadedAt),
    });
  }

  private importBatchData(batch: PdfImportBatchRecord) {
    return cleanObject({
      id: batch.importBatchId,
      customerId: batch.customerId,
      status: batch.status,
      totalFiles: batch.totalFiles,
      successCount: batch.successCount ?? batch.importedFiles ?? 0,
      skippedCount: batch.skippedCount ?? batch.skippedFiles ?? 0,
      errorCount: batch.errorCount ?? 0,
      needsConfirmationCount: batch.needsConfirmationCount ?? 0,
      expiresAt: dateOrUndefined(batch.expiresAt) ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
      completedAt: dateOrNull(batch.completedAt),
      appliedAt: dateOrNull(batch.appliedAt),
      applyStatus: batch.applyStatus ?? null,
      applySummary: batch.applySummary ?? null,
      remark: optionalText(batch.remark) ?? null,
      operatorId: optionalText(batch.operatorId) ?? null,
      operatorName: optionalText(batch.operatorName) ?? null,
      createdAt: dateOrUndefined(batch.createdAt),
      updatedAt: dateOrUndefined((batch as AnyRecord).updatedAt),
    });
  }

  private importItemData(batchId: string, item: PdfImportItemRecord, applyItem?: NonNullable<PdfImportBatchRecord['applyItems']>[number]) {
    return cleanObject({
      id: item.importItemId,
      importBatchId: batchId,
      originalFileName: item.originalFileName,
      stagedFileKey: item.stagedFileKey ?? item.stagedFileName ?? item.fileName,
      mimeType: item.mimeType,
      fileSize: item.fileSize,
      checksumSha256: item.checksumSha256,
      parsedProductModel: optionalText(item.parsedProductModel) ?? null,
      confirmedProductModel: optionalText(item.confirmedProductModel) ?? null,
      parsedVersion: optionalText(item.parsedVersion) ?? null,
      confirmedVersion: optionalText(item.version) ?? null,
      confidence: confidenceNumber(item.confidence),
      needsConfirmation: item.needsConfirmation ?? item.status === 'needs_confirmation',
      parseWarnings: item.parseWarnings ?? [],
      existingProductId: optionalText(item.existingProductId) ?? null,
      existingDocumentId: optionalText(item.existingDocumentId) ?? null,
      action: item.action,
      selected: true,
      setAsEffective: applyItem?.setAsEffective ?? false,
      productName: optionalText((item as AnyRecord).productName) ?? null,
      result: applyItem?.result ?? item.status,
      resultProductId: optionalText(applyItem?.productId) ?? optionalText(item.productId) ?? null,
      resultDocumentId: optionalText(applyItem?.documentId) ?? null,
      message: optionalText(applyItem?.message) ?? optionalText(item.message) ?? null,
      errorMessage: optionalText(applyItem?.errorMessage) ?? optionalText(item.errorMessage) ?? null,
      appliedAt: dateOrNull(applyItem?.appliedAt),
    });
  }

  private async upsertDetailInTransaction(tx: AnyRecord, detail: ProductDrawingDetail) {
    if (detail.customer) {
      const customer = this.customerData(detail.customer);
      await tx.customer.upsert({ where: { id: customer.id }, create: customer, update: removeId(customer) });
    }
    const product = this.productData(detail.product);
    await tx.product.upsert({ where: { id: product.id }, create: product, update: removeId(product) });
    for (const module of detail.modules) {
      const moduleRecord = this.moduleData(product.id, module);
      await tx.productModule.upsert({
        where: { productId_moduleKey: { productId: product.id, moduleKey: module.moduleKey } },
        create: moduleRecord,
        update: removeId(moduleRecord),
      });
      for (const item of module.items) {
        const document = this.documentData(product.id, module, item);
        await tx.productDocument.upsert({
          where: { id: document.id },
          create: document,
          update: removeId(document),
        });
        await this.expireOtherEffectiveDocuments(tx, document);
      }
      const coverDocumentId = module.coverDocumentId ?? module.items.find((item) => item.isCover)?.documentId ?? module.items.find((item) => item.isCover)?.itemId;
      if (coverDocumentId) {
        await tx.productModule.update({
          where: { productId_moduleKey: { productId: product.id, moduleKey: module.moduleKey } },
          data: { coverDocumentId },
        });
        await tx.productDocument.updateMany({
          where: { productId: product.id, moduleKey: module.moduleKey },
          data: { isCover: false },
        });
        await tx.productDocument.updateMany({
          where: { id: coverDocumentId, productId: product.id, moduleKey: module.moduleKey },
          data: { isCover: true },
        });
      }
    }
  }

  private async expireOtherEffectiveDocuments(tx: AnyRecord, document: AnyRecord) {
    if (document.documentStatus !== 'effective') return;
    if (!supportsSingleEffectiveVersion(document.moduleKey)) return;
    if (!document.versionGroupKey) return;
    await tx.productDocument.updateMany({
      where: {
        id: { not: document.id },
        productId: document.productId,
        moduleKey: document.moduleKey,
        versionGroupKey: document.versionGroupKey,
        status: 'EFFECTIVE',
        deleted: false,
        deletedAt: null,
        archived: false,
      },
      data: {
        status: 'EXPIRED',
        documentStatus: 'expired',
      },
    });
  }

  private async upsertImportBatchInTransaction(tx: AnyRecord, batch: PdfImportBatchRecord) {
    const data = this.importBatchData(batch);
    await tx.pdfImportBatch.upsert({
      where: { id: data.id },
      create: data,
      update: removeId(data),
    });
    const applyItems = new Map((batch.applyItems ?? []).map((item) => [item.importItemId, item]));
    for (const item of batch.items) {
      const itemData = this.importItemData(batch.importBatchId, item, applyItems.get(item.importItemId));
      await tx.pdfImportItem.upsert({
        where: { id: itemData.id },
        create: itemData,
        update: removeId(itemData),
      });
    }
  }

  private assertReadable() {
    this.databaseConfig.assertCanStartPostgres();
  }

  private assertWritable() {
    this.databaseConfig.assertWriteAllowed();
    this.assertReadable();
  }
}
