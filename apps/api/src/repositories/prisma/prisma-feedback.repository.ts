import { Injectable } from '@nestjs/common';
import { assertDatabaseWriteAllowed } from '../../database/database-safety';
import { PrismaService } from '../../database/prisma.service';
import type { FeedbackRecordMock } from '../../common/types/production.types';
import type { SubmitFeedbackDto } from '../../feedback/dto/submit-feedback.dto';
import type { FeedbackRepositoryInterface } from '../interfaces/feedback.repository.interface';
import { apiFeedbackTypeToPrisma, mapPrismaFeedback } from './prisma-mappers';

@Injectable()
export class PrismaFeedbackRepository implements FeedbackRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async createFeedback(payload: SubmitFeedbackDto): Promise<FeedbackRecordMock> {
    assertDatabaseWriteAllowed();
    const row = await this.prisma.client.$transaction(async (tx: any) => {
      await tx.productionPlan.update({
        where: { id: payload.planId },
        data: {
          status: 'EXCEPTION',
          confirmStatus: 'NEED_REVIEW',
        },
      });
      return tx.feedbackRecord.create({
        data: {
          productionPlanId: payload.planId,
          userId: payload.userId,
          feedbackType: apiFeedbackTypeToPrisma(payload.type),
          description: payload.description,
          status: 'OPEN',
        },
        include: { user: true },
      });
    });
    return mapPrismaFeedback(row);
  }

  async findFeedback(planId?: string): Promise<FeedbackRecordMock[]> {
    const rows = await this.prisma.client.feedbackRecord.findMany({
      where: {
        deletedAt: null,
        ...(planId ? { productionPlanId: planId } : {}),
      },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapPrismaFeedback);
  }
}
