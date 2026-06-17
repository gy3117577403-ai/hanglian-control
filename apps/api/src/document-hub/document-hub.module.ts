import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { StorageModule } from '../storage/storage.module';
import { DeleteLockService } from '../unified-documents/helpers/delete-lock.service';
import { DocumentHubController } from './document-hub.controller';
import { DocumentHubService } from './document-hub.service';

@Module({
  imports: [DocumentsModule, StorageModule],
  controllers: [DocumentHubController],
  providers: [DocumentHubService, DeleteLockService],
})
export class DocumentHubModule {}
