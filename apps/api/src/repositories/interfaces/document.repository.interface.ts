import type {
  CreateUploadedDocumentPayload,
  DocumentCompareResult,
  DocumentQuery,
  DocumentVersionGroup,
  DocumentVersionQuery,
  DocumentVersionsResponse,
  ProductDocument,
  SetEffectiveDocumentPayload,
  SetEffectiveDocumentResult,
  UpdateDocumentStatusPayload,
  UpdateDocumentVersionPayload,
} from '../../common/types/production.types';

type MaybePromise<T> = T | Promise<T>;

export interface DocumentRepositoryInterface {
  findDocuments(query?: DocumentQuery): MaybePromise<ProductDocument[]>;
  findDocumentById(id: string): MaybePromise<ProductDocument | undefined>;
  findDocumentsByProduct(productId: string): MaybePromise<ProductDocument[]>;
  findDocumentsByPlan(planId: string): MaybePromise<ProductDocument[]>;
  findRequiredDocuments(planId: string): MaybePromise<ProductDocument[]>;
  createDocument(payload: CreateUploadedDocumentPayload): MaybePromise<ProductDocument>;
  updateDocumentStatus(id: string, payload: UpdateDocumentStatusPayload): MaybePromise<ProductDocument | undefined>;
  updateDocumentVersion(id: string, payload: UpdateDocumentVersionPayload): MaybePromise<ProductDocument | undefined>;
  archiveDocument(id: string): MaybePromise<ProductDocument | undefined>;
  findDocumentVersions(id: string): MaybePromise<DocumentVersionsResponse | undefined>;
  findProductDocumentVersions(query: DocumentVersionQuery): MaybePromise<DocumentVersionGroup[]>;
  setEffectiveDocument(id: string, payload: SetEffectiveDocumentPayload): MaybePromise<SetEffectiveDocumentResult | undefined>;
  compareDocuments(documentIds: string[]): MaybePromise<DocumentCompareResult>;
}
