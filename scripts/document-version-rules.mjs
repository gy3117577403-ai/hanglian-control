export const singleEffectiveDrawingModuleKeys = new Set([
  'original_drawing',
  'sop',
  'accessory_specs',
  'notes',
  'tooling',
]);

export function supportsSingleEffectiveVersion(moduleKey) {
  return singleEffectiveDrawingModuleKeys.has(moduleKey);
}

export function documentTypeForDrawingModule(moduleKey) {
  return {
    original_drawing: 'drawing_pdf',
    sop: 'sop_image',
    finished_images: 'finished_detail_image',
    accessory_specs: 'process_card',
    notes: 'process_card',
    tooling: 'process_card',
  }[moduleKey];
}

export function drawingModuleForDocumentType(documentType) {
  return {
    drawing_pdf: 'original_drawing',
    sop_image: 'sop',
    connector_manual: 'sop',
    pinout_diagram: 'notes',
    finished_detail_image: 'finished_images',
    process_card: 'accessory_specs',
  }[documentType];
}

export function requiredProcessForDrawingModule(moduleKey) {
  return moduleKey === 'sop' || moduleKey === 'finished_images' ? 'back' : 'common';
}

export function isInactiveDocumentForEffectiveCheck(document) {
  return Boolean(
    document?.deleted === true
    || document?.deletedAt
    || document?.archived === true
    || document?.archivedAt
    || document?.trashedAt
    || document?.purgedAt
  );
}

export function documentEffectiveVersionGroupKey(document) {
  if (document?.versionGroupKey) return document.versionGroupKey;
  const productId = document?.productId;
  const moduleKey = document?.moduleKey ?? drawingModuleForDocumentType(document?.documentType);
  const documentType = document?.documentType ?? documentTypeForDrawingModule(moduleKey);
  const requiredForProcess = document?.requiredForProcess ?? requiredProcessForDrawingModule(moduleKey);
  return productId && documentType && requiredForProcess
    ? `${productId}::${documentType}::${requiredForProcess}`
    : undefined;
}

export function normalizeEffectiveVersionGroupKey(value) {
  return typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/g, ' ') : undefined;
}

export function documentEffectiveConflictKey(document) {
  const productId = document?.productId;
  const moduleKey = document?.moduleKey ?? drawingModuleForDocumentType(document?.documentType);
  const versionGroupKey = normalizeEffectiveVersionGroupKey(documentEffectiveVersionGroupKey({ ...document, moduleKey }));
  return productId && moduleKey && versionGroupKey
    ? `${productId}::${moduleKey}::${versionGroupKey}`
    : undefined;
}
