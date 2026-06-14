import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '../common/constants/repository-tokens';
import type { CheckItemStatus } from '../common/enums/production.enum';
import type { PlanReadiness } from '../common/types/production.types';
import { KnowledgeService } from '../knowledge/knowledge.service';
import type { ProductionPlanRepositoryInterface } from '../repositories/interfaces/production-plan.repository.interface';
import { ConfirmProductionPlanDto } from './dto/confirm-production-plan.dto';

@Injectable()
export class ProductionPlansService {
  constructor(
    @Inject(REPOSITORY_TOKENS.productionPlan)
    private readonly productionPlanRepository: ProductionPlanRepositoryInterface,
    private readonly knowledgeService: KnowledgeService,
  ) {}

  async findAll(scope: 'today' | 'week' = 'today') {
    return this.productionPlanRepository.findPlans(scope);
  }

  async findOne(id: string) {
    const plan = await this.productionPlanRepository.findPlanById(id);
    if (!plan) {
      throw new NotFoundException(`未找到生产计划：${id}`);
    }
    return {
      ...plan,
      readiness: this.withKnowledgeReadiness(id, plan.readiness),
    };
  }

  async confirm(id: string, dto: ConfirmProductionPlanDto) {
    const plan = await this.productionPlanRepository.confirmPlan(id, dto);
    if (!plan) {
      throw new NotFoundException(`未找到生产计划：${id}`);
    }
    return plan;
  }

  async readiness(id: string): Promise<PlanReadiness> {
    const readiness = await this.productionPlanRepository.evaluateReadiness(id);
    if (!readiness) {
      throw new NotFoundException(`未找到生产计划：${id}`);
    }
    return this.withKnowledgeReadiness(id, readiness) as PlanReadiness;
  }

  private withKnowledgeReadiness(
    planId: string,
    readiness: Awaited<ReturnType<ProductionPlanRepositoryInterface['evaluateReadiness']>>,
  ): PlanReadiness | undefined {
    if (!readiness) return readiness;
    const validation = this.knowledgeService.planValidation(planId);
    const knowledgeStatus: CheckItemStatus = validation.validationStatus === 'ready'
      ? 'pass'
      : validation.validationStatus === 'need_review'
        ? 'warning'
        : 'fail';
    const checkItems: PlanReadiness['checkItems'] = [
      ...readiness.checkItems,
      {
        key: 'field_knowledge_validation',
        label: '现场知识检查',
        required: true,
        status: knowledgeStatus,
        message: `${validation.summary} / ${validation.score}分`,
      },
      {
        key: 'field_fixture_ready',
        label: '治具齐套',
        required: true,
        status: validation.fixtureSummary.active ? 'pass' : validation.fixtureSummary.total ? 'warning' : 'fail',
        message: `治具 ${validation.fixtureSummary.total} 个，有效 ${validation.fixtureSummary.active ?? 0} 个`,
      },
      {
        key: 'field_quality_ready',
        label: '质量标准',
        required: true,
        status: validation.qualitySummary.effective ? 'pass' : validation.qualitySummary.total ? 'warning' : 'fail',
        message: `质量标准 ${validation.qualitySummary.total} 条，有效 ${validation.qualitySummary.effective ?? 0} 条`,
      },
    ];
    const score = Math.min(readiness.score, validation.score);
    const readinessStatus = validation.validationStatus === 'blocked'
      ? 'blocked'
      : validation.validationStatus === 'need_review' && readiness.readinessStatus === 'ready'
        ? 'need_review'
        : readiness.readinessStatus;
    return {
      ...readiness,
      readinessStatus,
      score,
      summary: readinessStatus === 'ready'
        ? '资料与现场知识齐套，可开工'
        : readinessStatus === 'need_review'
          ? '资料或现场知识需复核'
          : '资料或现场知识存在阻塞项，不建议开工',
      checkItems,
      versionAlerts: [
        ...readiness.versionAlerts,
        ...validation.recommendations
          .filter((item) => item.level !== 'info')
          .slice(0, 3)
          .map((item) => ({
            level: item.level === 'danger' ? 'danger' as const : 'warning' as const,
            message: `${item.title}：${item.action}`,
          })),
      ].slice(0, 10),
    };
  }
}
