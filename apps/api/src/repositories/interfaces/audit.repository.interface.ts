import type { AuditLog, AuditLogQuery, CreateAuditLogPayload } from '../../common/types/production.types';

type MaybePromise<T> = T | Promise<T>;

export interface AuditRepositoryInterface {
  findAuditLogs(query?: AuditLogQuery): MaybePromise<AuditLog[]>;
  createAuditLog(payload: CreateAuditLogPayload): MaybePromise<AuditLog>;
}
