import {
  BadRequestException,
  ConflictException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { ProductDocument } from '../common/types/production.types';
import { AuditService } from '../audit/audit.service';
import { DocumentsService } from '../documents/documents.service';
import { DRAWING_REPOSITORY } from '../persistence/persistence.tokens';
import type { DrawingRepository } from '../persistence/persistence.types';
import {
  PdfImportApplyItemRecord,
  PdfImportApplySummaryRecord,
  PdfImportBatchRecord,
  PdfImportItemRecord,
} from './drawing-metadata.store';
import { PdfImportApplyDto, PdfImportApplyResponseDto } from './dto/pdf-import.dto';
import {
  assertNoDuplicateApplyItems,
  cleanApplyText,
  isValidConfirmedProductModel,
  normalizeApplyItemInput,
  normalizeApplyOperator,
  type NormalizedApplyItemInput,
} from './helpers/pdf-import-apply-validator';
import { normalizeProductModel } from './helpers/pdf-name-parser';
import type { DrawingItem, DrawingModule, HubCustomer, HubProductModel } from './mock/document-hub.seed';
import { PdfImportTempStorageService } from './pdf-import-temp-storage.service';

type ApplyResult = PdfImportApplyItemRecord['result'];

const applyingLocks = new Set<string>();
const expiredPreviewMessage = 'PDF 导入预览已过期，请重新上传文件。';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

@Injectable()
export class PdfImportApplyService {
  constructor(
    @Inject(DRAWING_REPOSITORY) private readonly drawingRepository: DrawingRepository,
    private readonly documentsService: DocumentsService,
    private readonly tempStorage: PdfImportTempStorageService,
    private readonly auditService: AuditService,
  ) {}

  async apply(dto: PdfImportApplyDto): Promise<PdfImportApplyResponseDto> {
    const importBatchId = cleanApplyText(dto.importBatchId, 120);
    if (!importBatchId) throw new BadRequestException('PDF 导入预览记录不存在。');

    const batch = this.findBatch(importBatchId);
    if (!batch) throw new NotFoundException('PDF 导入预览记录不存在。');
    if (this.isCompleted(batch)) return this.toSafeApplyResponse(batch);
    if (batch.status === 'applying' || batch.applyStatus === 'applying' || applyingLocks.has(importBatchId)) {
      throw new ConflictException('该导入批次正在处理中，请勿重复提交。');
    }
    if (this.isExpired(batch)) throw new GoneException(expiredPreviewMessage);

    const customer = this.drawingRepository.readCustomers().find((item) => item.customerId === batch.customerId);
    if (!customer) throw new NotFoundException('客户资料不存在。');

    const requestItems = (dto.items ?? []).map((item) => normalizeApplyItemInput(item as unknown as Record<string, unknown>));
    if (!requestItems.length) throw new BadRequestException('请至少选择一个导入项目。');
    try {
      assertNoDuplicateApplyItems(requestItems);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : '导入项目提交无效。');
    }
    this.assertItemsBelongToBatch(batch, requestItems);

    const operatorId = normalizeApplyOperator(dto.operatorId, 'local-user');
    const operatorName = normalizeApplyOperator(dto.operatorName, '本地操作员');
    const remark = cleanApplyText(dto.remark, 200) || undefined;
    applyingLocks.add(importBatchId);

    try {
      this.updateBatch({
        ...batch,
        status: 'applying',
        applyStatus: 'applying',
        remark,
        operatorId,
        operatorName,
      });

      const latestBatch = this.findBatch(importBatchId) ?? batch;
      const previousApplyItems = latestBatch.applyItems ?? [];
      const applyItemsById = new Map(previousApplyItems.map((item) => [item.importItemId, item]));
      const requestById = new Map(requestItems.map((item) => [item.importItemId, item]));

      for (const previewItem of latestBatch.items) {
        const decision = requestById.get(previewItem.importItemId);
        if (!decision) continue;
        const previous = applyItemsById.get(previewItem.importItemId);
        if (previous && this.isSuccessfulResult(previous.result)) continue;

        const result = await this.applyOneItem({
          batch: latestBatch,
          customer,
          previewItem,
          decision,
          operatorId,
          operatorName,
          remark,
        });
        applyItemsById.set(previewItem.importItemId, result);
      }

      const applyItems = latestBatch.items
        .map((item) => applyItemsById.get(item.importItemId))
        .filter(Boolean) as PdfImportApplyItemRecord[];
      const applySummary = this.summarize(applyItems);
      const status = this.deriveBatchStatus(latestBatch, applyItems);
      const appliedAt = new Date().toISOString();
      const saved = this.updateBatch({
        ...latestBatch,
        status,
        applyStatus: status,
        appliedAt,
        completedAt: status === 'completed' ? appliedAt : latestBatch.completedAt ?? null,
        applySummary,
        applyItems,
        remark,
        operatorId,
        operatorName,
      });

      await this.tempStorage.removeBatchIfEmpty(importBatchId);
      return this.toSafeApplyResponse(saved);
    } finally {
      applyingLocks.delete(importBatchId);
    }
  }

  private async applyOneItem(input: {
    batch: PdfImportBatchRecord;
    customer: HubCustomer;
    previewItem: PdfImportItemRecord;
    decision: NormalizedApplyItemInput;
    operatorId: string;
    operatorName: string;
    remark?: string;
  }): Promise<PdfImportApplyItemRecord> {
    const { batch, customer, previewItem, decision } = input;
    const base = {
      importItemId: previewItem.importItemId,
      originalFileName: previewItem.originalFileName,
      confirmedProductModel: '',
      setAsEffective: decision.setAsEffective,
      appliedAt: new Date().toISOString(),
    };

    if (!decision.selected) {
      return {
        ...base,
        result: 'skipped_by_user',
        message: '用户已跳过该文件。',
      };
    }

    const confirmedProductModel = decision.confirmedProductModel
      ?? previewItem.confirmedProductModel
      ?? previewItem.parsedProductModel;
    const normalizedProductModel = normalizeProductModel(confirmedProductModel);
    if (!isValidConfirmedProductModel(confirmedProductModel)) {
      return {
        ...base,
        confirmedProductModel,
        result: 'needs_confirmation',
        message: '无法可靠识别产品型号，请确认或修改型号。',
      };
    }

    const stagedValidation = await this.readAndValidateStagedPdf(batch, previewItem);
    if (!stagedValidation.valid) {
      return {
        ...base,
        confirmedProductModel,
        result: 'error',
        message: stagedValidation.errorMessage,
        errorMessage: stagedValidation.errorMessage,
      };
    }

    let product = this.findProduct(batch.customerId, normalizedProductModel);
    const productExisted = Boolean(product);
    if (product) {
      const duplicate = await this.findDuplicateChecksum(product.productId, previewItem.checksumSha256);
      if (duplicate) {
        await this.tempStorage.removeStagedFile(previewItem.stagedFileKey);
        return {
          ...base,
          confirmedProductModel,
          productId: product.productId,
          documentId: duplicate.documentId,
          result: 'skipped_duplicate',
          message: '相同文件已存在。',
        };
      }
    }

    let createdProductId: string | undefined;
    if (!product) {
      product = this.createProductFromImport({
        customer,
        productModel: confirmedProductModel,
        normalizedProductModel,
        productName: decision.productName,
        originalFileName: previewItem.originalFileName,
        version: decision.confirmedVersion ?? previewItem.parsedVersion ?? previewItem.version,
      });
      createdProductId = product.productId;
    }

    const shouldSetEffective = productExisted ? decision.setAsEffective === true : decision.setAsEffective !== false;
    const documentStatus = shouldSetEffective ? 'effective' : 'pending_review';
    try {
      const document = await this.documentsService.createStoredDocumentMetadata({
        productId: product.productId,
        documentType: 'drawing_pdf',
        title: this.makeDocumentTitle(product.productModel, decision.confirmedVersion ?? previewItem.parsedVersion ?? previewItem.version, previewItem.originalFileName),
        version: decision.confirmedVersion ?? previewItem.parsedVersion ?? previewItem.version ?? '',
        status: documentStatus,
        source: 'pdf_import',
        requiredForProcess: 'common',
        keywords: [product.productModel, normalizedProductModel, previewItem.originalFileName, decision.confirmedVersion ?? previewItem.parsedVersion ?? previewItem.version ?? ''].filter(Boolean),
        remark: input.remark,
        originalFileName: previewItem.originalFileName,
        mimeType: 'application/pdf',
        fileSize: previewItem.fileSize,
        buffer: stagedValidation.buffer,
        metadata: {
          importBatchId: batch.importBatchId,
          importItemId: previewItem.importItemId,
          checksumSha256: previewItem.checksumSha256,
        },
        skipAudit: true,
      });

      let finalDocument = document;
      if (productExisted && shouldSetEffective) {
        const effectiveResult = await this.documentsService.setEffective(document.documentId ?? document.id, {
          reason: input.remark ?? 'PDF 导入设为当前有效版本',
          operatorId: input.operatorId,
          operatorName: input.operatorName,
        });
        finalDocument = effectiveResult.document;
      }

      this.attachDocumentToProduct(customer, product, finalDocument, {
        setAsEffective: shouldSetEffective,
        originalFileName: previewItem.originalFileName,
        version: decision.confirmedVersion ?? previewItem.parsedVersion ?? previewItem.version,
      });
      await this.writeApplyAudits({
        product,
        document: finalDocument,
        batch,
        previewItem,
        operatorId: input.operatorId,
        operatorName: input.operatorName,
        createdProduct: Boolean(createdProductId),
        remark: input.remark,
      });
      await this.tempStorage.removeStagedFile(previewItem.stagedFileKey);

      return {
        ...base,
        confirmedProductModel,
        productId: product.productId,
        documentId: finalDocument.documentId ?? finalDocument.id,
        result: createdProductId ? 'created_product' : 'added_version',
        message: createdProductId ? '产品已创建，原图已导入。' : '原图新版本已导入。',
        documentStatus: finalDocument.documentStatus,
        setAsEffective: shouldSetEffective,
      };
    } catch (error) {
      if (createdProductId) {
        try {
          this.drawingRepository.rollbackNewProduct(createdProductId);
        } catch {
          // Keep the original item failure; rollback refusal is safer than deleting uncertain data.
        }
      }
      return {
        ...base,
        confirmedProductModel,
        productId: product.productId,
        result: 'error',
        message: 'PDF 应用失败，请重试。',
        errorMessage: error instanceof Error ? error.message : 'PDF 应用失败，请重试。',
      };
    }
  }

  private async readAndValidateStagedPdf(batch: PdfImportBatchRecord, previewItem: PdfImportItemRecord) {
    if (!previewItem.stagedFileKey) {
      return { valid: false as const, errorMessage: '临时文件不存在，请重新上传。' };
    }
    try {
      const staged = await this.tempStorage.readStagedPdf(batch.importBatchId, previewItem.stagedFileKey);
      if (staged.fileSize !== previewItem.fileSize) {
        return { valid: false as const, errorMessage: '临时文件校验失败，请重新上传。' };
      }
      if (previewItem.mimeType !== 'application/pdf') {
        return { valid: false as const, errorMessage: '仅支持应用 PDF 文件。' };
      }
      const checksumSha256 = createHash('sha256').update(staged.buffer).digest('hex');
      if (checksumSha256 !== previewItem.checksumSha256) {
        return { valid: false as const, errorMessage: '临时文件校验失败，请重新上传。' };
      }
      return { valid: true as const, buffer: staged.buffer };
    } catch {
      return { valid: false as const, errorMessage: '临时文件校验失败，请重新上传。' };
    }
  }

  private findProduct(customerId: string, normalizedProductModel: string) {
    return this.drawingRepository.readProducts().find((product) => (
      product.customerId === customerId &&
      (product.normalizedProductModel ?? normalizeProductModel(product.productModel)) === normalizedProductModel
    ));
  }

  private async findDuplicateChecksum(productId: string, checksumSha256: string) {
    const documents = await this.documentsService.findAll({ productId }) as ProductDocument[];
    const document = documents.find((item) => this.isActiveDocument(item) && item.checksumSha256 === checksumSha256);
    if (document) return { documentId: document.documentId ?? document.id };

    const detail = this.drawingRepository.readDetails().find((item) => item.product.productId === productId);
    const moduleItem = detail?.modules
      .flatMap((module) => module.items)
      .find((item) => !item.deletedAt && item.checksumSha256 === checksumSha256);
    return moduleItem ? { documentId: moduleItem.itemId } : undefined;
  }

  private createProductFromImport(input: {
    customer: HubCustomer;
    productModel: string;
    normalizedProductModel: string;
    productName?: string;
    originalFileName: string;
    version?: string;
  }) {
    const timestamp = new Date().toISOString();
    const product: HubProductModel = {
      productId: this.drawingRepository.makeProductId(input.customer.customerId, input.normalizedProductModel),
      customerId: input.customer.customerId,
      productModel: input.productModel,
      normalizedProductModel: input.normalizedProductModel,
      productName: input.productName || input.productModel,
      drawingStatus: 'no_drawing',
      source: 'pdf_import',
      searchKeywords: [input.productModel, input.normalizedProductModel, input.originalFileName, input.version].filter(Boolean) as string[],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.drawingRepository.writeProducts([...this.drawingRepository.readProducts(), product]);
    this.drawingRepository.upsertDetail(this.drawingRepository.makeProductDetail(input.customer, product));
    return this.findProduct(input.customer.customerId, input.normalizedProductModel) ?? product;
  }

  private attachDocumentToProduct(customer: HubCustomer, product: HubProductModel, document: ProductDocument, options: {
    setAsEffective: boolean;
    originalFileName: string;
    version?: string;
  }) {
    const timestamp = new Date().toISOString();
    const products = this.drawingRepository.readProducts();
    const nextProduct: HubProductModel = {
      ...product,
      drawingStatus: 'available',
      updatedAt: timestamp,
      searchKeywords: [...new Set([...(product.searchKeywords ?? []), product.productModel, product.normalizedProductModel, options.originalFileName, options.version].filter(Boolean) as string[])],
    };
    this.drawingRepository.writeProducts(products.map((item) => item.productId === product.productId ? nextProduct : item));

    const details = this.drawingRepository.readDetails();
    const currentDetail = details.find((item) => item.product.productId === product.productId)
      ?? this.drawingRepository.makeProductDetail(customer, nextProduct);
    const detail = clone(currentDetail);
    detail.product = nextProduct;
    detail.customer = customer;
    const originalModule = detail.modules.find((module) => module.moduleKey === 'original_drawing') as DrawingModule | undefined;
    if (!originalModule) return;

    const drawingItem = this.documentToDrawingItem(document);
    if (!originalModule.items.some((item) => item.itemId === drawingItem.itemId)) {
      originalModule.items.unshift(drawingItem);
    }
    originalModule.status = 'uploaded';
    originalModule.itemCount = originalModule.items.filter((item) => !item.deletedAt).length;
    if (!originalModule.coverDocumentId || options.setAsEffective) {
      originalModule.coverDocumentId = drawingItem.itemId;
    }
    originalModule.updatedAt = timestamp;
    this.drawingRepository.upsertDetail(detail);
  }

  private documentToDrawingItem(document: ProductDocument): DrawingItem {
    return {
      itemId: document.documentId ?? document.id,
      title: document.title,
      fileType: 'pdf',
      previewUrl: document.previewUrl,
      fileName: document.originalFileName ?? document.title,
      version: document.version,
      remark: document.remark ?? document.description ?? document.mockPreviewText,
      uploadedAt: document.updatedAt ?? document.createdAt ?? new Date().toISOString(),
      source: 'pdf_import',
      storageProvider: document.storageProvider,
      storageKey: document.storageKey,
      checksumSha256: document.checksumSha256,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      documentStatus: document.documentStatus === 'effective'
        ? 'effective'
        : document.documentStatus === 'expired'
          ? 'expired'
          : 'pending',
    };
  }

  private async writeApplyAudits(input: {
    product: HubProductModel;
    document: ProductDocument;
    batch: PdfImportBatchRecord;
    previewItem: PdfImportItemRecord;
    operatorId: string;
    operatorName: string;
    createdProduct: boolean;
    remark?: string;
  }) {
    const operator = {
      operatorId: input.operatorId,
      operatorName: input.operatorName,
      operatorRole: 'local',
    };
    if (input.createdProduct) {
      await this.auditService.tryCreate({
        entityType: 'product',
        entityId: input.product.productId,
        action: 'pdf_import_product_created',
        after: {
          customerId: input.batch.customerId,
          productId: input.product.productId,
          importBatchId: input.batch.importBatchId,
          importItemId: input.previewItem.importItemId,
          originalFileName: input.previewItem.originalFileName,
          checksumSha256: input.previewItem.checksumSha256,
        },
        ...operator,
        message: input.remark ?? `PDF 导入创建产品 ${input.product.productModel}`,
        productId: input.product.productId,
      });
    }

    await this.auditService.tryCreate({
      entityType: 'document',
      entityId: input.document.documentId ?? input.document.id,
      action: 'pdf_drawing_imported',
      after: {
        customerId: input.batch.customerId,
        productId: input.product.productId,
        documentId: input.document.documentId ?? input.document.id,
        importBatchId: input.batch.importBatchId,
        importItemId: input.previewItem.importItemId,
        originalFileName: input.previewItem.originalFileName,
        checksumSha256: input.previewItem.checksumSha256,
      },
      ...operator,
      message: input.remark ?? `PDF 原图导入 ${input.document.title} ${input.document.version}`,
      productId: input.product.productId,
    });
  }

  private makeDocumentTitle(productModel: string, version?: string, originalFileName?: string) {
    const versionText = cleanApplyText(version, 40);
    const nameText = cleanApplyText(originalFileName, 60);
    return [productModel, '原图', versionText || nameText].filter(Boolean).join(' ');
  }

  private summarize(items: PdfImportApplyItemRecord[]): PdfImportApplySummaryRecord {
    return {
      total: items.length,
      createdProduct: items.filter((item) => item.result === 'created_product').length,
      addedVersion: items.filter((item) => item.result === 'added_version').length,
      skippedDuplicate: items.filter((item) => item.result === 'skipped_duplicate').length,
      needsConfirmation: items.filter((item) => item.result === 'needs_confirmation').length,
      skippedByUser: items.filter((item) => item.result === 'skipped_by_user').length,
      error: items.filter((item) => item.result === 'error').length,
    };
  }

  private deriveBatchStatus(batch: PdfImportBatchRecord, items: PdfImportApplyItemRecord[]) {
    const summary = this.summarize(items);
    const itemById = new Map(items.map((item) => [item.importItemId, item]));
    const allItemsResolved = batch.items.every((item) => {
      const result = itemById.get(item.importItemId)?.result;
      return result === 'created_product' || result === 'added_version' || result === 'skipped_duplicate';
    });
    if (allItemsResolved && summary.error === 0 && summary.needsConfirmation === 0 && summary.skippedByUser === 0) {
      return 'completed' as const;
    }
    if (summary.createdProduct + summary.addedVersion + summary.skippedDuplicate > 0) return 'partially_applied' as const;
    if (summary.error > 0) return 'failed' as const;
    return 'partially_applied' as const;
  }

  private toSafeApplyResponse(batch: PdfImportBatchRecord): PdfImportApplyResponseDto {
    const customer = this.drawingRepository.readCustomers().find((item) => item.customerId === batch.customerId);
    const items = batch.applyItems ?? [];
    return {
      importBatchId: batch.importBatchId,
      status: batch.status === 'completed' ? 'completed' : batch.status === 'failed' ? 'failed' : 'partially_applied',
      customer: {
        customerId: customer?.customerId ?? batch.customerId,
        customerName: customer?.customerName ?? '',
        customerShortName: customer?.customerShortName,
      },
      summary: batch.applySummary ?? this.summarize(items),
      items: items.map((item) => ({
        importItemId: item.importItemId,
        originalFileName: item.originalFileName,
        confirmedProductModel: item.confirmedProductModel,
        productId: item.productId,
        documentId: item.documentId,
        result: item.result,
        message: item.message,
        documentStatus: item.documentStatus,
        setAsEffective: item.setAsEffective,
        errorMessage: item.errorMessage,
      })),
      appliedAt: batch.appliedAt,
    };
  }

  private assertItemsBelongToBatch(batch: PdfImportBatchRecord, requestItems: NormalizedApplyItemInput[]) {
    const ids = new Set(batch.items.map((item) => item.importItemId));
    if (requestItems.some((item) => !ids.has(item.importItemId))) {
      throw new BadRequestException('导入项目不属于当前预览批次。');
    }
  }

  private findBatch(importBatchId: string) {
    return this.drawingRepository.readImportRecords().find((batch) => batch.importBatchId === importBatchId);
  }

  private updateBatch(batch: PdfImportBatchRecord) {
    return this.drawingRepository.upsertImportBatch(batch);
  }

  private isExpired(batch: PdfImportBatchRecord) {
    return Boolean(batch.expiresAt) && new Date(batch.expiresAt as string).getTime() <= Date.now();
  }

  private isCompleted(batch: PdfImportBatchRecord) {
    return (batch.status === 'completed' || batch.status === 'applied') && Boolean(batch.applyItems?.length);
  }

  private isSuccessfulResult(result: ApplyResult) {
    return result === 'created_product' || result === 'added_version' || result === 'skipped_duplicate';
  }

  private isActiveDocument(document: ProductDocument) {
    const raw = document as ProductDocument & { deleted?: boolean; deletedAt?: string };
    return raw.archived !== true && raw.deleted !== true && !raw.deletedAt;
  }
}
