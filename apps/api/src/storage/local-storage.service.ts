import { Injectable, OnModuleInit } from '@nestjs/common';
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  AuditLog,
  ImportedBusinessDataSnapshot,
  ImportPreviewResult,
  ImportRecord,
  MaintenanceRecord,
  ProductDocument,
} from '../common/types/production.types';

export interface StoredFileInfo {
  absolutePath: string;
  mimeType: string;
  size: number;
  stream: ReturnType<typeof createReadStream>;
}

const mimeExtensions: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const mimeTypesByExtension: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

@Injectable()
export class LocalStorageService implements OnModuleInit {
  private readonly storageRoot = resolve(process.cwd(), 'storage');
  private readonly uploadsDir = join(this.storageRoot, 'uploads');
  private readonly metadataDir = join(this.storageRoot, 'metadata');
  private readonly documentsFile = join(this.metadataDir, 'documents.json');
  private readonly auditLogsFile = join(this.metadataDir, 'audit-logs.json');
  private readonly importRecordsFile = join(this.metadataDir, 'import-records.json');
  private readonly importedBusinessDataFile = join(this.metadataDir, 'imported-business-data.json');
  private readonly importPreviewsFile = join(this.metadataDir, 'import-previews.json');
  private readonly maintenanceRecordsFile = join(this.metadataDir, 'maintenance-records.json');

  async onModuleInit() {
    await this.ensureStorage();
  }

  getUploadsDir() {
    return this.uploadsDir;
  }

  async ensureStorage() {
    await mkdir(this.uploadsDir, { recursive: true });
    await mkdir(this.metadataDir, { recursive: true });
    try {
      await stat(this.documentsFile);
    } catch {
      await writeFile(this.documentsFile, '[]', 'utf8');
    }
    try {
      await stat(this.auditLogsFile);
    } catch {
      await writeFile(this.auditLogsFile, '[]', 'utf8');
    }
    try {
      await stat(this.importRecordsFile);
    } catch {
      await writeFile(this.importRecordsFile, '[]', 'utf8');
    }
    try {
      await stat(this.importedBusinessDataFile);
    } catch {
      await writeFile(this.importedBusinessDataFile, this.emptyImportedBusinessData(), 'utf8');
    }
    try {
      await stat(this.importPreviewsFile);
    } catch {
      await writeFile(this.importPreviewsFile, '[]', 'utf8');
    }
    try {
      await stat(this.maintenanceRecordsFile);
    } catch {
      await writeFile(this.maintenanceRecordsFile, '[]', 'utf8');
    }
  }

  ensureStorageSync() {
    mkdirSync(this.uploadsDir, { recursive: true });
    mkdirSync(this.metadataDir, { recursive: true });
    if (!existsSync(this.documentsFile)) {
      writeFileSync(this.documentsFile, '[]', 'utf8');
    }
    if (!existsSync(this.auditLogsFile)) {
      writeFileSync(this.auditLogsFile, '[]', 'utf8');
    }
    if (!existsSync(this.importRecordsFile)) {
      writeFileSync(this.importRecordsFile, '[]', 'utf8');
    }
    if (!existsSync(this.importedBusinessDataFile)) {
      writeFileSync(this.importedBusinessDataFile, this.emptyImportedBusinessData(), 'utf8');
    }
    if (!existsSync(this.importPreviewsFile)) {
      writeFileSync(this.importPreviewsFile, '[]', 'utf8');
    }
    if (!existsSync(this.maintenanceRecordsFile)) {
      writeFileSync(this.maintenanceRecordsFile, '[]', 'utf8');
    }
  }

  safeStoredFileName(originalName: string, mimeType: string) {
    const ext = mimeExtensions[mimeType] ?? extname(originalName).toLowerCase();
    return `${Date.now()}-${randomUUID()}${ext}`;
  }

  async saveFile(file: Express.Multer.File) {
    await this.ensureStorage();
    const storedFileName = this.safeStoredFileName(file.originalname, file.mimetype);
    const absolutePath = join(this.uploadsDir, storedFileName);
    await writeFile(absolutePath, file.buffer);
    return storedFileName;
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
    await writeFile(this.documentsFile, JSON.stringify(documents, null, 2), 'utf8');
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
    await writeFile(this.auditLogsFile, JSON.stringify(logs, null, 2), 'utf8');
  }

  readImportRecordsSync(): ImportRecord[] {
    this.ensureStorageSync();
    return this.readJsonFileSync<ImportRecord[]>(this.importRecordsFile, []);
  }

  writeImportRecordsSync(records: ImportRecord[]) {
    this.ensureStorageSync();
    writeFileSync(this.importRecordsFile, JSON.stringify(records, null, 2), 'utf8');
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
    writeFileSync(this.importedBusinessDataFile, JSON.stringify(snapshot, null, 2), 'utf8');
  }

  readImportPreviewsSync(): ImportPreviewResult[] {
    this.ensureStorageSync();
    return this.readJsonFileSync<ImportPreviewResult[]>(this.importPreviewsFile, []);
  }

  writeImportPreviewsSync(previews: ImportPreviewResult[]) {
    this.ensureStorageSync();
    writeFileSync(this.importPreviewsFile, JSON.stringify(previews, null, 2), 'utf8');
  }

  readMaintenanceRecordsSync(): MaintenanceRecord[] {
    this.ensureStorageSync();
    return this.readJsonFileSync<MaintenanceRecord[]>(this.maintenanceRecordsFile, []);
  }

  writeMaintenanceRecordsSync(records: MaintenanceRecord[]) {
    this.ensureStorageSync();
    writeFileSync(this.maintenanceRecordsFile, JSON.stringify(records, null, 2), 'utf8');
  }

  readMetadataArraySync<T>(fileName: string, fallback: T[] = []): T[] {
    this.ensureStorageSync();
    const file = this.metadataFilePath(fileName);
    if (!existsSync(file)) {
      writeFileSync(file, JSON.stringify(fallback, null, 2), 'utf8');
    }
    return this.readJsonFileSync<T[]>(file, fallback);
  }

  writeMetadataArraySync<T>(fileName: string, records: T[]) {
    this.ensureStorageSync();
    writeFileSync(this.metadataFilePath(fileName), JSON.stringify(records, null, 2), 'utf8');
  }

  writeAuditLogsSync(logs: AuditLog[]) {
    this.ensureStorageSync();
    writeFileSync(this.auditLogsFile, JSON.stringify(logs, null, 2), 'utf8');
  }

  writeDocumentsSync(documents: ProductDocument[]) {
    this.ensureStorageSync();
    writeFileSync(this.documentsFile, JSON.stringify(documents, null, 2), 'utf8');
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
    if (!/^[a-zA-Z0-9._-]+$/.test(storedFileName)) return undefined;

    const absolutePath = resolve(this.uploadsDir, storedFileName);
    if (!absolutePath.startsWith(this.uploadsDir)) return undefined;

    try {
      const fileStat = await stat(absolutePath);
      if (!fileStat.isFile()) return undefined;
      return {
        absolutePath,
        mimeType: mimeTypesByExtension[extname(storedFileName).toLowerCase()] ?? 'application/octet-stream',
        size: fileStat.size,
        stream: createReadStream(absolutePath),
      };
    } catch {
      return undefined;
    }
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
