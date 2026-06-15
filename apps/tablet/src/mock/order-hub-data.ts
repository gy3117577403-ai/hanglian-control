import type {
  ConnectorParameter,
  DrawingItem,
  DrawingModule,
  FixtureParameter,
  HubCustomer,
  HubOrder,
  HubProductModel,
  ProductDrawingDetail,
} from '@/types/production'

const now = '2026-06-15T08:00:00.000Z'

export const mockHubCustomers: HubCustomer[] = [
  { customerId: 'demo-customer-a', customerName: '演示客户一厂', customerShortName: '演示一厂' },
  { customerId: 'demo-customer-b', customerName: '演示客户二厂', customerShortName: '演示二厂' },
  { customerId: 'demo-customer-c', customerName: '演示客户三厂', customerShortName: '演示三厂' },
  { customerId: 'pending-customer', customerName: '待补充客户资料', customerShortName: '待补充' },
]

export const mockHubProducts: HubProductModel[] = [
  { productId: 'prod-hl-ctrl-1907b', customerId: 'demo-customer-a', productModel: 'HL-CTRL-1907B', productName: '控制盒主线束演示件', drawingStatus: 'available', remark: '演示假数据，已配置完整图纸模块。' },
  { productId: 'prod-hl-front-2210a', customerId: 'demo-customer-a', productModel: 'HL-FRONT-2210A', productName: '前段压接演示线束', drawingStatus: 'partial', remark: 'SOP 和成品图待补充。' },
  { productId: 'prod-hl-back-3302c', customerId: 'demo-customer-b', productModel: 'HL-BACK-3302C', productName: '后段装配演示线束', drawingStatus: 'available', remark: '含多张成品图。' },
  { productId: 'prod-hl-conn-16p-a', customerId: 'demo-customer-b', productModel: 'HL-CONN-16P-A', productName: '16P 连接器样线', drawingStatus: 'partial', remark: '原图来自后续微盘同步占位。' },
  { productId: 'prod-hl-jig-08', customerId: 'demo-customer-c', productModel: 'HL-JIG-08', productName: '治具装配验证样件', drawingStatus: 'no_drawing', remark: '未发图 / 待上传资料。' },
  { productId: 'prod-hl-sop-2026', customerId: 'demo-customer-c', productModel: 'HL-SOP-2026', productName: 'SOP 补充演示件', drawingStatus: 'partial', remark: '用于验证模块内上传。' },
]

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
  }
}

function moduleCard(moduleKey: DrawingModule['moduleKey'], moduleName: string, status: DrawingModule['status'], items: DrawingItem[], remark: string): DrawingModule {
  return {
    moduleKey,
    moduleName,
    status,
    items,
    remark,
    updatedAt: now,
  }
}

export const mockDrawingDetails: ProductDrawingDetail[] = mockHubProducts.map((product) => {
  const complete = product.drawingStatus === 'available'
  const noDrawing = product.drawingStatus === 'no_drawing'
  const modules: DrawingModule[] = [
    moduleCard('original_drawing', '原图', noDrawing ? 'no_drawing' : 'uploaded', noDrawing ? [] : [item(`${product.productId}-od-1`, `${product.productModel} 原图`, 'pdf', 'Rev.A', '后续真实阶段默认来自企业微信微盘。', 'wecom_disk_future')], noDrawing ? '未发图 / 待上传资料。' : '原图占位资料。'),
    moduleCard('sop', 'SOP 指导书', complete ? 'uploaded' : 'pending', complete ? [item(`${product.productId}-sop-1`, `${product.productModel} SOP 首页`, 'image', 'SOP-A', '作业步骤首页。')] : [], complete ? 'SOP 已上传。' : '待上传 SOP。'),
    moduleCard('finished_images', '成品图', complete ? 'uploaded' : 'pending', complete ? [
      item(`${product.productId}-fi-1`, `${product.productModel} 成品图 1`, 'image', 'IMG-A', '主视图。'),
      item(`${product.productId}-fi-2`, `${product.productModel} 成品图 2`, 'image', 'IMG-A', '端子细节。'),
      item(`${product.productId}-fi-3`, `${product.productModel} 成品图 3`, 'image', 'IMG-A', '包装方向。'),
    ] : [], complete ? '共 3 张成品图，主页面仅显示首张。' : '成品图待补充。'),
    moduleCard('accessory_specs', '辅料规格', complete ? 'uploaded' : 'pending', complete ? [item(`${product.productId}-as-1`, `${product.productModel} 辅料规格`, 'card', 'A1', '扎带、套管、标签规格。')] : [], '辅料规格按模块维护。'),
    moduleCard('notes', '注意事项', noDrawing ? 'pending' : 'uploaded', noDrawing ? [] : [item(`${product.productId}-nt-1`, `${product.productModel} 注意事项`, 'text', 'A1', '重点检查孔位方向和端子拉力。')], '现场注意事项卡片。'),
    moduleCard('tooling', '配套工装', complete ? 'uploaded' : 'pending', complete ? [item(`${product.productId}-tg-1`, `${product.productModel} 配套工装`, 'card', 'JIG-A', '压接定位治具与端检工装。')] : [], '配套工装信息。'),
  ]
  return {
    product,
    customer: mockHubCustomers.find((customer) => customer.customerId === product.customerId),
    modules,
  }
})

export const mockHubOrders: HubOrder[] = [
  { orderId: 'ORD-T-001', scope: 'today', productId: 'prod-hl-ctrl-1907b', productModel: 'HL-CTRL-1907B', customerName: '演示客户一厂', status: 'front', completed: false, remark: '今日优先。' },
  { orderId: 'ORD-T-002', scope: 'today', productId: 'prod-hl-front-2210a', productModel: 'HL-FRONT-2210A', customerName: '演示客户一厂', status: 'back', completed: false, remark: 'SOP 待补充。' },
  { orderId: 'ORD-T-003', scope: 'today', productId: 'prod-hl-back-3302c', productModel: 'HL-BACK-3302C', customerName: '演示客户二厂', status: 'front', completed: false },
  { orderId: 'ORD-T-004', scope: 'today', productId: 'prod-hl-conn-16p-a', productModel: 'HL-CONN-16P-A', customerName: '演示客户二厂', status: 'no_drawing', completed: false },
  { orderId: 'ORD-T-005', scope: 'today', productId: 'prod-hl-jig-08', productModel: 'HL-JIG-08', customerName: '演示客户三厂', status: 'no_drawing', completed: false },
  { orderId: 'ORD-T-006', scope: 'today', productId: 'prod-hl-sop-2026', productModel: 'HL-SOP-2026', customerName: '演示客户三厂', status: 'back', completed: false },
  { orderId: 'ORD-W-001', scope: 'week', productId: 'prod-hl-ctrl-1907b', productModel: 'HL-CTRL-1907B', customerName: '演示客户一厂', status: 'front', completed: false },
  { orderId: 'ORD-W-002', scope: 'week', productId: 'prod-hl-front-2210a', productModel: 'HL-FRONT-2210A', customerName: '演示客户一厂', status: 'back', completed: false },
  { orderId: 'ORD-W-003', scope: 'week', productId: 'prod-hl-back-3302c', productModel: 'HL-BACK-3302C', customerName: '演示客户二厂', status: 'front', completed: false },
  { orderId: 'ORD-W-004', scope: 'week', productId: 'prod-hl-conn-16p-a', productModel: 'HL-CONN-16P-A', customerName: '演示客户二厂', status: 'no_drawing', completed: false },
  { orderId: 'ORD-W-005', scope: 'week', productId: 'prod-hl-jig-08', productModel: 'HL-JIG-08', customerName: '演示客户三厂', status: 'no_drawing', completed: false },
  { orderId: 'ORD-W-006', scope: 'week', productId: 'prod-hl-sop-2026', productModel: 'HL-SOP-2026', customerName: '演示客户三厂', status: 'back', completed: false },
  { orderId: 'ORD-W-007', scope: 'week', productModel: 'HL-WAIT-4401D', customerName: '待补充客户资料', status: 'no_drawing', completed: false, remark: '客户资料待补充。' },
  { orderId: 'ORD-W-008', scope: 'week', productModel: 'HL-DEMO-5508E', customerName: '演示客户一厂', status: 'front', completed: false },
  { orderId: 'ORD-W-009', scope: 'week', productModel: 'HL-DEMO-6612F', customerName: '演示客户二厂', status: 'back', completed: false },
  { orderId: 'ORD-W-010', scope: 'week', productModel: 'HL-DEMO-7720G', customerName: '演示客户三厂', status: 'no_drawing', completed: false },
  { orderId: 'ORD-W-011', scope: 'week', productModel: 'HL-DEMO-8830H', customerName: '演示客户一厂', status: 'front', completed: false },
  { orderId: 'ORD-W-012', scope: 'week', productModel: 'HL-DEMO-9940J', customerName: '演示客户二厂', status: 'back', completed: false },
]

export const mockConnectorParameters: ConnectorParameter[] = [
  { connectorId: 'conn-001', connectorModel: 'CONN-16P-A', terminalModel: 'TM-025-A', pinCount: 16, color: '黑色', wireRange: '0.3-0.85mm2', manufacturer: '演示厂商 A', lockType: '二次锁', processSegment: '后段装配', status: '启用', remark: '用于 HL-CONN-16P-A。' },
  { connectorId: 'conn-002', connectorModel: 'CONN-08P-B', terminalModel: 'TM-040-B', pinCount: 8, color: '白色', wireRange: '0.5-1.25mm2', manufacturer: '演示厂商 B', lockType: '卡扣', processSegment: '前段压接', status: '启用' },
  { connectorId: 'conn-003', connectorModel: 'CONN-24P-C', terminalModel: 'TM-064-C', pinCount: 24, color: '灰色', wireRange: '0.35-0.75mm2', manufacturer: '演示厂商 C', lockType: '滑锁', processSegment: '后段装配', status: '复核中' },
  { connectorId: 'conn-004', connectorModel: 'CONN-02P-D', terminalModel: 'TM-110-D', pinCount: 2, color: '蓝色', wireRange: '1.0-2.0mm2', manufacturer: '演示厂商 A', lockType: '弹片', processSegment: '通用', status: '启用' },
  { connectorId: 'conn-005', connectorModel: 'CONN-12P-E', terminalModel: 'TM-025-E', pinCount: 12, color: '自然色', wireRange: '0.2-0.5mm2', manufacturer: '演示厂商 D', lockType: '卡扣', processSegment: '后段装配', status: '停用' },
]

export const mockFixtureParameters: FixtureParameter[] = [
  { fixtureId: 'fixture-001', fixtureCode: 'JIG-HL-08', fixtureName: 'HL-08 定位治具', fixtureType: '装配定位', applicableProduct: 'HL-JIG-08', station: '后段工位 A', processSegment: '后段装配', storageLocation: 'A-01-02', status: '可用', maintenanceCycle: '30 天', remark: '演示假数据。' },
  { fixtureId: 'fixture-002', fixtureCode: 'JIG-CTRL-01', fixtureName: '控制盒端检工装', fixtureType: '端检', applicableProduct: 'HL-CTRL-1907B', station: '测试工位', processSegment: '通用', storageLocation: 'B-03-01', status: '可用', maintenanceCycle: '30 天' },
  { fixtureId: 'fixture-003', fixtureCode: 'JIG-FRONT-22', fixtureName: '前段压接定位板', fixtureType: '压接辅助', applicableProduct: 'HL-FRONT-2210A', station: '前段工位 C', processSegment: '前段压接', storageLocation: 'C-02-04', status: '保养中', maintenanceCycle: '15 天' },
  { fixtureId: 'fixture-004', fixtureCode: 'JIG-BACK-33', fixtureName: '后段插接支架', fixtureType: '插接辅助', applicableProduct: 'HL-BACK-3302C', station: '后段工位 B', processSegment: '后段装配', storageLocation: 'A-02-08', status: '可用', maintenanceCycle: '30 天' },
  { fixtureId: 'fixture-005', fixtureCode: 'JIG-SOP-26', fixtureName: 'SOP 拍照定位夹', fixtureType: '影像辅助', applicableProduct: 'HL-SOP-2026', station: '资料补充台', processSegment: '通用', storageLocation: 'D-01-01', status: '待复核', maintenanceCycle: '60 天' },
]
