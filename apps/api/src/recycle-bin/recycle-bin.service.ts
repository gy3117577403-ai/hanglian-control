import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedRequestUser } from '../auth/decorators/current-user.decorator';
import { drawingModuleForDocumentType } from '../common/utils/document-version-rules';
import type { ProductDocument } from '../common/types/production.types';
import { DatabaseConfigService } from '../database/database-config.service';
import { PrismaService } from '../database/prisma.service';
import { prismaDocumentStatusToApi, prismaDocumentTypeToApi } from '../repositories/prisma/prisma-mappers';
import { mockStore } from '../mock/production.mock';
import { LocalStorageService } from '../storage/local-storage.service';
import type { RecycleBinQueryDto } from './dto/recycle-bin-query.dto';

type StoredDocument = ProductDocument & {
  deleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deleteReason?: string | null;
  restoredAt?: string | null;
  restoredBy?: string | null;
  moduleKey?: string | null;
};

export interface RecycleBinItem {
  id: string;
  documentId: string;
  type: 'document';
  title: string;
  version: string;
  customerId?: string;
  customerName?: string;
  productId: string;
  productModel?: string;
  productName?: string;
  category: string;
  moduleKey?: string;
  documentType: string;
  documentStatus?: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize?: number;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deleteReason?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  canRestore: boolean;
  canPermanentDelete: boolean;
}

const documentTypeToPrisma: Record<string, string> = {
  drawing_pdf: 'DRAWING_PDF',
  sop_image: 'SOP_IMAGE',
  connector_manual: 'CONNECTOR_MANUAL',
  pinout_diagram: 'PINOUT_DIAGRAM',
  finished_detail_image: 'FINISHED_DETAIL_IMAGE',
  process_card: 'PROCESS_CARD',
};

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function iso(value?: string | Date | null) {
  return value ? new Date(value).toISOString() : null;
}

function documentId(document: Pick<ProductDocument, 'id' | 'documentId'>) {
  return document.documentId || document.id;
}

function isDeleted(document: StoredDocument) {
  return document.deleted === true || Boolean(document.deletedAt);
}

function operatorName(user?: AuthenticatedRequestUser) {
  return user?.displayName || user?.username || user?.id || 'local-user';
}

function moduleKeyFor(documentType?: string, storedModuleKey?: string | null) {
  return storedModuleKey || drawingModuleForDocumentType(documentType) || documentType || 'document';
}

function categoryMatches(item: RecycleBinItem, category?: string) {
  if (!category) return true;
  return item.category === category || item.moduleKey === category || item.documentType === category;
}

@Injectable()
export class RecycleBinService {
  constructor(
    private readonly databaseConfig: DatabaseConfigService,
    private readonly prisma: PrismaService,
    private readonly localStorageService: LocalStorageService,
  ) {}

  async findAll(query: RecycleBinQueryDto = {}) {
    const limit = this.clampLimit(query.limit);
    const offset = this.clampOffset(query.offset);
    const keyword = clean(query.keyword).toLowerCase();
    const category = clean(query.category);
    const items = this.usesPostgres()
      ? await this.findPostgresItems(query, keyword, category)
      : this.findMockItems(query, keyword, category);

    return {
      items: items.slice(offset, offset + limit),
      total: items.length,
      limit,
      offset,
    };
  }

  async restore(id: string, user?: AuthenticatedRequestUser) {
    const restoredAt = new Date();
    if (this.usesPostgres()) {
      this.databaseConfig.assertWriteAllowed();
      const row = await this.findPostgresDeletedDocument(id);
      if (!row) throw new NotFoundException('Document was not found in recycle bin.');
      const restored = await this.prisma.client.productDocument.update({
        where: { id: row.id },
        data: {
          deleted: false,
          deletedAt: null,
          deletedBy: null,
          deleteReason: null,
          restoredAt,
          restoredBy: user?.id ?? null,
        },
        include: { product: { include: { customer: true } } },
      });
      return {
        success: true,
        restored: true,
        restoredAt: restoredAt.toISOString(),
        item: this.mapPostgresItem(restored),
      };
    }

    const documents = this.localStorageService.readDocumentsSync() as StoredDocument[];
    const index = documents.findIndex((document) => (
      (document.id === id || document.documentId === id) && isDeleted(document)
    ));
    if (index < 0) throw new NotFoundException('Document was not found in recycle bin.');

    documents[index] = {
      ...documents[index],
      deleted: false,
      deletedAt: null,
      deletedBy: null,
      deleteReason: null,
      restoredAt: restoredAt.toISOString(),
      restoredBy: operatorName(user),
      updatedAt: restoredAt.toISOString(),
    };
    this.localStorageService.writeDocumentsSync(documents);
    return {
      success: true,
      restored: true,
      restoredAt: restoredAt.toISOString(),
      item: this.mapMockItem(documents[index]),
    };
  }

  async permanentDelete(id: string) {
    if (this.usesPostgres()) {
      this.databaseConfig.assertDestructiveAllowed();
      const row = await this.findPostgresDeletedDocument(id);
      if (!row) throw new NotFoundException('Document was not found in recycle bin.');
      await this.prisma.client.productDocument.delete({ where: { id: row.id } });
      return {
        success: true,
        permanentDeleted: true,
        deletedId: id,
        type: 'document',
      };
    }

    const documents = this.localStorageService.readDocumentsSync() as StoredDocument[];
    const index = documents.findIndex((document) => (
      (document.id === id || document.documentId === id) && isDeleted(document)
    ));
    if (index < 0) throw new NotFoundException('Document was not found in recycle bin.');
    const [removed] = documents.splice(index, 1);
    this.localStorageService.writeDocumentsSync(documents);
    return {
      success: true,
      permanentDeleted: true,
      deletedId: id,
      type: 'document',
      item: this.mapMockItem(removed),
    };
  }

  private usesPostgres() {
    return this.databaseConfig.getStatus().dataSource === 'postgres';
  }

  private async findPostgresItems(query: RecycleBinQueryDto, keyword?: string, category?: string) {
    const categoryFilters = this.prismaCategoryFilters(category);
    const rows = await this.prisma.client.productDocument.findMany({
      where: {
        AND: [
          { OR: [{ deleted: true }, { deletedAt: { not: null } }] },
          ...(query.productId ? [{ productId: query.productId }] : []),
          ...(query.customerId ? [{ product: { customerId: query.customerId } }] : []),
          ...(categoryFilters.length ? [{ OR: categoryFilters }] : []),
          ...(keyword
            ? [{
                OR: [
                  { title: { contains: keyword, mode: 'insensitive' } },
                  { originalFileName: { contains: keyword, mode: 'insensitive' } },
                  { remark: { contains: keyword, mode: 'insensitive' } },
                  { product: { productModel: { contains: keyword, mode: 'insensitive' } } },
                ],
              }]
            : []),
        ],
      },
      include: { product: { include: { customer: true } } },
      orderBy: [{ deletedAt: 'desc' }, { updatedAt: 'desc' }],
    });
    return rows.map((row: Record<string, unknown>) => this.mapPostgresItem(row));
  }

  private async findPostgresDeletedDocument(id: string) {
    return this.prisma.client.productDocument.findFirst({
      where: {
        id,
        OR: [{ deleted: true }, { deletedAt: { not: null } }],
      },
      include: { product: { include: { customer: true } } },
    });
  }

  private prismaCategoryFilters(category?: string) {
    if (!category) return [];
    const filters: Array<Record<string, unknown>> = [{ moduleKey: category }];
    const documentType = documentTypeToPrisma[category];
    if (documentType) filters.push({ documentType });
    return filters;
  }

  private mapPostgresItem(row: Record<string, any>): RecycleBinItem {
    const documentType = prismaDocumentTypeToApi(row.documentType);
    const moduleKey = moduleKeyFor(documentType, row.moduleKey);
    const product = row.product ?? {};
    const customer = product.customer ?? {};
    return {
      id: row.id,
      documentId: row.id,
      type: 'document',
      title: row.title ?? row.originalFileName ?? row.id,
      version: row.version ?? '',
      customerId: product.customerId ?? undefined,
      customerName: customer.customerName ?? customer.name ?? undefined,
      productId: row.productId,
      productModel: product.productModel ?? product.normalizedProductModel ?? undefined,
      productName: product.productName ?? undefined,
      category: moduleKey,
      moduleKey,
      documentType,
      documentStatus: prismaDocumentStatusToApi(row.status),
      originalFileName: row.originalFileName ?? undefined,
      mimeType: row.mimeType ?? undefined,
      fileSize: row.fileSize ?? undefined,
      deletedAt: iso(row.deletedAt) ?? iso(row.updatedAt),
      deletedBy: row.deletedBy ?? undefined,
      deleteReason: row.deleteReason ?? undefined,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
      canRestore: true,
      canPermanentDelete: true,
    };
  }

  private findMockItems(query: RecycleBinQueryDto, keyword?: string, category?: string) {
    return (this.localStorageService.readDocumentsSync() as StoredDocument[])
      .filter(isDeleted)
      .map((document) => this.mapMockItem(document))
      .filter((item) => !query.customerId || item.customerId === query.customerId)
      .filter((item) => !query.productId || item.productId === query.productId)
      .filter((item) => categoryMatches(item, category))
      .filter((item) => !keyword || [
        item.title,
        item.version,
        item.originalFileName,
        item.customerName,
        item.productModel,
        item.productName,
      ].some((value) => String(value ?? '').toLowerCase().includes(keyword)))
      .sort((left, right) => String(right.deletedAt ?? '').localeCompare(String(left.deletedAt ?? '')));
  }

  private mapMockItem(document: StoredDocument): RecycleBinItem {
    const product = mockStore.products.find((item) => item.id === document.productId);
    const customer = product
      ? mockStore.customers.find((item) => item.id === product.customerId)
      : undefined;
    const productRecord = product as Record<string, any> | undefined;
    const customerRecord = customer as Record<string, any> | undefined;
    const moduleKey = moduleKeyFor(document.documentType, document.moduleKey);
    return {
      id: document.id,
      documentId: documentId(document),
      type: 'document',
      title: document.title,
      version: document.version,
      customerId: productRecord?.customerId,
      customerName: customerRecord?.customerName ?? customerRecord?.name,
      productId: document.productId,
      productModel: productRecord?.productModel ?? productRecord?.productCode,
      productName: productRecord?.productName,
      category: moduleKey,
      moduleKey,
      documentType: document.documentType,
      documentStatus: document.documentStatus,
      originalFileName: document.originalFileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      deletedAt: document.deletedAt ?? document.updatedAt,
      deletedBy: document.deletedBy,
      deleteReason: document.deleteReason,
      createdAt: document.createdAt ?? null,
      updatedAt: document.updatedAt ?? null,
      canRestore: true,
      canPermanentDelete: true,
    };
  }

  private clampLimit(value?: number) {
    const parsed = Number(value ?? 50);
    if (!Number.isFinite(parsed)) return 50;
    return Math.min(Math.max(Math.floor(parsed), 1), 200);
  }

  private clampOffset(value?: number) {
    const parsed = Number(value ?? 0);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(Math.floor(parsed), 0);
  }
}
