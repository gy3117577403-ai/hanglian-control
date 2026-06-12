import type { FeedbackRecordMock } from '../../common/types/production.types';

const feedbackTypeToPrisma: Record<string, string> = {
  资料缺失: 'MISSING_DOCUMENT',
  版本异常: 'VERSION_EXCEPTION',
  参数不一致: 'PARAMETER_MISMATCH',
  图纸不清晰: 'UNCLEAR_DRAWING',
  'SOP 与现场不符': 'SOP_SITE_MISMATCH',
  其他: 'OTHER',
};

export function mapFeedbackRecordToPrisma(record: FeedbackRecordMock) {
  return {
    id: record.id,
    productionPlanId: record.planId,
    userId: record.userId,
    feedbackType: feedbackTypeToPrisma[record.type] ?? 'OTHER',
    description: record.description,
    status: 'OPEN',
    createdAt: new Date(record.createdAt),
  };
}
