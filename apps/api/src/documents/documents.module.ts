import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PdfPreviewService } from './pdf-preview.service';
import { PdfPreviewWorker } from './pdf-preview.worker';

@Module({
  imports: [StorageModule, AuditModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, PdfPreviewService, PdfPreviewWorker],
})
export class DocumentsModule {}
