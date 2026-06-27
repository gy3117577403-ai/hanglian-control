import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DATA_SOURCE_CONFIG } from '../common/constants/repository-tokens';
import type { CustomerSeed } from '../common/types/production.types';
import type { DataSourceConfig } from '../config/data-source.config';
import { assertDatabaseWriteAllowed } from '../database/database-safety';
import { PrismaService } from '../database/prisma.service';
import { mockStore } from '../mock/production.mock';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

type CustomerRow = CustomerSeed & {
  createdAt?: string;
  updatedAt?: string;
  productCount?: number;
};

function nowId(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

function mapPrismaCustomer(row: Record<string, any>): CustomerRow {
  return {
    id: row.id,
    name: row.name,
    code: row.code ?? '',
    salesOwner: row.salesOwner ?? '',
    createdAt: row.createdAt
      ? new Date(row.createdAt).toISOString()
      : undefined,
    updatedAt: row.updatedAt
      ? new Date(row.updatedAt).toISOString()
      : undefined,
    productCount: row._count?.products ?? row.products?.length ?? 0,
  };
}

@Injectable()
export class CustomersService {
  private readonly deletedMockCustomerIds = new Set<string>();

  constructor(
    @Inject(DATA_SOURCE_CONFIG)
    private readonly dataSourceConfig: DataSourceConfig,
    private readonly prisma: PrismaService,
  ) {}

  async findAll() {
    if (this.dataSourceConfig.dataSource === 'prisma') {
      const rows = await this.prisma.client.customer.findMany({
        where: { deletedAt: null },
        include: { _count: { select: { products: true } } },
        orderBy: [{ name: 'asc' }],
      });
      return rows.map(mapPrismaCustomer);
    }

    return mockStore.customers
      .filter((customer) => !this.deletedMockCustomerIds.has(customer.id))
      .map((customer) => ({
        ...customer,
        productCount: mockStore.products.filter(
          (product) => product.customerId === customer.id,
        ).length,
      }));
  }

  async create(dto: CreateCustomerDto) {
    if (this.dataSourceConfig.dataSource === 'prisma') {
      assertDatabaseWriteAllowed();
      const row = await this.prisma.client.customer.create({
        data: {
          name: dto.name,
          code: dto.code,
          salesOwner: dto.salesOwner,
        },
        include: { _count: { select: { products: true } } },
      });
      return mapPrismaCustomer(row);
    }

    const customer: CustomerSeed = {
      id: nowId('CUS'),
      name: dto.name,
      code: dto.code ?? nowId('CUS-CODE'),
      salesOwner: dto.salesOwner ?? '',
    };
    mockStore.customers.push(customer);
    return { ...customer, productCount: 0 };
  }

  async update(id: string, dto: UpdateCustomerDto) {
    if (this.dataSourceConfig.dataSource === 'prisma') {
      assertDatabaseWriteAllowed();
      const current = await this.prisma.client.customer.findFirst({
        where: { id, deletedAt: null },
      });
      if (!current) throw new NotFoundException(`未找到客户：${id}`);
      const row = await this.prisma.client.customer.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.code !== undefined ? { code: dto.code } : {}),
          ...(dto.salesOwner !== undefined
            ? { salesOwner: dto.salesOwner }
            : {}),
        },
        include: { _count: { select: { products: true } } },
      });
      return mapPrismaCustomer(row);
    }

    const customer = mockStore.customers.find(
      (item) => item.id === id && !this.deletedMockCustomerIds.has(item.id),
    );
    if (!customer) throw new NotFoundException(`未找到客户：${id}`);
    Object.assign(customer, dto);
    return {
      ...customer,
      productCount: mockStore.products.filter(
        (product) => product.customerId === customer.id,
      ).length,
    };
  }

  async remove(id: string) {
    if (this.dataSourceConfig.dataSource === 'prisma') {
      assertDatabaseWriteAllowed();
      const current = await this.prisma.client.customer.findFirst({
        where: { id, deletedAt: null },
      });
      if (!current) throw new NotFoundException(`未找到客户：${id}`);
      await this.prisma.client.customer.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return { id, deleted: true };
    }

    const customer = mockStore.customers.find(
      (item) => item.id === id && !this.deletedMockCustomerIds.has(item.id),
    );
    if (!customer) throw new NotFoundException(`未找到客户：${id}`);
    this.deletedMockCustomerIds.add(id);
    return { id, deleted: true };
  }
}
