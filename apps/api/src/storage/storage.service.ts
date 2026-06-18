import { BadRequestException, Injectable } from '@nestjs/common';
import type { ProductDocument } from '../common/types/production.types';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import { StorageConfigService } from './storage.config';
import type { PutObjectInput, StorageObjectStream, StorageSafeStatus, StoredObjectInfo } from './storage.types';

@Injectable()
export class StorageService {
  constructor(
    private readonly config: StorageConfigService,
    private readonly localProvider: LocalStorageProvider,
    private readonly s3Provider: S3StorageProvider,
  ) {}

  async putObject(input: PutObjectInput): Promise<StoredObjectInfo> {
    const maxBytes = this.config.maxFileSizeMb * 1024 * 1024;
    const size = input.fileSize ?? input.buffer?.length;
    if (size !== undefined && size > maxBytes) {
      throw new BadRequestException(`File size exceeds ${this.config.maxFileSizeMb} MB.`);
    }
    return this.provider().putObject(input);
  }

  getObjectStream(key: string) {
    return this.providerForKey(key).getObjectStream(key);
  }

  headObject(key: string) {
    return this.providerForKey(key).headObject(key);
  }

  objectExists(key: string) {
    return this.providerForKey(key).objectExists(key);
  }

  deleteObject(key: string) {
    return this.providerForKey(key).deleteObject(key);
  }

  createPreviewUrl(key: string, documentId?: string) {
    return this.providerForKey(key).createPreviewUrl(key, { documentId });
  }

  createDownloadUrl(key: string, documentId?: string, fileName?: string) {
    return this.providerForKey(key).createDownloadUrl(key, { documentId, fileName, disposition: 'attachment' });
  }

  resolveDocumentStorage(document: ProductDocument): {
    provider: 'local' | 's3';
    storageKey?: string;
    legacyRecord: boolean;
  } {
    const provider = document.storageProvider === 's3' ? 's3' : 'local';
    return {
      provider,
      storageKey: document.storageKey ?? document.storedFileName,
      legacyRecord: !document.storageProvider || !document.storageKey,
    };
  }

  async getDocumentStream(document: ProductDocument): Promise<StorageObjectStream | undefined> {
    const storage = this.resolveDocumentStorage(document);
    if (!storage.storageKey) return undefined;
    return (storage.provider === 's3' ? this.s3Provider : this.localProvider).getObjectStream(storage.storageKey);
  }

  async documentObjectExists(document: ProductDocument) {
    const storage = this.resolveDocumentStorage(document);
    if (!storage.storageKey) return false;
    return (storage.provider === 's3' ? this.s3Provider : this.localProvider).objectExists(storage.storageKey);
  }

  async deleteDocumentObject(document: ProductDocument) {
    const storage = this.resolveDocumentStorage(document);
    if (!storage.storageKey) return { deleted: false, reason: 'no_file' };
    return (storage.provider === 's3' ? this.s3Provider : this.localProvider).deleteObject(storage.storageKey);
  }

  getSafeStatus(): StorageSafeStatus {
    return this.config.getSafeStatus();
  }

  private provider() {
    if (this.config.provider === 's3') {
      if (!this.config.s3Configured) throw new BadRequestException('S3 storage is selected but not fully configured.');
      return this.s3Provider;
    }
    return this.localProvider;
  }

  private providerForKey(_key: string) {
    return this.config.provider === 's3' ? this.s3Provider : this.localProvider;
  }
}
