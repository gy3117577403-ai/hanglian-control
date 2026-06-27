import type { DocumentTypeV03 } from '../common/enums/production.enum';
import type { ProductDocument } from '../common/types/production.types';

export type DocumentCategory =
  | 'original_drawing'
  | 'sop'
  | 'finished_image'
  | 'auxiliary_spec'
  | 'notice'
  | 'tooling';

export const DOCUMENT_CATEGORIES: Array<{
  category: DocumentCategory;
  label: string;
  documentType: DocumentTypeV03;
}> = [
  { category: 'original_drawing', label: '原图', documentType: 'drawing_pdf' },
  { category: 'sop', label: 'SOP 指导书', documentType: 'sop_image' },
  {
    category: 'finished_image',
    label: '成品图',
    documentType: 'finished_detail_image',
  },
  {
    category: 'auxiliary_spec',
    label: '辅料规格',
    documentType: 'connector_manual',
  },
  { category: 'notice', label: '注意事项', documentType: 'pinout_diagram' },
  { category: 'tooling', label: '配套工装', documentType: 'process_card' },
];

export const DOCUMENT_CATEGORY_VALUES = DOCUMENT_CATEGORIES.map(
  (item) => item.category,
);

const CATEGORY_BY_DOCUMENT_TYPE = new Map<
  DocumentTypeV03,
  (typeof DOCUMENT_CATEGORIES)[number]
>(DOCUMENT_CATEGORIES.map((item) => [item.documentType, item]));

const DOCUMENT_TYPE_BY_CATEGORY = new Map<DocumentCategory, DocumentTypeV03>(
  DOCUMENT_CATEGORIES.map((item) => [item.category, item.documentType]),
);

export function documentTypeForCategory(category?: DocumentCategory) {
  return category ? DOCUMENT_TYPE_BY_CATEGORY.get(category) : undefined;
}

export function categoryForDocumentType(documentType: DocumentTypeV03) {
  return CATEGORY_BY_DOCUMENT_TYPE.get(documentType) ?? DOCUMENT_CATEGORIES[5];
}

export function withDocumentCategory<T extends ProductDocument>(document: T) {
  const category = categoryForDocumentType(document.documentType);
  return {
    ...document,
    category: category.category,
    categoryLabel: category.label,
  };
}

export function groupDocumentsForArkTS(documents: ProductDocument[]) {
  const decorated = documents.map(withDocumentCategory);
  return DOCUMENT_CATEGORIES.map((category) => ({
    category: category.category,
    label: category.label,
    documentType: category.documentType,
    documents: decorated.filter(
      (document) => document.category === category.category,
    ),
  }));
}
