import { Injectable } from '@nestjs/common';
import { assertDatabaseWriteAllowed } from '../../database/database-safety';
import { PrismaService } from '../../database/prisma.service';
import type { PlanStatus } from '../../common/enums/production.enum';
import type {
  PlanReadiness,
  ProductionPlanMock,
} from '../../common/types/production.types';
import { evaluatePlanReadiness } from '../../common/utils/readiness';
import type { ConfirmProductionPlanDto } from '../../production-plans/dto/confirm-production-plan.dto';
import type {
  ProductionPlanRepositoryInterface,
  ProductionPlanScope,
} from '../interfaces/production-plan.repository.interface';
import { mapPrismaPlan, prismaWriteMaps } from './prisma-mappers';

const PLAN_INCLUDE = {
  product: {
    include: {
      customer: true,
      frontParameters: {
        where: { deletedAt: null },
        orderBy: { updatedAt: 'desc' },
      },
      backPackages: {
        where: { deletedAt: null },
        orderBy: { updatedAt: 'desc' },
      },
      documents: {
        where: { deletedAt: null, archived: false },
        orderBy: { updatedAt: 'desc' },
      },
    },
  },
  documents: {
    where: { deletedAt: null, archived: false },
    orderBy: { updatedAt: 'desc' },
  },
};

@Injectable()
export class PrismaProductionPlanRepository implements ProductionPlanRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async findPlans(scope: ProductionPlanScope): Promise<ProductionPlanMock[]> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const rows = await this.prisma.client.productionPlan.findMany({
      where: {
        deletedAt: null,
        ...(scope === 'today'
          ? { planDate: { gte: todayStart, lt: todayEnd } }
          : {}),
        ...(scope === 'week'
          ? { planDate: { gte: todayStart, lt: weekEnd } }
          : {}),
      },
      orderBy: [{ planDate: 'asc' }, { planCode: 'asc' }],
      include: PLAN_INCLUDE,
    });

    return rows.map(mapPrismaPlan);
  }

  async findPlanById(id: string): Promise<ProductionPlanMock | undefined> {
    const row = await this.prisma.client.productionPlan.findFirst({
      where: { id, deletedAt: null },
      include: PLAN_INCLUDE,
    });
    return row ? mapPrismaPlan(row) : undefined;
  }

  async confirmPlan(
    id: string,
    payload: ConfirmProductionPlanDto,
  ): Promise<ProductionPlanMock | undefined> {
    assertDatabaseWriteAllowed();
    const before = await this.findPlanById(id);
    if (!before) return undefined;

    await this.prisma.client.$transaction([
      this.prisma.client.productionPlan.update({
        where: { id },
        data: {
          confirmStatus: 'CONFIRMED',
          readinessStatus:
            before.readiness?.readinessStatus === 'ready'
              ? 'READY'
              : 'NEED_REVIEW',
          readinessScore:
            before.readiness?.score ?? before.materialCompleteness,
          readinessSummary: before.readiness?.summary,
        },
      }),
      this.prisma.client.confirmationRecord.create({
        data: {
          productionPlanId: id,
          userId: payload.userId,
          role: payload.role,
          status: 'CONFIRMED',
          versionSnapshot: {
            productCode: before.productCode,
            productVersion: before.productVersion,
            frontDrawingVersion: before.front.drawingVersion,
            backDrawingVersion: before.back.drawingVersion,
            sopVersion: before.back.sopVersion,
          },
          remark: `V0.7 Prisma repository 草案确认：${payload.userName}`,
        },
      }),
    ]);

    return this.findPlanById(id);
  }

  async updatePlanStatus(
    id: string,
    status: PlanStatus,
  ): Promise<ProductionPlanMock | undefined> {
    assertDatabaseWriteAllowed();
    const current = await this.findPlanById(id);
    if (!current) return undefined;

    await this.prisma.client.productionPlan.update({
      where: { id },
      data: { status: prismaWriteMaps.planStatus[status] },
    });

    return this.findPlanById(id);
  }

  async completePlan(
    id: string,
    completedQuantity?: number,
  ): Promise<ProductionPlanMock | undefined> {
    assertDatabaseWriteAllowed();
    const current = await this.findPlanById(id);
    if (!current) return undefined;

    await this.prisma.client.productionPlan.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedQuantity: completedQuantity ?? current.plannedQuantity,
      },
    });

    return this.findPlanById(id);
  }

  async evaluateReadiness(planId: string): Promise<PlanReadiness | undefined> {
    const plan = await this.findPlanById(planId);
    return plan ? evaluatePlanReadiness(plan) : undefined;
  }
}
