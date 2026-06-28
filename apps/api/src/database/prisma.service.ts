import { Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseConfigService } from './database-config.service';
import { loadGeneratedPrismaClient } from './prisma-client-loader';
import {
  assertPrismaSchemaRoute,
  createSchemaAwarePrismaPgAdapter,
  type PrismaPgSchemaRoute,
} from './prisma-pg-schema';

type PrismaClientLike = {
  $connect?: () => Promise<void>;
  $disconnect?: () => Promise<void>;
  $queryRawUnsafe?: (query: string) => Promise<Array<Record<string, unknown>>>;
  $transaction: <T>(work: ((client?: PrismaClientLike) => Promise<T> | T) | unknown[]) => Promise<T>;
  [key: string]: any;
};

export type PrismaConnectionStatus = 'disabled' | 'connecting' | 'connected' | 'failed';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private clientInstance?: PrismaClientLike;
  private schemaRoute?: PrismaPgSchemaRoute;
  private status: PrismaConnectionStatus = 'disabled';
  private failureMessage?: string;

  constructor(private readonly databaseConfig: DatabaseConfigService) {}

  get isAvailable() {
    return this.getSafeStatus().databaseConnected;
  }

  get disabledMessage() {
    return this.databaseConfig.getStatus().message;
  }

  get client(): PrismaClientLike {
    if (this.databaseConfig.isMockMode()) {
      throw new ServiceUnavailableException('DATA_SOURCE=mock；不会实例化 PrismaClient。');
    }
    this.databaseConfig.assertCanStartPostgres();
    if (!this.clientInstance) {
      this.clientInstance = this.createClient();
    }
    return this.clientInstance;
  }

  async onModuleInit() {
    if (this.databaseConfig.isMockMode()) {
      this.status = 'disabled';
      return;
    }

    this.databaseConfig.assertCanStartPostgres();
    this.status = 'connecting';
    try {
      const client = this.client;
      if (typeof client.$connect === 'function') {
        await this.withTimeout(client.$connect(), 5000);
      }
      if (this.schemaRoute) {
        await this.withTimeout(assertPrismaSchemaRoute(client, this.schemaRoute), 5000);
      }
      this.status = 'connected';
    } catch (error) {
      this.status = 'failed';
      this.failureMessage = error instanceof Error ? error.message : 'PostgreSQL 连接失败。';
      this.logger.error(`PostgreSQL 连接失败：${this.sanitizeError(this.failureMessage)}`);
      throw new ServiceUnavailableException('PostgreSQL 连接失败，已隐藏连接信息。');
    }
  }

  async onModuleDestroy() {
    await this.clientInstance?.$disconnect?.();
  }

  getSafeStatus() {
    const safety = this.databaseConfig.getStatus();
    return {
      status: this.status,
      databaseConnected: this.status === 'connected',
      dataSource: safety.dataSource,
      databaseTarget: safety.dataSource === 'postgres' ? safety.dbTarget : undefined,
      prismaWriteEnabled: safety.dataSource === 'postgres' ? safety.canWriteDatabase : undefined,
      provider: safety.safeSummary.provider,
      hostConfigured: safety.safeSummary.hostConfigured,
      failure: this.failureMessage ? this.sanitizeError(this.failureMessage) : undefined,
    };
  }

  private createClient(): PrismaClientLike {
    // Lazy require keeps mock startup safe and prevents a DB pool during module import.
    const { PrismaClient } = loadGeneratedPrismaClient();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaPg } = require('@prisma/adapter-pg');
    const databaseUrl = process.env.DATABASE_URL ?? '';
    const { adapter, route } = createSchemaAwarePrismaPgAdapter(PrismaPg, databaseUrl);
    this.schemaRoute = route;
    return new PrismaClient({
      adapter,
      log: ['warn', 'error'],
    });
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error('PostgreSQL 连接超时。')), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private sanitizeError(message: string) {
    return message
      .replace(/postgres(?:ql)?:\/\/\S+/gi, 'postgresql://***')
      .replace(/password=[^&\s]+/gi, 'password=***')
      .replace(/user=[^&\s]+/gi, 'user=***');
  }
}
