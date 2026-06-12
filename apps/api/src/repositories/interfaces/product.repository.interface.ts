import type { ProductionPlanMock } from '../../common/types/production.types';

type MaybePromise<T> = T | Promise<T>;

export interface ProductRepositoryInterface {
  findProductById(id: string): MaybePromise<ProductionPlanMock | undefined>;
  findProductByCode(productCode: string): MaybePromise<ProductionPlanMock | undefined>;
  findProductsByCustomer(customerId: string): MaybePromise<ProductionPlanMock[]>;
}
