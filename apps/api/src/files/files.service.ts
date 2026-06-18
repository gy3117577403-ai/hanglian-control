import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { REPOSITORY_TOKENS } from '../common/constants/repository-tokens';
import { LocalStorageService } from '../storage/local-storage.service';
import { StorageService } from '../storage/storage.service';
import type { DocumentRepositoryInterface } from '../repositories/interfaces/document.repository.interface';

@Injectable()
export class FilesService {
  constructor(
    private readonly localStorageService: LocalStorageService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
    @Inject(REPOSITORY_TOKENS.document)
    private readonly documentRepository: DocumentRepositoryInterface,
  ) {}

  async getFile(storedFileName: string) {
    const file = await this.localStorageService.getStoredFile(storedFileName);
    if (!file) throw new NotFoundException('文件不存在或文件名非法。');

    const document = (await this.documentRepository.findDocuments()).find((item) => item.storedFileName === storedFileName);
    if (document) {
      await this.auditService.tryCreate({
        entityType: 'file',
        entityId: storedFileName,
        action: 'document_previewed',
        message: `预览资料文件 ${document.title} ${document.version}`,
        planId: document.planId,
        productId: document.productId,
        after: {
          documentId: document.documentId,
          storedFileName,
          mimeType: file.mimeType,
          size: file.size,
        },
      });
    }

    return file;
  }

  async getDocumentFile(documentId: string, action: 'document_previewed' | 'document_downloaded' = 'document_previewed') {
    const document = await this.documentRepository.findDocumentById(documentId);
    if (!document) throw new NotFoundException('Document record not found.');

    const file = await this.storageService.getDocumentStream(document);
    if (!file) throw new NotFoundException('Stored document file not found.');

    await this.auditService.tryCreate({
      entityType: 'file',
      entityId: document.documentId ?? document.id,
      action,
      message: `${action === 'document_downloaded' ? 'Download' : 'Preview'} document ${document.title} ${document.version}`,
      planId: document.planId,
      productId: document.productId,
      after: {
        documentId: document.documentId,
        storageProvider: file.provider,
        storageKeyPresent: Boolean(file.storageKey),
        mimeType: file.mimeType,
        size: file.fileSize,
      },
    });

    return {
      ...file,
      fileName: document.originalFileName ?? document.title ?? document.storedFileName ?? 'document',
    };
  }
}
