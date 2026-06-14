import type { PlanReadiness, ProductionPlanMock } from '../common/types/production.types';
import type { KnowledgeValidationResult } from '../knowledge/knowledge.types';

export type ExecutionStatus =
  | 'not_started'
  | 'ready_to_start'
  | 'running'
  | 'paused'
  | 'exception_hold'
  | 'completed'
  | 'cancelled';

export type ExecutionEventType =
  | 'prepare_start'
  | 'start'
  | 'process_confirm'
  | 'quantity_report'
  | 'pause'
  | 'resume'
  | 'exception_hold'
  | 'complete'
  | 'cancel'
  | 'handover';

export type ProcessConfirmType =
  | 'front_parameter_checked'
  | 'back_document_checked'
  | 'fixture_checked'
  | 'quality_checked'
  | 'first_piece_checked'
  | 'other';

export type ProcessConfirmResult = 'pass' | 'warning' | 'fail';

export interface ExecutionOperator {
  operatorId?: string;
  operatorName?: string;
  operatorRole?: string;
}

export interface ExecutionRecord {
  recordId: string;
  planId: string;
  eventType: ExecutionEventType;
  executionStatus: ExecutionStatus;
  statusBefore?: ExecutionStatus;
  statusAfter?: ExecutionStatus;
  confirmType?: ProcessConfirmType;
  result?: ProcessConfirmResult;
  remark?: string;
  operatorId: string;
  operatorName: string;
  operatorRole: string;
  createdAt: string;
}

export interface PlanStatusEvent {
  eventId: string;
  planId: string;
  eventType: ExecutionEventType;
  fromStatus?: ExecutionStatus;
  toStatus: ExecutionStatus;
  message: string;
  operatorId: string;
  operatorName: string;
  operatorRole: string;
  createdAt: string;
}

export interface QuantityReport {
  reportId: string;
  planId: string;
  completedQuantity: number;
  defectQuantity: number;
  reworkQuantity: number;
  scrapQuantity: number;
  cumulativeCompletedQuantity: number;
  planQuantity: number;
  warning?: string;
  remark?: string;
  operatorId: string;
  operatorName: string;
  operatorRole: string;
  createdAt: string;
}

export interface ShiftHandoverRecord {
  handoverId: string;
  fromTeam: string;
  toTeam: string;
  planIds: string[];
  summary: string;
  riskItems: string[];
  unfinishedItems: string[];
  operatorId: string;
  operatorName: string;
  operatorRole: string;
  createdAt: string;
}

export interface ExecutionTimelineItem {
  id: string;
  planId: string;
  eventType: ExecutionEventType;
  title: string;
  description: string;
  status?: ExecutionStatus;
  severity: 'info' | 'success' | 'warn' | 'danger';
  operatorName?: string;
  createdAt: string;
}

export interface StartPreparationResult {
  planId: string;
  allowed: boolean;
  allowWarningStart: boolean;
  readiness: PlanReadiness;
  knowledgeValidation: KnowledgeValidationResult;
  warnings: string[];
  blockers: string[];
  recommendations: string[];
  preparedStatus: ExecutionStatus;
  updatedAt: string;
}

export interface ExecutionPlanListItem extends ProductionPlanMock {
  executionStatus: ExecutionStatus;
  executionStatusLabel: string;
  completionRate: number;
  latestEvent?: PlanStatusEvent;
  latestQuantityReport?: QuantityReport;
}

export interface ExecutionPlanDetail extends ExecutionPlanListItem {
  readiness: PlanReadiness;
  knowledgeValidation: KnowledgeValidationResult;
  confirmations: ExecutionRecord[];
  quantityReports: QuantityReport[];
  timeline: ExecutionTimelineItem[];
  latestException?: ExecutionTimelineItem;
  handoverRecords: ShiftHandoverRecord[];
}

export interface ExecutionSummary {
  todayPlans: number;
  notStarted: number;
  running: number;
  paused: number;
  exceptionHold: number;
  completed: number;
  completionRate: number;
  exceptionCount: number;
  lastUpdatedAt: string;
}

export interface DailyReport {
  date: string;
  team?: string;
  processSegment?: string;
  planCount: number;
  plannedQuantity: number;
  completedQuantity: number;
  defectQuantity: number;
  reworkQuantity: number;
  scrapQuantity: number;
  runningPlans: number;
  completedPlans: number;
  exceptionHoldPlans: number;
  majorExceptions: string[];
  pendingReviewItems: string[];
  handovers: ShiftHandoverRecord[];
  generatedAt: string;
}
