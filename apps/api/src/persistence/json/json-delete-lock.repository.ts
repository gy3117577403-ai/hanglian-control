import { Injectable } from '@nestjs/common';
import { LocalStorageService } from '../../storage/local-storage.service';
import type { DeleteLockRepository, DeleteLockSetting } from '../persistence.types';

const fileName = 'delete-lock-settings.json';
const defaultDeletePasswordHash = '$2b$10$UxaACK8OE5QQTeirgV2M1.TSdSzwyZaVjL9kmuCWx3WsJ6EF1nVma';

function defaultSetting(): DeleteLockSetting {
  return {
    enabled: true,
    passwordHash: defaultDeletePasswordHash,
    updatedAt: '2026-06-15T00:00:00.000Z',
    updatedBy: 'local-default',
    failedAttempts: 0,
    lockedUntil: null,
  };
}

@Injectable()
export class JsonDeleteLockRepository implements DeleteLockRepository {
  constructor(private readonly localStorageService: LocalStorageService) {}

  readSettings(): DeleteLockSetting {
    const fallback = defaultSetting();
    const setting = this.localStorageService.readMetadataSync<Partial<DeleteLockSetting>>(fileName, fallback);
    return {
      enabled: typeof setting.enabled === 'boolean' ? setting.enabled : fallback.enabled,
      passwordHash: setting.passwordHash || fallback.passwordHash,
      updatedAt: setting.updatedAt ?? fallback.updatedAt,
      updatedBy: setting.updatedBy ?? fallback.updatedBy,
      failedAttempts: Number.isFinite(setting.failedAttempts) ? Number(setting.failedAttempts) : fallback.failedAttempts,
      lockedUntil: setting.lockedUntil ?? fallback.lockedUntil,
    };
  }

  writeSettings(setting: DeleteLockSetting) {
    this.localStorageService.writeMetadataSync(fileName, setting);
  }

  updateFailedAttempts(failedAttempts: number, lockedUntil: string | null) {
    const next = { ...this.readSettings(), failedAttempts, lockedUntil };
    this.writeSettings(next);
    return next;
  }

  updateLockedUntil(lockedUntil: string | null) {
    const next = { ...this.readSettings(), lockedUntil };
    this.writeSettings(next);
    return next;
  }

  updatePasswordHash(passwordHash: string, updatedBy: string) {
    const next: DeleteLockSetting = {
      ...this.readSettings(),
      enabled: true,
      passwordHash,
      updatedAt: new Date().toISOString(),
      updatedBy,
      failedAttempts: 0,
      lockedUntil: null,
    };
    this.writeSettings(next);
    return next;
  }

  resetLockState() {
    const next = { ...this.readSettings(), failedAttempts: 0, lockedUntil: null };
    this.writeSettings(next);
    return next;
  }
}
