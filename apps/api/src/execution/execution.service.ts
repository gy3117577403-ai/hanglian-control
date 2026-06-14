import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import type { ProductionPlanMock } from '../common/types/production.types';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { ProductionPlansService } from '../production-plans/production-plans.service';
import { LocalStorageService } from '../storage/local-storage.service';
import { CompletePlanDto } from './dto/complete-plan.dto';
import { ExecutionQueryDto } from './dto/execution-query.dto';
import { PausePlanDto } from './dto/pause-plan.dto';
import { ProcessConfirmationDto } from './dto/process-confirmation.dto';
import { QuantityReportDto } from './dto/quantity-report.dto';
import { ResumePlanDto } from './dto/resume-plan.dto';
import { ShiftHandoverDto } from './dto/shift-handover.dto';
import { StartPlanDto } from './dto/start-plan.dto';
import { ExceptionHoldDto } from './dto/status-transition.dto';
import { buildExecutionTimeline } from './helpers/execution-timeline';
import { clampNumber, executionStatusLabels, operatorFrom } from './helpers/execution-normalizer';
import { assertRunning, assertTransition } from './helpers/execution-validator';
import { executionStatusEventSeed, quantityReportSeed } from './mock/execution-seed';
import type {
  DailyReport,
  ExecutionEventType,
  ExecutionOperator,
  ExecutionPlanDetail,
  ExecutionPlanListItem,
  ExecutionRecord,
  ExecutionStatus,
  ExecutionSummary,
  PlanStatusEvent,
  QuantityReport,
  ShiftHandoverRecord,
  StartPreparationResult,
} from './execution.types';

const FILES = {
  records: 'execution-records.json',
  events: 'plan-status-events.json',
  quantities: 'quantity-reports.json',
  handovers: 'shift-handover-records.json',
} as const;

@Injectable()
export class ExecutionService {
  constructor(
    private readonly productionPlansService: ProductionPlansService,
    private readonly knowledgeService: KnowledgeService,
    private readonly storage: LocalStorageService,
    private readonly auditService: AuditService,
  ) {}

  async summary(): Promise<ExecutionSummary> {
    const plans = await this.plans({ scope: 'today' });
    const completed = plans.filter((plan) => plan.executionStatus === 'completed').length;
    const plannedQuantity = plans.reduce((total, plan) => total + plan.plannedQuantity, 0);
    const completedQuantity = plans.reduce((total, plan) => total + plan.completedQuantity, 0);
    return {
      todayPlans: plans.length,
      notStarted: plans.filter((plan) => ['not_started', 'ready_to_start'].includes(plan.executionStatus)).length,
      running: plans.filter((plan) => plan.executionStatus === 'running').length,
      paused: plans.filter((plan) => plan.executionStatus === 'paused').length,
      exceptionHold: plans.filter((plan) => plan.executionStatus === 'exception_hold').length,
      completed,
      completionRate: plannedQuantity ? Math.round((completedQuantity / plannedQuantity) * 100) : 0,
      exceptionCount: plans.filter((plan) => plan.executionStatus === 'exception_hold').length,
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  async plans(query: ExecutionQueryDto = {}): Promise<ExecutionPlanListItem[]> {
    const scope = query.scope === 'all' ? 'week' : query.scope ?? 'today';
    const plans = await this.productionPlansService.findAll(scope);
    const keyword = query.keyword?.trim().toLowerCase();
    return plans
      .map((plan) => this.decoratePlan(plan))
      .filter((plan) => !query.status || plan.executionStatus === query.status)
      .filter((plan) => !query.processSegment || String(plan.segment).includes(query.processSegment) || query.processSegment === 'common')
      .filter((plan) => !query.customerId || plan.customerId === query.customerId)
      .filter((plan) => !query.productId || plan.productId === query.productId)
      .filter((plan) => !query.leaderId || plan.owner === query.leaderId)
      .filter((plan) => !keyword || [
        plan.customer,
        plan.productCode,
        plan.productName,
        plan.owner,
        plan.weekPlanNo,
      ].some((value) => String(value ?? '').toLowerCase().includes(keyword)));
  }

  async detail(planId: string): Promise<ExecutionPlanDetail> {
    const plan = await this.getPlan(planId);
    const decorated = this.decoratePlan(plan);
    const readiness = plan.readiness ?? await this.productionPlansService.readiness(planId);
    const knowledgeValidation = this.knowledgeService.planValidation(planId);
    const records = this.records().filter((record) => record.planId === planId);
    const quantityReports = this.quantityReports().filter((record) => record.planId === planId);
    const handoverRecords = this.handovers().filter((record) => record.planIds.includes(planId));
    const statusEvents = this.events().filter((event) => event.planId === planId);
    const timeline = buildExecutionTimeline({
      statusEvents,
      records,
      quantityReports,
      handovers: handoverRecords,
    });
    return {
      ...decorated,
      readiness,
      knowledgeValidation,
      confirmations: records,
      quantityReports,
      timeline,
      latestException: timeline.filter((item) => item.eventType === 'exception_hold').at(-1),
      handoverRecords,
    };
  }

  async prepareStart(planId: string): Promise<StartPreparationResult> {
    const plan = await this.getPlan(planId);
    const readiness = plan.readiness ?? await this.productionPlansService.readiness(planId);
    const knowledgeValidation = this.knowledgeService.planValidation(planId);
    const blockers = [
      ...readiness.checkItems.filter((item) => item.status === 'fail').map((item) => item.message),
      ...readiness.versionAlerts.filter((item) => item.level === 'danger').map((item) => item.message),
      ...(knowledgeValidation.validationStatus === 'blocked' ? [knowledgeValidation.summary] : []),
    ];
    const warnings = [
      ...readiness.checkItems.filter((item) => item.status === 'warning').map((item) => item.message),
      ...readiness.versionAlerts.filter((item) => item.level === 'warning').map((item) => item.message),
      ...(knowledgeValidation.validationStatus === 'need_review' ? [knowledgeValidation.summary] : []),
    ];
    const status = this.currentStatus(planId, plan);
    if (!blockers.length && status === 'not_started') {
      this.transition(planId, 'ready_to_start', '开工前检查已完成，等待组长开工确认', 'prepare_start');
    }
    return {
      planId,
      allowed: !blockers.length,
      allowWarningStart: !blockers.length && warnings.length > 0,
      readiness,
      knowledgeValidation,
      warnings,
      blockers,
      recommendations: knowledgeValidation.recommendations.map((item) => `${item.title}：${item.action}`),
      preparedStatus: blockers.length ? status : status === 'not_started' ? 'ready_to_start' : status,
      updatedAt: new Date().toISOString(),
    };
  }

  async start(planId: string, dto: StartPlanDto) {
    const preparation = await this.prepareStart(planId);
    if (!preparation.allowed) {
      throw new BadRequestException(`Plan cannot start: ${preparation.blockers.join(' / ')}`);
    }
    if (preparation.warnings.length && !dto.allowWarningStart) {
      throw new BadRequestException('Plan has warnings. Set allowWarningStart=true to continue.');
    }
    const before = this.currentStatus(planId);
    if (before !== 'running') assertTransition(before, 'running');
    const event = this.transition(planId, 'running', dto.remark ?? '组长开工确认', 'start', dto);
    const record = this.record(planId, 'start', 'running', dto.remark ?? '开工确认', dto, before, 'running');
    await this.audit(planId, '生产执行开工确认', dto, { event, record });
    return this.detail(planId);
  }

  async processConfirm(planId: string, dto: ProcessConfirmationDto) {
    const status = this.currentStatus(planId);
    if (!['running', 'paused', 'exception_hold'].includes(status)) {
      throw new BadRequestException('Process confirmation requires an active execution state.');
    }
    const record = this.record(planId, 'process_confirm', status, dto.remark ?? dto.confirmType, dto, status, status, {
      confirmType: dto.confirmType,
      result: dto.result,
    });
    await this.audit(planId, '生产执行过程确认', dto, record);
    return record;
  }

  async quantityReport(planId: string, dto: QuantityReportDto) {
    const plan = await this.getPlan(planId);
    assertRunning(this.currentStatus(planId, plan), 'Quantity report');
    const completedQuantity = clampNumber(dto.completedQuantity);
    const defectQuantity = clampNumber(dto.defectQuantity);
    const reworkQuantity = clampNumber(dto.reworkQuantity);
    const scrapQuantity = clampNumber(dto.scrapQuantity);
    if (defectQuantity + reworkQuantity + scrapQuantity > completedQuantity) {
      throw new BadRequestException('Defect, rework and scrap quantities cannot exceed completed quantity.');
    }
    const previous = this.quantityReports()
      .filter((report) => report.planId === planId)
      .reduce((total, report) => total + report.completedQuantity, plan.completedQuantity ?? 0);
    const cumulativeCompletedQuantity = previous + completedQuantity;
    const warning = cumulativeCompletedQuantity > plan.plannedQuantity
      ? '累计完成数量超过计划数量，请组长复核。'
      : undefined;
    plan.completedQuantity = Math.min(cumulativeCompletedQuantity, Math.max(cumulativeCompletedQuantity, plan.completedQuantity));
    const operator = operatorFrom(dto);
    const report: QuantityReport = {
      reportId: `QTY-${Date.now()}-${randomUUID()}`,
      planId,
      completedQuantity,
      defectQuantity,
      reworkQuantity,
      scrapQuantity,
      cumulativeCompletedQuantity,
      planQuantity: plan.plannedQuantity,
      warning,
      remark: dto.remark,
      ...operator,
      createdAt: new Date().toISOString(),
    };
    this.writeQuantityReports([report, ...this.quantityReports()].slice(0, 1000));
    this.record(planId, 'quantity_report', 'running', dto.remark ?? '数量报工', dto);
    await this.audit(planId, '生产执行数量报工', dto, report);
    return report;
  }

  async pause(planId: string, dto: PausePlanDto) {
    const before = this.currentStatus(planId);
    assertTransition(before, 'paused');
    const event = this.transition(planId, 'paused', dto.reason, 'pause', dto);
    this.record(planId, 'pause', 'paused', dto.reason, dto, before, 'paused');
    await this.audit(planId, '生产执行暂停', dto, event);
    return this.detail(planId);
  }

  async resume(planId: string, dto: ResumePlanDto) {
    const before = this.currentStatus(planId);
    assertTransition(before, 'running');
    const event = this.transition(planId, 'running', dto.reason ?? '恢复生产', 'resume', dto);
    this.record(planId, 'resume', 'running', dto.reason ?? '恢复生产', dto, before, 'running');
    await this.audit(planId, '生产执行恢复', dto, event);
    return this.detail(planId);
  }

  async exceptionHold(planId: string, dto: ExceptionHoldDto) {
    const before = this.currentStatus(planId);
    assertTransition(before, 'exception_hold');
    const event = this.transition(planId, 'exception_hold', dto.reason, 'exception_hold', dto);
    this.record(planId, 'exception_hold', 'exception_hold', dto.reason, dto, before, 'exception_hold');
    await this.audit(planId, '生产执行异常停线', dto, event);
    return this.detail(planId);
  }

  async complete(planId: string, dto: CompletePlanDto) {
    const plan = await this.getPlan(planId);
    const before = this.currentStatus(planId, plan);
    assertTransition(before, 'completed');
    plan.completedQuantity = clampNumber(dto.finalCompletedQuantity);
    const report = await this.createFinalQuantityReport(plan, dto);
    const event = this.transition(planId, 'completed', dto.remark ?? '完工确认', 'complete', dto);
    this.record(planId, 'complete', 'completed', dto.remark ?? '完工确认', dto, before, 'completed');
    await this.audit(planId, '生产执行完工确认', dto, { event, report });
    return this.detail(planId);
  }

  timeline(planId: string) {
    return buildExecutionTimeline({
      statusEvents: this.events().filter((event) => event.planId === planId),
      records: this.records().filter((record) => record.planId === planId),
      quantityReports: this.quantityReports().filter((report) => report.planId === planId),
      handovers: this.handovers().filter((handover) => handover.planIds.includes(planId)),
    });
  }

  async createHandover(dto: ShiftHandoverDto) {
    const operator = operatorFrom(dto);
    const record: ShiftHandoverRecord = {
      handoverId: `HAND-${Date.now()}-${randomUUID()}`,
      fromTeam: dto.fromTeam,
      toTeam: dto.toTeam,
      planIds: dto.planIds,
      summary: dto.summary,
      riskItems: dto.riskItems ?? [],
      unfinishedItems: dto.unfinishedItems ?? [],
      ...operator,
      createdAt: new Date().toISOString(),
    };
    this.writeHandovers([record, ...this.handovers()].slice(0, 500));
    for (const planId of dto.planIds) {
      this.record(planId, 'handover', this.currentStatus(planId), dto.summary, dto);
      await this.audit(planId, '班组交接记录', dto, record);
    }
    return record;
  }

  handover(query: { planId?: string } = {}) {
    return this.handovers().filter((record) => !query.planId || record.planIds.includes(query.planId));
  }

  async dailyReport(query: { date?: string; team?: string; processSegment?: string } = {}): Promise<DailyReport> {
    const date = query.date ?? new Date().toISOString().slice(0, 10);
    const plans = (await this.plans({ scope: 'week', processSegment: query.processSegment }))
      .filter((plan) => !query.date || plan.date === date);
    const planIds = new Set(plans.map((plan) => plan.id));
    const reports = this.quantityReports().filter((report) => planIds.has(report.planId));
    const handovers = this.handovers().filter((record) => record.createdAt.slice(0, 10) === date);
    const exceptionEvents = this.events().filter((event) => planIds.has(event.planId) && event.toStatus === 'exception_hold');
    return {
      date,
      team: query.team,
      processSegment: query.processSegment,
      planCount: plans.length,
      plannedQuantity: plans.reduce((total, plan) => total + plan.plannedQuantity, 0),
      completedQuantity: reports.reduce((total, report) => total + report.completedQuantity, 0),
      defectQuantity: reports.reduce((total, report) => total + report.defectQuantity, 0),
      reworkQuantity: reports.reduce((total, report) => total + report.reworkQuantity, 0),
      scrapQuantity: reports.reduce((total, report) => total + report.scrapQuantity, 0),
      runningPlans: plans.filter((plan) => plan.executionStatus === 'running').length,
      completedPlans: plans.filter((plan) => plan.executionStatus === 'completed').length,
      exceptionHoldPlans: plans.filter((plan) => plan.executionStatus === 'exception_hold').length,
      majorExceptions: exceptionEvents.slice(0, 8).map((event) => event.message),
      pendingReviewItems: plans
        .filter((plan) => plan.readiness?.readinessStatus === 'need_review')
        .slice(0, 8)
        .map((plan) => `${plan.productCode} ${plan.productName} 需要复核`),
      handovers,
      generatedAt: new Date().toISOString(),
    };
  }

  async dailyReportText(query: { date?: string; team?: string; processSegment?: string } = {}) {
    const report = await this.dailyReport(query);
    return [
      `线束车间现场日报 ${report.date}`,
      `班组：${report.team ?? '全部班组'}`,
      `计划数：${report.planCount}`,
      `计划数量：${report.plannedQuantity}`,
      `完成数量：${report.completedQuantity}`,
      `不良/返工/报废：${report.defectQuantity}/${report.reworkQuantity}/${report.scrapQuantity}`,
      `生产中：${report.runningPlans}，已完工：${report.completedPlans}，异常停线：${report.exceptionHoldPlans}`,
      `主要异常：${report.majorExceptions.length ? report.majorExceptions.join('；') : '无'}`,
      `待复核事项：${report.pendingReviewItems.length ? report.pendingReviewItems.join('；') : '无'}`,
      `班组交接：${report.handovers.length} 条`,
      '数据来源：本地 Mock / metadata，未连接 Sealos、企业微信微盘或真实语音。',
    ].join('\n');
  }

  private async getPlan(planId: string) {
    const plan = await this.productionPlansService.findOne(planId);
    if (!plan) throw new NotFoundException(`Plan not found: ${planId}`);
    return plan;
  }

  private decoratePlan(plan: ProductionPlanMock): ExecutionPlanListItem {
    const latestEvent = this.latestEvent(plan.id);
    const latestQuantityReport = this.quantityReports().filter((report) => report.planId === plan.id).at(0);
    const executionStatus = this.currentStatus(plan.id, plan);
    const completedQuantity = latestQuantityReport?.cumulativeCompletedQuantity ?? plan.completedQuantity;
    return {
      ...plan,
      completedQuantity,
      executionStatus,
      executionStatusLabel: executionStatusLabels[executionStatus],
      completionRate: plan.plannedQuantity ? Math.min(120, Math.round((completedQuantity / plan.plannedQuantity) * 100)) : 0,
      latestEvent,
      latestQuantityReport,
    };
  }

  private currentStatus(planId: string, plan?: { completedQuantity?: number; plannedQuantity?: number }): ExecutionStatus {
    const latest = this.latestEvent(planId);
    if (latest) return latest.toStatus;
    if (plan?.plannedQuantity && (plan.completedQuantity ?? 0) >= plan.plannedQuantity) return 'completed';
    return 'not_started';
  }

  private latestEvent(planId: string) {
    return this.events()
      .filter((event) => event.planId === planId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .at(0);
  }

  private transition(planId: string, toStatus: ExecutionStatus, message: string, eventType: ExecutionEventType, user?: ExecutionOperator) {
    const fromStatus = this.currentStatus(planId);
    const operator = operatorFrom(user);
    const event: PlanStatusEvent = {
      eventId: `EVT-${Date.now()}-${randomUUID()}`,
      planId,
      eventType,
      fromStatus,
      toStatus,
      message,
      ...operator,
      createdAt: new Date().toISOString(),
    };
    this.writeEvents([event, ...this.events()].slice(0, 1000));
    return event;
  }

  private record(
    planId: string,
    eventType: ExecutionEventType,
    executionStatus: ExecutionStatus,
    remark?: string,
    user?: ExecutionOperator,
    statusBefore?: ExecutionStatus,
    statusAfter?: ExecutionStatus,
    extra: Partial<ExecutionRecord> = {},
  ) {
    const operator = operatorFrom(user);
    const record: ExecutionRecord = {
      recordId: `EXEC-${Date.now()}-${randomUUID()}`,
      planId,
      eventType,
      executionStatus,
      statusBefore,
      statusAfter,
      remark,
      ...extra,
      ...operator,
      createdAt: new Date().toISOString(),
    };
    this.writeRecords([record, ...this.records()].slice(0, 1000));
    return record;
  }

  private async createFinalQuantityReport(plan: ProductionPlanMock, dto: CompletePlanDto) {
    const operator = operatorFrom(dto);
    const report: QuantityReport = {
      reportId: `QTY-${Date.now()}-${randomUUID()}`,
      planId: plan.id,
      completedQuantity: clampNumber(dto.finalCompletedQuantity),
      defectQuantity: clampNumber(dto.finalDefectQuantity),
      reworkQuantity: 0,
      scrapQuantity: 0,
      cumulativeCompletedQuantity: clampNumber(dto.finalCompletedQuantity),
      planQuantity: plan.plannedQuantity,
      warning: dto.finalCompletedQuantity > plan.plannedQuantity ? '完工数量超过计划数量，请复核。' : undefined,
      remark: dto.remark,
      ...operator,
      createdAt: new Date().toISOString(),
    };
    this.writeQuantityReports([report, ...this.quantityReports()].slice(0, 1000));
    return report;
  }

  private async audit(planId: string, message: string, operator: ExecutionOperator | undefined, after: unknown) {
    const user = operatorFrom(operator);
    await this.auditService.tryCreate({
      entityType: 'system',
      entityId: planId,
      action: 'maintenance_recorded',
      message,
      after,
      operatorId: user.operatorId,
      operatorName: user.operatorName,
      operatorRole: user.operatorRole,
      planId,
    });
  }

  private records() {
    return this.storage.readMetadataArraySync<ExecutionRecord>(FILES.records, []);
  }

  private writeRecords(rows: ExecutionRecord[]) {
    this.storage.writeMetadataArraySync(FILES.records, rows);
  }

  private events() {
    return this.storage.readMetadataArraySync<PlanStatusEvent>(FILES.events, executionStatusEventSeed);
  }

  private writeEvents(rows: PlanStatusEvent[]) {
    this.storage.writeMetadataArraySync(FILES.events, rows);
  }

  private quantityReports() {
    return this.storage.readMetadataArraySync<QuantityReport>(FILES.quantities, quantityReportSeed);
  }

  private writeQuantityReports(rows: QuantityReport[]) {
    this.storage.writeMetadataArraySync(FILES.quantities, rows);
  }

  private handovers() {
    return this.storage.readMetadataArraySync<ShiftHandoverRecord>(FILES.handovers, []);
  }

  private writeHandovers(rows: ShiftHandoverRecord[]) {
    this.storage.writeMetadataArraySync(FILES.handovers, rows);
  }
}
