import type { SystemQaCheckItem, SystemQaContext, SystemQaListReport } from '../system-qa.types';

function item(key: string, label: string, status: SystemQaCheckItem['status'], message: string, module: string): SystemQaCheckItem {
  return { key, label, status, message, module };
}

function score(items: SystemQaCheckItem[]) {
  const penalty = items.reduce((total, current) => total + (current.status === 'fail' ? 8 : current.status === 'warning' ? 2 : 0), 0);
  return Math.max(0, 100 - penalty);
}

function uniqueBy<T>(rows: T[], getKey: (row: T) => string) {
  const seen = new Set<string>();
  const repeated: string[] = [];
  for (const row of rows) {
    const key = getKey(row);
    if (!key) continue;
    if (seen.has(key)) repeated.push(key);
    seen.add(key);
  }
  return repeated;
}

export function buildDataConsistencyReport(ctx: SystemQaContext): SystemQaListReport {
  const productIds = new Set(ctx.products.map((product) => String(product.id ?? product.productId ?? '')));
  const customerIds = new Set(ctx.customers.map((customer) => String(customer.id ?? customer.customerId ?? '')));
  const planIds = new Set(ctx.plans.map((plan) => String(plan.id ?? '')));
  const planProductIds = new Set(ctx.plans.map((plan) => String(plan.productId ?? '')));
  const checks: SystemQaCheckItem[] = [];

  const plansMissingProduct = ctx.plans.filter((plan) => !plan.productId);
  checks.push(item(
    'plans-have-product',
    '生产计划关联产品',
    plansMissingProduct.length ? 'fail' : 'pass',
    plansMissingProduct.length ? `${plansMissingProduct.length} 条计划缺少 productId` : `已检查 ${ctx.plans.length} 条计划，均具备 productId`,
    'production',
  ));

  const productsMissingCustomer = ctx.products.filter((product) => !product.customerId || !customerIds.has(String(product.customerId)));
  checks.push(item(
    'products-have-customer',
    '产品关联客户',
    productsMissingCustomer.length ? 'warning' : 'pass',
    productsMissingCustomer.length ? `${productsMissingCustomer.length} 个产品缺少有效 customerId` : `已检查 ${ctx.products.length} 个产品，客户关系可追溯`,
    'production',
  ));

  checks.push(item(
    'front-parameters-linked',
    '前段参数关联产品',
    ctx.plans.every((plan) => plan.front && plan.productId) ? 'pass' : 'warning',
    '通过计划资料包检查前段参数与产品关联。',
    'documents',
  ));

  checks.push(item(
    'back-packages-linked',
    '后段资料包关联产品',
    ctx.plans.every((plan) => plan.back && plan.productId) ? 'pass' : 'warning',
    '通过计划资料包检查后段资料与产品关联。',
    'documents',
  ));

  const documentsWithoutProduct = ctx.documents.filter((document) => document.productId && !productIds.has(String(document.productId)) && !planProductIds.has(String(document.productId)));
  checks.push(item(
    'documents-linked',
    '文件资料关联产品',
    documentsWithoutProduct.length ? 'warning' : 'pass',
    documentsWithoutProduct.length ? `${documentsWithoutProduct.length} 条文件资料关联到未知产品` : `已检查 ${ctx.documents.length} 条文件资料，产品关系可追溯`,
    'documents',
  ));

  const manualUploadsMissingFile = ctx.documents.filter((document) => document.source === 'manual_upload' && !document.storedFileName);
  checks.push(item(
    'manual-upload-stored-file',
    '本地上传资料文件名',
    manualUploadsMissingFile.length ? 'warning' : 'pass',
    manualUploadsMissingFile.length ? `${manualUploadsMissingFile.length} 条本地上传资料缺少 storedFileName` : '本地上传资料均具备 storedFileName 或当前无本地上传资料',
    'documents',
  ));

  const fileHealthReady = ctx.documents.every((document) => document.documentStatus || document.status || document.source === 'mock');
  checks.push(item(
    'file-health-calculable',
    '文件健康状态可计算',
    fileHealthReady ? 'pass' : 'warning',
    fileHealthReady ? '文件资料具备状态字段，可用于健康统计。' : '部分文件资料缺少状态字段，健康统计需复核。',
    'documents',
  ));

  const knowledgeWithoutProduct = [...ctx.fixtures, ...ctx.abnormalCases, ...ctx.qualityStandards]
    .filter((row) => row.productId && !productIds.has(String(row.productId)) && !planProductIds.has(String(row.productId)));
  checks.push(item(
    'knowledge-linked-product',
    '知识库关联产品',
    knowledgeWithoutProduct.length ? 'warning' : 'pass',
    knowledgeWithoutProduct.length ? `${knowledgeWithoutProduct.length} 条知识库资料关联到未知产品` : '治具、异常、质量标准均可关联到产品或通用场景',
    'knowledge',
  ));

  const executionUnknownPlans = ctx.executionRecords.filter((record) => record.planId && !planIds.has(String(record.planId)));
  checks.push(item(
    'execution-linked-plan',
    '执行记录关联计划',
    executionUnknownPlans.length ? 'warning' : 'pass',
    executionUnknownPlans.length ? `${executionUnknownPlans.length} 条执行记录关联到未知计划` : `已检查 ${ctx.executionRecords.length} 条执行记录`,
    'execution',
  ));

  const quantityUnknownPlans = ctx.quantityReports.filter((record) => record.planId && !planIds.has(String(record.planId)));
  checks.push(item(
    'quantity-linked-plan',
    '数量报工关联计划',
    quantityUnknownPlans.length ? 'warning' : 'pass',
    quantityUnknownPlans.length ? `${quantityUnknownPlans.length} 条报工记录关联到未知计划` : `已检查 ${ctx.quantityReports.length} 条报工记录`,
    'execution',
  ));

  const auditWithoutOperator = ctx.auditLogs.filter((log) => !log.operatorId && !log.operatorName);
  checks.push(item(
    'audit-has-operator',
    '审计记录操作人',
    auditWithoutOperator.length ? 'warning' : 'pass',
    auditWithoutOperator.length ? `${auditWithoutOperator.length} 条审计记录缺少 operator` : `已检查 ${ctx.auditLogs.length} 条审计记录`,
    'audit',
  ));

  const maintenanceWithoutEntity = ctx.maintenanceRecords.filter((record) => !record.entityId);
  checks.push(item(
    'maintenance-has-entity',
    '维护记录实体 ID',
    maintenanceWithoutEntity.length ? 'warning' : 'pass',
    maintenanceWithoutEntity.length ? `${maintenanceWithoutEntity.length} 条维护记录缺少 entityId` : `已检查 ${ctx.maintenanceRecords.length} 条维护记录`,
    'maintenance',
  ));

  const importWithoutType = ctx.importRecords.filter((record) => !record.importType);
  checks.push(item(
    'import-has-type',
    '导入记录类型',
    importWithoutType.length ? 'warning' : 'pass',
    importWithoutType.length ? `${importWithoutType.length} 条导入记录缺少 importType` : `已检查 ${ctx.importRecords.length} 条导入记录`,
    'imports',
  ));

  const duplicateEffective = uniqueBy(
    ctx.documents.filter((document) => ['effective', '有效'].includes(String(document.documentStatus ?? document.status))),
    (document) => `${document.productId}-${document.documentType ?? document.type}-${document.requiredForProcess ?? 'all'}`,
  );
  checks.push(item(
    'duplicate-effective-documents',
    '重复有效文件预警',
    duplicateEffective.length ? 'warning' : 'pass',
    duplicateEffective.length ? `发现 ${duplicateEffective.length} 组可能重复 effective 资料，建议维护中心复核` : '未发现重复 effective 文件组',
    'documents',
  ));

  const expiredReferenced = ctx.documents.filter((document) => ['expired', '失效'].includes(String(document.documentStatus ?? document.status)) && document.planId);
  checks.push(item(
    'expired-document-referenced',
    '失效资料引用检查',
    expiredReferenced.length ? 'warning' : 'pass',
    expiredReferenced.length ? `${expiredReferenced.length} 条失效资料仍有关联计划，建议复核` : '未发现失效资料被当前计划显式引用',
    'documents',
  ));

  const highRiskAbnormal = ctx.abnormalCases.filter((row) => ['high', 'critical'].includes(String(row.severity ?? '').toLowerCase()));
  checks.push(item(
    'high-risk-abnormal-review',
    '高风险异常复核',
    highRiskAbnormal.length ? 'warning' : 'pass',
    highRiskAbnormal.length ? `存在 ${highRiskAbnormal.length} 条高风险异常，需保持复核可见` : '当前无高风险异常阻塞项',
    'knowledge',
  ));

  const pendingQuality = ctx.qualityStandards.filter((row) => ['pending_review', '待确认'].includes(String(row.status ?? row.qualityStatus ?? '')));
  checks.push(item(
    'pending-quality-review',
    '质量标准待确认复核',
    pendingQuality.length ? 'warning' : 'pass',
    pendingQuality.length ? `存在 ${pendingQuality.length} 条待确认质量标准，需进入复核队列` : '质量标准状态稳定',
    'knowledge',
  ));

  const errors = checks.filter((check) => check.status === 'fail');
  const warnings = checks.filter((check) => check.status === 'warning');
  return {
    valid: errors.length === 0,
    score: score(checks),
    errors,
    warnings,
    items: checks,
    generatedAt: ctx.generatedAt,
  };
}
