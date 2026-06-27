import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { DatabaseModule } from './database/database.module';
import { DocumentHubModule } from './document-hub/document-hub.module';
import { DocumentsModule } from './documents/documents.module';
import { ExecutionModule } from './execution/execution.module';
import { FeedbackModule } from './feedback/feedback.module';
import { FilesModule } from './files/files.module';
import { HealthModule } from './health/health.module';
import { ImportsModule } from './imports/imports.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { MigrationModule } from './migration/migration.module';
import { OrdersModule } from './orders/orders.module';
import { ProductionPlansModule } from './production-plans/production-plans.module';
import { ProductsModule } from './products/products.module';
import { RuntimeModule } from './runtime/runtime.module';
import { SearchModule } from './search/search.module';
import { SettingsModule } from './settings/settings.module';
import { SystemModule } from './system/system.module';
import { SystemQaModule } from './system-qa/system-qa.module';
import { UnifiedDocumentsModule } from './unified-documents/unified-documents.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        'apps/api/.env.local',
        'apps/api/.env',
        '.env.local',
        '.env',
      ],
    }),
    AuthModule,
    DatabaseModule,
    AnalyticsModule,
    HealthModule,
    AuditModule,
    OrdersModule,
    CustomersModule,
    ProductionPlansModule,
    ProductsModule,
    DocumentsModule,
    DocumentHubModule,
    ExecutionModule,
    FilesModule,
    ImportsModule,
    KnowledgeModule,
    MaintenanceModule,
    MigrationModule,
    RuntimeModule,
    SearchModule,
    SettingsModule,
    FeedbackModule,
    SystemModule,
    SystemQaModule,
    UnifiedDocumentsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
