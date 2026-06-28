import type { ConfirmProductionPlanDto } from '../../production-plans/dto/confirm-production-plan.dto';
import type { PlanStatus } from '../../common/enums/production.enum';
import type {
  PlanReadiness,
  ProductionPlanMock,
} from '../../common/types/production.types';

type MaybePromise<T> = T | Promise<T>;
export type ProductionPlanScope = 'all' | 'today' | 'week';

export interface ProductionPlanRepositoryInterface {
  findPlans(scope: ProductionPlanScope): MaybePromise<ProductionPlanMock[]>;
  findPlanById(id: string): MaybePromise<ProductionPlanMock | undefined>;
  confirmPlan(
    id: string,
    payload: ConfirmProductionPlanDto,
  ): MaybePromise<ProductionPlanMock | undefined>;
  updatePlanStatus(
    id: string,
    status: PlanStatus,
  ): MaybePromise<ProductionPlanMock | undefined>;
  completePlan(
    id: string,
    completedQuantity?: number,
  ): MaybePromise<ProductionPlanMock | undefined>;
  evaluateReadiness(planId: string): MaybePromise<PlanReadiness | undefined>;
}
