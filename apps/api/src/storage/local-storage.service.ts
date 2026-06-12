import { Injectable, OnModuleInit } from '@nestjs/common';
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AuditLog, ProductDocument } from '../common/types/production.types';

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
}
