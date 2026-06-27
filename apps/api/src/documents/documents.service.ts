import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { Readable } from 'node:stream';
import { AuditService } from '../audit/audit.service';
import type { DocumentStatus } from '../common/enums/production.enum';
import type { ProductDocument } from '../common/types/production.types';
import { DOCUMENT_REPOSITORY } from '../persistence/persistence.tokens';
import type { DocumentRepositoryInterface } from '../repositories/interfaces/document.repository.interface';
import { StorageService } from '../storage/storage.service';
import type { CompareDocumentsDto } from './dto/compare-documents.dto';
import type { DocumentQueryDto } from './dto/document-query.dto';
import type { DocumentVersionQueryDto } from './dto/document-version-query.dto';
import type { FileHealthQueryDto } from './dto/file-health-query.dto';
import type { SetEffectiveDocumentDto } from './dto/set-effective-document.dto';
import type { UpdateDocumentStatusDto } from './dto/update-document-status.dto';
import type { UpdateDocumentVersionDto } from './dto/update-document-version.dto';
import type { UploadDocumentDto } from './dto/upload-document.dto';
import {
  documentTypeForCategory,
  withDocumentCategory,
} from './document-categories';
import { PdfPreviewService } from './pdf-preview.service';

export const PDF_MAX_BYTES = 80 * 1024 * 1024;
export const IMAGE_MAX_BYTES = 20 * 1024 * 1024;
export const DOCUMENT_UPLOAD_MAX_BYTES = PDF_MAX_BYTES;

const allowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
type AllowedMimeType = (typeof allowedMimeTypes)[number];

const mimeByExtension: Record<string, AllowedMimeType> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const dangerousExtensions = [
  '.exe',
  '.bat',
  '.cmd',
  '.ps1',
  '.sh',
  '.msi',
  '.vbs',
  '.js',
  '.jar',
  '.scr',
];

const previewableMimeTypes = new Set<string>(allowedMimeTypes);

type FileHealthStatus =
  | 'ok'
  | 'demo'
  | 'missing_file'
  | 'unsupported'
  | 'broken';

export interface DocumentFileStreamResult {
  document: ProductDocument;
  stream: Readable;
  mimeType: string;
  fileSize: number;
  fileName: string;
}

export interface CreateStoredDocumentMetadataInput {
  documentId?: string;
  productId: string;
  planId?: string;
  documentType: ProductDocument['documentType'];
  title: string;
  version: string;
  status: DocumentStatus;
  source?: ProductDocument['source'];
  captureSource?: ProductDocument['captureSource'];
  requiredForProcess: ProductDocument['requiredForProcess'];
  keywords?: string[];
  remark?: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  buffer: Buffer;
  metadata?: Record<string, string | number | boolean | undefined>;
  auditAction?: 'document_uploaded' | 'pdf_drawing_imported';
  auditMessage?: string;
  skipAudit?: boolean;
}

function apiPrefix() {
  return (process.env.API_PREFIX ?? 'api').replace(/^\/+|\/+$/g, '') || 'api';
}

function previewTypeFor(mimeType: string) {
  if (mimeType === 'application/pdf') return 'pdf' as const;
  if (mimeType.startsWith('image/')) return 'image' as const;
  return 'card' as const;
}

function parseKeywords(value?: string) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function docId(document: { documentId?: string; id: string }) {
  return document.documentId ?? document.id;
}

function isDeletedDocument(document: ProductDocument) {
  const item = document as ProductDocument & {
    deleted?: boolean;
    deletedAt?: string | null;
  };
  return item.deleted === true || Boolean(item.deletedAt);
}

function versionGroupKey(
  document: Pick<ProductDocument, 'productId' | 'documentType' | 'requiredForProcess'>,
) {
  return `${document.productId}::${document.documentType}::${document.requiredForProcess}`;
}

function rawStatus(document: ProductDocument): DocumentStatus {
  if (document.documentStatus) return document.documentStatus;
  if (document.status === '鏈夋晥') return 'effective';
  if (document.status === '寰呯‘璁?') return 'pending_review';
  return 'expired';
}

function fileHealthMessage(status: FileHealthStatus) {
  switch (status) {
    case 'ok':
      return 'Preview is available.';
    case 'demo':
      return 'This is demo metadata. Upload a real file to enable preview.';
    case 'missing_file':
      return 'Stored file is missing. Please upload it again.';
    case 'unsupported':
      return 'This file type is not previewable online.';
    case 'broken':
      return 'Preview metadata is incomplete. Re-upload or download the file.';
  }
}

function recommendedAction(
  status: FileHealthStatus,
  document: ProductDocument,
  largeFileWarning: boolean,
  duplicateVersionWarning?: string,
) {
  if (duplicateVersionWarning) return 'Review version history.';
  if (rawStatus(document) === 'expired') return 'Use a newer effective version.';
  if (rawStatus(document) === 'pending_review') return 'Review before production.';
  if (largeFileWarning) return 'Consider optimizing this large file.';
  if (status === 'demo') return 'Upload a real production document.';
  if (status === 'missing_file') return 'Upload the source file again.';
  if (status === 'unsupported') return 'Download or convert to PDF/JPG/PNG/WEBP.';
  if (status === 'broken') return 'Re-upload the document.';
  return 'Confirm this is the effective production version.';
}

function normalizeMimeType(value?: string) {
  if (value === 'image/jpg') return 'image/jpeg';
  return value?.toLowerCase();
}

function extensionMimeType(originalName: string) {
  return mimeByExtension[extname(originalName).toLowerCase()];
}

function detectMimeType(buffer: Buffer): AllowedMimeType | undefined {
  if (buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) {
    return 'application/pdf';
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return undefined;
}

function assertSafeOriginalName(originalName?: string) {
  const value = originalName ?? '';
  if (!value.trim()) throw new BadRequestException('File name is required.');
  if (/[\\/]/.test(value) || value.includes('..')) {
    throw new BadRequestException('Unsafe file name.');
  }
  const extension = extname(value).toLowerCase();
  if (dangerousExtensions.some((dangerous) => value.toLowerCase().endsWith(dangerous))) {
    throw new BadRequestException('Unsafe file extension.');
  }
  if (!mimeByExtension[extension]) {
    throw new BadRequestException('Only PDF, JPG, PNG, and WEBP files are allowed.');
  }
}

function assertAllowedUpload(file: Express.Multer.File): AllowedMimeType {
  if (!file?.buffer?.length) throw new BadRequestException('Uploaded file is empty.');
  assertSafeOriginalName(file.originalname);

  const detectedMimeType = detectMimeType(file.buffer);
  const declaredMimeType = normalizeMimeType(file.mimetype);
  const extMimeType = extensionMimeType(file.originalname);
  const mimeType =
    detectedMimeType ??
    (declaredMimeType === extMimeType ? extMimeType : undefined);

  if (!mimeType || !allowedMimeTypes.includes(mimeType)) {
    throw new BadRequestException('Only PDF, JPG, PNG, and WEBP files are allowed.');
  }

  const maxBytes = mimeType === 'application/pdf' ? PDF_MAX_BYTES : IMAGE_MAX_BYTES;
  if (file.size > maxBytes) {
    const maxMb = Math.floor(maxBytes / 1024 / 1024);
    throw new BadRequestException(
      `${mimeType === 'application/pdf' ? 'PDF' : 'Image'} file size must not exceed ${maxMb}MB.`,
    );
  }

  return mimeType;
}

function operatorFromUser(user?: unknown) {
  if (!user || typeof user !== 'object') return {};
  const record = user as Record<string, unknown>;
  return {
    operatorId: String(record.userId ?? record.id ?? ''),
    operatorName: String(record.name ?? record.displayName ?? record.username ?? ''),
    operatorRole: String(record.roleLabel ?? record.role ?? ''),
  };
}

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepository: DocumentRepositoryInterface,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
    private readonly pdfPreviewService: PdfPreviewService,
  ) {}

  async findAll(query: DocumentQueryDto) {
    const documentType = query.category
      ? documentTypeForCategory(query.category)
      : query.documentType;
    const documents = await this.documentRepository.findDocuments({
      ...query,
      planId: query.planId ?? query.orderId,
      documentType,
    });
    return documents
      .filter((document) => !isDeletedDocument(document))
      .map((document) => this.withProtectedUrls(withDocumentCategory(document)));
  }

  async findOne(id: string) {
    return this.withProtectedUrls(await this.findRawDocument(id));
  }

  async findVersions(id: string) {
    const versions = await this.documentRepository.findDocumentVersions(id);
    if (!versions) throw new NotFoundException(`Document version not found: ${id}`);
    return {
      ...versions,
      currentDocument: this.withProtectedUrls(versions.currentDocument),
      versions: versions.versions.map((document) => this.withProtectedUrls(document)),
    };
  }

  async findProductVersions(query: DocumentVersionQueryDto) {
    if (!query.productId) throw new BadRequestException('productId is required.');
    const groups = await this.documentRepository.findProductDocumentVersions(query);
    return groups.map((group) => ({
      ...group,
      currentDocument: group.currentDocument
        ? this.withProtectedUrls(group.currentDocument)
        : undefined,
      versions: group.versions.map((document) => this.withProtectedUrls(document)),
    }));
  }

  async getFileHealth(query: FileHealthQueryDto) {
    const documents = await this.documentRepository.findDocuments({
      planId: query.planId,
      productId: query.productId,
    });
    const storageStatus = this.storageService.getSafeStatus();
    const duplicateGroups = new Map<string, ProductDocument[]>();

    for (const document of documents) {
      const key = document.versionGroupKey ?? versionGroupKey(document);
      const duplicateKey = `${key}::${document.version}`;
      duplicateGroups.set(duplicateKey, [
        ...(duplicateGroups.get(duplicateKey) ?? []),
        document,
      ]);
    }

    const items = await Promise.all(
      documents.map(async (document) => {
        const hasStoredFile = Boolean(document.storedFileName || document.storageKey);
        const status = rawStatus(document);
        const key = document.versionGroupKey ?? versionGroupKey(document);
        const duplicateKey = `${key}::${document.version}`;
        const duplicateVersionWarning =
          (duplicateGroups.get(duplicateKey)?.length ?? 0) > 1
            ? 'Same product/category/version already exists.'
            : undefined;
        const documentStorage = this.storageService.resolveDocumentStorage(document);
        let fileExists = false;
        let healthStatus: FileHealthStatus = 'demo';

        try {
          if (document.source === 'mock') {
            healthStatus = 'demo';
          } else if (!previewableMimeTypes.has(document.mimeType ?? '')) {
            healthStatus = 'unsupported';
          } else if (!hasStoredFile || !documentStorage.storageKey) {
            healthStatus = 'missing_file';
          } else {
            fileExists = await this.storageService.documentObjectExists(document);
            healthStatus = !fileExists
              ? 'missing_file'
              : !document.previewUrl || !document.previewType
                ? 'broken'
                : 'ok';
          }
        } catch {
          healthStatus = hasStoredFile ? 'missing_file' : 'demo';
        }

        const largeFileWarning =
          (document.fileSize ?? 0) >
          (document.mimeType === 'application/pdf' ? PDF_MAX_BYTES : IMAGE_MAX_BYTES);
        return {
          documentId: docId(document),
          title: document.title,
          documentType: document.documentType,
          version: document.version,
          versionGroupKey: key,
          storageProvider: documentStorage.provider,
          storageKeyPresent: Boolean(documentStorage.storageKey),
          legacyStorageRecord: documentStorage.legacyRecord,
          previewMode:
            document.previewMode ?? (documentStorage.provider === 's3' ? 'signed-url' : 'proxy'),
          checksumAvailable: Boolean(document.checksumSha256 ?? document.checksum),
          s3ConfigurationReady: storageStatus.s3Configured,
          source: document.source,
          previewType: document.previewType,
          hasStoredFile,
          fileExists,
          canPreview: healthStatus === 'ok',
          isDemoOnly: healthStatus === 'demo',
          isEffective: status === 'effective',
          isHistorical: status === 'expired',
          isPendingReview: status === 'pending_review',
          largeFileWarning,
          duplicateVersionWarning,
          healthStatus,
          message: fileHealthMessage(healthStatus),
          recommendedAction: recommendedAction(
            healthStatus,
            document,
            largeFileWarning,
            duplicateVersionWarning,
          ),
        };
      }),
    );

    return {
      scope: {
        planId: query.planId,
        productId: query.productId,
      },
      summary: {
        storageProvider: storageStatus.provider,
        storageConfigured:
          storageStatus.provider === 'local'
            ? storageStatus.localReady
            : storageStatus.s3Configured,
        totalDocuments: items.length,
        uploadedDocuments: items.filter((item) => item.source === 'manual_upload').length,
        mockDocuments: items.filter((item) => item.source === 'mock').length,
        previewableDocuments: items.filter((item) => item.canPreview).length,
        missingFiles: items.filter((item) => item.healthStatus === 'missing_file').length,
        brokenPreview: items.filter((item) => item.healthStatus === 'broken').length,
        demoOnly: items.filter((item) => item.healthStatus === 'demo').length,
        effectiveUploadedDocuments: items.filter(
          (item) => item.source === 'manual_upload' && item.isEffective,
        ).length,
        pendingReviewDocuments: items.filter((item) => item.isPendingReview).length,
        expiredDocuments: items.filter((item) => item.isHistorical).length,
        unsupportedDocuments: items.filter((item) => item.healthStatus === 'unsupported').length,
        largeFileWarnings: items.filter((item) => item.largeFileWarning).length,
        duplicateVersionGroups: new Set(
          items
            .filter((item) => item.duplicateVersionWarning)
            .map((item) => `${item.versionGroupKey}::${item.version}`),
        ).size,
      },
      items,
    };
  }

  async compare(dto: CompareDocumentsDto) {
    const result = await this.documentRepository.compareDocuments(dto.documentIds);
    return {
      ...result,
      documents: result.documents.map((document) => this.withProtectedUrls(document)),
    };
  }

  async upload(dto: UploadDocumentDto, file?: Express.Multer.File, user?: unknown) {
    if (!file) throw new BadRequestException('Please upload a file.');
    if (!dto.productId) throw new BadRequestException('productId is required.');
    if (!dto.documentType) throw new BadRequestException('documentType is required.');
    if (!dto.requiredForProcess) throw new BadRequestException('requiredForProcess is required.');
    if (!dto.title?.trim()) throw new BadRequestException('title is required.');

    const mimeType = assertAllowedUpload(file);
    const version = dto.version?.trim() || 'Rev.A';
    const existingDocuments = await this.documentRepository.findDocuments({
      productId: dto.productId,
      documentType: dto.documentType,
    });
    const groupKey = `${dto.productId}::${dto.documentType}::${dto.requiredForProcess}`;
    const duplicateVersionWarning = existingDocuments.some((document) => {
      const sameGroup =
        (document.versionGroupKey ?? versionGroupKey(document)) === groupKey;
      return sameGroup && document.version === version;
    })
      ? 'Same product/category/version already exists.'
      : undefined;

    const documentId = `UPDOC-${Date.now()}-${randomUUID()}`;
    const stored = await this.storageService.putObject({
      originalFileName: file.originalname,
      mimeType,
      buffer: file.buffer,
      fileSize: file.size,
      prefix: 'documents',
      metadata: {
        productId: dto.productId,
        planId: dto.planId,
        documentType: dto.documentType,
        version,
        source: dto.source ?? 'manual_upload',
        captureSource: dto.captureSource,
      },
    });
    const previewUrl = await this.storageService.createPreviewUrl(
      stored.storageKey,
      documentId,
    );
    const downloadUrl = await this.storageService.createDownloadUrl(
      stored.storageKey,
      documentId,
      file.originalname,
    );

    const document = await this.documentRepository.createDocument({
      documentId,
      productId: dto.productId,
      planId: dto.planId,
      documentType: dto.documentType,
      title: dto.title.trim(),
      version,
      status: dto.status ?? 'effective',
      source: dto.source ?? 'manual_upload',
      captureSource: dto.captureSource,
      requiredForProcess: dto.requiredForProcess,
      keywords: parseKeywords(dto.keywords),
      remark: dto.remark,
      originalFileName: file.originalname,
      storedFileName: stored.storedFileName,
      storageProvider: stored.provider,
      storageKey: stored.storageKey,
      checksumSha256: stored.checksumSha256,
      checksum: stored.checksumSha256,
      previewMode: stored.previewMode,
      mimeType,
      fileSize: file.size,
      previewType: previewTypeFor(mimeType),
      previewUrl,
      downloadUrl,
    });
    document.duplicateVersionWarning = duplicateVersionWarning;
    document.recommendedAction = 'Confirm this is the effective production version.';

    await this.auditService.tryCreate({
      entityType: 'document',
      entityId: docId(document),
      action: 'document_uploaded',
      after: document,
      ...operatorFromUser(user),
      message: `Uploaded document ${document.title} ${document.version}`,
      planId: document.planId,
      productId: document.productId,
    });
    await this.pdfPreviewService.warmPreviewAfterUpload(document);
    return this.withProtectedUrls(withDocumentCategory(document));
  }

  async getDocumentFileStream(
    id: string,
    disposition: 'inline' | 'attachment',
  ): Promise<DocumentFileStreamResult> {
    const document = await this.findRawDocument(id);
    const file = await this.storageService.getFileStream({
      provider: document.storageProvider,
      storageKey: document.storageKey,
      storedFileName: document.storedFileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
    });

    if (!file) throw new NotFoundException(`Document file not found: ${id}`);

    await this.auditService.tryCreate({
      entityType: 'file',
      entityId: file.storageKey,
      action: disposition === 'attachment' ? 'document_downloaded' : 'document_previewed',
      message: `${disposition === 'attachment' ? 'Downloaded' : 'Read'} document file ${document.title} ${document.version}`,
      planId: document.planId,
      productId: document.productId,
      after: {
        documentId: docId(document),
        storageProvider: file.provider,
        storageKey: file.storageKey,
        mimeType: file.mimeType,
        size: file.fileSize,
      },
    });

    return {
      document,
      stream: file.stream,
      mimeType: document.mimeType ?? file.mimeType,
      fileSize: document.fileSize ?? file.fileSize,
      fileName:
        document.originalFileName ||
        `${docId(document)}${this.extensionForMime(document.mimeType ?? file.mimeType)}`,
    };
  }

  getPreview(id: string, accessToken?: string) {
    return this.pdfPreviewService.getPreview(id, accessToken);
  }

  getPreviewPageFile(id: string, pageNo: number) {
    return this.pdfPreviewService.getPreviewPageFile(id, pageNo);
  }

  async createStoredDocumentMetadata(
    input: CreateStoredDocumentMetadataInput,
    user?: unknown,
  ) {
    const existingDocuments = await this.documentRepository.findDocuments({
      productId: input.productId,
      documentType: input.documentType,
    });
    const groupKey = `${input.productId}::${input.documentType}::${input.requiredForProcess}`;
    const duplicateVersionWarning = existingDocuments.some((document) => {
      const sameGroup =
        (document.versionGroupKey ?? versionGroupKey(document)) === groupKey;
      return sameGroup && document.version === input.version;
    })
      ? 'Same product/category/version already exists.'
      : undefined;

    const documentId = input.documentId ?? `UPDOC-${Date.now()}-${randomUUID()}`;
    const stored = await this.storageService.putObject({
      originalFileName: input.originalFileName,
      mimeType: input.mimeType,
      buffer: input.buffer,
      fileSize: input.fileSize,
      prefix: 'documents',
      metadata: {
        productId: input.productId,
        planId: input.planId,
        documentType: input.documentType,
        version: input.version,
        source: input.source ?? 'manual_upload',
        captureSource: input.captureSource,
        ...input.metadata,
      },
    });

    try {
      const previewUrl = await this.storageService.createPreviewUrl(
        stored.storageKey,
        documentId,
      );
      const downloadUrl = await this.storageService.createDownloadUrl(
        stored.storageKey,
        documentId,
        input.originalFileName,
      );
      const document = await this.documentRepository.createDocument({
        documentId,
        productId: input.productId,
        planId: input.planId,
        documentType: input.documentType,
        title: input.title,
        version: input.version,
        status: input.status,
        source: input.source ?? 'manual_upload',
        captureSource: input.captureSource,
        requiredForProcess: input.requiredForProcess,
        keywords: input.keywords ?? [],
        remark: input.remark,
        originalFileName: input.originalFileName,
        storedFileName: stored.storedFileName,
        storageProvider: stored.provider,
        storageKey: stored.storageKey,
        checksumSha256: stored.checksumSha256,
        checksum: stored.checksumSha256,
        previewMode: stored.previewMode,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        previewType: previewTypeFor(input.mimeType),
        previewUrl,
        downloadUrl,
      });
      document.duplicateVersionWarning = duplicateVersionWarning;
      document.recommendedAction = 'Confirm this is the effective production version.';

      if (!input.skipAudit) {
        await this.auditService.tryCreate({
          entityType: 'document',
          entityId: docId(document),
          action: input.auditAction ?? 'document_uploaded',
          after: document,
          ...operatorFromUser(user),
          message:
            input.auditMessage ??
            `Uploaded document ${document.title} ${document.version}`,
          planId: document.planId,
          productId: document.productId,
        });
      }
      await this.pdfPreviewService.warmPreviewAfterUpload(document);
      return this.withProtectedUrls(withDocumentCategory(document));
    } catch (error) {
      const deleteResult = await this.storageService.deleteObject(stored.storageKey);
      if (!deleteResult.deleted) {
        throw new Error(
          `Document metadata creation failed and stored file cleanup failed: ${deleteResult.reason}`,
        );
      }
      throw error;
    }
  }

  async updateStatus(
    id: string,
    dto: UpdateDocumentStatusDto,
    user?: unknown,
  ) {
    const before = clone(await this.findRawDocument(id));
    const document = await this.documentRepository.updateDocumentStatus(id, dto);
    if (!document) {
      throw new NotFoundException(`Document not found for status update: ${id}`);
    }
    await this.auditService.tryCreate({
      entityType: 'document',
      entityId: docId(document),
      action: 'document_status_changed',
      before,
      after: document,
      ...operatorFromUser(user),
      message: dto.reason ?? `Document status changed to ${document.documentStatus}`,
      planId: document.planId,
      productId: document.productId,
    });
    return this.withProtectedUrls(document);
  }

  async updateVersion(
    id: string,
    dto: UpdateDocumentVersionDto,
    user?: unknown,
  ) {
    const before = clone(await this.findRawDocument(id));
    const document = await this.documentRepository.updateDocumentVersion(id, dto);
    if (!document) {
      throw new NotFoundException(`Document not found for version update: ${id}`);
    }
    await this.auditService.tryCreate({
      entityType: 'document',
      entityId: docId(document),
      action: 'document_version_changed',
      before,
      after: document,
      ...operatorFromUser(user),
      message: `Document version changed to ${document.version}`,
      planId: document.planId,
      productId: document.productId,
    });
    return this.withProtectedUrls(document);
  }

  async setEffective(
    id: string,
    dto: SetEffectiveDocumentDto,
    user?: unknown,
  ) {
    const before = await this.findVersions(id);
    const result = await this.documentRepository.setEffectiveDocument(id, dto);
    if (!result) {
      throw new NotFoundException(
        `Document not found for effective version update: ${id}`,
      );
    }
    const operator =
      dto.operatorId || dto.operatorName || dto.operatorRole
        ? {
            operatorId: dto.operatorId,
            operatorName: dto.operatorName,
            operatorRole: dto.operatorRole,
          }
        : operatorFromUser(user);
    await this.auditService.tryCreate({
      entityType: 'document',
      entityId: docId(result.document),
      action: 'document_set_effective',
      before,
      after: result.versions,
      ...operator,
      message:
        dto.reason ??
        `Set ${result.document.version} as effective document version`,
      planId: result.document.planId,
      productId: result.document.productId,
    });
    if (result.readiness) {
      await this.auditService.tryCreate({
        entityType: 'plan',
        entityId: result.readiness.planId,
        action: 'readiness_recalculated',
        after: result.readiness,
        ...operator,
        message: 'Recalculated document readiness after effective version update.',
        planId: result.readiness.planId,
        productId: result.document.productId,
      });
    }
    return {
      ...result,
      document: this.withProtectedUrls(result.document),
      versions: {
        ...result.versions,
        currentDocument: this.withProtectedUrls(result.versions.currentDocument),
        versions: result.versions.versions.map((document) =>
          this.withProtectedUrls(document),
        ),
      },
    };
  }

  async archive(id: string, user?: unknown) {
    const before = clone(await this.findRawDocument(id));
    const document = await this.documentRepository.archiveDocument(id);
    if (!document) throw new NotFoundException(`Document not found for archive: ${id}`);
    await this.auditService.tryCreate({
      entityType: 'document',
      entityId: docId(document),
      action: 'document_archived',
      before,
      after: document,
      ...operatorFromUser(user),
      message: `Archived document ${document.title} ${document.version}`,
      planId: document.planId,
      productId: document.productId,
    });
    return this.withProtectedUrls(document);
  }

  private async findRawDocument(id: string) {
    const document = await this.documentRepository.findDocumentById(id);
    if (!document) throw new NotFoundException(`Document not found: ${id}`);
    return document;
  }

  private withProtectedUrls<T extends ProductDocument>(document: T): T {
    const id = encodeURIComponent(docId(document));
    return {
      ...document,
      previewUrl: `/${apiPrefix()}/documents/${id}/file`,
      downloadUrl: `/${apiPrefix()}/documents/${id}/download`,
    };
  }

  private extensionForMime(mimeType: string) {
    if (mimeType === 'application/pdf') return '.pdf';
    if (mimeType === 'image/jpeg') return '.jpg';
    if (mimeType === 'image/png') return '.png';
    if (mimeType === 'image/webp') return '.webp';
    return '';
  }
}
