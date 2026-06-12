import type { ProductionPlanSeed } from '../../common/types/production.types';
import { confirmStatusToPrisma, planStatusToPrisma, processToPrisma } from './shared';

export function mapProductionPlanSeedToPrisma(plan: ProductionPlanSeed) {
  return {
    id: plan.id,
    planCode: plan.id,
    planDate: new Date(`${plan.date}T00:00:00.000Z`),
    weekPlanCode: plan.weekPlanNo,
    sales: plan.sales,
    productId: plan.productId,
    processSegment: processToPrisma[plan.segment],
    plannedQuantity: plan.plannedQuantity,
    completedQuantity: plan.completedQuantity,
    status: planStatusToPrisma[plan.status],
    owner: plan.owner,
    materialCompleteness: plan.materialCompleteness,
    confirmStatus: confirmStatusToPrisma[plan.confirmationStatus],
    readinessStatus: plan.materialCompleteness >= 95 ? 'READY' : plan.materialCompleteness >= 85 ? 'NEED_REVIEW' : 'BLOCKED',
    readinessScore: plan.materialCompleteness,
    readinessSummary: plan.materialCompleteness >= 95 ? 'Mock 资料齐套' : 'Mock 资料需复核',
  };
}
