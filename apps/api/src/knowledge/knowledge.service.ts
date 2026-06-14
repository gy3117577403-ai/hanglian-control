import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { AuditService } from '../audit/audit.service';
import { mockStore } from '../mock/production.mock';
import { fixtureSeed, abnormalCaseSeed, qualityStandardSeed } from './mock/knowledge-seed';
import { clone, hashId, includesKeyword, limitRows, normalizeProcessSegment, normalizeStringArray, processSegmentLabel } from './helpers/knowledge-normalizer';
import { assertNonEmpty, assertStatus } from './helpers/knowledge-validator';
import type { AbnormalQueryDto } from './dto/abnormal-query.dto';
import type { FixtureQueryDto } from './dto/fixture-query.dto';
import type { KnowledgeLinkQueryDto } from './dto/knowledge-link-query.dto';
import type { KnowledgeSearchDto } from './dto/knowledge-search.dto';
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
  KnowledgeSearchResult,
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
    return readJson<FixtureKnowledge[]>(this.fixturesFile, fixtureSeed);
  }

  private writeFixtures(rows: FixtureKnowledge[]) {
    writeJson(this.fixturesFile, rows);
  }

  private readAbnormalCases() {
    return readJson<AbnormalCaseKnowledge[]>(this.abnormalFile, abnormalCaseSeed);
  }

  private writeAbnormalCases(rows: AbnormalCaseKnowledge[]) {
    writeJson(this.abnormalFile, rows);
  }

  private readQualityStandards() {
    return readJson<QualityStandardKnowledge[]>(this.qualityFile, qualityStandardSeed);
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
