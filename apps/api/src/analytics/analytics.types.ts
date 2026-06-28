import type { FeedbackRecordMock, ProductDocument, ProductionPlanMock } from '../common/types/production.types';
import type { AbnormalCaseKnowledge, FixtureKnowledge, KnowledgeRecord, QualityStandardKnowledge } from '../knowledge/knowledge.types';
import type { ExecutionPlanListItem, ExecutionRecord, PlanStatusEvent, QuantityReport } from '../execution/execution.types';

export type AnalyticsRange = 'today' | 'week' | 'month' | 'all';
export type AnalyticsProcessSegment = 'front' | 'back' | 'common' | 'all';

export interface AnalyticsFilters {
  range: AnalyticsRange;
  dateFrom?: string;
  dateTo?: string;
  team?: string;
  processSegment: AnalyticsProcessSegment;
  customerId?: string;
  productId?: string;
  role?: string;
}

export interface AnalyticsChartPoint {
  name: string;
  value: number;
}

export interface AnalyticsTrendPoint {
  date: string;
  completionRate: number;
  defectRate: number;
  exceptionCount: number;
  pendingReviewDocuments: number;
  missingFiles: number;
  pendingKnowledge: number;
}

export interface AnalyticsRankingItem {
  rank: number;
  customer?: string;
  productCode?: string;
  productName?: string;
  category?: string;
  count: number;
  action: string;
}

export interface AnalyticsDataContext {
  filters: AnalyticsFilters;
  plans: ProductionPlanMock[];
  executionPlans: ExecutionPlanListItem[];
  executionRecords: ExecutionRecord[];
  statusEvents: PlanStatusEvent[];
  quantityReports: QuantityReport[];
  feedbackRecords: FeedbackRecordMock[];
  documents: ProductDocument[];
  fixtures: FixtureKnowledge[];
  abnormalCases: AbnormalCaseKnowledge[];
  qualityStandards: QualityStandardKnowledge[];
  knowledgeRecords: KnowledgeRecord[];
  importRecords: unknown[];
  maintenanceRecords: unknown[];
  auditLogs: unknown[];
  snapshot: DemoAnalyticsSnapshot;
}

export interface DemoAnalyticsSnapshot {
  generatedAt: string;
  source: 'demo-analytics-snapshot';
  trends: AnalyticsTrendPoint[];
  notes: string[];
}
