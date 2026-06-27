import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { DocumentFileAccessGuard } from './document-file-access.guard';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [StorageModule, AuditModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentFileAccessGuard],
  exports: [DocumentsService],
})
export class DocumentsModule {}
