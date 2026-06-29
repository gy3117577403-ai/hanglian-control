import {
  DocumentCategoryDefinition,
  DocumentCategoryKey,
  DocumentCategoryState,
  DOCUMENT_CATEGORY_DEFINITIONS,
  emptyDocumentCategories,
  formatDateText,
  normalizeCategoryAlias,
  OrderScope,
  WorkbenchOrder,
  UploadStatus,
  WorkbenchDocument,
  documentCategoryForType
} from '../model/WorkbenchTypes';
import { MOCK_TODAY_ORDERS, MOCK_WEEK_ORDERS, mockDocumentCategories } from '../mock/WorkbenchMockData';
import { ApiClient } from './ApiClient';
import { AppConfig } from './AppConfig';

interface RemoteOrder {
  id?: string;
  orderId?: string;
  date?: string;
  weekPlanNo?: string;
  customer?: string;
  customerName?: string;
  customerId?: string;
  productId?: string;
  productCode?: string;
  productModel?: string;
  productName?: string;
  plannedQuantity?: number;
  quantity?: number;
  completedQuantity?: number;
  status?: string;
  productionStatus?: string;
  completionStatus?: string;
  completed?: boolean;
}

interface RemoteDocument {
  id?: string;
  documentId?: string;
  customerId?: string;
  productId?: string;
  orderId?: string;
  planId?: string;
  category?: string;
  documentType?: string;
  type?: string;
  title?: string;
  version?: string;
  pageCount?: number;
  pages?: number;
  updatedAt?: string;
  effectiveDate?: string;
  status?: string;
  documentStatus?: string;
  previewUrl?: string;
  downloadUrl?: string;
  source?: string;
  archived?: boolean;
}

interface RemoteCategory {
  category?: string;
  label?: string;
  documentType?: string;
  documents?: RemoteDocument[];
}

interface RemoteProductDocumentsResponse {
  productId?: string;
  productCode?: string;
  productName?: string;
  categories?: RemoteCategory[];
  documents?: RemoteDocument[];
}

interface ApiArrayResponse<T> {
  data?: T[];
  items?: T[];
  rows?: T[];
  orders?: T[];
  documents?: T[];
}

interface ApiObjectResponse<T> {
  data?: T;
}

function asArray<T>(value: T[] | ApiArrayResponse<T>): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  const response = value as ApiArrayResponse<T>;
  return response.data ?? response.items ?? response.rows ?? response.orders ?? response.documents ?? [];
}

function asObject<T>(value: T | ApiObjectResponse<T>): T {
  const response = value as ApiObjectResponse<T>;
  return response.data ?? (value as T);
}

function asText(value: string | undefined, fallback: string = ''): string {
  if (value === undefined || value === null) {
    return fallback;
  }
  return `${value}`;
}

function asNumber(value: number | undefined, fallback: number = 0): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function uploadStatusForDocument(document: RemoteDocument | undefined): UploadStatus {
  if (!document || document.archived) {
    return 'missing';
  }

  const status = asText(document.documentStatus ?? document.status);
  if (status === 'pending_review' || status === 'pending') {
    return 'pending';
  }
  if (status === 'expired') {
    return 'expired';
  }
  if (status === 'missing') {
    return 'missing';
  }
  return 'uploaded';
}

function normalizeOrder(row: RemoteOrder): WorkbenchOrder {
  const id = asText(row.id ?? row.orderId, 'unknown-order');
  const quantity = asNumber(row.plannedQuantity ?? row.quantity, 0);
  const completedQuantity = asNumber(row.completedQuantity, 0);
  const status = asText(row.productionStatus ?? row.status, 'pending');
  const completed = row.completed === true ||
    row.completionStatus === 'completed' ||
    status === 'completed' ||
    (quantity > 0 && completedQuantity >= quantity);

  return {
    id,
    orderId: asText(row.orderId ?? row.id, id),
    date: asText(row.date),
    weekPlanNo: asText(row.weekPlanNo),
    customerId: asText(row.customerId),
    customerName: asText(row.customerName ?? row.customer, '客户待确认'),
    productId: asText(row.productId),
    productModel: asText(row.productModel ?? row.productCode, '型号待确认'),
    productName: asText(row.productName),
    quantity,
    completedQuantity,
    productionStatus: status,
    status,
    completed
  };
}

function normalizeDocument(row: RemoteDocument, fallbackCategory?: DocumentCategoryKey): WorkbenchDocument {
  const documentType = asText(row.documentType ?? row.type);
  const category = fallbackCategory ?? normalizeCategoryAlias(asText(row.category, documentCategoryForType(documentType)));
  const id = asText(row.id ?? row.documentId, `${asText(row.productId)}-${category}`);

  return {
    id,
    documentId: asText(row.documentId ?? row.id, id),
    customerId: asText(row.customerId),
    productId: asText(row.productId),
    orderId: asText(row.orderId ?? row.planId),
    category,
    documentType,
    title: asText(row.title, category),
    version: asText(row.version, '-'),
    pageCount: asNumber(row.pageCount ?? row.pages, 0),
    updatedAt: asText(row.updatedAt),
    effectiveDate: asText(row.effectiveDate),
    uploadStatus: uploadStatusForDocument(row),
    previewUrl: asText(row.previewUrl),
    downloadUrl: asText(row.downloadUrl),
    source: asText(row.source)
  };
}

function groupDocuments(documents: WorkbenchDocument[]): DocumentCategoryState[] {
  return DOCUMENT_CATEGORY_DEFINITIONS.map((definition: DocumentCategoryDefinition): DocumentCategoryState => {
    const rows = documents.filter((document: WorkbenchDocument) => document.category === definition.category);
    const activeRows = rows.filter((document: WorkbenchDocument) => document.uploadStatus !== 'missing');
    const primary = activeRows.length > 0 ? activeRows[0] : undefined;
    return {
      category: definition.category,
      label: definition.label,
      documentType: definition.documentType,
      uploadStatus: primary ? primary.uploadStatus : 'missing',
      title: primary ? primary.title : definition.label,
      version: primary ? primary.version : '-',
      pageCount: primary ? primary.pageCount : 0,
      date: primary ? formatDateText(primary.updatedAt || primary.effectiveDate) : '-',
      documents: rows
    };
  });
}

function normalizeProductDocuments(response: RemoteProductDocumentsResponse): DocumentCategoryState[] {
  if (response.categories && response.categories.length > 0) {
    const allDocuments: WorkbenchDocument[] = [];
    response.categories.forEach((category: RemoteCategory) => {
      const categoryKey = normalizeCategoryAlias(asText(category.category ?? category.documentType));
      const documents = category.documents ?? [];
      documents.forEach((document: RemoteDocument) => {
        allDocuments.push(normalizeDocument(document, categoryKey));
      });
    });
    return groupDocuments(allDocuments);
  }

  return groupDocuments((response.documents ?? []).map((document: RemoteDocument) => normalizeDocument(document)));
}

export class WorkbenchApiClient {
  private source: 'api' | 'mock' = 'api';

  isMockMode(): boolean {
    return this.source === 'mock';
  }

  async loadOrders(scope: OrderScope): Promise<WorkbenchOrder[]> {
    try {
      const response = await ApiClient.get<RemoteOrder[] | ApiArrayResponse<RemoteOrder>>(scope === 'today' ? '/orders/today' : '/orders/week');
      this.source = 'api';
      return asArray<RemoteOrder>(response).map((row: RemoteOrder) => normalizeOrder(row));
    } catch (error) {
      if (!AppConfig.ENABLE_MOCK_FALLBACK) {
        throw WorkbenchApiClient.toThrowable(error, '订单加载失败');
      }
      this.source = 'mock';
      return scope === 'today' ? MOCK_TODAY_ORDERS : MOCK_WEEK_ORDERS;
    }
  }

  async loadAllOrders(): Promise<WorkbenchOrder[]> {
    try {
      const response = await ApiClient.get<RemoteOrder[] | ApiArrayResponse<RemoteOrder>>('/orders');
      this.source = 'api';
      return asArray<RemoteOrder>(response).map((row: RemoteOrder) => normalizeOrder(row));
    } catch (error) {
      if (!AppConfig.ENABLE_MOCK_FALLBACK) {
        throw WorkbenchApiClient.toThrowable(error, '订单加载失败');
      }
      this.source = 'mock';
      return MOCK_WEEK_ORDERS;
    }
  }

  async loadDocumentCategories(order: WorkbenchOrder | null): Promise<DocumentCategoryState[]> {
    if (!order) {
      return emptyDocumentCategories();
    }

    if (order.productId.length === 0) {
      this.source = 'mock';
      return AppConfig.ENABLE_MOCK_FALLBACK ? mockDocumentCategories(order) : emptyDocumentCategories();
    }

    try {
      const response = await ApiClient.get<RemoteProductDocumentsResponse | ApiObjectResponse<RemoteProductDocumentsResponse>>(
        `/products/${encodeURIComponent(order.productId)}/documents`
      );
      this.source = 'api';
      return normalizeProductDocuments(asObject<RemoteProductDocumentsResponse>(response));
    } catch (error) {
      if (!AppConfig.ENABLE_MOCK_FALLBACK) {
        throw WorkbenchApiClient.toThrowable(error, '产品资料加载失败');
      }
      this.source = 'mock';
      return mockDocumentCategories(order);
    }
  }

  private static toThrowable(error: Object, fallbackMessage: string): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error(fallbackMessage);
  }
}
