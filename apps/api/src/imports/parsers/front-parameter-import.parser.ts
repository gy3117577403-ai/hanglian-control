import type { ParsedImportRow, RawImportRow } from './import-parser-utils';
import {
  buildRow,
  materialStatuses,
  materialStatusValue,
  optional,
  requireText,
  value,
} from './import-parser-utils';

export function parseFrontParameterImportRow(rowNumber: number, data: RawImportRow): ParsedImportRow {
  const messages: string[] = [];
  const customer = requireText(data, '客户', messages);
  const productCode = requireText(data, '产品编号', messages);
  const parameterStatus = optional(data, '参数状态', '待确认');
  const keyFields = ['裁线长度', '剥皮长度', '端子型号', '拉力标准', '压接高度']
    .filter((key) => value(data, key));

  if (keyFields.length < 3) messages.push('错误：裁线长度、剥皮长度、端子型号、拉力标准、压接高度至少应有 3 项。');
  if (parameterStatus && !materialStatuses.includes(parameterStatus)) {
    messages.push('错误：参数状态必须是当前有效 / 待确认 / 已失效 / 不一致。');
  }

  return buildRow(rowNumber, data, {
    customer,
    productCode,
    productVersion: optional(data, '产品版本', 'Rev.A'),
    wireLength: value(data, '裁线长度'),
    strippingLength: value(data, '剥皮长度'),
    terminalModel: value(data, '端子型号'),
    pullForceStandard: value(data, '拉力标准'),
    crimpHeight: value(data, '压接高度'),
    drawingVersion: optional(data, '图纸版本', 'Rev.A'),
    parameterStatus: materialStatusValue(parameterStatus),
    remark: value(data, '备注'),
  }, messages);
}
