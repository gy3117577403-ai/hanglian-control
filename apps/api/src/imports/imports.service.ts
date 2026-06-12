import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { createHash, randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { documentStatusLabelMap, legacyDocumentTypeMap } from '../common/enums/production.enum';
import { evaluatePlanReadiness } from '../common/utils/readiness';
import { mockStore } from '../mock/production.mock';
import { LocalStorageService } from '../storage/local-storage.service';
import { importTemplates, getImportTemplate, importTypeLabels } from './import-template-definitions';
import { parseBackPackageImportRow } from './parsers/back-package-import.parser';
import { parseCustomerProductImportRow } from './parsers/customer-product-import.parser';
import { parseFrontParameterImportRow } from './parsers/front-parameter-import.parser';
import { parseProductionPlanImportRow } from './parsers/production-plan-import.parser';
import { statusFromMessages, type ParsedImportRow, type RawImportRow } from './parsers/import-parser-utils';
import type { ImportApplyDto } from './dto/import-apply.dto';
import type { ImportHistoryQueryDto } from './dto/import-query.dto';
import type {
  BackProcessPackageSeed,
  CustomerSeed,
  FrontProcessParameterSeed,
  ImportedBusinessDataSnapshot,
  ImportPreviewResult,
  ImportRecord,
  ImportRollbackPreview,
  ImportType,
  ProductDocument,
  ProductSeed,
  ProductionPlanMock,
} from '../common/types/production.types';

const importTypes: ImportType[] = ['production_plan', 'customer_product', 'front_parameter', 'back_package'];

function cellText(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    const rich = value as { text?: string; result?: unknown; formula?: string; hyperlink?: string };
    if (rich.text) return rich.text;
    if (rich.result !== undefined) return cellText(rich.result);
    if (rich.hyperlink) return rich.hyperlink;
    if (rich.formula) return rich.formula;
  }
  return String(value).trim();
}

function hashId(input: string) {
  return createHash('sha1').update(input).digest('hex').slice(0, 12).toUpperCase();
}

function safeImportType(type: string): ImportType {
  if (!importTypes.includes(type as ImportType)) {
    throw new BadRequestException('不支持的导入类型。');
  }
  return type as ImportType;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizeMaterialStatus(status: string): '有效' | '待确认' | '失效' {
  if (status === '有效') return '有效';
  if (status === '当前有效') return '有效';
  if (status === '待确认') return '待确认';
  return '失效';
}

function documentStatusFromMaterial(status: '有效' | '待确认' | '失效') {
  if (status === '有效') return 'effective';
  if (status === '待确认') return 'pending_review';
  return 'expired';
}

function planVersionStatus(plan: ProductionPlanMock): ProductionPlanMock['versionStatus'] {
  const hasDanger = plan.front.parameterStatus === '失效'
    || plan.back.materialStatus === '失效'
    || plan.documents.some((doc) => ['expired', 'missing', 'inconsistent'].includes(doc.documentStatus ?? 'effective'));
  const hasWarning = plan.front.parameterStatus === '待确认'
    || plan.back.materialStatus === '待确认'
    || plan.documents.some((doc) => doc.documentStatus === 'pending_review');
  if (hasDanger) return { status: '失效', message: '导入资料存在失效或不一致项，需复核后开工。', redLine: true };
  if (hasWarning) return { status: '待确认', message: '导入资料存在待确认项，需组长复核。', redLine: true };
  return { status: '有效', message: '导入资料已满足开工检查基础要求。', redLine: false };
}

function makeDocument(
  planId: string,
  productId: string,
  documentType: ProductDocument['documentType'],
  title: string,
  version: string,
  requiredForProcess: ProductDocument['requiredForProcess'],
  materialStatus: '有效' | '待确认' | '失效',
): ProductDocument {
  const status = documentStatusFromMaterial(materialStatus);
  const documentId = `IMP-DOC-${hashId(`${planId}:${productId}:${documentType}:${title}`)}`;
  return {
    id: documentId,
    documentId,
    productId,
    planId,
    type: legacyDocumentTypeMap[documentType],
    documentType,
    title,
    version,
    status: documentStatusLabelMap[status],
    documentStatus: status,
    effectiveDate: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString(),
    source: 'mock',
    requiredForProcess,
    previewType: 'card',
    mockPreviewText: `${title}，由 V2.0 导入中心生成的演示资料卡，不包含真实客户文件。`,
    keywords: [title, version, '导入资料', '演示数据'],
    description: `${title} / ${version}`,
    localMockLabel: 'V2.0 导入资料占位',
    versionGroupKey: `${productId}::${documentType}::${requiredForProcess}`,
  };
}

function defaultFront(productId: string): FrontProcessParameterSeed {
  return {
    id: `IMP-FRONT-${hashId(productId)}`,
    productId,
    wireLength: '',
    strippingLength: '',
    terminalModel: '',
    pullForceStandard: '',
    crimpHeight: '',
    drawingVersion: 'Rev.A',
    parameterStatus: '待确认',
  };
}

function defaultBack(productId: string): BackProcessPackageSeed {
  return {
    id: `IMP-BACK-${hashId(productId)}`,
    productId,
    connectorModel: '',
    assemblyManual: '',
    pinMap: '',
    sop: '',
    finishedImageCount: 0,
    drawingVersion: 'Rev.A',
    sopVersion: 'Rev.A',
    materialStatus: '待确认',
  };
}

@Injectable()
export class ImportsService {
  private readonly previews = new Map<string, ImportPreviewResult>();

  constructor(
    private readonly localStorageService: LocalStorageService,
    private readonly auditService: AuditService,
  ) {
    for (const preview of this.localStorageService.readImportPreviewsSync()) {
      this.previews.set(preview.previewId, preview);
    }
  }

  getTemplates() {
    return importTemplates;
  }

  async createTemplateWorkbook(typeText: string) {
    const type = safeImportType(typeText);
    const template = getImportTemplate(type);
    if (!template) throw new NotFoundException('未找到导入模板。');

    const workbook = new Workbook();
    workbook.creator = '线束车间生产计划资料管控系统 V2.0';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet(template.label);
    const headers = template.fields.map((field) => field.field);
    sheet.addRow(headers);
    sheet.addRow(template.fields.map((field) => field.example ?? ''));
    sheet.addRow(template.fields.map((field) => (field.field === '备注' ? '演示数据 / 非真实客户资料' : '')));
    sheet.getRow(1).font = { bold: true, color: { argb: 'FF7C2D12' } };
    sheet.columns = headers.map((header) => ({ header, key: header, width: Math.max(14, header.length * 2 + 6) }));
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    return workbook.xlsx.writeBuffer();
  }

  async preview(typeText: string, file?: Express.Multer.File) {
    const type = safeImportType(typeText);
    if (!file) throw new BadRequestException('请上传 Excel 或 CSV 文件。');
    const rows = await this.parseFile(file);
    if (!rows.length) throw new BadRequestException('导入文件没有可预览的数据行。');

    const parsed = rows.map((row) => this.parseRow(type, row.rowNumber, row.data));
    this.addContextWarnings(type, parsed);
    const preview: ImportPreviewResult = {
      previewId: `IMP-PREVIEW-${Date.now()}-${randomUUID()}`,
      importType: type,
      importTypeLabel: importTypeLabels[type],
      fileName: file.originalname,
      totalRows: parsed.length,
      validRows: parsed.filter((row) => row.status === 'valid').length,
      warningRows: parsed.filter((row) => row.status === 'warning').length,
      errorRows: parsed.filter((row) => row.status === 'error').length,
      columns: Object.keys(parsed[0]?.data ?? {}),
      rows: parsed,
      summary: this.buildSummary(type, parsed),
      createdAt: new Date().toISOString(),
    };

    this.previews.set(preview.previewId, preview);
    this.localStorageService.writeImportPreviewsSync(Array.from(this.previews.values()).slice(-30));
    return preview;
  }

  apply(typeText: string, dto: ImportApplyDto) {
    const type = safeImportType(typeText);
    const preview = this.previews.get(dto.previewId)
      ?? this.localStorageService.readImportPreviewsSync().find((item) => item.previewId === dto.previewId);
    if (!preview || preview.importType !== type) {
      throw new NotFoundException('预览结果已失效，请重新上传并预览。');
    }
    if (preview.errorRows > 0) {
      throw new BadRequestException('预览中仍存在错误行，请修正文件后重新预览。');
    }

    const snapshot = this.localStorageService.readImportedBusinessDataSync();
    const applied = this.applyRows(type, preview.rows.filter((row) => row.status !== 'error'), snapshot);
    snapshot.updatedAt = new Date().toISOString();
    this.localStorageService.writeImportedBusinessDataSync(snapshot);
    mockStore.mergeImportedBusinessData(snapshot);

    const record: ImportRecord = {
      id: `IMP-REC-${Date.now()}-${randomUUID()}`,
      importType: type,
      importTypeLabel: importTypeLabels[type],
      fileName: preview.fileName,
      status: preview.warningRows > 0 ? '有警告' : '成功',
      totalRows: preview.totalRows,
      validRows: preview.validRows,
      warningRows: preview.warningRows,
      errorRows: preview.errorRows,
      summary: { ...preview.summary, ...applied },
      operatorId: dto.operatorId,
      operatorName: dto.operatorName,
      remark: dto.remark,
      createdAt: new Date().toISOString(),
      previewId: preview.previewId,
      messages: preview.rows.flatMap((row) => row.messages.map((message) => `第 ${row.rowNumber} 行：${message}`)).slice(0, 30),
    };

    const records = this.localStorageService.readImportRecordsSync();
    records.unshift(record);
    this.localStorageService.writeImportRecordsSync(records.slice(0, 300));
    void this.auditService.tryCreate({
      entityType: 'import',
      entityId: record.id,
      action: 'business_data_imported',
      after: record,
      message: `${dto.operatorName} 应用导入：${record.importTypeLabel}，${record.totalRows} 行。`,
      operatorId: dto.operatorId,
      operatorName: dto.operatorName,
      operatorRole: '组长',
    });

    return {
      success: true,
      message: '导入已应用到本地 Mock / metadata 数据源。',
      record,
      dataSource: 'mock-metadata',
    };
  }

  history(query: ImportHistoryQueryDto = {}) {
    const limit = Math.min(Math.max(Number(query.limit ?? 80), 1), 300);
    return this.localStorageService.readImportRecordsSync()
      .filter((record) => !query.type || record.importType === query.type)
      .slice(0, limit);
  }

  historyDetail(id: string) {
    const record = this.localStorageService.readImportRecordsSync().find((item) => item.id === id);
    if (!record) throw new NotFoundException('未找到导入记录。');
    return record;
  }

  rollbackPreview(id: string): ImportRollbackPreview {
    const record = this.historyDetail(id);
    return {
      importRecordId: record.id,
      importType: record.importType,
      affectedPlans: record.summary.plansCreated ?? 0,
      affectedProducts: record.summary.productsCreated ?? 0,
      affectedCustomers: record.summary.customersCreated ?? 0,
      affectedParameters: record.summary.parametersUpdated ?? 0,
      affectedBackPackages: record.summary.backPackagesUpdated ?? 0,
      canRollback: false,
      message: 'V2.0 仅提供回滚预览，不删除本地 metadata，不执行真实回滚。',
    };
  }

  private async parseFile(file: Express.Multer.File): Promise<Array<{ rowNumber: number; data: RawImportRow }>> {
    const name = file.originalname.toLowerCase();
    if (name.endsWith('.csv')) return this.parseCsv(file.buffer);
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      throw new BadRequestException('仅支持 .xlsx、.xls 或 .csv 文件。');
    }
    const workbook = new Workbook();
    await workbook.xlsx.load(file.buffer as unknown as ArrayBuffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];
    const headers: string[] = [];
    sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
      headers[colNumber - 1] = cellText(cell.value);
    });
    const rows: Array<{ rowNumber: number; data: RawImportRow }> = [];
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const data: RawImportRow = {};
      headers.forEach((header, index) => {
        if (header) data[header] = cellText(row.getCell(index + 1).value);
      });
      if (Object.values(data).some((item) => String(item).trim())) rows.push({ rowNumber, data });
    }
    return rows;
  }

  private parseCsv(buffer: Buffer): Array<{ rowNumber: number; data: RawImportRow }> {
    const lines = buffer.toString('utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
    const headers = parseCsvLine(lines[0] ?? '').map((item) => item.trim());
    return lines.slice(1).map((line, index) => {
      const cells = parseCsvLine(line);
      const data: RawImportRow = {};
      headers.forEach((header, cellIndex) => {
        if (header) data[header] = cells[cellIndex] ?? '';
      });
      return { rowNumber: index + 2, data };
    }).filter((row) => Object.values(row.data).some((item) => String(item).trim()));
  }

  private parseRow(type: ImportType, rowNumber: number, data: RawImportRow) {
    switch (type) {
      case 'production_plan':
        return parseProductionPlanImportRow(rowNumber, data);
      case 'customer_product':
        return parseCustomerProductImportRow(rowNumber, data);
      case 'front_parameter':
        return parseFrontParameterImportRow(rowNumber, data);
      case 'back_package':
        return parseBackPackageImportRow(rowNumber, data);
    }
  }

  private addContextWarnings(type: ImportType, rows: ParsedImportRow[]) {
    const seen = new Set<string>();
    for (const row of rows) {
      const key = `${row.normalized.customer}::${row.normalized.productCode}`;
      if (type === 'customer_product') {
        if (seen.has(key) || this.findProduct(String(row.normalized.customer), String(row.normalized.productCode))) {
          row.messages.push('提醒：同客户 + 产品编号已存在，应用导入时将更新基础资料。');
        }
        seen.add(key);
      }
      if ((type === 'front_parameter' || type === 'back_package') && !this.findProduct(String(row.normalized.customer), String(row.normalized.productCode))) {
        row.messages.push('提醒：找不到产品，应用导入时将自动创建基础产品。');
      }
      row.status = statusFromMessages(row.messages);
    }
  }

  private buildSummary(type: ImportType, rows: ParsedImportRow[]) {
    const usefulRows = rows.filter((row) => row.status !== 'error');
    const customerKeys = new Set<string>();
    const productKeys = new Set<string>();
    for (const row of usefulRows) {
      customerKeys.add(String(row.normalized.customer));
      productKeys.add(`${row.normalized.customer}::${row.normalized.productCode}`);
    }
    return {
      customersToCreate: Array.from(customerKeys).filter((name) => !this.findCustomer(name)).length,
      productsToCreate: Array.from(productKeys).filter((key) => {
        const [customer, productCode] = key.split('::');
        return !this.findProduct(customer, productCode);
      }).length,
      plansToCreate: type === 'production_plan' ? usefulRows.length : 0,
      parametersToUpdate: type === 'front_parameter' ? usefulRows.length : 0,
      backPackagesToUpdate: type === 'back_package' ? usefulRows.length : 0,
    };
  }

  private applyRows(type: ImportType, rows: ImportPreviewResult['rows'], snapshot: ImportedBusinessDataSnapshot) {
    const before = {
      customers: snapshot.customers.length,
      products: snapshot.products.length,
      plans: snapshot.productionPlans.length,
      parameters: snapshot.frontParameters.length,
      backPackages: snapshot.backPackages.length,
    };
    for (const row of rows) {
      const normalized = row.normalized;
      if (type === 'customer_product') this.applyCustomerProduct(normalized, snapshot);
      if (type === 'front_parameter') this.applyFrontParameter(normalized, snapshot);
      if (type === 'back_package') this.applyBackPackage(normalized, snapshot);
      if (type === 'production_plan') this.applyProductionPlan(normalized, snapshot);
    }
    return {
      customersCreated: Math.max(snapshot.customers.length - before.customers, 0),
      productsCreated: Math.max(snapshot.products.length - before.products, 0),
      plansCreated: Math.max(snapshot.productionPlans.length - before.plans, 0),
      parametersUpdated: type === 'front_parameter' ? rows.length : Math.max(snapshot.frontParameters.length - before.parameters, 0),
      backPackagesUpdated: type === 'back_package' ? rows.length : Math.max(snapshot.backPackages.length - before.backPackages, 0),
    };
  }

  private applyCustomerProduct(row: Record<string, string | number>, snapshot: ImportedBusinessDataSnapshot) {
    const customer = this.ensureCustomer(String(row.customer), String(row.sales), snapshot);
    this.ensureProduct(customer.id, String(row.productCode), String(row.productName), String(row.productVersion), '通用', snapshot);
  }

  private applyFrontParameter(row: Record<string, string | number>, snapshot: ImportedBusinessDataSnapshot) {
    const customer = this.ensureCustomer(String(row.customer), '演示销售', snapshot);
    const product = this.ensureProduct(customer.id, String(row.productCode), String(row.productCode), String(row.productVersion), '前段', snapshot);
    const front: FrontProcessParameterSeed = {
      id: `IMP-FRONT-${hashId(product.id)}`,
      productId: product.id,
      wireLength: String(row.wireLength),
      strippingLength: String(row.strippingLength),
      terminalModel: String(row.terminalModel),
      pullForceStandard: String(row.pullForceStandard),
      crimpHeight: String(row.crimpHeight),
      drawingVersion: String(row.drawingVersion),
      parameterStatus: normalizeMaterialStatus(String(row.parameterStatus)),
    };
    this.upsert(snapshot.frontParameters, front);
    this.refreshPlansForProduct(product.id, snapshot);
  }

  private applyBackPackage(row: Record<string, string | number>, snapshot: ImportedBusinessDataSnapshot) {
    const customer = this.ensureCustomer(String(row.customer), '演示销售', snapshot);
    const product = this.ensureProduct(customer.id, String(row.productCode), String(row.productCode), String(row.productVersion), '后段', snapshot);
    const back: BackProcessPackageSeed = {
      id: `IMP-BACK-${hashId(product.id)}`,
      productId: product.id,
      connectorModel: String(row.connectorModel),
      assemblyManual: String(row.assemblyManual),
      pinMap: String(row.pinMap),
      sop: String(row.sop),
      finishedImageCount: Number(row.finishedImageCount),
      drawingVersion: String(row.drawingVersion),
      sopVersion: String(row.sopVersion),
      materialStatus: normalizeMaterialStatus(String(row.materialStatus)),
    };
    this.upsert(snapshot.backPackages, back);
    this.refreshPlansForProduct(product.id, snapshot);
  }

  private applyProductionPlan(row: Record<string, string | number>, snapshot: ImportedBusinessDataSnapshot) {
    const customer = this.ensureCustomer(String(row.customer), String(row.sales), snapshot);
    const product = this.ensureProduct(
      customer.id,
      String(row.productCode),
      String(row.productName),
      String(row.productVersion),
      row.segment as ProductSeed['processSegment'],
      snapshot,
    );
    const front = snapshot.frontParameters.find((item) => item.productId === product.id) ?? defaultFront(product.id);
    const back = snapshot.backPackages.find((item) => item.productId === product.id) ?? defaultBack(product.id);
    const id = `IMP-PLAN-${hashId(`${row.date}:${row.weekPlanNo}:${product.id}`)}`;
    const plan: ProductionPlanMock = {
      id,
      date: String(row.date),
      weekPlanNo: String(row.weekPlanNo),
      sales: String(row.sales),
      customer: customer.name,
      customerId: customer.id,
      productId: product.id,
      productCode: product.productCode,
      productName: String(row.productName) || product.productName,
      productVersion: String(row.productVersion) || product.currentVersion,
      segment: row.segment as ProductionPlanMock['segment'],
      plannedQuantity: Number(row.plannedQuantity),
      completedQuantity: Number(row.completedQuantity),
      status: row.status as ProductionPlanMock['status'],
      owner: String(row.owner),
      materialCompleteness: 0,
      confirmationStatus: '未确认',
      versionStatus: { status: '待确认', message: '导入计划待检查。', redLine: true },
      querySuggestions: [product.productCode, product.productName, back.connectorModel, back.pinMap, back.sop, front.terminalModel].filter(Boolean),
      front: {
        wireLength: front.wireLength,
        strippingLength: front.strippingLength,
        terminalModel: front.terminalModel,
        pullForceStandard: front.pullForceStandard,
        crimpHeight: front.crimpHeight,
        drawingVersion: front.drawingVersion,
        parameterStatus: front.parameterStatus,
      },
      back: {
        connectorModel: back.connectorModel,
        assemblyManual: back.assemblyManual,
        pinMap: back.pinMap,
        sop: back.sop,
        finishedImageCount: back.finishedImageCount,
        drawingVersion: back.drawingVersion,
        sopVersion: back.sopVersion,
        materialStatus: back.materialStatus,
      },
      documents: [],
    };
    this.decoratePlan(plan);
    this.upsert(snapshot.productionPlans, plan);
  }

  private refreshPlansForProduct(productId: string, snapshot: ImportedBusinessDataSnapshot) {
    for (const plan of snapshot.productionPlans.filter((item) => item.productId === productId)) {
      const front = snapshot.frontParameters.find((item) => item.productId === productId) ?? defaultFront(productId);
      const back = snapshot.backPackages.find((item) => item.productId === productId) ?? defaultBack(productId);
      plan.front = { ...front };
      plan.back = { ...back };
      this.decoratePlan(plan);
    }
  }

  private decoratePlan(plan: ProductionPlanMock) {
    plan.documents = this.documentsForPlan(plan);
    plan.versionStatus = planVersionStatus(plan);
    plan.readiness = evaluatePlanReadiness(plan);
    plan.materialCompleteness = plan.readiness.score;
    return plan;
  }

  private documentsForPlan(plan: ProductionPlanMock): ProductDocument[] {
    const docs: ProductDocument[] = [];
    if (plan.front.drawingVersion) {
      docs.push(makeDocument(plan.id, plan.productId, 'drawing_pdf', `${plan.productName} 前段图纸`, plan.front.drawingVersion, 'front', plan.front.parameterStatus));
    }
    if (plan.back.assemblyManual) {
      docs.push(makeDocument(plan.id, plan.productId, 'connector_manual', plan.back.assemblyManual, plan.back.drawingVersion, 'back', plan.back.materialStatus));
    }
    if (plan.back.pinMap) {
      docs.push(makeDocument(plan.id, plan.productId, 'pinout_diagram', plan.back.pinMap, plan.back.drawingVersion, 'back', plan.back.materialStatus));
    }
    if (plan.back.sop) {
      docs.push(makeDocument(plan.id, plan.productId, 'sop_image', plan.back.sop, plan.back.sopVersion, 'back', plan.back.materialStatus));
    }
    if (plan.back.finishedImageCount > 0) {
      docs.push(makeDocument(plan.id, plan.productId, 'finished_detail_image', `${plan.productName} 成品细节图`, `共 ${plan.back.finishedImageCount} 张`, 'back', plan.back.materialStatus));
    }
    return docs;
  }

  private ensureCustomer(name: string, salesOwner: string, snapshot: ImportedBusinessDataSnapshot): CustomerSeed {
    const existing = this.findCustomer(name, snapshot);
    if (existing) return existing;
    const customer: CustomerSeed = {
      id: `IMP-CUST-${hashId(name)}`,
      name,
      code: `C-${hashId(name).slice(0, 6)}`,
      salesOwner: salesOwner || '演示销售',
    };
    snapshot.customers.push(customer);
    return customer;
  }

  private ensureProduct(
    customerId: string,
    productCode: string,
    productName: string,
    version: string,
    segment: ProductSeed['processSegment'],
    snapshot: ImportedBusinessDataSnapshot,
  ): ProductSeed {
    const customer = [...mockStore.customers, ...snapshot.customers].find((item) => item.id === customerId);
    const existing = customer ? this.findProduct(customer.name, productCode, snapshot) : undefined;
    if (existing) {
      existing.productName = productName || existing.productName;
      existing.currentVersion = version || existing.currentVersion;
      existing.processSegment = segment || existing.processSegment;
      return existing;
    }
    const product: ProductSeed = {
      id: `IMP-PROD-${hashId(`${customerId}:${productCode}`)}`,
      customerId,
      productCode,
      productName: productName || productCode,
      currentVersion: version || 'Rev.A',
      processSegment: segment,
    };
    snapshot.products.push(product);
    return product;
  }

  private findCustomer(name: string, snapshot?: ImportedBusinessDataSnapshot) {
    return [...mockStore.customers, ...(snapshot?.customers ?? [])].find((item) => item.name === name);
  }

  private findProduct(customerName: string, productCode: string, snapshot?: ImportedBusinessDataSnapshot) {
    const customer = this.findCustomer(customerName, snapshot);
    if (!customer) return undefined;
    return [...mockStore.products, ...(snapshot?.products ?? [])]
      .find((item) => item.customerId === customer.id && item.productCode === productCode);
  }

  private upsert<T extends { id: string }>(rows: T[], row: T) {
    const index = rows.findIndex((item) => item.id === row.id);
    if (index >= 0) rows[index] = row;
    else rows.push(row);
  }
}
