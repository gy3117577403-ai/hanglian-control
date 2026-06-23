import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JsonDeleteLockRepository } from '../../persistence/json/json-delete-lock.repository';
import { DELETE_LOCK_REPOSITORY } from '../../persistence/persistence.tokens';
import type { DeleteLockRepository, DeleteLockSetting } from '../../persistence/persistence.types';
import type { LocalStorageService } from '../../storage/local-storage.service';

const maxAttempts = 5;
const lockMs = 5 * 60 * 1000;

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
    const locked = Boolean(setting.lockedUntil && Date.parse(setting.lockedUntil) > Date.now());
    return {
      enabled: setting.enabled,
      hasPassword: Boolean(setting.passwordHash),
      locked,
      lockedUntil: locked ? setting.lockedUntil : null,
      failedAttempts: setting.failedAttempts,
    };
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
    this.deleteLockRepository.writeSettings(setting);
    return this.status();
  }

  change(oldPassword: string, password: string, confirmPassword: string, updatedBy = 'local-user') {
    this.assertVerified(oldPassword);
    return this.setup(password, confirmPassword, updatedBy);
  }

  verify(password: string) {
    try {
      this.assertVerified(password);
      return { valid: true };
    } catch {
      return { valid: false };
    }
  }

  assertVerified(password: string) {
    const setting = this.read();
    if (!setting.passwordHash) {
      throw new BadRequestException('请先设置删除密码。');
    }
    if (setting.lockedUntil && Date.parse(setting.lockedUntil) > Date.now()) {
      throw new BadRequestException('删除操作已临时锁定，请稍后再试。');
    }
    if (!bcrypt.compareSync(password, setting.passwordHash)) {
      const failedAttempts = (setting.failedAttempts ?? 0) + 1;
      const lockedUntil = failedAttempts >= maxAttempts ? new Date(Date.now() + lockMs).toISOString() : null;
      this.deleteLockRepository.writeSettings({
        ...setting,
        failedAttempts,
        lockedUntil,
      });
      throw new BadRequestException(lockedUntil ? '删除操作已临时锁定，请稍后再试。' : '删除密码错误。');
    }
    this.deleteLockRepository.writeSettings({
      ...setting,
      failedAttempts: 0,
      lockedUntil: null,
    });
  }

  private assertPassword(password: string, confirmPassword: string) {
    if (!password || password.length < 6) {
      throw new BadRequestException('删除密码至少 6 位。');
    }
    if (password !== confirmPassword) {
      throw new BadRequestException('两次输入的删除密码不一致。');
    }
  }

  private read(): DeleteLockSetting {
    return this.deleteLockRepository.readSettings();
  }
}
