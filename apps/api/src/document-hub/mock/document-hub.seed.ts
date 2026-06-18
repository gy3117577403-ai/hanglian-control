export type HubMode = 'drawing' | 'connector' | 'fixture';
export type HubOrderScope = 'today' | 'week' | 'all';
export type HubOrderStatus = 'front' | 'back' | 'no_drawing' | 'exception';
export type DrawingStatus = 'available' | 'no_drawing' | 'partial';
export type DrawingModuleStatus = 'uploaded' | 'pending' | 'no_drawing';
export type DrawingModuleKey = 'original_drawing' | 'sop' | 'finished_images' | 'accessory_specs' | 'notes' | 'tooling';

export interface HubOrder {
  orderId: string;
  scope: 'today' | 'week';
  productId?: string;
  productModel: string;
  customerName: string;
  quantity?: number;
  status: HubOrderStatus;
  completed: boolean;
  completedAt?: string;
  remark?: string;
}

export interface HubCustomer {
  customerId: string;
  customerName: string;
  customerShortName: string;
}

export interface HubProductModel {
  productId: string;
  customerId: string;
  productModel: string;
  productName: string;
  drawingStatus: DrawingStatus;
  remark?: string;
}

export interface DrawingItem {
  itemId: string;
  title: string;
  fileType: 'pdf' | 'image' | 'text' | 'card';
  previewUrl?: string;
  fileName?: string;
  version: string;
  remark?: string;
  uploadedAt: string;
  source: 'mock' | 'manual_upload' | 'wecom_disk_future';
}

export interface DrawingModule {
  moduleKey: DrawingModuleKey;
  moduleName: string;
  status: DrawingModuleStatus;
  items: DrawingItem[];
  remark?: string;
  updatedAt: string;
}

export interface ProductDrawingDetail {
  product: HubProductModel;
  customer?: HubCustomer;
  modules: DrawingModule[];
}

export interface ConnectorParameter {
  connectorId: string;
  connectorModel: string;
  specification?: string;
  insertionLengthMm: number;
  outerStripLengthMm: number | null;
  innerStripLengthMm: number;
  remark?: string;
  status?: string;
  terminalModel?: string;
  pinCount?: number;
  color?: string;
  wireRange?: string;
  manufacturer?: string;
  lockType?: string;
  processSegment?: string;
}

export interface FixtureParameter {
  fixtureId: string;
  fixtureCode: string;
  fixtureName: string;
  fixtureType: string;
  applicableProduct: string;
  station: string;
  processSegment: string;
  storageLocation: string;
  status: string;
  maintenanceCycle: string;
  remark?: string;
}

const now = '2026-06-15T08:00:00.000Z';

export const hubCustomers: HubCustomer[] = [
  { customerId: 'demo-customer-a', customerName: '演示客户一厂', customerShortName: '演示一厂' },
  { customerId: 'demo-customer-b', customerName: '演示客户二厂', customerShortName: '演示二厂' },
  { customerId: 'demo-customer-c', customerName: '演示客户三厂', customerShortName: '演示三厂' },
  { customerId: 'pending-customer', customerName: '待补充客户资料', customerShortName: '待补充' },
];

export const hubProducts: HubProductModel[] = [
  { productId: 'prod-hl-ctrl-1907b', customerId: 'demo-customer-a', productModel: 'HL-CTRL-1907B', productName: '控制盒主线束演示件', drawingStatus: 'available', remark: '演示假数据，已配置完整图纸模块。' },
  { productId: 'prod-hl-front-2210a', customerId: 'demo-customer-a', productModel: 'HL-FRONT-2210A', productName: '前段压接演示线束', drawingStatus: 'partial', remark: 'SOP 和成品图待补充。' },
  { productId: 'prod-hl-back-3302c', customerId: 'demo-customer-b', productModel: 'HL-BACK-3302C', productName: '后段装配演示线束', drawingStatus: 'available', remark: '含多张成品图。' },
  { productId: 'prod-hl-conn-16p-a', customerId: 'demo-customer-b', productModel: 'HL-CONN-16P-A', productName: '16P 连接器样线', drawingStatus: 'partial', remark: '原图来自后续微盘同步占位。' },
  { productId: 'prod-hl-jig-08', customerId: 'demo-customer-c', productModel: 'HL-JIG-08', productName: '治具装配验证样件', drawingStatus: 'no_drawing', remark: '未发图 / 待上传资料。' },
  { productId: 'prod-hl-sop-2026', customerId: 'demo-customer-c', productModel: 'HL-SOP-2026', productName: 'SOP 补充演示件', drawingStatus: 'partial', remark: '用于验证模块内上传。' },
];

function item(itemId: string, title: string, fileType: DrawingItem['fileType'], version: string, remark: string, source: DrawingItem['source'] = 'mock'): DrawingItem {
  return {
    itemId,
    title,
    fileType,
    fileName: `${title}.${fileType === 'pdf' ? 'pdf' : 'png'}`,
    version,
    remark,
    uploadedAt: now,
    source,
  };
}

function module(moduleKey: DrawingModuleKey, moduleName: string, status: DrawingModuleStatus, items: DrawingItem[], remark: string): DrawingModule {
  return {
    moduleKey,
    moduleName,
    status,
    items,
    remark,
    updatedAt: now,
  };
}

export const drawingDetails: ProductDrawingDetail[] = hubProducts.map((product) => {
  const complete = product.drawingStatus === 'available';
  const noDrawing = product.drawingStatus === 'no_drawing';
  const baseRemark = noDrawing ? '未发图 / 待上传资料。' : '演示假数据，占位预览用于现场验收。';
  const modules: DrawingModule[] = [
    module('original_drawing', '原图', noDrawing ? 'no_drawing' : 'uploaded', noDrawing ? [] : [item(`${product.productId}-od-1`, `${product.productModel} 原图`, 'pdf', 'Rev.A', '后续真实阶段默认来自企业微信微盘。', 'wecom_disk_future')], baseRemark),
    module('sop', 'SOP 指导书', complete ? 'uploaded' : 'pending', complete ? [item(`${product.productId}-sop-1`, `${product.productModel} SOP 首页`, 'image', 'SOP-A', '作业步骤首页。')] : [], complete ? 'SOP 已上传。' : '待上传 SOP。'),
    module('finished_images', '成品图', complete ? 'uploaded' : 'pending', complete ? [
      item(`${product.productId}-fi-1`, `${product.productModel} 成品图 1`, 'image', 'IMG-A', '主视图。'),
      item(`${product.productId}-fi-2`, `${product.productModel} 成品图 2`, 'image', 'IMG-A', '端子细节。'),
      item(`${product.productId}-fi-3`, `${product.productModel} 成品图 3`, 'image', 'IMG-A', '包装方向。'),
    ] : [], complete ? '共 3 张成品图，主页面仅显示首张。' : '成品图待补充。'),
    module('accessory_specs', '辅料规格', complete ? 'uploaded' : 'pending', complete ? [item(`${product.productId}-as-1`, `${product.productModel} 辅料规格`, 'card', 'A1', '扎带、套管、标签规格。')] : [], '辅料规格按模块维护。'),
    module('notes', '注意事项', noDrawing ? 'pending' : 'uploaded', noDrawing ? [] : [item(`${product.productId}-nt-1`, `${product.productModel} 注意事项`, 'text', 'A1', '重点检查孔位方向和端子拉力。')], '现场注意事项卡片。'),
    module('tooling', '配套工装', complete ? 'uploaded' : 'pending', complete ? [item(`${product.productId}-tg-1`, `${product.productModel} 配套工装`, 'card', 'JIG-A', '压接定位治具与端检工装。')] : [], '配套工装信息。'),
  ];
  return {
    product,
    customer: hubCustomers.find((customer) => customer.customerId === product.customerId),
    modules,
  };
});

export const hubOrders: HubOrder[] = [
  { orderId: 'ORD-T-001', scope: 'today', productId: 'prod-hl-ctrl-1907b', productModel: 'HL-CTRL-1907B', customerName: '演示客户一厂', quantity: 120, status: 'front', completed: false, remark: '今日优先。' },
  { orderId: 'ORD-T-002', scope: 'today', productId: 'prod-hl-front-2210a', productModel: 'HL-FRONT-2210A', customerName: '演示客户一厂', quantity: 80, status: 'back', completed: false, remark: 'SOP 待补充。' },
  { orderId: 'ORD-T-003', scope: 'today', productId: 'prod-hl-back-3302c', productModel: 'HL-BACK-3302C', customerName: '演示客户二厂', quantity: 96, status: 'front', completed: false },
  { orderId: 'ORD-T-004', scope: 'today', productId: 'prod-hl-conn-16p-a', productModel: 'HL-CONN-16P-A', customerName: '演示客户二厂', quantity: 60, status: 'no_drawing', completed: false },
  { orderId: 'ORD-T-005', scope: 'today', productId: 'prod-hl-jig-08', productModel: 'HL-JIG-08', customerName: '演示客户三厂', quantity: 40, status: 'no_drawing', completed: false },
  { orderId: 'ORD-T-006', scope: 'today', productId: 'prod-hl-sop-2026', productModel: 'HL-SOP-2026', customerName: '演示客户三厂', quantity: 72, status: 'back', completed: false },
  { orderId: 'ORD-W-001', scope: 'week', productId: 'prod-hl-ctrl-1907b', productModel: 'HL-CTRL-1907B', customerName: '演示客户一厂', quantity: 420, status: 'front', completed: false },
  { orderId: 'ORD-W-002', scope: 'week', productId: 'prod-hl-front-2210a', productModel: 'HL-FRONT-2210A', customerName: '演示客户一厂', quantity: 260, status: 'back', completed: false },
  { orderId: 'ORD-W-003', scope: 'week', productId: 'prod-hl-back-3302c', productModel: 'HL-BACK-3302C', customerName: '演示客户二厂', quantity: 300, status: 'front', completed: false },
  { orderId: 'ORD-W-004', scope: 'week', productId: 'prod-hl-conn-16p-a', productModel: 'HL-CONN-16P-A', customerName: '演示客户二厂', quantity: 150, status: 'no_drawing', completed: false },
  { orderId: 'ORD-W-005', scope: 'week', productId: 'prod-hl-jig-08', productModel: 'HL-JIG-08', customerName: '演示客户三厂', quantity: 120, status: 'no_drawing', completed: false },
  { orderId: 'ORD-W-006', scope: 'week', productId: 'prod-hl-sop-2026', productModel: 'HL-SOP-2026', customerName: '演示客户三厂', quantity: 180, status: 'back', completed: false },
  { orderId: 'ORD-W-007', scope: 'week', productModel: 'HL-WAIT-4401D', customerName: '待补充客户资料', quantity: 50, status: 'no_drawing', completed: false, remark: '客户资料待补充。' },
  { orderId: 'ORD-W-008', scope: 'week', productModel: 'HL-DEMO-5508E', customerName: '演示客户一厂', quantity: 90, status: 'front', completed: false },
  { orderId: 'ORD-W-009', scope: 'week', productModel: 'HL-DEMO-6612F', customerName: '演示客户二厂', quantity: 110, status: 'back', completed: false },
  { orderId: 'ORD-W-010', scope: 'week', productModel: 'HL-DEMO-7720G', customerName: '演示客户三厂', quantity: 64, status: 'exception', completed: false },
  { orderId: 'ORD-W-011', scope: 'week', productModel: 'HL-DEMO-8830H', customerName: '演示客户一厂', quantity: 88, status: 'front', completed: false },
  { orderId: 'ORD-W-012', scope: 'week', productModel: 'HL-DEMO-9940J', customerName: '演示客户二厂', quantity: 140, status: 'back', completed: false },
];

export const connectorParameters: ConnectorParameter[] = [
  { connectorId: 'conn-001', connectorModel: 'CONN-16P-A', specification: '16P 防水公端', insertionLengthMm: 18, outerStripLengthMm: 12, innerStripLengthMm: 4, status: '启用', remark: '' },
  { connectorId: 'conn-002', connectorModel: 'CONN-08P-B', specification: '8P 白色母端', insertionLengthMm: 15, outerStripLengthMm: 10, innerStripLengthMm: 3.5, status: '启用', remark: '' },
  { connectorId: 'conn-003', connectorModel: 'CONN-24P-C', specification: '24P 灰色滑锁', insertionLengthMm: 22, outerStripLengthMm: 14, innerStripLengthMm: 5, status: '复核中', remark: '' },
  { connectorId: 'conn-004', connectorModel: 'CONN-02P-D', specification: '2P 蓝色弹片', insertionLengthMm: 11, outerStripLengthMm: 8, innerStripLengthMm: 3, status: '启用', remark: '' },
  { connectorId: 'conn-005', connectorModel: 'CONN-12P-E', specification: '12P 自然色卡扣', insertionLengthMm: 16.5, outerStripLengthMm: 11, innerStripLengthMm: 4, status: '停用', remark: '' },
];

export const fixtureParameters: FixtureParameter[] = [
  { fixtureId: 'fixture-001', fixtureCode: 'JIG-HL-08', fixtureName: 'HL-08 定位治具', fixtureType: '装配定位', applicableProduct: 'HL-JIG-08', station: '后段工位 A', processSegment: '后段装配', storageLocation: 'A-01-02', status: '可用', maintenanceCycle: '30 天', remark: '演示假数据。' },
  { fixtureId: 'fixture-002', fixtureCode: 'JIG-CTRL-01', fixtureName: '控制盒端检工装', fixtureType: '端检', applicableProduct: 'HL-CTRL-1907B', station: '测试工位', processSegment: '通用', storageLocation: 'B-03-01', status: '可用', maintenanceCycle: '30 天' },
  { fixtureId: 'fixture-003', fixtureCode: 'JIG-FRONT-22', fixtureName: '前段压接定位板', fixtureType: '压接辅助', applicableProduct: 'HL-FRONT-2210A', station: '前段工位 C', processSegment: '前段压接', storageLocation: 'C-02-04', status: '保养中', maintenanceCycle: '15 天' },
  { fixtureId: 'fixture-004', fixtureCode: 'JIG-BACK-33', fixtureName: '后段插接支架', fixtureType: '插接辅助', applicableProduct: 'HL-BACK-3302C', station: '后段工位 B', processSegment: '后段装配', storageLocation: 'A-02-08', status: '可用', maintenanceCycle: '30 天' },
  { fixtureId: 'fixture-005', fixtureCode: 'JIG-SOP-26', fixtureName: 'SOP 拍照定位夹', fixtureType: '影像辅助', applicableProduct: 'HL-SOP-2026', station: '资料补充台', processSegment: '通用', storageLocation: 'D-01-01', status: '待复核', maintenanceCycle: '60 天' },
];
