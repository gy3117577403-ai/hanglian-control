import type { SubmitFeedbackDto } from '../../feedback/dto/submit-feedback.dto';
import type { FeedbackRecordMock } from '../../common/types/production.types';

type MaybePromise<T> = T | Promise<T>;

export interface FeedbackRepositoryInterface {
  createFeedback(payload: SubmitFeedbackDto): MaybePromise<FeedbackRecordMock>;
  findFeedback(planId?: string): MaybePromise<FeedbackRecordMock[]>;
}
