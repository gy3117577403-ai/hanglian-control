import { ApiClient } from './ApiClient';
import { MockStore } from './MockData';
import { RecycleBinItem, RecycleEntityType, ServiceResult } from './DomainModels';

export interface RecycleBinFilter {
  customer: string;
  product: string;
  entityType: string;
}

interface ApiArrayResponse<T> {
  data?: T[];
  items?: T[];
  rows?: T[];
  records?: T[];
  recycleItems?: T[];
}

interface RemoteRecycleBinItem {
  id?: string;
  documentId?: string;
  entityId?: string;
  recycleId?: string;
  entityType?: string;
  type?: string;
  documentType?: string;
  title?: string;
  name?: string;
  customerName?: string;
  customer?: string;
  productName?: string;
  productCode?: string;
  deletedAt?: string;
  deletedBy?: string;
  operatorName?: string;
  reason?: string;
}

function asArray<T>(value: T[] | ApiArrayResponse<T>): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  const response = value as ApiArrayResponse<T>;
  return response.data ?? response.items ?? response.rows ?? response.records ?? response.recycleItems ?? [];
}

function asText(value: string | undefined, fallback: string = ''): string {
  if (value === undefined || value === null) {
    return fallback;
  }
  return `${value}`;
}

function normalizeEntityType(value: string): RecycleEntityType {
  if (value === '客户' || value === 'customer') {
    return '客户';
  }
  if (value === '产品' || value === 'product') {
    return '产品';
  }
  if (value === '工艺参数' || value === 'connectorParam' || value === 'connector-param') {
    return '工艺参数';
  }
  return '资料';
}

function normalizeRecycleItem(row: RemoteRecycleBinItem, index: number): RecycleBinItem {
  const id = asText(row.id ?? row.recycleId ?? row.documentId ?? row.entityId, `RECYCLE-${index}`);
  const title = asText(row.title ?? row.name ?? row.productName ?? row.productCode, '已删除资料');

  return {
    id,
    entityType: normalizeEntityType(asText(row.entityType ?? row.type ?? row.documentType)),
    title,
    customerName: asText(row.customerName ?? row.customer, '-'),
    productName: asText(row.productName ?? row.productCode, '-'),
    deletedAt: asText(row.deletedAt, '-'),
    deletedBy: asText(row.deletedBy ?? row.operatorName, '-'),
    reason: asText(row.reason)
  };
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
      const response = await ApiClient.get<RemoteRecycleBinItem[] | ApiArrayResponse<RemoteRecycleBinItem>>(`/recycle-bin${query}`);
      const rows = asArray<RemoteRecycleBinItem>(response).map((item: RemoteRecycleBinItem, index: number) => normalizeRecycleItem(item, index));
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
