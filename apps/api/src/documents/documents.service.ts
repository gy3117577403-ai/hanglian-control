import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { AuditService } from '../audit/audit.service';
import type { MockUser } from '../auth/mock-users';
import { REPOSITORY_TOKENS } from '../common/constants/repository-tokens';
import type { DocumentStatus } from '../common/enums/production.enum';
import { StorageService } from '../storage/storage.service';
import type { ProductDocument } from '../common/types/production.types';
import type { DocumentRepositoryInterface } from '../repositories/interfaces/document.repository.interface';
import type { CompareDocumentsDto } from './dto/compare-documents.dto';
import type { DocumentQueryDto } from './dto/document-query.dto';
import type { DocumentVersionQueryDto } from './dto/document-version-query.dto';
import type { FileHealthQueryDto } from './dto/file-health-query.dto';
import type { SetEffectiveDocumentDto } from './dto/set-effective-document.dto';
import type { UpdateDocumentStatusDto } from './dto/update-document-status.dto';
import type { UpdateDocumentVersionDto } from './dto/update-document-version.dto';
import type { UploadDocumentDto } from './dto/upload-document.dto';

const MAX_FILE_SIZE = 30 * 1024 * 1024;
const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
const dangerousExtensions = ['.exe', '.bat', '.cmd', '.ps1', '.sh', '.msi', '.vbs', '.js', '.jar', '.scr'];
const previewableMimeTypes = new Set(allowedMimeTypes);

type FileHealthStatus = 'ok' | 'demo' | 'missing_file' | 'unsupported' | 'broken';

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

function versionGroupKey(document: Pick<ProductDocument, 'productId' | 'documentType' | 'requiredForProcess'>) {
  return `${document.productId}::${document.documentType}::${document.requiredForProcess}`;
}

function rawStatus(document: ProductDocument): DocumentStatus {
  return document.documentStatus ?? (
    document.status === '有效' ? 'effective'
      : document.status === '待确认' ? 'pending_review'
        : 'expired'
  );
}

function fileHealthMessage(status: FileHealthStatus) {
  switch (status) {
    case 'ok':
      return '可预览';
    case 'demo':
      return '当前为演示资料，上传真实资料后将替换预览';
    case 'missing_file':
      return '文件缺失，请重新上传';
    case 'unsupported':
      return '该文件暂不支持在线预览，可下载查看';
    case 'broken':
      return '预览信息异常，可下载查看或重新上传';
  }
}

function recommendedAction(status: FileHealthStatus, document: ProductDocument, largeFileWarning: boolean, duplicateVersionWarning?: string) {
  if (duplicateVersionWarning) return '进入版本历史确认当前有效版本';
  if (rawStatus(document) === 'expired') return '历史版本，不建议用于当前生产';
  if (rawStatus(document) === 'pending_review') return '待确认版本，开工前请复核';
  if (largeFileWarning) return '文件超过推荐大小，预览可能较慢';
  if (status === 'demo') return '上传真实资料后用于生产确认';
  if (status === 'missing_file') return '重新上传该资料文件';
  if (status === 'unsupported') return '下载查看或转换为 PDF/JPG/PNG/WEBP';
  if (status === 'broken') return '重新上传或联系工艺人员复核';
  return '如需用于生产，请确认版本状态为当前有效';
}

function validateUploadFile(file: Express.Multer.File) {
  if (!file) throw new BadRequestException('请上传资料文件。');
  if (file.size > MAX_FILE_SIZE) throw new BadRequestException('单文件最大 30MB。');
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new BadRequestException('仅允许上传 PDF、JPG、PNG、WEBP 文件。');
  }

  const originalName = file.originalname ?? '';
  if (!originalName.trim()) throw new BadRequestException('文件名不能为空。');
  if (/[\\/]/.test(originalName) || originalName.includes('..')) {
    throw new BadRequestException('文件名不安全，请重命名后再上传。');
  }

  const extension = extname(originalName).toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    throw new BadRequestException('文件扩展名不支持，请上传 PDF、JPG、PNG、WEBP。');
  }
  if (dangerousExtensions.some((dangerous) => originalName.toLowerCase().endsWith(dangerous))) {
    throw new BadRequestException('文件扩展名存在风险，已拒绝上传。');
  }
}

function operatorFromUser(user?: MockUser) {
  return user
    ? {
        operatorId: user.userId,
        operatorName: user.name,
        operatorRole: user.roleLabel,
      }
    : {};
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
      duplicateGroups.set(duplicateKey, [...(duplicateGroups.get(duplicateKey) ?? []), document]);
    }

    const items = await Promise.all(documents.map(async (document) => {
      const hasStoredFile = Boolean(document.storedFileName || document.storageKey);
      const status = rawStatus(document);
      const key = document.versionGroupKey ?? versionGroupKey(document);
      const duplicateKey = `${key}::${document.version}`;
      const duplicateVersionWarning = (duplicateGroups.get(duplicateKey)?.length ?? 0) > 1
        ? '当前产品已存在同类型同版本资料，建议改为新版本或进入版本历史查看。'
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
            : (!document.previewUrl || !document.previewType ? 'broken' : 'ok');
        }
      } catch {
        healthStatus = hasStoredFile ? 'missing_file' : 'demo';
      }

      const largeFileWarning = (document.fileSize ?? 0) > MAX_FILE_SIZE;
      return {
        documentId: docId(document),
        title: document.title,
        documentType: document.documentType,
        version: document.version,
        versionGroupKey: key,
        storageProvider: documentStorage.provider,
        storageKeyPresent: Boolean(documentStorage.storageKey),
        legacyStorageRecord: documentStorage.legacyRecord,
        previewMode: document.previewMode ?? (documentStorage.provider === 's3' ? 'signed-url' : 'proxy'),
        checksumAvailable: Boolean(document.checksumSha256),
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
        recommendedAction: recommendedAction(healthStatus, document, largeFileWarning, duplicateVersionWarning),
      };
    }));

    const duplicateVersionGroups = new Set(
      items
        .filter((item) => item.duplicateVersionWarning)
        .map((item) => `${item.versionGroupKey}::${item.version}`),
    ).size;

    return {
      scope: {
        planId: query.planId,
        productId: query.productId,
      },
      summary: {
        storageProvider: storageStatus.provider,
        storageConfigured: storageStatus.provider === 'local' ? storageStatus.localReady : storageStatus.s3Configured,
        totalDocuments: items.length,
        uploadedDocuments: items.filter((item) => item.source === 'manual_upload').length,
        mockDocuments: items.filter((item) => item.source === 'mock').length,
        previewableDocuments: items.filter((item) => item.canPreview).length,
        missingFiles: items.filter((item) => item.healthStatus === 'missing_file').length,
        brokenPreview: items.filter((item) => item.healthStatus === 'broken').length,
        demoOnly: items.filter((item) => item.healthStatus === 'demo').length,
        effectiveUploadedDocuments: items.filter((item) => item.source === 'manual_upload' && item.isEffective).length,
        pendingReviewDocuments: items.filter((item) => item.isPendingReview).length,
        expiredDocuments: items.filter((item) => item.isHistorical).length,
        unsupportedDocuments: items.filter((item) => item.healthStatus === 'unsupported').length,
        largeFileWarnings: items.filter((item) => item.largeFileWarning).length,
        duplicateVersionGroups,
      },
      items,
    };
  }

  async compare(dto: CompareDocumentsDto) {
    return this.documentRepository.compareDocuments(dto.documentIds);
  }

  async upload(dto: UploadDocumentDto, file?: Express.Multer.File, user?: MockUser) {
    if (!file) throw new BadRequestException('请上传资料文件。');
    validateUploadFile(file);
    if (!dto.productId) throw new BadRequestException('请先选择生产计划，再上传资料。');
    if (!dto.documentType) throw new BadRequestException('请选择资料类型。');
    if (!dto.title?.trim()) throw new BadRequestException('请填写资料标题。');
    if (!dto.version?.trim()) throw new BadRequestException('请填写版本号。');

    const existingDocuments = await this.documentRepository.findDocuments({
      productId: dto.productId,
      documentType: dto.documentType,
    });
    const groupKey = `${dto.productId}::${dto.documentType}::${dto.requiredForProcess}`;
    const duplicateVersionWarning = existingDocuments.some((document) => {
      const sameGroup = (document.versionGroupKey ?? versionGroupKey(document)) === groupKey;
      return sameGroup && document.version === dto.version;
    })
      ? '当前产品已存在同类型同版本资料，建议改为新版本或进入版本历史查看。'
      : undefined;

    const documentId = `UPDOC-${Date.now()}-${randomUUID()}`;
    const stored = await this.storageService.putObject({
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer,
      fileSize: file.size,
      prefix: 'documents',
      metadata: {
        productId: dto.productId,
        planId: dto.planId,
        documentType: dto.documentType,
        version: dto.version.trim(),
      },
    });
    const previewUrl = await this.storageService.createPreviewUrl(stored.storageKey, documentId);
    const downloadUrl = await this.storageService.createDownloadUrl(stored.storageKey, documentId, file.originalname);
    const document = await this.documentRepository.createDocument({
      documentId,
      productId: dto.productId,
      planId: dto.planId,
      documentType: dto.documentType,
      title: dto.title.trim(),
      version: dto.version.trim(),
      status: dto.status ?? 'effective',
      requiredForProcess: dto.requiredForProcess,
      keywords: parseKeywords(dto.keywords),
      remark: dto.remark,
      originalFileName: file.originalname,
      storedFileName: stored.storedFileName,
      storageProvider: stored.provider,
      storageKey: stored.storageKey,
      checksumSha256: stored.checksumSha256,
      previewMode: stored.previewMode,
      mimeType: file.mimetype,
      fileSize: file.size,
      previewType: previewTypeFor(file.mimetype),
      previewUrl,
      downloadUrl,
    });
    document.duplicateVersionWarning = duplicateVersionWarning;
    document.recommendedAction = '如需用于生产，请确认版本状态为当前有效。';

    await this.auditService.tryCreate({
      entityType: 'document',
      entityId: docId(document),
      action: 'document_uploaded',
      after: document,
      ...operatorFromUser(user),
      message: `上传资料 ${document.title} ${document.version}`,
      planId: document.planId,
      productId: document.productId,
    });
    return document;
  }

  async updateStatus(id: string, dto: UpdateDocumentStatusDto, user?: MockUser) {
    const before = clone(await this.findOne(id));
    const document = await this.documentRepository.updateDocumentStatus(id, dto);
    if (!document) throw new NotFoundException(`未找到可更新的资料：${id}`);
    await this.auditService.tryCreate({
      entityType: 'document',
      entityId: docId(document),
      action: 'document_status_changed',
      before,
      after: document,
      ...operatorFromUser(user),
      message: dto.reason ?? `资料状态改为 ${document.documentStatus}`,
      planId: document.planId,
      productId: document.productId,
    });
    return document;
  }

  async updateVersion(id: string, dto: UpdateDocumentVersionDto, user?: MockUser) {
    const before = clone(await this.findOne(id));
    const document = await this.documentRepository.updateDocumentVersion(id, dto);
    if (!document) throw new NotFoundException(`未找到可更新版本的资料：${id}`);
    await this.auditService.tryCreate({
      entityType: 'document',
      entityId: docId(document),
      action: 'document_version_changed',
      before,
      after: document,
      ...operatorFromUser(user),
      message: `资料版本改为 ${document.version}`,
      planId: document.planId,
      productId: document.productId,
    });
    return document;
  }

  async setEffective(id: string, dto: SetEffectiveDocumentDto, user?: MockUser) {
    const before = await this.findVersions(id);
    const result = await this.documentRepository.setEffectiveDocument(id, dto);
    if (!result) throw new NotFoundException(`未找到可设置有效版本的资料：${id}`);
    await this.auditService.tryCreate({
      entityType: 'document',
      entityId: docId(result.document),
      action: 'document_set_effective',
      before,
      after: result.versions,
      ...operatorFromUser(user),
      message: dto.reason ?? `设置 ${result.document.version} 为当前有效版本`,
      planId: result.document.planId,
      productId: result.document.productId,
    });
    if (result.readiness) {
      await this.auditService.tryCreate({
        entityType: 'plan',
        entityId: result.readiness.planId,
        action: 'readiness_recalculated',
        after: result.readiness,
        ...operatorFromUser(user),
        message: '设置有效版本后重新计算资料齐套性。',
        planId: result.readiness.planId,
        productId: result.document.productId,
      });
    }
    return result;
  }

  async archive(id: string, user?: MockUser) {
    const before = clone(await this.findOne(id));
    const document = await this.documentRepository.archiveDocument(id);
    if (!document) throw new NotFoundException(`未找到可归档的资料：${id}`);
    await this.auditService.tryCreate({
      entityType: 'document',
      entityId: docId(document),
      action: 'document_archived',
      before,
      after: document,
      ...operatorFromUser(user),
      message: `归档资料 ${document.title} ${document.version}`,
      planId: document.planId,
      productId: document.productId,
    });
    return document;
  }
}
