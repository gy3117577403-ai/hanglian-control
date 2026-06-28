import type { ParsedImportRow, RawImportRow } from './import-parser-utils';
import {
  buildRow,
  numberValue,
  optional,
  planStatuses,
  processSegments,
  requireText,
  value,
} from './import-parser-utils';

export function parseProductionPlanImportRow(rowNumber: number, data: RawImportRow): ParsedImportRow {
  const messages: string[] = [];
  const date = requireText(data, '计划日期', messages);
  const customer = requireText(data, '客户', messages);
  const productCode = requireText(data, '产品编号', messages);
  const productName = requireText(data, '产品名称', messages);
  const segment = requireText(data, '工序段', messages);
  const plannedQuantity = numberValue(data, '计划数量', Number.NaN);
  const completedQuantity = numberValue(data, '完成数量', 0);
  const status = optional(data, '生产状态', '待生产');

  if (segment && !processSegments.includes(segment)) messages.push('错误：工序段必须是前段 / 后段 / 通用。');
  if (!Number.isFinite(plannedQuantity)) messages.push('错误：计划数量必须是数字。');
  if (!Number.isFinite(completedQuantity)) messages.push('错误：完成数量必须是数字。');
  if (status && !planStatuses.includes(status)) messages.push('错误：生产状态必须是待生产 / 生产中 / 已完成 / 异常。');

  return buildRow(rowNumber, data, {
    date,
    weekPlanNo: optional(data, '周计划编号', `W-${date || 'DEMO'}`),
    sales: optional(data, '销售', '演示销售'),
    customer,
    productCode,
    productName,
    productVersion: optional(data, '产品版本', 'Rev.A'),
    segment,
    plannedQuantity: Number.isFinite(plannedQuantity) ? plannedQuantity : 0,
    completedQuantity: Number.isFinite(completedQuantity) ? completedQuantity : 0,
    status,
    owner: optional(data, '负责人', '组长演示账号'),
    remark: value(data, '备注'),
  }, messages);
}
