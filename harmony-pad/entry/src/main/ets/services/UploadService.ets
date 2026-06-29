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

export class UploadService {
  static async uploadDocument(
    context: common.UIAbilityContext,
    input: UploadDocumentInput,
    onProgress?: UploadProgressHandler
  ): Promise<string> {
    console.info('[HanglianPad] upload start', input.file.name, input.documentType);
    const token = TokenStorageService.getCachedAccessToken();
    const headers: UploadHeaders = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const data: request.RequestData[] = [
      { name: 'productId', value: input.productId },
      { name: 'documentType', value: input.documentType },
      { name: 'title', value: input.title },
      { name: 'version', value: input.version },
      { name: 'status', value: 'effective' },
      { name: 'requiredForProcess', value: input.requiredForProcess },
      { name: 'source', value: input.file.source }
    ];
    if (input.planId) data.push({ name: 'planId', value: input.planId });
    if (input.keywords) data.push({ name: 'keywords', value: input.keywords });
    if (input.remark) data.push({ name: 'remark', value: input.remark });
    if (input.file.captureSource) data.push({ name: 'captureSource', value: input.file.captureSource });

    const files: request.File[] = [
      {
        name: 'file',
        filename: input.file.name,
        uri: input.file.uploadUri,
        type: input.file.mimeType
      }
    ];

    const config: request.UploadConfig = {
      url: ApiClient.resolveApiUrl('/documents/upload'),
      header: headers,
      method: 'POST',
      files,
      data
    };

    return new Promise<string>((resolve: (value: string) => void, reject: (reason: Error) => void) => {
      request.uploadFile(context, config).then((task: request.UploadTask) => {
        task.on('progress', (uploadedSize: number, totalSize: number) => {
          const percent = totalSize > 0 ? Math.floor(uploadedSize * 100 / totalSize) : 0;
          if (onProgress) onProgress({ loaded: uploadedSize, total: totalSize, percent });
        });
        task.on('complete', (states: request.TaskState[]) => {
          void UploadService.resolveUploadResult(input, states).then((documentId: string) => {
            WorkbenchRefreshBus.emit({
              productId: input.productId,
              category: input.category,
              documentId
            });
            console.info('[HanglianPad] upload success', documentId);
            resolve(documentId);
          }).catch((error: Error) => reject(error));
        });
        task.on('fail', (states: request.TaskState[]) => {
          console.error('[HanglianPad] upload failed', UploadService.taskStateMessage(states));
          reject(new Error(UploadService.taskStateMessage(states) || '上传失败，请稍后重试。'));
        });
      }).catch((error: Error) => {
        console.error('[HanglianPad] upload failed', JSON.stringify(error));
        reject(error);
      });
    });
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
    throw new Error('上传已完成，但未能读取返回的 documentId。');
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
}
