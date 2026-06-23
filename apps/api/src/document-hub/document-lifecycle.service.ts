import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type { ProductDocument } from '../common/types/production.types';
import { AuditService } from '../audit/audit.service';
import { DocumentsService } from '../documents/documents.service';
import { LocalStorageService } from '../storage/local-storage.service';
import { StorageService } from '../storage/storage.service';
import { DeleteLockService } from '../unified-documents/helpers/delete-lock.service';
import { DRAWING_REPOSITORY } from '../persistence/persistence.tokens';
import type { DrawingRepository } from '../persistence/persistence.types';
import {
  DrawingModuleState,
  DrawingTrashRecord,
} from './drawing-metadata.store';
import type {
  DrawingItem,
  DrawingModule,
  DrawingModuleKey,
  HubCustomer,
  HubProductModel,
  ProductDrawingDetail,
} from './mock/document-hub.seed';
import {
  assertLifecycleModuleKey,
  assertFormalLifecycleDocument,
  assertSafeLifecycleStorageKey,
  cleanLifecycleText,
  documentId,
  documentToLifecycleItem,
  downgradeRestoredEffectiveIfNeeded,
  isDocumentDeleted,
  isFormalLifecycleDocument,
  lifecycleModuleKeys,
  moduleForDocumentType,
  moduleNameForKey,
  recalculateLifecycleDetail,
  versionGroupKey,
  type LifecycleDocument,
} from './helpers/document-lifecycle-validator';
import { PurgeDocumentDto, RestoreDocumentDto, TrashDocumentDto, TrashQueryDto } from './dto/document-lifecycle.dto';
import { OrderStatusSyncService } from './order-status-sync.service';

const purgeConfirmText = '\u786e\u8ba4\u5f7b\u5e95\u5220\u9664';
const documentLocks = new Set<string>();

interface LifecycleContext {
  document: LifecycleDocument;
  documentId: string;
  product: HubProductModel;
  customer?: HubCustomer;
  detail: ProductDrawingDetail;
  moduleKey: DrawingModuleKey;
  module?: DrawingModule;
  drawingItem?: DrawingItem;
  trashRecord?: DrawingTrashRecord;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function operator(dto: { operatorId?: string; operatorName?: string }) {
  return {
    operatorId: cleanLifecycleText(dto.operatorId, 80) || 'local-user',
    operatorName: cleanLifecycleText(dto.operatorName, 80) || '\u672c\u5730\u64cd\u4f5c\u5458',
  };
}

function sameDocument(left?: string, right?: string) {
  return Boolean(left && right && left === right);
}

@Injectable()
export class DocumentLifecycleService {
  private readonly logger = new Logger(DocumentLifecycleService.name);

  constructor(
    @Inject(DRAWING_REPOSITORY) private readonly drawingRepository: DrawingRepository,
    private readonly documentsService: DocumentsService,
    private readonly localStorageService: LocalStorageService,
    private readonly storageService: StorageService,
    private readonly deleteLockService: DeleteLockService,
    private readonly auditService: AuditService,
    @Optional() private readonly orderStatusSyncService?: OrderStatusSyncService,
  ) {}

  async listTrash(query: TrashQueryDto = {}) {
    const limit = this.clampLimit(query.limit);
    const offset = this.clampOffset(query.offset);
    const keyword = cleanLifecycleText(query.keyword, 120).toLowerCase();
    const customers = new Map(this.drawingRepository.readCustomers().map((item) => [item.customerId, item]));
    const products = new Map(this.drawingRepository.readProducts().map((item) => [item.productId, item]));
    const state = this.drawingRepository.readModuleState();
    const trashByDocumentId = new Map(
      state.trash
        .filter((record) => !record.purgedAt)
        .map((record) => [record.sourceDocumentId ?? record.item.itemId, record]),
    );

    const deletedDocuments = this.localStorageService.readDocumentsSync()
      .filter((document) => isFormalLifecycleDocument(document) && isDocumentDeleted(document));
    const items = deletedDocuments
      .map((document) => {
        const docId = documentId(document);
        const trashRecord = trashByDocumentId.get(docId);
        const product = products.get(document.productId);
        const customer = product ? customers.get(product.customerId) : undefined;
        const moduleKey = trashRecord?.moduleKey ?? this.moduleKeyForDocument(document, state);
        return this.toSafeTrashListItem(document as LifecycleDocument, {
          product,
          customer,
          moduleKey,
          trashRecord,
        });
      })
      .filter((item) => !query.customerId || item.customerId === query.customerId)
      .filter((item) => !query.productId || item.productId === query.productId)
      .filter((item) => !query.moduleKey || item.moduleKey === query.moduleKey)
      .filter((item) => !keyword || [
        item.title,
        item.originalFileName,
        item.customerName,
        item.productModel,
        item.moduleName,
        item.version,
      ].some((value) => String(value ?? '').toLowerCase().includes(keyword)))
      .sort((left, right) => String(right.deletedAt ?? '').localeCompare(String(left.deletedAt ?? '')));

    return {
      items: items.slice(offset, offset + limit),
      total: items.length,
      limit,
      offset,
    };
  }

  async trash(productId: string, moduleKeyInput: string, itemId: string, dto: TrashDocumentDto) {
    const moduleKey = assertLifecycleModuleKey(moduleKeyInput);
    const documents = this.localStorageService.readDocumentsSync();
    const context = this.resolveContext(productId, moduleKey, itemId, documents);

    if (isDocumentDeleted(context.document)) {
      return this.toTrashResponse(context, {
        deletedAt: context.document.deletedAt ?? context.trashRecord?.deletedAt ?? new Date().toISOString(),
        movedToTrash: true,
        message: '\u8d44\u6599\u5df2\u5728\u56de\u6536\u7ad9\u4e2d\u3002',
        idempotent: true,
      });
    }

    return this.withDocumentLock(context.documentId, async () => {
      const latestDocuments = this.localStorageService.readDocumentsSync();
      const latest = this.resolveContext(productId, moduleKey, itemId, latestDocuments);
      if (isDocumentDeleted(latest.document)) {
        return this.toTrashResponse(latest, {
          deletedAt: latest.document.deletedAt ?? latest.trashRecord?.deletedAt ?? new Date().toISOString(),
          movedToTrash: true,
          message: '\u8d44\u6599\u5df2\u5728\u56de\u6536\u7ad9\u4e2d\u3002',
          idempotent: true,
        });
      }

      await this.deleteLockService.assertVerified(dto.password);

      const timestamp = new Date().toISOString();
      const { operatorId, operatorName } = operator(dto);
      const reason = cleanLifecycleText(dto.reason, 200) || undefined;
      const before = clone(latest.document);
      const deletedDocument: LifecycleDocument = {
        ...latest.document,
        deleted: true,
        deletedAt: timestamp,
        deletedBy: operatorId,
        deleteReason: reason,
        updatedAt: timestamp,
      };
      const nextDocuments = latestDocuments.map((document) => (
        documentId(document) === latest.documentId ? deletedDocument : document
      ));
      this.localStorageService.writeDocumentsSync(nextDocuments);

      const trashItem = {
        ...(latest.drawingItem ?? documentToLifecycleItem(deletedDocument)),
        deletedAt: timestamp,
        deletedBy: operatorId,
      };
      const nextState = this.applyTrashToModuleState({
        state: this.drawingRepository.readModuleState(),
        productId,
        moduleKey,
        documentId: latest.documentId,
        item: trashItem,
        deletedAt: timestamp,
        deletedBy: operatorId,
        reason,
      });
      this.writeModuleStateAndProducts(nextState);

      const activeDocuments = nextDocuments.filter((document) => documentId(document) !== latest.documentId);
      const warning = this.effectiveRemovalWarning(deletedDocument, activeDocuments);
      await this.writeAudit('document_trashed', deletedDocument, {
        before,
        after: this.safeAuditSummary(deletedDocument, { moduleKey, reason, deletedAt: timestamp, operatorId, operatorName }),
        reason,
        operatorId,
        operatorName,
        message: reason ?? '\u8d44\u6599\u5df2\u79fb\u5165\u56de\u6536\u7ad9\u3002',
      });

      const response = this.toTrashResponse(this.resolveContext(productId, moduleKey, latest.documentId, nextDocuments), {
        deletedAt: timestamp,
        movedToTrash: true,
        message: '\u8d44\u6599\u5df2\u79fb\u5165\u56de\u6536\u7ad9\u3002',
        warning,
      });
      return this.withOrderSyncWarning(response, productId, moduleKey, '原图删除后同步订单状态。');
    });
  }

  async restore(productId: string, moduleKeyInput: string, itemId: string, dto: RestoreDocumentDto) {
    const moduleKey = assertLifecycleModuleKey(moduleKeyInput);
    const documents = this.localStorageService.readDocumentsSync();
    const context = this.resolveContext(productId, moduleKey, itemId, documents);

    if (!isDocumentDeleted(context.document)) {
      return this.toRestoreResponse(context, {
        restoredAt: context.document.restoredAt ?? context.document.updatedAt,
        message: '\u8d44\u6599\u5df2\u6062\u590d\u3002',
        idempotent: true,
      });
    }

    return this.withDocumentLock(context.documentId, async () => {
      const latestDocuments = this.localStorageService.readDocumentsSync();
      const latest = this.resolveContext(productId, moduleKey, itemId, latestDocuments);
      if (!isDocumentDeleted(latest.document)) {
        return this.toRestoreResponse(latest, {
          restoredAt: latest.document.restoredAt ?? latest.document.updatedAt,
          message: '\u8d44\u6599\u5df2\u6062\u590d\u3002',
          idempotent: true,
        });
      }

      const exists = await this.storageService.documentObjectExists(latest.document);
      if (!exists) {
        throw new ConflictException('\u6587\u4ef6\u5df2\u4e0d\u5b58\u5728\uff0c\u65e0\u6cd5\u6062\u590d\u8be5\u8d44\u6599\u3002');
      }

      const timestamp = new Date().toISOString();
      const { operatorId, operatorName } = operator(dto);
      const remark = cleanLifecycleText(dto.remark, 200) || undefined;
      const before = clone(latest.document);
      const restoredBase: LifecycleDocument = {
        ...latest.document,
        deleted: false,
        deletedAt: null,
        deletedBy: null,
        deleteReason: null,
        restoredAt: timestamp,
        restoredBy: operatorId,
        restoreRemark: remark,
        updatedAt: timestamp,
      };
      const downgrade = downgradeRestoredEffectiveIfNeeded(restoredBase, latestDocuments);
      const restoredDocument = downgrade.document;
      const nextDocuments = latestDocuments.map((document) => (
        documentId(document) === latest.documentId ? restoredDocument : document
      ));
      this.localStorageService.writeDocumentsSync(nextDocuments);

      const nextState = this.applyRestoreToModuleState({
        state: this.drawingRepository.readModuleState(),
        productId,
        moduleKey,
        document: restoredDocument,
        documentId: latest.documentId,
        restoredAt: timestamp,
        restoredBy: operatorId,
      });
      this.writeModuleStateAndProducts(nextState);

      await this.writeAudit('document_restored', restoredDocument, {
        before,
        after: this.safeAuditSummary(restoredDocument, { moduleKey, remark, restoredAt: timestamp, operatorId, operatorName }),
        reason: remark,
        operatorId,
        operatorName,
        message: remark ?? '\u8d44\u6599\u5df2\u6062\u590d\u3002',
      });

      const response = this.toRestoreResponse(this.resolveContext(productId, moduleKey, latest.documentId, nextDocuments), {
        restoredAt: timestamp,
        message: '\u8d44\u6599\u5df2\u6062\u590d\u3002',
        warning: downgrade.warning,
      });
      return this.withOrderSyncWarning(response, productId, moduleKey, '原图恢复后同步订单状态。');
    });
  }

  async purge(productId: string, moduleKeyInput: string, itemId: string, dto: PurgeDocumentDto) {
    const moduleKey = assertLifecycleModuleKey(moduleKeyInput);
    if (cleanLifecycleText(dto.confirmText, 40) !== purgeConfirmText) {
      throw new BadRequestException('\u8bf7\u8f93\u5165\u786e\u8ba4\u6587\u5b57\uff1a\u786e\u8ba4\u5f7b\u5e95\u5220\u9664');
    }

    const documents = this.localStorageService.readDocumentsSync();
    const context = this.resolveContext(productId, moduleKey, itemId, documents);
    if (!isDocumentDeleted(context.document)) {
      throw new ConflictException('\u8bf7\u5148\u5c06\u8d44\u6599\u79fb\u5165\u56de\u6536\u7ad9\u3002');
    }

    return this.withDocumentLock(context.documentId, async () => {
      const latestDocuments = this.localStorageService.readDocumentsSync();
      const latest = this.resolveContext(productId, moduleKey, itemId, latestDocuments);
      if (!isDocumentDeleted(latest.document)) {
        throw new ConflictException('\u8bf7\u5148\u5c06\u8d44\u6599\u79fb\u5165\u56de\u6536\u7ad9\u3002');
      }

      await this.deleteLockService.assertVerified(dto.password);

      const timestamp = new Date().toISOString();
      const { operatorId, operatorName } = operator(dto);
      const reason = cleanLifecycleText(dto.reason, 200) || undefined;
      const storageKey = assertSafeLifecycleStorageKey(latest.document.storageKey ?? latest.document.storedFileName);
      let fileDeleted = false;
      let fileMissing = false;

      if (storageKey) {
        const deleteResult = await this.storageService.deleteObject(storageKey);
        fileDeleted = deleteResult.deleted === true;
        fileMissing = !deleteResult.deleted && deleteResult.reason === 'file_not_found';
        if (!fileDeleted && !fileMissing) {
          await this.writeAudit('document_purge_failed', latest.document, {
            after: this.safeAuditSummary(latest.document, { moduleKey, reason, purgedAt: timestamp, fileDeleted, fileMissing, operatorId, operatorName }),
            reason,
            operatorId,
            operatorName,
            message: '\u6587\u4ef6\u5220\u9664\u5931\u8d25\uff0cmetadata \u672a\u79fb\u9664\u3002',
          });
          throw new InternalServerErrorException('\u6587\u4ef6\u5220\u9664\u5931\u8d25\uff0cmetadata \u672a\u79fb\u9664\u3002');
        }
      } else {
        fileMissing = true;
      }

      try {
        const nextDocuments = latestDocuments.filter((document) => documentId(document) !== latest.documentId);
        const nextState = this.applyPurgeToModuleState({
          state: this.drawingRepository.readModuleState(),
          productId,
          moduleKey,
          documentId: latest.documentId,
          purgedAt: timestamp,
        });
        this.localStorageService.writeDocumentsSync(nextDocuments);
        this.writeModuleStateAndProducts(nextState);
      } catch (error) {
        await this.writeAudit('document_purge_failed', latest.document, {
          after: this.safeAuditSummary(latest.document, { moduleKey, reason, purgedAt: timestamp, fileDeleted, fileMissing, operatorId, operatorName }),
          reason,
          operatorId,
          operatorName,
          message: '\u6587\u4ef6\u5df2\u5220\u9664\u4f46 metadata \u66f4\u65b0\u5931\u8d25\uff0c\u9700\u8981\u4eba\u5de5\u68c0\u67e5\u3002',
        });
        throw new InternalServerErrorException(error instanceof Error ? error.message : '\u5f7b\u5e95\u5220\u9664\u672a\u5b8c\u5168\u6210\u529f\u3002');
      }

      await this.writeAudit('document_purged', latest.document, {
        before: this.safeAuditSummary(latest.document, { moduleKey }),
        after: this.safeAuditSummary(latest.document, { moduleKey, reason, purgedAt: timestamp, fileDeleted, fileMissing, operatorId, operatorName }),
        reason,
        operatorId,
        operatorName,
        message: fileMissing
          ? '\u6587\u4ef6\u672c\u4f53\u5df2\u4e0d\u5b58\u5728\uff0c\u8d44\u6599\u8bb0\u5f55\u5df2\u6e05\u7406\u3002'
          : '\u8d44\u6599\u5df2\u5f7b\u5e95\u5220\u9664\u3002',
      });

      const response = {
        documentId: latest.documentId,
        productId,
        moduleKey,
        purged: true,
        purgedAt: timestamp,
        fileDeleted,
        fileMissing,
        metadataDeleted: true,
        message: fileMissing
          ? '\u6587\u4ef6\u672c\u4f53\u5df2\u4e0d\u5b58\u5728\uff0c\u8d44\u6599\u8bb0\u5f55\u5df2\u6e05\u7406\u3002'
          : '\u8d44\u6599\u5df2\u5f7b\u5e95\u5220\u9664\u3002',
      };
      return this.withOrderSyncWarning(response, productId, moduleKey, '原图彻底删除后同步订单状态。');
    });
  }

  private async withOrderSyncWarning<T extends object>(
    response: T,
    productId: string,
    moduleKey: DrawingModuleKey,
    reason: string,
  ): Promise<T> {
    if (moduleKey !== 'original_drawing' || !this.orderStatusSyncService) return response;
    try {
      await this.orderStatusSyncService.syncOrdersForProduct(productId, {
        operatorId: 'system',
        operatorName: '系统同步',
        reason,
      });
      return response;
    } catch (error) {
      const message = `订单状态同步失败：${productId}`;
      this.logger.warn(error instanceof Error ? `${message} ${error.message}` : message);
      return {
        ...response,
        warning: [(response as { warning?: string }).warning, message].filter(Boolean).join('；'),
      } as T;
    }
  }

  private resolveContext(
    productId: string,
    moduleKey: DrawingModuleKey,
    itemId: string,
    documents: ProductDocument[],
  ): LifecycleContext {
    const state = this.drawingRepository.readModuleState();
    const details = state.details;
    const detail = details.find((item) => item.product.productId === productId);
    const product = this.drawingRepository.readProducts().find((item) => item.productId === productId) ?? detail?.product;
    if (!product) throw new NotFoundException('\u4ea7\u54c1\u4e0d\u5b58\u5728\u3002');

    const customer = this.drawingRepository.readCustomers().find((item) => item.customerId === product.customerId) ?? detail?.customer;
    const workingDetail = detail ? clone(detail) : this.drawingRepository.makeProductDetail(customer ?? {
      customerId: product.customerId,
      customerName: product.customerId,
      customerShortName: product.customerId,
    }, product);
    const locatedItem = this.findDrawingItem(workingDetail, moduleKey, itemId);
    const locatedDocument = documents.find((document) => {
      const docId = documentId(document);
      if (document.productId !== productId) return false;
      if (docId !== itemId && docId !== locatedItem?.item?.itemId) return false;
      return moduleForDocumentType(document.documentType) === moduleKey || locatedItem?.moduleKey === moduleKey;
    });

    if (!locatedDocument) {
      if (locatedItem?.item) {
        assertFormalLifecycleDocument(undefined);
      }
      throw new NotFoundException('\u8d44\u6599\u4e0d\u5b58\u5728\u3002');
    }
    assertFormalLifecycleDocument(locatedDocument);

    const actualModuleKey = locatedItem?.moduleKey ?? moduleForDocumentType(locatedDocument.documentType);
    if (actualModuleKey !== moduleKey && moduleForDocumentType(locatedDocument.documentType) !== moduleKey) {
      throw new BadRequestException('\u8d44\u6599\u6a21\u5757\u4e0d\u5339\u914d\uff0c\u5df2\u62d2\u7edd\u64cd\u4f5c\u3002');
    }
    const module = workingDetail.modules.find((item) => item.moduleKey === moduleKey);
    const docId = documentId(locatedDocument);
    const trashRecord = state.trash.find((record) => (
      !record.purgedAt
      && record.productId === productId
      && record.moduleKey === moduleKey
      && (sameDocument(record.sourceDocumentId, docId) || sameDocument(record.item.itemId, docId))
    ));

    return {
      document: locatedDocument as LifecycleDocument,
      documentId: docId,
      product,
      customer,
      detail: workingDetail,
      moduleKey,
      module,
      drawingItem: locatedItem?.item ?? trashRecord?.item,
      trashRecord,
    };
  }

  private findDrawingItem(detail: ProductDrawingDetail, moduleKey: DrawingModuleKey, itemId: string) {
    for (const module of detail.modules) {
      const item = module.items.find((entry) => entry.itemId === itemId);
      if (item) {
        return {
          moduleKey: module.moduleKey,
          item,
        };
      }
    }
    const trashRecord = this.drawingRepository.readTrash().find((record) => (
      record.productId === detail.product.productId
      && record.moduleKey === moduleKey
      && (record.item.itemId === itemId || record.sourceDocumentId === itemId)
    ));
    return trashRecord ? { moduleKey: trashRecord.moduleKey, item: trashRecord.item } : undefined;
  }

  private applyTrashToModuleState(input: {
    state: DrawingModuleState;
    productId: string;
    moduleKey: DrawingModuleKey;
    documentId: string;
    item: DrawingItem;
    deletedAt: string;
    deletedBy: string;
    reason?: string;
  }) {
    const state = clone(input.state);
    const detail = this.ensureDetailInState(state, input.productId);
    const module = detail.modules.find((item) => item.moduleKey === input.moduleKey);
    if (module) {
      module.items = module.items.filter((item) => item.itemId !== input.documentId && item.itemId !== input.item.itemId);
    }
    const trashExists = state.trash.some((record) => (
      !record.purgedAt
      && record.productId === input.productId
      && record.moduleKey === input.moduleKey
      && (record.sourceDocumentId === input.documentId || record.item.itemId === input.documentId)
    ));
    if (!trashExists) {
      state.trash.unshift({
        trashId: `trash-${input.documentId}-${Date.now()}`,
        productId: input.productId,
        moduleKey: input.moduleKey,
        item: input.item,
        deletedAt: input.deletedAt,
        deletedBy: input.deletedBy,
        reason: input.reason,
        sourceDocumentId: input.documentId,
      });
    }
    this.replaceDetail(state, recalculateLifecycleDetail(detail));
    return state;
  }

  private applyRestoreToModuleState(input: {
    state: DrawingModuleState;
    productId: string;
    moduleKey: DrawingModuleKey;
    document: LifecycleDocument;
    documentId: string;
    restoredAt: string;
    restoredBy: string;
  }) {
    const state = clone(input.state);
    const detail = this.ensureDetailInState(state, input.productId);
    const module = detail.modules.find((item) => item.moduleKey === input.moduleKey);
    if (module && !module.items.some((item) => item.itemId === input.documentId)) {
      const trashItem = state.trash.find((record) => (
        record.productId === input.productId
        && record.moduleKey === input.moduleKey
        && (record.sourceDocumentId === input.documentId || record.item.itemId === input.documentId)
      ))?.item;
      module.items.unshift({
        ...(trashItem ?? documentToLifecycleItem(input.document)),
        itemId: input.documentId,
        deletedAt: undefined,
        deletedBy: undefined,
        restoredAt: input.restoredAt,
        restoredBy: input.restoredBy,
        documentStatus: input.document.documentStatus === 'effective'
          ? 'effective'
          : input.document.documentStatus === 'expired'
            ? 'expired'
            : 'pending',
      });
    }
    state.trash = state.trash.filter((record) => !(
      record.productId === input.productId
      && record.moduleKey === input.moduleKey
      && (record.sourceDocumentId === input.documentId || record.item.itemId === input.documentId)
    ));
    this.replaceDetail(state, recalculateLifecycleDetail(detail));
    return state;
  }

  private applyPurgeToModuleState(input: {
    state: DrawingModuleState;
    productId: string;
    moduleKey: DrawingModuleKey;
    documentId: string;
    purgedAt: string;
  }) {
    const state = clone(input.state);
    const detail = this.ensureDetailInState(state, input.productId);
    const module = detail.modules.find((item) => item.moduleKey === input.moduleKey);
    if (module) {
      module.items = module.items.filter((item) => item.itemId !== input.documentId);
    }
    state.trash = state.trash.map((record) => (
      record.productId === input.productId
      && record.moduleKey === input.moduleKey
      && (record.sourceDocumentId === input.documentId || record.item.itemId === input.documentId)
        ? { ...record, purgedAt: input.purgedAt }
        : record
    ));
    this.replaceDetail(state, recalculateLifecycleDetail(detail));
    return state;
  }

  private ensureDetailInState(state: DrawingModuleState, productId: string) {
    const detail = state.details.find((item) => item.product.productId === productId);
    if (detail) return detail;
    const product = this.drawingRepository.readProducts().find((item) => item.productId === productId);
    if (!product) throw new NotFoundException('\u4ea7\u54c1\u4e0d\u5b58\u5728\u3002');
    const customer = this.drawingRepository.readCustomers().find((item) => item.customerId === product.customerId) ?? {
      customerId: product.customerId,
      customerName: product.customerId,
      customerShortName: product.customerId,
    };
    const nextDetail = this.drawingRepository.makeProductDetail(customer, product);
    state.details.unshift(nextDetail);
    return nextDetail;
  }

  private replaceDetail(state: DrawingModuleState, detail: ProductDrawingDetail) {
    state.details = state.details.map((item) => (
      item.product.productId === detail.product.productId ? detail : item
    ));
  }

  private writeModuleStateAndProducts(state: DrawingModuleState) {
    this.drawingRepository.writeModuleState(state);
    const latestDetails = this.drawingRepository.readDetails();
    const byProductId = new Map(latestDetails.map((detail) => [detail.product.productId, detail.product]));
    const products = this.drawingRepository.readProducts().map((product) => byProductId.get(product.productId) ?? product);
    this.drawingRepository.writeProducts(products);
  }

  private moduleKeyForDocument(document: ProductDocument, state: DrawingModuleState) {
    const docId = documentId(document);
    const trashRecord = state.trash.find((record) => (
      record.sourceDocumentId === docId || record.item.itemId === docId
    ));
    if (trashRecord) return trashRecord.moduleKey;
    for (const detail of state.details) {
      if (detail.product.productId !== document.productId) continue;
      const module = detail.modules.find((item) => item.items.some((entry) => entry.itemId === docId));
      if (module) return module.moduleKey;
    }
    return moduleForDocumentType(document.documentType);
  }

  private effectiveRemovalWarning(document: ProductDocument, activeDocuments: ProductDocument[]) {
    if (document.documentStatus !== 'effective') return undefined;
    const key = versionGroupKey(document);
    const hasOtherEffective = activeDocuments.some((item) => (
      !isDocumentDeleted(item)
      && versionGroupKey(item) === key
      && item.documentStatus === 'effective'
    ));
    const hasOtherVersion = activeDocuments.some((item) => !isDocumentDeleted(item) && versionGroupKey(item) === key);
    if (hasOtherEffective || !hasOtherVersion) return undefined;
    return '\u5f53\u524d\u6709\u6548\u7248\u672c\u5df2\u79fb\u5165\u56de\u6536\u7ad9\uff0c\u8bf7\u786e\u8ba4\u65b0\u7684\u6709\u6548\u7248\u672c\u3002';
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
    reason?: string;
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
      title: document.title,
      version: document.version,
      productId: document.productId,
      documentType: document.documentType,
      originalFileName: document.originalFileName,
      fileSize: document.fileSize,
      source: document.source,
      ...extra,
    };
  }

  private toSafeTrashListItem(document: LifecycleDocument, input: {
    product?: HubProductModel;
    customer?: HubCustomer;
    moduleKey: DrawingModuleKey;
    trashRecord?: DrawingTrashRecord;
  }) {
    return {
      documentId: documentId(document),
      title: document.title,
      version: document.version,
      customerId: input.product?.customerId,
      customerName: input.customer?.customerName,
      productId: document.productId,
      productModel: input.product?.productModel,
      moduleKey: input.moduleKey,
      moduleName: moduleNameForKey(input.moduleKey),
      originalFileName: document.originalFileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      source: document.source,
      deletedAt: document.deletedAt ?? input.trashRecord?.deletedAt,
      deletedBy: document.deletedBy ?? input.trashRecord?.deletedBy,
      deleteReason: document.deleteReason ?? input.trashRecord?.reason,
      previewAvailable: Boolean(document.previewUrl && document.previewType),
      canRestore: true,
      canPurge: true,
    };
  }

  private toTrashResponse(context: LifecycleContext, input: {
    deletedAt?: string | null;
    movedToTrash: boolean;
    message: string;
    warning?: string;
    idempotent?: boolean;
  }) {
    return {
      documentId: context.documentId,
      productId: context.product.productId,
      moduleKey: context.moduleKey,
      deleted: true,
      movedToTrash: input.movedToTrash,
      deletedAt: input.deletedAt ?? context.document.deletedAt,
      message: input.message,
      warning: input.warning,
      idempotent: input.idempotent === true || undefined,
      product: this.safeProduct(context.product),
      module: context.module ? this.safeModule(context.module) : undefined,
      detail: this.safeDetail(context.detail),
    };
  }

  private toRestoreResponse(context: LifecycleContext, input: {
    restoredAt?: string | null;
    message: string;
    warning?: string;
    idempotent?: boolean;
  }) {
    return {
      documentId: context.documentId,
      productId: context.product.productId,
      moduleKey: context.moduleKey,
      deleted: false,
      restored: true,
      restoredAt: input.restoredAt ?? context.document.restoredAt,
      message: input.message,
      warning: input.warning,
      idempotent: input.idempotent === true || undefined,
      product: this.safeProduct(context.product),
      module: context.module ? this.safeModule(context.module) : undefined,
      detail: this.safeDetail(context.detail),
    };
  }

  private safeProduct(product: HubProductModel) {
    return {
      productId: product.productId,
      customerId: product.customerId,
      productModel: product.productModel,
      productName: product.productName,
      drawingStatus: product.drawingStatus,
      remark: product.remark,
      updatedAt: product.updatedAt,
    };
  }

  private safeDetail(detail: ProductDrawingDetail) {
    return {
      product: this.safeProduct(detail.product),
      customer: detail.customer ? {
        customerId: detail.customer.customerId,
        customerName: detail.customer.customerName,
        customerShortName: detail.customer.customerShortName,
      } : undefined,
      modules: detail.modules.map((module) => this.safeModule(module)),
    };
  }

  private safeModule(module: DrawingModule) {
    return {
      moduleKey: module.moduleKey,
      moduleName: module.moduleName,
      status: module.status,
      itemCount: module.itemCount ?? module.items.filter((item) => !item.deletedAt).length,
      coverDocumentId: module.coverDocumentId,
      remark: module.remark,
      updatedAt: module.updatedAt,
      items: module.items.filter((item) => !item.deletedAt).map((item) => ({
        itemId: item.itemId,
        title: item.title,
        fileType: item.fileType,
        previewUrl: item.previewUrl,
        fileName: item.fileName,
        version: item.version,
        remark: item.remark,
        uploadedAt: item.uploadedAt,
        source: item.source,
        fileSize: item.fileSize,
        mimeType: item.mimeType,
        pageCount: item.pageCount,
        imageWidth: item.imageWidth,
        imageHeight: item.imageHeight,
        isCover: item.isCover,
        documentStatus: item.documentStatus,
      })),
    };
  }

  private clampLimit(value?: number) {
    const parsed = Number(value ?? 50);
    if (!Number.isFinite(parsed)) return 50;
    return Math.min(Math.max(Math.floor(parsed), 1), 100);
  }

  private clampOffset(value?: number) {
    const parsed = Number(value ?? 0);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(Math.floor(parsed), 0);
  }
}
