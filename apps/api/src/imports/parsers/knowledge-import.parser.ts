import type { ParsedImportRow, RawImportRow } from './import-parser-utils';
import { buildRow, optional, requireText, value } from './import-parser-utils';

const processSegments = ['front', 'back', 'common', '前段', '后段', '通用'];
const fixtureStatuses = ['active', 'pending_review', 'inactive', 'abnormal', '启用', '待复核', '停用', '异常'];
const abnormalStatuses = ['active', 'pending_review', 'closed', '启用', '待复核', '已关闭'];
const qualityStatuses = ['effective', 'pending_review', 'expired', '有效', '待复核', '失效'];
const severities = ['low', 'medium', 'high', 'critical', '低', '中', '高', '严重'];
const defectLevels = ['minor', 'major', 'critical', '轻微', '主要', '严重'];

function processSegmentValue(raw: string) {
  if (raw === '前段') return 'front';
  if (raw === '后段') return 'back';
  if (raw === '通用') return 'common';
  return raw || 'common';
}

function fixtureStatusValue(raw: string) {
  if (raw === '启用') return 'active';
  if (raw === '待复核') return 'pending_review';
  if (raw === '停用') return 'inactive';
  if (raw === '异常') return 'abnormal';
  return raw || 'pending_review';
}

function abnormalStatusValue(raw: string) {
  if (raw === '启用') return 'active';
  if (raw === '待复核') return 'pending_review';
  if (raw === '已关闭') return 'closed';
  return raw || 'pending_review';
}

function qualityStatusValue(raw: string) {
  if (raw === '有效') return 'effective';
  if (raw === '待复核') return 'pending_review';
  if (raw === '失效') return 'expired';
  return raw || 'pending_review';
}

function severityValue(raw: string) {
  if (raw === '低') return 'low';
  if (raw === '中') return 'medium';
  if (raw === '高') return 'high';
  if (raw === '严重') return 'critical';
  return raw || 'medium';
}

function defectLevelValue(raw: string) {
  if (raw === '轻微') return 'minor';
  if (raw === '主要') return 'major';
  if (raw === '严重') return 'critical';
  return raw || 'major';
}

export function parseFixtureImportRow(rowNumber: number, data: RawImportRow): ParsedImportRow {
  const messages: string[] = [];
  const fixtureCode = requireText(data, '治具编号', messages);
  const fixtureName = requireText(data, '治具名称', messages);
  const productCode = requireText(data, '产品编号', messages);
  const processSegment = optional(data, '工序段', 'common');
  const status = optional(data, '状态', 'pending_review');

  if (!processSegments.includes(processSegment)) messages.push('错误：工序段必须是 front/back/common 或 前段/后段/通用。');
  if (!fixtureStatuses.includes(status)) messages.push('错误：治具状态必须是 active/pending_review/inactive/abnormal 或中文状态。');

  return buildRow(rowNumber, data, {
    fixtureCode,
    fixtureName,
    fixtureType: optional(data, '治具类型', '现场治具'),
    customerName: optional(data, '客户', '演示客户'),
    productId: value(data, '产品ID'),
    productCode,
    productName: optional(data, '产品名称', productCode),
    processSegment: processSegmentValue(processSegment),
    applicableStation: optional(data, '适用工位', '演示工位'),
    usageMethod: optional(data, '使用方法', '按现场指导书使用'),
    checkStandard: optional(data, '点检标准', '点检合格后使用'),
    maintenanceCycle: optional(data, '保养周期', '每班点检'),
    status: fixtureStatusValue(status),
    keywords: value(data, '关键词'),
    remark: value(data, '备注'),
  }, messages);
}

export function parseAbnormalImportRow(rowNumber: number, data: RawImportRow): ParsedImportRow {
  const messages: string[] = [];
  const abnormalCode = requireText(data, '异常编号', messages);
  const title = requireText(data, '异常标题', messages);
  const productCode = requireText(data, '产品编号', messages);
  const processSegment = optional(data, '工序段', 'common');
  const severity = optional(data, '严重度', 'medium');
  const status = optional(data, '状态', 'pending_review');

  if (!processSegments.includes(processSegment)) messages.push('错误：工序段必须是 front/back/common 或 前段/后段/通用。');
  if (!severities.includes(severity)) messages.push('错误：严重度必须是 low/medium/high/critical 或 低/中/高/严重。');
  if (!abnormalStatuses.includes(status)) messages.push('错误：异常状态必须是 active/pending_review/closed 或中文状态。');

  return buildRow(rowNumber, data, {
    abnormalCode,
    title,
    customerName: optional(data, '客户', '演示客户'),
    productId: value(data, '产品ID'),
    productCode,
    productName: optional(data, '产品名称', productCode),
    processSegment: processSegmentValue(processSegment),
    station: optional(data, '工位', '演示工位'),
    category: optional(data, '异常类别', '现场异常'),
    symptom: optional(data, '异常现象', '现场发现异常现象'),
    cause: optional(data, '原因分析', '待复盘原因'),
    solution: optional(data, '处理方法', '隔离并复核'),
    prevention: optional(data, '预防措施', '纳入班前提醒'),
    severity: severityValue(severity),
    status: abnormalStatusValue(status),
    keywords: value(data, '关键词'),
    remark: value(data, '备注'),
  }, messages);
}

export function parseQualityImportRow(rowNumber: number, data: RawImportRow): ParsedImportRow {
  const messages: string[] = [];
  const qualityCode = requireText(data, '质量标准编号', messages);
  const title = requireText(data, '质量标准标题', messages);
  const productCode = requireText(data, '产品编号', messages);
  const processSegment = optional(data, '工序段', 'common');
  const defectLevel = optional(data, '缺陷等级', 'major');
  const status = optional(data, '状态', 'pending_review');

  if (!processSegments.includes(processSegment)) messages.push('错误：工序段必须是 front/back/common 或 前段/后段/通用。');
  if (!defectLevels.includes(defectLevel)) messages.push('错误：缺陷等级必须是 minor/major/critical 或 轻微/主要/严重。');
  if (!qualityStatuses.includes(status)) messages.push('错误：质量状态必须是 effective/pending_review/expired 或中文状态。');

  return buildRow(rowNumber, data, {
    qualityCode,
    title,
    customerName: optional(data, '客户', '演示客户'),
    productId: value(data, '产品ID'),
    productCode,
    productName: optional(data, '产品名称', productCode),
    processSegment: processSegmentValue(processSegment),
    inspectionItem: optional(data, '检验项目', title),
    standardValue: optional(data, '标准值', '按图纸/SOP 执行'),
    tolerance: optional(data, '公差', '不允许超差'),
    inspectionMethod: optional(data, '检验方法', '首件确认与过程抽检'),
    samplingRule: optional(data, '抽检规则', '首件必检'),
    defectLevel: defectLevelValue(defectLevel),
    status: qualityStatusValue(status),
    keywords: value(data, '关键词'),
    remark: value(data, '备注'),
  }, messages);
}

