import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { MaybePromise, PersistenceUnitOfWork } from './persistence.types';

@Injectable()
export class JsonPersistenceUnitOfWork implements PersistenceUnitOfWork {
  private queue = Promise.resolve();

  async run<T>(work: () => MaybePromise<T>): Promise<T> {
    const previous = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await work();
    } finally {
      release();
    }
  }

  runInTransaction<T>(work: () => MaybePromise<T>) {
    return this.run(work);
  }
}

@Injectable()
export class PrismaPersistenceUnitOfWork implements PersistenceUnitOfWork {
  constructor(private readonly prismaService: PrismaService) {}

  async run<T>(work: () => MaybePromise<T>): Promise<T> {
    return this.runInTransaction(work);
  }

  async runInTransaction<T>(work: () => MaybePromise<T>): Promise<T> {
    const client = this.prismaService.client;
    if (typeof client.$transaction === 'function') {
      return client.$transaction(async () => work());
    }
    return work();
  }
}
