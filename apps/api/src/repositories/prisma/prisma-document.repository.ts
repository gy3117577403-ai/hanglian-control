import { Injectable } from '@nestjs/common';
import { assertDatabaseWriteAllowed } from '../../database/database-safety';
import { PrismaService } from '../../database/prisma.service';
import { evaluatePlanReadiness } from '../../common/utils/readiness';
import type {
  CreateUploadedDocumentPayload,
  DocumentCompareField,
  DocumentCompareResult,
  DocumentQuery,
  DocumentVersionGroup,
  DocumentVersionQuery,
  DocumentVersionsResponse,
  ProductDocument,
  SetEffectiveDocumentPayload,
  SetEffectiveDocumentResult,
  UpdateDocumentStatusPayload,
  UpdateDocumentVersionPayload,
} from '../../common/types/production.types';
import type { DocumentRepositoryInterface } from '../interfaces/document.repository.interface';
import {
  apiDocumentSourceToPrisma,
  apiDocumentStatusToPrisma,
  apiDocumentTypeToPrisma,
  apiProcessToPrisma,
  documentVersionGroupKey,
  mapPrismaDocument,
  mapPrismaPlan,
} from './prisma-mappers';

const DOCUMENT_INCLUDE = {
  product: true,
  productionPlan: true,
};

const PLAN_INCLUDE = {
  product: {
    include: {
      customer: true,
      frontParameters: { where: { deletedAt: null }, orderBy: { updatedAt: 'desc' } },
      backPackages: { where: { deletedAt: null }, orderBy: { updatedAt: 'desc' } },
      documents: { where: { deletedAt: null, archived: false }, orderBy: { updatedAt: 'desc' } },
    },
  },
  documents: { where: { deletedAt: null, archived: false }, orderBy: { updatedAt: 'desc' } },
};

function productIdFromDocument(document: ProductDocument) {
  return document.productId ?? '';
}

function docGroupKey(document: ProductDocument) {
  return document.versionGroupKey ?? documentVersionGroupKey({
    productId: productIdFromDocument(document),
    documentType: document.documentType ?? 'process_card',
    requiredForProcess: document.requiredForProcess ?? 'common',
  });
}

function groupFromVersions(key: string, versions: ProductDocument[]): DocumentVersionGroup {
  const sorted = [...versions].sort((left, right) => String(right.updatedAt ?? '').localeCompare(String(left.updatedAt ?? '')));
  const currentDocument = sorted.find((document) => document.documentStatus === 'effective' && !document.archived) ?? sorted[0];
  return {
    versionGroupKey: key,
    productId: productIdFromDocument(currentDocument),
    documentType: currentDocument.documentType ?? 'process_card',
    requiredForProcess: currentDocument.requiredForProcess ?? 'common',
    currentDocument,
    versions: sorted,
    effectiveDocumentId: sorted.find((document) => document.documentStatus === 'effective' && !document.archived)?.documentId,
    versionCount: sorted.length,
    hasExpired: sorted.some((document) => document.documentStatus === 'expired'),
    hasPendingReview: sorted.some((document) => document.documentStatus === 'pending_review'),
    hasInconsistent: sorted.some((document) => document.documentStatus === 'inconsistent'),
  };
}

function compareValue(value: unknown) {
  return Array.isArray(value) ? value.join('|') : String(value ?? '');
}

@Injectable()
export class PrismaDocumentRepository implements DocumentRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async findDocuments(query: DocumentQuery = {}): Promise<ProductDocument[]> {
    const plan = query.planId
      ? await this.prisma.client.productionPlan.findFirst({
          where: { id: query.planId, deletedAt: null },
          select: { productId: true },
        })
      : undefined;
    if (query.planId && !plan) return [];

    const rows = await this.prisma.client.productDocument.findMany({
      where: {
        deletedAt: null,
        ...(query.productId || plan?.productId ? { productId: query.productId ?? plan?.productId } : {}),
        ...(query.planId ? { OR: [{ productionPlanId: query.planId }, { productId: plan?.productId }] } : {}),
        ...(query.documentType ? { documentType: apiDocumentTypeToPrisma(query.documentType) } : {}),
        ...(query.status ? { status: apiDocumentStatusToPrisma(query.status) } : {}),
      },
      include: DOCUMENT_INCLUDE,
      orderBy: [{ archived: 'asc' }, { updatedAt: 'desc' }],
    });

    return rows.map(mapPrismaDocument);
  }

  async findDocumentById(id: string): Promise<ProductDocument | undefined> {
    const row = await this.prisma.client.productDocument.findFirst({
      where: { id, deletedAt: null },
      include: DOCUMENT_INCLUDE,
    });
    return row ? mapPrismaDocument(row) : undefined;
  }

  async findDocumentsByProduct(productId: string): Promise<ProductDocument[]> {
    return this.findDocuments({ productId });
  }

  async findDocumentsByPlan(planId: string): Promise<ProductDocument[]> {
    return this.findDocuments({ planId });
  }

  async findRequiredDocuments(planId: string): Promise<ProductDocument[]> {
    const plan = await this.prisma.client.productionPlan.findFirst({
      where: { id: planId, deletedAt: null },
      select: { productId: true, processSegment: true },
    });
    if (!plan) return [];
    const rows = await this.findDocuments({ planId, productId: plan.productId });
    return rows.filter((document) => {
      if (document.requiredForProcess === 'common') return true;
      if (plan.processSegment === 'FRONT') return document.requiredForProcess === 'front';
      if (plan.processSegment === 'BACK') return document.requiredForProcess === 'back';
      return true;
    });
  }

  async createDocument(payload: CreateUploadedDocumentPayload): Promise<ProductDocument> {
    assertDatabaseWriteAllowed();
    const now = new Date();
    const versionGroupKey = documentVersionGroupKey({
      productId: payload.productId,
      documentType: payload.documentType,
      requiredForProcess: payload.requiredForProcess,
    });
    const row = await this.prisma.client.productDocument.create({
      data: {
        productId: payload.productId,
        productionPlanId: payload.planId,
        documentType: apiDocumentTypeToPrisma(payload.documentType),
        versionGroupKey,
        title: payload.title,
        version: payload.version,
        status: apiDocumentStatusToPrisma(payload.status),
        source: apiDocumentSourceToPrisma('manual_upload'),
        requiredForProcess: apiProcessToPrisma(payload.requiredForProcess),
        previewType: payload.previewType,
        originalFileName: payload.originalFileName,
        storedFileName: payload.storedFileName,
        mimeType: payload.mimeType,
        fileSize: payload.fileSize,
        previewUrl: payload.previewUrl,
        downloadUrl: payload.downloadUrl,
        storageProvider: payload.storageProvider ?? 'local',
        storageKey: payload.storageKey ?? payload.storedFileName,
        checksum: payload.checksum,
        mockPreviewText: payload.remark ?? `本地上传 ${payload.title}`,
        keywords: payload.keywords,
        remark: payload.remark,
        effectiveDate: payload.status === 'effective' ? now : undefined,
      },
    });

    if (payload.status === 'effective') {
      await this.expireOtherEffectiveDocuments(row.id, versionGroupKey);
    }
    return mapPrismaDocument(row);
  }

  async updateDocumentStatus(id: string, payload: UpdateDocumentStatusPayload): Promise<ProductDocument | undefined> {
    assertDatabaseWriteAllowed();
    const current = await this.findDocumentById(id);
    if (!current) return undefined;
    const row = await this.prisma.client.productDocument.update({
      where: { id: current.id },
      data: {
        status: apiDocumentStatusToPrisma(payload.status),
        remark: payload.reason ?? current.remark,
        effectiveDate: payload.status === 'effective' ? new Date() : undefined,
      },
    });
    const document = mapPrismaDocument(row);
    if (payload.status === 'effective') {
      await this.expireOtherEffectiveDocuments(document.id, docGroupKey(document));
    }
    return this.findDocumentById(document.id);
  }

  async updateDocumentVersion(id: string, payload: UpdateDocumentVersionPayload): Promise<ProductDocument | undefined> {
    assertDatabaseWriteAllowed();
    const current = await this.findDocumentById(id);
    if (!current) return undefined;
    const row = await this.prisma.client.productDocument.update({
      where: { id: current.id },
      data: {
        version: payload.version,
        ...(payload.status ? { status: apiDocumentStatusToPrisma(payload.status) } : {}),
        ...(payload.status === 'effective' ? { effectiveDate: new Date() } : {}),
      },
    });
    const document = mapPrismaDocument(row);
    if (document.documentStatus === 'effective') {
      await this.expireOtherEffectiveDocuments(document.id, docGroupKey(document));
    }
    return this.findDocumentById(document.id);
  }

  async archiveDocument(id: string): Promise<ProductDocument | undefined> {
    assertDatabaseWriteAllowed();
    const current = await this.findDocumentById(id);
    if (!current) return undefined;
    const row = await this.prisma.client.productDocument.update({
      where: { id: current.id },
      data: {
        archived: true,
        archivedAt: new Date(),
        status: 'EXPIRED',
      },
    });
    return mapPrismaDocument(row);
  }

  async findDocumentVersions(id: string): Promise<DocumentVersionsResponse | undefined> {
    const currentDocument = await this.findDocumentById(id);
    if (!currentDocument) return undefined;
    const versions = await this.findProductDocumentVersions({
      productId: productIdFromDocument(currentDocument),
      documentType: currentDocument.documentType,
      requiredForProcess: currentDocument.requiredForProcess,
    });
    const group = versions.find((item) => item.versionGroupKey === docGroupKey(currentDocument));
    return group ? { ...group, currentDocument } : undefined;
  }

  async findProductDocumentVersions(query: DocumentVersionQuery): Promise<DocumentVersionGroup[]> {
    const documents = await this.findDocuments({
      productId: query.productId,
      documentType: query.documentType,
    });
    const filtered = documents.filter((document) => !query.requiredForProcess || document.requiredForProcess === query.requiredForProcess);
    const groups = new Map<string, ProductDocument[]>();
    for (const document of filtered) {
      const key = docGroupKey(document);
      groups.set(key, [...(groups.get(key) ?? []), document]);
    }
    return Array.from(groups.entries()).map(([key, versions]) => groupFromVersions(key, versions));
  }

  async setEffectiveDocument(id: string, _payload: SetEffectiveDocumentPayload): Promise<SetEffectiveDocumentResult | undefined> {
    assertDatabaseWriteAllowed();
    const current = await this.findDocumentById(id);
    if (!current) return undefined;
    await this.expireOtherEffectiveDocuments(current.id, docGroupKey(current));
    await this.prisma.client.productDocument.update({
      where: { id: current.id },
      data: {
        status: 'EFFECTIVE',
        effectiveDate: new Date(),
        archived: false,
        archivedAt: null,
      },
    });
    const document = await this.findDocumentById(current.id);
    if (!document) return undefined;
    const versions = await this.findDocumentVersions(document.id);
    const planId = document.planId ?? (await this.planIdForProduct(productIdFromDocument(document)));
    const planRow = planId
      ? await this.prisma.client.productionPlan.findFirst({
          where: { id: planId, deletedAt: null },
          include: PLAN_INCLUDE,
        })
      : undefined;
    const plan = planRow ? mapPrismaPlan(planRow) : undefined;
    if (!versions) return undefined;
    return {
      document,
      versions,
      readiness: plan ? evaluatePlanReadiness(plan) : undefined,
    };
  }

  async compareDocuments(documentIds: string[]): Promise<DocumentCompareResult> {
    const documents = (await Promise.all(documentIds.map((id) => this.findDocumentById(id))))
      .filter((document): document is ProductDocument => Boolean(document));
    const fields: Array<[keyof ProductDocument, string]> = [
      ['title', '资料标题'],
      ['documentType', '资料类型'],
      ['version', '版本号'],
      ['documentStatus', '状态'],
      ['source', '来源'],
      ['requiredForProcess', '适用工序'],
      ['effectiveDate', '生效日期'],
      ['updatedAt', '更新时间'],
      ['keywords', '关键词'],
      ['remark', '备注'],
    ];

    return {
      documents,
      fields: fields.map(([field, label]): DocumentCompareField => {
        const values = documents.map((document) => document[field] as string | number | string[] | undefined);
        return {
          field,
          label,
          values,
          different: new Set(values.map(compareValue)).size > 1,
        };
      }),
    };
  }

  private async expireOtherEffectiveDocuments(documentId: string, versionGroupKey: string) {
    await this.prisma.client.productDocument.updateMany({
      where: {
        id: { not: documentId },
        versionGroupKey,
        status: 'EFFECTIVE',
        archived: false,
        deletedAt: null,
      },
      data: {
        status: 'EXPIRED',
      },
    });
  }

  private async planIdForProduct(productId: string) {
    const plan = await this.prisma.client.productionPlan.findFirst({
      where: { productId, deletedAt: null },
      orderBy: { planDate: 'desc' },
      select: { id: true },
    });
    return plan?.id;
  }
}
