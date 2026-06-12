import type {
  BackProcessPackageSeed,
  ConfirmationRecordSeed,
  CustomerSeed,
  FeedbackRecordMock,
  FrontProcessParameterSeed,
  ProductDocumentSeed,
  ProductionPlanSeed,
  ProductSeed,
  QueryLogSeed,
} from '../common/types/production.types';
import type { DocumentStatus, MaterialStatus, ProcessSegment } from '../common/enums/production.enum';

export const customers: CustomerSeed[] = [
  { id: 'CUS-EV', name: '华东新能源', code: 'EV-EAST', salesOwner: '刘敏' },
  { id: 'CUS-CTRL', name: '苏州智控', code: 'SZ-CTRL', salesOwner: '周倩' },
  { id: 'CUS-MTR', name: '北方电驱', code: 'N-MOTOR', salesOwner: '陈航' },
  { id: 'CUS-ESS', name: '南方储能', code: 'S-ESS', salesOwner: '杨涛' },
  { id: 'CUS-RBT', name: '迅驰机器人', code: 'XC-RBT', salesOwner: '何璐' },
  { id: 'CUS-SEN', name: '宁波传感', code: 'NB-SEN', salesOwner: '赵锐' },
];

export const products: ProductSeed[] = [
  { id: 'PRD-4821A', customerId: 'CUS-EV', productCode: 'HL-EV-4821A', productName: '电池包高压采样线束', currentVersion: 'V2.3', processSegment: '通用' },
  { id: 'PRD-1907B', customerId: 'CUS-CTRL', productCode: 'HL-CTRL-1907B', productName: '控制器低压信号线束', currentVersion: 'V1.8', processSegment: '前段' },
  { id: 'PRD-7720C', customerId: 'CUS-MTR', productCode: 'HL-MTR-7720C', productName: '电机温感传感线束', currentVersion: 'V3.1', processSegment: '后段' },
  { id: 'PRD-6509D', customerId: 'CUS-ESS', productCode: 'HL-ESS-6509D', productName: '储能柜通讯线束', currentVersion: 'V2.0', processSegment: '通用' },
  { id: 'PRD-3318E', customerId: 'CUS-RBT', productCode: 'HL-RBT-3318E', productName: '机器人关节编码器线束', currentVersion: 'V1.4', processSegment: '前段' },
  { id: 'PRD-2046F', customerId: 'CUS-SEN', productCode: 'HL-SEN-2046F', productName: '压力传感器分支线束', currentVersion: 'V2.7', processSegment: '后段' },
  { id: 'PRD-9088G', customerId: 'CUS-EV', productCode: 'HL-THM-9088G', productName: '热管理水泵电源线束', currentVersion: 'V1.2', processSegment: '通用' },
  { id: 'PRD-1001X', customerId: 'CUS-CTRL', productCode: 'HL-SMP-1001X', productName: '样件验证综合线束', currentVersion: 'V0.9', processSegment: '前段' },
  { id: 'PRD-5602H', customerId: 'CUS-MTR', productCode: 'HL-BMS-5602H', productName: 'BMS 均衡采集线束', currentVersion: 'V4.0', processSegment: '通用' },
  { id: 'PRD-8024J', customerId: 'CUS-ESS', productCode: 'HL-CHG-8024J', productName: '充电座互锁信号线束', currentVersion: 'V2.6', processSegment: '后段' },
];

export const productionPlans: ProductionPlanSeed[] = [
  { id: 'PLN-20260611-001', date: '2026-06-11', weekPlanNo: 'W26-A-014', sales: '刘敏', productId: 'PRD-4821A', segment: '通用', plannedQuantity: 1200, completedQuantity: 420, status: '生产中', owner: '前段一组 / 后段二组', materialCompleteness: 100, confirmationStatus: '未确认', querySuggestions: ['后段孔位图', '高压采样 SOP', 'TE-968221-2 端子', 'AMP-HV-32P 连接器'] },
  { id: 'PLN-20260611-002', date: '2026-06-11', weekPlanNo: 'W26-A-015', sales: '周倩', productId: 'PRD-1907B', segment: '前段', plannedQuantity: 2600, completedQuantity: 0, status: '待生产', owner: '前段三组', materialCompleteness: 88, confirmationStatus: '需复核', querySuggestions: ['裁线长度', '剥皮长度 4.5', 'JST-SXH 端子', '低压信号 SOP'] },
  { id: 'PLN-20260611-003', date: '2026-06-11', weekPlanNo: 'W26-A-016', sales: '陈航', productId: 'PRD-7720C', segment: '后段', plannedQuantity: 900, completedQuantity: 900, status: '已完成', owner: '后段一组', materialCompleteness: 95, confirmationStatus: '已确认', querySuggestions: ['8P 电机温感孔位图', '热缩 SOP', 'MOLEX 端子', '拉力标准'] },
  { id: 'PLN-20260611-004', date: '2026-06-11', weekPlanNo: 'W26-A-017', sales: '杨涛', productId: 'PRD-6509D', segment: '通用', plannedQuantity: 1800, completedQuantity: 210, status: '异常', owner: '前段二组 / 后段三组', materialCompleteness: 76, confirmationStatus: '需复核', querySuggestions: ['RJ45 T568B 孔位图', '屏蔽层压接说明书', '通讯线束 SOP', '成品细节图'] },
  { id: 'PLN-20260612-005', date: '2026-06-12', weekPlanNo: 'W26-B-004', sales: '何璐', productId: 'PRD-3318E', segment: '前段', plannedQuantity: 640, completedQuantity: 120, status: '生产中', owner: '前段四组', materialCompleteness: 92, confirmationStatus: '未确认', querySuggestions: ['HRS DF13 端子', '压接高度 0.74', '10P 编码器孔位图', '成品细节图'] },
  { id: 'PLN-20260613-006', date: '2026-06-13', weekPlanNo: 'W26-B-005', sales: '赵锐', productId: 'PRD-2046F', segment: '后段', plannedQuantity: 1500, completedQuantity: 0, status: '待生产', owner: '后段四组', materialCompleteness: 84, confirmationStatus: '未确认', querySuggestions: ['6P 压力传感孔位图', '防水栓装配 SOP', 'Sumitomo 连接器', '剥皮长度'] },
  { id: 'PLN-20260614-007', date: '2026-06-14', weekPlanNo: 'W26-B-006', sales: '孙宁', productId: 'PRD-9088G', segment: '通用', plannedQuantity: 720, completedQuantity: 360, status: '生产中', owner: '前段一组 / 后段一组', materialCompleteness: 95, confirmationStatus: '未确认', querySuggestions: ['水泵电源线束图纸', '防水连接器', '拉力标准', '成品细节图'] },
  { id: 'PLN-20260615-008', date: '2026-06-15', weekPlanNo: 'W26-B-007', sales: '王珂', productId: 'PRD-1001X', segment: '前段', plannedQuantity: 80, completedQuantity: 0, status: '待生产', owner: '样件组', materialCompleteness: 88, confirmationStatus: '需复核', querySuggestions: ['样件线束裁线长度', '压接高度', '样件 SOP', '成品细节图'] },
  { id: 'PLN-20260616-009', date: '2026-06-16', weekPlanNo: 'W26-C-002', sales: '陈航', productId: 'PRD-5602H', segment: '通用', plannedQuantity: 1100, completedQuantity: 0, status: '待生产', owner: '前段二组 / 后段二组', materialCompleteness: 98, confirmationStatus: '未确认', querySuggestions: ['BMS 均衡采集图纸', '均衡采集孔位图', '压接高度', '成品细节图'] },
  { id: 'PLN-20260617-010', date: '2026-06-17', weekPlanNo: 'W26-C-003', sales: '杨涛', productId: 'PRD-8024J', segment: '后段', plannedQuantity: 560, completedQuantity: 0, status: '待生产', owner: '后段五组', materialCompleteness: 70, confirmationStatus: '需复核', querySuggestions: ['充电座互锁孔位图', '连接器装配说明书', 'SOP 待确认', '版本不一致'] },
];

export const frontProcessParameters: FrontProcessParameterSeed[] = [
  { id: 'FPP-4821A', productId: 'PRD-4821A', wireLength: '780 mm / 1260 mm', strippingLength: '5.0 mm', terminalModel: 'TE-968221-2', pullForceStandard: '≥ 80 N', crimpHeight: '1.42 ± 0.03 mm', drawingVersion: 'DRW-V2.3-A', parameterStatus: '有效' },
  { id: 'FPP-1907B', productId: 'PRD-1907B', wireLength: '320 mm / 460 mm / 610 mm', strippingLength: '4.5 mm', terminalModel: 'JST-SXH-001T-P0.6', pullForceStandard: '≥ 45 N', crimpHeight: '0.92 ± 0.02 mm', drawingVersion: 'DRW-V1.8-B', parameterStatus: '待确认' },
  { id: 'FPP-7720C', productId: 'PRD-7720C', wireLength: '540 mm', strippingLength: '6.0 mm', terminalModel: 'MOLEX-50394-8051', pullForceStandard: '≥ 60 N', crimpHeight: '1.12 ± 0.02 mm', drawingVersion: 'DRW-V3.1', parameterStatus: '有效' },
  { id: 'FPP-6509D', productId: 'PRD-6509D', wireLength: '1500 mm / 2100 mm', strippingLength: '5.5 mm', terminalModel: 'PHOENIX-AI 0.5-8 WH', pullForceStandard: '≥ 50 N', crimpHeight: '0.88 ± 0.03 mm', drawingVersion: 'DRW-V2.0', parameterStatus: '有效' },
  { id: 'FPP-3318E', productId: 'PRD-3318E', wireLength: '260 mm / 380 mm', strippingLength: '3.8 mm', terminalModel: 'HRS-DF13-2630SCF', pullForceStandard: '≥ 35 N', crimpHeight: '0.74 ± 0.02 mm', drawingVersion: 'DRW-V1.4', parameterStatus: '有效' },
  { id: 'FPP-2046F', productId: 'PRD-2046F', wireLength: '430 mm / 870 mm', strippingLength: '4.2 mm', terminalModel: 'SUMITOMO-8240-0287', pullForceStandard: '≥ 55 N', crimpHeight: '1.05 ± 0.03 mm', drawingVersion: 'DRW-V2.7', parameterStatus: '有效' },
  { id: 'FPP-9088G', productId: 'PRD-9088G', wireLength: '980 mm', strippingLength: '6.5 mm', terminalModel: 'APTIV-12124075', pullForceStandard: '≥ 90 N', crimpHeight: '1.68 ± 0.04 mm', drawingVersion: 'DRW-V1.2', parameterStatus: '有效' },
  { id: 'FPP-1001X', productId: 'PRD-1001X', wireLength: '180 mm / 240 mm / 450 mm', strippingLength: '4.0 mm', terminalModel: 'SAMPLE-T-0.64', pullForceStandard: '≥ 30 N', crimpHeight: '0.82 ± 0.02 mm', drawingVersion: 'DRW-V0.9-DRAFT', parameterStatus: '待确认' },
  { id: 'FPP-5602H', productId: 'PRD-5602H', wireLength: '610 mm / 760 mm', strippingLength: '5.2 mm', terminalModel: 'TE-MQS-963715-1', pullForceStandard: '≥ 70 N', crimpHeight: '1.18 ± 0.03 mm', drawingVersion: 'DRW-V4.0', parameterStatus: '有效' },
  { id: 'FPP-8024J', productId: 'PRD-8024J', wireLength: '', strippingLength: '5.0 mm', terminalModel: 'APTIV-CS-2.8', pullForceStandard: '≥ 75 N', crimpHeight: '1.30 ± 0.03 mm', drawingVersion: 'DRW-V2.6-A', parameterStatus: '待确认' },
];

export const backProcessPackages: BackProcessPackageSeed[] = [
  { id: 'BPP-4821A', productId: 'PRD-4821A', connectorModel: 'AMP-HV-32P', assemblyManual: '连接器二次锁扣装配说明书', pinMap: '32P 电池采样孔位图', sop: '后段插接与导通测试 SOP', finishedImageCount: 8, drawingVersion: 'DRW-V2.3-A', sopVersion: 'SOP-2026.06-A', materialStatus: '有效' },
  { id: 'BPP-1907B', productId: 'PRD-1907B', connectorModel: 'JST-XH-12P', assemblyManual: '12P 信号插头装配说明书', pinMap: '12P 控制器孔位图', sop: '低压信号线束后段 SOP', finishedImageCount: 5, drawingVersion: 'DRW-V1.7', sopVersion: 'SOP-2026.05-C', materialStatus: '待确认' },
  { id: 'BPP-7720C', productId: 'PRD-7720C', connectorModel: 'Molex Mini-Fit 8P', assemblyManual: '8P 防呆插头装配说明书', pinMap: '8P 电机温感孔位图', sop: '温感线束热缩与插接 SOP', finishedImageCount: 6, drawingVersion: 'DRW-V3.1', sopVersion: 'SOP-2026.06-B', materialStatus: '有效' },
  { id: 'BPP-6509D', productId: 'PRD-6509D', connectorModel: 'RJ45 工业屏蔽头', assemblyManual: '通讯线束屏蔽层压接说明书', pinMap: 'RJ45 T568B 孔位图', sop: '储能通讯线束后段 SOP', finishedImageCount: 3, drawingVersion: 'DRW-V1.9', sopVersion: 'SOP-2026.04-D', materialStatus: '失效' },
  { id: 'BPP-3318E', productId: 'PRD-3318E', connectorModel: 'HRS DF13-10P', assemblyManual: '微型连接器装配说明书', pinMap: '10P 编码器孔位图', sop: '机器人编码器线束 SOP', finishedImageCount: 7, drawingVersion: 'DRW-V1.4', sopVersion: 'SOP-2026.06-C', materialStatus: '有效' },
  { id: 'BPP-2046F', productId: 'PRD-2046F', connectorModel: 'Sumitomo TS 6P', assemblyManual: '防水栓装配说明书', pinMap: '6P 压力传感孔位图', sop: '压力传感器分支线束 SOP', finishedImageCount: 4, drawingVersion: 'DRW-V2.7', sopVersion: 'SOP-2026.03-B', materialStatus: '待确认' },
  { id: 'BPP-9088G', productId: 'PRD-9088G', connectorModel: 'Aptiv GT 2P', assemblyManual: '水泵电源防水连接器装配说明书', pinMap: '2P 水泵电源孔位图', sop: '热管理水泵线束 SOP', finishedImageCount: 5, drawingVersion: 'DRW-V1.2', sopVersion: 'SOP-2026.06-D', materialStatus: '有效' },
  { id: 'BPP-1001X', productId: 'PRD-1001X', connectorModel: 'Sample 16P', assemblyManual: '样件连接器装配说明书', pinMap: '16P 样件验证孔位图', sop: '样件验证综合线束 SOP', finishedImageCount: 2, drawingVersion: 'DRW-V0.9-DRAFT', sopVersion: 'SOP-DRAFT', materialStatus: '待确认' },
  { id: 'BPP-5602H', productId: 'PRD-5602H', connectorModel: 'BMS MicroFit 24P', assemblyManual: 'BMS 24P 连接器装配说明书', pinMap: '24P 均衡采集孔位图', sop: 'BMS 均衡采集线束 SOP', finishedImageCount: 6, drawingVersion: 'DRW-V4.0', sopVersion: 'SOP-2026.06-E', materialStatus: '有效' },
  { id: 'BPP-8024J', productId: 'PRD-8024J', connectorModel: 'Aptiv HVIL 4P', assemblyManual: '充电座互锁连接器装配说明书', pinMap: '4P 互锁信号孔位图', sop: '充电座互锁信号线束 SOP', finishedImageCount: 0, drawingVersion: 'DRW-V2.5', sopVersion: 'SOP-2026.02-A', materialStatus: '失效' },
];

const documentStatusByProduct: Record<string, DocumentStatus> = {
  'PRD-4821A': 'effective',
  'PRD-1907B': 'pending_review',
  'PRD-7720C': 'effective',
  'PRD-6509D': 'expired',
  'PRD-3318E': 'effective',
  'PRD-2046F': 'pending_review',
  'PRD-9088G': 'effective',
  'PRD-1001X': 'pending_review',
  'PRD-5602H': 'effective',
  'PRD-8024J': 'inconsistent',
};

function docStatus(productId: string, type: string): DocumentStatus {
  if (productId === 'PRD-8024J' && type === 'finished_detail_image') return 'missing';
  return documentStatusByProduct[productId] ?? 'effective';
}

function previewType(documentType: ProductDocumentSeed['documentType']): ProductDocumentSeed['previewType'] {
  if (documentType === 'drawing_pdf') return 'pdf';
  if (documentType === 'process_card') return 'card';
  return 'image';
}

function requiredProcess(documentType: ProductDocumentSeed['documentType']): ProductDocumentSeed['requiredForProcess'] {
  if (documentType === 'drawing_pdf' || documentType === 'process_card') return 'common';
  if (documentType === 'connector_manual' || documentType === 'pinout_diagram' || documentType === 'finished_detail_image') return 'back';
  return 'front';
}

function makeDocuments(product: ProductSeed): ProductDocumentSeed[] {
  const plan = productionPlans.find((item) => item.productId === product.id);
  const rows: Array<[ProductDocumentSeed['documentType'], string, string[]]> = [
    ['drawing_pdf', `${product.productName} PDF 图纸`, ['PDF', '图纸', product.productCode, product.currentVersion]],
    ['sop_image', `${product.productName} SOP 扫描图`, ['SOP', '作业流程', product.productCode]],
    ['connector_manual', `${product.productName} 连接器装配说明书`, ['连接器', '装配说明书', product.productCode]],
    ['pinout_diagram', `${product.productName} 插接孔位图`, ['孔位图', '插接', product.productCode]],
    ['finished_detail_image', `${product.productName} 成品细节图`, ['成品细节图', '外观', product.productCode]],
    ['process_card', `${product.productName} 作业流程卡`, ['流程卡', '工艺卡', product.productCode]],
  ];

  return rows.map(([documentType, title, keywords], index) => ({
    documentId: `DOC-${product.productCode}-${index + 1}`,
    productId: product.id,
    planId: plan?.id,
    documentType,
    title,
    version: documentType === 'sop_image' ? `SOP-${product.currentVersion}` : product.currentVersion,
    status: docStatus(product.id, documentType),
    effectiveDate: '2026-06-01',
    updatedAt: '2026-06-10T08:00:00.000Z',
    source: 'mock',
    requiredForProcess: requiredProcess(documentType),
    previewType: previewType(documentType),
    mockPreviewText: `本地 Mock ${title}占位，不连接真实文件源。`,
    keywords,
  }));
}

export const productDocuments: ProductDocumentSeed[] = products.flatMap(makeDocuments);

export const queryLogs: QueryLogSeed[] = [
  { id: 'QL-001', planId: 'PLN-20260611-001', keyword: '后段孔位图', querySource: '搜索', createdAt: '2026-06-11T08:15:00.000Z' },
  { id: 'QL-002', planId: 'PLN-20260611-002', keyword: '剥皮长度 4.5', querySource: '语音', createdAt: '2026-06-11T08:22:00.000Z' },
];

export const confirmationRecords: ConfirmationRecordSeed[] = [
  { id: 'CR-001', planId: 'PLN-20260611-003', userId: 'demo-leader', userName: '组长演示账号', role: '后段组长', createdAt: '2026-06-11T09:20:00.000Z' },
];

export const feedbackRecords: FeedbackRecordMock[] = [];

export function materialStatusFromDocumentStatus(status: DocumentStatus): MaterialStatus {
  if (status === 'effective') return '有效';
  if (status === 'pending_review') return '待确认';
  return '失效';
}

export function processFromProduct(product: ProductSeed): ProcessSegment {
  return product.processSegment;
}
