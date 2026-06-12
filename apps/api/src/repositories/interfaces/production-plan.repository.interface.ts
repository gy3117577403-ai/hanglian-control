import type { ConfirmProductionPlanDto } from '../../production-plans/dto/confirm-production-plan.dto';
import type { PlanReadiness, ProductionPlanMock } from '../../common/types/production.types';

type MaybePromise<T> = T | Promise<T>;

export interface ProductionPlanRepositoryInterface {
  findPlans(scope: 'today' | 'week'): MaybePromise<ProductionPlanMock[]>;
  findPlanById(id: string): MaybePromise<ProductionPlanMock | undefined>;
  confirmPlan(id: string, payload: ConfirmProductionPlanDto): MaybePromise<ProductionPlanMock | undefined>;
  evaluateReadiness(planId: string): MaybePromise<PlanReadiness | undefined>;
}
