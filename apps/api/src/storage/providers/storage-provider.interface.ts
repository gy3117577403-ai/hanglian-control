import type {
  PutObjectInput,
  StorageObjectHead,
  StorageObjectStream,
  StorageSafeStatus,
  StorageUrlOptions,
  StoredObjectInfo,
} from '../storage.types';

export interface StorageProvider {
  putObject(input: PutObjectInput): Promise<StoredObjectInfo>;
  getObjectStream(key: string): Promise<StorageObjectStream | undefined>;
  headObject(key: string): Promise<StorageObjectHead | undefined>;
  objectExists(key: string): Promise<boolean>;
  deleteObject(key: string): Promise<{ deleted: boolean; reason: string }>;
  createPreviewUrl(key: string, options?: StorageUrlOptions): Promise<string>;
  createDownloadUrl(key: string, options?: StorageUrlOptions): Promise<string>;
  getSafeStatus(): StorageSafeStatus;
}
