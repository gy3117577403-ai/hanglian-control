import common from '@ohos.app.ability.common';
import request from '@ohos.request';
import fs from '@ohos.file.fs';
import http from '@ohos.net.http';
import {
  documentIdOf,
  ProductDocument,
  ProductDocumentCategoryGroup,
  ProductDocumentsResponse,
  UploadDocumentInput,
  UploadProgress
} from '../models/DocumentModels';
import { ApiClient } from './ApiClient';
import { AppConfig } from './AppConfig';
import { TokenStorageService } from './TokenStorageService';
import { WorkbenchRefreshBus } from './WorkbenchRefreshBus';

export type UploadProgressHandler = (progress: UploadProgress) => void;

interface UploadHeaders {
  Authorization?: string;
}

interface MultipartHeaders {
  'Content-Type': string;
  Authorization?: string;
}

interface UploadDataField {
  name: string;
  value: string;
}

export class UploadFailedDetail {
  source: string = '';
  action: string = '';
  step: string = '';
  url: string = '';
  requestPath: string = '';
  method: string = '';
  fileName: string = '';
  fileExt: string = '';
  fileSize: number = 0;
  mimeType: string = '';
  cachePath: string = '';
  cacheFileExists: boolean = false;
  uploadUri: string = '';
  uploadUriScheme: string = '';
  uploadUriSample: string = '';
  productModel: string = '';
  productIdTail: string = '';
  categoryLabel: string = '';
  documentType: string = '';
  hasToken: boolean = false;
  requestStatusCode: number = 0;
  responseBody: string = '';
  uploadTaskCode: number = 0;
  uploadTaskMessage: string = '';
  osError: string = '';
  rawError: string = '';
  rawErrorMessage: string = '';
  timestamp: string = '';
  fallbackEnabled: boolean = false;
  fallbackReason: string = '';
  uploadFileError: string = '';
  fallbackError: string = '';
}

export class UploadService {
  private static readonly DETAIL_PREFIX: string = 'UPLOAD_DETAIL:';
  private static readonly MULTIPART_FALLBACK_MAX_BYTES: number = 10 * 1024 * 1024;

  static async uploadDocument(
    context: common.UIAbilityContext,
    input: UploadDocumentInput,
    onProgress?: UploadProgressHandler
  ): Promise<string> {
    console.info('[HanglianPad] upload start', input.file.name, input.documentType);
    let token = TokenStorageService.getCachedAccessToken();
    if (!token) {
      token = await TokenStorageService.getAccessToken();
    }

    const url = ApiClient.resolveApiUrl('/documents/upload');
    try {
      return await UploadService.uploadWithUri(context, input, input.file.uploadUri, token, url, onProgress, 'request.uploadFile');
    } catch (error) {
      const detail = UploadService.extractErrorDetail(error) ??
        UploadService.buildDetail(input, url, input.file.uploadUri, token, 'request.uploadFile', undefined, error);
      const fallbackUri = input.file.fallbackUploadUri ?? '';
      const canRetryUploadFile = fallbackUri.length > 0 && fallbackUri !== input.file.uploadUri && UploadService.shouldRetryWithFallback(detail);
      const canRetryMultipart = UploadService.canRetryWithMultipart(input, detail);
      console.error('[HanglianPad] upload failed detail ' + JSON.stringify(detail));

      if (!canRetryUploadFile && !canRetryMultipart) {
        throw error instanceof Error ? error : UploadService.errorFromDetail(detail);
      }

      let uploadFileError = UploadService.safeErrorForLog(detail);
      if (canRetryUploadFile) {
        console.info('[HanglianPad] upload retry with fallback uri scheme ' + UploadService.uriScheme(fallbackUri));
        try {
          return await UploadService.uploadWithUri(context, input, fallbackUri, token, url, onProgress, 'request.uploadFile.fallback');
        } catch (fallbackError) {
          const fallbackDetail = UploadService.extractErrorDetail(fallbackError) ??
            UploadService.buildDetail(input, url, fallbackUri, token, 'request.uploadFile.fallback', undefined, fallbackError);
          console.error('[HanglianPad] upload failed detail ' + JSON.stringify(fallbackDetail));
          uploadFileError = `${uploadFileError}; ${UploadService.safeErrorForLog(fallbackDetail)}`;
        }
      }

      if (canRetryMultipart) {
        try {
          return await UploadService.uploadWithMultipart(context, input, token, url, onProgress, detail);
        } catch (fallbackError) {
          const fallbackDetail = UploadService.extractErrorDetail(fallbackError) ??
            UploadService.buildDetail(input, url, input.file.uploadUri, token, 'http.request.multipart_fallback', undefined, fallbackError);
          fallbackDetail.fallbackEnabled = true;
          fallbackDetail.fallbackReason = 'request.uploadFile returned 17 or Http protocol error';
          fallbackDetail.uploadFileError = uploadFileError;
          fallbackDetail.fallbackError = UploadService.safeErrorForLog(fallbackDetail);
          console.error('[HanglianPad] upload failed detail ' + JSON.stringify(fallbackDetail));
          throw UploadService.errorFromDetail(fallbackDetail);
        }
      }

      throw UploadService.errorFromDetail(detail);
    }
  }

  static extractErrorDetail(error: Object): UploadFailedDetail | undefined {
    if (error instanceof Error && error.message.startsWith(UploadService.DETAIL_PREFIX)) {
      try {
        const raw = JSON.parse(error.message.substring(UploadService.DETAIL_PREFIX.length)) as UploadFailedDetail;
        return UploadService.copyDetail(raw);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  private static uploadWithUri(
    context: common.UIAbilityContext,
    input: UploadDocumentInput,
    uploadUri: string,
    token: string,
    url: string,
    onProgress: UploadProgressHandler | undefined,
    step: string
  ): Promise<string> {
    const headers: UploadHeaders = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const files: request.File[] = [
      {
        name: 'file',
        filename: input.file.name,
        uri: uploadUri,
        type: input.file.mimeType
      }
    ];

    const config: request.UploadConfig = {
      url,
      header: headers,
      method: 'POST',
      files,
      data: UploadService.buildData(input)
    };

    return new Promise<string>((resolve: (value: string) => void, reject: (reason: Error) => void) => {
      request.uploadFile(context, config).then((task: request.UploadTask) => {
        task.on('progress', (uploadedSize: number, totalSize: number) => {
          const percent = totalSize > 0 ? Math.floor(uploadedSize * 100 / totalSize) : 0;
          if (onProgress) onProgress({ loaded: uploadedSize, total: totalSize, percent });
        });
        task.on('complete', (states: request.TaskState[]) => {
          const statusCode = UploadService.statusCodeOf(states);
          if (statusCode >= 400) {
            reject(UploadService.errorFromDetail(UploadService.buildDetail(input, url, uploadUri, token, `${step}.complete`, states)));
            return;
          }

          void UploadService.resolveUploadResult(input, states).then((documentId: string) => {
            WorkbenchRefreshBus.emit({
              productId: input.productId,
              category: input.category,
              documentId
            });
            console.info('[HanglianPad] upload success', documentId);
            resolve(documentId);
          }).catch((error: Error) => {
            reject(UploadService.errorFromDetail(UploadService.buildDetail(input, url, uploadUri, token, `${step}.resolve`, states, error)));
          });
        });
        task.on('fail', (states: request.TaskState[]) => {
          reject(UploadService.errorFromDetail(UploadService.buildDetail(input, url, uploadUri, token, `${step}.fail`, states)));
        });
      }).catch((error: Error) => {
        reject(UploadService.errorFromDetail(UploadService.buildDetail(input, url, uploadUri, token, `${step}.start`, undefined, error)));
      });
    });
  }

  private static asText(value: string): string {
    return `${value}`;
  }

  private static buildData(input: UploadDocumentInput): request.RequestData[] {
    const data: request.RequestData[] = [
      { name: 'productId', value: UploadService.asText(input.productId) },
      { name: 'documentType', value: UploadService.asText(input.documentType) },
      { name: 'title', value: UploadService.asText(input.title) },
      { name: 'version', value: UploadService.asText(input.version) },
      { name: 'status', value: 'effective' },
      { name: 'requiredForProcess', value: UploadService.asText(input.requiredForProcess) }
    ];
    if (input.planId) data.push({ name: 'planId', value: UploadService.asText(input.planId) });
    if (input.keywords) data.push({ name: 'keywords', value: UploadService.asText(input.keywords) });
    if (input.remark) data.push({ name: 'remark', value: UploadService.asText(input.remark) });
    return data;
  }

  private static async resolveUploadResult(input: UploadDocumentInput, states: request.TaskState[]): Promise<string> {
    const stateText = UploadService.taskStateMessage(states);
    return UploadService.resolveUploadResultFromText(input, stateText);
  }

  private static async resolveUploadResultFromText(input: UploadDocumentInput, stateText: string): Promise<string> {
    const uploaded = UploadService.extractDocument(stateText);
    const directDocumentId = uploaded ? documentIdOf(uploaded) : '';
    if (directDocumentId) return directDocumentId;

    const response = await ApiClient.getJson<ProductDocumentsResponse>(`/products/${encodeURIComponent(input.productId)}/documents`);
    const documents = UploadService.flattenProductDocuments(response);
    const match = documents.find((document: ProductDocument) => {
      return document.title === input.title &&
        document.version === input.version &&
        document.documentType === input.documentType;
    }) ?? documents[0];
    const fallbackDocumentId = match ? documentIdOf(match) : '';
    if (fallbackDocumentId) return fallbackDocumentId;
    throw new Error('Upload completed but documentId was not returned.');
  }

  private static flattenProductDocuments(response: ProductDocumentsResponse): ProductDocument[] {
    const result: ProductDocument[] = [];
    if (response.documents) {
      response.documents.forEach((document: ProductDocument) => result.push(document));
    }
    if (response.categories) {
      response.categories.forEach((group: ProductDocumentCategoryGroup) => {
        group.documents.forEach((document: ProductDocument) => result.push(document));
      });
    }
    return result;
  }

  private static async uploadWithMultipart(
    context: common.UIAbilityContext,
    input: UploadDocumentInput,
    token: string,
    url: string,
    onProgress: UploadProgressHandler | undefined,
    uploadFileDetail: UploadFailedDetail
  ): Promise<string> {
    const boundary = `----HanglianPad${Date.now()}`;
    const headers: MultipartHeaders = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const body = UploadService.buildMultipartBody(input, boundary);
    const client = http.createHttp();
    try {
      const response = await client.request(url, {
        method: http.RequestMethod.POST,
        header: headers,
        extraData: body,
        connectTimeout: AppConfig.REQUEST_TIMEOUT_MS,
        readTimeout: AppConfig.REQUEST_TIMEOUT_MS,
        expectDataType: http.HttpDataType.STRING
      });
      const statusCode = response.responseCode;
      const responseBody = UploadService.responseToString(response.result);
      if (statusCode < 200 || statusCode >= 300) {
        const detail = UploadService.buildDetail(input, url, input.file.uploadUri, token, 'http.request.multipart_fallback.response');
        detail.fallbackEnabled = true;
        detail.fallbackReason = 'request.uploadFile returned 17 or Http protocol error';
        detail.requestStatusCode = statusCode;
        detail.responseBody = UploadService.sanitizeText(responseBody);
        detail.uploadTaskCode = statusCode;
        detail.uploadTaskMessage = UploadService.sanitizeText(responseBody);
        detail.uploadFileError = UploadService.safeErrorForLog(uploadFileDetail);
        throw UploadService.errorFromDetail(detail);
      }

      const documentId = await UploadService.resolveUploadResultFromText(input, responseBody);
      WorkbenchRefreshBus.emit({
        productId: input.productId,
        category: input.category,
        documentId
      });
      if (onProgress) onProgress({ loaded: input.file.size, total: input.file.size, percent: 100 });
      console.info('[HanglianPad] upload success multipart fallback ' + documentId);
      return documentId;
    } finally {
      client.destroy();
    }
  }

  private static buildMultipartBody(input: UploadDocumentInput, boundary: string): ArrayBuffer {
    const fileBytes = UploadService.readCacheBytes(input);
    const chunks: number[] = [];
    const fields = UploadService.buildData(input);
    fields.forEach((field: request.RequestData) => {
      UploadService.appendText(chunks, `--${boundary}\r\n`);
      UploadService.appendText(chunks, `Content-Disposition: form-data; name="${UploadService.safeMultipartName(field.name)}"\r\n\r\n`);
      UploadService.appendText(chunks, `${field.value}\r\n`);
    });
    UploadService.appendText(chunks, `--${boundary}\r\n`);
    UploadService.appendText(chunks, `Content-Disposition: form-data; name="file"; filename="${UploadService.safeMultipartFileName(input.file.name)}"\r\n`);
    UploadService.appendText(chunks, `Content-Type: ${input.file.mimeType}\r\n\r\n`);
    const view = new Uint8Array(fileBytes);
    for (let index = 0; index < view.length; index += 1) {
      chunks.push(view[index]);
    }
    UploadService.appendText(chunks, `\r\n--${boundary}--\r\n`);
    return UploadService.bytesToArrayBuffer(chunks);
  }

  private static readCacheBytes(input: UploadDocumentInput): ArrayBuffer {
    const cachePath = input.file.cachePath ?? '';
    if (!cachePath) {
      throw new Error('Cache path is missing for multipart fallback.');
    }
    const size = UploadService.cacheFileSize(cachePath);
    if (size <= 0 || size > UploadService.MULTIPART_FALLBACK_MAX_BYTES) {
      throw new Error('Cache file is not eligible for multipart fallback.');
    }
    const buffer = new ArrayBuffer(size);
    let file: fs.File | undefined = undefined;
    try {
      file = fs.openSync(cachePath, fs.OpenMode.READ_ONLY);
      fs.readSync(file.fd, buffer);
      return buffer;
    } finally {
      if (file) fs.closeSync(file);
    }
  }

  private static extractDocument(raw: string): ProductDocument | undefined {
    if (!raw) return undefined;
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace < 0 || lastBrace <= firstBrace) return undefined;
    try {
      return JSON.parse(raw.substring(firstBrace, lastBrace + 1)) as ProductDocument;
    } catch {
      return undefined;
    }
  }

  private static taskStateMessage(states: request.TaskState[]): string {
    if (!states || states.length === 0) return '';
    return states.map((state: request.TaskState) => {
      return `${state.responseCode ?? ''} ${state.message ?? ''}`;
    }).join('\n');
  }

  private static statusCodeOf(states: request.TaskState[] | undefined): number {
    if (!states || states.length === 0) return 0;
    const hit = states.find((state: request.TaskState) => (state.responseCode ?? 0) > 0);
    return hit ? (hit.responseCode ?? 0) : 0;
  }

  private static buildDetail(
    input: UploadDocumentInput,
    url: string,
    uploadUri: string,
    token: string,
    step: string,
    states?: request.TaskState[],
    error?: Object
  ): UploadFailedDetail {
    const stateText = UploadService.taskStateMessage(states ?? []);
    const statusCode = UploadService.statusCodeOf(states);
    const rawError = error ? UploadService.safeStringify(error) : '';
    const detail = new UploadFailedDetail();
    detail.source = 'upload_service';
    detail.action = input.file.source;
    detail.step = step;
    detail.url = '';
    detail.requestPath = '/documents/upload';
    detail.method = 'POST';
    detail.fileName = input.file.name;
    detail.fileExt = UploadService.fileExt(input.file.name);
    detail.fileSize = input.file.size;
    detail.mimeType = input.file.mimeType;
    detail.cachePath = input.file.cachePath ? `cache/${input.file.name}` : '';
    detail.cacheFileExists = input.file.cachePath ? UploadService.cacheFileSize(input.file.cachePath) > 0 : false;
    detail.uploadUri = UploadService.uriSample(uploadUri);
    detail.uploadUriScheme = UploadService.uriScheme(uploadUri);
    detail.uploadUriSample = UploadService.uriSample(uploadUri);
    detail.productModel = input.productModel ?? '';
    detail.productIdTail = UploadService.tail(input.productId, 6);
    detail.categoryLabel = input.category;
    detail.documentType = input.documentType;
    detail.hasToken = token.length > 0;
    detail.requestStatusCode = statusCode;
    detail.responseBody = UploadService.sanitizeText(stateText);
    detail.uploadTaskCode = statusCode;
    detail.uploadTaskMessage = UploadService.sanitizeText(stateText);
    detail.osError = UploadService.osErrorOf(rawError, stateText);
    detail.rawError = UploadService.sanitizeText(rawError);
    detail.rawErrorMessage = detail.rawError;
    detail.timestamp = new Date().toISOString();
    return detail;
  }

  private static errorFromDetail(detail: UploadFailedDetail): Error {
    return new Error(UploadService.DETAIL_PREFIX + JSON.stringify(detail));
  }

  private static copyDetail(raw: UploadFailedDetail): UploadFailedDetail {
    const detail = new UploadFailedDetail();
    detail.source = raw.source ?? '';
    detail.action = raw.action ?? '';
    detail.step = raw.step ?? '';
    detail.url = raw.url ?? '';
    detail.requestPath = raw.requestPath ?? '';
    detail.method = raw.method ?? '';
    detail.fileName = raw.fileName ?? '';
    detail.fileExt = raw.fileExt ?? '';
    detail.fileSize = raw.fileSize ?? 0;
    detail.mimeType = raw.mimeType ?? '';
    detail.cachePath = raw.cachePath ?? '';
    detail.cacheFileExists = raw.cacheFileExists ?? false;
    detail.uploadUri = raw.uploadUri ?? '';
    detail.uploadUriScheme = raw.uploadUriScheme ?? '';
    detail.uploadUriSample = raw.uploadUriSample ?? '';
    detail.productModel = raw.productModel ?? '';
    detail.productIdTail = raw.productIdTail ?? '';
    detail.categoryLabel = raw.categoryLabel ?? '';
    detail.documentType = raw.documentType ?? '';
    detail.hasToken = raw.hasToken ?? false;
    detail.requestStatusCode = raw.requestStatusCode ?? 0;
    detail.responseBody = raw.responseBody ?? '';
    detail.uploadTaskCode = raw.uploadTaskCode ?? 0;
    detail.uploadTaskMessage = raw.uploadTaskMessage ?? '';
    detail.osError = raw.osError ?? '';
    detail.rawError = raw.rawError ?? '';
    detail.rawErrorMessage = raw.rawErrorMessage ?? raw.rawError ?? '';
    detail.timestamp = raw.timestamp ?? '';
    detail.fallbackEnabled = raw.fallbackEnabled ?? false;
    detail.fallbackReason = raw.fallbackReason ?? '';
    detail.uploadFileError = raw.uploadFileError ?? '';
    detail.fallbackError = raw.fallbackError ?? '';
    return detail;
  }

  private static shouldRetryWithFallback(detail: UploadFailedDetail): boolean {
    const text = `${detail.uploadTaskCode} ${detail.uploadTaskMessage} ${detail.osError} ${detail.rawError}`;
    return detail.uploadTaskCode === 17 || /(^|\D)17(\D|$)|Http protocol error/i.test(text);
  }

  private static canRetryWithMultipart(input: UploadDocumentInput, detail: UploadFailedDetail): boolean {
    return UploadService.shouldRetryWithFallback(detail) &&
      input.file.size > 0 &&
      input.file.size <= UploadService.MULTIPART_FALLBACK_MAX_BYTES &&
      Boolean(input.file.cachePath) &&
      (input.file.mimeType === 'application/pdf' || input.file.mimeType.startsWith('image/'));
  }

  private static uriScheme(value: string): string {
    const index = value.indexOf(':');
    if (index <= 0) return 'path';
    return value.substring(0, index);
  }

  private static osErrorOf(rawError: string, stateText: string): string {
    const text = `${rawError}\n${stateText}`;
    const match = text.match(/(Http protocol error|code\s*[:=]\s*17|errno\s*[:=]\s*[^,\s]+)/i);
    return match ? match[0] : '';
  }

  private static cacheFileSize(cachePath: string): number {
    try {
      return fs.statSync(cachePath).size;
    } catch {
      return 0;
    }
  }

  private static fileExt(fileName: string): string {
    const index = fileName.lastIndexOf('.');
    return index >= 0 ? fileName.substring(index).toLowerCase() : '';
  }

  private static tail(value: string, length: number): string {
    return value.length <= length ? value : value.substring(value.length - length);
  }

  private static uriSample(value: string): string {
    const scheme = UploadService.uriScheme(value);
    const lastSlash = value.lastIndexOf('/');
    const fileName = lastSlash >= 0 ? value.substring(lastSlash + 1) : '';
    return fileName.length > 0 ? `${scheme}://.../${fileName}` : `${scheme}://...`;
  }

  private static sanitizeText(value: string): string {
    return value
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer ***')
      .replace(/file:\/\/[^\s"',}]+/g, 'file://...')
      .replace(/internal:\/\/[^\s"',}]+/g, 'internal://...')
      .replace(/"accessToken"\s*:\s*"[^"]+"/g, '"accessToken":"***"')
      .replace(/accessToken=[^&\s"',}]+/g, 'accessToken=***');
  }

  private static safeErrorForLog(detail: UploadFailedDetail): string {
    return UploadService.sanitizeText(`${detail.step} ${detail.uploadTaskCode} ${detail.uploadTaskMessage} ${detail.osError} ${detail.rawErrorMessage}`);
  }

  private static safeMultipartName(value: string): string {
    return value.replace(/[^A-Za-z0-9_-]/g, '');
  }

  private static safeMultipartFileName(value: string): string {
    return value.replace(/[\\/"<>|:*?\r\n]/g, '_').slice(0, 180) || 'document';
  }

  private static appendText(target: number[], value: string): void {
    const bytes = UploadService.utf8Bytes(value);
    bytes.forEach((byte: number) => target.push(byte));
  }

  private static utf8Bytes(value: string): number[] {
    const result: number[] = [];
    for (let index = 0; index < value.length; index += 1) {
      let code = value.charCodeAt(index);
      if (code >= 0xD800 && code <= 0xDBFF && index + 1 < value.length) {
        const next = value.charCodeAt(index + 1);
        if (next >= 0xDC00 && next <= 0xDFFF) {
          code = 0x10000 + ((code - 0xD800) << 10) + (next - 0xDC00);
          index += 1;
        }
      }
      if (code <= 0x7F) {
        result.push(code);
      } else if (code <= 0x7FF) {
        result.push(0xC0 | (code >> 6));
        result.push(0x80 | (code & 0x3F));
      } else if (code <= 0xFFFF) {
        result.push(0xE0 | (code >> 12));
        result.push(0x80 | ((code >> 6) & 0x3F));
        result.push(0x80 | (code & 0x3F));
      } else {
        result.push(0xF0 | (code >> 18));
        result.push(0x80 | ((code >> 12) & 0x3F));
        result.push(0x80 | ((code >> 6) & 0x3F));
        result.push(0x80 | (code & 0x3F));
      }
    }
    return result;
  }

  private static bytesToArrayBuffer(bytes: number[]): ArrayBuffer {
    const buffer = new ArrayBuffer(bytes.length);
    const view = new Uint8Array(buffer);
    for (let index = 0; index < bytes.length; index += 1) {
      view[index] = bytes[index];
    }
    return buffer;
  }

  private static responseToString(result: string | ArrayBuffer | object): string {
    if (typeof result === 'string') {
      return result;
    }
    if (result instanceof ArrayBuffer) {
      return '';
    }
    return JSON.stringify(result);
  }

  private static safeStringify(value: Object): string {
    try {
      return UploadService.sanitizeText(JSON.stringify(value));
    } catch {
      if (value instanceof Error) {
        return UploadService.sanitizeText(`${value.name}: ${value.message}`);
      }
      return UploadService.sanitizeText(`${value}`);
    }
  }
}
