import type { DocumentTypeV03, RequiredProcess } from '../enums/production.enum';

export type DrawingVersionModuleKey =
  | 'original_drawing'
  | 'sop'
  | 'finished_images'
  | 'accessory_specs'
  | 'notes'
  | 'tooling';

export const singleEffectiveDrawingModuleKeys: readonly DrawingVersionModuleKey[] = [
  'original_drawing',
  'sop',
  'accessory_specs',
  'notes',
  'tooling',
] as const;

export function supportsSingleEffectiveVersion(moduleKey?: string | null) {
  return singleEffectiveDrawingModuleKeys.includes(moduleKey as DrawingVersionModuleKey);
}

export function documentTypeForDrawingModule(moduleKey: DrawingVersionModuleKey): DocumentTypeV03 {
  const map: Record<DrawingVersionModuleKey, DocumentTypeV03> = {
    original_drawing: 'drawing_pdf',
    sop: 'sop_image',
    finished_images: 'finished_detail_image',
    accessory_specs: 'process_card',
    notes: 'process_card',
    tooling: 'process_card',
  };
  return map[moduleKey];
}

export function drawingModuleForDocumentType(documentType?: string | null): DrawingVersionModuleKey | undefined {
  const map: Record<DocumentTypeV03, DrawingVersionModuleKey> = {
    drawing_pdf: 'original_drawing',
    sop_image: 'sop',
    connector_manual: 'sop',
    pinout_diagram: 'notes',
    finished_detail_image: 'finished_images',
    process_card: 'accessory_specs',
  };
  return documentType ? map[documentType as DocumentTypeV03] : undefined;
}

export function requiredProcessForDrawingModule(moduleKey: DrawingVersionModuleKey): RequiredProcess {
  return moduleKey === 'sop' || moduleKey === 'finished_images' ? 'back' : 'common';
}

export function supportsSingleEffectiveDocumentType(documentType?: string | null) {
  const moduleKey = drawingModuleForDocumentType(documentType);
  return supportsSingleEffectiveVersion(moduleKey);
}

