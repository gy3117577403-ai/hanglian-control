import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { extname } from 'node:path';
import type { Readable } from 'node:stream';
import { AuditService } from '../audit/audit.service';
import { REPOSITORY_TOKENS } from '../common/constants/repository-tokens';
import type { ProductDocument } from '../common/types/production.types';
import type { DocumentRepositoryInterface } from '../repositories/interfaces/document.repository.interface';
import { StorageService } from '../storage/storage.service';
import type { CompareDocumentsDto } from './dto/compare-documents.dto';
import type { DocumentQueryDto } from './dto/document-query.dto';
import type { DocumentVersionQueryDto } from './dto/document-version-query.dto';
import type { SetEffectiveDocumentDto } from './dto/set-effective-document.dto';
import type { UpdateDocumentStatusDto } from './dto/update-document-status.dto';
import type { UpdateDocumentVersionDto } from './dto/update-document-version.dto';
import type { UploadDocumentDto } from './dto/upload-document.dto';

export const PDF_MAX_BYTES = 80 * 1024 * 1024;
export const IMAGE_MAX_BYTES = 20 * 1024 * 1024;
export const DOCUMENT_UPLOAD_MAX_BYTES = PDF_MAX_BYTES;

const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedMimeType = (typeof allowedMimeTypes)[number];

const mimeByExtension: Record<string, AllowedMimeType> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export interface DocumentFileStreamResult {
  document: ProductDocument;
  stream: Readable;
  mimeType: string;
  fileSize: number;
  fileName: string;
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

function apiPrefix() {
  return (process.env.API_PREFIX ?? 'api').replace(/^\/+|\/+$/g, '') || 'api';
}

function normalizeMimeType(value?: string) {
  if (value === 'image/jpg') return 'image/jpeg';
  return value?.toLowerCase();
}

function extensionMimeType(originalName: string) {
  return mimeByExtension[extname(originalName).toLowerCase()];
}

function detectMimeType(buffer: Buffer): AllowedMimeType | undefined {
  if (buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) return 'application/pdf';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (
    buffer.length >= 8
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47
    && buffer[4] === 0x0d
    && buffer[5] === 0x0a
    && buffer[6] === 0x1a
    && buffer[7] === 0x0a
  ) return 'image/png';
  if (
    buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) return 'image/webp';
  return undefined;
}

function assertAllowedUpload(file: Express.Multer.File): AllowedMimeType {
  if (!file.buffer?.length) throw new BadRequestException('Uploaded file is empty.');

  const detectedMimeType = detectMimeType(file.buffer);
  const declaredMimeType = normalizeMimeType(file.mimetype);
  const extMimeType = extensionMimeType(file.originalname);
  const mimeType = detectedMimeType ?? (declaredMimeType === extMimeType ? extMimeType : undefined);

  if (!mimeType || !allowedMimeTypes.includes(mimeType)) {
    throw new BadRequestException('Only PDF, JPG, PNG, and WEBP files are allowed.');
  }

  const maxBytes = mimeType === 'application/pdf' ? PDF_MAX_BYTES : IMAGE_MAX_BYTES;
  if (file.size > maxBytes) {
    const maxMb = Math.floor(maxBytes / 1024 / 1024);
    throw new BadRequestException(`${mimeType === 'application/pdf' ? 'PDF' : 'Image'} file size must not exceed ${maxMb}MB.`);
  }

  return mimeType;
}

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(REPOSITORY_TOKENS.document)
    private readonly documentRepository: DocumentRepositoryInterface,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: DocumentQueryDto) {
    const documents = await this.documentRepository.findDocuments(query);
    return documents.map((document) => this.withProtectedUrls(document));
  }

  async findOne(id: string) {
    const document = await this.findRawDocument(id);
    return this.withProtectedUrls(document);
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
      currentDocument: group.currentDocument ? this.withProtectedUrls(group.currentDocument) : undefined,
      versions: group.versions.map((document) => this.withProtectedUrls(document)),
    }));
  }

  async compare(dto: CompareDocumentsDto) {
    const result = await this.documentRepository.compareDocuments(dto.documentIds);
    return {
      ...result,
      documents: result.documents.map((document) => this.withProtectedUrls(document)),
    };
  }

  async upload(dto: UploadDocumentDto, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Please upload a file.');
    const mimeType = assertAllowedUpload(file);
    const storedFile = await this.storageService.saveFile(file, mimeType);
    const document = await this.documentRepository.createDocument({
      productId: dto.productId,
      planId: dto.planId,
      documentType: dto.documentType,
      title: dto.title,
      version: dto.version,
      status: dto.status ?? 'effective',
      requiredForProcess: dto.requiredForProcess,
      keywords: parseKeywords(dto.keywords),
      remark: dto.remark,
      originalFileName: file.originalname,
      storedFileName: storedFile.storedFileName,
      mimeType,
      fileSize: file.size,
      previewType: previewTypeFor(mimeType),
      storageProvider: storedFile.provider,
      storageKey: storedFile.storageKey,
      checksum: storedFile.checksumSha256,
    });

    await this.auditService.tryCreate({
      entityType: 'document',
      entityId: docId(document),
      action: 'document_uploaded',
      after: document,
      message: `Uploaded document ${document.title} ${document.version}`,
      planId: document.planId,
      productId: document.productId,
    });
    return this.withProtectedUrls(document);
  }

  async getDocumentFileStream(id: string, disposition: 'inline' | 'attachment'): Promise<DocumentFileStreamResult> {
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
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      fileName: document.originalFileName || `${docId(document)}${this.extensionForMime(file.mimeType)}`,
    };
  }

  async updateStatus(id: string, dto: UpdateDocumentStatusDto) {
    const before = clone(await this.findRawDocument(id));
    const document = await this.documentRepository.updateDocumentStatus(id, dto);
    if (!document) throw new NotFoundException(`Document not found for status update: ${id}`);
    await this.auditService.tryCreate({
      entityType: 'document',
      entityId: docId(document),
      action: 'document_status_changed',
      before,
      after: document,
      message: dto.reason ?? `Document status changed to ${document.documentStatus}`,
      planId: document.planId,
      productId: document.productId,
    });
    return this.withProtectedUrls(document);
  }

  async updateVersion(id: string, dto: UpdateDocumentVersionDto) {
    const before = clone(await this.findRawDocument(id));
    const document = await this.documentRepository.updateDocumentVersion(id, dto);
    if (!document) throw new NotFoundException(`Document not found for version update: ${id}`);
    await this.auditService.tryCreate({
      entityType: 'document',
      entityId: docId(document),
      action: 'document_version_changed',
      before,
      after: document,
      message: `Document version changed to ${document.version}`,
      planId: document.planId,
      productId: document.productId,
    });
    return this.withProtectedUrls(document);
  }

  async setEffective(id: string, dto: SetEffectiveDocumentDto) {
    const before = await this.findVersions(id);
    const result = await this.documentRepository.setEffectiveDocument(id, dto);
    if (!result) throw new NotFoundException(`Document not found for effective version update: ${id}`);
    await this.auditService.tryCreate({
      entityType: 'document',
      entityId: docId(result.document),
      action: 'document_set_effective',
      before,
      after: result.versions,
      message: dto.reason ?? `Set ${result.document.version} as effective document version`,
      operatorId: dto.operatorId,
      operatorName: dto.operatorName,
      operatorRole: dto.operatorRole,
      planId: result.document.planId,
      productId: result.document.productId,
    });
    if (result.readiness) {
      await this.auditService.tryCreate({
        entityType: 'plan',
        entityId: result.readiness.planId,
        action: 'readiness_recalculated',
        after: result.readiness,
        message: 'Recalculated document readiness after effective version update.',
        operatorId: dto.operatorId,
        operatorName: dto.operatorName,
        operatorRole: dto.operatorRole,
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
        versions: result.versions.versions.map((document) => this.withProtectedUrls(document)),
      },
    };
  }

  async archive(id: string) {
    const before = clone(await this.findRawDocument(id));
    const document = await this.documentRepository.archiveDocument(id);
    if (!document) throw new NotFoundException(`Document not found for archive: ${id}`);
    await this.auditService.tryCreate({
      entityType: 'document',
      entityId: docId(document),
      action: 'document_archived',
      before,
      after: document,
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
