import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { AuditService } from '../audit/audit.service';
import { shouldLoadDemoBusinessData } from '../config/mock-data-mode';
import { mockStore } from '../mock/production.mock';
import { fixtureSeed, abnormalCaseSeed, qualityStandardSeed } from './mock/knowledge-seed';
import { clone, hashId, includesKeyword, limitRows, normalizeProcessSegment, normalizeStringArray, processSegmentLabel } from './helpers/knowledge-normalizer';
import { assertNonEmpty, assertStatus } from './helpers/knowledge-validator';
import type { AbnormalQueryDto } from './dto/abnormal-query.dto';
import type { FixtureQueryDto } from './dto/fixture-query.dto';
import type { KnowledgeLinkQueryDto } from './dto/knowledge-link-query.dto';
import type { KnowledgeSearchDto } from './dto/knowledge-search.dto';
import type { KnowledgeBulkUpdateDto } from './dto/knowledge-bulk-update.dto';
import type { QualityQueryDto } from './dto/quality-query.dto';
import type { UpdateAbnormalDto } from './dto/update-abnormal.dto';
import type { UpdateFixtureDto } from './dto/update-fixture.dto';
import type { UpdateQualityDto } from './dto/update-quality.dto';
import type {
  AbnormalCaseKnowledge,
  AbnormalStatus,
  FixtureKnowledge,
  KnowledgeOperator,
  KnowledgeProcessSegment,
  KnowledgeRecord,
  KnowledgeRecordEntityType,
  KnowledgeRecommendation,
  KnowledgeSearchResult,
  KnowledgeValidationCheckItem,
  KnowledgeValidationResult,
  KnowledgeStatus,
  QualityStandardKnowledge,
  QualityStatus,
} from './knowledge.types';

const fixtureStatuses = ['active', 'pending_review', 'inactive', 'abnormal'] as const;
const abnormalStatuses = ['active', 'pending_review', 'closed'] as const;
const qualityStatuses = ['effective', 'pending_review', 'expired'] as const;

function knowledgeStorageFile(fileName: string) {
  return join(resolve(process.cwd(), 'storage', 'metadata'), fileName);
}

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T;
  } catch {
    return clone(fallback);
  }
}

function writeJson<T>(file: string, value: T) {
  mkdirSync(resolve(process.cwd(), 'storage', 'metadata'), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}

function operatorFrom(value?: KnowledgeOperator) {
  return {
    operatorId: value?.userId ?? value?.operatorId ?? 'mock-knowledge-maintainer',
    operatorName: value?.name ?? value?.operatorName ?? '资料维护演示账号',
    operatorRole: value?.roleLabel ?? value?.operatorRole ?? '资料维护',
  };
}

function productFromPlanOrProduct(productId?: string, planId?: string) {
  const plan = planId ? mockStore.findPlanById(planId) : undefined;
  const product = productId
    ? mockStore.products.find((item) => item.id === productId)
    : plan
      ? mockStore.products.find((item) => item.id === plan.productId)
      : undefined;
  const customer = product ? mockStore.customers.find((item) => item.id === product.customerId) : undefined;
  return { plan, product, customer };
}

function productFromIdOrCode(productId?: string, productCode?: string) {
  const product = mockStore.products.find((item) => item.id === productId)
    ?? mockStore.products.find((item) => item.productCode === productCode);
  const customer = product ? mockStore.customers.find((item) => item.id === product.customerId) : undefined;
  return { product, customer };
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    active: '启用',
    pending_review: '待复核',
    inactive: '停用',
    abnormal: '异常',
    closed: '已关闭',
    effective: '有效',
    expired: '失效',
  };
  return labels[status] ?? status;
}

function processSegmentFromPlan(segment: string): KnowledgeProcessSegment {
  if (segment === 'front' || segment.includes('前')) return 'front';
  if (segment === 'back' || segment.includes('后')) return 'back';
  return 'common';
}

function countByStatus(rows: Array<{ status: string }>) {
  return rows.reduce<Record<string, number>>((summary, row) => {
    summary[row.status] = (summary[row.status] ?? 0) + 1;
    return summary;
  }, {});
}

@Injectable()
export class KnowledgeService {
  private readonly fixturesFile = knowledgeStorageFile('knowledge-fixtures.json');
  private readonly abnormalFile = knowledgeStorageFile('knowledge-abnormal-cases.json');
  private readonly qualityFile = knowledgeStorageFile('knowledge-quality-standards.json');
  private readonly recordsFile = knowledgeStorageFile('knowledge-records.json');

  constructor(private readonly auditService: AuditService) {}

  fixtures(query: FixtureQueryDto = {}) {
    return limitRows(
      this.readFixtures()
        .filter((item) => !query.customerId || item.customerId === query.customerId)
        .filter((item) => !query.productId || item.productId === query.productId)
        .filter((item) => !query.processSegment || item.processSegment === query.processSegment || item.processSegment === 'common')
        .filter((item) => !query.status || item.status === query.status)
        .filter((item) => includesKeyword([
          item.fixtureCode,
          item.fixtureName,
          item.fixtureType,
          item.customerName,
          item.productCode,
          item.productName,
          item.applicableStation,
          item.usageMethod,
          item.checkStandard,
          item.keywords,
          item.remark,
        ], query.keyword)),
      query.limit,
    );
  }

  createFixture(dto: UpdateFixtureDto, user?: KnowledgeOperator) {
    assertNonEmpty(dto.fixtureCode, '治具编号');
    assertNonEmpty(dto.fixtureName, '治具名称');
    const now = new Date().toISOString();
    const { product, customer } = productFromPlanOrProduct(dto.productId);
    const fixture: FixtureKnowledge = {
      fixtureId: `FIX-${hashId(`${dto.fixtureCode}:${now}`)}`,
      fixtureCode: dto.fixtureCode!,
      fixtureName: dto.fixtureName!,
      fixtureType: dto.fixtureType ?? '现场治具',
      customerId: dto.customerId ?? customer?.id ?? 'CUS-DEMO',
      customerName: dto.customerName ?? customer?.name ?? '演示客户',
      productId: dto.productId ?? product?.id ?? 'PRD-DEMO',
      productCode: dto.productCode ?? product?.productCode ?? 'HL-DEMO',
      productName: dto.productName ?? product?.productName ?? '演示线束产品',
      processSegment: normalizeProcessSegment(dto.processSegment),
      applicableStation: dto.applicableStation ?? '演示工位',
      usageMethod: dto.usageMethod ?? '按现场作业指导书使用。',
      checkStandard: dto.checkStandard ?? '点检合格后允许流转。',
      maintenanceCycle: dto.maintenanceCycle ?? '每班点检',
      lastMaintenanceDate: dto.lastMaintenanceDate ?? now.slice(0, 10),
      nextMaintenanceDate: dto.nextMaintenanceDate ?? now.slice(0, 10),
      status: dto.status ?? 'pending_review',
      images: [],
      relatedDocumentIds: normalizeStringArray(dto.relatedDocumentIds),
      keywords: normalizeStringArray(dto.keywords),
      remark: dto.remark,
      createdAt: now,
      updatedAt: now,
    };
    const rows = this.readFixtures();
    rows.unshift(fixture);
    this.writeFixtures(rows);
    this.record('fixture', fixture.fixtureId, 'fixture_created', undefined, fixture, dto.remark, user);
    return fixture;
  }

  updateFixture(id: string, dto: UpdateFixtureDto, user?: KnowledgeOperator) {
    assertStatus(dto.status, fixtureStatuses, '治具状态');
    const rows = this.readFixtures();
    const index = rows.findIndex((item) => item.fixtureId === id);
    if (index < 0) throw new NotFoundException('未找到治具资料。');
    const before = clone(rows[index]);
    rows[index] = {
      ...rows[index],
      ...dto,
      processSegment: dto.processSegment ? normalizeProcessSegment(dto.processSegment) : rows[index].processSegment,
      relatedDocumentIds: dto.relatedDocumentIds ? normalizeStringArray(dto.relatedDocumentIds) : rows[index].relatedDocumentIds,
      keywords: dto.keywords ? normalizeStringArray(dto.keywords) : rows[index].keywords,
      updatedAt: new Date().toISOString(),
    };
    this.writeFixtures(rows);
    this.record('fixture', id, 'fixture_updated', before, rows[index], dto.remark, user);
    return rows[index];
  }

  updateFixtureStatus(id: string, status: KnowledgeStatus, reason?: string, user?: KnowledgeOperator) {
    assertStatus(status, fixtureStatuses, '治具状态');
    return this.updateFixture(id, { status, remark: reason }, user);
  }

  abnormalCases(query: AbnormalQueryDto = {}) {
    return limitRows(
      this.readAbnormalCases()
        .filter((item) => !query.customerId || item.customerId === query.customerId)
        .filter((item) => !query.productId || item.productId === query.productId)
        .filter((item) => !query.processSegment || item.processSegment === query.processSegment || item.processSegment === 'common')
        .filter((item) => !query.status || item.status === query.status)
        .filter((item) => !query.severity || item.severity === query.severity)
        .filter((item) => includesKeyword([
          item.abnormalCode,
          item.title,
          item.customerName,
          item.productCode,
          item.productName,
          item.station,
          item.category,
          item.symptom,
          item.cause,
          item.solution,
          item.prevention,
          item.keywords,
          item.remark,
        ], query.keyword)),
      query.limit,
    );
  }

  createAbnormalCase(dto: UpdateAbnormalDto, user?: KnowledgeOperator) {
    assertNonEmpty(dto.abnormalCode, '异常编号');
    assertNonEmpty(dto.title, '异常标题');
    const now = new Date().toISOString();
    const { product, customer } = productFromPlanOrProduct(dto.productId);
    const item: AbnormalCaseKnowledge = {
      abnormalId: `ABN-${hashId(`${dto.abnormalCode}:${now}`)}`,
      abnormalCode: dto.abnormalCode!,
      title: dto.title!,
      customerId: dto.customerId ?? customer?.id ?? 'CUS-DEMO',
      customerName: dto.customerName ?? customer?.name ?? '演示客户',
      productId: dto.productId ?? product?.id ?? 'PRD-DEMO',
      productCode: dto.productCode ?? product?.productCode ?? 'HL-DEMO',
      productName: dto.productName ?? product?.productName ?? '演示线束产品',
      processSegment: normalizeProcessSegment(dto.processSegment),
      station: dto.station ?? '演示工位',
      category: dto.category ?? '现场异常',
      symptom: dto.symptom ?? '现场发现异常现象。',
      cause: dto.cause ?? '待复盘原因。',
      solution: dto.solution ?? '按异常处理流程隔离并复核。',
      prevention: dto.prevention ?? '后续纳入班前提醒。',
      severity: dto.severity ?? 'medium',
      status: dto.status ?? 'pending_review',
      relatedDocumentIds: normalizeStringArray(dto.relatedDocumentIds),
      relatedFixtureIds: normalizeStringArray(dto.relatedFixtureIds),
      keywords: normalizeStringArray(dto.keywords),
      remark: dto.remark,
      createdAt: now,
      updatedAt: now,
    };
    const rows = this.readAbnormalCases();
    rows.unshift(item);
    this.writeAbnormalCases(rows);
    this.record('abnormal_case', item.abnormalId, 'abnormal_case_created', undefined, item, dto.remark, user);
    return item;
  }

  updateAbnormalCase(id: string, dto: UpdateAbnormalDto, user?: KnowledgeOperator) {
    assertStatus(dto.status, abnormalStatuses, '异常状态');
    const rows = this.readAbnormalCases();
    const index = rows.findIndex((item) => item.abnormalId === id);
    if (index < 0) throw new NotFoundException('未找到异常案例。');
    const before = clone(rows[index]);
    rows[index] = {
      ...rows[index],
      ...dto,
      processSegment: dto.processSegment ? normalizeProcessSegment(dto.processSegment) : rows[index].processSegment,
      relatedDocumentIds: dto.relatedDocumentIds ? normalizeStringArray(dto.relatedDocumentIds) : rows[index].relatedDocumentIds,
      relatedFixtureIds: dto.relatedFixtureIds ? normalizeStringArray(dto.relatedFixtureIds) : rows[index].relatedFixtureIds,
      keywords: dto.keywords ? normalizeStringArray(dto.keywords) : rows[index].keywords,
      updatedAt: new Date().toISOString(),
    };
    this.writeAbnormalCases(rows);
    this.record('abnormal_case', id, 'abnormal_case_updated', before, rows[index], dto.remark, user);
    return rows[index];
  }

  updateAbnormalStatus(id: string, status: AbnormalStatus, reason?: string, user?: KnowledgeOperator) {
    assertStatus(status, abnormalStatuses, '异常状态');
    return this.updateAbnormalCase(id, { status, remark: reason }, user);
  }

  qualityStandards(query: QualityQueryDto = {}) {
    return limitRows(
      this.readQualityStandards()
        .filter((item) => !query.customerId || item.customerId === query.customerId)
        .filter((item) => !query.productId || item.productId === query.productId)
        .filter((item) => !query.processSegment || item.processSegment === query.processSegment || item.processSegment === 'common')
        .filter((item) => !query.status || item.status === query.status)
        .filter((item) => !query.defectLevel || item.defectLevel === query.defectLevel)
        .filter((item) => includesKeyword([
          item.qualityCode,
          item.title,
          item.customerName,
          item.productCode,
          item.productName,
          item.inspectionItem,
          item.standardValue,
          item.tolerance,
          item.inspectionMethod,
          item.samplingRule,
          item.keywords,
          item.remark,
        ], query.keyword)),
      query.limit,
    );
  }

  createQualityStandard(dto: UpdateQualityDto, user?: KnowledgeOperator) {
    assertNonEmpty(dto.qualityCode, '质量标准编号');
    assertNonEmpty(dto.title, '质量标准标题');
    const now = new Date().toISOString();
    const { product, customer } = productFromPlanOrProduct(dto.productId);
    const item: QualityStandardKnowledge = {
      qualityId: `QLT-${hashId(`${dto.qualityCode}:${now}`)}`,
      qualityCode: dto.qualityCode!,
      title: dto.title!,
      customerId: dto.customerId ?? customer?.id ?? 'CUS-DEMO',
      customerName: dto.customerName ?? customer?.name ?? '演示客户',
      productId: dto.productId ?? product?.id ?? 'PRD-DEMO',
      productCode: dto.productCode ?? product?.productCode ?? 'HL-DEMO',
      productName: dto.productName ?? product?.productName ?? '演示线束产品',
      processSegment: normalizeProcessSegment(dto.processSegment),
      inspectionItem: dto.inspectionItem ?? '现场检验项目',
      standardValue: dto.standardValue ?? '按图纸/SOP 执行',
      tolerance: dto.tolerance ?? '不允许超差',
      inspectionMethod: dto.inspectionMethod ?? '首件确认与过程抽检。',
      samplingRule: dto.samplingRule ?? '首件必检，过程抽检。',
      defectLevel: dto.defectLevel ?? 'major',
      status: dto.status ?? 'pending_review',
      relatedDocumentIds: normalizeStringArray(dto.relatedDocumentIds),
      keywords: normalizeStringArray(dto.keywords),
      remark: dto.remark,
      createdAt: now,
      updatedAt: now,
    };
    const rows = this.readQualityStandards();
    rows.unshift(item);
    this.writeQualityStandards(rows);
    this.record('quality_standard', item.qualityId, 'quality_standard_created', undefined, item, dto.remark, user);
    return item;
  }

  updateQualityStandard(id: string, dto: UpdateQualityDto, user?: KnowledgeOperator) {
    assertStatus(dto.status, qualityStatuses, '质量标准状态');
    const rows = this.readQualityStandards();
    const index = rows.findIndex((item) => item.qualityId === id);
    if (index < 0) throw new NotFoundException('未找到质量标准。');
    const before = clone(rows[index]);
    rows[index] = {
      ...rows[index],
      ...dto,
      processSegment: dto.processSegment ? normalizeProcessSegment(dto.processSegment) : rows[index].processSegment,
      relatedDocumentIds: dto.relatedDocumentIds ? normalizeStringArray(dto.relatedDocumentIds) : rows[index].relatedDocumentIds,
      keywords: dto.keywords ? normalizeStringArray(dto.keywords) : rows[index].keywords,
      updatedAt: new Date().toISOString(),
    };
    this.writeQualityStandards(rows);
    this.record('quality_standard', id, 'quality_standard_updated', before, rows[index], dto.remark, user);
    return rows[index];
  }

  updateQualityStatus(id: string, status: QualityStatus, reason?: string, user?: KnowledgeOperator) {
    assertStatus(status, qualityStatuses, '质量标准状态');
    return this.updateQualityStandard(id, { status, remark: reason }, user);
  }

  productSummary(productId: string, query: KnowledgeLinkQueryDto = {}) {
    const { product } = productFromPlanOrProduct(productId);
    const plan = mockStore.productionPlans.find((item) => item.productId === productId);
    if (!product && !plan) throw new NotFoundException('未找到产品。');
    const processSegment = query.processSegment;
    return {
      planId: plan?.id,
      productId,
      productCode: plan?.productCode ?? product?.productCode ?? productId,
      productName: plan?.productName ?? product?.productName ?? '',
      fixtures: this.fixtures({ productId, processSegment, limit: query.limit }),
      abnormalCases: this.abnormalCases({ productId, processSegment, limit: query.limit }),
      qualityStandards: this.qualityStandards({ productId, processSegment, limit: query.limit }),
      updatedAt: new Date().toISOString(),
    };
  }

  planSummary(planId: string, query: KnowledgeLinkQueryDto = {}) {
    const plan = mockStore.findPlanById(planId);
    if (!plan) throw new NotFoundException('未找到生产计划。');
    return {
      ...this.productSummary(plan.productId, query),
      planId,
    };
  }

  planValidation(planId: string): KnowledgeValidationResult {
    const plan = mockStore.findPlanById(planId);
    if (!plan) throw new NotFoundException(`Plan not found: ${planId}`);
    return this.buildValidation({
      planId,
      productId: plan.productId,
      productCode: plan.productCode,
      productName: plan.productName,
      processSegment: processSegmentFromPlan(String(plan.segment)),
    });
  }

  productValidation(productId: string, query: KnowledgeLinkQueryDto = {}): KnowledgeValidationResult {
    const plan = mockStore.productionPlans.find((item) => item.productId === productId);
    const product = mockStore.products.find((item) => item.id === productId);
    if (!plan && !product) throw new NotFoundException(`Product not found: ${productId}`);
    return this.buildValidation({
      planId: plan?.id,
      productId,
      productCode: plan?.productCode ?? product?.productCode ?? productId,
      productName: plan?.productName ?? product?.productName ?? '',
      processSegment: query.processSegment ?? (plan ? processSegmentFromPlan(String(plan.segment)) : 'common'),
    });
  }

  planRecommendations(planId: string) {
    const validation = this.planValidation(planId);
    const fixtures = this.scopedFixtures(validation.productId, validation.processSegment)
      .filter((item) => item.status !== 'inactive')
      .sort((a, b) => Number(b.status === 'active') - Number(a.status === 'active'));
    const abnormalCases = this.scopedAbnormalCases(validation.productId, validation.processSegment)
      .filter((item) => item.status !== 'closed')
      .sort((a, b) => this.severityRank(b.severity) - this.severityRank(a.severity));
    const qualityStandards = this.scopedQualityStandards(validation.productId, validation.processSegment)
      .sort((a, b) => Number(b.status === 'effective') - Number(a.status === 'effective'));

    return {
      planId,
      productId: validation.productId,
      validationStatus: validation.validationStatus,
      score: validation.score,
      summary: validation.summary,
      recommendations: validation.recommendations,
      fixtures: fixtures.slice(0, 6),
      abnormalCases: abnormalCases.slice(0, 6),
      qualityStandards: qualityStandards.filter((item) => item.status !== 'expired').slice(0, 6),
      riskAlerts: qualityStandards
        .filter((item) => item.status === 'expired')
        .map((item) => ({
          level: 'danger' as const,
          title: item.title,
          action: '质量标准已失效，请先在资料维护中心复核。',
          entityType: 'quality_standard' as const,
          entityId: item.qualityId,
        })),
      updatedAt: new Date().toISOString(),
    };
  }

  bulkUpdateFixtures(dto: KnowledgeBulkUpdateDto, user?: KnowledgeOperator) {
    const patch = this.safeBulkPatch(dto.patch, ['status', 'processSegment', 'productId', 'productCode', 'productName', 'customerId', 'customerName', 'applicableStation', 'maintenanceCycle', 'keywords', 'remark']);
    if (patch.status) assertStatus(String(patch.status), fixtureStatuses, 'Fixture status');
    const rows = this.readFixtures();
    const updated = this.bulkApply(rows, dto.ids, 'fixtureId', patch, 'fixture', dto.reason, user);
    this.writeFixtures(rows);
    return this.bulkResult(updated, rows);
  }

  bulkUpdateAbnormalCases(dto: KnowledgeBulkUpdateDto, user?: KnowledgeOperator) {
    const patch = this.safeBulkPatch(dto.patch, ['status', 'severity', 'processSegment', 'productId', 'productCode', 'productName', 'customerId', 'customerName', 'station', 'category', 'keywords', 'remark']);
    if (patch.status) assertStatus(String(patch.status), abnormalStatuses, 'Abnormal status');
    if (patch.severity && !['low', 'medium', 'high', 'critical'].includes(String(patch.severity))) throw new BadRequestException('Invalid abnormal severity.');
    const rows = this.readAbnormalCases();
    const updated = this.bulkApply(rows, dto.ids, 'abnormalId', patch, 'abnormal_case', dto.reason, user);
    this.writeAbnormalCases(rows);
    return this.bulkResult(updated, rows);
  }

  bulkUpdateQualityStandards(dto: KnowledgeBulkUpdateDto, user?: KnowledgeOperator) {
    const patch = this.safeBulkPatch(dto.patch, ['status', 'defectLevel', 'processSegment', 'productId', 'productCode', 'productName', 'customerId', 'customerName', 'inspectionMethod', 'samplingRule', 'keywords', 'remark']);
    if (patch.status) assertStatus(String(patch.status), qualityStatuses, 'Quality status');
    if (patch.defectLevel && !['minor', 'major', 'critical'].includes(String(patch.defectLevel))) throw new BadRequestException('Invalid quality defectLevel.');
    const rows = this.readQualityStandards();
    const updated = this.bulkApply(rows, dto.ids, 'qualityId', patch, 'quality_standard', dto.reason, user);
    this.writeQualityStandards(rows);
    return this.bulkResult(updated, rows);
  }

  reviewItems() {
    const rows: Array<Record<string, unknown>> = [];
    for (const plan of mockStore.productionPlans) {
      const validation = this.planValidation(plan.id);
      const base = {
        customer: plan.customer,
        product: plan.productCode,
        planId: plan.id,
        entityType: 'review_queue',
        createdAt: new Date().toISOString(),
      };
      for (const item of validation.checkItems.filter((check) => check.status !== 'pass')) {
        rows.push({
          ...base,
          id: `knowledge:${plan.id}:${item.key}`,
          type: item.status === 'fail' ? '知识库阻塞' : '知识库待复核',
          entityId: `${plan.id}:${item.key}`,
          message: `${item.label}：${item.message}`,
          recommendedAction: validation.recommendations.find((row) => row.level !== 'info')?.action ?? '在资料维护中心补齐现场知识库。',
          severity: item.status === 'fail' ? 'high' : 'medium',
          processSegment: validation.processSegment,
        });
      }
    }
    return rows.slice(0, 80);
  }

  search(query: KnowledgeSearchDto): KnowledgeSearchResult[] {
    const keyword = String(query.q ?? '').trim();
    if (!keyword) return [];
    const targetProductId = query.productId ?? (query.planId ? mockStore.findPlanById(query.planId)?.productId : undefined);
    const rows: KnowledgeSearchResult[] = [];

    for (const item of this.fixtures({ productId: targetProductId, keyword, limit: '500' })) {
      rows.push({
        id: item.fixtureId,
        planId: mockStore.productionPlans.find((plan) => plan.productId === item.productId)?.id,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        type: 'fixture',
        title: item.fixtureName,
        subtitle: `${item.productCode} / ${processSegmentLabel(item.processSegment)} / ${item.applicableStation}`,
        matchedField: '治具库',
        snippet: [item.fixtureCode, item.usageMethod, item.checkStandard, item.keywords.join(' ')].join(' / '),
        status: item.status,
      });
    }

    for (const item of this.abnormalCases({ productId: targetProductId, keyword, limit: '500' })) {
      rows.push({
        id: item.abnormalId,
        planId: mockStore.productionPlans.find((plan) => plan.productId === item.productId)?.id,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        type: 'abnormal_case',
        title: item.title,
        subtitle: `${item.productCode} / ${item.station} / ${statusLabel(item.severity)}`,
        matchedField: '异常库',
        snippet: [item.symptom, item.cause, item.solution, item.prevention].join(' / '),
        status: item.status,
      });
    }

    for (const item of this.qualityStandards({ productId: targetProductId, keyword, limit: '500' })) {
      rows.push({
        id: item.qualityId,
        planId: mockStore.productionPlans.find((plan) => plan.productId === item.productId)?.id,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        type: 'quality_standard',
        title: item.title,
        subtitle: `${item.productCode} / ${item.inspectionItem} / ${statusLabel(item.status)}`,
        matchedField: '质量标准库',
        snippet: [item.standardValue, item.tolerance, item.inspectionMethod, item.samplingRule].join(' / '),
        status: item.status,
      });
    }

    return limitRows(rows.sort((a, b) => {
      const aCurrent = query.planId && a.planId === query.planId ? -1 : 0;
      const bCurrent = query.planId && b.planId === query.planId ? -1 : 0;
      return aCurrent - bCurrent;
    }), query.limit);
  }

  history(query: { entityType?: KnowledgeRecordEntityType; entityId?: string; operatorId?: string; keyword?: string; limit?: string } = {}) {
    return limitRows(
      this.readRecords()
        .filter((record) => !query.entityType || record.entityType === query.entityType)
        .filter((record) => !query.entityId || record.entityId === query.entityId)
        .filter((record) => !query.operatorId || record.operatorId === query.operatorId)
        .filter((record) => includesKeyword([record.entityType, record.entityId, record.action, record.reason, record.operatorName], query.keyword)),
      query.limit,
    );
  }

  applyImportedRows(type: 'fixture' | 'abnormal_case' | 'quality_standard', rows: Array<Record<string, string | number>>, operator: KnowledgeOperator) {
    let affected = 0;
    for (const row of rows) {
      if (type === 'fixture') {
        this.upsertImportedFixture(row, operator);
        affected += 1;
      }
      if (type === 'abnormal_case') {
        this.upsertImportedAbnormal(row, operator);
        affected += 1;
      }
      if (type === 'quality_standard') {
        this.upsertImportedQuality(row, operator);
        affected += 1;
      }
    }
    return { knowledgeRowsUpdated: affected };
  }

  private buildValidation(input: {
    planId?: string;
    productId: string;
    productCode: string;
    productName: string;
    processSegment: KnowledgeProcessSegment;
  }): KnowledgeValidationResult {
    const fixtures = this.scopedFixtures(input.productId, input.processSegment);
    const abnormalCases = this.scopedAbnormalCases(input.productId, input.processSegment);
    const qualityStandards = this.scopedQualityStandards(input.productId, input.processSegment);
    const activeFixtures = fixtures.filter((item) => item.status === 'active');
    const fixtureWithCheck = fixtures.filter((item) => String(item.checkStandard ?? '').trim().length > 0);
    const activeAbnormalCases = abnormalCases.filter((item) => item.status !== 'closed');
    const highRiskAbnormalCases = activeAbnormalCases.filter((item) => ['high', 'critical'].includes(item.severity));
    const effectiveQuality = qualityStandards.filter((item) => item.status === 'effective');
    const pendingQuality = qualityStandards.filter((item) => item.status === 'pending_review');
    const expiredQuality = qualityStandards.filter((item) => item.status === 'expired');
    const checkItems: KnowledgeValidationCheckItem[] = [];

    const push = (key: string, label: string, required: boolean, status: KnowledgeValidationCheckItem['status'], message: string) => {
      checkItems.push({ key, label, required, status, message });
    };

    push(
      'fixture_available',
      '关联治具',
      true,
      fixtures.length > 0 ? 'pass' : 'fail',
      fixtures.length > 0 ? `已匹配 ${fixtures.length} 个治具` : '当前计划无关联治具，可在资料维护中心补充。',
    );
    push(
      'fixture_active',
      '治具状态',
      true,
      activeFixtures.length > 0 ? 'pass' : fixtures.length > 0 ? 'warning' : 'fail',
      activeFixtures.length > 0 ? `可用治具 ${activeFixtures.length} 个` : '治具未处于有效状态，建议复核后再开工。',
    );
    push(
      'fixture_check_standard',
      '治具点检标准',
      true,
      fixtureWithCheck.length === fixtures.length && fixtures.length > 0 ? 'pass' : fixtureWithCheck.length > 0 ? 'warning' : 'fail',
      fixtureWithCheck.length > 0 ? `已有 ${fixtureWithCheck.length} 个治具填写点检标准` : '治具缺少点检标准。',
    );
    push(
      'abnormal_cases',
      '常见异常',
      false,
      abnormalCases.length > 0 ? (highRiskAbnormalCases.length > 0 ? 'warning' : 'pass') : 'warning',
      abnormalCases.length > 0 ? `已匹配 ${abnormalCases.length} 条异常案例` : '暂无异常案例，可在资料维护中心补充。',
    );
    push(
      'quality_available',
      '质量标准',
      true,
      qualityStandards.length > 0 ? 'pass' : 'fail',
      qualityStandards.length > 0 ? `已匹配 ${qualityStandards.length} 条质量标准` : '当前计划无质量标准。',
    );
    push(
      'quality_effective',
      '有效质量标准',
      true,
      effectiveQuality.length > 0 ? 'pass' : qualityStandards.length > 0 ? 'warning' : 'fail',
      effectiveQuality.length > 0 ? `当前有效 ${effectiveQuality.length} 条` : '质量标准未处于当前有效状态。',
    );
    push(
      'risk_abnormal',
      '高风险异常提醒',
      false,
      highRiskAbnormalCases.length > 0 ? 'warning' : 'pass',
      highRiskAbnormalCases.length > 0 ? `存在 ${highRiskAbnormalCases.length} 条 high/critical 异常，请班前提醒。` : '暂无 high/critical 未关闭异常。',
    );
    push(
      'expired_quality',
      '失效标准红线',
      false,
      expiredQuality.length > 0 ? 'fail' : pendingQuality.length > 0 ? 'warning' : 'pass',
      expiredQuality.length > 0 ? `存在 ${expiredQuality.length} 条已失效质量标准。` : pendingQuality.length > 0 ? `存在 ${pendingQuality.length} 条待确认质量标准。` : '质量标准状态正常。',
    );

    const score = Math.round((checkItems.reduce((total, item) => total + (item.status === 'pass' ? 1 : item.status === 'warning' ? 0.65 : 0), 0) / Math.max(checkItems.length, 1)) * 100);
    const hasRequiredFail = checkItems.some((item) => item.required && item.status === 'fail');
    const hasFail = checkItems.some((item) => item.status === 'fail');
    const hasWarning = checkItems.some((item) => item.status === 'warning');
    const validationStatus = hasRequiredFail || (hasFail && score < 70) ? 'blocked' : hasWarning || hasFail ? 'need_review' : 'ready';
    const recommendations = this.buildRecommendations(fixtures, abnormalCases, qualityStandards, checkItems);

    return {
      planId: input.planId,
      productId: input.productId,
      productCode: input.productCode,
      productName: input.productName,
      processSegment: input.processSegment,
      validationStatus,
      score,
      summary: validationStatus === 'ready'
        ? '现场知识齐套，可进入开工验证。'
        : validationStatus === 'need_review'
          ? '现场知识基本可用，但存在待复核项。'
          : '现场知识存在阻塞项，不建议直接开工。',
      checkItems,
      fixtureSummary: {
        total: fixtures.length,
        active: activeFixtures.length,
        pendingReview: fixtures.filter((item) => item.status === 'pending_review').length,
        abnormal: fixtures.filter((item) => item.status === 'abnormal').length,
      },
      abnormalSummary: {
        total: abnormalCases.length,
        highRisk: activeAbnormalCases.filter((item) => item.severity === 'high').length,
        critical: activeAbnormalCases.filter((item) => item.severity === 'critical').length,
      },
      qualitySummary: {
        total: qualityStandards.length,
        effective: effectiveQuality.length,
        pendingReview: pendingQuality.length,
        expired: expiredQuality.length,
      },
      recommendations,
      updatedAt: new Date().toISOString(),
    };
  }

  private buildRecommendations(
    fixtures: FixtureKnowledge[],
    abnormalCases: AbnormalCaseKnowledge[],
    qualityStandards: QualityStandardKnowledge[],
    checkItems: KnowledgeValidationCheckItem[],
  ): KnowledgeRecommendation[] {
    const rows: KnowledgeRecommendation[] = [];
    if (checkItems.some((item) => item.key === 'fixture_available' && item.status === 'fail')) {
      rows.push({ level: 'danger', title: '缺少关联治具', action: '请在资料维护中心补充当前产品/工序治具。' });
    }
    for (const fixture of fixtures.filter((item) => item.status === 'pending_review' || item.status === 'abnormal' || !String(item.checkStandard ?? '').trim()).slice(0, 4)) {
      rows.push({
        level: fixture.status === 'abnormal' ? 'danger' : 'warning',
        title: fixture.fixtureName,
        action: fixture.status === 'abnormal' ? '治具异常，请先复核或更换治具。' : '治具待复核，请确认点检标准和保养周期。',
        entityType: 'fixture',
        entityId: fixture.fixtureId,
      });
    }
    for (const item of abnormalCases.filter((row) => row.status !== 'closed' && ['high', 'critical'].includes(row.severity)).slice(0, 5)) {
      rows.push({
        level: item.severity === 'critical' ? 'danger' : 'warning',
        title: item.title,
        action: `班前提醒：${item.solution}`,
        entityType: 'abnormal_case',
        entityId: item.abnormalId,
      });
    }
    for (const item of qualityStandards.filter((row) => row.status !== 'effective').slice(0, 5)) {
      rows.push({
        level: item.status === 'expired' ? 'danger' : 'warning',
        title: item.title,
        action: item.status === 'expired' ? '质量标准已失效，请先设为有效或补充新标准。' : '质量标准待确认，请品质或工艺复核。',
        entityType: 'quality_standard',
        entityId: item.qualityId,
      });
    }
    if (!rows.length) {
      rows.push({ level: 'info', title: '现场知识齐套', action: '按推荐治具、异常提醒和质量标准完成开工验证。' });
    }
    return rows.slice(0, 10);
  }

  private scopedFixtures(productId: string, segment: KnowledgeProcessSegment) {
    return this.readFixtures()
      .filter((item) => item.productId === productId)
      .filter((item) => segment === 'common' || item.processSegment === segment || item.processSegment === 'common');
  }

  private scopedAbnormalCases(productId: string, segment: KnowledgeProcessSegment) {
    return this.readAbnormalCases()
      .filter((item) => item.productId === productId)
      .filter((item) => segment === 'common' || item.processSegment === segment || item.processSegment === 'common');
  }

  private scopedQualityStandards(productId: string, segment: KnowledgeProcessSegment) {
    return this.readQualityStandards()
      .filter((item) => item.productId === productId)
      .filter((item) => segment === 'common' || item.processSegment === segment || item.processSegment === 'common');
  }

  private severityRank(severity: string) {
    return { low: 1, medium: 2, high: 3, critical: 4 }[severity] ?? 0;
  }

  private safeBulkPatch(patch: Record<string, unknown>, allowedFields: string[]) {
    if (!patch || Array.isArray(patch) || typeof patch !== 'object') throw new BadRequestException('Bulk patch must be an object.');
    const blocked = ['id', 'fixtureId', 'abnormalId', 'qualityId', 'recordId', 'createdAt', 'updatedAt', 'before', 'after', 'images'];
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (blocked.includes(key) || !allowedFields.includes(key)) throw new BadRequestException(`Bulk patch field is not allowed: ${key}`);
      if (key === 'processSegment') next[key] = normalizeProcessSegment(String(value));
      else if (key === 'keywords' || key === 'relatedDocumentIds') next[key] = normalizeStringArray(value as string | string[]);
      else next[key] = value;
    }
    if (!Object.keys(next).length) throw new BadRequestException('Bulk patch cannot be empty.');
    return next;
  }

  private bulkApply<T extends object>(
    rows: T[],
    ids: string[],
    idField: keyof T,
    patch: Record<string, unknown>,
    entityType: KnowledgeRecordEntityType,
    reason?: string,
    user?: KnowledgeOperator,
  ) {
    if (!ids?.length) throw new BadRequestException('ids cannot be empty.');
    const idSet = new Set(ids);
    const updated: T[] = [];
    for (const row of rows) {
      const rowRecord = row as Record<string, unknown>;
      if (!idSet.has(String(rowRecord[String(idField)]))) continue;
      const before = clone(row);
      Object.assign(row, patch, { updatedAt: new Date().toISOString() });
      updated.push(clone(row));
      this.record(entityType, String(rowRecord[String(idField)]), `${entityType}_bulk_updated`, before, row, reason, user);
    }
    return updated;
  }

  private bulkResult<T extends { status: string }>(updated: T[], allRows: T[]) {
    return {
      success: true,
      updatedCount: updated.length,
      records: updated,
      summary: {
        total: allRows.length,
        byStatus: countByStatus(allRows),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  private upsertImportedFixture(row: Record<string, string | number>, operator: KnowledgeOperator) {
    const { product, customer } = productFromIdOrCode(String(row.productId || ''), String(row.productCode || ''));
    return this.createFixture({
      fixtureCode: String(row.fixtureCode),
      fixtureName: String(row.fixtureName),
      fixtureType: String(row.fixtureType || '现场治具'),
      customerId: String(row.customerId || customer?.id || ''),
      customerName: String(row.customerName || customer?.name || '演示客户'),
      productId: String(row.productId || product?.id || ''),
      productCode: String(row.productCode || product?.productCode || ''),
      productName: String(row.productName || product?.productName || ''),
      processSegment: normalizeProcessSegment(String(row.processSegment)),
      applicableStation: String(row.applicableStation || ''),
      usageMethod: String(row.usageMethod || ''),
      checkStandard: String(row.checkStandard || ''),
      maintenanceCycle: String(row.maintenanceCycle || '每班点检'),
      status: String(row.status || 'pending_review') as KnowledgeStatus,
      keywords: String(row.keywords || '').split(/[,，]/).filter(Boolean),
      remark: String(row.remark || 'V2.3 知识库导入'),
    }, operator);
  }

  private upsertImportedAbnormal(row: Record<string, string | number>, operator: KnowledgeOperator) {
    const { product, customer } = productFromIdOrCode(String(row.productId || ''), String(row.productCode || ''));
    return this.createAbnormalCase({
      abnormalCode: String(row.abnormalCode),
      title: String(row.title),
      customerId: String(row.customerId || customer?.id || ''),
      customerName: String(row.customerName || customer?.name || '演示客户'),
      productId: String(row.productId || product?.id || ''),
      productCode: String(row.productCode || product?.productCode || ''),
      productName: String(row.productName || product?.productName || ''),
      processSegment: normalizeProcessSegment(String(row.processSegment)),
      station: String(row.station || ''),
      category: String(row.category || '现场异常'),
      symptom: String(row.symptom || ''),
      cause: String(row.cause || ''),
      solution: String(row.solution || ''),
      prevention: String(row.prevention || ''),
      severity: String(row.severity || 'medium') as UpdateAbnormalDto['severity'],
      status: String(row.status || 'pending_review') as AbnormalStatus,
      keywords: String(row.keywords || '').split(/[,，]/).filter(Boolean),
      remark: String(row.remark || 'V2.3 知识库导入'),
    }, operator);
  }

  private upsertImportedQuality(row: Record<string, string | number>, operator: KnowledgeOperator) {
    const { product, customer } = productFromIdOrCode(String(row.productId || ''), String(row.productCode || ''));
    return this.createQualityStandard({
      qualityCode: String(row.qualityCode),
      title: String(row.title),
      customerId: String(row.customerId || customer?.id || ''),
      customerName: String(row.customerName || customer?.name || '演示客户'),
      productId: String(row.productId || product?.id || ''),
      productCode: String(row.productCode || product?.productCode || ''),
      productName: String(row.productName || product?.productName || ''),
      processSegment: normalizeProcessSegment(String(row.processSegment)),
      inspectionItem: String(row.inspectionItem || ''),
      standardValue: String(row.standardValue || ''),
      tolerance: String(row.tolerance || ''),
      inspectionMethod: String(row.inspectionMethod || ''),
      samplingRule: String(row.samplingRule || ''),
      defectLevel: String(row.defectLevel || 'major') as UpdateQualityDto['defectLevel'],
      status: String(row.status || 'pending_review') as QualityStatus,
      keywords: String(row.keywords || '').split(/[,，]/).filter(Boolean),
      remark: String(row.remark || 'V2.3 知识库导入'),
    }, operator);
  }

  private readFixtures() {
    return readJson<FixtureKnowledge[]>(this.fixturesFile, shouldLoadDemoBusinessData() ? fixtureSeed : []);
  }

  private writeFixtures(rows: FixtureKnowledge[]) {
    writeJson(this.fixturesFile, rows);
  }

  private readAbnormalCases() {
    return readJson<AbnormalCaseKnowledge[]>(this.abnormalFile, shouldLoadDemoBusinessData() ? abnormalCaseSeed : []);
  }

  private writeAbnormalCases(rows: AbnormalCaseKnowledge[]) {
    writeJson(this.abnormalFile, rows);
  }

  private readQualityStandards() {
    return readJson<QualityStandardKnowledge[]>(this.qualityFile, shouldLoadDemoBusinessData() ? qualityStandardSeed : []);
  }

  private writeQualityStandards(rows: QualityStandardKnowledge[]) {
    writeJson(this.qualityFile, rows);
  }

  private readRecords() {
    return existsSync(this.recordsFile) ? readJson<KnowledgeRecord[]>(this.recordsFile, []) : [];
  }

  private writeRecords(rows: KnowledgeRecord[]) {
    writeJson(this.recordsFile, rows);
  }

  private record(
    entityType: KnowledgeRecordEntityType,
    entityId: string,
    action: string,
    before: unknown,
    after: unknown,
    reason?: string,
    user?: KnowledgeOperator,
  ) {
    const operator = operatorFrom(user);
    const record: KnowledgeRecord = {
      recordId: `KNOW-${Date.now()}-${randomUUID()}`,
      entityType,
      entityId,
      action,
      before,
      after,
      reason,
      ...operator,
      createdAt: new Date().toISOString(),
    };
    const records = this.readRecords();
    records.unshift(record);
    this.writeRecords(records.slice(0, 1000));
    void this.auditService.tryCreate({
      entityType: 'system',
      entityId: record.recordId,
      action: 'maintenance_recorded',
      before,
      after,
      message: `${operator.operatorName} 维护现场知识库：${action}`,
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
      operatorRole: operator.operatorRole,
    });
    return record;
  }
}
