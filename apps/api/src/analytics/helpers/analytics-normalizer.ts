import type { AnalyticsFilters, AnalyticsProcessSegment, AnalyticsRange } from '../analytics.types';
import type { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import type { ProductionPlanMock } from '../../common/types/production.types';

export function normalizeFilters(query: AnalyticsQueryDto = {}): AnalyticsFilters {
  return {
    range: query.range ?? 'today',
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    team: query.team,
    processSegment: query.processSegment ?? 'all',
    customerId: query.customerId,
    productId: query.productId,
    role: query.role,
  };
}

export function rangeLabel(range: AnalyticsRange) {
  return {
    today: '今日',
    week: '本周',
    month: '本月',
    all: '全部',
  }[range];
}

export function processSegmentOfPlan(plan: Pick<ProductionPlanMock, 'segment'>): Exclude<AnalyticsProcessSegment, 'all'> {
  const text = String(plan.segment);
  if (text === 'front' || text.includes('前')) return 'front';
  if (text === 'back' || text.includes('后')) return 'back';
  return 'common';
}

export function processSegmentLabel(segment: string) {
  if (segment === 'front') return '前段';
  if (segment === 'back') return '后段';
  if (segment === 'common') return '通用';
  return '全部';
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    not_started: '未开工',
    ready_to_start: '待开工',
    running: '生产中',
    paused: '已暂停',
    exception_hold: '异常停线',
    completed: '已完工',
    cancelled: '已取消',
  };
  return labels[status] ?? status;
}

export function dayKey(value?: string) {
  return String(value ?? new Date().toISOString()).slice(0, 10);
}

export function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export function rate(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 10000) / 100;
}

export function countBy<T>(rows: T[], getKey: (row: T) => string | undefined) {
  return rows.reduce<Record<string, number>>((summary, row) => {
    const key = getKey(row) ?? '未分类';
    summary[key] = (summary[key] ?? 0) + 1;
    return summary;
  }, {});
}

export function toChartPoints(summary: Record<string, number>) {
  return Object.entries(summary).map(([name, value]) => ({ name, value }));
}

export function sortEntries(summary: Record<string, number>) {
  return Object.entries(summary).sort((a, b) => b[1] - a[1]);
}

export function topEntries(summary: Record<string, number>, limit = 5) {
  return sortEntries(summary).slice(0, limit);
}

export function filterPlansByQuery(plans: ProductionPlanMock[], filters: AnalyticsFilters) {
  const filtered = plans
    .filter((plan) => !filters.customerId || plan.customerId === filters.customerId)
    .filter((plan) => !filters.productId || plan.productId === filters.productId)
    .filter((plan) => filters.processSegment === 'all' || processSegmentOfPlan(plan) === filters.processSegment)
    .filter((plan) => !filters.team || String(plan.owner).includes(filters.team))
    .filter((plan) => {
      if (!filters.dateFrom && !filters.dateTo) return true;
      const date = dayKey(plan.date);
      if (filters.dateFrom && date < filters.dateFrom) return false;
      if (filters.dateTo && date > filters.dateTo) return false;
      return true;
    });
  return filtered.length ? filtered : plans;
}
