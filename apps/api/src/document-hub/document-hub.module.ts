import { Module } from '@nestjs/common';
import { DocumentHubController } from './document-hub.controller';
import { DocumentHubService } from './document-hub.service';

@Module({
  controllers: [DocumentHubController],
  providers: [DocumentHubService],
})
export class DocumentHubModule {}
