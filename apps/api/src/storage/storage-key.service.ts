import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

const mimeExtensions: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Injectable()
export class StorageKeyService {
  createObjectKey(originalFileName: string, mimeType: string, prefix = 'documents') {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const safePrefix = this.safePrefix(prefix);
    const extension = this.safeExtension(originalFileName, mimeType);
    return `${safePrefix}/${yyyy}/${mm}/${randomUUID()}${extension}`;
  }

  private safePrefix(prefix: string) {
    return prefix
      .split('/')
      .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, ''))
      .filter(Boolean)
      .join('/') || 'documents';
  }

  private safeExtension(originalFileName: string, mimeType: string) {
    const fromMime = mimeExtensions[mimeType];
    if (fromMime) return fromMime;
    const extension = extname(originalFileName).toLowerCase();
    return /^\.[a-z0-9]{1,12}$/.test(extension) ? extension : '.bin';
  }
}
