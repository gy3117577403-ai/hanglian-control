import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DocumentsModule } from '../documents/documents.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { StorageModule } from '../storage/storage.module';
import { DeleteLockService } from '../unified-documents/helpers/delete-lock.service';
import { DocumentHubController } from './document-hub.controller';
import { DocumentHubService } from './document-hub.service';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { DocumentVersionService } from './document-version.service';
import { OrderImportService } from './order-import.service';
import { OrderStatusSyncService } from './order-status-sync.service';
import { PdfImportApplyService } from './pdf-import-apply.service';
import { PdfImportPreviewService } from './pdf-import-preview.service';
import { PdfImportTempStorageService } from './pdf-import-temp-storage.service';

@Module({
  imports: [DocumentsModule, StorageModule, AuditModule, PersistenceModule],
  controllers: [DocumentHubController],
  providers: [
    DocumentHubService,
    DocumentLifecycleService,
    DocumentVersionService,
    DeleteLockService,
    OrderStatusSyncService,
    OrderImportService,
    PdfImportPreviewService,
    PdfImportApplyService,
    PdfImportTempStorageService,
  ],
})
export class DocumentHubModule {}
