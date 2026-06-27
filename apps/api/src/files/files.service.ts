import { Injectable } from '@nestjs/common';
import { DocumentsService } from '../documents/documents.service';

@Injectable()
export class FilesService {
  constructor(private readonly documentsService: DocumentsService) {}

  getFile(documentId: string) {
    return this.documentsService.getDocumentFileStream(documentId, 'inline');
  }
}
