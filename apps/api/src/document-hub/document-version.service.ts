import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { documentStatusLabelMap } from '../common/enums/production.enum';
import type { ProductDocument } from '../common/types/production.types';
import { LocalStorageService } from '../storage/local-storage.service';
import {
  DrawingMetadataStore,
  type DrawingModuleState,
} from './drawing-metadata.store';
import {
  DrawingDocumentOperatorDto,
  UpdateDrawingDocumentMetadataDto,
} from './dto/document-metadata.dto';
import {
  assertLifecycleModuleKey,
  cleanLifecycleText,
  documentId,
  documentToLifecycleItem,
  isDocumentDeleted,
  isFormalLifecycleDocument,
  moduleForDocumentType,
  recalculateLifecycleDetail,
  versionGroupKey,
  type LifecycleDocument,
} from './helpers/document-lifecycle-validator';
import type {
  DrawingModuleKey,
  HubCustomer,
  ProductDrawingDetail,
} from './mock/document-hub.seed';

const placeholderMessage = '\u8be5\u8d44\u6599\u4e3a\u7cfb\u7edf\u5360\u4f4d\u8d44\u6599\uff0c\u6682\u4e0d\u652f\u6301\u7f16\u8f91\u3002';
const effectiveModuleKeys: DrawingModuleKey[] = [
  'original_drawing',
  'sop',
  'accessory_specs',
  'notes',
  'tooling',
];
const documentLocks = new Set<string>();

interface VersionContext {
  documents: ProductDocument[];
  document: LifecycleDocument;
  documentId: string;
  moduleKey: DrawingModuleKey;
  state: DrawingModuleState;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function text(value: unknown, maxLength = 160) {
  return cleanLifecycleText(value, maxLength);
}

function sameDocumentId(left?: string, right?: string) {
  return Boolean(left && right && left === right);
}

function operator(dto: DrawingDocumentOperatorDto | UpdateDrawingDocumentMetadataDto = {}) {
  return {
    operatorId: text(dto.operatorId, 80) || 'local-user',
    operatorName: text(dto.operatorName, 80) || '\u672c\u5730\u64cd\u4f5c\u5458',
  };
}

function normalizeKeywords(value: unknown) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,\uff0c;\uff1b\n]/)
      : [];
  return [...new Set(raw.map((item) => text(item, 60)).filter(Boolean))];
}

function documentMatchesId(document: Pick<ProductDocument, 'documentId' | 'id'>, id: string) {
  return document.documentId === id || document.id === id;
}

function withStatusLabel(document: ProductDocument): ProductDocument {
  return {
    ...document,
    status: documentStatusLabelMap[document.documentStatus],
  };
}

@Injectable()
export class DocumentVersionService {
  constructor(
    private readonly drawingMetadataStore: DrawingMetadataStore,
    private readonly localStorageService: LocalStorageService,
    private readonly auditService: AuditService,
  ) {}

  async updateMetadata(productId: string, moduleKeyInput: string, itemId: string, dto: UpdateDrawingDocumentMetadataDto) {
    const context = this.resolveContext(productId, moduleKeyInput, itemId);
    return this.withDocumentLock(context.documentId, async () => {
      const latest = this.resolveContext(productId, moduleKeyInput, itemId);
      const title = dto.title !== undefined ? text(dto.title, 160) : latest.document.title;
      if (!title) throw new BadRequestException('\u8d44\u6599\u6807\u9898\u4e0d\u80fd\u4e3a\u7a7a\u3002');

      const timestamp = new Date().toISOString();
      const before = clone(latest.document);
      const nextDocument: LifecycleDocument = withStatusLabel({
        ...latest.document,
        title,
        version: dto.version !== undefined ? text(dto.version, 80) : latest.document.version,
        keywords: dto.keywords !== undefined ? normalizeKeywords(dto.keywords) : latest.document.keywords,
        remark: dto.remark !== undefined ? text(dto.remark, 500) || undefined : latest.document.remark,
        description: dto.remark !== undefined ? text(dto.remark, 500) || latest.document.description : latest.document.description,
        mockPreviewText: dto.remark !== undefined ? text(dto.remark, 500) || latest.document.mockPreviewText : latest.document.mockPreviewText,
        updatedAt: timestamp,
      }) as LifecycleDocument;

      const nextDocuments = latest.documents.map((document) => (
        documentMatchesId(document, latest.documentId) ? nextDocument : document
      ));
      this.localStorageService.writeDocumentsSync(nextDocuments);
      this.writeModuleStateAndProducts(this.applyDocumentsToModuleState(
        latest.state,
        productId,
        latest.moduleKey,
        [nextDocument],
      ));

      const { operatorId, operatorName } = operator(dto);
      await this.writeAudit('document_metadata_updated', nextDocument, {
        before: this.safeAuditSummary(before),
        after: this.safeAuditSummary(nextDocument),
        operatorId,
        operatorName,
        message: '\u8d44\u6599\u4fe1\u606f\u5df2\u66f4\u65b0\u3002',
      });

      return {
        documentId: latest.documentId,
        changedDocumentIds: [latest.documentId],
        auditWritten: true,
      };
    });
  }

  async setEffective(productId: string, moduleKeyInput: string, itemId: string, dto: DrawingDocumentOperatorDto = {}) {
    const moduleKey = assertLifecycleModuleKey(moduleKeyInput);
    if (!effectiveModuleKeys.includes(moduleKey)) {
      throw new BadRequestException('\u6210\u54c1\u56fe\u4e0d\u4f7f\u7528\u5355\u4e00\u5f53\u524d\u6709\u6548\u7248\u672c\uff0c\u8bf7\u4f7f\u7528\u9996\u9875\u5c01\u9762\u3002');
    }

    const context = this.resolveContext(productId, moduleKey, itemId);
    return this.withDocumentLock(context.documentId, async () => {
      const latest = this.resolveContext(productId, moduleKey, itemId);
      const groupKey = versionGroupKey(latest.document);
      const timestamp = new Date().toISOString();
      const downgraded: ProductDocument[] = [];
      let changed = latest.document.documentStatus !== 'effective';

      const nextDocuments = latest.documents.map((document) => {
        if (
          !this.documentBelongsToCurrentModule(latest.state, productId, latest.moduleKey, document)
          || versionGroupKey(document) !== groupKey
          || isDocumentDeleted(document)
        ) {
          return document;
        }

        if (documentMatchesId(document, latest.documentId)) {
          return withStatusLabel({
            ...document,
            documentStatus: 'effective',
            effectiveDate: timestamp.slice(0, 10),
            updatedAt: timestamp,
          });
        }

        if (document.documentStatus === 'effective') {
          changed = true;
          const expired = withStatusLabel({
            ...document,
            documentStatus: 'expired',
            updatedAt: timestamp,
          });
          downgraded.push(expired);
          return expired;
        }

        return document;
      });

      const stateWithCover = this.setModuleCover(
        this.applyDocumentsToModuleState(latest.state, productId, latest.moduleKey, nextDocuments.filter((document) => (
          this.documentBelongsToCurrentModule(latest.state, productId, latest.moduleKey, document)
          && versionGroupKey(document) === groupKey
        ))),
        productId,
        latest.moduleKey,
        latest.documentId,
      );
      const coverChanged = this.moduleCoverId(latest.state, productId, latest.moduleKey) !== latest.documentId;
      changed = changed || coverChanged;

      if (changed) {
        this.localStorageService.writeDocumentsSync(nextDocuments);
        this.writeModuleStateAndProducts(stateWithCover);
        const nextDocument = nextDocuments.find((document) => documentMatchesId(document, latest.documentId)) ?? latest.document;
        const { operatorId, operatorName } = operator(dto);
        await this.writeAudit('document_set_effective', nextDocument, {
          before: this.safeAuditSummary(latest.document, { previousStatus: latest.document.documentStatus }),
          after: this.safeAuditSummary(nextDocument, {
            documentStatus: nextDocument.documentStatus,
            effectiveDate: nextDocument.effectiveDate,
            downgradedDocumentIds: downgraded.map((document) => documentId(document)),
            coverDocumentId: latest.documentId,
          }),
          operatorId,
          operatorName,
          message: '\u8d44\u6599\u5df2\u8bbe\u4e3a\u5f53\u524d\u6709\u6548\u7248\u672c\u3002',
        });
      }

      return {
        documentId: latest.documentId,
        changedDocumentIds: [latest.documentId, ...downgraded.map((document) => documentId(document))],
        downgradedDocumentIds: downgraded.map((document) => documentId(document)),
        auditWritten: changed,
        idempotent: !changed || undefined,
      };
    });
  }

  async setCover(productId: string, moduleKeyInput: string, itemId: string, dto: DrawingDocumentOperatorDto = {}) {
    const context = this.resolveContext(productId, moduleKeyInput, itemId);
    if (!this.canPreview(context.document)) {
      throw new BadRequestException('\u8be5\u8d44\u6599\u6682\u65e0\u53ef\u9884\u89c8\u5185\u5bb9\uff0c\u4e0d\u80fd\u8bbe\u4e3a\u9996\u9875\u5c01\u9762\u3002');
    }

    return this.withDocumentLock(context.documentId, async () => {
      const latest = this.resolveContext(productId, moduleKeyInput, itemId);
      const currentCoverId = this.moduleCoverId(latest.state, productId, latest.moduleKey);
      if (currentCoverId === latest.documentId) {
        return {
          documentId: latest.documentId,
          changedDocumentIds: [latest.documentId],
          auditWritten: false,
          idempotent: true,
        };
      }

      const nextState = this.setModuleCover(
        this.applyDocumentsToModuleState(latest.state, productId, latest.moduleKey, [latest.document]),
        productId,
        latest.moduleKey,
        latest.documentId,
      );
      this.writeModuleStateAndProducts(nextState);
      const { operatorId, operatorName } = operator(dto);
      await this.writeAudit('document_cover_updated', latest.document, {
        before: { productId, moduleKey: latest.moduleKey, coverDocumentId: currentCoverId },
        after: { productId, moduleKey: latest.moduleKey, coverDocumentId: latest.documentId },
        operatorId,
        operatorName,
        message: '\u8d44\u6599\u5df2\u8bbe\u4e3a\u6a21\u5757\u9996\u9875\u5c01\u9762\u3002',
      });

      return {
        documentId: latest.documentId,
        changedDocumentIds: [latest.documentId],
        auditWritten: true,
      };
    });
  }

  private resolveContext(productId: string, moduleKeyInput: string, itemId: string): VersionContext {
    const moduleKey = assertLifecycleModuleKey(moduleKeyInput);
    const state = this.drawingMetadataStore.readModuleState();
    const documents = this.localStorageService.readDocumentsSync();
    const document = documents.find((item) => documentMatchesId(item, itemId));

    if (!document) {
      if (this.findModuleItem(state, productId, moduleKey, itemId)) {
        throw new ConflictException(placeholderMessage);
      }
      throw new NotFoundException('\u8d44\u6599\u4e0d\u5b58\u5728\u3002');
    }
    if (!isFormalLifecycleDocument(document)) throw new ConflictException(placeholderMessage);
    if (isDocumentDeleted(document)) throw new BadRequestException('\u8d44\u6599\u5df2\u5728\u56de\u6536\u7ad9\u4e2d\uff0c\u8bf7\u5148\u6062\u590d\u540e\u518d\u7ef4\u62a4\u3002');
    if (document.productId !== productId) throw new BadRequestException('\u8d44\u6599\u4e0e\u5f53\u524d\u4ea7\u54c1\u4e0d\u5339\u914d\u3002');

    const expectedModuleKey = moduleForDocumentType(document.documentType);
    const hasExplicitModuleItem = Boolean(this.findModuleItem(state, productId, moduleKey, itemId));
    if (expectedModuleKey !== moduleKey && !hasExplicitModuleItem) {
      throw new BadRequestException('\u8d44\u6599\u5f52\u5c5e\u4e0e\u5f53\u524d\u6a21\u5757\u4e0d\u5339\u914d\u3002');
    }

    return {
      documents,
      document,
      documentId: documentId(document),
      moduleKey,
      state,
    };
  }

  private findModuleItem(state: DrawingModuleState, productId: string, moduleKey: DrawingModuleKey, itemId: string) {
    const detail = state.details.find((item) => item.product.productId === productId);
    const module = detail?.modules.find((item) => item.moduleKey === moduleKey);
    return module?.items.find((item) => item.itemId === itemId || sameDocumentId(item.documentId, itemId));
  }

  private applyDocumentsToModuleState(
    inputState: DrawingModuleState,
    productId: string,
    moduleKey: DrawingModuleKey,
    documents: ProductDocument[],
  ) {
    const state = clone(inputState);
    const detail = this.ensureDetailInState(state, productId);
    const module = detail.modules.find((item) => item.moduleKey === moduleKey);
    if (!module) return state;

    for (const document of documents) {
      if (!this.documentBelongsToCurrentModule(inputState, productId, moduleKey, document)) continue;
      const docId = documentId(document);
      const nextItem = documentToLifecycleItem(document, {
        itemId: docId,
        isCover: module.coverDocumentId === docId || undefined,
      });
      const index = module.items.findIndex((item) => item.itemId === docId || sameDocumentId(item.documentId, docId));
      if (index >= 0) module.items[index] = { ...module.items[index], ...nextItem };
      else module.items.unshift(nextItem);
    }

    this.replaceDetail(state, recalculateLifecycleDetail(detail));
    return state;
  }

  private setModuleCover(inputState: DrawingModuleState, productId: string, moduleKey: DrawingModuleKey, documentIdValue: string) {
    const state = clone(inputState);
    const detail = this.ensureDetailInState(state, productId);
    const module = detail.modules.find((item) => item.moduleKey === moduleKey);
    if (!module) return state;

    module.coverDocumentId = documentIdValue;
    module.items = module.items.map((item) => ({
      ...item,
      isCover: item.itemId === documentIdValue || sameDocumentId(item.documentId, documentIdValue) || undefined,
    }));
    this.replaceDetail(state, recalculateLifecycleDetail(detail));
    return state;
  }

  private moduleCoverId(state: DrawingModuleState, productId: string, moduleKey: DrawingModuleKey) {
    return state.details
      .find((item) => item.product.productId === productId)
      ?.modules.find((item) => item.moduleKey === moduleKey)
      ?.coverDocumentId;
  }

  private documentBelongsToCurrentModule(
    state: DrawingModuleState,
    productId: string,
    moduleKey: DrawingModuleKey,
    document: ProductDocument,
  ) {
    const id = documentId(document);
    return document.productId === productId && (
      moduleForDocumentType(document.documentType) === moduleKey ||
      Boolean(this.findModuleItem(state, productId, moduleKey, id))
    );
  }

  private ensureDetailInState(state: DrawingModuleState, productId: string) {
    const detail = state.details.find((item) => item.product.productId === productId);
    if (detail) return detail;
    const product = this.drawingMetadataStore.readProducts().find((item) => item.productId === productId);
    if (!product) throw new NotFoundException('\u4ea7\u54c1\u4e0d\u5b58\u5728\u3002');
    const customer = this.drawingMetadataStore.readCustomers().find((item) => item.customerId === product.customerId) ?? {
      customerId: product.customerId,
      customerName: product.customerId,
      customerShortName: product.customerId,
    } satisfies HubCustomer;
    const nextDetail = this.drawingMetadataStore.makeProductDetail(customer, product);
    state.details.unshift(nextDetail);
    return nextDetail;
  }

  private replaceDetail(state: DrawingModuleState, detail: ProductDrawingDetail) {
    state.details = state.details.map((item) => (
      item.product.productId === detail.product.productId ? detail : item
    ));
  }

  private writeModuleStateAndProducts(state: DrawingModuleState) {
    this.drawingMetadataStore.writeModuleState(state);
    const latestDetails = this.drawingMetadataStore.readDetails();
    const byProductId = new Map(latestDetails.map((detail) => [detail.product.productId, detail.product]));
    const products = this.drawingMetadataStore.readProducts().map((product) => byProductId.get(product.productId) ?? product);
    this.drawingMetadataStore.writeProducts(products);
  }

  private canPreview(document: ProductDocument) {
    const previewType = document.previewType ?? (
      document.mimeType === 'application/pdf'
        ? 'pdf'
        : document.mimeType?.startsWith('image/')
          ? 'image'
          : undefined
    );
    return Boolean(document.previewUrl && (previewType === 'pdf' || previewType === 'image'));
  }

  private async withDocumentLock<T>(docId: string, work: () => Promise<T>) {
    if (documentLocks.has(docId)) {
      throw new ConflictException('\u8be5\u8d44\u6599\u6b63\u5728\u5904\u7406\u4e2d\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002');
    }
    documentLocks.add(docId);
    try {
      return await work();
    } finally {
      documentLocks.delete(docId);
    }
  }

  private async writeAudit(action: string, document: ProductDocument, input: {
    before?: unknown;
    after?: unknown;
    operatorId: string;
    operatorName: string;
    message: string;
  }) {
    await this.auditService.tryCreate({
      entityType: 'document',
      entityId: documentId(document),
      action: action as any,
      before: input.before,
      after: input.after,
      operatorId: input.operatorId,
      operatorName: input.operatorName,
      operatorRole: 'local',
      message: input.message,
      productId: document.productId,
    });
  }

  private safeAuditSummary(document: ProductDocument, extra: Record<string, unknown> = {}) {
    return {
      documentId: documentId(document),
      productId: document.productId,
      documentType: document.documentType,
      title: document.title,
      version: document.version,
      documentStatus: document.documentStatus,
      effectiveDate: document.effectiveDate,
      originalFileName: document.originalFileName,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      source: document.source,
      keywords: document.keywords,
      remark: document.remark,
      ...extra,
    };
  }
}
