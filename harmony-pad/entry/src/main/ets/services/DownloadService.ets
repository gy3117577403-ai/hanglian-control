import common from '@ohos.app.ability.common';
import request from '@ohos.request';
import { UploadProgress } from '../models/DocumentModels';
import { ApiClient } from './ApiClient';
import { TokenStorageService } from './TokenStorageService';

export type DownloadProgressHandler = (progress: UploadProgress) => void;

interface DownloadHeaders {
  Authorization?: string;
}

export class DownloadService {
  static async downloadOriginal(
    context: common.UIAbilityContext,
    documentId: string,
    title: string,
    onProgress?: DownloadProgressHandler
  ): Promise<string> {
    const fileName = `${DownloadService.safeName(title || documentId)}-${Date.now()}`;
    const filePath = `${context.filesDir}/${fileName}`;
    const token = TokenStorageService.getCachedAccessToken();
    const header: DownloadHeaders = {};
    if (token) {
      header.Authorization = `Bearer ${token}`;
    }
    const config: request.DownloadConfig = {
      url: ApiClient.resolveApiUrl(`/documents/${encodeURIComponent(documentId)}/download`),
      filePath,
      header,
      enableMetered: true,
      enableRoaming: true
    };

    return new Promise<string>((resolve: (value: string) => void, reject: (reason: Error) => void) => {
      request.downloadFile(context, config).then((task: request.DownloadTask) => {
        task.on('progress', (receivedSize: number, totalSize: number) => {
          const percent = totalSize > 0 ? Math.floor(receivedSize * 100 / totalSize) : 0;
          if (onProgress) onProgress({ loaded: receivedSize, total: totalSize, percent });
        });
        task.on('complete', () => resolve(filePath));
        task.on('fail', (err: number) => {
          reject(new Error(`原文件下载失败：${err}`));
        });
      }).catch((error: Error) => reject(error));
    });
  }

  private static safeName(value: string): string {
    const cleaned = value.replace(/[\\/:*?"<>|\r\n]/g, '_').trim();
    return cleaned.length > 0 ? cleaned : 'document';
  }

  private static taskStateMessage(states: request.TaskState[]): string {
    if (!states || states.length === 0) return '';
    return states.map((state: request.TaskState) => {
      return `${state.responseCode ?? ''} ${state.message ?? ''}`;
    }).join('\n');
  }
}
