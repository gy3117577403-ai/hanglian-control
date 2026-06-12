import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '../common/constants/repository-tokens';
import type { ProductionPlanRepositoryInterface } from '../repositories/interfaces/production-plan.repository.interface';
import { ConfirmProductionPlanDto } from './dto/confirm-production-plan.dto';

@Injectable()
export class ProductionPlansService {
  constructor(
    @Inject(REPOSITORY_TOKENS.productionPlan)
    private readonly productionPlanRepository: ProductionPlanRepositoryInterface,
  ) {}

  async findAll(scope: 'today' | 'week' = 'today') {
    return this.productionPlanRepository.findPlans(scope);
  }

  async findOne(id: string) {
    const plan = await this.productionPlanRepository.findPlanById(id);
    if (!plan) {
      throw new NotFoundException(`未找到生产计划：${id}`);
    }
    return plan;
  }

  async confirm(id: string, dto: ConfirmProductionPlanDto) {
    const plan = await this.productionPlanRepository.confirmPlan(id, dto);
    if (!plan) {
      throw new NotFoundException(`未找到生产计划：${id}`);
    }
    return plan;
  }

  async readiness(id: string) {
    const readiness = await this.productionPlanRepository.evaluateReadiness(id);
    if (!readiness) {
      throw new NotFoundException(`未找到生产计划：${id}`);
    }
    return readiness;
  }
}
