import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '../common/constants/repository-tokens';
import type { FeedbackRepositoryInterface } from '../repositories/interfaces/feedback.repository.interface';
import type { ProductionPlanRepositoryInterface } from '../repositories/interfaces/production-plan.repository.interface';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @Inject(REPOSITORY_TOKENS.feedback)
    private readonly feedbackRepository: FeedbackRepositoryInterface,
    @Inject(REPOSITORY_TOKENS.productionPlan)
    private readonly productionPlanRepository: ProductionPlanRepositoryInterface,
  ) {}

  async create(dto: SubmitFeedbackDto) {
    const plan = await this.productionPlanRepository.findPlanById(dto.planId);
    if (!plan) {
      throw new NotFoundException(`未找到生产计划：${dto.planId}`);
    }

    plan.status = '异常';
    plan.confirmationStatus = '需复核';

    const record = await this.feedbackRepository.createFeedback(dto);

    return {
      success: true,
      message: '异常反馈已写入记录',
      record,
    };
  }

  async findAll() {
    return this.feedbackRepository.findFeedback();
  }

  async findByPlan(planId?: string) {
    return this.feedbackRepository.findFeedback(planId);
  }
}
