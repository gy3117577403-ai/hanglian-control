import { extname } from 'node:path';

export const PDF_IMPORT_MAX_FILE_COUNT = 50;
export const PDF_IMPORT_MAX_SINGLE_FILE_SIZE = 30 * 1024 * 1024;
export const PDF_IMPORT_MAX_TOTAL_SIZE = 300 * 1024 * 1024;

export interface PdfImportValidationResult {
  valid: boolean;
  message?: string;
}

export function pdfImportFileSize(file?: Express.Multer.File) {
  if (!file) return 0;
  if (typeof file.size === 'number' && Number.isFinite(file.size)) return file.size;
  return Buffer.isBuffer(file.buffer) ? file.buffer.length : 0;
}

export function validatePdfImportBatch(files: Express.Multer.File[]): PdfImportValidationResult {
  if (!files.length) {
    return { valid: false, message: '请上传 PDF 文件。' };
  }

  if (files.length > PDF_IMPORT_MAX_FILE_COUNT) {
    return { valid: false, message: '单批最多上传 50 个 PDF 文件。' };
  }

  const totalSize = files.reduce((sum, file) => sum + pdfImportFileSize(file), 0);
  if (totalSize > PDF_IMPORT_MAX_TOTAL_SIZE) {
    return { valid: false, message: '单批 PDF 总大小不能超过 300 MB。' };
  }

  return { valid: true };
}

export function validatePdfImportFile(file?: Express.Multer.File): PdfImportValidationResult {
  if (!file) {
    return { valid: false, message: '文件读取失败。' };
  }

  const fileSize = pdfImportFileSize(file);
  if (fileSize <= 0) {
    return { valid: false, message: 'PDF 文件不能为空。' };
  }

  if (fileSize > PDF_IMPORT_MAX_SINGLE_FILE_SIZE) {
    return { valid: false, message: '单个 PDF 文件不能超过 30 MB。' };
  }

  const extensionValid = extname(file.originalname ?? '').toLowerCase() === '.pdf';
  const mimeValid = file.mimetype === 'application/pdf';
  if (!extensionValid || !mimeValid) {
    return { valid: false, message: '仅支持上传 PDF 文件。' };
  }

  if (!Buffer.isBuffer(file.buffer)) {
    return { valid: false, message: '文件读取失败。' };
  }

  return { valid: true };
}
