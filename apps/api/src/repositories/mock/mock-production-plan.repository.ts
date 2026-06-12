import { Injectable } from '@nestjs/common';
import { evaluatePlanReadiness } from '../../common/utils/readiness';
import { mockStore } from '../../mock/production.mock';
import type { ConfirmationRecordSeed, ProductionPlanMock } from '../../common/types/production.types';
import type { ConfirmProductionPlanDto } from '../../production-plans/dto/confirm-production-plan.dto';
import type { ProductionPlanRepositoryInterface } from '../interfaces/production-plan.repository.interface';
import { MockDocumentRepository } from './mock-document.repository';

@Injectable()
export class MockProductionPlanRepository implements ProductionPlanRepositoryInterface {
  constructor(private readonly documentRepository: MockDocumentRepository) {}

  findPlans(scope: 'today' | 'week' = 'today') {
    return mockStore.findPlansByScope(scope);
  }

  findPlanById(id: string) {
    const plan = mockStore.findPlanById(id);
    if (!plan) return undefined;
    return this.withReadiness(plan);
  }

  confirmPlan(id: string, payload: ConfirmProductionPlanDto) {
    const plan = mockStore.findPlanById(id);
    if (!plan) return undefined;

    plan.confirmationStatus = '已确认';
    plan.versionStatus = {
      ...plan.versionStatus,
      message: `${payload.userName}（${payload.role}）已完成 Mock 确认。`,
    };

    mockStore.confirmationRecords.unshift({
      id: `CR-${Date.now()}`,
      planId: id,
      userId: payload.userId,
      userName: payload.userName,
      role: payload.role,
      createdAt: new Date().toISOString(),
    } satisfies ConfirmationRecordSeed);

    return this.withReadiness(plan);
  }

  evaluateReadiness(planId: string) {
    const plan = mockStore.findPlanById(planId);
    if (!plan) return undefined;
    return evaluatePlanReadiness(this.withDocuments(plan));
  }

  private withReadiness(plan: ProductionPlanMock) {
    const mergedPlan = this.withDocuments(plan);
    mergedPlan.readiness = evaluatePlanReadiness(mergedPlan);
    return mergedPlan;
  }

  private withDocuments(plan: ProductionPlanMock) {
    plan.documents = this.documentRepository.findDocumentsByPlan(plan.id);
    return plan;
  }
}
