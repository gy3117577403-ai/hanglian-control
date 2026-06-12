import { Injectable } from '@nestjs/common';
import { mockStore } from '../../mock/production.mock';
import type { FeedbackRecordMock } from '../../common/types/production.types';
import type { SubmitFeedbackDto } from '../../feedback/dto/submit-feedback.dto';
import type { FeedbackRepositoryInterface } from '../interfaces/feedback.repository.interface';

@Injectable()
export class MockFeedbackRepository implements FeedbackRepositoryInterface {
  createFeedback(payload: SubmitFeedbackDto): FeedbackRecordMock {
    return mockStore.addFeedback({
      id: `FB-${Date.now()}`,
      planId: payload.planId,
      type: payload.type,
      description: payload.description ?? '现场提交的 Mock 异常反馈',
      createdAt: new Date().toISOString(),
      userId: payload.userId,
      userName: payload.userName,
    });
  }

  findFeedback(planId?: string) {
    if (!planId) return mockStore.feedbackRecords;
    return mockStore.feedbackRecords.filter((record) => record.planId === planId);
  }
}
