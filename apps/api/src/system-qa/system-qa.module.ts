import { Module } from '@nestjs/common';
import { ExecutionModule } from '../execution/execution.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { ProductionPlansModule } from '../production-plans/production-plans.module';
import { StorageModule } from '../storage/storage.module';
import { SystemQaController } from './system-qa.controller';
import { SystemQaService } from './system-qa.service';

@Module({
  imports: [ExecutionModule, KnowledgeModule, ProductionPlansModule, StorageModule],
  controllers: [SystemQaController],
  providers: [SystemQaService],
})
export class SystemQaModule {}
