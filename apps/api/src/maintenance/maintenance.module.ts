import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';

@Module({
  imports: [AuditModule, StorageModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
})
export class MaintenanceModule {}
