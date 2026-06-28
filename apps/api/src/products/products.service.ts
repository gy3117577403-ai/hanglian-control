import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DATA_SOURCE_CONFIG,
  REPOSITORY_TOKENS,
} from '../common/constants/repository-tokens';
import type { ProcessSegment } from '../common/enums/production.enum';
import type { ProductSeed } from '../common/types/production.types';
import type { DataSourceConfig } from '../config/data-source.config';
import { assertDatabaseWriteAllowed } from '../database/database-safety';
import { PrismaService } from '../database/prisma.service';
import { normalizeProductModel } from '../document-hub/helpers/pdf-name-parser';
import {
  groupDocumentsForArkTS,
  withDocumentCategory,
} from '../documents/document-categories';
import { mockStore } from '../mock/production.mock';
import type { DocumentRepositoryInterface } from '../repositories/interfaces/document.repository.interface';
import type { ProductRepositoryInterface } from '../repositories/interfaces/product.repository.interface';
import {
  prismaProcessToApi,
  prismaWriteMaps,
} from '../repositories/prisma/prisma-mappers';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

type ProductRow = ProductSeed & {
  customerName?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ProductModelInput = {
  productModel?: string;
  model?: string;
  productCode?: string;
  name?: string;
};

function nowId(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

function mapPrismaProduct(row: Record<string, any>): ProductRow {
  return {
    id: row.id,
    customerId: row.customerId,
    customerName: row.customer?.name ?? '',
    productCode: row.productCode,
    productName: row.productName,
    currentVersion: row.currentVersion,
    processSegment: prismaProcessToApi(row.processSegment),
    isActive: row.isActive ?? true,
    createdAt: row.createdAt
      ? new Date(row.createdAt).toISOString()
      : undefined,
    updatedAt: row.updatedAt
      ? new Date(row.updatedAt).toISOString()
      : undefined,
  };
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const normalized = text(value);
    if (normalized) return normalized;
  }
  return '';
}

function productModelFromInput(input: ProductModelInput, fallback?: string) {
  return firstText(
    input.productModel,
    input.model,
    input.productCode,
    input.name,
    fallback,
  );
}

function normalizeProductModelFromInput(input: ProductModelInput, fallback?: string) {
  const productModel = productModelFromInput(input, fallback);
  const normalizedProductModel = normalizeProductModel(productModel);
  if (!productModel || !normalizedProductModel) {
    throw new BadRequestException('产品型号不能为空。');
  }
  return { productModel, normalizedProductModel };
}

function hasProductModelInput(input: ProductModelInput) {
  return ['productModel', 'model', 'productCode', 'name'].some(
    (key) => Object.prototype.hasOwnProperty.call(input, key),
  );
}

@Injectable()
export class ProductsService {
  private readonly deletedMockProductIds = new Set<string>();

  constructor(
    @Inject(REPOSITORY_TOKENS.product)
    private readonly productRepository: ProductRepositoryInterface,
    @Inject(REPOSITORY_TOKENS.document)
    private readonly documentRepository: DocumentRepositoryInterface,
    @Inject(DATA_SOURCE_CONFIG)
    private readonly dataSourceConfig: DataSourceConfig,
    private readonly prisma: PrismaService,
  ) {}

  async findAll() {
    if (this.dataSourceConfig.dataSource === 'postgres') {
      const rows = await this.prisma.client.product.findMany({
        where: { deletedAt: null },
        include: { customer: true },
        orderBy: [{ productCode: 'asc' }],
      });
      return rows.map(mapPrismaProduct);
    }

    return mockStore.products
      .filter((product) => !this.deletedMockProductIds.has(product.id))
      .map((product) => ({
        ...product,
        customerName:
          mockStore.customers.find(
            (customer) => customer.id === product.customerId,
          )?.name ?? '',
        isActive: true,
      }));
  }

  async create(dto: CreateProductDto) {
    if (this.dataSourceConfig.dataSource === 'postgres') {
      assertDatabaseWriteAllowed();
      const { productModel, normalizedProductModel } =
        normalizeProductModelFromInput(dto);
      const row = await this.prisma.client.product.create({
        data: {
          customerId: dto.customerId,
          productCode: dto.productCode,
          productModel,
          normalizedProductModel,
          productName: dto.productName,
          currentVersion: dto.currentVersion,
          processSegment: prismaWriteMaps.process[dto.processSegment ?? '通用'],
        },
        include: { customer: true },
      });
      return mapPrismaProduct(row);
    }

    const customer = mockStore.customers.find(
      (item) => item.id === dto.customerId,
    );
    if (!customer) throw new NotFoundException(`未找到客户：${dto.customerId}`);
    const product: ProductSeed = {
      id: nowId('PRD'),
      customerId: dto.customerId,
      productCode: dto.productCode,
      productName: dto.productName,
      currentVersion: dto.currentVersion,
      processSegment: dto.processSegment ?? '通用',
    };
    mockStore.products.push(product);
    return { ...product, customerName: customer.name, isActive: true };
  }

  async update(id: string, dto: UpdateProductDto) {
    if (this.dataSourceConfig.dataSource === 'postgres') {
      assertDatabaseWriteAllowed();
      const current = await this.findProductRow(id);
      if (!current) throw new NotFoundException(`未找到产品：${id}`);
      const productModelPatch = hasProductModelInput(dto)
        ? normalizeProductModelFromInput(
            dto,
            current.productModel ?? current.productCode ?? current.productName,
          )
        : undefined;
      const row = await this.prisma.client.product.update({
        where: { id: current.id },
        data: {
          ...(dto.customerId !== undefined
            ? { customerId: dto.customerId }
            : {}),
          ...(dto.productCode !== undefined
            ? { productCode: dto.productCode }
            : {}),
          ...(productModelPatch
            ? {
                productModel: productModelPatch.productModel,
                normalizedProductModel:
                  productModelPatch.normalizedProductModel,
              }
            : {}),
          ...(dto.productName !== undefined
            ? { productName: dto.productName }
            : {}),
          ...(dto.currentVersion !== undefined
            ? { currentVersion: dto.currentVersion }
            : {}),
          ...(dto.processSegment !== undefined
            ? { processSegment: prismaWriteMaps.process[dto.processSegment] }
            : {}),
        },
        include: { customer: true },
      });
      return mapPrismaProduct(row);
    }

    const product = mockStore.products.find(
      (item) => item.id === id && !this.deletedMockProductIds.has(item.id),
    );
    if (!product) throw new NotFoundException(`未找到产品：${id}`);
    Object.assign(product, dto);
    return {
      ...product,
      customerName:
        mockStore.customers.find(
          (customer) => customer.id === product.customerId,
        )?.name ?? '',
      isActive: true,
    };
  }

  async remove(id: string) {
    if (this.dataSourceConfig.dataSource === 'postgres') {
      assertDatabaseWriteAllowed();
      const current = await this.findProductRow(id);
      if (!current) throw new NotFoundException(`未找到产品：${id}`);
      await this.prisma.client.product.update({
        where: { id: current.id },
        data: { deletedAt: new Date(), isActive: false },
      });
      return { id: current.id, deleted: true };
    }

    const product = mockStore.products.find(
      (item) => item.id === id && !this.deletedMockProductIds.has(item.id),
    );
    if (!product) throw new NotFoundException(`未找到产品：${id}`);
    this.deletedMockProductIds.add(id);
    return { id, deleted: true };
  }

  async findDocuments(id: string) {
    const product = await this.resolveProduct(id);
    if (!product) throw new NotFoundException(`未找到产品：${id}`);
    const documents = await this.documentRepository.findDocumentsByProduct(
      product.id,
    );
    return {
      productId: product.id,
      productCode: product.productCode,
      productName: product.productName,
      categories: groupDocumentsForArkTS(documents),
      documents: documents.map(withDocumentCategory),
    };
  }

  async findByCode(productCode: string) {
    const plan = await this.productRepository.findProductByCode(productCode);
    if (!plan) {
      throw new NotFoundException(`未找到产品：${productCode}`);
    }

    return {
      productCode: plan.productCode,
      productName: plan.productName,
      productVersion: plan.productVersion,
      customer: plan.customer,
      materialCompleteness: plan.materialCompleteness,
      front: plan.front,
      back: plan.back,
      documents: plan.documents,
    };
  }

  private async resolveProduct(
    idOrCode: string,
  ): Promise<ProductSeed | undefined> {
    if (this.dataSourceConfig.dataSource === 'postgres') {
      const row = await this.findProductRow(idOrCode);
      return row
        ? {
            id: row.id,
            customerId: row.customerId,
            productCode: row.productCode,
            productName: row.productName,
            currentVersion: row.currentVersion,
            processSegment: prismaProcessToApi(
              row.processSegment,
            ) as ProcessSegment,
          }
        : undefined;
    }

    return mockStore.products.find((product) => {
      if (this.deletedMockProductIds.has(product.id)) return false;
      return product.id === idOrCode || product.productCode === idOrCode;
    });
  }

  private async findProductRow(idOrCode: string) {
    return this.prisma.client.product.findFirst({
      where: {
        deletedAt: null,
        OR: [{ id: idOrCode }, { productCode: idOrCode }],
      },
      include: { customer: true },
    });
  }
}
