import type { CustomerSeed } from '../../common/types/production.types';

export function mapCustomerSeedToPrisma(customer: CustomerSeed) {
  return {
    id: customer.id,
    name: customer.name,
    code: customer.code,
    salesOwner: customer.salesOwner,
  };
}
