import {
  DocumentCategoryDefinition,
  DocumentCategoryState,
  DOCUMENT_CATEGORY_DEFINITIONS,
  WorkbenchOrder,
  WorkbenchDocument
} from '../model/WorkbenchTypes'

const MOCK_DATE: string = '2026-06-28'

export const MOCK_TODAY_ORDERS: WorkbenchOrder[] = [
  {
    id: 'ORD-T-001',
    orderId: 'ORD-T-001',
    date: MOCK_DATE,
    weekPlanNo: 'W26-A',
    customerId: 'cust-a',
    customerName: '演示客户一厂',
    productId: 'prod-hl-ctrl-1907b',
    productModel: 'HL-CTRL-1907B',
    productName: '控制盒主线束',
    quantity: 120,
    completedQuantity: 0,
    productionStatus: 'front',
    status: 'front',
    completed: false
  },
  {
    id: 'ORD-T-002',
    orderId: 'ORD-T-002',
    date: MOCK_DATE,
    weekPlanNo: 'W26-A',
    customerId: 'cust-a',
    customerName: '演示客户一厂',
    productId: 'prod-hl-front-2210a',
    productModel: 'HL-FRONT-2210A',
    productName: '前段压接线束',
    quantity: 80,
    completedQuantity: 0,
    productionStatus: 'back',
    status: 'back',
    completed: false
  },
  {
    id: 'ORD-T-003',
    orderId: 'ORD-T-003',
    date: MOCK_DATE,
    weekPlanNo: 'W26-B',
    customerId: 'cust-b',
    customerName: '演示客户二厂',
    productId: 'prod-hl-back-3302c',
    productModel: 'HL-BACK-3302C',
    productName: '后段装配线束',
    quantity: 96,
    completedQuantity: 0,
    productionStatus: 'front',
    status: 'front',
    completed: false
  },
  {
    id: 'ORD-T-004',
    orderId: 'ORD-T-004',
    date: MOCK_DATE,
    weekPlanNo: 'W26-C',
    customerId: 'cust-c',
    customerName: '演示客户三厂',
    productId: 'prod-hl-jig-08',
    productModel: 'HL-JIG-08',
    productName: '治具装配验证件',
    quantity: 40,
    completedQuantity: 0,
    productionStatus: 'no_drawing',
    status: 'no_drawing',
    completed: false
  }
]

export const MOCK_WEEK_ORDERS: WorkbenchOrder[] = MOCK_TODAY_ORDERS.concat([
  {
    id: 'ORD-W-005',
    orderId: 'ORD-W-005',
    date: '2026-06-29',
    weekPlanNo: 'W26-D',
    customerId: 'cust-c',
    customerName: '演示客户三厂',
    productId: 'prod-hl-sop-2026',
    productModel: 'HL-SOP-2026',
    productName: 'SOP 补充验证件',
    quantity: 180,
    completedQuantity: 0,
    productionStatus: 'back',
    status: 'back',
    completed: false
  },
  {
    id: 'ORD-W-006',
    orderId: 'ORD-W-006',
    date: '2026-06-30',
    weekPlanNo: 'W26-E',
    customerId: 'pending-customer',
    customerName: '待补充客户资料',
    productId: '',
    productModel: 'HL-WAIT-4401D',
    productName: '待建档产品',
    quantity: 50,
    completedQuantity: 0,
    productionStatus: 'no_drawing',
    status: 'no_drawing',
    completed: false
  }
])

function mockDocument(
  order: WorkbenchOrder,
  definition: DocumentCategoryDefinition,
  index: number,
  version: string,
  pageCount: number
): WorkbenchDocument {
  return {
    id: `${order.productId || order.orderId}-${definition.category}-${index}`,
    documentId: `${order.productId || order.orderId}-${definition.category}-${index}`,
    customerId: order.customerId,
    productId: order.productId,
    orderId: order.orderId,
    category: definition.category,
    documentType: definition.documentType,
    title: `${order.productModel} ${definition.label}`,
    version,
    pageCount,
    updatedAt: '2026-06-28T08:00:00.000Z',
    effectiveDate: '2026-06-28',
    uploadStatus: 'uploaded',
    previewUrl: `/documents/${order.productId || order.orderId}-${definition.category}-${index}/preview`,
    downloadUrl: '',
    source: 'mock'
  }
}

export function mockDocumentCategories(order: WorkbenchOrder | null): DocumentCategoryState[] {
  if (!order) {
    return DOCUMENT_CATEGORY_DEFINITIONS.map((definition: DocumentCategoryDefinition): DocumentCategoryState => {
      return {
        category: definition.category,
        label: definition.label,
        documentType: definition.documentType,
        uploadStatus: 'missing',
        title: definition.label,
        version: '-',
        pageCount: 0,
        date: '-',
        documents: []
      }
    })
  }

  const noDrawing = order.productionStatus === 'no_drawing' || order.productId.length === 0
  const partial = order.productModel.indexOf('FRONT') >= 0 || order.productModel.indexOf('SOP') >= 0

  return DOCUMENT_CATEGORY_DEFINITIONS.map((definition: DocumentCategoryDefinition, index: number): DocumentCategoryState => {
    let uploaded = !noDrawing
    if (partial && (definition.category === 'sop' || definition.category === 'finished_image')) uploaded = false
    const docs = uploaded ? [mockDocument(order, definition, 1, index === 0 ? 'Rev.A' : 'A1', definition.category === 'finished_image' ? 3 : 1)] : []
    return {
      category: definition.category,
      label: definition.label,
      documentType: definition.documentType,
      uploadStatus: uploaded ? 'uploaded' : 'missing',
      title: uploaded ? docs[0].title : definition.label,
      version: uploaded ? docs[0].version : '-',
      pageCount: uploaded ? docs[0].pageCount : 0,
      date: uploaded ? '2026-06-28' : '-',
      documents: docs
    }
  })
}
