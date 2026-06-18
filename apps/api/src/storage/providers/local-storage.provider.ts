import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { StorageConfigService } from '../storage.config';
import { StorageKeyService } from '../storage-key.service';
import { StorageSafetyService } from '../storage-safety.service';
import type { StorageProvider } from './storage-provider.interface';
import type { PutObjectInput, StorageObjectHead, StorageObjectStream, StorageUrlOptions, StoredObjectInfo } from '../storage.types';

const mimeTypesByExtension: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  constructor(
    private readonly config: StorageConfigService,
    private readonly keyService: StorageKeyService,
    private readonly safety: StorageSafetyService,
  ) {}

  async putObject(input: PutObjectInput): Promise<StoredObjectInfo> {
    await this.config.ensureLocalDirectories();
    const storageKey = this.keyService.createObjectKey(input.originalFileName, input.mimeType, input.prefix);
    const absolutePath = this.pathForKey(storageKey);
    const tempPath = this.pathForTemp(`${Date.now()}-${storageKey.replace(/[\\/]/g, '-')}.tmp`);
    await mkdir(dirname(absolutePath), { recursive: true });
    await mkdir(this.config.tempRoot, { recursive: true });

    let checksumSha256 = '';
    let fileSize = 0;
    if (input.buffer) {
      checksumSha256 = createHash('sha256').update(input.buffer).digest('hex');
      fileSize = input.buffer.length;
      await writeFile(tempPath, input.buffer);
    } else if (input.stream) {
      const hash = createHash('sha256');
      input.stream.on('data', (chunk) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        hash.update(buffer);
        fileSize += buffer.length;
      });
      await pipeline(input.stream, createWriteStream(tempPath));
      checksumSha256 = hash.digest('hex');
    } else {
      throw new Error('Storage input must include a buffer or stream.');
    }

    await rename(tempPath, absolutePath);

    return {
      provider: 'local',
      storageKey,
      originalFileName: input.originalFileName,
      storedFileName: storageKey,
      mimeType: input.mimeType,
      fileSize: input.fileSize ?? fileSize,
      checksumSha256,
      createdAt: new Date().toISOString(),
      previewMode: 'proxy',
      metadata: input.metadata,
    };
  }

  async getObjectStream(key: string): Promise<StorageObjectStream | undefined> {
    const storageKey = this.safety.assertSafeStorageKey(key);
    const absolutePath = this.pathForKey(storageKey);
    try {
      const fileStat = await stat(absolutePath);
      if (!fileStat.isFile()) return undefined;
      return {
        provider: 'local',
        storageKey,
        mimeType: mimeTypesByExtension[extname(storageKey).toLowerCase()] ?? 'application/octet-stream',
        fileSize: fileStat.size,
        stream: createReadStream(absolutePath),
      };
    } catch {
      return undefined;
    }
  }

  async headObject(key: string): Promise<StorageObjectHead | undefined> {
    const object = await this.getObjectStream(key);
    if (!object) return undefined;
    object.stream.destroy();
    return {
      provider: 'local',
      storageKey: object.storageKey,
      mimeType: object.mimeType,
      fileSize: object.fileSize,
    };
  }

  async objectExists(key: string) {
    return Boolean(await this.headObject(key));
  }

  async deleteObject(key: string) {
    const storageKey = this.safety.assertSafeStorageKey(key);
    const absolutePath = this.pathForKey(storageKey);
    try {
      await rm(absolutePath, { force: false });
      return { deleted: true, reason: 'deleted' };
    } catch {
      return { deleted: false, reason: 'file_not_found' };
    }
  }

  async createPreviewUrl(key: string, options: StorageUrlOptions = {}) {
    if (options.documentId) return `/${this.config.apiPrefix}/files/documents/${encodeURIComponent(options.documentId)}/preview`;
    return `/${this.config.apiPrefix}/files/${encodeURIComponent(this.safety.assertSafeStorageKey(key))}`;
  }

  async createDownloadUrl(key: string, options: StorageUrlOptions = {}) {
    if (options.documentId) return `/${this.config.apiPrefix}/files/documents/${encodeURIComponent(options.documentId)}/download`;
    return `/${this.config.apiPrefix}/files/${encodeURIComponent(this.safety.assertSafeStorageKey(key))}`;
  }

  getSafeStatus() {
    return this.config.getSafeStatus();
  }

  private pathForKey(key: string) {
    const safeKey = this.safety.assertSafeStorageKey(key);
    return this.safety.assertInsideRoot(this.config.uploadsRoot, join(this.config.uploadsRoot, safeKey));
  }

  private pathForTemp(name: string) {
    return this.safety.assertInsideRoot(this.config.tempRoot, join(this.config.tempRoot, name));
  }
}
