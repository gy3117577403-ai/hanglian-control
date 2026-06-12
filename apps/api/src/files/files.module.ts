import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule, AuditModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
