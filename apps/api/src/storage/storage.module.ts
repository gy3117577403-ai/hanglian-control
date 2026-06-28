import { Module } from '@nestjs/common';
import { StorageStatusController } from './controllers/storage-status.controller';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import { LocalStorageService } from './local-storage.service';
import { StorageConfigService } from './storage.config';
import { StorageKeyService } from './storage-key.service';
import { StorageMountCheckService } from './storage-mount-check.service';
import { StorageSafetyService } from './storage-safety.service';
import { StorageService } from './storage.service';

@Module({
  controllers: [StorageStatusController],
  providers: [
    StorageConfigService,
    StorageKeyService,
    StorageMountCheckService,
    StorageSafetyService,
    LocalStorageProvider,
    S3StorageProvider,
    StorageService,
    LocalStorageService,
  ],
  exports: [
    StorageConfigService,
    StorageMountCheckService,
    StorageService,
    LocalStorageService,
  ],
})
export class StorageModule {}
