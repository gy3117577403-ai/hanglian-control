import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '../common/constants/repository-tokens';
import type { ProductRepositoryInterface } from '../repositories/interfaces/product.repository.interface';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(REPOSITORY_TOKENS.product)
    private readonly productRepository: ProductRepositoryInterface,
  ) {}

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
}
