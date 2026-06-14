import { Module } from '@nestjs/common';
import { ExecutionModule } from '../execution/execution.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { ProductionPlansModule } from '../production-plans/production-plans.module';
import { StorageModule } from '../storage/storage.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [ExecutionModule, KnowledgeModule, ProductionPlansModule, StorageModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
