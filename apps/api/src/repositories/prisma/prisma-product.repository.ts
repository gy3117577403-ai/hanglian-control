import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { ProductionPlanMock } from '../../common/types/production.types';
import type { ProductRepositoryInterface } from '../interfaces/product.repository.interface';
import { mapPrismaPlan } from './prisma-mappers';

const PLAN_INCLUDE = {
  product: {
    include: {
      customer: true,
      frontParameters: { where: { deletedAt: null }, orderBy: { updatedAt: 'desc' } },
      backPackages: { where: { deletedAt: null }, orderBy: { updatedAt: 'desc' } },
      documents: { where: { deletedAt: null, archived: false }, orderBy: { updatedAt: 'desc' } },
    },
  },
  documents: { where: { deletedAt: null, archived: false }, orderBy: { updatedAt: 'desc' } },
};

@Injectable()
export class PrismaProductRepository implements ProductRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async findProductById(id: string): Promise<ProductionPlanMock | undefined> {
    const row = await this.prisma.client.productionPlan.findFirst({
      where: {
        deletedAt: null,
        OR: [{ id }, { productId: id }],
      },
      orderBy: { planDate: 'desc' },
      include: PLAN_INCLUDE,
    });
    return row ? mapPrismaPlan(row) : undefined;
  }

  async findProductByCode(productCode: string): Promise<ProductionPlanMock | undefined> {
    const row = await this.prisma.client.productionPlan.findFirst({
      where: {
        deletedAt: null,
        product: {
          productCode,
          deletedAt: null,
        },
      },
      orderBy: { planDate: 'desc' },
      include: PLAN_INCLUDE,
    });
    return row ? mapPrismaPlan(row) : undefined;
  }

  async findProductsByCustomer(customerId: string): Promise<ProductionPlanMock[]> {
    const rows = await this.prisma.client.productionPlan.findMany({
      where: {
        deletedAt: null,
        product: {
          customerId,
          deletedAt: null,
        },
      },
      orderBy: [{ planDate: 'desc' }, { planCode: 'asc' }],
      include: PLAN_INCLUDE,
    });
    return rows.map(mapPrismaPlan);
  }
}
