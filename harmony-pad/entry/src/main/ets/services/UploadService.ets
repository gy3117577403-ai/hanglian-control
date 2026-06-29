import common from '@ohos.app.ability.common';
import request from '@ohos.request';
import {
  documentIdOf,
  ProductDocument,
  ProductDocumentCategoryGroup,
  ProductDocumentsResponse,
  UploadDocumentInput,
  UploadProgress
} from '../models/DocumentModels';
import { ApiClient } from './ApiClient';
import { TokenStorageService } from './TokenStorageService';
import { WorkbenchRefreshBus } from './WorkbenchRefreshBus';

export type UploadProgressHandler = (progress: UploadProgress) => void;

interface UploadHeaders {
  Authorization?: string;
}

export class UploadFailedDetail {
  step: string = '';
  url: string = '';
  method: string = '';
  fileName: string = '';
  fileSize: number = 0;
  mimeType: string = '';
  cachePath: string = '';
  uploadUri: string = '';
  uploadUriScheme: string = '';
  productModel: string = '';
  documentType: string = '';
  hasToken: boolean = false;
  requestStatusCode: number = 0;
  responseBody: string = '';
  uploadTaskCode: number = 0;
  uploadTaskMessage: string = '';
  osError: string = '';
  rawError: string = '';
  timestamp: string = '';
}

export class UploadService {
  private static readonly DETAIL_PREFIX: string = 'UPLOAD_DETAIL:';

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
      const canRetry = fallbackUri.length > 0 && fallbackUri !== input.file.uploadUri && UploadService.shouldRetryWithFallback(detail);
      console.error('[HanglianPad] upload failed detail ' + JSON.stringify(detail));

      if (!canRetry) {
        throw error instanceof Error ? error : UploadService.errorFromDetail(detail);
      }

      console.info('[HanglianPad] upload retry with fallback uri scheme ' + UploadService.uriScheme(fallbackUri));
      try {
        return await UploadService.uploadWithUri(context, input, fallbackUri, token, url, onProgress, 'request.uploadFile.fallback');
      } catch (fallbackError) {
        const fallbackDetail = UploadService.extractErrorDetail(fallbackError) ??
          UploadService.buildDetail(input, url, fallbackUri, token, 'request.uploadFile.fallback', undefined, fallbackError);
        console.error('[HanglianPad] upload failed detail ' + JSON.stringify(fallbackDetail));
        throw fallbackError instanceof Error ? fallbackError : UploadService.errorFromDetail(fallbackDetail);
      }
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
      { name: 'requiredForProcess', value: UploadService.asText(input.requiredForProcess) },
      { name: 'source', value: UploadService.asText(input.file.source) }
    ];
    if (input.planId) data.push({ name: 'planId', value: UploadService.asText(input.planId) });
    if (input.keywords) data.push({ name: 'keywords', value: UploadService.asText(input.keywords) });
    if (input.remark) data.push({ name: 'remark', value: UploadService.asText(input.remark) });
    if (input.file.captureSource) data.push({ name: 'captureSource', value: UploadService.asText(input.file.captureSource) });
    return data;
  }

  private static async resolveUploadResult(input: UploadDocumentInput, states: request.TaskState[]): Promise<string> {
    const stateText = UploadService.taskStateMessage(states);
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
    detail.step = step;
    detail.url = url;
    detail.method = 'POST';
    detail.fileName = input.file.name;
    detail.fileSize = input.file.size;
    detail.mimeType = input.file.mimeType;
    detail.cachePath = input.file.cachePath ?? '';
    detail.uploadUri = uploadUri;
    detail.uploadUriScheme = UploadService.uriScheme(uploadUri);
    detail.productModel = input.productModel ?? '';
    detail.documentType = input.documentType;
    detail.hasToken = token.length > 0;
    detail.requestStatusCode = statusCode;
    detail.responseBody = stateText;
    detail.uploadTaskCode = statusCode;
    detail.uploadTaskMessage = stateText;
    detail.osError = UploadService.osErrorOf(rawError, stateText);
    detail.rawError = rawError;
    detail.timestamp = new Date().toISOString();
    return detail;
  }

  private static errorFromDetail(detail: UploadFailedDetail): Error {
    return new Error(UploadService.DETAIL_PREFIX + JSON.stringify(detail));
  }

  private static copyDetail(raw: UploadFailedDetail): UploadFailedDetail {
    const detail = new UploadFailedDetail();
    detail.step = raw.step ?? '';
    detail.url = raw.url ?? '';
    detail.method = raw.method ?? '';
    detail.fileName = raw.fileName ?? '';
    detail.fileSize = raw.fileSize ?? 0;
    detail.mimeType = raw.mimeType ?? '';
    detail.cachePath = raw.cachePath ?? '';
    detail.uploadUri = raw.uploadUri ?? '';
    detail.uploadUriScheme = raw.uploadUriScheme ?? '';
    detail.productModel = raw.productModel ?? '';
    detail.documentType = raw.documentType ?? '';
    detail.hasToken = raw.hasToken ?? false;
    detail.requestStatusCode = raw.requestStatusCode ?? 0;
    detail.responseBody = raw.responseBody ?? '';
    detail.uploadTaskCode = raw.uploadTaskCode ?? 0;
    detail.uploadTaskMessage = raw.uploadTaskMessage ?? '';
    detail.osError = raw.osError ?? '';
    detail.rawError = raw.rawError ?? '';
    detail.timestamp = raw.timestamp ?? '';
    return detail;
  }

  private static shouldRetryWithFallback(detail: UploadFailedDetail): boolean {
    const text = `${detail.uploadTaskCode} ${detail.uploadTaskMessage} ${detail.osError} ${detail.rawError}`;
    return detail.uploadTaskCode === 17 || /(^|\D)17(\D|$)|Http protocol error/i.test(text);
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

  private static safeStringify(value: Object): string {
    try {
      return JSON.stringify(value);
    } catch {
      if (value instanceof Error) {
        return `${value.name}: ${value.message}`;
      }
      return `${value}`;
    }
  }
}
