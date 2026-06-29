import { DocumentPreviewPageItem, DocumentPreviewResponse } from '../models/DocumentModels';
import { ApiClient } from './ApiClient';

export class DocumentPreviewService {
  static async getPreview(documentId: string): Promise<DocumentPreviewResponse> {
    const response = await ApiClient.getJson<DocumentPreviewResponse>(`/documents/${encodeURIComponent(documentId)}/preview`);
    const pages = response.pages.map((page: DocumentPreviewPageItem): DocumentPreviewPageItem => {
      const absoluteUrl = ApiClient.resolveAssetUrl(page.imageUrl);
      return {
        pageNo: page.pageNo,
        imageUrl: ApiClient.withAccessToken(absoluteUrl),
        width: page.width,
        height: page.height
      };
    });

    return {
      documentId: response.documentId,
      title: response.title,
      fileType: response.fileType,
      pageCount: response.pageCount,
      previewStatus: response.previewStatus,
      pages: pages,
      errorMessage: response.errorMessage
    };
  }
}
