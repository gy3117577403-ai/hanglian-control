import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DocumentsModule } from '../documents/documents.module';
import { StorageModule } from '../storage/storage.module';
import { DeleteLockService } from '../unified-documents/helpers/delete-lock.service';
import { DocumentHubController } from './document-hub.controller';
import { DocumentHubService } from './document-hub.service';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { DrawingMetadataStore } from './drawing-metadata.store';
import { PdfImportApplyService } from './pdf-import-apply.service';
import { PdfImportPreviewService } from './pdf-import-preview.service';
import { PdfImportTempStorageService } from './pdf-import-temp-storage.service';

@Module({
  imports: [DocumentsModule, StorageModule, AuditModule],
  controllers: [DocumentHubController],
  providers: [
    DocumentHubService,
    DocumentLifecycleService,
    DeleteLockService,
    DrawingMetadataStore,
    PdfImportPreviewService,
    PdfImportApplyService,
    PdfImportTempStorageService,
  ],
})
export class DocumentHubModule {}
