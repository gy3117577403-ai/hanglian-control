import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { LocalStorageService } from '../../storage/local-storage.service';

interface DeleteLockSetting {
  enabled: boolean;
  passwordHash?: string;
  updatedAt?: string;
  updatedBy?: string;
  failedAttempts: number;
  lockedUntil: string | null;
}

const fileName = 'delete-lock-settings.json';
const maxAttempts = 5;
const lockMs = 5 * 60 * 1000;

function defaultSetting(): DeleteLockSetting {
  return {
    enabled: true,
    failedAttempts: 0,
    lockedUntil: null,
  };
}

@Injectable()
export class DeleteLockService {
  constructor(private readonly localStorageService: LocalStorageService) {}

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
    this.write(setting);
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
      this.write({
        ...setting,
        failedAttempts,
        lockedUntil,
      });
      throw new BadRequestException(lockedUntil ? '删除操作已临时锁定，请稍后再试。' : '删除密码错误。');
    }
    this.write({
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

  private read() {
    return this.localStorageService.readMetadataSync<DeleteLockSetting>(fileName, defaultSetting());
  }

  private write(setting: DeleteLockSetting) {
    this.localStorageService.writeMetadataSync(fileName, setting);
  }
}
