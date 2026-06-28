import { BadRequestException, Injectable } from '@nestjs/common';
import { basename, resolve } from 'node:path';

@Injectable()
export class StorageSafetyService {
  assertInsideRoot(root: string, target: string) {
    const resolvedRoot = resolve(root);
    const resolvedTarget = resolve(target);
    if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(`${resolvedRoot}\\`) && !resolvedTarget.startsWith(`${resolvedRoot}/`)) {
      throw new BadRequestException('Unsafe storage path.');
    }
    return resolvedTarget;
  }

  isSafeLegacyFileName(value?: string) {
    return Boolean(value && /^[a-zA-Z0-9._-]+$/.test(value) && basename(value) === value);
  }

  assertSafeStorageKey(key: string) {
    const normalized = key.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized || normalized.includes('..') || normalized.split('/').some((part) => !part || part === '.' || part === '..')) {
      throw new BadRequestException('Unsafe storage key.');
    }
    if (!/^[a-zA-Z0-9._/-]+$/.test(normalized)) {
      throw new BadRequestException('Storage key contains unsupported characters.');
    }
    return normalized;
  }

  safeDownloadFileName(value?: string) {
    const name = value?.trim() || 'document';
    return name.replace(/[\\/"<>|:*?]/g, '_').slice(0, 180) || 'document';
  }
}
