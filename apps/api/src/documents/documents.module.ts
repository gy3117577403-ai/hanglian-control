import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule, AuditModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
