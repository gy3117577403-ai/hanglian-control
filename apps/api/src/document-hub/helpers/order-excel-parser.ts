import { Workbook } from 'exceljs';
import { normalizeOrderProductModel } from '../order-metadata.store';

export interface ParsedOrderExcelRow {
  rowNumber: number;
  rawProductModel: string;
  productModel: string;
  normalizedProductModel: string;
  errorMessage?: string;
}

const productModelHeaders = ['产品型号', '型号', '产品', 'productModel', 'ProductModel'];
const maxOrderRows = 2000;

function normalizeHeader(value: string) {
  return value
    .normalize('NFKC')
    .replace(/^\uFEFF/, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function cellText(value: unknown) {
  if (value === undefined || value === null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    const rich = value as { text?: string; result?: unknown; formula?: string; hyperlink?: string };
    if (rich.text) return rich.text;
    if (rich.result !== undefined) return cellText(rich.result);
    if (rich.hyperlink) return rich.hyperlink;
    if (rich.formula) return rich.formula;
  }
  return String(value).replace(/^\uFEFF/, '').normalize('NFKC').trim();
}

function cleanProductModel(value: string) {
  return value
    .normalize('NFKC')
    .replace(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, ' ')
    .replace(/[\u2010-\u2015\u2212\ufe58\ufe63\uff0d]/g, '-')
    .replace(/[\uff3f]/g, '_')
    .replace(/[\\/|;,\u3001\uff0c\uff1b\uff1a:]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
}

function isDateLike(value: string) {
  return /^(?:20\d{6}|20\d{2}[-/.](?:0[1-9]|1[0-2])[-/.](?:0[1-9]|[12]\d|3[01]))$/.test(value);
}

function isPureChineseDescription(value: string) {
  return /[\u4e00-\u9fff]/.test(value) && !/[A-Za-z0-9]/.test(value);
}

function isLikelyProductModel(value: string) {
  return (
    value.length >= 4 &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    !isDateLike(value) &&
    !isPureChineseDescription(value)
  );
}

function makeError(rowNumber: number, rawProductModel: string, errorMessage: string): ParsedOrderExcelRow {
  return {
    rowNumber,
    rawProductModel,
    productModel: '',
    normalizedProductModel: '',
    errorMessage,
  };
}

function findProductColumn(headers: string[]) {
  const aliases = productModelHeaders.map(normalizeHeader);
  return headers.findIndex((header) => aliases.includes(normalizeHeader(header)));
}

export function assertXlsxOrderFile(file?: Express.Multer.File) {
  if (!file) throw new Error('请上传订单 XLSX 文件。');
  const name = file.originalname ?? '';
  if (!name.toLowerCase().endsWith('.xlsx')) {
    throw new Error('仅支持 XLSX 订单文件。');
  }
}

export async function parseOrderExcel(file: Express.Multer.File): Promise<ParsedOrderExcelRow[]> {
  assertXlsxOrderFile(file);
  const workbook = new Workbook();
  await workbook.xlsx.load(file.buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('未找到可读取的订单工作表。');

  const headers: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = cellText(cell.value);
  });
  const productColumnIndex = findProductColumn(headers);
  if (productColumnIndex < 0) {
    throw new Error('订单 Excel 缺少“产品型号”表头。');
  }

  const rows: ParsedOrderExcelRow[] = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const rawProductModel = cellText(row.getCell(productColumnIndex + 1).value);
    let hasAnyText = false;
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (cellText(cell.value).trim()) hasAnyText = true;
    });
    if (!rawProductModel && !hasAnyText) continue;
    if (!rawProductModel) continue;

    const productModel = cleanProductModel(rawProductModel);
    const normalizedProductModel = normalizeOrderProductModel(productModel);
    if (!normalizedProductModel) {
      rows.push(makeError(rowNumber, rawProductModel, '产品型号不能为空。'));
      continue;
    }
    if (!isLikelyProductModel(normalizedProductModel)) {
      rows.push(makeError(rowNumber, rawProductModel, '产品型号格式不合法。'));
      continue;
    }

    rows.push({
      rowNumber,
      rawProductModel,
      productModel,
      normalizedProductModel,
    });
    if (rows.length > maxOrderRows) {
      throw new Error(`订单 Excel 最多支持 ${maxOrderRows} 行产品型号。`);
    }
  }

  return rows;
}
