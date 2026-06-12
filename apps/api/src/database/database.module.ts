import { Global, Module } from '@nestjs/common';
import { dataSourceProviders } from './datasource.provider';
import { PrismaService } from './prisma.service';
import { DATA_SOURCE_CONFIG, REPOSITORY_TOKENS } from '../common/constants/repository-tokens';
import { StorageModule } from '../storage/storage.module';

@Global()
@Module({
  imports: [StorageModule],
  providers: [PrismaService, ...dataSourceProviders],
  exports: [
    PrismaService,
    DATA_SOURCE_CONFIG,
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
