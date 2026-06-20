import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { StorageModule } from '../storage/storage.module';
import { DeleteLockService } from '../unified-documents/helpers/delete-lock.service';
import { DocumentHubController } from './document-hub.controller';
import { DocumentHubService } from './document-hub.service';
import { DrawingMetadataStore } from './drawing-metadata.store';
import { PdfImportPreviewService } from './pdf-import-preview.service';
import { PdfImportTempStorageService } from './pdf-import-temp-storage.service';

@Module({
  imports: [DocumentsModule, StorageModule],
  controllers: [DocumentHubController],
  providers: [DocumentHubService, DeleteLockService, DrawingMetadataStore, PdfImportPreviewService, PdfImportTempStorageService],
})
export class DocumentHubModule {}
