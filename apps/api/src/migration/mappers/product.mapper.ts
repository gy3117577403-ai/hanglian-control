import type { ProductSeed } from '../../common/types/production.types';
import { processToPrisma } from './shared';

export function mapProductSeedToPrisma(product: ProductSeed) {
  return {
    id: product.id,
    customerId: product.customerId,
    productCode: product.productCode,
    productName: product.productName,
    currentVersion: product.currentVersion,
    processSegment: processToPrisma[product.processSegment],
    isActive: true,
  };
}
