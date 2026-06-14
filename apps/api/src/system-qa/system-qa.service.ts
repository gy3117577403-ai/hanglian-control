import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '../common/constants/repository-tokens';
import type { DocumentRepositoryInterface } from '../repositories/interfaces/document.repository.interface';
import type { FeedbackRepositoryInterface } from '../repositories/interfaces/feedback.repository.interface';
import { ExecutionService } from '../execution/execution.service';
import { executionStatusEventSeed, quantityReportSeed } from '../execution/mock/execution-seed';
import type { ExecutionRecord, PlanStatusEvent, QuantityReport, ShiftHandoverRecord } from '../execution/execution.types';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { mockStore } from '../mock/mock-store';
import { ProductionPlansService } from '../production-plans/production-plans.service';
import { LocalStorageService } from '../storage/local-storage.service';
import { buildAcceptanceReportText, completedModules, nextRoutes, notConnected, recommendedCommands, summarize } from './helpers/acceptance-report-builder';
import { buildBusinessFlowReport } from './helpers/business-flow-checker';
import { buildDataConsistencyReport } from './helpers/data-consistency-checker';
import { buildDemoReadinessReport } from './helpers/demo-readiness-checker';
import { buildPermissionRegressionReport } from './helpers/permission-regression-checker';
import type { SystemQaAcceptanceReport, SystemQaContext } from './system-qa.types';

@Injectable()
export class SystemQaService {
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

  async overview() {
    const [dataConsistency, businessFlow, permissionRegression, demoReadiness] = await Promise.all([
      this.dataConsistency(),
      this.businessFlow(),
      this.permissionRegression(),
      this.demoReadiness(),
    ]);
    const summary = summarize([
      ...dataConsistency.items,
      ...businessFlow.items,
      ...permissionRegression.warnings,
      ...demoReadiness.items,
    ]);
    return {
      version: 'V2.7',
      dataSource: 'mock',
      databaseConnected: false,
      wecomConnected: false,
      wecomLoginConnected: false,
      realVoiceConnected: false,
      modules: {
        plans: 'ok',
        documents: dataConsistency.errors.length ? 'fail' : 'ok',
        imports: 'ok',
        maintenance: 'ok',
        auth: permissionRegression.errors.length ? 'fail' : 'ok',
        knowledge: 'ok',
        execution: 'ok',
        analytics: 'ok',
        systemQa: 'ok',
      },
      summary,
      generatedAt: new Date().toISOString(),
    };
  }

  async dataConsistency() {
    return buildDataConsistencyReport(await this.context());
  }

  async businessFlow() {
    return buildBusinessFlowReport(await this.context());
  }

  permissionRegression() {
    return buildPermissionRegressionReport();
  }

  demoReadiness() {
    return buildDemoReadinessReport();
  }

  async acceptanceReport(): Promise<SystemQaAcceptanceReport> {
    const [dataConsistency, businessFlow, permissionRegression, demoReadiness] = await Promise.all([
      this.dataConsistency(),
      this.businessFlow(),
      this.permissionRegression(),
      this.demoReadiness(),
    ]);
    return {
      version: 'V2.7',
      releaseName: '线束车间平板管控系统全流程回归候选版',
      generatedAt: new Date().toISOString(),
      overview: {
        dataSource: 'mock',
        databaseConnected: false,
        wecomConnected: false,
        wecomLoginConnected: false,
        realVoiceConnected: false,
      },
      modules: {
        plans: 'ok',
        documents: dataConsistency.errors.length ? 'fail' : dataConsistency.warnings.length ? 'warning' : 'ok',
        imports: 'ok',
        maintenance: 'ok',
        auth: permissionRegression.warnings.length ? 'warning' : 'ok',
        knowledge: 'ok',
        execution: 'ok',
        analytics: 'ok',
        systemQa: 'ok',
      },
      checks: {
        dataConsistency,
        businessFlow,
        permissionRegression,
        demoReadiness,
      },
      completedModules,
      notConnected,
      recommendedCommands,
      nextRoutes,
    };
  }

  async acceptanceReportText() {
    return buildAcceptanceReportText(await this.acceptanceReport());
  }

  private async context(): Promise<SystemQaContext> {
    const plans = await this.productionPlansService.findAll('week');
    const documents = this.dedupe([
      ...await this.documentRepository.findDocuments({}),
      ...plans.flatMap((plan) => plan.documents ?? []),
    ], (document) => String(document.documentId ?? document.id ?? JSON.stringify(document)));
    return {
      plans,
      products: mockStore.products,
      customers: mockStore.customers,
      documents,
      fixtures: this.knowledgeService.fixtures({ limit: '500' }),
      abnormalCases: this.knowledgeService.abnormalCases({ limit: '500' }),
      qualityStandards: this.knowledgeService.qualityStandards({ limit: '500' }),
      knowledgeRecords: this.knowledgeService.history({ limit: '500' }),
      executionRecords: this.storage.readMetadataArraySync<ExecutionRecord>('execution-records.json', []),
      statusEvents: this.storage.readMetadataArraySync<PlanStatusEvent>('plan-status-events.json', executionStatusEventSeed),
      quantityReports: this.storage.readMetadataArraySync<QuantityReport>('quantity-reports.json', quantityReportSeed),
      handovers: this.storage.readMetadataArraySync<ShiftHandoverRecord>('shift-handover-records.json', []),
      importRecords: this.storage.readImportRecordsSync(),
      maintenanceRecords: this.storage.readMaintenanceRecordsSync(),
      auditLogs: this.storage.readAuditLogsSync(),
      feedbackRecords: await this.feedbackRepository.findFeedback(),
      generatedAt: new Date().toISOString(),
    };
  }

  private dedupe<T>(rows: T[], getKey: (row: T) => string) {
    const seen = new Set<string>();
    return rows.filter((row) => {
      const key = getKey(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
