import type { Readable } from 'node:stream';

export type FileStorageProviderName = 'local' | 's3';
export type StoragePreviewMode = 'proxy' | 'signed-url';

export interface PutObjectInput {
  originalFileName: string;
  mimeType: string;
  buffer?: Buffer;
  stream?: Readable;
  fileSize?: number;
  prefix?: string;
  metadata?: Record<string, string | number | boolean | undefined>;
}

export interface StoredObjectInfo {
  provider: FileStorageProviderName;
  storageKey: string;
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  fileSize: number;
  checksumSha256: string;
  createdAt: string;
  previewMode: StoragePreviewMode;
  metadata?: Record<string, string | number | boolean | undefined>;
}

export interface StorageObjectHead {
  provider: FileStorageProviderName;
  storageKey: string;
  mimeType: string;
  fileSize: number;
  checksumSha256?: string;
  updatedAt?: string;
}

export interface StorageObjectStream {
  provider: FileStorageProviderName;
  storageKey: string;
  mimeType: string;
  fileSize: number;
  stream: Readable;
}

export interface StorageUrlOptions {
  documentId?: string;
  disposition?: 'inline' | 'attachment';
  fileName?: string;
}

export interface StorageSafeStatus {
  provider: FileStorageProviderName;
  configured: boolean;
  localReady: boolean;
  s3Configured: boolean;
  storageRootConfigured: boolean;
  metadataRootConfigured: boolean;
  uploadDirectoryExists: boolean;
  metadataDirectoryExists: boolean;
  tempDirectoryExists: boolean;
  urlMode: StoragePreviewMode;
  maxFileSizeMb: number;
  s3: {
    endpointConfigured: boolean;
    bucketConfigured: boolean;
    credentialsConfigured: boolean;
    prefixConfigured: boolean;
  };
  databaseConnected: false;
  message: string;
}
