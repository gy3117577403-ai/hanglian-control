import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Workbook } from 'exceljs';
import { DatabaseConfigService } from '../database/database-config.service';
import { PrismaService } from '../database/prisma.service';
import { LocalStorageService } from '../storage/local-storage.service';
import { connectorParameters } from '../document-hub/mock/document-hub.seed';
import type { ConnectorParamQueryDto } from './dto/connector-param-query.dto';
import type { CreateConnectorParamDto } from './dto/create-connector-param.dto';
import type { UpdateConnectorParamDto } from './dto/update-connector-param.dto';

type ConnectorParamStatus = 'active' | 'review' | 'disabled';

interface ConnectorParamRecord {
  id: string;
  connectorModel: string;
  insertionLength: number;
  outerStripLength: number | null;
  innerStripLength: number;
  remark: string;
  status: ConnectorParamStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

interface NormalizedConnectorParamInput {
  connectorModel?: string;
  insertionLength?: number;
  outerStripLength?: number | null;
  innerStripLength?: number;
  remark?: string;
  status?: ConnectorParamStatus;
}

interface RequiredConnectorParamInput {
  connectorModel: string;
  insertionLength: number;
  outerStripLength?: number | null;
  innerStripLength: number;
  remark?: string;
  status?: ConnectorParamStatus;
}

const metadataFileName = 'connector-params.json';

function nowIso() {
  return new Date().toISOString();
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function numberFrom(value: unknown, fieldName: string, required: boolean) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new BadRequestException(`${fieldName} is required.`);
    return undefined;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new BadRequestException(`${fieldName} must be a non-negative number.`);
  }
  return numeric;
}

function nullableNumberFrom(value: unknown, fieldName: string) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return numberFrom(value, fieldName, false) ?? null;
}

function firstDefined<T>(primary: T | undefined, fallback: T | undefined) {
  return primary !== undefined ? primary : fallback;
}

function normalizeStatus(value?: string | null): ConnectorParamStatus {
  const text = clean(value ?? 'active').toLowerCase();
  if (!text || ['active', 'enable', 'enabled', '\u542f\u7528'].includes(text)) return 'active';
  if (['review', 'pending', 'pending_review', '\u590d\u6838\u4e2d', '\u5f85\u590d\u6838'].includes(text)) return 'review';
  if (['disabled', 'disable', 'inactive', '\u505c\u7528'].includes(text)) return 'disabled';
  throw new BadRequestException('status must be active, review, or disabled.');
}

function normalizeStatusQuery(value?: string) {
  if (!value || value === 'all') return undefined;
  return normalizeStatus(value);
}

function sameModel(left?: string, right?: string) {
  return clean(left).toLowerCase() === clean(right).toLowerCase();
}

function responseFromRecord(record: ConnectorParamRecord) {
  return {
    id: record.id,
    connectorModel: record.connectorModel,
    insertionLength: record.insertionLength,
    outerStripLength: record.outerStripLength,
    innerStripLength: record.innerStripLength,
    remark: record.remark,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt ?? null,
  };
}

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

@Injectable()
export class ConnectorParamsService {
  constructor(
    private readonly databaseConfig: DatabaseConfigService,
    private readonly prisma: PrismaService,
    private readonly localStorageService: LocalStorageService,
  ) {}

  async findAll(query: ConnectorParamQueryDto = {}) {
    const keyword = clean(query.keyword || query.q).toLowerCase();
    const status = normalizeStatusQuery(query.status);
    const limit = this.clampLimit(query.limit);
    const offset = this.clampOffset(query.offset);

    const records = this.usesPostgres()
      ? await this.findPostgresRecords(keyword, status, limit, offset)
      : this.findMockRecords(keyword, status, limit, offset);

    return records.map(responseFromRecord);
  }

  async create(dto: CreateConnectorParamDto) {
    const input = this.normalizeRequiredInput(dto);
    if (this.usesPostgres()) {
      this.databaseConfig.assertWriteAllowed();
      await this.assertPostgresModelAvailable(input.connectorModel);
      const row = await this.prisma.client.connectorProcessParameter.create({
        data: {
          connectorModel: input.connectorModel,
          insertionLength: input.insertionLength,
          outerStripLength: input.outerStripLength ?? null,
          innerStripLength: input.innerStripLength,
          remark: input.remark ?? '',
          status: input.status ?? 'active',
        },
      });
      return responseFromRecord(this.mapPostgresRecord(row));
    }

    const records = this.readMockRecords(true);
    this.assertMockModelAvailable(records, input.connectorModel);
    const timestamp = nowIso();
    const record: ConnectorParamRecord = {
      id: `conn-${randomUUID().slice(0, 8)}`,
      connectorModel: input.connectorModel,
      insertionLength: input.insertionLength,
      outerStripLength: input.outerStripLength ?? null,
      innerStripLength: input.innerStripLength,
      remark: input.remark ?? '',
      status: input.status ?? 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    };
    records.unshift(record);
    this.writeMockRecords(records);
    return responseFromRecord(record);
  }

  async update(id: string, dto: UpdateConnectorParamDto) {
    const input = this.normalizeInput(dto, false);
    if (this.usesPostgres()) {
      this.databaseConfig.assertWriteAllowed();
      const current = await this.findPostgresById(id);
      if (!current) throw new NotFoundException('Connector parameter not found.');
      if (input.connectorModel && !sameModel(input.connectorModel, current.connectorModel)) {
        await this.assertPostgresModelAvailable(input.connectorModel, id);
      }
      const row = await this.prisma.client.connectorProcessParameter.update({
        where: { id: current.id },
        data: {
          ...(input.connectorModel !== undefined ? { connectorModel: input.connectorModel } : {}),
          ...(input.insertionLength !== undefined ? { insertionLength: input.insertionLength } : {}),
          ...(input.outerStripLength !== undefined ? { outerStripLength: input.outerStripLength } : {}),
          ...(input.innerStripLength !== undefined ? { innerStripLength: input.innerStripLength } : {}),
          ...(input.remark !== undefined ? { remark: input.remark } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
      });
      return responseFromRecord(this.mapPostgresRecord(row));
    }

    const records = this.readMockRecords(true);
    const index = records.findIndex((item) => item.id === id && !item.deletedAt);
    if (index < 0) throw new NotFoundException('Connector parameter not found.');
    if (input.connectorModel && !sameModel(input.connectorModel, records[index].connectorModel)) {
      this.assertMockModelAvailable(records, input.connectorModel, id);
    }
    const next = {
      ...records[index],
      ...(input.connectorModel !== undefined ? { connectorModel: input.connectorModel } : {}),
      ...(input.insertionLength !== undefined ? { insertionLength: input.insertionLength } : {}),
      ...(input.outerStripLength !== undefined ? { outerStripLength: input.outerStripLength } : {}),
      ...(input.innerStripLength !== undefined ? { innerStripLength: input.innerStripLength } : {}),
      ...(input.remark !== undefined ? { remark: input.remark } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      updatedAt: nowIso(),
    };
    records[index] = next;
    this.writeMockRecords(records);
    return responseFromRecord(next);
  }

  async softDelete(id: string) {
    const deletedAt = nowIso();
    if (this.usesPostgres()) {
      this.databaseConfig.assertWriteAllowed();
      const current = await this.findPostgresById(id);
      if (!current) throw new NotFoundException('Connector parameter not found.');
      const row = await this.prisma.client.connectorProcessParameter.update({
        where: { id: current.id },
        data: { deletedAt },
      });
      return {
        success: true,
        deletedId: id,
        item: responseFromRecord(this.mapPostgresRecord(row)),
      };
    }

    const records = this.readMockRecords(true);
    const index = records.findIndex((item) => item.id === id && !item.deletedAt);
    if (index < 0) throw new NotFoundException('Connector parameter not found.');
    records[index] = { ...records[index], deletedAt, updatedAt: deletedAt };
    this.writeMockRecords(records);
    return {
      success: true,
      deletedId: id,
      item: responseFromRecord(records[index]),
    };
  }

  async importOne(dto: CreateConnectorParamDto) {
    const input = this.normalizeRequiredInput(dto);
    if (this.usesPostgres()) {
      this.databaseConfig.assertWriteAllowed();
      const existing = await this.findPostgresByModel(input.connectorModel, true);
      if (existing) {
        const row = await this.prisma.client.connectorProcessParameter.update({
          where: { id: existing.id },
          data: {
            connectorModel: input.connectorModel,
            insertionLength: input.insertionLength,
            outerStripLength: input.outerStripLength ?? null,
            innerStripLength: input.innerStripLength,
            remark: input.remark ?? '',
            status: input.status ?? 'active',
            deletedAt: null,
          },
        });
        return { action: 'updated', item: responseFromRecord(this.mapPostgresRecord(row)) };
      }
      return { action: 'created', item: await this.create(dto) };
    }

    const records = this.readMockRecords(true);
    const index = records.findIndex((item) => sameModel(item.connectorModel, input.connectorModel));
    const timestamp = nowIso();
    if (index >= 0) {
      records[index] = {
        ...records[index],
        connectorModel: input.connectorModel,
        insertionLength: input.insertionLength,
        outerStripLength: input.outerStripLength ?? null,
        innerStripLength: input.innerStripLength,
        remark: input.remark ?? '',
        status: input.status ?? 'active',
        deletedAt: null,
        updatedAt: timestamp,
      };
      this.writeMockRecords(records);
      return { action: 'updated', item: responseFromRecord(records[index]) };
    }

    const record: ConnectorParamRecord = {
      id: `conn-${randomUUID().slice(0, 8)}`,
      connectorModel: input.connectorModel,
      insertionLength: input.insertionLength,
      outerStripLength: input.outerStripLength ?? null,
      innerStripLength: input.innerStripLength,
      remark: input.remark ?? '',
      status: input.status ?? 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    };
    records.unshift(record);
    this.writeMockRecords(records);
    return { action: 'created', item: responseFromRecord(record) };
  }

  async importFile(file?: Express.Multer.File) {
    if (!file) {
      return {
        success: true,
        todo: true,
        parsedCount: 0,
        message: 'Connector parameter bulk import endpoint is ready; file parsing/apply is TODO.',
      };
    }

    const parsed = await this.countImportRows(file);
    return {
      success: true,
      todo: true,
      fileName: file.originalname,
      fileSize: file.size,
      parsedCount: parsed.count,
      warnings: parsed.warnings,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      message: 'Connector parameter bulk import accepted. Full Excel apply is TODO; use import-one for single-model import now.',
    };
  }

  async exportCsv(query: ConnectorParamQueryDto = {}) {
    const rows = await this.findAll(query);
    const header = [
      'id',
      'connectorModel',
      'insertionLength',
      'outerStripLength',
      'innerStripLength',
      'remark',
      'status',
      'createdAt',
      'updatedAt',
      'deletedAt',
    ];
    const lines = [
      header.join(','),
      ...rows.map((row) => header.map((key) => csvEscape((row as Record<string, unknown>)[key])).join(',')),
    ];
    return `\ufeff${lines.join('\r\n')}\r\n`;
  }

  private usesPostgres() {
    return this.databaseConfig.getStatus().dataSource === 'postgres';
  }

  private normalizeInput(
    dto: CreateConnectorParamDto | UpdateConnectorParamDto,
    requireLengths: boolean,
  ): NormalizedConnectorParamInput {
    const connectorModel = clean(dto.connectorModel);
    const insertionLength = numberFrom(
      dto.insertionLength ?? dto.insertionLengthMm,
      'insertionLength',
      requireLengths,
    );
    const outerStripLength = nullableNumberFrom(
      firstDefined(dto.outerStripLength, dto.outerStripLengthMm),
      'outerStripLength',
    );
    const innerStripLength = numberFrom(
      dto.innerStripLength ?? dto.innerStripLengthMm,
      'innerStripLength',
      requireLengths,
    );
    const status = dto.status === undefined ? undefined : normalizeStatus(dto.status);

    if (requireLengths && !connectorModel) {
      throw new BadRequestException('connectorModel is required.');
    }
    if (connectorModel && connectorModel.length > 120) {
      throw new BadRequestException('connectorModel must be 120 characters or fewer.');
    }

    return {
      ...(connectorModel ? { connectorModel } : {}),
      ...(insertionLength !== undefined ? { insertionLength } : {}),
      ...(outerStripLength !== undefined ? { outerStripLength } : {}),
      ...(innerStripLength !== undefined ? { innerStripLength } : {}),
      ...(dto.remark !== undefined ? { remark: clean(dto.remark) } : {}),
      ...(status !== undefined ? { status } : {}),
    };
  }

  private normalizeRequiredInput(dto: CreateConnectorParamDto): RequiredConnectorParamInput {
    const input = this.normalizeInput(dto, true);
    if (
      !input.connectorModel ||
      input.insertionLength === undefined ||
      input.innerStripLength === undefined
    ) {
      throw new BadRequestException('connectorModel, insertionLength, and innerStripLength are required.');
    }
    return {
      connectorModel: input.connectorModel,
      insertionLength: input.insertionLength,
      outerStripLength: input.outerStripLength,
      innerStripLength: input.innerStripLength,
      remark: input.remark,
      status: input.status,
    };
  }

  private async findPostgresRecords(
    keyword?: string,
    status?: ConnectorParamStatus,
    limit = 500,
    offset = 0,
  ): Promise<ConnectorParamRecord[]> {
    const rows = await this.prisma.client.connectorProcessParameter.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status } : {}),
        ...(keyword
          ? {
              OR: [
                { connectorModel: { contains: keyword, mode: 'insensitive' } },
                { remark: { contains: keyword, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ status: 'asc' }, { connectorModel: 'asc' }],
      skip: offset,
      take: limit,
    });
    return rows.map((row: Record<string, unknown>) => this.mapPostgresRecord(row));
  }

  private async findPostgresById(id: string): Promise<ConnectorParamRecord | undefined> {
    const row = await this.prisma.client.connectorProcessParameter.findFirst({
      where: { id, deletedAt: null },
    });
    return row ? this.mapPostgresRecord(row) : undefined;
  }

  private async findPostgresByModel(model: string, includeDeleted = false) {
    const row = await this.prisma.client.connectorProcessParameter.findFirst({
      where: {
        connectorModel: { equals: model, mode: 'insensitive' },
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: { updatedAt: 'desc' },
    });
    return row ? this.mapPostgresRecord(row) : undefined;
  }

  private async assertPostgresModelAvailable(model?: string, excludeId?: string) {
    if (!model) throw new BadRequestException('connectorModel is required.');
    const duplicate = await this.prisma.client.connectorProcessParameter.findFirst({
      where: {
        connectorModel: { equals: model, mode: 'insensitive' },
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (duplicate) throw new BadRequestException('Connector model already exists.');
  }

  private mapPostgresRecord(row: Record<string, any>): ConnectorParamRecord {
    return {
      id: String(row.id),
      connectorModel: String(row.connectorModel ?? ''),
      insertionLength: Number(row.insertionLength ?? 0),
      outerStripLength: row.outerStripLength === null || row.outerStripLength === undefined
        ? null
        : Number(row.outerStripLength),
      innerStripLength: Number(row.innerStripLength ?? 0),
      remark: String(row.remark ?? ''),
      status: normalizeStatus(row.status),
      createdAt: new Date(row.createdAt ?? Date.now()).toISOString(),
      updatedAt: new Date(row.updatedAt ?? Date.now()).toISOString(),
      deletedAt: row.deletedAt ? new Date(row.deletedAt).toISOString() : null,
    };
  }

  private findMockRecords(
    keyword?: string,
    status?: ConnectorParamStatus,
    limit = 500,
    offset = 0,
  ) {
    const normalizedKeyword = clean(keyword).toLowerCase();
    return this.readMockRecords()
      .filter((item) => !status || item.status === status)
      .filter((item) => !normalizedKeyword || [
        item.connectorModel,
        item.remark,
      ].some((value) => value.toLowerCase().includes(normalizedKeyword)))
      .sort((left, right) => {
        const statusDiff = left.status.localeCompare(right.status);
        return statusDiff || left.connectorModel.localeCompare(right.connectorModel);
      })
      .slice(offset, offset + limit);
  }

  private readMockRecords(includeDeleted = false): ConnectorParamRecord[] {
    const records = this.localStorageService.readMetadataArraySync<ConnectorParamRecord>(
      metadataFileName,
      this.seedRecords(),
    );
    return includeDeleted ? records : records.filter((item) => !item.deletedAt);
  }

  private writeMockRecords(records: ConnectorParamRecord[]) {
    this.localStorageService.writeMetadataArraySync(metadataFileName, records);
  }

  private assertMockModelAvailable(records: ConnectorParamRecord[], model?: string, excludeId?: string) {
    if (!model) throw new BadRequestException('connectorModel is required.');
    const duplicate = records.find((item) => (
      !item.deletedAt &&
      item.id !== excludeId &&
      sameModel(item.connectorModel, model)
    ));
    if (duplicate) throw new BadRequestException('Connector model already exists.');
  }

  private seedRecords(): ConnectorParamRecord[] {
    const timestamp = nowIso();
    return connectorParameters.map((item) => ({
      id: item.connectorId,
      connectorModel: item.connectorModel,
      insertionLength: item.insertionLengthMm,
      outerStripLength: item.outerStripLengthMm ?? null,
      innerStripLength: item.innerStripLengthMm,
      remark: item.remark || item.specification || '',
      status: normalizeStatus(item.status),
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    }));
  }

  private async countImportRows(file: Express.Multer.File) {
    const warnings: string[] = [];
    try {
      if (file.originalname.toLowerCase().endsWith('.csv') || file.mimetype === 'text/csv') {
        const lines = file.buffer.toString('utf8').split(/\r?\n/).filter((line) => line.trim());
        return { count: Math.max(lines.length - 1, 0), warnings };
      }

      const workbook = new Workbook();
      await workbook.xlsx.load(file.buffer as any);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) return { count: 0, warnings: ['No worksheet found.'] };
      let count = 0;
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 1) return;
        const hasValue = row.values && Array.isArray(row.values)
          ? row.values.some((value) => value !== null && value !== undefined && String(value).trim() !== '')
          : false;
        if (hasValue) count += 1;
      });
      return { count, warnings };
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : 'Unable to parse file.');
      return { count: 0, warnings };
    }
  }

  private clampLimit(value?: number) {
    const parsed = Number(value ?? 500);
    if (!Number.isFinite(parsed)) return 500;
    return Math.min(Math.max(Math.floor(parsed), 1), 500);
  }

  private clampOffset(value?: number) {
    const parsed = Number(value ?? 0);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(Math.floor(parsed), 0);
  }
}
