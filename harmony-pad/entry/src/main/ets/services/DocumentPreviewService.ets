import { DocumentPreviewPageItem, DocumentPreviewResponse } from '../models/DocumentModels';
import { ApiClient } from './ApiClient';

export class DocumentPreviewService {
  static async getPreview(documentId: string): Promise<DocumentPreviewResponse> {
    const response = await ApiClient.getJson<DocumentPreviewResponse>(`/documents/${encodeURIComponent(documentId)}/preview`);
    return {
      ...response,
      pages: response.pages.map((page: DocumentPreviewPageItem) => {
        const absoluteUrl = ApiClient.resolveAssetUrl(page.imageUrl);
        return {
          ...page,
          imageUrl: ApiClient.withAccessToken(absoluteUrl)
        };
      })
    };
  }
}
