import type { ParsedImportRow, RawImportRow } from './import-parser-utils';
import { buildRow, optional, requireText, value } from './import-parser-utils';

export function parseCustomerProductImportRow(rowNumber: number, data: RawImportRow): ParsedImportRow {
  const messages: string[] = [];
  const customer = requireText(data, '客户', messages);
  const productCode = requireText(data, '产品编号', messages);
  const productName = requireText(data, '产品名称', messages);

  return buildRow(rowNumber, data, {
    sales: optional(data, '销售', '演示销售'),
    customer,
    productCode,
    productName,
    productVersion: optional(data, '产品版本', 'Rev.A'),
    productCategory: value(data, '产品类别'),
    remark: value(data, '备注'),
  }, messages);
}
