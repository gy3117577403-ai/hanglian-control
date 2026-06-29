export type DocumentCategory =
  'original_drawing' |
  'sop' |
  'finished_image' |
  'auxiliary_spec' |
  'notice' |
  'tooling';

export type DocumentType =
  'drawing_pdf' |
  'sop_image' |
  'connector_manual' |
  'pinout_diagram' |
  'finished_detail_image' |
  'process_card';

export type RequiredProcess = 'front' | 'back' | 'common';
export type UploadSource = 'manual_upload' | 'camera_capture';
export type PreviewStatus = 'pending' | 'ready' | 'failed';

export interface DocumentCategoryOption {
  category: DocumentCategory;
  label: string;
  documentType: DocumentType;
}

export const DOCUMENT_CATEGORY_OPTIONS: DocumentCategoryOption[] = [
  { category: 'original_drawing', label: '原图', documentType: 'drawing_pdf' },
  { category: 'sop', label: 'SOP 指导书', documentType: 'sop_image' },
  { category: 'finished_image', label: '成品图', documentType: 'finished_detail_image' },
  { category: 'auxiliary_spec', label: '辅料规格', documentType: 'connector_manual' },
  { category: 'notice', label: '注意事项', documentType: 'pinout_diagram' },
  { category: 'tooling', label: '配套工装', documentType: 'process_card' }
];

export interface CustomerOption {
  id: string;
  name: string;
  code?: string;
  productCount?: number;
}

export interface ProductOption {
  id: string;
  customerId: string;
  customerName?: string;
  productCode: string;
  productName: string;
  currentVersion?: string;
}

export interface SelectedUploadFile {
  uri: string;
  uploadUri: string;
  cachePath?: string;
  name: string;
  mimeType: string;
  size: number;
  source: UploadSource;
  captureSource?: 'environment_camera';
}

export interface UploadDocumentInput {
  productId: string;
  planId?: string;
  category: DocumentCategory;
  documentType: DocumentType;
  title: string;
  version: string;
  requiredForProcess: RequiredProcess;
  keywords?: string;
  remark?: string;
  file: SelectedUploadFile;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface ProductDocument {
  id?: string;
  documentId?: string;
  productId?: string;
  planId?: string;
  category?: DocumentCategory;
  categoryLabel?: string;
  documentType: DocumentType;
  title: string;
  version: string;
  mimeType?: string;
  fileSize?: number;
  previewType?: string;
  previewUrl?: string;
  downloadUrl?: string;
  source?: UploadSource | string;
  requiredForProcess?: RequiredProcess | string;
  uploadedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentPreviewPageItem {
  pageNo: number;
  imageUrl: string;
  width: number;
  height: number;
}

export interface DocumentPreviewResponse {
  documentId: string;
  title: string;
  fileType: string;
  pageCount: number;
  previewStatus: PreviewStatus;
  pages: DocumentPreviewPageItem[];
  errorMessage?: string;
}

export interface ProductDocumentCategoryGroup {
  category: DocumentCategory;
  label: string;
  documentType: DocumentType;
  documents: ProductDocument[];
}

export interface ProductDocumentsResponse {
  productId: string;
  productCode: string;
  productName: string;
  categories: ProductDocumentCategoryGroup[];
  documents: ProductDocument[];
}

export interface WorkbenchRefreshEvent {
  productId: string;
  category: DocumentCategory;
  documentId: string;
}

export function categoryOptionFor(value: DocumentCategory): DocumentCategoryOption {
  return DOCUMENT_CATEGORY_OPTIONS.find((item: DocumentCategoryOption) => item.category === value) ?? DOCUMENT_CATEGORY_OPTIONS[0];
}

export function documentIdOf(document: ProductDocument): string {
  return document.documentId ?? document.id ?? '';
}

export function safeDocumentTitle(fileName: string, category: DocumentCategory): string {
  const clean = fileName.replace(/\.[^.]+$/, '').trim();
  if (clean.length > 0) return clean;
  return categoryOptionFor(category).label;
}
