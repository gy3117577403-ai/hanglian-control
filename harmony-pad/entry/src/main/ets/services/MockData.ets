import {
  ConnectorParam,
  Customer,
  Product,
  ProductionOrder,
  RecycleBinItem
} from './DomainModels';

export class MockStore {
  static customers: Customer[] = [
    { id: 'CUS-EAST-EV', name: '华东新能源', code: 'EV-EAST', salesOwner: '刘敏', productCount: 2 },
    { id: 'CUS-SOUTH-AUTO', name: '南方汽车', code: 'AUTO-SOUTH', salesOwner: '周琪', productCount: 1 },
    { id: 'CUS-NORTH-RAIL', name: '北方轨交', code: 'RAIL-NORTH', salesOwner: '陈工', productCount: 1 }
  ];

  static products: Product[] = [
    { id: 'PRD-HL-4821A', customerId: 'CUS-EAST-EV', customerName: '华东新能源', productCode: 'HL-EV-4821A', productName: '电池包高压采样线束', currentVersion: 'V2.3', processSegment: '通用', isActive: true },
    { id: 'PRD-HL-5170B', customerId: 'CUS-EAST-EV', customerName: '华东新能源', productCode: 'HL-EV-5170B', productName: '电驱控制器线束', currentVersion: 'V1.8', processSegment: '后段', isActive: true },
    { id: 'PRD-HL-3308C', customerId: 'CUS-SOUTH-AUTO', customerName: '南方汽车', productCode: 'HL-AUTO-3308C', productName: '座舱信号线束', currentVersion: 'V3.1', processSegment: '前段', isActive: true },
    { id: 'PRD-HL-9012R', customerId: 'CUS-NORTH-RAIL', customerName: '北方轨交', productCode: 'HL-RAIL-9012R', productName: '车门控制线束', currentVersion: 'V1.4', processSegment: '通用', isActive: true }
  ];

  static connectorParams: ConnectorParam[] = [
    { id: 'CONN-001', connectorModel: 'TE-174982-2', inputLength: '42 mm', outerStripLength: '18 mm', innerStripLength: '5 mm', remark: '后段装配常用型号', status: '启用', updatedAt: '2026-06-24 09:20' },
    { id: 'CONN-002', connectorModel: 'JST-XA-04', inputLength: '38 mm', outerStripLength: '16 mm', innerStripLength: '4 mm', remark: '待工艺复核', status: '复核', updatedAt: '2026-06-25 14:10' },
    { id: 'CONN-003', connectorModel: 'AMP-282104-1', inputLength: '45 mm', outerStripLength: '20 mm', innerStripLength: '6 mm', remark: '旧版端子，保留查询', status: '停用', updatedAt: '2026-06-20 16:35' }
  ];

  static recycleItems: RecycleBinItem[] = [
    { id: 'REC-001', entityType: '资料', title: 'HL-EV-4821A 后段 SOP V2.1', customerName: '华东新能源', productName: '电池包高压采样线束', deletedAt: '2026-06-26 11:25', deletedBy: '王班长', reason: '上传了新版 SOP' },
    { id: 'REC-002', entityType: '产品', title: 'HL-AUTO-1100A 试制线束', customerName: '南方汽车', productName: '试制线束', deletedAt: '2026-06-24 17:42', deletedBy: '资料管理员', reason: '试制项目归档' },
    { id: 'REC-003', entityType: '工艺参数', title: 'JST-XH-03 外剥参数', customerName: '华东新能源', productName: '电驱控制器线束', deletedAt: '2026-06-23 15:06', deletedBy: '工艺工程师', reason: '型号合并' }
  ];

  static orders: ProductionOrder[] = [
    { id: 'ORD-20260628-001', date: '2026-06-28', weekPlanNo: 'W26-01', sales: '刘敏', customer: '华东新能源', customerId: 'CUS-EAST-EV', productId: 'PRD-HL-4821A', productCode: 'HL-EV-4821A', productName: '电池包高压采样线束', productVersion: 'V2.3', segment: '通用', plannedQuantity: 320, completedQuantity: 180, status: '生产中', owner: 'A 线', materialCompleteness: 92, confirmationStatus: '已确认' },
    { id: 'ORD-20260628-002', date: '2026-06-28', weekPlanNo: 'W26-02', sales: '周琪', customer: '南方汽车', customerId: 'CUS-SOUTH-AUTO', productId: 'PRD-HL-3308C', productCode: 'HL-AUTO-3308C', productName: '座舱信号线束', productVersion: 'V3.1', segment: '前段', plannedQuantity: 180, completedQuantity: 180, status: '已完成', owner: 'B 线', materialCompleteness: 100, confirmationStatus: '已确认' },
    { id: 'ORD-20260627-003', date: '2026-06-27', weekPlanNo: 'W26-03', sales: '陈工', customer: '北方轨交', customerId: 'CUS-NORTH-RAIL', productId: 'PRD-HL-9012R', productCode: 'HL-RAIL-9012R', productName: '车门控制线束', productVersion: 'V1.4', segment: '通用', plannedQuantity: 90, completedQuantity: 24, status: '待生产', owner: 'C 线', materialCompleteness: 76, confirmationStatus: '待确认' },
    { id: 'ORD-20260626-004', date: '2026-06-26', weekPlanNo: 'W26-04', sales: '刘敏', customer: '华东新能源', customerId: 'CUS-EAST-EV', productId: 'PRD-HL-5170B', productCode: 'HL-EV-5170B', productName: '电驱控制器线束', productVersion: 'V1.8', segment: '后段', plannedQuantity: 240, completedQuantity: 60, status: '生产中', owner: 'D 线', materialCompleteness: 88, confirmationStatus: '复核中' }
  ];
}

export function buildId(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

export function currentTimeLabel(): string {
  const date = new Date();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day} ${hour}:${minute}`;
}
