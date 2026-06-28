import { BadRequestException } from '@nestjs/common';
import type { ExecutionStatus } from '../execution.types';

const allowedTransitions: Record<ExecutionStatus, ExecutionStatus[]> = {
  not_started: ['ready_to_start', 'running', 'cancelled'],
  ready_to_start: ['running', 'cancelled'],
  running: ['paused', 'exception_hold', 'completed', 'cancelled'],
  paused: ['running', 'exception_hold', 'cancelled'],
  exception_hold: ['running', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function assertTransition(from: ExecutionStatus, to: ExecutionStatus) {
  if (!allowedTransitions[from]?.includes(to)) {
    throw new BadRequestException(`Execution status cannot change from ${from} to ${to}.`);
  }
}

export function assertNonNegative(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new BadRequestException(`${field} cannot be negative.`);
  }
}

export function assertRunning(status: ExecutionStatus, action: string) {
  if (status !== 'running') {
    throw new BadRequestException(`${action} is only allowed while the plan is running.`);
  }
}
