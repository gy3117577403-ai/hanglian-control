import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  backProcessPackages,
  customers,
  feedbackRecords,
  frontProcessParameters,
  productionPlans,
  products,
} from '../../mock/seed-v0.3';
import { mockStore } from '../../mock/production.mock';
import type { MigrationPreview, MigrationSeedExport } from '../../common/types/production.types';
import type { MigrationRepositoryInterface } from '../interfaces/migration.repository.interface';

@Injectable()
export class PrismaMigrationRepository implements MigrationRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async getPreview(): Promise<MigrationPreview> {
    const [
      customerCount,
      productCount,
      productionPlanCount,
      documentCount,
      uploadedDocumentCount,
      auditLogCount,
      feedbackCount,
      confirmationCount,
    ] = await Promise.all([
      this.prisma.client.customer.count({ where: { deletedAt: null } }),
      this.prisma.client.product.count({ where: { deletedAt: null } }),
      this.prisma.client.productionPlan.count({ where: { deletedAt: null } }),
      this.prisma.client.productDocument.count({ where: { deletedAt: null } }),
      this.prisma.client.productDocument.count({ where: { deletedAt: null, source: 'MANUAL_UPLOAD' } }),
      this.prisma.client.auditLog.count(),
      this.prisma.client.feedbackRecord.count({ where: { deletedAt: null } }),
      this.prisma.client.confirmationRecord.count({ where: { deletedAt: null } }),
    ]);

    return {
      dataSource: 'postgres',
      target: 'prisma_postgresql',
      safeToMigrate: false,
      summary: {
        customers: customerCount,
        products: productCount,
        productionPlans: productionPlanCount,
        documents: documentCount,
        uploadedDocuments: uploadedDocumentCount,
        auditLogs: auditLogCount,
        feedbackRecords: feedbackCount,
        confirmationRecords: confirmationCount,
      },
      warnings: [
        '当前读取的是 Prisma 测试库现状统计，不会执行迁移或写入。',
        'V0.7 不允许自动执行 migrate、db push、db seed。',
        '生产库必须保持 DB_TARGET 非 production 才能继续任何测试动作。',
      ],
    };
  }

  exportSeed(): MigrationSeedExport {
    return {
      exportedAt: new Date().toISOString(),
      dataSource: 'mock',
      target: 'prisma_postgresql',
      customers,
      products,
      productionPlans,
      documents: mockStore.productionPlans.flatMap((plan) => plan.documents),
      frontParameters: frontProcessParameters,
      backPackages: backProcessPackages,
      feedbackRecords: [...feedbackRecords, ...mockStore.feedbackRecords],
      confirmationRecords: mockStore.confirmationRecords,
      auditLogs: [],
    };
  }
}
