import type { AnalyticsDataContext } from '../analytics.types';
import { aggregateOverview } from './analytics-aggregator';
import { rangeLabel } from './analytics-normalizer';

export function buildAnalyticsSummaryText(ctx: AnalyticsDataContext) {
  const overview = aggregateOverview(ctx);
  return [
    '线束车间现场统计摘要',
    `范围：${rangeLabel(ctx.filters.range)}`,
    `计划数：${overview.production.planCount}，已完工：${overview.production.completed}，生产中：${overview.production.running}，异常停线：${overview.production.exceptionHold}`,
    `计划完成率：${overview.production.completionRate}%`,
    `完成数量：${overview.quantity.completedQuantity} / ${overview.quantity.plannedQuantity}`,
    `不良数：${overview.quantity.defectQuantity}，不良率：${overview.quantity.defectRate}%`,
    `资料待复核：${overview.documents.pendingReview}，文件缺失：${overview.documents.missingFile}`,
    `高风险异常：${overview.risk.highSeverityAbnormal}，关键异常：${overview.risk.criticalAbnormal}`,
    `知识待复核：${overview.knowledge.pendingReview}`,
    '数据来源：Mock / 本地 metadata；未连接 Sealos、企业微信微盘或真实语音。',
  ].join('\n');
}
