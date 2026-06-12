import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { REPOSITORY_TOKENS } from '../common/constants/repository-tokens';
import { LocalStorageService } from '../storage/local-storage.service';
import type { DocumentRepositoryInterface } from '../repositories/interfaces/document.repository.interface';

@Injectable()
export class FilesService {
  constructor(
    private readonly localStorageService: LocalStorageService,
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
}
