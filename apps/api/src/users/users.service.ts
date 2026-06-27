import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createPrismaUsersClient } from './prisma-users.client';
import type { UserRecord } from './user.types';

@Injectable()
export class UsersService implements OnModuleDestroy {
  private clientInstance?: ReturnType<typeof createPrismaUsersClient>;

  private get client() {
    if (!this.clientInstance) {
      this.clientInstance = createPrismaUsersClient();
    }
    return this.clientInstance;
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    const normalizedUsername = username.trim();
    if (!normalizedUsername) return null;

    return this.client.user.findUnique({
      where: { username: normalizedUsername },
    });
  }

  async findActiveByUsername(username: string): Promise<UserRecord | null> {
    const user = await this.findByUsername(username);
    return this.isActiveUser(user) ? user : null;
  }

  async findActiveById(id: string): Promise<UserRecord | null> {
    if (!id) return null;

    const user = await this.client.user.findUnique({
      where: { id },
    });
    return this.isActiveUser(user) ? user : null;
  }

  async markLoginSuccess(
    id: string,
    refreshTokenHash: string,
  ): Promise<UserRecord> {
    return this.client.user.update({
      where: { id },
      data: {
        refreshTokenHash,
        lastLoginAt: new Date(),
      },
    });
  }

  async setRefreshTokenHash(
    id: string,
    refreshTokenHash: string | null,
  ): Promise<UserRecord> {
    return this.client.user.update({
      where: { id },
      data: { refreshTokenHash },
    });
  }

  async onModuleDestroy() {
    await this.clientInstance?.$disconnect?.();
  }

  private isActiveUser(user?: UserRecord | null): user is UserRecord {
    return Boolean(user && user.isActive && !user.deletedAt);
  }
}
