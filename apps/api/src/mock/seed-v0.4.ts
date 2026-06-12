import {
  backProcessPackages,
  confirmationRecords,
  customers,
  feedbackRecords,
  frontProcessParameters,
  productDocuments,
  productionPlans,
  products,
  queryLogs,
} from './seed-v0.3';

const segmentMap = {
  前段: 'FRONT',
  后段: 'BACK',
  通用: 'COMMON',
} as const;

const planStatusMap = {
  待生产: 'PENDING',
  生产中: 'IN_PROGRESS',
  已完成: 'COMPLETED',
  异常: 'EXCEPTION',
} as const;

const confirmStatusMap = {
  未确认: 'UNCONFIRMED',
  已确认: 'CONFIRMED',
  需复核: 'NEED_REVIEW',
} as const;

const materialStatusMap = {
  有效: 'EFFECTIVE',
  待确认: 'PENDING_REVIEW',
  失效: 'EXPIRED',
} as const;

const documentTypeMap = {
  drawing_pdf: 'DRAWING_PDF',
  sop_image: 'SOP_IMAGE',
  connector_manual: 'CONNECTOR_MANUAL',
  pinout_diagram: 'PINOUT_DIAGRAM',
  finished_detail_image: 'FINISHED_DETAIL_IMAGE',
  process_card: 'PROCESS_CARD',
} as const;

const documentStatusMap = {
  effective: 'EFFECTIVE',
  pending_review: 'PENDING_REVIEW',
  expired: 'EXPIRED',
  missing: 'MISSING',
  inconsistent: 'INCONSISTENT',
} as const;

export const seedV04 = {
  customers: customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    code: customer.code,
    salesOwner: customer.salesOwner,
  })),
  products: products.map((product) => ({
    id: product.id,
    customerId: product.customerId,
    productCode: product.productCode,
    productName: product.productName,
    currentVersion: product.currentVersion,
    processSegment: segmentMap[product.processSegment],
  })),
  productionPlans: productionPlans.map((plan) => ({
    id: plan.id,
    planCode: plan.id,
    planDate: `${plan.date}T00:00:00.000Z`,
    weekPlanCode: plan.weekPlanNo,
    sales: plan.sales,
    productId: plan.productId,
    processSegment: segmentMap[plan.segment],
    plannedQuantity: plan.plannedQuantity,
    completedQuantity: plan.completedQuantity,
    status: planStatusMap[plan.status],
    owner: plan.owner,
    materialCompleteness: plan.materialCompleteness,
    confirmStatus: confirmStatusMap[plan.confirmationStatus],
  })),
  frontProcessParameters: frontProcessParameters.map((front) => ({
    id: front.id,
    productId: front.productId,
    wireLength: front.wireLength,
    strippingLength: front.strippingLength,
    terminalModel: front.terminalModel,
    pullForceStandard: front.pullForceStandard,
    crimpHeight: front.crimpHeight,
    drawingVersion: front.drawingVersion,
    status: materialStatusMap[front.parameterStatus],
  })),
  backProcessPackages: backProcessPackages.map((back) => ({
    id: back.id,
    productId: back.productId,
    connectorModel: back.connectorModel,
    assemblyManual: back.assemblyManual,
    pinMap: back.pinMap,
    sop: back.sop,
    imageCount: back.finishedImageCount,
    drawingVersion: back.drawingVersion,
    sopVersion: back.sopVersion,
    status: materialStatusMap[back.materialStatus],
  })),
  productDocuments: productDocuments.map((document) => ({
    id: document.documentId,
    productId: document.productId,
    productionPlanId: document.planId,
    documentType: documentTypeMap[document.documentType],
    title: document.title,
    version: document.version,
    status: documentStatusMap[document.status],
    source: document.source.toUpperCase(),
    requiredForProcess: segmentMap[document.requiredForProcess === 'front' ? '前段' : document.requiredForProcess === 'back' ? '后段' : '通用'],
    previewType: document.previewType,
    mockPreviewText: document.mockPreviewText,
    keywords: document.keywords,
    effectiveDate: `${document.effectiveDate}T00:00:00.000Z`,
    updatedAt: document.updatedAt,
  })),
  queryLogs,
  confirmationRecords,
  feedbackRecords,
};

export type SeedV04 = typeof seedV04;
