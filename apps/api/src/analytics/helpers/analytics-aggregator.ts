import type { AnalyticsDataContext, AnalyticsRankingItem, AnalyticsTrendPoint } from '../analytics.types';
import { countBy, dayKey, percent, processSegmentLabel, processSegmentOfPlan, rate, statusLabel, toChartPoints, topEntries } from './analytics-normalizer';

function productKey(planId: string, ctx: AnalyticsDataContext) {
  const plan = ctx.plans.find((item) => item.id === planId);
  return plan ? `${plan.customer}::${plan.productCode}::${plan.productName}` : `未知客户::${planId}::未知产品`;
}

function rankingFromCounts(summary: Record<string, number>, action: string): AnalyticsRankingItem[] {
  return topEntries(summary).map(([key, count], index) => {
    const [customer, productCode, productName] = key.split('::');
    return {
      rank: index + 1,
      customer,
      productCode,
      productName,
      count,
      action,
    };
  });
}

export function aggregateOverview(ctx: AnalyticsDataContext) {
  const plannedQuantity = ctx.plans.reduce((total, plan) => total + plan.plannedQuantity, 0);
  const completedQuantity = ctx.quantityReports.reduce((total, report) => total + report.completedQuantity, 0)
    || ctx.plans.reduce((total, plan) => total + plan.completedQuantity, 0);
  const defectQuantity = ctx.quantityReports.reduce((total, report) => total + report.defectQuantity, 0);
  const reworkQuantity = ctx.quantityReports.reduce((total, report) => total + report.reworkQuantity, 0);
  const scrapQuantity = ctx.quantityReports.reduce((total, report) => total + report.scrapQuantity, 0);
  const documents = documentSummary(ctx);
  const knowledge = knowledgeSummary(ctx);
  const running = ctx.executionPlans.filter((plan) => plan.executionStatus === 'running').length;
  const completed = ctx.executionPlans.filter((plan) => plan.executionStatus === 'completed').length || ctx.plans.filter((plan) => String(plan.status).includes('完成')).length;
  const paused = ctx.executionPlans.filter((plan) => plan.executionStatus === 'paused').length;
  const exceptionHold = ctx.executionPlans.filter((plan) => plan.executionStatus === 'exception_hold').length;
  return {
    range: ctx.filters.range,
    filters: ctx.filters,
    production: {
      planCount: ctx.plans.length,
      running,
      completed,
      paused,
      exceptionHold,
      completionRate: percent(completedQuantity, plannedQuantity),
    },
    quantity: {
      plannedQuantity,
      completedQuantity,
      defectQuantity,
      reworkQuantity,
      scrapQuantity,
      defectRate: rate(defectQuantity, completedQuantity),
    },
    documents,
    knowledge,
    risk: {
      blockedPlans: ctx.plans.filter((plan) => plan.readiness?.readinessStatus === 'blocked').length,
      needReviewPlans: ctx.plans.filter((plan) => plan.readiness?.readinessStatus === 'need_review').length,
      criticalAbnormal: ctx.abnormalCases.filter((item) => item.severity === 'critical' && item.status !== 'closed').length,
      highSeverityAbnormal: ctx.abnormalCases.filter((item) => item.severity === 'high' && item.status !== 'closed').length,
    },
    generatedAt: new Date().toISOString(),
    dataSource: 'mock-metadata',
  };
}

export function aggregateProduction(ctx: AnalyticsDataContext) {
  return {
    statusDistribution: toChartPoints(countBy(ctx.executionPlans, (plan) => statusLabel(plan.executionStatus))),
    processDistribution: toChartPoints(countBy(ctx.plans, (plan) => processSegmentLabel(processSegmentOfPlan(plan)))),
    teamDistribution: toChartPoints(countBy(ctx.plans, (plan) => plan.owner)),
    completionRate: aggregateOverview(ctx).production.completionRate,
    activePlans: ctx.executionPlans.filter((plan) => ['running', 'paused', 'exception_hold'].includes(plan.executionStatus)).slice(0, 8),
  };
}

export function aggregateQuantity(ctx: AnalyticsDataContext) {
  const overview = aggregateOverview(ctx);
  return {
    ...overview.quantity,
    completionRate: overview.production.completionRate,
    trends: trendRows(ctx),
  };
}

export function aggregateExceptions(ctx: AnalyticsDataContext) {
  const category = countBy(ctx.feedbackRecords, (record) => record.type);
  const holdEvents = ctx.statusEvents.filter((event) => event.toStatus === 'exception_hold');
  return {
    feedbackCount: ctx.feedbackRecords.length,
    exceptionHoldCount: holdEvents.length,
    categoryRanking: topEntries(category).map(([name, value]) => ({ name, value })),
    seriousItems: [
      ...ctx.abnormalCases.filter((item) => ['high', 'critical'].includes(item.severity)).map((item) => ({
        title: item.title,
        productCode: item.productCode,
        severity: item.severity,
        action: item.solution,
      })),
      ...holdEvents.map((event) => ({ title: event.message, productCode: event.planId, severity: 'hold', action: '现场确认后恢复生产' })),
    ].slice(0, 8),
    statusDistribution: toChartPoints(countBy(ctx.feedbackRecords, () => '待处理')),
    trends: trendRows(ctx),
  };
}

export function aggregateDocuments(ctx: AnalyticsDataContext) {
  const summary = documentSummary(ctx);
  const issueCounts: Record<string, number> = {};
  for (const plan of ctx.plans) {
    const issueCount = plan.documents.filter((doc) => ['pending_review', 'expired', 'missing', 'inconsistent'].includes(doc.documentStatus ?? 'effective')).length
      + (plan.readiness?.versionAlerts.length ?? 0);
    if (issueCount) issueCounts[productKey(plan.id, ctx)] = issueCount;
  }
  return {
    summary,
    issueRanking: rankingFromCounts(issueCounts, '进入资料维护中心复核版本、缺失文件和重复版本'),
    issueItems: ctx.documents
      .filter((doc) => ['pending_review', 'expired', 'missing', 'inconsistent'].includes(doc.documentStatus ?? 'effective') || !doc.storedFileName && doc.source === 'manual_upload')
      .slice(0, 12),
  };
}

export function aggregateKnowledge(ctx: AnalyticsDataContext) {
  return {
    summary: knowledgeSummary(ctx),
    fixtureStatus: toChartPoints(countBy(ctx.fixtures, (item) => item.status)),
    abnormalSeverity: toChartPoints(countBy(ctx.abnormalCases, (item) => item.severity)),
    qualityStatus: toChartPoints(countBy(ctx.qualityStandards, (item) => item.status)),
    pendingReviewItems: [
      ...ctx.fixtures.filter((item) => item.status !== 'active').map((item) => ({ title: item.fixtureName, productCode: item.productCode, type: '治具', action: '确认治具状态和点检标准' })),
      ...ctx.abnormalCases.filter((item) => item.status === 'pending_review').map((item) => ({ title: item.title, productCode: item.productCode, type: '异常', action: '补充原因和处理方案' })),
      ...ctx.qualityStandards.filter((item) => item.status !== 'effective').map((item) => ({ title: item.title, productCode: item.productCode, type: '质量', action: '确认标准是否有效' })),
    ].slice(0, 12),
    highRiskAbnormalRanking: topEntries(countBy(ctx.abnormalCases.filter((item) => ['high', 'critical'].includes(item.severity)), (item) => item.category))
      .map(([name, value]) => ({ name, value })),
  };
}

export function trendRows(ctx: AnalyticsDataContext): AnalyticsTrendPoint[] {
  const byDate = new Map<string, AnalyticsTrendPoint>();
  const ensure = (date: string) => {
    if (!byDate.has(date)) {
      byDate.set(date, {
        date,
        completionRate: 0,
        defectRate: 0,
        exceptionCount: 0,
        pendingReviewDocuments: 0,
        missingFiles: 0,
        pendingKnowledge: 0,
      });
    }
    return byDate.get(date)!;
  };

  for (const report of ctx.quantityReports) {
    const row = ensure(dayKey(report.createdAt));
    row.completionRate = Math.max(row.completionRate, percent(report.cumulativeCompletedQuantity, report.planQuantity));
    row.defectRate = Math.max(row.defectRate, rate(report.defectQuantity, report.completedQuantity));
  }
  for (const event of ctx.statusEvents.filter((item) => item.toStatus === 'exception_hold')) {
    ensure(dayKey(event.createdAt)).exceptionCount += 1;
  }
  for (const doc of ctx.documents) {
    const row = ensure(dayKey(doc.updatedAt));
    if (doc.documentStatus === 'pending_review') row.pendingReviewDocuments += 1;
    if (doc.documentStatus === 'missing' || (!doc.storedFileName && doc.source === 'manual_upload')) row.missingFiles += 1;
  }
  for (const record of ctx.knowledgeRecords) {
    ensure(dayKey(record.createdAt)).pendingKnowledge += 1;
  }

  const rows = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  return rows.length ? rows.slice(-14) : ctx.snapshot.trends;
}

export function aggregateRankings(ctx: AnalyticsDataContext) {
  const documentIssues: Record<string, number> = {};
  const exceptionProducts: Record<string, number> = {};
  const pendingReviewProducts: Record<string, number> = {};
  const missingFileProducts: Record<string, number> = {};
  const highRiskCategories = countBy(ctx.abnormalCases.filter((item) => ['high', 'critical'].includes(item.severity)), (item) => item.category);

  for (const plan of ctx.plans) {
    const key = productKey(plan.id, ctx);
    const docIssues = plan.documents.filter((doc) => ['pending_review', 'expired', 'missing', 'inconsistent'].includes(doc.documentStatus ?? 'effective')).length;
    if (docIssues) documentIssues[key] = (documentIssues[key] ?? 0) + docIssues;
    if (plan.readiness?.readinessStatus === 'need_review') pendingReviewProducts[key] = (pendingReviewProducts[key] ?? 0) + 1;
    const missingFiles = plan.documents.filter((doc) => doc.documentStatus === 'missing').length;
    if (missingFiles) missingFileProducts[key] = (missingFileProducts[key] ?? 0) + missingFiles;
  }
  for (const feedback of ctx.feedbackRecords) {
    exceptionProducts[productKey(feedback.planId, ctx)] = (exceptionProducts[productKey(feedback.planId, ctx)] ?? 0) + 1;
  }
  for (const event of ctx.statusEvents.filter((item) => item.toStatus === 'exception_hold')) {
    exceptionProducts[productKey(event.planId, ctx)] = (exceptionProducts[productKey(event.planId, ctx)] ?? 0) + 1;
  }

  return {
    documentIssueProducts: rankingFromCounts(documentIssues, '复核资料版本、待确认和失效项'),
    exceptionProducts: rankingFromCounts(exceptionProducts, '查看异常反馈和停线原因'),
    pendingReviewProducts: rankingFromCounts(pendingReviewProducts, '进入开工检查确认待复核项'),
    missingFileProducts: rankingFromCounts(missingFileProducts, '补传缺失文件或确认占位资料'),
    highRiskAbnormalCategories: topEntries(highRiskCategories).map(([category, count], index) => ({
      rank: index + 1,
      category,
      count,
      action: '班前提醒并更新异常知识库',
    })),
  };
}

function documentSummary(ctx: AnalyticsDataContext) {
  return {
    total: ctx.documents.length,
    effective: ctx.documents.filter((doc) => doc.documentStatus === 'effective').length,
    pendingReview: ctx.documents.filter((doc) => doc.documentStatus === 'pending_review').length,
    expired: ctx.documents.filter((doc) => doc.documentStatus === 'expired').length,
    missingFile: ctx.documents.filter((doc) => doc.documentStatus === 'missing' || (!doc.storedFileName && doc.source === 'manual_upload')).length,
    duplicateVersion: ctx.documents.filter((doc) => doc.duplicateVersionWarning).length,
  };
}

function knowledgeSummary(ctx: AnalyticsDataContext) {
  return {
    fixtures: ctx.fixtures.length,
    abnormalCases: ctx.abnormalCases.length,
    qualityStandards: ctx.qualityStandards.length,
    pendingReview: ctx.fixtures.filter((item) => item.status !== 'active').length
      + ctx.abnormalCases.filter((item) => item.status === 'pending_review').length
      + ctx.qualityStandards.filter((item) => item.status !== 'effective').length,
  };
}
