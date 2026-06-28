export type DataSourceKind = 'api' | 'mock';
export type ProcessSegment = '前段' | '后段' | '通用';
export type ConnectorParamStatus = '启用' | '复核' | '停用';
export type RecycleEntityType = '客户' | '产品' | '资料' | '工艺参数';

export interface ServiceResult<T> {
  data: T;
  source: DataSourceKind;
  message: string;
}

export interface Customer {
  id: string;
  name: string;
  code: string;
  salesOwner: string;
  productCount?: number;
}

export interface Product {
  id: string;
  customerId: string;
  customerName?: string;
  productCode: string;
  productName: string;
  currentVersion: string;
  processSegment: ProcessSegment;
  isActive?: boolean;
}

export interface ConnectorParam {
  id: string;
  connectorModel: string;
  inputLength: string;
  outerStripLength: string;
  innerStripLength: string;
  remark: string;
  status: ConnectorParamStatus;
  updatedAt: string;
}

export interface RecycleBinItem {
  id: string;
  entityType: RecycleEntityType;
  title: string;
  customerName: string;
  productName: string;
  deletedAt: string;
  deletedBy: string;
  reason: string;
}

export interface ProductionOrder {
  id: string;
  date: string;
  weekPlanNo: string;
  sales: string;
  customer: string;
  customerId: string;
  productId: string;
  productCode: string;
  productName: string;
  productVersion: string;
  segment: ProcessSegment;
  plannedQuantity: number;
  completedQuantity: number;
  status: string;
  owner: string;
  materialCompleteness: number;
  confirmationStatus: string;
}

export interface OrderOverview {
  todayOrders: ProductionOrder[];
  weekOrders: ProductionOrder[];
  allOrders: ProductionOrder[];
  orderCount: number;
  customerCount: number;
  productionStatus: StatusCount[];
  completionStatus: StatusCount[];
}

export interface StatusCount {
  label: string;
  count: number;
}
