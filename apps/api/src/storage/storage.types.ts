import type { Readable } from 'node:stream';

export type StorageProviderName = 'local' | 's3';

export interface SaveFileResult {
  provider: StorageProviderName;
  storageKey: string;
  storedFileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  checksumSha256: string;
}

export interface StoredFileReference {
  provider?: string;
  storageKey?: string;
  storedFileName?: string;
  mimeType?: string;
  fileSize?: number;
}

export interface StoredFileStream {
  provider: StorageProviderName;
  storageKey: string;
  stream: Readable;
  mimeType: string;
  fileSize: number;
}
