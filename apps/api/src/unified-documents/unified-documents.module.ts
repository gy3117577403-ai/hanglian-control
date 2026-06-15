import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DocumentsModule } from '../documents/documents.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { StorageModule } from '../storage/storage.module';
import { DeleteLockService } from './helpers/delete-lock.service';
import { DeleteLockController, UnifiedDocumentsController } from './unified-documents.controller';
import { UnifiedDocumentsService } from './unified-documents.service';

@Module({
  imports: [StorageModule, AuditModule, DocumentsModule, KnowledgeModule],
  controllers: [UnifiedDocumentsController, DeleteLockController],
  providers: [UnifiedDocumentsService, DeleteLockService],
})
export class UnifiedDocumentsModule {}
