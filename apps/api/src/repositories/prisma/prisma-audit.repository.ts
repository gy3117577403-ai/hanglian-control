import { Injectable } from '@nestjs/common';
import { assertDatabaseWriteAllowed } from '../../database/database-safety';
import { PrismaService } from '../../database/prisma.service';
import type { AuditLog, AuditLogQuery, CreateAuditLogPayload } from '../../common/types/production.types';
import type { AuditRepositoryInterface } from '../interfaces/audit.repository.interface';
import {
  apiAuditActionToPrisma,
  apiAuditEntityToPrisma,
  mapPrismaAuditLog,
} from './prisma-mappers';

@Injectable()
export class PrismaAuditRepository implements AuditRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async findAuditLogs(query: AuditLogQuery = {}): Promise<AuditLog[]> {
    const rows = await this.prisma.client.auditLog.findMany({
      where: {
        ...(query.entityType ? { entityType: apiAuditEntityToPrisma(query.entityType) } : {}),
        ...(query.entityId ? { entityId: query.entityId } : {}),
        ...(query.planId ? { planId: query.planId } : {}),
        ...(query.productId ? { productId: query.productId } : {}),
        ...(query.orderId ? { orderId: query.orderId } : {}),
        ...(query.action ? { action: apiAuditActionToPrisma(query.action) } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(query.limit ?? 50, 200),
    });
    return rows.map(mapPrismaAuditLog);
  }

  async createAuditLog(payload: CreateAuditLogPayload): Promise<AuditLog> {
    assertDatabaseWriteAllowed();
    const row = await this.prisma.client.auditLog.create({
      data: {
        entityType: apiAuditEntityToPrisma(payload.entityType),
        entityId: payload.entityId,
        action: apiAuditActionToPrisma(payload.action),
        beforeJson: payload.before,
        afterJson: payload.after,
        message: payload.message,
        operatorId: payload.operatorId,
        operatorName: payload.operatorName,
        operatorRole: payload.operatorRole,
        planId: payload.planId,
        productId: payload.productId,
        orderId: payload.orderId,
      },
    });
    return mapPrismaAuditLog(row);
  }
}
