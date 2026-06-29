import { CustomerOption, ProductDocumentsResponse, ProductOption } from '../models/DocumentModels';
import { ApiClient } from './ApiClient';
import { AppConfig } from './AppConfig';
import { Customer, Product } from './DomainModels';
import { MockStore } from './MockData';

export class CatalogService {
  static async getCustomers(): Promise<CustomerOption[]> {
    try {
      return await ApiClient.getJson<CustomerOption[]>('/customers');
    } catch (error) {
      if (!AppConfig.ENABLE_MOCK_FALLBACK) {
        throw CatalogService.toThrowable(error, '客户列表加载失败');
      }
      return MockStore.customers.map((customer: Customer): CustomerOption => ({
        id: customer.id,
        name: customer.name,
        code: customer.code,
        productCount: customer.productCount
      }));
    }
  }

  static async getProducts(): Promise<ProductOption[]> {
    try {
      return await ApiClient.getJson<ProductOption[]>('/products');
    } catch (error) {
      if (!AppConfig.ENABLE_MOCK_FALLBACK) {
        throw CatalogService.toThrowable(error, '产品列表加载失败');
      }
      return MockStore.products
        .filter((product: Product) => product.isActive !== false)
        .map((product: Product): ProductOption => ({
          id: product.id,
          customerId: product.customerId,
          customerName: product.customerName,
          productCode: product.productCode,
          productName: product.productName,
          currentVersion: product.currentVersion
        }));
    }
  }

  static async getProductDocuments(productId: string): Promise<ProductDocumentsResponse> {
    return ApiClient.getJson<ProductDocumentsResponse>(`/products/${encodeURIComponent(productId)}/documents`);
  }

  private static toThrowable(error: Object, fallbackMessage: string): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error(fallbackMessage);
  }
}
