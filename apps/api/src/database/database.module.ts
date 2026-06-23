import { Global, Module } from '@nestjs/common';
import { dataSourceProviders } from './datasource.provider';
import { DatabaseConfigService } from './database-config.service';
import { PrismaService } from './prisma.service';
import { DATA_SOURCE_CONFIG, REPOSITORY_TOKENS } from '../common/constants/repository-tokens';
import { AUDIT_REPOSITORY, DOCUMENT_REPOSITORY } from '../persistence/persistence.tokens';
import { StorageModule } from '../storage/storage.module';

@Global()
@Module({
  imports: [StorageModule],
  providers: [
    DatabaseConfigService,
    PrismaService,
    ...dataSourceProviders,
    {
      provide: DOCUMENT_REPOSITORY,
      useExisting: REPOSITORY_TOKENS.document,
    },
    {
      provide: AUDIT_REPOSITORY,
      useExisting: REPOSITORY_TOKENS.audit,
    },
  ],
  exports: [
    DatabaseConfigService,
    PrismaService,
    DATA_SOURCE_CONFIG,
    DOCUMENT_REPOSITORY,
    AUDIT_REPOSITORY,
    REPOSITORY_TOKENS.productionPlan,
    REPOSITORY_TOKENS.product,
    REPOSITORY_TOKENS.document,
    REPOSITORY_TOKENS.search,
    REPOSITORY_TOKENS.feedback,
    REPOSITORY_TOKENS.audit,
    REPOSITORY_TOKENS.migration,
  ],
})
export class DatabaseModule {}
