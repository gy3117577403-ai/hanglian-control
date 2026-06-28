import type { ExecutionOperator, ExecutionStatus } from '../execution.types';

export const executionStatusLabels: Record<ExecutionStatus, string> = {
  not_started: '未开工',
  ready_to_start: '待开工',
  running: '生产中',
  paused: '已暂停',
  exception_hold: '异常停线',
  completed: '已完工',
  cancelled: '已取消',
};

export function operatorFrom(value?: ExecutionOperator) {
  return {
    operatorId: value?.operatorId ?? 'mock-front-leader',
    operatorName: value?.operatorName ?? '组长演示账号',
    operatorRole: value?.operatorRole ?? '前段组长',
  };
}

export function clampNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.round(number));
}

export function executionSeverity(status: ExecutionStatus): 'info' | 'success' | 'warn' | 'danger' {
  if (status === 'running' || status === 'completed') return 'success';
  if (status === 'paused' || status === 'ready_to_start') return 'warn';
  if (status === 'exception_hold' || status === 'cancelled') return 'danger';
  return 'info';
}
