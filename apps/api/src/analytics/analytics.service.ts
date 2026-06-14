import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '../common/constants/repository-tokens';
import type { DocumentRepositoryInterface } from '../repositories/interfaces/document.repository.interface';
import type { FeedbackRepositoryInterface } from '../repositories/interfaces/feedback.repository.interface';
import { ExecutionService } from '../execution/execution.service';
import { executionStatusEventSeed, quantityReportSeed } from '../execution/mock/execution-seed';
import type { ExecutionRecord, PlanStatusEvent, QuantityReport } from '../execution/execution.types';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { ProductionPlansService } from '../production-plans/production-plans.service';
import { LocalStorageService } from '../storage/local-storage.service';
import { aggregateDocuments, aggregateExceptions, aggregateKnowledge, aggregateOverview, aggregateProduction, aggregateQuantity, aggregateRankings, trendRows } from './helpers/analytics-aggregator';
import { buildAnalyticsSummaryText } from './helpers/analytics-summary-text';
import { filterPlansByQuery, normalizeFilters, processSegmentOfPlan } from './helpers/analytics-normalizer';
import { demoAnalyticsSnapshotSeed } from './mock/analytics-seed';
import type { AnalyticsDataContext } from './analytics.types';
import type { AnalyticsQueryDto } from './dto/analytics-query.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly productionPlansService: ProductionPlansService,
    private readonly executionService: ExecutionService,
    private readonly knowledgeService: KnowledgeService,
    private readonly storage: LocalStorageService,
    @Inject(REPOSITORY_TOKENS.document)
    private readonly documentRepository: DocumentRepositoryInterface,
    @Inject(REPOSITORY_TOKENS.feedback)
    private readonly feedbackRepository: FeedbackRepositoryInterface,
  ) {}

  async overview(query: AnalyticsQueryDto = {}) {
    return aggregateOverview(await this.context(query));
  }

  async production(query: AnalyticsQueryDto = {}) {
    return aggregateProduction(await this.context(query));
  }

  async quantity(query: AnalyticsQueryDto = {}) {
    return aggregateQuantity(await this.context(query));
  }

  async exceptions(query: AnalyticsQueryDto = {}) {
    return aggregateExceptions(await this.context(query));
  }

  async documents(query: AnalyticsQueryDto = {}) {
    return aggregateDocuments(await this.context(query));
  }

  async knowledge(query: AnalyticsQueryDto = {}) {
    return aggregateKnowledge(await this.context(query));
  }

  async trends(query: AnalyticsQueryDto = {}) {
    const ctx = await this.context(query);
    return {
      filters: ctx.filters,
      rows: trendRows(ctx),
      generatedAt: new Date().toISOString(),
    };
  }

  async rankings(query: AnalyticsQueryDto = {}) {
    return aggregateRankings(await this.context(query));
  }

  async summaryText(query: AnalyticsQueryDto = {}) {
    return buildAnalyticsSummaryText(await this.context(query));
  }

  private async context(query: AnalyticsQueryDto): Promise<AnalyticsDataContext> {
    const filters = normalizeFilters(query);
    const scope = filters.range === 'today' ? 'today' : 'week';
    const allPlans = await this.productionPlansService.findAll(scope);
    const plans = filterPlansByQuery(allPlans, filters);
    const planIds = new Set(plans.map((plan) => plan.id));
    const productIds = new Set(plans.map((plan) => plan.productId));
    const processSegment = filters.processSegment === 'all' ? undefined : filters.processSegment;
    const executionPlans = (await this.executionService.plans({
      scope,
      processSegment,
      customerId: filters.customerId,
      productId: filters.productId,
      leaderId: filters.team,
    })).filter((plan) => planIds.has(plan.id));
    const statusEvents = this.storage
      .readMetadataArraySync<PlanStatusEvent>('plan-status-events.json', executionStatusEventSeed)
      .filter((event) => planIds.has(event.planId));
    const executionRecords = this.storage
      .readMetadataArraySync<ExecutionRecord>('execution-records.json', [])
      .filter((record) => planIds.has(record.planId));
    const quantityReports = this.storage
      .readMetadataArraySync<QuantityReport>('quantity-reports.json', quantityReportSeed)
      .filter((report) => planIds.has(report.planId));
    const feedbackRecords = (await this.feedbackRepository.findFeedback()).filter((record) => planIds.has(record.planId));
    const storedDocuments = await this.documentRepository.findDocuments({});
    const documents = this.deduplicateDocuments([...storedDocuments, ...plans.flatMap((plan) => plan.documents)])
      .filter((document) => !document.productId || productIds.has(document.productId));
    const fixtures = this.knowledgeService.fixtures({ processSegment, limit: '500' })
      .filter((item) => productIds.has(item.productId) || !filters.productId);
    const abnormalCases = this.knowledgeService.abnormalCases({ processSegment, limit: '500' })
      .filter((item) => productIds.has(item.productId) || !filters.productId);
    const qualityStandards = this.knowledgeService.qualityStandards({ processSegment, limit: '500' })
      .filter((item) => productIds.has(item.productId) || !filters.productId);
    return {
      filters,
      plans,
      executionPlans,
      executionRecords,
      statusEvents,
      quantityReports,
      feedbackRecords,
      documents,
      fixtures,
      abnormalCases,
      qualityStandards,
      knowledgeRecords: this.knowledgeService.history({ limit: '500' }),
      importRecords: this.storage.readImportRecordsSync(),
      maintenanceRecords: this.storage.readMaintenanceRecordsSync(),
      auditLogs: this.storage.readAuditLogsSync(),
      snapshot: this.storage.readMetadataSync('demo-analytics-snapshot.json', demoAnalyticsSnapshotSeed),
    };
  }

  private deduplicateDocuments<T extends { documentId?: string; id?: string }>(documents: T[]) {
    const seen = new Set<string>();
    return documents.filter((document) => {
      const key = document.documentId ?? document.id ?? JSON.stringify(document);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
