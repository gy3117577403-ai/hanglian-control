import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DocumentsController } from './documents.controller';
import { DocumentFileAccessGuard } from './document-file-access.guard';
import { DocumentsService } from './documents.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule, AuditModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentFileAccessGuard],
  exports: [DocumentsService],
})
export class DocumentsModule {}
