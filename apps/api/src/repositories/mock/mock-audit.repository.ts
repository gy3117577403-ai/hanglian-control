import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { LocalStorageService } from '../../storage/local-storage.service';
import type { AuditLog, AuditLogQuery, CreateAuditLogPayload } from '../../common/types/production.types';
import type { AuditRepositoryInterface } from '../interfaces/audit.repository.interface';

const defaultOperator = {
  operatorId: 'demo-leader',
  operatorName: '组长演示账号',
  operatorRole: '组长',
};

@Injectable()
export class MockAuditRepository implements AuditRepositoryInterface {
  constructor(private readonly localStorageService: LocalStorageService) {}

  findAuditLogs(query: AuditLogQuery = {}): AuditLog[] {
    const limit = Math.min(Math.max(Number(query.limit ?? 50), 1), 200);
    return this.localStorageService.readAuditLogsSync()
      .filter((log) => !query.entityType || log.entityType === query.entityType)
      .filter((log) => !query.entityId || log.entityId === query.entityId)
      .filter((log) => !query.planId || log.planId === query.planId)
      .filter((log) => !query.productId || log.productId === query.productId)
      .filter((log) => !query.orderId || log.orderId === query.orderId)
      .filter((log) => !query.action || log.action === query.action)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  createAuditLog(payload: CreateAuditLogPayload): AuditLog {
    const log: AuditLog = {
      auditId: `AUD-${Date.now()}-${randomUUID()}`,
      entityType: payload.entityType,
      entityId: payload.entityId,
      action: payload.action,
      before: payload.before,
      after: payload.after,
      message: payload.message,
      operatorId: payload.operatorId ?? defaultOperator.operatorId,
      operatorName: payload.operatorName ?? defaultOperator.operatorName,
      operatorRole: payload.operatorRole ?? defaultOperator.operatorRole,
      planId: payload.planId,
      productId: payload.productId,
      orderId: payload.orderId,
      createdAt: new Date().toISOString(),
    };
    const logs = this.localStorageService.readAuditLogsSync();
    logs.unshift(log);
    this.localStorageService.writeAuditLogsSync(logs.slice(0, 1000));
    return log;
  }
}
