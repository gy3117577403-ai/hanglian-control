import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { documentStatusLabelMap, legacyDocumentTypeMap } from '../common/enums/production.enum';
import type { ProductDocument } from '../common/types/production.types';
import { DocumentsService } from '../documents/documents.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { mockStore } from '../mock/production.mock';
import { LocalStorageService } from '../storage/local-storage.service';
import { StorageService } from '../storage/storage.service';
import type { BulkDeleteDto, DeleteItemDto } from './dto/delete-item.dto';
import type { BulkPurgeDto, PurgeItemDto } from './dto/purge-item.dto';
import type { BulkRestoreDto, RestoreItemDto } from './dto/restore-item.dto';
import type { UnifiedSearchDto } from './dto/unified-search.dto';
import type { UnifiedUploadDto } from './dto/unified-upload.dto';
import type { UpdateUnifiedItemDto } from './dto/update-unified-item.dto';
import { DeleteLockService } from './helpers/delete-lock.service';
import {
  documentId,
  matchKeyword,
  normalizeAbnormalCase,
  normalizeDocument,
  normalizeFixture,
  normalizeQualityStandard,
  statusLabel,
  type UnifiedDocumentItem,
} from './helpers/unified-document-normalizer';

type MutableDocument = ProductDocument & Record<string, unknown>;

const localOperator = {
  operatorId: 'local-unified-user',
  operatorName: '本地操作员',
  operatorRole: '统一资料中心',
};

function parseKeywords(value?: string | string[]) {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  return String(value ?? '')
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function nowIso() {
  return new Date().toISOString();
}

function productMeta(productId?: string) {
  const product = mockStore.products.find((item) => item.id === productId);
  const customer = product ? mockStore.customers.find((item) => item.id === product.customerId) : undefined;
  return { product, customer };
}

function localProductId(productCode: string) {
  return `LOCAL-${productCode.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40) || randomUUID()}`;
}

@Injectable()
export class UnifiedDocumentsService {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly knowledgeService: KnowledgeService,
    private readonly localStorageService: LocalStorageService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
    private readonly deleteLockService: DeleteLockService,
  ) {}

  async search(query: UnifiedSearchDto = {}) {
    const includeDeleted = query.includeDeleted === 'true';
    const items = await this.allItems(includeDeleted);
    const filtered = items
      .map((item) => {
        const matched = matchKeyword(item, query.q);
        return { ...item, matchedFields: matched.fields };
      })
      .filter((item) => matchKeyword(item, query.q).matched)
      .filter((item) => includeDeleted || !item.deleted)
      .filter((item) => !query.type || query.type === 'all' || item.unifiedType === query.type)
      .filter((item) => !query.customer || String(item.customerName ?? '').includes(query.customer))
      .filter((item) => !query.productCode || String(item.productCode ?? '').includes(query.productCode))
      .filter((item) => !query.status || String(item.status ?? '').includes(query.status))
      .filter((item) => !query.source || item.source === query.source)
      .sort((a, b) => Number(a.deleted) - Number(b.deleted) || (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));

    return {
      total: filtered.length,
      items: filtered,
      generatedAt: nowIso(),
    };
  }

  async findOne(id: string) {
    const item = (await this.allItems(true)).find((row) => row.id === id);
    if (!item) throw new NotFoundException('未找到资料。');
    return item;
  }

  async upload(dto: UnifiedUploadDto, file?: Express.Multer.File) {
    const productId = localProductId(dto.productCode);
    const document = await this.documentsService.upload({
      productId,
      documentType: dto.documentType,
      title: dto.title,
      version: dto.version,
      status: dto.status ?? 'effective',
      requiredForProcess: dto.requiredForProcess ?? 'common',
      keywords: dto.keywords,
      remark: dto.remark,
    }, file);

    const enriched = this.patchStoredDocument(documentId(document), {
      customerName: dto.customerName ?? '本地客户',
      productCode: dto.productCode,
      productName: dto.productName,
      productVersion: dto.productVersion ?? dto.version,
      unifiedType: this.unifiedTypeForUpload(dto.documentType),
      updatedAt: nowIso(),
    });

    await this.record('document', documentId(enriched), '统一资料中心上传资料', undefined, enriched);
    return normalizeDocument(enriched);
  }

  async update(id: string, dto: UpdateUnifiedItemDto) {
    const before = this.findStoredDocument(id);
    const next = this.patchStoredDocument(id, {
      ...(dto.customerName !== undefined ? { customerName: dto.customerName } : {}),
      ...(dto.productCode !== undefined ? { productCode: dto.productCode } : {}),
      ...(dto.productName !== undefined ? { productName: dto.productName } : {}),
      ...(dto.productVersion !== undefined ? { productVersion: dto.productVersion } : {}),
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.version !== undefined ? { version: dto.version } : {}),
      ...(dto.remark !== undefined ? { remark: dto.remark, description: dto.remark, mockPreviewText: dto.remark } : {}),
      ...(dto.requiredForProcess !== undefined ? { requiredForProcess: dto.requiredForProcess } : {}),
      ...(dto.documentType !== undefined ? {
        documentType: dto.documentType,
        type: legacyDocumentTypeMap[dto.documentType],
        unifiedType: this.unifiedTypeForUpload(dto.documentType),
        localMockLabel: this.documentTypeLabel(dto.documentType),
      } : {}),
      ...(dto.status !== undefined ? {
        documentStatus: dto.status,
        status: documentStatusLabelMap[dto.status],
      } : {}),
      ...(dto.keywords !== undefined ? { keywords: parseKeywords(dto.keywords) } : {}),
      updatedAt: nowIso(),
    });
    await this.record('document', id, '统一资料中心编辑资料', before, next);
    return normalizeDocument(next);
  }

  async versions(id: string) {
    const item = await this.findOne(id);
    if (item.type === 'document') {
      return this.documentsService.findVersions(id);
    }
    return {
      versionGroupKey: `${item.type}:${item.id}`,
      currentDocument: item,
      versions: [item],
      versionCount: 1,
      effectiveDocumentId: item.id,
      hasExpired: false,
      hasPendingReview: false,
      hasInconsistent: false,
    };
  }

  async setEffective(id: string) {
    const item = await this.findOne(id);
    if (item.type !== 'document') {
      throw new BadRequestException('当前资料类型暂不支持设置有效版本。');
    }
    const result = await this.documentsService.setEffective(id, {
      reason: '统一资料中心设为当前有效',
      ...localOperator,
    });
    return result;
  }

  async trash() {
    const result = await this.search({ includeDeleted: 'true' });
    return result.items.filter((item) => item.deleted);
  }

  async delete(id: string, dto: DeleteItemDto) {
    await this.deleteLockService.assertVerified(dto.password);
    const before = this.findStoredDocument(id);
    const next = this.patchStoredDocument(id, {
      deleted: true,
      deletedAt: nowIso(),
      deletedBy: localOperator.operatorName,
      deleteReason: dto.reason,
      updatedAt: nowIso(),
    });
    await this.record('document', id, dto.reason ?? '统一资料中心移入回收站', before, next);
    return normalizeDocument(next);
  }

  async restore(id: string, dto: RestoreItemDto = {}) {
    const before = this.findStoredDocument(id);
    const next = this.patchStoredDocument(id, {
      deleted: false,
      restoredAt: nowIso(),
      restoredBy: localOperator.operatorName,
      restoreReason: dto.reason,
      updatedAt: nowIso(),
    });
    await this.record('document', id, dto.reason ?? '统一资料中心恢复资料', before, next);
    return normalizeDocument(next);
  }

  async purge(id: string, dto: PurgeItemDto) {
    this.assertPurge(dto);
    await this.deleteLockService.assertVerified(dto.password);
    const document = this.findStoredDocument(id);
    const documents = this.localStorageService.readDocumentsSync() as MutableDocument[];
    const nextDocuments = documents.filter((item) => documentId(item) !== id);
    if (nextDocuments.length === documents.length) {
      throw new NotFoundException('未找到可彻底删除的本地上传资料。');
    }
    this.localStorageService.writeDocumentsSync(nextDocuments);
    const fileResult = await this.storageService.deleteDocumentObject(document);
    await this.record('document', id, dto.reason ?? '统一资料中心彻底删除资料', document, { purged: true, fileResult });
    return {
      success: true,
      id,
      fileResult,
      message: '资料已彻底删除。',
    };
  }

  async bulkDelete(dto: BulkDeleteDto) {
    await this.deleteLockService.assertVerified(dto.password);
    return this.bulk(dto.ids, (id) => this.deleteWithoutPassword(id, dto.reason));
  }

  async bulkRestore(dto: BulkRestoreDto) {
    return this.bulk(dto.ids, (id) => this.restore(id, { reason: dto.reason }));
  }

  async bulkPurge(dto: BulkPurgeDto) {
    this.assertPurge(dto);
    await this.deleteLockService.assertVerified(dto.password);
    return this.bulk(dto.ids, (id) => this.purgeWithoutPassword(id, dto.reason));
  }

  private async allItems(includeDeleted = false): Promise<UnifiedDocumentItem[]> {
    const documents = await this.documentsService.findAll({});
    const documentItems = (documents as unknown as MutableDocument[])
      .map((document) => this.withProductMeta(document))
      .map(normalizeDocument);
    const knowledgeItems = [
      ...this.knowledgeService.fixtures({ limit: '500' }).map(normalizeFixture),
      ...this.knowledgeService.abnormalCases({ limit: '500' }).map(normalizeAbnormalCase),
      ...this.knowledgeService.qualityStandards({ limit: '500' }).map(normalizeQualityStandard),
    ];
    return [...documentItems, ...knowledgeItems].filter((item) => includeDeleted || !item.deleted);
  }

  private withProductMeta(document: MutableDocument) {
    if (document.customerName || document.productCode || document.productName) return document;
    const { product, customer } = productMeta(document.productId);
    return {
      ...document,
      customerName: customer?.name,
      productCode: product?.productCode ?? document.productId,
      productName: product?.productName,
      productVersion: product?.currentVersion,
    };
  }

  private findStoredDocument(id: string) {
    const documents = this.localStorageService.readDocumentsSync() as MutableDocument[];
    const document = documents.find((item) => documentId(item) === id || item.id === id);
    if (!document) {
      throw new BadRequestException('当前资料不是本地上传资料，暂不支持编辑或删除。');
    }
    return { ...document };
  }

  private patchStoredDocument(id: string, patch: Record<string, unknown>) {
    const documents = this.localStorageService.readDocumentsSync() as MutableDocument[];
    const index = documents.findIndex((item) => documentId(item) === id || item.id === id);
    if (index < 0) {
      throw new BadRequestException('当前资料不是本地上传资料，暂不支持编辑或删除。');
    }
    const next = {
      ...documents[index],
      ...patch,
    };
    documents[index] = next;
    this.localStorageService.writeDocumentsSync(documents);
    return next;
  }

  private async deleteWithoutPassword(id: string, reason?: string) {
    const before = this.findStoredDocument(id);
    const next = this.patchStoredDocument(id, {
      deleted: true,
      deletedAt: nowIso(),
      deletedBy: localOperator.operatorName,
      deleteReason: reason,
      updatedAt: nowIso(),
    });
    await this.record('document', id, reason ?? '统一资料中心批量移入回收站', before, next);
    return normalizeDocument(next);
  }

  private async purgeWithoutPassword(id: string, reason?: string) {
    const document = this.findStoredDocument(id);
    const documents = this.localStorageService.readDocumentsSync() as MutableDocument[];
    this.localStorageService.writeDocumentsSync(documents.filter((item) => documentId(item) !== id));
    const fileResult = await this.storageService.deleteDocumentObject(document);
    await this.record('document', id, reason ?? '统一资料中心批量彻底删除资料', document, { purged: true, fileResult });
    return { success: true, id, fileResult };
  }

  private async bulk<T>(ids: string[], action: (id: string) => Promise<T>) {
    const uniqueIds = Array.from(new Set(ids ?? [])).filter(Boolean);
    if (!uniqueIds.length) throw new BadRequestException('请选择资料。');
    const rows: Array<{ id: string; success: boolean; message?: string; result?: T }> = [];
    for (const id of uniqueIds) {
      try {
        rows.push({ id, success: true, result: await action(id) });
      } catch (error) {
        rows.push({ id, success: false, message: error instanceof Error ? error.message : '操作失败' });
      }
    }
    return {
      total: uniqueIds.length,
      successCount: rows.filter((row) => row.success).length,
      failedCount: rows.filter((row) => !row.success).length,
      rows,
    };
  }

  private assertPurge(dto: PurgeItemDto) {
    if (dto.confirmText !== '确认彻底删除') {
      throw new BadRequestException('请正确输入“确认彻底删除”。');
    }
  }

  private async record(entityType: 'document', entityId: string, message: string, before?: unknown, after?: unknown) {
    await this.auditService.tryCreate({
      entityType,
      entityId,
      action: 'maintenance_recorded',
      before,
      after,
      message,
      ...localOperator,
    });
  }

  private unifiedTypeForUpload(type: UnifiedUploadDto['documentType']) {
    const map: Record<UnifiedUploadDto['documentType'], string> = {
      drawing_pdf: 'drawing',
      sop_image: 'sop',
      connector_manual: 'connector',
      pinout_diagram: 'pin_map',
      finished_detail_image: 'finished_image',
      process_card: 'sop',
    };
    return map[type];
  }

  private documentTypeLabel(type: UnifiedUploadDto['documentType']) {
    return statusLabel(type) === type
      ? {
          drawing_pdf: 'PDF 图纸',
          sop_image: 'SOP 扫描图片',
          connector_manual: '连接器装配说明书',
          pinout_diagram: '插接孔位图',
          finished_detail_image: '成品细节图',
          process_card: '作业流程卡',
        }[type]
      : statusLabel(type);
  }
}
