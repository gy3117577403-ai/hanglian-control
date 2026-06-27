import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { DocumentFileAccessGuard } from '../documents/document-file-access.guard';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [DocumentsModule],
  controllers: [FilesController],
  providers: [FilesService, DocumentFileAccessGuard],
})
export class FilesModule {}
