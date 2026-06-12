import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { REPOSITORY_TOKENS } from '../common/constants/repository-tokens';
import { LocalStorageService } from '../storage/local-storage.service';
import type { DocumentRepositoryInterface } from '../repositories/interfaces/document.repository.interface';
import type { CompareDocumentsDto } from './dto/compare-documents.dto';
import type { DocumentQueryDto } from './dto/document-query.dto';
import type { DocumentVersionQueryDto } from './dto/document-version-query.dto';
import type { SetEffectiveDocumentDto } from './dto/set-effective-document.dto';
import type { UpdateDocumentStatusDto } from './dto/update-document-status.dto';
import type { UpdateDocumentVersionDto } from './dto/update-document-version.dto';
import type { UploadDocumentDto } from './dto/upload-document.dto';

const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

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

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(REPOSITORY_TOKENS.document)
    private readonly documentRepository: DocumentRepositoryInterface,
    private readonly localStorageService: LocalStorageService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: DocumentQueryDto) {
    return this.documentRepository.findDocuments(query);
  }

  async findOne(id: string) {
    const document = await this.documentRepository.findDocumentById(id);
    if (!document) throw new NotFoundException(`未找到资料：${id}`);
    return document;
  }

  async findVersions(id: string) {
    const versions = await this.documentRepository.findDocumentVersions(id);
    if (!versions) throw new NotFoundException(`未找到资料版本：${id}`);
    return versions;
  }

  async findProductVersions(query: DocumentVersionQueryDto) {
    if (!query.productId) throw new BadRequestException('productId 为必填项。');
    return this.documentRepository.findProductDocumentVersions(query);
  }

  async compare(dto: CompareDocumentsDto) {
    return this.documentRepository.compareDocuments(dto.documentIds);
  }

  async upload(dto: UploadDocumentDto, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('请上传文件。');
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('仅允许上传 PDF、JPG、PNG、WEBP 文件。');
    }

    const storedFileName = await this.localStorageService.saveFile(file);
    const apiPrefix = process.env.API_PREFIX ?? 'api';
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
      storedFileName,
      mimeType: file.mimetype,
      fileSize: file.size,
      previewType: previewTypeFor(file.mimetype),
      previewUrl: `/${apiPrefix}/files/${storedFileName}`,
      downloadUrl: `/${apiPrefix}/files/${storedFileName}`,
    });

    await this.auditService.tryCreate({
      entityType: 'document',
      entityId: docId(document),
      action: 'document_uploaded',
      after: document,
      message: `上传资料 ${document.title} ${document.version}`,
      planId: document.planId,
      productId: document.productId,
    });
    return document;
  }

  async updateStatus(id: string, dto: UpdateDocumentStatusDto) {
    const before = clone(await this.findOne(id));
    const document = await this.documentRepository.updateDocumentStatus(id, dto);
    if (!document) throw new NotFoundException(`未找到可更新的资料：${id}`);
    await this.auditService.tryCreate({
      entityType: 'document',
      entityId: docId(document),
      action: 'document_status_changed',
      before,
      after: document,
      message: dto.reason ?? `资料状态改为 ${document.documentStatus}`,
      planId: document.planId,
      productId: document.productId,
    });
    return document;
  }

  async updateVersion(id: string, dto: UpdateDocumentVersionDto) {
    const before = clone(await this.findOne(id));
    const document = await this.documentRepository.updateDocumentVersion(id, dto);
    if (!document) throw new NotFoundException(`未找到可更新版本的资料：${id}`);
    await this.auditService.tryCreate({
      entityType: 'document',
      entityId: docId(document),
      action: 'document_version_changed',
      before,
      after: document,
      message: `资料版本改为 ${document.version}`,
      planId: document.planId,
      productId: document.productId,
    });
    return document;
  }

  async setEffective(id: string, dto: SetEffectiveDocumentDto) {
    const before = await this.findVersions(id);
    const result = await this.documentRepository.setEffectiveDocument(id, dto);
    if (!result) throw new NotFoundException(`未找到可设置有效版本的资料：${id}`);
    await this.auditService.tryCreate({
      entityType: 'document',
      entityId: docId(result.document),
      action: 'document_set_effective',
      before,
      after: result.versions,
      message: dto.reason ?? `设置 ${result.document.version} 为当前有效版本`,
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
        message: '设置有效版本后重新计算资料齐套性。',
        operatorId: dto.operatorId,
        operatorName: dto.operatorName,
        operatorRole: dto.operatorRole,
        planId: result.readiness.planId,
        productId: result.document.productId,
      });
    }
    return result;
  }

  async archive(id: string) {
    const before = clone(await this.findOne(id));
    const document = await this.documentRepository.archiveDocument(id);
    if (!document) throw new NotFoundException(`未找到可归档的资料：${id}`);
    await this.auditService.tryCreate({
      entityType: 'document',
      entityId: docId(document),
      action: 'document_archived',
      before,
      after: document,
      message: `归档资料 ${document.title} ${document.version}`,
      planId: document.planId,
      productId: document.productId,
    });
    return document;
  }
}
