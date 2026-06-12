import type { ConfirmationRecordSeed } from '../../common/types/production.types';

export function mapConfirmationRecordToPrisma(record: ConfirmationRecordSeed) {
  return {
    id: record.id,
    productionPlanId: record.planId,
    userId: record.userId,
    status: 'CONFIRMED',
    role: record.role,
    versionSnapshot: {
      source: 'mock-seed',
      userName: record.userName,
    },
    remark: `Mock 确认记录：${record.userName}`,
    createdAt: new Date(record.createdAt),
  };
}
