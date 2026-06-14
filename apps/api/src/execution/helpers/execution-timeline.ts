import { executionSeverity, executionStatusLabels } from './execution-normalizer';
import type { ExecutionRecord, ExecutionTimelineItem, PlanStatusEvent, QuantityReport, ShiftHandoverRecord } from '../execution.types';

export function buildExecutionTimeline(input: {
  statusEvents: PlanStatusEvent[];
  records: ExecutionRecord[];
  quantityReports: QuantityReport[];
  handovers: ShiftHandoverRecord[];
}): ExecutionTimelineItem[] {
  const statusItems = input.statusEvents.map((event) => ({
    id: event.eventId,
    planId: event.planId,
    eventType: event.eventType,
    title: executionStatusLabels[event.toStatus],
    description: event.message,
    status: event.toStatus,
    severity: executionSeverity(event.toStatus),
    operatorName: event.operatorName,
    createdAt: event.createdAt,
  } satisfies ExecutionTimelineItem));

  const recordItems = input.records.map((record) => ({
    id: record.recordId,
    planId: record.planId,
    eventType: record.eventType,
    title: record.confirmType ? '过程确认' : '执行记录',
    description: record.remark ?? record.result ?? record.eventType,
    status: record.statusAfter ?? record.executionStatus,
    severity: record.result === 'fail' ? 'danger' : record.result === 'warning' ? 'warn' : 'info',
    operatorName: record.operatorName,
    createdAt: record.createdAt,
  } satisfies ExecutionTimelineItem));

  const quantityItems = input.quantityReports.map((report) => ({
    id: report.reportId,
    planId: report.planId,
    eventType: 'quantity_report',
    title: '数量报工',
    description: `本次完成 ${report.completedQuantity}，累计 ${report.cumulativeCompletedQuantity}`,
    status: 'running',
    severity: report.warning ? 'warn' : 'success',
    operatorName: report.operatorName,
    createdAt: report.createdAt,
  } satisfies ExecutionTimelineItem));

  const handoverItems = input.handovers.flatMap((handover) =>
    handover.planIds.map((planId) => ({
      id: `${handover.handoverId}-${planId}`,
      planId,
      eventType: 'handover',
      title: '班组交接',
      description: `${handover.fromTeam} -> ${handover.toTeam}：${handover.summary}`,
      severity: handover.riskItems.length ? 'warn' : 'info',
      operatorName: handover.operatorName,
      createdAt: handover.createdAt,
    } satisfies ExecutionTimelineItem)),
  );

  return [...statusItems, ...recordItems, ...quantityItems, ...handoverItems]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}
