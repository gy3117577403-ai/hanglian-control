import { DATA_SOURCE_CONFIG, REPOSITORY_TOKENS } from '../common/constants/repository-tokens';
import { getDataSourceConfig } from '../config/data-source.config';
import { MockDocumentRepository } from '../repositories/mock/mock-document.repository';
import { MockAuditRepository } from '../repositories/mock/mock-audit.repository';
import { MockFeedbackRepository } from '../repositories/mock/mock-feedback.repository';
import { MockMigrationRepository } from '../repositories/mock/mock-migration.repository';
import { MockProductRepository } from '../repositories/mock/mock-product.repository';
import { MockProductionPlanRepository } from '../repositories/mock/mock-production-plan.repository';
import { MockSearchRepository } from '../repositories/mock/mock-search.repository';
import { PrismaAuditRepository } from '../repositories/prisma/prisma-audit.repository';
import { PrismaDocumentRepository } from '../repositories/prisma/prisma-document.repository';
import { PrismaFeedbackRepository } from '../repositories/prisma/prisma-feedback.repository';
import { PrismaMigrationRepository } from '../repositories/prisma/prisma-migration.repository';
import { PrismaProductRepository } from '../repositories/prisma/prisma-product.repository';
import { PrismaProductionPlanRepository } from '../repositories/prisma/prisma-production-plan.repository';
import { PrismaSearchRepository } from '../repositories/prisma/prisma-search.repository';
import type { DataSourceConfig } from '../config/data-source.config';

const selectRepository = <TMock, TPrisma>(
  config: DataSourceConfig,
  mockRepository: TMock,
  prismaRepository: TPrisma,
) => (config.dataSource === 'prisma' ? prismaRepository : mockRepository);

export const dataSourceProviders = [
  {
    provide: DATA_SOURCE_CONFIG,
    useFactory: getDataSourceConfig,
  },
  MockProductionPlanRepository,
  MockProductRepository,
  MockDocumentRepository,
  MockSearchRepository,
  MockFeedbackRepository,
  MockAuditRepository,
  MockMigrationRepository,
  PrismaProductionPlanRepository,
  PrismaProductRepository,
  PrismaDocumentRepository,
  PrismaSearchRepository,
  PrismaFeedbackRepository,
  PrismaAuditRepository,
  PrismaMigrationRepository,
  {
    provide: REPOSITORY_TOKENS.productionPlan,
    useFactory: (
      config: DataSourceConfig,
      mockRepository: MockProductionPlanRepository,
      prismaRepository: PrismaProductionPlanRepository,
    ) => selectRepository(config, mockRepository, prismaRepository),
    inject: [DATA_SOURCE_CONFIG, MockProductionPlanRepository, PrismaProductionPlanRepository],
  },
  {
    provide: REPOSITORY_TOKENS.product,
    useFactory: (
      config: DataSourceConfig,
      mockRepository: MockProductRepository,
      prismaRepository: PrismaProductRepository,
    ) => selectRepository(config, mockRepository, prismaRepository),
    inject: [DATA_SOURCE_CONFIG, MockProductRepository, PrismaProductRepository],
  },
  {
    provide: REPOSITORY_TOKENS.document,
    useFactory: (
      config: DataSourceConfig,
      mockRepository: MockDocumentRepository,
      prismaRepository: PrismaDocumentRepository,
    ) => selectRepository(config, mockRepository, prismaRepository),
    inject: [DATA_SOURCE_CONFIG, MockDocumentRepository, PrismaDocumentRepository],
  },
  {
    provide: REPOSITORY_TOKENS.search,
    useFactory: (
      config: DataSourceConfig,
      mockRepository: MockSearchRepository,
      prismaRepository: PrismaSearchRepository,
    ) => selectRepository(config, mockRepository, prismaRepository),
    inject: [DATA_SOURCE_CONFIG, MockSearchRepository, PrismaSearchRepository],
  },
  {
    provide: REPOSITORY_TOKENS.feedback,
    useFactory: (
      config: DataSourceConfig,
      mockRepository: MockFeedbackRepository,
      prismaRepository: PrismaFeedbackRepository,
    ) => selectRepository(config, mockRepository, prismaRepository),
    inject: [DATA_SOURCE_CONFIG, MockFeedbackRepository, PrismaFeedbackRepository],
  },
  {
    provide: REPOSITORY_TOKENS.audit,
    useFactory: (
      config: DataSourceConfig,
      mockRepository: MockAuditRepository,
      prismaRepository: PrismaAuditRepository,
    ) => selectRepository(config, mockRepository, prismaRepository),
    inject: [DATA_SOURCE_CONFIG, MockAuditRepository, PrismaAuditRepository],
  },
  {
    provide: REPOSITORY_TOKENS.migration,
    useFactory: (
      config: DataSourceConfig,
      mockRepository: MockMigrationRepository,
      prismaRepository: PrismaMigrationRepository,
    ) => selectRepository(config, mockRepository, prismaRepository),
    inject: [DATA_SOURCE_CONFIG, MockMigrationRepository, PrismaMigrationRepository],
  },
];
