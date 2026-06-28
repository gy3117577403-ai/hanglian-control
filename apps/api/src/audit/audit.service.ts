import { Inject, Injectable } from '@nestjs/common';
import type { AuditLogQuery, CreateAuditLogPayload } from '../common/types/production.types';
import { AUDIT_REPOSITORY } from '../persistence/persistence.tokens';
import type { AuditRepositoryInterface } from '../repositories/interfaces/audit.repository.interface';

@Injectable()
export class AuditService {
  constructor(
    @Inject(AUDIT_REPOSITORY)
    private readonly auditRepository: AuditRepositoryInterface,
  ) {}

  async findAll(query: AuditLogQuery) {
    return this.auditRepository.findAuditLogs(query);
  }

  async create(payload: CreateAuditLogPayload) {
    return this.auditRepository.createAuditLog(payload);
  }

  async tryCreate(payload: CreateAuditLogPayload) {
    try {
      return await this.create(payload);
    } catch {
      return undefined;
    }
  }
}
