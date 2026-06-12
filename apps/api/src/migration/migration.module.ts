import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../database/database.module';
import { MigrationController } from './migration.controller';
import { MigrationService } from './migration.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [MigrationController],
  providers: [MigrationService],
})
export class MigrationModule {}
