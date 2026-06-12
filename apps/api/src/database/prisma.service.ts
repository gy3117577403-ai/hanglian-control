import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { assertDatabaseReadAllowed, getDatabaseSafetyStatus } from './database-safety';

type PrismaClientLike = {
  $disconnect?: () => Promise<void>;
  [key: string]: any;
};

@Injectable()
export class PrismaService implements OnModuleDestroy {
  private clientInstance?: PrismaClientLike;

  get isAvailable() {
    return getDatabaseSafetyStatus().prismaAvailable;
  }

  get disabledMessage() {
    return getDatabaseSafetyStatus().message;
  }

  get client(): PrismaClientLike {
    assertDatabaseReadAllowed();
    if (!this.clientInstance) {
      // Lazy require keeps Mock mode startup safe and avoids opening a DB pool by default.
      // The generated client is created by `npx prisma generate`.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PrismaClient } = require('../../generated/prisma/client');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PrismaPg } = require('@prisma/adapter-pg');
      this.clientInstance = new PrismaClient({
        adapter: new PrismaPg({
          connectionString: process.env.DATABASE_URL,
        }),
      });
    }
    return this.clientInstance as PrismaClientLike;
  }

  async onModuleDestroy() {
    await this.clientInstance?.$disconnect?.();
  }
}
