import type { ParsedImportRow, RawImportRow } from './import-parser-utils';
import { buildRow, optional, requireText, value } from './import-parser-utils';

const processSegments = ['front', 'back', 'common', '前段', '后段', '通用'];
const fixtureStatuses = ['active', 'pending_review', 'inactive', 'abnormal', '启用', '待复核', '停用', '异常'];
const abnormalStatuses = ['active', 'pending_review', 'closed', '启用', '待复核', '已关闭'];
const qualityStatuses = ['effective', 'pending_review', 'expired', '有效', '待确认', '已失效'];
const severities = ['low', 'medium', 'high', 'critical', '低', '中', '高', '严重'];
const defectLevels = ['minor', 'major', 'critical', '轻微', '主要', '严重'];

function pick(data: RawImportRow, ...keys: string[]) {
  for (const key of keys) {
    const text = value(data, key);
    if (text) return text;
  }
  return '';
}

function requireAny(data: RawImportRow, keys: string[], messages: string[], label: string) {
  const text = pick(data, ...keys);
  if (!text) messages.push(`错误：${label}必填。`);
  return text;
}

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
  if (raw === '待确认') return 'pending_review';
  if (raw === '已失效') return 'expired';
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
  const fixtureCode = requireAny(data, ['治具编号', 'fixtureCode'], messages, '治具编号');
  const fixtureName = requireAny(data, ['治具名称', 'fixtureName'], messages, '治具名称');
  const productCode = requireAny(data, ['产品编号', 'productCode'], messages, '产品编号');
  const processSegment = pick(data, '工序段', 'processSegment') || 'common';
  const status = pick(data, '状态', 'status') || 'pending_review';
  const checkStandard = pick(data, '点检标准', 'checkStandard');

  if (!processSegments.includes(processSegment)) messages.push('错误：工序段必须是 front/back/common 或 前段/后段/通用。');
  if (!fixtureStatuses.includes(status)) messages.push('错误：治具状态必须是 active/pending_review/inactive/abnormal 或中文状态。');
  if (!checkStandard) messages.push('警告：治具缺少点检标准，建议导入后补充。');

  return buildRow(rowNumber, data, {
    fixtureCode,
    fixtureName,
    fixtureType: pick(data, '治具类型', 'fixtureType') || '现场治具',
    customerName: pick(data, '客户', 'customerName') || '演示客户',
    productId: pick(data, '产品ID', 'productId'),
    productCode,
    productName: pick(data, '产品名称', 'productName') || productCode,
    processSegment: processSegmentValue(processSegment),
    applicableStation: pick(data, '适用工位', 'applicableStation') || '演示工位',
    usageMethod: pick(data, '使用方法', 'usageMethod') || '按现场指导书使用',
    checkStandard: checkStandard || '点检合格后使用',
    maintenanceCycle: pick(data, '保养周期', 'maintenanceCycle') || '每班点检',
    status: fixtureStatusValue(status),
    keywords: pick(data, '关键词', 'keywords'),
    remark: pick(data, '备注', 'remark'),
  }, messages);
}

export function parseAbnormalImportRow(rowNumber: number, data: RawImportRow): ParsedImportRow {
  const messages: string[] = [];
  const abnormalCode = requireAny(data, ['异常编号', 'abnormalCode'], messages, '异常编号');
  const title = requireAny(data, ['异常标题', 'title'], messages, '异常标题');
  const productCode = requireAny(data, ['产品编号', 'productCode'], messages, '产品编号');
  const symptom = requireAny(data, ['异常现象', 'symptom'], messages, '异常现象');
  const processSegment = pick(data, '工序段', 'processSegment') || 'common';
  const severity = pick(data, '严重度', 'severity') || 'medium';
  const status = pick(data, '状态', 'status') || 'pending_review';
  const solution = pick(data, '处理方法', 'solution');
  const prevention = pick(data, '预防措施', 'prevention');

  if (!processSegments.includes(processSegment)) messages.push('错误：工序段必须是 front/back/common 或 前段/后段/通用。');
  if (!severities.includes(severity)) messages.push('错误：严重度必须是 low/medium/high/critical 或中文等级。');
  if (!abnormalStatuses.includes(status)) messages.push('错误：异常状态必须是 active/pending_review/closed 或中文状态。');
  if (!solution) messages.push('警告：处理方法缺失，建议导入后补充。');
  if (severityValue(severity) === 'critical' && !prevention) messages.push('警告：critical 异常必须有预防措施。');

  return buildRow(rowNumber, data, {
    abnormalCode,
    title,
    customerName: pick(data, '客户', 'customerName') || '演示客户',
    productId: pick(data, '产品ID', 'productId'),
    productCode,
    productName: pick(data, '产品名称', 'productName') || productCode,
    processSegment: processSegmentValue(processSegment),
    station: pick(data, '工位', 'station') || '演示工位',
    category: pick(data, '异常类别', 'category') || '现场异常',
    symptom,
    cause: pick(data, '原因分析', 'cause') || '待复盘原因',
    solution: solution || '隔离并复核',
    prevention: prevention || '纳入班前提醒',
    severity: severityValue(severity),
    status: abnormalStatusValue(status),
    keywords: pick(data, '关键词', 'keywords'),
    remark: pick(data, '备注', 'remark'),
  }, messages);
}

export function parseQualityImportRow(rowNumber: number, data: RawImportRow): ParsedImportRow {
  const messages: string[] = [];
  const qualityCode = requireText(data, '质量标准编号', messages);
  const title = requireText(data, '质量标准标题', messages);
  const productCode = requireAny(data, ['产品编号', 'productCode'], messages, '产品编号');
  const inspectionItem = requireAny(data, ['检验项目', 'inspectionItem'], messages, '检验项目');
  const standardValue = requireAny(data, ['标准值', 'standardValue'], messages, '标准值');
  const processSegment = pick(data, '工序段', 'processSegment') || 'common';
  const defectLevel = pick(data, '缺陷等级', 'defectLevel') || 'major';
  const status = pick(data, '状态', 'status') || 'pending_review';
  const inspectionMethod = pick(data, '检验方法', 'inspectionMethod');

  if (!processSegments.includes(processSegment)) messages.push('错误：工序段必须是 front/back/common 或 前段/后段/通用。');
  if (!defectLevels.includes(defectLevel)) messages.push('错误：缺陷等级必须是 minor/major/critical 或中文等级。');
  if (!qualityStatuses.includes(status)) messages.push('错误：质量状态必须是 effective/pending_review/expired 或中文状态。');
  if (!inspectionMethod) messages.push('警告：检验方法缺失，建议导入后补充。');

  return buildRow(rowNumber, data, {
    qualityCode,
    title,
    customerName: pick(data, '客户', 'customerName') || '演示客户',
    productId: pick(data, '产品ID', 'productId'),
    productCode,
    productName: pick(data, '产品名称', 'productName') || productCode,
    processSegment: processSegmentValue(processSegment),
    inspectionItem,
    standardValue,
    tolerance: pick(data, '公差', 'tolerance') || '不允许超差',
    inspectionMethod: inspectionMethod || '首件确认与过程抽检',
    samplingRule: pick(data, '抽检规则', 'samplingRule') || '首件必检',
    defectLevel: defectLevelValue(defectLevel),
    status: qualityStatusValue(status),
    keywords: pick(data, '关键词', 'keywords'),
    remark: pick(data, '备注', 'remark'),
  }, messages);
}
