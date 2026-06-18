import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Readable } from 'node:stream';
import { StorageConfigService } from '../storage.config';
import { StorageKeyService } from '../storage-key.service';
import { StorageSafetyService } from '../storage-safety.service';
import type { StorageProvider } from './storage-provider.interface';
import type { PutObjectInput, StorageObjectHead, StorageObjectStream, StorageUrlOptions, StoredObjectInfo } from '../storage.types';

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private client?: S3Client;

  constructor(
    private readonly config: StorageConfigService,
    private readonly keyService: StorageKeyService,
    private readonly safety: StorageSafetyService,
  ) {}

  async putObject(input: PutObjectInput): Promise<StoredObjectInfo> {
    this.assertReady();
    const storageKey = this.prefixedKey(this.keyService.createObjectKey(input.originalFileName, input.mimeType, input.prefix));
    const body = input.buffer ?? input.stream;
    if (!body) throw new Error('Storage input must include a buffer or stream.');
    const checksumSha256 = input.buffer ? createHash('sha256').update(input.buffer).digest('hex') : '';
    await this.getClient().send(new PutObjectCommand({
      Bucket: this.config.s3Bucket,
      Key: storageKey,
      Body: body,
      ContentType: input.mimeType,
      Metadata: this.cleanMetadata({
        originalFileName: input.originalFileName,
        checksumSha256,
        ...input.metadata,
      }),
    }));
    return {
      provider: 's3',
      storageKey,
      originalFileName: input.originalFileName,
      storedFileName: storageKey,
      mimeType: input.mimeType,
      fileSize: input.fileSize ?? input.buffer?.length ?? 0,
      checksumSha256,
      createdAt: new Date().toISOString(),
      previewMode: 'signed-url',
      metadata: input.metadata,
    };
  }

  async getObjectStream(key: string): Promise<StorageObjectStream | undefined> {
    this.assertReady();
    const storageKey = this.prefixedKey(key);
    const response = await this.getClient().send(new GetObjectCommand({
      Bucket: this.config.s3Bucket,
      Key: storageKey,
    }));
    if (!response.Body || typeof (response.Body as NodeJS.ReadableStream).pipe !== 'function') return undefined;
    return {
      provider: 's3',
      storageKey,
      mimeType: response.ContentType ?? 'application/octet-stream',
      fileSize: Number(response.ContentLength ?? 0),
      stream: response.Body as Readable,
    };
  }

  async headObject(key: string): Promise<StorageObjectHead | undefined> {
    this.assertReady();
    try {
      const storageKey = this.prefixedKey(key);
      const response = await this.getClient().send(new HeadObjectCommand({
        Bucket: this.config.s3Bucket,
        Key: storageKey,
      }));
      return {
        provider: 's3',
        storageKey,
        mimeType: response.ContentType ?? 'application/octet-stream',
        fileSize: Number(response.ContentLength ?? 0),
        checksumSha256: response.Metadata?.checksumsha256,
        updatedAt: response.LastModified?.toISOString(),
      };
    } catch {
      return undefined;
    }
  }

  async objectExists(key: string) {
    return Boolean(await this.headObject(key));
  }

  async deleteObject(key: string) {
    this.assertReady();
    const storageKey = this.prefixedKey(key);
    await this.getClient().send(new DeleteObjectCommand({
      Bucket: this.config.s3Bucket,
      Key: storageKey,
    }));
    return { deleted: true, reason: 'deleted' };
  }

  async createPreviewUrl(key: string, _options: StorageUrlOptions = {}) {
    this.assertReady();
    const command = new GetObjectCommand({ Bucket: this.config.s3Bucket, Key: this.prefixedKey(key) });
    return getSignedUrl(this.getClient(), command, { expiresIn: this.config.s3SignedUrlTtlSeconds });
  }

  async createDownloadUrl(key: string, options: StorageUrlOptions = {}) {
    this.assertReady();
    const fileName = this.safety.safeDownloadFileName(options.fileName);
    const command = new GetObjectCommand({
      Bucket: this.config.s3Bucket,
      Key: this.prefixedKey(key),
      ResponseContentDisposition: `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    });
    return getSignedUrl(this.getClient(), command, { expiresIn: this.config.s3SignedUrlTtlSeconds });
  }

  getSafeStatus() {
    return this.config.getSafeStatus();
  }

  private getClient() {
    if (!this.client) {
      this.client = new S3Client({
        region: this.config.s3Region,
        endpoint: this.config.s3Endpoint,
        forcePathStyle: this.config.s3ForcePathStyle,
        credentials: {
          accessKeyId: this.config.s3AccessKeyId,
          secretAccessKey: this.config.s3SecretAccessKey,
        },
      });
    }
    return this.client;
  }

  private assertReady() {
    if (!this.config.s3Configured) {
      throw new Error('S3 storage is not fully configured.');
    }
  }

  private prefixedKey(key: string) {
    const safeKey = this.safety.assertSafeStorageKey(key);
    const prefix = this.config.s3ObjectPrefix;
    return safeKey.startsWith(`${prefix}/`) ? safeKey : `${prefix}/${safeKey}`;
  }

  private cleanMetadata(metadata: Record<string, string | number | boolean | undefined>) {
    return Object.fromEntries(
      Object.entries(metadata)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key.replace(/[^a-zA-Z0-9_-]/g, ''), String(value)]),
    );
  }
}
