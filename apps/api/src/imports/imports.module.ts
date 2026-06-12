import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';

@Module({
  imports: [AuditModule, StorageModule],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
