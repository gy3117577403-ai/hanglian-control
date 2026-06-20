import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { ProductDocument } from '../common/types/production.types';
import { DocumentsService } from '../documents/documents.service';
import { DrawingMetadataStore, PdfImportBatchRecord, PdfImportItemRecord } from './drawing-metadata.store';
import { PdfImportPreviewFormDto, PdfImportPreviewResponseDto } from './dto/pdf-import.dto';
import { normalizeProductModel, parseProductModelFromPdfName } from './helpers/pdf-name-parser';
import {
  pdfImportFileSize,
  validatePdfImportBatch,
  validatePdfImportFile,
} from './helpers/pdf-import-validator';
import { PdfImportTempStorageService } from './pdf-import-temp-storage.service';

const previewTtlMs = 24 * 60 * 60 * 1000;
const expiredPreviewMessage = 'PDF 导入预览已过期，请重新上传文件。';

type PreviewAction = PdfImportItemRecord['action'];
type PreviewStatus = PdfImportItemRecord['status'];

interface DuplicateMatch {
  found: boolean;
  existingDocumentId?: string;
}

@Injectable()
export class PdfImportPreviewService {
  constructor(
    private readonly drawingMetadataStore: DrawingMetadataStore,
    private readonly documentsService: DocumentsService,
    private readonly tempStorage: PdfImportTempStorageService,
  ) {}

  async preview(dto: PdfImportPreviewFormDto, files: Express.Multer.File[] = []): Promise<PdfImportPreviewResponseDto> {
    const customerId = this.cleanText(dto.customerId);
    if (!customerId) throw new BadRequestException('请选择客户。');

    const customer = this.drawingMetadataStore.readCustomers().find((item) => item.customerId === customerId);
    if (!customer) throw new NotFoundException('客户资料不存在。');

    const batchValidation = validatePdfImportBatch(files);
    if (!batchValidation.valid) throw new BadRequestException(batchValidation.message);

    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + previewTtlMs).toISOString();
    const importBatchId = this.makeImportBatchId();
    const currentPreviewChecksums = new Map<string, Set<string>>();
    let batchCreated = false;

    try {
      await this.tempStorage.cleanupExpiredBatches(createdAt);
      await this.tempStorage.createBatchDirectory(importBatchId, expiresAt);
      batchCreated = true;

      const items: PdfImportItemRecord[] = [];
      for (const file of files) {
        items.push(await this.buildPreviewItem({
          importBatchId,
          customerId,
          file,
          now: createdAt,
          currentPreviewChecksums,
        }));
      }

      const batch = this.drawingMetadataStore.upsertImportBatch({
        importBatchId,
        customerId,
        status: 'previewed',
        totalFiles: items.length,
        successCount: items.filter((item) => item.action === 'create_product' || item.action === 'add_version').length,
        skippedCount: items.filter((item) => item.action === 'skip_duplicate').length,
        errorCount: items.filter((item) => item.action === 'error').length,
        needsConfirmationCount: items.filter((item) => item.action === 'needs_confirmation').length,
        parsedFiles: items.filter((item) => item.status === 'parsed').length,
        skippedFiles: items.filter((item) => item.status === 'skipped').length,
        importedFiles: 0,
        createdAt: createdAt.toISOString(),
        expiresAt,
        completedAt: null,
        items,
      });

      return this.toSafeResponse(batch, customer);
    } catch (error) {
      if (batchCreated) await this.tempStorage.removeBatch(importBatchId);
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('PDF 导入预览保存失败，请稍后重试。');
    }
  }

  getPreview(importBatchId: string): PdfImportPreviewResponseDto {
    const cleanImportBatchId = this.cleanText(importBatchId);
    const batch = this.drawingMetadataStore
      .readImportRecords()
      .find((item) => item.importBatchId === cleanImportBatchId);
    if (!batch) throw new NotFoundException('PDF 导入预览记录不存在。');

    const customer = this.drawingMetadataStore.readCustomers().find((item) => item.customerId === batch.customerId);
    return this.toSafeResponse(batch, customer);
  }

  private async buildPreviewItem(input: {
    importBatchId: string;
    customerId: string;
    file: Express.Multer.File;
    now: Date;
    currentPreviewChecksums: Map<string, Set<string>>;
  }): Promise<PdfImportItemRecord> {
    const fileSize = pdfImportFileSize(input.file);
    const baseItem = {
      importItemId: this.makeImportItemId(),
      importBatchId: input.importBatchId,
      fileName: input.file?.originalname || 'unknown.pdf',
      originalFileName: input.file?.originalname || 'unknown.pdf',
      mimeType: input.file?.mimetype || 'application/octet-stream',
      fileSize,
      checksumSha256: '',
      parsedProductModel: '',
      confirmedProductModel: '',
      normalizedProductModel: '',
      confidence: 'low' as const,
      needsConfirmation: false,
      parseWarnings: [] as string[],
      action: 'error' as PreviewAction,
      status: 'error' as PreviewStatus,
    };

    const validation = validatePdfImportFile(input.file);
    if (!validation.valid) {
      return this.errorItem(baseItem, validation.message ?? '文件校验失败。');
    }

    let stagedFileKey: string | undefined;
    try {
      const checksumSha256 = this.sha256(input.file.buffer);
      const staged = await this.tempStorage.stagePdf(input.importBatchId, input.file);
      stagedFileKey = staged.stagedFileKey;
      const parsed = parseProductModelFromPdfName(input.file.originalname);
      const parsedProductModel = parsed.productModel || '';
      const confirmedProductModel = parsedProductModel;
      const normalizedProductModel = normalizeProductModel(confirmedProductModel);
      const parseWarnings = parsed.reason ? [parsed.reason] : [];
      const needsConfirmation = !normalizedProductModel || parsed.status !== 'parsed' || parsed.confidence === 'low';
      const common: PdfImportItemRecord = {
        ...baseItem,
        stagedFileKey: staged.stagedFileKey,
        stagedFileName: staged.stagedFileName,
        fileName: staged.stagedFileName,
        checksumSha256,
        parsedProductModel,
        confirmedProductModel,
        normalizedProductModel,
        parsedVersion: parsed.removedVersion,
        version: parsed.removedVersion,
        confidence: parsed.confidence,
        needsConfirmation,
        parseWarnings,
        mimeType: input.file.mimetype,
        fileSize,
      };

      if (needsConfirmation) {
        return {
          ...common,
          status: 'needs_confirmation',
          action: 'needs_confirmation',
          message: '无法可靠识别产品型号，请确认或修改型号。',
        };
      }

      const existingProduct = this.drawingMetadataStore.readProducts().find((product) => (
        product.customerId === input.customerId &&
        (product.normalizedProductModel ?? normalizeProductModel(product.productModel)) === normalizedProductModel
      ));

      if (!existingProduct) {
        return {
          ...common,
          status: 'parsed',
          action: 'create_product',
          message: '将创建新产品并导入原图。',
        };
      }

      const productChecksumSet = input.currentPreviewChecksums.get(existingProduct.productId) ?? new Set<string>();
      const duplicateInCurrentPreview = productChecksumSet.has(checksumSha256);
      const duplicate = duplicateInCurrentPreview
        ? { found: true }
        : await this.findDuplicateChecksum({
          customerId: input.customerId,
          productId: existingProduct.productId,
          checksumSha256,
          currentBatchId: input.importBatchId,
          now: input.now,
        });
      productChecksumSet.add(checksumSha256);
      input.currentPreviewChecksums.set(existingProduct.productId, productChecksumSet);

      if (duplicate.found) {
        return {
          ...common,
          status: 'skipped',
          action: 'skip_duplicate',
          existingProductId: existingProduct.productId,
          productId: existingProduct.productId,
          existingDocumentId: duplicate.existingDocumentId,
          message: '相同文件已存在。',
        };
      }

      return {
        ...common,
        status: 'parsed',
        action: 'add_version',
        existingProductId: existingProduct.productId,
        productId: existingProduct.productId,
        message: '将作为该产品原图的新版本导入。',
      };
    } catch {
      await this.tempStorage.removeStagedFile(stagedFileKey);
      return this.errorItem(baseItem, '文件读取或暂存失败。');
    }
  }

  private async findDuplicateChecksum(input: {
    customerId: string;
    productId: string;
    checksumSha256: string;
    currentBatchId: string;
    now: Date;
  }): Promise<DuplicateMatch> {
    const uploadedDocuments = await this.documentsService.findAll({ productId: input.productId }) as ProductDocument[];
    const duplicateDocument = uploadedDocuments.find((document) => (
      this.isActiveDocument(document) &&
      this.cleanText(document.checksumSha256).toLowerCase() === input.checksumSha256
    ));
    if (duplicateDocument) {
      return { found: true, existingDocumentId: duplicateDocument.documentId ?? duplicateDocument.id };
    }

    const detail = this.drawingMetadataStore.readDetails().find((item) => item.product.productId === input.productId);
    const duplicateItem = detail?.modules
      .flatMap((module) => module.items)
      .find((item) => !item.deletedAt && this.cleanText(item.checksumSha256).toLowerCase() === input.checksumSha256);
    if (duplicateItem) {
      return { found: true, existingDocumentId: duplicateItem.itemId };
    }

    const duplicatePreviewItem = this.drawingMetadataStore.readImportRecords()
      .filter((batch) => (
        batch.importBatchId !== input.currentBatchId &&
        batch.customerId === input.customerId &&
        batch.status === 'previewed' &&
        Boolean(batch.expiresAt) &&
        new Date(batch.expiresAt as string).getTime() > input.now.getTime()
      ))
      .flatMap((batch) => batch.items)
      .find((item) => (
        item.action !== 'error' &&
        item.action !== 'needs_confirmation' &&
        (item.existingProductId ?? item.productId) === input.productId &&
        this.cleanText(item.checksumSha256).toLowerCase() === input.checksumSha256
      ));

    if (duplicatePreviewItem) {
      return { found: true, existingDocumentId: duplicatePreviewItem.existingDocumentId };
    }

    return { found: false };
  }

  private toSafeResponse(batch: PdfImportBatchRecord, customer?: { customerId: string; customerName: string; customerShortName?: string }) {
    const isApplied = ['completed', 'partially_applied', 'failed', 'applied', 'partial'].includes(batch.status);
    const isExpired = !isApplied && Boolean(batch.expiresAt) && new Date(batch.expiresAt as string).getTime() <= Date.now();
    const status = isExpired ? 'expired' : batch.status;

    return {
      importBatchId: batch.importBatchId,
      customer: {
        customerId: customer?.customerId ?? batch.customerId,
        customerName: customer?.customerName ?? '',
        customerShortName: customer?.customerShortName,
      },
      status,
      message: isExpired ? expiredPreviewMessage : undefined,
      expiresAt: batch.expiresAt,
      summary: {
        totalFiles: batch.totalFiles,
        createProduct: batch.items.filter((item) => item.action === 'create_product').length,
        addVersion: batch.items.filter((item) => item.action === 'add_version').length,
        skipDuplicate: batch.items.filter((item) => item.action === 'skip_duplicate').length,
        needsConfirmation: batch.items.filter((item) => item.action === 'needs_confirmation').length,
        error: batch.items.filter((item) => item.action === 'error').length,
        successCount: batch.successCount ?? 0,
        skippedCount: batch.skippedCount ?? 0,
        errorCount: batch.errorCount ?? 0,
        needsConfirmationCount: batch.needsConfirmationCount ?? 0,
      },
      items: batch.items.map((item) => ({
        importItemId: item.importItemId,
        originalFileName: item.originalFileName,
        mimeType: item.mimeType,
        fileSize: item.fileSize,
        checksumSha256: item.checksumSha256,
        parsedProductModel: item.parsedProductModel,
        confirmedProductModel: item.confirmedProductModel ?? item.parsedProductModel,
        parsedVersion: item.parsedVersion ?? item.version,
        confidence: item.confidence,
        needsConfirmation: Boolean(item.needsConfirmation),
        parseWarnings: item.parseWarnings ?? [],
        existingProductId: item.existingProductId ?? item.productId,
        existingDocumentId: item.existingDocumentId,
        action: item.action,
        message: item.message,
        errorMessage: item.errorMessage,
      })),
      applySummary: batch.applySummary,
      applyItems: batch.applyItems?.map((item) => ({
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
    } satisfies PdfImportPreviewResponseDto;
  }

  private errorItem(
    baseItem: Omit<PdfImportItemRecord, 'message' | 'errorMessage'>,
    errorMessage: string,
  ): PdfImportItemRecord {
    return {
      ...baseItem,
      status: 'error',
      action: 'error',
      message: errorMessage,
      errorMessage,
      parseWarnings: [errorMessage],
    };
  }

  private isActiveDocument(document: ProductDocument) {
    const raw = document as ProductDocument & { deleted?: boolean; deletedAt?: string };
    return raw.archived !== true && raw.deleted !== true && !raw.deletedAt;
  }

  private sha256(buffer: Buffer) {
    return createHash('sha256').update(buffer).digest('hex');
  }

  private cleanText(value?: string) {
    return String(value ?? '').trim();
  }

  private makeImportBatchId() {
    return `PDFIMP-${Date.now()}-${randomUUID().slice(0, 8)}`;
  }

  private makeImportItemId() {
    return `PDFITEM-${randomUUID().slice(0, 12)}`;
  }
}
