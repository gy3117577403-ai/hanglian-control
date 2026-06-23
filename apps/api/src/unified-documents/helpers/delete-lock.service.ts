import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JsonDeleteLockRepository } from '../../persistence/json/json-delete-lock.repository';
import { DELETE_LOCK_REPOSITORY } from '../../persistence/persistence.tokens';
import type { DeleteLockRepository, DeleteLockSetting } from '../../persistence/persistence.types';
import type { LocalStorageService } from '../../storage/local-storage.service';

const maxAttempts = 5;
const lockMs = 5 * 60 * 1000;

type MaybePromise<T> = T | Promise<T>;

function isPromise<T>(value: MaybePromise<T>): value is Promise<T> {
  return Boolean(value && typeof (value as Promise<T>).then === 'function');
}

@Injectable()
export class DeleteLockService {
  private readonly deleteLockRepository: DeleteLockRepository;

  constructor(
    @Inject(DELETE_LOCK_REPOSITORY)
    deleteLockRepository: DeleteLockRepository | LocalStorageService,
  ) {
    this.deleteLockRepository = 'readSettings' in deleteLockRepository
      ? deleteLockRepository
      : new JsonDeleteLockRepository(deleteLockRepository);
  }

  status() {
    const setting = this.read();
    if (isPromise(setting)) return setting.then((value) => this.statusFromSetting(value));
    return this.statusFromSetting(setting);
  }

  setup(password: string, confirmPassword: string, updatedBy = 'local-user') {
    this.assertPassword(password, confirmPassword);
    const setting: DeleteLockSetting = {
      enabled: true,
      passwordHash: bcrypt.hashSync(password, 10),
      updatedAt: new Date().toISOString(),
      updatedBy,
      failedAttempts: 0,
      lockedUntil: null,
    };
    const written = this.deleteLockRepository.writeSettings(setting);
    if (isPromise(written)) return written.then(() => this.status());
    return this.status();
  }

  change(oldPassword: string, password: string, confirmPassword: string, updatedBy = 'local-user') {
    const verified = this.assertVerified(oldPassword);
    if (isPromise(verified)) return verified.then(() => this.setup(password, confirmPassword, updatedBy));
    return this.setup(password, confirmPassword, updatedBy);
  }

  verify(password: string) {
    try {
      const verified = this.assertVerified(password);
      if (isPromise(verified)) {
        return verified.then(() => ({ valid: true })).catch(() => ({ valid: false }));
      }
      return { valid: true };
    } catch {
      return { valid: false };
    }
  }

  assertVerified(password: string): MaybePromise<void> {
    const setting = this.read();
    if (isPromise(setting)) return setting.then((value) => this.assertVerifiedWithSetting(value, password));
    return this.assertVerifiedWithSetting(setting, password);
  }

  private statusFromSetting(setting: DeleteLockSetting) {
    const locked = Boolean(setting.lockedUntil && Date.parse(setting.lockedUntil) > Date.now());
    return {
      enabled: setting.enabled,
      hasPassword: Boolean(setting.passwordHash),
      locked,
      lockedUntil: locked ? setting.lockedUntil : null,
      failedAttempts: setting.failedAttempts,
    };
  }

  private assertVerifiedWithSetting(setting: DeleteLockSetting, password: string): MaybePromise<void> {
    if (!setting.passwordHash) {
      throw new BadRequestException('请先设置删除密码。');
    }
    if (setting.lockedUntil && Date.parse(setting.lockedUntil) > Date.now()) {
      throw new BadRequestException('删除操作已临时锁定，请稍后再试。');
    }
    if (!bcrypt.compareSync(password, setting.passwordHash)) {
      const failedAttempts = (setting.failedAttempts ?? 0) + 1;
      const lockedUntil = failedAttempts >= maxAttempts ? new Date(Date.now() + lockMs).toISOString() : null;
      const written = this.deleteLockRepository.writeSettings({
        ...setting,
        failedAttempts,
        lockedUntil,
      });
      const error = new BadRequestException(lockedUntil ? '删除操作已临时锁定，请稍后再试。' : '删除密码错误。');
      if (isPromise(written)) {
        return written.then(() => {
          throw error;
        });
      }
      throw error;
    }
    const written = this.deleteLockRepository.writeSettings({
      ...setting,
      failedAttempts: 0,
      lockedUntil: null,
    });
    if (isPromise(written)) return written.then(() => undefined);
  }

  private assertPassword(password: string, confirmPassword: string) {
    if (!password || password.length < 6) {
      throw new BadRequestException('删除密码至少 6 位。');
    }
    if (password !== confirmPassword) {
      throw new BadRequestException('两次输入的删除密码不一致。');
    }
  }

  private read(): MaybePromise<DeleteLockSetting> {
    return this.deleteLockRepository.readSettings();
  }
}
