import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { documentStatusLabelMap, legacyDocumentTypeMap } from '../../common/enums/production.enum';
import { evaluatePlanReadiness } from '../../common/utils/readiness';
import { mockStore } from '../../mock/production.mock';
import { LocalStorageService } from '../../storage/local-storage.service';
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

function labelForDocument(documentType: ProductDocument['documentType']) {
  switch (documentType) {
    case 'drawing_pdf':
      return 'PDF 图纸';
    case 'sop_image':
      return 'SOP 扫描图片';
    case 'connector_manual':
      return '连接器装配说明书';
    case 'pinout_diagram':
      return '插接孔位图';
    case 'finished_detail_image':
      return '成品细节图';
    case 'process_card':
      return '作业流程卡';
  }
}

function versionGroupKey(document: Pick<ProductDocument, 'productId' | 'documentType' | 'requiredForProcess'>) {
  return `${document.productId}::${document.documentType}::${document.requiredForProcess}`;
}

function documentId(document: ProductDocument) {
  return document.documentId || document.id;
}

function compareValue(value: unknown) {
  return Array.isArray(value) ? value.join('|') : String(value ?? '');
}

@Injectable()
export class MockDocumentRepository implements DocumentRepositoryInterface {
  constructor(private readonly localStorageService: LocalStorageService) {}

  findDocuments(query: DocumentQuery = {}): ProductDocument[] {
    return this.allDocuments()
      .filter((doc) => !query.planId || doc.planId === query.planId || this.planProductMatches(query.planId, doc.productId))
      .filter((doc) => !query.productId || doc.productId === query.productId)
      .filter((doc) => !query.documentType || doc.documentType === query.documentType)
      .filter((doc) => !query.status || doc.documentStatus === query.status);
  }

  findDocumentById(id: string) {
    return this.allDocuments().find((doc) => doc.documentId === id || doc.id === id);
  }

  findDocumentsByProduct(productId: string): ProductDocument[] {
    return this.findDocuments({ productId });
  }

  findDocumentsByPlan(planId: string): ProductDocument[] {
    const plan = mockStore.findPlanById(planId);
    if (!plan) return [];
    return this.allDocuments().filter((doc) => doc.planId === planId || doc.productId === plan.productId);
  }

  findRequiredDocuments(planId: string): ProductDocument[] {
    const plan = mockStore.findPlanById(planId);
    if (!plan) return [];
    return this.findDocumentsByPlan(planId).filter((doc) => doc.requiredForProcess === 'common'
      || (plan.segment !== '后段' && doc.requiredForProcess === 'front')
      || (plan.segment !== '前段' && doc.requiredForProcess === 'back'));
  }

  createDocument(payload: CreateUploadedDocumentPayload): ProductDocument {
    const now = new Date().toISOString();
    const documentIdValue = payload.documentId ?? `UPDOC-${Date.now()}-${randomUUID()}`;
    const document: ProductDocument = {
      id: documentIdValue,
      documentId: documentIdValue,
      productId: payload.productId,
      planId: payload.planId,
      type: legacyDocumentTypeMap[payload.documentType],
      documentType: payload.documentType,
      title: payload.title,
      version: payload.version,
      status: documentStatusLabelMap[payload.status],
      documentStatus: payload.status,
      effectiveDate: now.slice(0, 10),
      updatedAt: now,
      createdAt: now,
      source: 'manual_upload',
      requiredForProcess: payload.requiredForProcess,
      previewType: payload.previewType,
      mockPreviewText: payload.remark || `本地上传 ${payload.title}`,
      keywords: payload.keywords,
      description: payload.remark || `本地上传 ${payload.title}`,
      localMockLabel: labelForDocument(payload.documentType),
      originalFileName: payload.originalFileName,
      storedFileName: payload.storedFileName,
      storageProvider: payload.storageProvider ?? 'local',
      storageKey: payload.storageKey ?? payload.storedFileName,
      checksumSha256: payload.checksumSha256,
      previewMode: payload.previewMode ?? 'proxy',
      mimeType: payload.mimeType,
      fileSize: payload.fileSize,
      previewUrl: payload.previewUrl,
      downloadUrl: payload.downloadUrl,
      archived: false,
      remark: payload.remark,
      versionGroupKey: versionGroupKey({
        productId: payload.productId,
        documentType: payload.documentType,
        requiredForProcess: payload.requiredForProcess,
      }),
    };

    this.persistDocument(document);
    if (document.documentStatus === 'effective') {
      this.expireOtherEffectiveDocuments(document);
    }
    return document;
  }

  updateDocumentStatus(id: string, payload: UpdateDocumentStatusPayload) {
    const document = this.findDocumentById(id);
    if (!document) return undefined;
    document.documentStatus = payload.status;
    document.status = documentStatusLabelMap[payload.status];
    document.updatedAt = new Date().toISOString();
    document.remark = payload.reason ?? document.remark;
    if (payload.status === 'effective') {
      document.effectiveDate = document.updatedAt.slice(0, 10);
      this.expireOtherEffectiveDocuments(document);
    }
    this.persistDocument(document);
    return document;
  }

  updateDocumentVersion(id: string, payload: UpdateDocumentVersionPayload) {
    const document = this.findDocumentById(id);
    if (!document) return undefined;
    document.version = payload.version;
    if (payload.status) {
      document.documentStatus = payload.status;
      document.status = documentStatusLabelMap[payload.status];
    }
    document.updatedAt = new Date().toISOString();
    if (document.documentStatus === 'effective') {
      document.effectiveDate = document.updatedAt.slice(0, 10);
      this.expireOtherEffectiveDocuments(document);
    }
    this.persistDocument(document);
    return document;
  }

  archiveDocument(id: string) {
    const document = this.findDocumentById(id);
    if (!document) return undefined;
    document.archived = true;
    document.archivedAt = new Date().toISOString();
    document.documentStatus = 'expired';
    document.status = documentStatusLabelMap.expired;
    document.updatedAt = document.archivedAt;
    this.persistDocument(document);
    return document;
  }

  findDocumentVersions(id: string): DocumentVersionsResponse | undefined {
    const currentDocument = this.findDocumentById(id);
    if (!currentDocument) return undefined;
    const group = this.groupForDocument(currentDocument);
    return {
      ...group,
      currentDocument,
    };
  }

  findProductDocumentVersions(query: DocumentVersionQuery): DocumentVersionGroup[] {
    const documents = this.allDocuments()
      .filter((doc) => doc.productId === query.productId)
      .filter((doc) => !query.documentType || doc.documentType === query.documentType)
      .filter((doc) => !query.requiredForProcess || doc.requiredForProcess === query.requiredForProcess);

    const groups = new Map<string, ProductDocument[]>();
    for (const document of documents) {
      const key = document.versionGroupKey ?? versionGroupKey(document);
      groups.set(key, [...(groups.get(key) ?? []), document]);
    }

    return Array.from(groups.entries()).map(([key, versions]) => this.groupFromVersions(key, versions));
  }

  setEffectiveDocument(id: string, _payload: SetEffectiveDocumentPayload): SetEffectiveDocumentResult | undefined {
    const document = this.findDocumentById(id);
    if (!document) return undefined;

    const beforePlanId = document.planId;
    document.documentStatus = 'effective';
    document.status = documentStatusLabelMap.effective;
    document.effectiveDate = new Date().toISOString().slice(0, 10);
    document.updatedAt = new Date().toISOString();
    this.expireOtherEffectiveDocuments(document);
    this.persistDocument(document);

    const versions = this.findDocumentVersions(documentId(document));
    const planId = beforePlanId ?? this.planIdForProduct(document.productId);
    const plan = planId ? mockStore.findPlanById(planId) : undefined;
    const mergedPlan = plan
      ? {
          ...plan,
          documents: this.findDocumentsByPlan(plan.id),
        }
      : undefined;

    return {
      document,
      versions: versions ?? {
        ...this.groupForDocument(document),
        currentDocument: document,
      },
      readiness: mergedPlan ? evaluatePlanReadiness(mergedPlan) : undefined,
    };
  }

  compareDocuments(documentIds: string[]): DocumentCompareResult {
    const uniqueIds = Array.from(new Set(documentIds)).slice(0, 6);
    const documents = uniqueIds
      .map((id) => this.findDocumentById(id))
      .filter((doc): doc is ProductDocument => Boolean(doc));

    const fields: Array<[keyof ProductDocument, string]> = [
      ['title', '标题'],
      ['documentType', '资料类型'],
      ['version', '版本'],
      ['documentStatus', '状态'],
      ['source', '来源'],
      ['requiredForProcess', '适用工序'],
      ['originalFileName', '原始文件名'],
      ['fileSize', '文件大小'],
      ['effectiveDate', '生效日期'],
      ['updatedAt', '更新时间'],
      ['keywords', '关键词'],
      ['remark', '备注'],
    ];

    return {
      documents,
      fields: fields.map(([field, label]) => {
        const values = documents.map((document) => document[field] as string | number | string[] | undefined);
        const different = new Set(values.map(compareValue)).size > 1;
        return { field, label, values, different } satisfies DocumentCompareField;
      }),
    };
  }

  private allDocuments() {
    const seedDocuments = mockStore.productionPlans.flatMap((plan) => plan.documents);
    const uploadedDocuments = this.localStorageService.readDocumentsSync();
    const byId = new Map<string, ProductDocument>();
    for (const doc of seedDocuments) byId.set(documentId(doc), this.ensureDocumentMeta(doc));
    for (const doc of uploadedDocuments) byId.set(documentId(doc), this.ensureDocumentMeta(doc));
    return Array.from(byId.values());
  }

  private ensureDocumentMeta(document: ProductDocument) {
    document.versionGroupKey = document.versionGroupKey ?? versionGroupKey(document);
    document.archived = document.archived ?? false;
    return document;
  }

  private groupForDocument(document: ProductDocument) {
    const key = document.versionGroupKey ?? versionGroupKey(document);
    const versions = this.allDocuments().filter((item) => (item.versionGroupKey ?? versionGroupKey(item)) === key);
    return this.groupFromVersions(key, versions);
  }

  private groupFromVersions(versionKey: string, versions: ProductDocument[]): DocumentVersionGroup {
    const sortedVersions = [...versions].sort((a, b) => {
      const statusRank = (a.documentStatus === 'effective' ? 0 : a.documentStatus === 'pending_review' ? 1 : 2)
        - (b.documentStatus === 'effective' ? 0 : b.documentStatus === 'pending_review' ? 1 : 2);
      if (statusRank !== 0) return statusRank;
      return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
    });
    const currentDocument = sortedVersions.find((doc) => doc.documentStatus === 'effective');
    const firstDocument = sortedVersions[0];
    return {
      versionGroupKey: versionKey,
      productId: firstDocument.productId,
      documentType: firstDocument.documentType,
      requiredForProcess: firstDocument.requiredForProcess,
      currentDocument,
      versions: sortedVersions,
      effectiveDocumentId: currentDocument ? documentId(currentDocument) : undefined,
      versionCount: sortedVersions.length,
      hasExpired: sortedVersions.some((doc) => doc.documentStatus === 'expired'),
      hasPendingReview: sortedVersions.some((doc) => doc.documentStatus === 'pending_review'),
      hasInconsistent: sortedVersions.some((doc) => doc.documentStatus === 'inconsistent'),
    };
  }

  private expireOtherEffectiveDocuments(document: ProductDocument) {
    const key = document.versionGroupKey ?? versionGroupKey(document);
    for (const item of this.allDocuments()) {
      if (documentId(item) === documentId(document)) continue;
      if ((item.versionGroupKey ?? versionGroupKey(item)) !== key) continue;
      if (item.documentStatus !== 'effective') continue;
      item.documentStatus = 'expired';
      item.status = documentStatusLabelMap.expired;
      item.updatedAt = new Date().toISOString();
      this.persistDocument(item);
    }
  }

  private persistDocument(document: ProductDocument) {
    document.versionGroupKey = document.versionGroupKey ?? versionGroupKey(document);
    if (document.source === 'manual_upload') {
      this.localStorageService.upsertDocumentSync(document);
    }
    return document;
  }

  private planProductMatches(planId: string | undefined, productId: string) {
    if (!planId) return false;
    return mockStore.findPlanById(planId)?.productId === productId;
  }

  private planIdForProduct(productId: string) {
    return mockStore.productionPlans.find((plan) => plan.productId === productId)?.id;
  }
}
