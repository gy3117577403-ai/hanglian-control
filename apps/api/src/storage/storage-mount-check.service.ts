import { Injectable } from '@nestjs/common';
import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { constants, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { StorageConfigService } from './storage.config';

export interface StorageMountReadiness {
  rootConfigured: boolean;
  storageRootReady: boolean;
  uploadsReady: boolean;
  metadataReady: boolean;
  tempReady: boolean;
  writableProbeAllowed: boolean;
  lastMountCheck?: {
    checkedAt: string;
    ok: boolean;
  };
  databaseConnected: false;
  s3Connected: false;
  message: string;
}

export interface StorageMountProbeResult extends StorageMountReadiness {
  probeCreated: boolean;
  probeRead: boolean;
  probeDeleted: boolean;
}

@Injectable()
export class StorageMountCheckService {
  private lastMountCheck?: { checkedAt: string; ok: boolean };

  constructor(private readonly config: StorageConfigService) {}

  getReadiness(): StorageMountReadiness {
    const rootExists = existsSync(this.config.storageRoot);
    const uploadsReady = existsSync(this.config.uploadsRoot);
    const metadataReady = existsSync(this.config.metadataRoot);
    const tempReady = existsSync(this.config.tempRoot);
    return {
      rootConfigured: Boolean(this.config.storageRoot),
      storageRootReady: rootExists,
      uploadsReady,
      metadataReady,
      tempReady,
      writableProbeAllowed: this.canPrepareDirectories(),
      lastMountCheck: this.lastMountCheck,
      databaseConnected: false,
      s3Connected: false,
      message: rootExists
        ? 'Storage root is visible. Use CLI storage:mount-check for a safe tmp write probe.'
        : 'Storage root is not visible. Mount or create the configured storage root before cloud use.',
    };
  }

  async runProbe(): Promise<StorageMountProbeResult> {
    if (!this.canPrepareDirectories()) {
      const readiness = this.getReadiness();
      const failed = { checkedAt: new Date().toISOString(), ok: false };
      this.lastMountCheck = failed;
      return {
        ...readiness,
        lastMountCheck: failed,
        probeCreated: false,
        probeRead: false,
        probeDeleted: false,
      };
    }

    await mkdir(this.config.uploadsRoot, { recursive: true });
    await mkdir(this.config.metadataRoot, { recursive: true });
    await mkdir(this.config.tempRoot, { recursive: true });
    await access(this.config.tempRoot, constants.W_OK | constants.R_OK);

    const probeFile = join(this.config.tempRoot, `.mount-probe-${randomUUID()}.tmp`);
    const content = `hanglian-storage-probe:${randomUUID()}`;
    let probeCreated = false;
    let probeRead = false;
    let probeDeleted = false;
    try {
      await writeFile(probeFile, content, 'utf8');
      probeCreated = true;
      probeRead = (await readFile(probeFile, 'utf8')) === content;
    } finally {
      try {
        await unlink(probeFile);
        probeDeleted = true;
      } catch {
        probeDeleted = false;
      }
    }

    const ok = probeCreated && probeRead && probeDeleted && !existsSync(probeFile);
    const checked = { checkedAt: new Date().toISOString(), ok };
    this.lastMountCheck = checked;
    return {
      ...this.getReadiness(),
      lastMountCheck: checked,
      probeCreated,
      probeRead,
      probeDeleted,
      tempReady: existsSync(this.config.tempRoot),
      databaseConnected: false,
      s3Connected: false,
      message: ok
        ? 'Storage tmp probe succeeded and was removed.'
        : 'Storage tmp probe failed or did not clean up.',
    };
  }

  private canPrepareDirectories() {
    const rawRoot = process.env.STORAGE_ROOT ?? './storage';
    if (!this.config.storageRoot) return false;
    if (rawRoot.startsWith('.') || rawRoot === './storage' || rawRoot === 'storage') return true;
    return existsSync(this.config.storageRoot);
  }
}
