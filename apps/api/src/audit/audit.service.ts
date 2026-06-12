import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '../common/constants/repository-tokens';
import type { AuditLogQuery, CreateAuditLogPayload } from '../common/types/production.types';
import type { AuditRepositoryInterface } from '../repositories/interfaces/audit.repository.interface';

@Injectable()
export class AuditService {
  constructor(
    @Inject(REPOSITORY_TOKENS.audit)
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
