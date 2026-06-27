import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from './audit/audit.module';
import { CustomersModule } from './customers/customers.module';
import { DatabaseModule } from './database/database.module';
import { DocumentsModule } from './documents/documents.module';
import { FeedbackModule } from './feedback/feedback.module';
import { FilesModule } from './files/files.module';
import { HealthModule } from './health/health.module';
import { MigrationModule } from './migration/migration.module';
import { OrdersModule } from './orders/orders.module';
import { ProductionPlansModule } from './production-plans/production-plans.module';
import { ProductsModule } from './products/products.module';
import { SearchModule } from './search/search.module';
import { SystemModule } from './system/system.module';

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
    DatabaseModule,
    HealthModule,
    AuditModule,
    OrdersModule,
    CustomersModule,
    ProductionPlansModule,
    ProductsModule,
    DocumentsModule,
    FilesModule,
    MigrationModule,
    SearchModule,
    FeedbackModule,
    SystemModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
