import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getDatabaseSafetyStatus } from '../database/database-safety';
import { mockStore } from '../mock/production.mock';
import {
  backProcessPackages,
  confirmationRecords,
  customers,
  feedbackRecords,
  frontProcessParameters,
  productionPlans,
  products,
  queryLogs,
} from '../mock/seed-v0.3';
import type { AuditLog, FeedbackRecordMock, ProductDocument } from '../common/types/production.types';
import {
  mapAuditLogToPrisma,
  mapBackPackageSeedToPrisma,
  mapConfirmationRecordToPrisma,
  mapCustomerSeedToPrisma,
  mapFeedbackRecordToPrisma,
  mapFrontParameterSeedToPrisma,
  mapProductDocumentToPrisma,
  mapProductSeedToPrisma,
  mapProductionPlanSeedToPrisma,
} from './mappers';

export interface MigrationSummaryV07 {
  users: number;
  customers: number;
  products: number;
  productionPlans: number;
  documents: number;
  uploadedDocuments: number;
  frontParameters: number;
  backPackages: number;
  queryLogs: number;
  feedbackRecords: number;
  confirmationRecords: number;
  auditLogs: number;
}

export interface MigrationValidationResult {
  checkedAt: string;
  valid: boolean;
  summary: MigrationSummaryV07;
  environment: MigrationEnvironmentStatus;
  errors: string[];
  warnings: string[];
  safety: ReturnType<typeof getDatabaseSafetyStatus>;
}

export interface MigrationEnvironmentStatus {
  envLocalExists: boolean;
  dataSource: 'mock' | 'prisma';
  dbTarget: string;
  databaseConfigured: boolean;
  databaseUrlMasked: string;
  allowTestDbConnect: boolean;
  allowPrismaWrite: boolean;
  allowDestructiveDbActions: boolean;
  dryRun: boolean;
  message: string;
}

export interface PrismaSeedPreview {
  generatedAt: string;
  mode: 'dry-run';
  summary: MigrationSummaryV07;
  environment: MigrationEnvironmentStatus;
  errors: string[];
  warnings: string[];
  safety: ReturnType<typeof getDatabaseSafetyStatus>;
  seed: {
    users: Array<Record<string, unknown>>;
    customers: Array<Record<string, unknown>>;
    products: Array<Record<string, unknown>>;
    productionPlans: Array<Record<string, unknown>>;
    documents: Array<Record<string, unknown>>;
    frontParameters: Array<Record<string, unknown>>;
    backPackages: Array<Record<string, unknown>>;
    queryLogs: Array<Record<string, unknown>>;
    feedbackRecords: Array<Record<string, unknown>>;
    confirmationRecords: Array<Record<string, unknown>>;
    auditLogs: Array<Record<string, unknown>>;
  };
}

const storageMetadataDir = resolve(__dirname, '../../storage/metadata');
const documentsFile = join(storageMetadataDir, 'documents.json');
const auditLogsFile = join(storageMetadataDir, 'audit-logs.json');
const seedPreviewFile = join(storageMetadataDir, 'prisma-seed-preview.json');

function readMetadataArray<T>(filePath: string): T[] {
  if (!existsSync(filePath)) return [];
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as T[];
  } catch {
    return [];
  }
}

function uniqueById<T>(items: T[], getId: (item: T) => string | undefined) {
  const rows = new Map<string, T>();
  for (const item of items) {
    const id = getId(item);
    if (!id) continue;
    rows.set(id, item);
  }
  return Array.from(rows.values());
}

function collectDocuments() {
  const localUploadedDocuments = readMetadataArray<ProductDocument>(documentsFile);
  return uniqueById(
    [
      ...mockStore.productionPlans.flatMap((plan) => plan.documents),
      ...localUploadedDocuments,
    ],
    (document) => document.documentId ?? document.id,
  );
}

function collectFeedbackRecords() {
  return uniqueById<FeedbackRecordMock>(
    [...feedbackRecords, ...mockStore.feedbackRecords],
    (record) => record.id,
  );
}

function collectConfirmationRecords() {
  return uniqueById(
    [...confirmationRecords, ...mockStore.confirmationRecords],
    (record) => record.id,
  );
}

function collectAuditLogs() {
  return readMetadataArray<AuditLog>(auditLogsFile);
}

function buildSummary(documents: ProductDocument[], auditLogs: AuditLog[], collectedFeedback: FeedbackRecordMock[]) {
  return {
    users: 1,
    customers: customers.length,
    products: products.length,
    productionPlans: productionPlans.length,
    documents: documents.length,
    uploadedDocuments: documents.filter((document) => document.source === 'manual_upload').length,
    frontParameters: frontProcessParameters.length,
    backPackages: backProcessPackages.length,
    queryLogs: queryLogs.length,
    feedbackRecords: collectedFeedback.length,
    confirmationRecords: collectConfirmationRecords().length,
    auditLogs: auditLogs.length,
  };
}

function buildEnvironmentStatus(safety: ReturnType<typeof getDatabaseSafetyStatus>): MigrationEnvironmentStatus {
  return {
    envLocalExists: safety.envLocalExists,
    dataSource: safety.dataSource,
    dbTarget: safety.dbTarget,
    databaseConfigured: safety.databaseConfigured,
    databaseUrlMasked: safety.databaseUrlMasked,
    allowTestDbConnect: safety.allowTestDbConnect,
    allowPrismaWrite: safety.allowPrismaWrite,
    allowDestructiveDbActions: safety.allowDestructiveDbActions,
    dryRun: true,
    message: '当前为 dry-run：不会连接数据库或不会写入数据库。',
  };
}

export function validateMigrationData(): MigrationValidationResult {
  const documents = collectDocuments();
  const auditLogs = collectAuditLogs();
  const collectedFeedback = collectFeedbackRecords();
  const collectedConfirmations = collectConfirmationRecords();
  const productIds = new Set(products.map((product) => product.id));
  const customerIds = new Set(customers.map((customer) => customer.id));
  const planIds = new Set(productionPlans.map((plan) => plan.id));
  const errors: string[] = [];
  const warnings = [
    '当前仅执行 dry-run 校验，不连接 PostgreSQL，不执行 migrate/db push/seed。',
    '本地上传资料只迁移 metadata 草案，文件本体仍保留在 apps/api/storage/uploads。',
    '企业微信微盘、语音识别、对象存储仍未接入。',
  ];

  for (const product of products) {
    if (!customerIds.has(product.customerId)) errors.push(`产品 ${product.id} 的客户不存在：${product.customerId}`);
  }
  for (const plan of productionPlans) {
    if (!productIds.has(plan.productId)) errors.push(`生产计划 ${plan.id} 的产品不存在：${plan.productId}`);
  }
  for (const parameter of frontProcessParameters) {
    if (!productIds.has(parameter.productId)) errors.push(`前段参数 ${parameter.id} 的产品不存在：${parameter.productId}`);
  }
  for (const backPackage of backProcessPackages) {
    if (!productIds.has(backPackage.productId)) errors.push(`后段资料 ${backPackage.id} 的产品不存在：${backPackage.productId}`);
  }
  for (const document of documents) {
    if (!document.productId) errors.push(`资料 ${document.documentId ?? document.id} 缺少 productId`);
    if (document.productId && !productIds.has(document.productId)) errors.push(`资料 ${document.documentId ?? document.id} 的产品不存在：${document.productId}`);
    if (document.planId && !planIds.has(document.planId)) warnings.push(`资料 ${document.documentId ?? document.id} 绑定的计划不存在或已不在 seed 中：${document.planId}`);
  }
  for (const record of collectedFeedback) {
    if (!planIds.has(record.planId)) errors.push(`异常反馈 ${record.id} 的计划不存在：${record.planId}`);
  }
  for (const record of collectedConfirmations) {
    if (!planIds.has(record.planId)) errors.push(`确认记录 ${record.id} 的计划不存在：${record.planId}`);
  }

  const safety = getDatabaseSafetyStatus();
  return {
    checkedAt: new Date().toISOString(),
    valid: errors.length === 0,
    summary: buildSummary(documents, auditLogs, collectedFeedback),
    environment: buildEnvironmentStatus(safety),
    errors,
    warnings: [...warnings, ...safety.warnings],
    safety,
  };
}

export function buildPrismaSeedPreview(): PrismaSeedPreview {
  const validation = validateMigrationData();
  const documents = collectDocuments();
  const auditLogs = collectAuditLogs();
  const collectedFeedback = collectFeedbackRecords();
  const collectedConfirmations = collectConfirmationRecords();

  return {
    generatedAt: new Date().toISOString(),
    mode: 'dry-run',
    summary: validation.summary,
    environment: validation.environment,
    errors: validation.errors,
    warnings: validation.warnings,
    safety: validation.safety,
    seed: {
      users: [
        {
          id: 'demo-leader',
          username: 'demo-leader',
          displayName: '组长演示账号',
          role: 'FRONT_LEADER',
          teamName: 'A 班',
          isActive: true,
        },
      ],
      customers: customers.map(mapCustomerSeedToPrisma),
      products: products.map(mapProductSeedToPrisma),
      productionPlans: productionPlans.map(mapProductionPlanSeedToPrisma),
      documents: documents.map(mapProductDocumentToPrisma),
      frontParameters: frontProcessParameters.map(mapFrontParameterSeedToPrisma),
      backPackages: backProcessPackages.map(mapBackPackageSeedToPrisma),
      queryLogs: queryLogs.map((log) => ({
        id: log.id,
        productionPlanId: log.planId,
        userId: 'demo-leader',
        keyword: log.keyword,
        querySource: log.querySource,
        createdAt: new Date(log.createdAt),
      })),
      feedbackRecords: collectedFeedback.map(mapFeedbackRecordToPrisma),
      confirmationRecords: collectedConfirmations.map(mapConfirmationRecordToPrisma),
      auditLogs: auditLogs.map(mapAuditLogToPrisma),
    },
  };
}

export function writeSeedPreviewFile() {
  mkdirSync(storageMetadataDir, { recursive: true });
  const preview = buildPrismaSeedPreview();
  writeFileSync(seedPreviewFile, JSON.stringify(preview, null, 2), 'utf8');
  return {
    file: seedPreviewFile,
    preview,
  };
}
