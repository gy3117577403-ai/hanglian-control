import { Injectable } from '@nestjs/common';
import {
  backProcessPackages,
  confirmationRecords,
  customers,
  feedbackRecords,
  frontProcessParameters,
  productionPlans,
  products,
} from '../../mock/seed-v0.3';
import { mockStore } from '../../mock/production.mock';
import { LocalStorageService } from '../../storage/local-storage.service';
import type { MigrationPreview, MigrationSeedExport } from '../../common/types/production.types';
import type { MigrationRepositoryInterface } from '../interfaces/migration.repository.interface';
import { MockDocumentRepository } from './mock-document.repository';

@Injectable()
export class MockMigrationRepository implements MigrationRepositoryInterface {
  constructor(
    private readonly documentRepository: MockDocumentRepository,
    private readonly localStorageService: LocalStorageService,
  ) {}

  getPreview(): MigrationPreview {
    const documents = this.documentRepository.findDocuments();
    const auditLogs = this.localStorageService.readAuditLogsSync();
    return {
      dataSource: 'mock',
      target: 'prisma_postgresql',
      safeToMigrate: true,
      summary: {
        customers: customers.length,
        products: products.length,
        productionPlans: productionPlans.length,
        documents: documents.length,
        uploadedDocuments: documents.filter((document) => document.source === 'manual_upload').length,
        auditLogs: auditLogs.length,
        feedbackRecords: mockStore.feedbackRecords.length,
        confirmationRecords: mockStore.confirmationRecords.length,
      },
      warnings: [
        '当前仅为迁移预览，未连接数据库。',
        '文件本体不会写入数据库，只迁移文件元数据。',
        '生产库迁移前必须先在测试库验证并完成备份。',
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
      documents: this.documentRepository.findDocuments(),
      frontParameters: frontProcessParameters,
      backPackages: backProcessPackages,
      feedbackRecords,
      confirmationRecords,
      auditLogs: this.localStorageService.readAuditLogsSync(),
    };
  }
}
