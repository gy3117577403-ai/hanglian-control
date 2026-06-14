import type { PlanStatusEvent, QuantityReport } from '../execution.types';

const now = new Date().toISOString();

export const executionStatusEventSeed: PlanStatusEvent[] = [
  {
    eventId: 'EVT-PLN-20260611-001-SEED',
    planId: 'PLN-20260611-001',
    eventType: 'start',
    fromStatus: 'ready_to_start',
    toStatus: 'running',
    message: '演示计划已进入生产中',
    operatorId: 'mock-front-leader',
    operatorName: '前段组长演示',
    operatorRole: '前段组长',
    createdAt: now,
  },
  {
    eventId: 'EVT-PLN-20260611-004-SEED',
    planId: 'PLN-20260611-004',
    eventType: 'exception_hold',
    fromStatus: 'running',
    toStatus: 'exception_hold',
    message: '演示异常停线：资料复核中',
    operatorId: 'mock-quality',
    operatorName: '品质演示',
    operatorRole: '品质',
    createdAt: now,
  },
];

export const quantityReportSeed: QuantityReport[] = [
  {
    reportId: 'QTY-PLN-20260611-001-SEED',
    planId: 'PLN-20260611-001',
    completedQuantity: 80,
    defectQuantity: 1,
    reworkQuantity: 0,
    scrapQuantity: 0,
    cumulativeCompletedQuantity: 80,
    planQuantity: 500,
    remark: 'V2.5 演示初始报工',
    operatorId: 'mock-front-leader',
    operatorName: '前段组长演示',
    operatorRole: '前段组长',
    createdAt: now,
  },
];
