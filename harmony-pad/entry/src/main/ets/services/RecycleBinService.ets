import { ApiClient } from './ApiClient';
import { MockStore } from './MockData';
import { RecycleBinItem, ServiceResult } from './DomainModels';

export interface RecycleBinFilter {
  customer: string;
  product: string;
  entityType: string;
}

function matchFilter(item: RecycleBinItem, filter: RecycleBinFilter): boolean {
  const customerHit = filter.customer.length === 0 || item.customerName.includes(filter.customer);
  const productHit = filter.product.length === 0 || item.productName.includes(filter.product) || item.title.includes(filter.product);
  const typeHit = filter.entityType.length === 0 || item.entityType === filter.entityType;
  return customerHit && productHit && typeHit;
}

export class RecycleBinService {
  static missingApis: string[] = [
    'GET /recycle-bin',
    'PATCH /recycle-bin/:id/restore',
    'DELETE /recycle-bin/:id'
  ];

  static async list(filter: RecycleBinFilter): Promise<ServiceResult<RecycleBinItem[]>> {
    const query = `?customer=${encodeURIComponent(filter.customer)}&product=${encodeURIComponent(filter.product)}&entityType=${encodeURIComponent(filter.entityType)}`;
    try {
      const rows = await ApiClient.get<RecycleBinItem[]>(`/recycle-bin${query}`);
      return { data: rows, source: 'api', message: '已连接 GET /recycle-bin' };
    } catch (error) {
      const rows = MockStore.recycleItems.filter((item: RecycleBinItem) => matchFilter(item, filter));
      return { data: rows, source: 'mock', message: '回收站接口缺失，使用本地 mock fallback' };
    }
  }

  static async restore(id: string): Promise<ServiceResult<string>> {
    try {
      await ApiClient.patch<object>(`/recycle-bin/${encodeURIComponent(id)}/restore`, undefined);
      return { data: id, source: 'api', message: '已调用 PATCH /recycle-bin/:id/restore' };
    } catch (error) {
      MockStore.recycleItems = MockStore.recycleItems.filter((item: RecycleBinItem) => item.id !== id);
      return { data: id, source: 'mock', message: '已在本地 mock fallback 中恢复资料' };
    }
  }

  static async purge(id: string): Promise<ServiceResult<string>> {
    try {
      await ApiClient.delete<object>(`/recycle-bin/${encodeURIComponent(id)}`);
      return { data: id, source: 'api', message: '已调用 DELETE /recycle-bin/:id' };
    } catch (error) {
      MockStore.recycleItems = MockStore.recycleItems.filter((item: RecycleBinItem) => item.id !== id);
      return { data: id, source: 'mock', message: '已在本地 mock fallback 中彻底删除' };
    }
  }
}
