import type { ParsedImportRow, RawImportRow } from './import-parser-utils';
import {
  buildRow,
  materialStatuses,
  materialStatusValue,
  numberValue,
  optional,
  requireText,
  value,
} from './import-parser-utils';

export function parseBackPackageImportRow(rowNumber: number, data: RawImportRow): ParsedImportRow {
  const messages: string[] = [];
  const customer = requireText(data, '客户', messages);
  const productCode = requireText(data, '产品编号', messages);
  const materialStatus = optional(data, '资料状态', '待确认');
  const finishedImageCount = numberValue(data, '成品细节图数量', 0);
  const hasBackDocument = Boolean(value(data, '插接孔位图') || value(data, '作业流程SOP') || finishedImageCount > 0);

  if (!value(data, '连接器型号')) messages.push('提醒：连接器型号缺失，建议导入前补齐。');
  if (!hasBackDocument) messages.push('错误：插接孔位图、作业流程SOP、成品细节图至少应有 1 项。');
  if (materialStatus && !materialStatuses.includes(materialStatus)) {
    messages.push('错误：资料状态必须是当前有效 / 待确认 / 已失效 / 不一致。');
  }
  if (!Number.isFinite(finishedImageCount)) messages.push('错误：成品细节图数量必须是数字。');

  return buildRow(rowNumber, data, {
    customer,
    productCode,
    productVersion: optional(data, '产品版本', 'Rev.A'),
    connectorModel: value(data, '连接器型号'),
    assemblyManual: value(data, '连接器装配说明书'),
    pinMap: value(data, '插接孔位图'),
    sop: value(data, '作业流程SOP'),
    finishedImageCount: Number.isFinite(finishedImageCount) ? finishedImageCount : 0,
    drawingVersion: optional(data, '图纸版本', 'Rev.A'),
    sopVersion: optional(data, 'SOP版本', 'Rev.A'),
    materialStatus: materialStatusValue(materialStatus),
    remark: value(data, '备注'),
  }, messages);
}
