import { Global, Module } from '@nestjs/common';
import { DATA_SOURCE_CONFIG } from '../common/constants/repository-tokens';
import type { DataSourceConfig } from '../config/data-source.config';
import { DatabaseModule } from '../database/database.module';
import { DrawingMetadataStore } from '../document-hub/drawing-metadata.store';
import { OrderMetadataStore } from '../document-hub/order-metadata.store';
import { StorageModule } from '../storage/storage.module';
import { JsonDeleteLockRepository } from './json/json-delete-lock.repository';
import { JsonDrawingRepository } from './json/json-drawing.repository';
import { JsonOrderRepository } from './json/json-order.repository';
import { PrismaDeleteLockRepository } from './prisma/prisma-delete-lock.repository';
import { PrismaDrawingRepository } from './prisma/prisma-drawing.repository';
import { PrismaOrderRepository } from './prisma/prisma-order.repository';
import {
  DELETE_LOCK_REPOSITORY,
  DRAWING_REPOSITORY,
  ORDER_REPOSITORY,
  PERSISTENCE_UNIT_OF_WORK,
} from './persistence.tokens';
import { JsonPersistenceUnitOfWork, PrismaPersistenceUnitOfWork } from './unit-of-work';

function usePostgres(config: DataSourceConfig) {
  return config.dataSource === 'postgres';
}

@Global()
@Module({
  imports: [DatabaseModule, StorageModule],
  providers: [
    DrawingMetadataStore,
    OrderMetadataStore,
    JsonDrawingRepository,
    JsonOrderRepository,
    JsonDeleteLockRepository,
    JsonPersistenceUnitOfWork,
    PrismaDrawingRepository,
    PrismaOrderRepository,
    PrismaDeleteLockRepository,
    PrismaPersistenceUnitOfWork,
    {
      provide: DRAWING_REPOSITORY,
      useFactory: (
        config: DataSourceConfig,
        jsonRepository: JsonDrawingRepository,
        prismaRepository: PrismaDrawingRepository,
      ) => usePostgres(config) ? prismaRepository : jsonRepository,
      inject: [DATA_SOURCE_CONFIG, JsonDrawingRepository, PrismaDrawingRepository],
    },
    {
      provide: ORDER_REPOSITORY,
      useFactory: (
        config: DataSourceConfig,
        jsonRepository: JsonOrderRepository,
        prismaRepository: PrismaOrderRepository,
      ) => usePostgres(config) ? prismaRepository : jsonRepository,
      inject: [DATA_SOURCE_CONFIG, JsonOrderRepository, PrismaOrderRepository],
    },
    {
      provide: DELETE_LOCK_REPOSITORY,
      useFactory: (
        config: DataSourceConfig,
        jsonRepository: JsonDeleteLockRepository,
        prismaRepository: PrismaDeleteLockRepository,
      ) => usePostgres(config) ? prismaRepository : jsonRepository,
      inject: [DATA_SOURCE_CONFIG, JsonDeleteLockRepository, PrismaDeleteLockRepository],
    },
    {
      provide: PERSISTENCE_UNIT_OF_WORK,
      useFactory: (
        config: DataSourceConfig,
        jsonUnitOfWork: JsonPersistenceUnitOfWork,
        prismaUnitOfWork: PrismaPersistenceUnitOfWork,
      ) => usePostgres(config) ? prismaUnitOfWork : jsonUnitOfWork,
      inject: [DATA_SOURCE_CONFIG, JsonPersistenceUnitOfWork, PrismaPersistenceUnitOfWork],
    },
  ],
  exports: [
    DRAWING_REPOSITORY,
    ORDER_REPOSITORY,
    DELETE_LOCK_REPOSITORY,
    PERSISTENCE_UNIT_OF_WORK,
    DrawingMetadataStore,
    OrderMetadataStore,
  ],
})
export class PersistenceModule {}
