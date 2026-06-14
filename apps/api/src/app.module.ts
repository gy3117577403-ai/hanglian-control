import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { DocumentsModule } from './documents/documents.module';
import { FeedbackModule } from './feedback/feedback.module';
import { FilesModule } from './files/files.module';
import { HealthModule } from './health/health.module';
import { ImportsModule } from './imports/imports.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { MigrationModule } from './migration/migration.module';
import { ProductionPlansModule } from './production-plans/production-plans.module';
import { ProductsModule } from './products/products.module';
import { SearchModule } from './search/search.module';
import { SystemModule } from './system/system.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env.local', 'apps/api/.env', '.env.local', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    AuditModule,
    ProductionPlansModule,
    ProductsModule,
    DocumentsModule,
    FilesModule,
    ImportsModule,
    MaintenanceModule,
    MigrationModule,
    SearchModule,
    FeedbackModule,
    SystemModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
