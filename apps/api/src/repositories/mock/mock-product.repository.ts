import { Injectable } from '@nestjs/common';
import { mockStore } from '../../mock/production.mock';
import type { ProductRepositoryInterface } from '../interfaces/product.repository.interface';

@Injectable()
export class MockProductRepository implements ProductRepositoryInterface {
  findProductById(id: string) {
    return mockStore.findPlanById(id) ?? mockStore.productionPlans.find((plan) => plan.productId === id);
  }

  findProductsByCustomer(customerId: string) {
    return mockStore.productionPlans.filter((plan) => plan.customerId === customerId);
  }

  findProductByCode(productCode: string) {
    return mockStore.findPlanByProductCode(productCode);
  }
}
