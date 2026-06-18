import { Injectable } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import type { FileStorageProviderName, StoragePreviewMode, StorageSafeStatus } from './storage.types';

function env(name: string, fallback = '') {
  const value = process.env[name];
  return value === undefined || value === null || value === '' ? fallback : value;
}

function envBool(name: string, fallback: boolean) {
  const value = process.env[name];
  if (value === undefined || value === null || value === '') return fallback;
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
}

function resolveConfiguredPath(value: string, fallback: string) {
  const selected = value || fallback;
  return isAbsolute(selected) ? resolve(selected) : resolve(process.cwd(), selected);
}

@Injectable()
export class StorageConfigService {
  readonly provider: FileStorageProviderName;
  readonly storageRoot: string;
  readonly uploadsRoot: string;
  readonly metadataRoot: string;
  readonly tempRoot: string;
  readonly maxFileSizeMb: number;
  readonly urlMode: StoragePreviewMode;
  readonly apiPrefix: string;
  readonly s3Endpoint: string;
  readonly s3ExternalEndpoint: string;
  readonly s3Region: string;
  readonly s3Bucket: string;
  readonly s3AccessKeyId: string;
  readonly s3SecretAccessKey: string;
  readonly s3ForcePathStyle: boolean;
  readonly s3ObjectPrefix: string;
  readonly s3SignedUrlTtlSeconds: number;

  constructor() {
    const provider = env('FILE_STORAGE_PROVIDER', 'local').toLowerCase();
    this.provider = provider === 's3' ? 's3' : 'local';
    this.storageRoot = resolveConfiguredPath(env('STORAGE_ROOT'), './storage');
    this.uploadsRoot = join(this.storageRoot, 'uploads');
    this.metadataRoot = resolveConfiguredPath(env('METADATA_ROOT'), join(this.storageRoot, 'metadata'));
    this.tempRoot = resolveConfiguredPath(env('STORAGE_TEMP_ROOT'), join(this.storageRoot, 'tmp'));
    this.maxFileSizeMb = Number(env('STORAGE_MAX_FILE_SIZE_MB', '30')) || 30;
    this.urlMode = env('STORAGE_URL_MODE', 'proxy') === 'signed-url' ? 'signed-url' : 'proxy';
    this.apiPrefix = env('API_PREFIX', 'api').replace(/^\/+|\/+$/g, '') || 'api';
    this.s3Endpoint = env('S3_ENDPOINT');
    this.s3ExternalEndpoint = env('S3_EXTERNAL_ENDPOINT');
    this.s3Region = env('S3_REGION', 'us-east-1');
    this.s3Bucket = env('S3_BUCKET');
    this.s3AccessKeyId = env('S3_ACCESS_KEY_ID');
    this.s3SecretAccessKey = env('S3_SECRET_ACCESS_KEY');
    this.s3ForcePathStyle = envBool('S3_FORCE_PATH_STYLE', true);
    this.s3ObjectPrefix = env('S3_OBJECT_PREFIX', 'hanglian').replace(/^\/+|\/+$/g, '') || 'hanglian';
    this.s3SignedUrlTtlSeconds = Number(env('S3_SIGNED_URL_TTL_SECONDS', '900')) || 900;
  }

  get s3Configured() {
    return Boolean(this.s3Endpoint && this.s3Bucket && this.s3AccessKeyId && this.s3SecretAccessKey);
  }

  async ensureLocalDirectories() {
    await mkdir(this.uploadsRoot, { recursive: true });
    await mkdir(this.metadataRoot, { recursive: true });
    await mkdir(this.tempRoot, { recursive: true });
  }

  getSafeStatus(): StorageSafeStatus {
    const s3Ready = this.s3Configured;
    const localReady = existsSync(this.uploadsRoot) && existsSync(this.metadataRoot) && existsSync(this.tempRoot);
    const configured = this.provider === 'local' ? localReady : s3Ready;
    return {
      provider: this.provider,
      configured,
      localReady,
      s3Configured: s3Ready,
      storageRootConfigured: Boolean(this.storageRoot),
      metadataRootConfigured: Boolean(this.metadataRoot),
      uploadDirectoryExists: existsSync(this.uploadsRoot),
      metadataDirectoryExists: existsSync(this.metadataRoot),
      tempDirectoryExists: existsSync(this.tempRoot),
      urlMode: this.provider === 's3' ? 'signed-url' : this.urlMode,
      maxFileSizeMb: this.maxFileSizeMb,
      s3: {
        endpointConfigured: Boolean(this.s3Endpoint),
        bucketConfigured: Boolean(this.s3Bucket),
        credentialsConfigured: Boolean(this.s3AccessKeyId && this.s3SecretAccessKey),
        prefixConfigured: Boolean(this.s3ObjectPrefix),
      },
      databaseConnected: false,
      message: this.provider === 's3'
        ? s3Ready
          ? 'S3 storage is configured but no smoke test is executed.'
          : 'S3 storage is selected but required configuration is incomplete.'
        : 'Local file storage is active. No Sealos object storage connection is used.',
    };
  }
}
