import { Injectable, OnModuleInit } from '@nestjs/common';
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import type {
  AuditLog,
  ImportedBusinessDataSnapshot,
  ImportPreviewResult,
  ImportRecord,
  MaintenanceRecord,
  ProductDocument,
} from '../common/types/production.types';
import { StorageConfigService } from './storage.config';
import { StorageService } from './storage.service';

export interface StoredFileInfo {
  absolutePath: string;
  mimeType: string;
  size: number;
  stream: ReturnType<typeof createReadStream>;
}

const mimeTypesByExtension: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

@Injectable()
export class LocalStorageService implements OnModuleInit {
  private readonly storageRoot: string;
  private readonly uploadsDir: string;
  private readonly metadataDir: string;
  private readonly tempDir: string;
  private readonly documentsFile: string;
  private readonly auditLogsFile: string;
  private readonly importRecordsFile: string;
  private readonly importedBusinessDataFile: string;
  private readonly importPreviewsFile: string;
  private readonly maintenanceRecordsFile: string;

  constructor(
    private readonly storageConfig: StorageConfigService,
    private readonly storageService: StorageService,
  ) {
    this.storageRoot = storageConfig.storageRoot;
    this.uploadsDir = storageConfig.uploadsRoot;
    this.metadataDir = storageConfig.metadataRoot;
    this.tempDir = storageConfig.tempRoot;
    this.documentsFile = join(this.metadataDir, 'documents.json');
    this.auditLogsFile = join(this.metadataDir, 'audit-logs.json');
    this.importRecordsFile = join(this.metadataDir, 'import-records.json');
    this.importedBusinessDataFile = join(this.metadataDir, 'imported-business-data.json');
    this.importPreviewsFile = join(this.metadataDir, 'import-previews.json');
    this.maintenanceRecordsFile = join(this.metadataDir, 'maintenance-records.json');
  }

  async onModuleInit() {
    await this.ensureStorage();
  }

  getUploadsDir() {
    return this.uploadsDir;
  }

  getMetadataDir() {
    return this.metadataDir;
  }

  getTempDir() {
    return this.tempDir;
  }

  async ensureStorage() {
    await mkdir(this.uploadsDir, { recursive: true });
    await mkdir(this.metadataDir, { recursive: true });
    await mkdir(this.tempDir, { recursive: true });
    try {
      await stat(this.documentsFile);
    } catch {
      await this.writeTextAtomic(this.documentsFile, '[]');
    }
    try {
      await stat(this.auditLogsFile);
    } catch {
      await this.writeTextAtomic(this.auditLogsFile, '[]');
    }
    try {
      await stat(this.importRecordsFile);
    } catch {
      await this.writeTextAtomic(this.importRecordsFile, '[]');
    }
    try {
      await stat(this.importedBusinessDataFile);
    } catch {
      await this.writeTextAtomic(this.importedBusinessDataFile, this.emptyImportedBusinessData());
    }
    try {
      await stat(this.importPreviewsFile);
    } catch {
      await this.writeTextAtomic(this.importPreviewsFile, '[]');
    }
    try {
      await stat(this.maintenanceRecordsFile);
    } catch {
      await this.writeTextAtomic(this.maintenanceRecordsFile, '[]');
    }
  }

  ensureStorageSync() {
    mkdirSync(this.uploadsDir, { recursive: true });
    mkdirSync(this.metadataDir, { recursive: true });
    mkdirSync(this.tempDir, { recursive: true });
    if (!existsSync(this.documentsFile)) {
      this.writeTextAtomicSync(this.documentsFile, '[]');
    }
    if (!existsSync(this.auditLogsFile)) {
      this.writeTextAtomicSync(this.auditLogsFile, '[]');
    }
    if (!existsSync(this.importRecordsFile)) {
      this.writeTextAtomicSync(this.importRecordsFile, '[]');
    }
    if (!existsSync(this.importedBusinessDataFile)) {
      this.writeTextAtomicSync(this.importedBusinessDataFile, this.emptyImportedBusinessData());
    }
    if (!existsSync(this.importPreviewsFile)) {
      this.writeTextAtomicSync(this.importPreviewsFile, '[]');
    }
    if (!existsSync(this.maintenanceRecordsFile)) {
      this.writeTextAtomicSync(this.maintenanceRecordsFile, '[]');
    }
  }

  safeStoredFileName(originalName: string, mimeType: string) {
    const ext = mimeTypesByExtension[mimeType] ? extname(originalName).toLowerCase() : extname(originalName).toLowerCase();
    return `${Date.now()}${ext || '.bin'}`;
  }

  async saveFile(file: Express.Multer.File) {
    const stored = await this.storageService.putObject({
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer,
      fileSize: file.size,
      prefix: 'documents',
    });
    return stored.storedFileName;
  }

  async readDocuments(): Promise<ProductDocument[]> {
    await this.ensureStorage();
    const raw = await readFile(this.documentsFile, 'utf8');
    try {
      return JSON.parse(raw) as ProductDocument[];
    } catch {
      return [];
    }
  }

  readDocumentsSync(): ProductDocument[] {
    this.ensureStorageSync();
    try {
      return JSON.parse(readFileSync(this.documentsFile, 'utf8')) as ProductDocument[];
    } catch {
      return [];
    }
  }

  async writeDocuments(documents: ProductDocument[]) {
    await this.ensureStorage();
    await this.writeJsonAtomic(this.documentsFile, documents);
  }

  async readAuditLogs(): Promise<AuditLog[]> {
    await this.ensureStorage();
    const raw = await readFile(this.auditLogsFile, 'utf8');
    try {
      return JSON.parse(raw) as AuditLog[];
    } catch {
      return [];
    }
  }

  readAuditLogsSync(): AuditLog[] {
    this.ensureStorageSync();
    try {
      return JSON.parse(readFileSync(this.auditLogsFile, 'utf8')) as AuditLog[];
    } catch {
      return [];
    }
  }

  async writeAuditLogs(logs: AuditLog[]) {
    await this.ensureStorage();
    await this.writeJsonAtomic(this.auditLogsFile, logs);
  }

  readImportRecordsSync(): ImportRecord[] {
    this.ensureStorageSync();
    return this.readJsonFileSync<ImportRecord[]>(this.importRecordsFile, []);
  }

  writeImportRecordsSync(records: ImportRecord[]) {
    this.ensureStorageSync();
    this.writeJsonAtomicSync(this.importRecordsFile, records);
  }

  readImportedBusinessDataSync(): ImportedBusinessDataSnapshot {
    this.ensureStorageSync();
    return this.readJsonFileSync<ImportedBusinessDataSnapshot>(
      this.importedBusinessDataFile,
      this.emptyImportedBusinessDataObject(),
    );
  }

  writeImportedBusinessDataSync(snapshot: ImportedBusinessDataSnapshot) {
    this.ensureStorageSync();
    this.writeJsonAtomicSync(this.importedBusinessDataFile, snapshot);
  }

  readImportPreviewsSync(): ImportPreviewResult[] {
    this.ensureStorageSync();
    return this.readJsonFileSync<ImportPreviewResult[]>(this.importPreviewsFile, []);
  }

  writeImportPreviewsSync(previews: ImportPreviewResult[]) {
    this.ensureStorageSync();
    this.writeJsonAtomicSync(this.importPreviewsFile, previews);
  }

  readMaintenanceRecordsSync(): MaintenanceRecord[] {
    this.ensureStorageSync();
    return this.readJsonFileSync<MaintenanceRecord[]>(this.maintenanceRecordsFile, []);
  }

  writeMaintenanceRecordsSync(records: MaintenanceRecord[]) {
    this.ensureStorageSync();
    this.writeJsonAtomicSync(this.maintenanceRecordsFile, records);
  }

  readMetadataArraySync<T>(fileName: string, fallback: T[] = []): T[] {
    this.ensureStorageSync();
    const file = this.metadataFilePath(fileName);
    if (!existsSync(file)) {
      this.writeJsonAtomicSync(file, fallback);
    }
    return this.readJsonFileSync<T[]>(file, fallback);
  }

  writeMetadataArraySync<T>(fileName: string, records: T[]) {
    this.ensureStorageSync();
    this.writeJsonAtomicSync(this.metadataFilePath(fileName), records);
  }

  readMetadataSync<T>(fileName: string, fallback: T): T {
    this.ensureStorageSync();
    const file = this.metadataFilePath(fileName);
    if (!existsSync(file)) {
      this.writeJsonAtomicSync(file, fallback);
    }
    return this.readJsonFileSync<T>(file, fallback);
  }

  writeMetadataSync<T>(fileName: string, value: T) {
    this.ensureStorageSync();
    this.writeJsonAtomicSync(this.metadataFilePath(fileName), value);
  }

  writeAuditLogsSync(logs: AuditLog[]) {
    this.ensureStorageSync();
    this.writeJsonAtomicSync(this.auditLogsFile, logs);
  }

  writeDocumentsSync(documents: ProductDocument[]) {
    this.ensureStorageSync();
    this.writeJsonAtomicSync(this.documentsFile, documents);
  }

  async upsertDocument(document: ProductDocument) {
    const documents = await this.readDocuments();
    const index = documents.findIndex((item) => item.documentId === document.documentId);
    if (index >= 0) {
      documents[index] = document;
    } else {
      documents.unshift(document);
    }
    await this.writeDocuments(documents);
    return document;
  }

  upsertDocumentSync(document: ProductDocument) {
    const documents = this.readDocumentsSync();
    const index = documents.findIndex((item) => item.documentId === document.documentId);
    if (index >= 0) {
      documents[index] = document;
    } else {
      documents.unshift(document);
    }
    this.writeDocumentsSync(documents);
    return document;
  }

  async getStoredFile(storedFileName: string): Promise<StoredFileInfo | undefined> {
    const file = await this.storageService.getObjectStream(storedFileName);
    if (!file) return undefined;
    return {
      absolutePath: resolve(this.uploadsDir, storedFileName),
      mimeType: file.mimeType,
      size: file.fileSize,
      stream: file.stream as ReturnType<typeof createReadStream>,
    };
  }

  private readJsonFileSync<T>(file: string, fallback: T): T {
    try {
      return JSON.parse(readFileSync(file, 'utf8')) as T;
    } catch {
      return fallback;
    }
  }

  private metadataFilePath(fileName: string) {
    if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) {
      throw new Error(`Unsafe metadata file name: ${fileName}`);
    }
    return join(this.metadataDir, fileName);
  }

  private async writeJsonAtomic(file: string, value: unknown) {
    await this.writeTextAtomic(file, JSON.stringify(value, null, 2));
  }

  private writeJsonAtomicSync(file: string, value: unknown) {
    this.writeTextAtomicSync(file, JSON.stringify(value, null, 2));
  }

  private async writeTextAtomic(file: string, content: string) {
    await mkdir(this.tempDir, { recursive: true });
    const tempFile = join(this.tempDir, `${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
    await writeFile(tempFile, content, 'utf8');
    await rename(tempFile, file);
  }

  private writeTextAtomicSync(file: string, content: string) {
    mkdirSync(this.tempDir, { recursive: true });
    const tempFile = join(this.tempDir, `${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
    writeFileSync(tempFile, content, 'utf8');
    renameSync(tempFile, file);
  }

  private emptyImportedBusinessDataObject(): ImportedBusinessDataSnapshot {
    return {
      updatedAt: new Date(0).toISOString(),
      customers: [],
      products: [],
      productionPlans: [],
      frontParameters: [],
      backPackages: [],
    };
  }

  private emptyImportedBusinessData() {
    return JSON.stringify(this.emptyImportedBusinessDataObject(), null, 2);
  }
}
