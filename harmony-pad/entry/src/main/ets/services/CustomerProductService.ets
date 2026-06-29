import { ApiClient, ApiError } from './ApiClient';
import { buildId, MockStore } from './MockData';
import { Customer, ProcessSegment, Product, ServiceResult } from './DomainModels';

export interface CustomerPayload {
  name: string;
  code: string;
  salesOwner: string;
}

export interface ProductPayload {
  customerId: string;
  productCode: string;
  productName: string;
  currentVersion: string;
  processSegment: ProcessSegment;
}

function attachCustomerName(product: Product): Product {
  const customer = MockStore.customers.find((item: Customer) => item.id === product.customerId);
  return {
    id: product.id,
    customerId: product.customerId,
    customerName: product.customerName || customer?.name || '',
    productCode: product.productCode,
    productName: product.productName,
    currentVersion: product.currentVersion,
    processSegment: product.processSegment,
    isActive: product.isActive ?? true
  };
}

function refreshCustomerProductCount(): void {
  MockStore.customers = MockStore.customers.map((customer: Customer): Customer => {
    const count = MockStore.products.filter((product: Product) => product.customerId === customer.id && product.isActive !== false).length;
    return {
      id: customer.id,
      name: customer.name,
      code: customer.code,
      salesOwner: customer.salesOwner,
      productCount: count
    };
  });
}

function serviceErrorText(error: Object): string {
  if (error instanceof ApiError) {
    return `${error.statusCode} ${error.message} ${error.responseBody}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'unknown error';
}

export class CustomerProductService {
  static async listCustomers(): Promise<ServiceResult<Customer[]>> {
    try {
      const rows = await ApiClient.get<Customer[]>('/customers');
      return { data: rows, source: 'api', message: '已连接 GET /customers' };
    } catch (error) {
      refreshCustomerProductCount();
      return { data: MockStore.customers, source: 'mock', message: `GET /customers failed: ${serviceErrorText(error)}; using mock fallback` };
    }
  }

  static async createCustomer(payload: CustomerPayload): Promise<ServiceResult<Customer>> {
    try {
      const row = await ApiClient.post<Customer>('/customers', payload);
      return { data: row, source: 'api', message: '已调用 POST /customers' };
    } catch (error) {
      const customer: Customer = {
        id: buildId('CUS'),
        name: payload.name,
        code: payload.code.length > 0 ? payload.code : buildId('CUS-CODE'),
        salesOwner: payload.salesOwner,
        productCount: 0
      };
      MockStore.customers.unshift(customer);
      return { data: customer, source: 'mock', message: `POST /customers failed: ${serviceErrorText(error)}; wrote mock fallback` };
    }
  }

  static async updateCustomer(id: string, payload: CustomerPayload): Promise<ServiceResult<Customer>> {
    try {
      const row = await ApiClient.patch<Customer>(`/customers/${encodeURIComponent(id)}`, payload);
      return { data: row, source: 'api', message: '已调用 PATCH /customers/:id' };
    } catch (error) {
      MockStore.customers = MockStore.customers.map((customer: Customer) => {
        if (customer.id !== id) {
          return customer;
        }
        return {
          id: customer.id,
          name: payload.name,
          code: payload.code,
          salesOwner: payload.salesOwner,
          productCount: customer.productCount
        };
      });
      const updated = MockStore.customers.find((item: Customer) => item.id === id) ?? {
        id,
        name: payload.name,
        code: payload.code,
        salesOwner: payload.salesOwner,
        productCount: 0
      };
      return { data: updated, source: 'mock', message: '编辑客户已写入本地 mock fallback' };
    }
  }

  static async deleteCustomer(id: string): Promise<ServiceResult<string>> {
    try {
      await ApiClient.delete<object>(`/customers/${encodeURIComponent(id)}`);
      return { data: id, source: 'api', message: '已调用 DELETE /customers/:id' };
    } catch (error) {
      MockStore.customers = MockStore.customers.filter((customer: Customer) => customer.id !== id);
      MockStore.products = MockStore.products.map((product: Product) => {
        if (product.customerId !== id) {
          return product;
        }
        return {
          id: product.id,
          customerId: product.customerId,
          customerName: product.customerName,
          productCode: product.productCode,
          productName: product.productName,
          currentVersion: product.currentVersion,
          processSegment: product.processSegment,
          isActive: false
        };
      });
      return { data: id, source: 'mock', message: '客户已在本地 mock 中停用/删除' };
    }
  }

  static async listProducts(): Promise<ServiceResult<Product[]>> {
    try {
      const rows = await ApiClient.get<Product[]>('/products');
      return { data: rows, source: 'api', message: '已连接 GET /products' };
    } catch (error) {
      const rows = MockStore.products.filter((product: Product) => product.isActive !== false).map((product: Product) => attachCustomerName(product));
      return { data: rows, source: 'mock', message: `GET /products failed: ${serviceErrorText(error)}; using mock fallback` };
    }
  }

  static async createProduct(payload: ProductPayload): Promise<ServiceResult<Product>> {
    try {
      const row = await ApiClient.post<Product>('/products', payload);
      return { data: row, source: 'api', message: '已调用 POST /products' };
    } catch (error) {
      const customer = MockStore.customers.find((item: Customer) => item.id === payload.customerId);
      const product: Product = {
        id: buildId('PRD'),
        customerId: payload.customerId,
        customerName: customer?.name ?? '',
        productCode: payload.productCode,
        productName: payload.productName,
        currentVersion: payload.currentVersion,
        processSegment: payload.processSegment,
        isActive: true
      };
      MockStore.products.unshift(product);
      refreshCustomerProductCount();
      return { data: product, source: 'mock', message: `POST /products failed: ${serviceErrorText(error)}; wrote mock fallback` };
    }
  }

  static async updateProduct(id: string, payload: ProductPayload): Promise<ServiceResult<Product>> {
    try {
      const row = await ApiClient.patch<Product>(`/products/${encodeURIComponent(id)}`, payload);
      return { data: row, source: 'api', message: '已调用 PATCH /products/:id' };
    } catch (error) {
      const customer = MockStore.customers.find((item: Customer) => item.id === payload.customerId);
      MockStore.products = MockStore.products.map((product: Product) => {
        if (product.id !== id) {
          return product;
        }
        return {
          id: product.id,
          customerId: payload.customerId,
          customerName: customer?.name ?? '',
          productCode: payload.productCode,
          productName: payload.productName,
          currentVersion: payload.currentVersion,
          processSegment: payload.processSegment,
          isActive: true
        };
      });
      refreshCustomerProductCount();
      const updated = MockStore.products.find((item: Product) => item.id === id) ?? {
        id,
        customerId: payload.customerId,
        customerName: customer?.name ?? '',
        productCode: payload.productCode,
        productName: payload.productName,
        currentVersion: payload.currentVersion,
        processSegment: payload.processSegment,
        isActive: true
      };
      return { data: attachCustomerName(updated), source: 'mock', message: '编辑产品已写入本地 mock fallback' };
    }
  }

  static async deleteProduct(id: string): Promise<ServiceResult<string>> {
    try {
      await ApiClient.delete<object>(`/products/${encodeURIComponent(id)}`);
      return { data: id, source: 'api', message: '已调用 DELETE /products/:id' };
    } catch (error) {
      MockStore.products = MockStore.products.map((product: Product) => {
        if (product.id !== id) {
          return product;
        }
        return {
          id: product.id,
          customerId: product.customerId,
          customerName: product.customerName,
          productCode: product.productCode,
          productName: product.productName,
          currentVersion: product.currentVersion,
          processSegment: product.processSegment,
          isActive: false
        };
      });
      refreshCustomerProductCount();
      return { data: id, source: 'mock', message: '产品已在本地 mock 中停用/删除' };
    }
  }
}
