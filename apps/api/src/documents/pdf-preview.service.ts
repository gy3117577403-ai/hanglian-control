import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { isAbsolute, relative, resolve } from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import sharp from 'sharp';
import { REPOSITORY_TOKENS } from '../common/constants/repository-tokens';
import type { ProductDocument } from '../common/types/production.types';
import type { DocumentRepositoryInterface } from '../repositories/interfaces/document.repository.interface';
import { LocalStorageService } from '../storage/local-storage.service';
import { StorageService } from '../storage/storage.service';
import { PdfPreviewWorker } from './pdf-preview.worker';

export type DocumentPreviewStatus = 'pending' | 'ready' | 'failed';

export interface DocumentPreviewPage {
  pageNo: number;
  imageUrl: string;
  width: number;
  height: number;
}

export interface DocumentPreviewResponse {
  documentId: string;
  title: string;
  fileType: string;
  pageCount: number;
  previewStatus: DocumentPreviewStatus;
  pages: DocumentPreviewPage[];
  errorMessage?: string;
}

export interface PreviewPageFile {
  fileName: string;
  absolutePath: string;
  mimeType: string;
  size: number;
  stream: Readable;
}

interface PreviewManifestPage {
  pageNo: number;
  fileName: string;
  width: number;
  height: number;
  mimeType: string;
}

interface PreviewManifest {
  documentId: string;
  title: string;
  fileType: string;
  sourceStoredFileName?: string;
  pageCount: number;
  previewStatus: DocumentPreviewStatus;
  pages: PreviewManifestPage[];
  errorMessage?: string;
  updatedAt: string;
}

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function documentId(document: ProductDocument) {
  return document.documentId ?? document.id;
}

function fileTypeFor(document: ProductDocument) {
  return document.mimeType ?? document.previewType ?? 'application/octet-stream';
}

function safePathSegment(value: string) {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (cleaned.length > 0 && cleaned.length <= 160) return cleaned;
  return createHash('sha256').update(value).digest('hex');
}

function delay(ms: number) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function streamToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

@Injectable()
export class PdfPreviewService {
  private readonly logger = new Logger(PdfPreviewService.name);
  private readonly previewRoot: string;
  private readonly syncWaitMs = positiveInt(process.env.PDF_PREVIEW_SYNC_WAIT_MS, 8_000);
  private readonly inFlight = new Map<string, Promise<PreviewManifest>>();

  constructor(
    @Inject(REPOSITORY_TOKENS.document)
    private readonly documentRepository: DocumentRepositoryInterface,
    private readonly localStorageService: LocalStorageService,
    private readonly storageService: StorageService,
    private readonly worker: PdfPreviewWorker,
  ) {
    this.previewRoot = resolve(this.localStorageService.getUploadsDir(), '_previews');
  }

  async warmPreviewAfterUpload(document: ProductDocument) {
    if (!this.isPdf(document)) return;
    const reusable = await this.readReusableManifest(document);
    if (reusable?.previewStatus === 'ready') return;

    void this.startBuild(document).catch((error) => {
      this.logger.error(`Background PDF preview failed: ${error instanceof Error ? error.message : String(error)}`);
    });
  }

  async getPreview(id: string, accessToken?: string): Promise<DocumentPreviewResponse> {
    const document = await this.findDocument(id);
    if (this.isImage(document)) return this.imagePreview(document, accessToken);
    if (!this.isPdf(document)) {
      return this.failedPreview(document, 'Unsupported preview file type.');
    }

    const manifest = await this.ensurePdfPreview(document);
    return this.toResponse(document, manifest, accessToken);
  }

  async getPreviewPageFile(id: string, pageNo: number): Promise<PreviewPageFile> {
    if (!Number.isInteger(pageNo) || pageNo < 1) {
      throw new BadRequestException('pageNo must be a positive integer.');
    }

    const document = await this.findDocument(id);
    if (this.isImage(document)) return this.getImagePageFile(document, pageNo);
    if (!this.isPdf(document)) throw new NotFoundException('Preview page is unavailable for this document.');

    const manifest = await this.ensurePdfPreview(document);
    if (manifest.previewStatus !== 'ready') {
      throw new NotFoundException('Preview page is not ready.');
    }

    const page = manifest.pages.find((item) => item.pageNo === pageNo);
    if (!page) throw new NotFoundException(`Preview page ${pageNo} does not exist.`);

    const previewDir = this.previewDirFor(documentId(document));
    const absolutePath = resolve(previewDir, page.fileName);
    this.assertInside(previewDir, absolutePath);

    const pageStat = await stat(absolutePath);
    if (!pageStat.isFile()) throw new NotFoundException(`Preview page ${pageNo} does not exist.`);

    return {
      fileName: page.fileName,
      absolutePath,
      mimeType: page.mimeType,
      size: pageStat.size,
      stream: createReadStream(absolutePath),
    };
  }

  private async ensurePdfPreview(document: ProductDocument) {
    const reusable = await this.readReusableManifest(document);
    if (reusable?.previewStatus === 'ready' || reusable?.previewStatus === 'failed') return reusable;

    const key = documentId(document);
    const task = this.inFlight.get(key) ?? this.startBuild(document);
    const completed = await Promise.race([
      task.then(() => true),
      delay(this.syncWaitMs).then(() => false),
    ]);

    if (completed) return task;
    const pending = await this.readManifest(document);
    return pending ?? this.pendingManifest(document);
  }

  private startBuild(document: ProductDocument) {
    const key = documentId(document);
    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const task = this.buildPdfPreview(document).finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, task);
    return task;
  }

  private async buildPdfPreview(document: ProductDocument): Promise<PreviewManifest> {
    const docId = documentId(document);
    const previewDir = this.previewDirFor(docId);
    await mkdir(previewDir, { recursive: true });
    await this.writeManifest(previewDir, this.pendingManifest(document));

    const sourceKey = this.sourceStorageKey(document);
    if (!sourceKey) {
      return this.writeFailedManifest(previewDir, document, 'PDF source file is missing.');
    }

    const tempDir = resolve(previewDir, `.tmp-${Date.now()}-${randomUUID()}`);
    this.assertInside(previewDir, tempDir);
    await mkdir(tempDir, { recursive: true });

    try {
      const sourceFile = await this.storageService.getFileStream({
        provider: document.storageProvider,
        storageKey: document.storageKey,
        storedFileName: document.storedFileName,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
      });
      if (!sourceFile) {
        return this.writeFailedManifest(previewDir, document, 'PDF source file was not found in storage.');
      }

      const sourcePath = resolve(tempDir, 'source.pdf');
      this.assertInside(tempDir, sourcePath);
      await pipeline(sourceFile.stream, createWriteStream(sourcePath));

      const renderedPages = await this.worker.renderToPngPages(sourcePath, tempDir);
      await this.clearPreviousPageFiles(previewDir);

      const pages: PreviewManifestPage[] = [];
      for (const page of renderedPages) {
        const fileName = `page-${String(page.pageNo).padStart(4, '0')}.png`;
        await rename(resolve(tempDir, page.fileName), resolve(previewDir, fileName));
        pages.push({
          pageNo: page.pageNo,
          fileName,
          width: page.width,
          height: page.height,
          mimeType: page.mimeType,
        });
      }

      const manifest: PreviewManifest = {
        documentId: docId,
        title: document.title,
        fileType: fileTypeFor(document),
        sourceStoredFileName: sourceKey,
        pageCount: pages.length,
        previewStatus: 'ready',
        pages,
        updatedAt: new Date().toISOString(),
      };
      await this.writeManifest(previewDir, manifest);
      return manifest;
    } catch (error) {
      return this.writeFailedManifest(
        previewDir,
        document,
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  private async imagePreview(document: ProductDocument, accessToken?: string): Promise<DocumentPreviewResponse> {
    const docId = documentId(document);
    const sourceKey = this.sourceStorageKey(document);
    const dimensions = sourceKey ? await this.readStoredImageDimensions(document) : undefined;
    const imageUrl = sourceKey
      ? this.previewPageUrl(docId, 1, accessToken)
      : document.previewUrl ?? document.downloadUrl ?? '';

    if (!imageUrl) return this.failedPreview(document, 'Image source file is missing.');

    return {
      documentId: docId,
      title: document.title,
      fileType: fileTypeFor(document),
      pageCount: 1,
      previewStatus: 'ready',
      pages: [{
        pageNo: 1,
        imageUrl,
        width: dimensions?.width ?? 0,
        height: dimensions?.height ?? 0,
      }],
    };
  }

  private async getImagePageFile(document: ProductDocument, pageNo: number): Promise<PreviewPageFile> {
    if (pageNo !== 1) throw new NotFoundException(`Preview page ${pageNo} does not exist.`);
    const file = await this.storageService.getFileStream({
      provider: document.storageProvider,
      storageKey: document.storageKey,
      storedFileName: document.storedFileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
    });
    if (!file) throw new NotFoundException('Image source file was not found in storage.');

    return {
      fileName: document.originalFileName ?? document.storedFileName ?? document.storageKey ?? 'image',
      absolutePath: '',
      mimeType: file.mimeType,
      size: file.fileSize,
      stream: file.stream,
    };
  }

  private async readStoredImageDimensions(document: ProductDocument) {
    const file = await this.storageService.getFileStream({
      provider: document.storageProvider,
      storageKey: document.storageKey,
      storedFileName: document.storedFileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
    });
    if (!file) return undefined;
    try {
      const metadata = await sharp(await streamToBuffer(file.stream)).metadata();
      return {
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
      };
    } catch {
      return undefined;
    }
  }

  private async readReusableManifest(document: ProductDocument) {
    const manifest = await this.readManifest(document);
    if (!manifest) return undefined;
    if (manifest.sourceStoredFileName !== this.sourceStorageKey(document)) return undefined;
    if (manifest.previewStatus === 'pending' && !this.inFlight.has(documentId(document))) return undefined;
    if (manifest.previewStatus !== 'ready') return manifest;

    const previewDir = this.previewDirFor(documentId(document));
    for (const page of manifest.pages) {
      try {
        const pageStat = await stat(resolve(previewDir, page.fileName));
        if (!pageStat.isFile()) return undefined;
      } catch {
        return undefined;
      }
    }
    return manifest;
  }

  private async readManifest(document: ProductDocument) {
    const previewDir = this.previewDirFor(documentId(document));
    try {
      const raw = await readFile(this.manifestPath(previewDir), 'utf8');
      return JSON.parse(raw) as PreviewManifest;
    } catch {
      return undefined;
    }
  }

  private async writeFailedManifest(previewDir: string, document: ProductDocument, errorMessage: string) {
    const manifest: PreviewManifest = {
      documentId: documentId(document),
      title: document.title,
      fileType: fileTypeFor(document),
      sourceStoredFileName: this.sourceStorageKey(document),
      pageCount: 0,
      previewStatus: 'failed',
      pages: [],
      errorMessage,
      updatedAt: new Date().toISOString(),
    };
    await this.writeManifest(previewDir, manifest);
    return manifest;
  }

  private pendingManifest(document: ProductDocument): PreviewManifest {
    return {
      documentId: documentId(document),
      title: document.title,
      fileType: fileTypeFor(document),
      sourceStoredFileName: this.sourceStorageKey(document),
      pageCount: 0,
      previewStatus: 'pending',
      pages: [],
      updatedAt: new Date().toISOString(),
    };
  }

  private failedPreview(document: ProductDocument, errorMessage: string): DocumentPreviewResponse {
    return {
      documentId: documentId(document),
      title: document.title,
      fileType: fileTypeFor(document),
      pageCount: 0,
      previewStatus: 'failed',
      pages: [],
      errorMessage,
    };
  }

  private toResponse(document: ProductDocument, manifest: PreviewManifest, accessToken?: string): DocumentPreviewResponse {
    const docId = documentId(document);
    return {
      documentId: docId,
      title: document.title,
      fileType: manifest.fileType,
      pageCount: manifest.pageCount,
      previewStatus: manifest.previewStatus,
      pages: manifest.pages.map((page) => ({
        pageNo: page.pageNo,
        imageUrl: this.previewPageUrl(docId, page.pageNo, accessToken),
        width: page.width,
        height: page.height,
      })),
      ...(manifest.errorMessage ? { errorMessage: manifest.errorMessage } : {}),
    };
  }

  private async clearPreviousPageFiles(previewDir: string) {
    const files = await readdir(previewDir);
    await Promise.all(
      files
        .filter((fileName) => /^page-\d+\.png$/i.test(fileName))
        .map((fileName) => rm(resolve(previewDir, fileName), { force: true })),
    );
  }

  private async writeManifest(previewDir: string, manifest: PreviewManifest) {
    await mkdir(previewDir, { recursive: true });
    await writeFile(this.manifestPath(previewDir), JSON.stringify(manifest, null, 2), 'utf8');
  }

  private async findDocument(id: string) {
    const document = await this.documentRepository.findDocumentById(id);
    if (!document) throw new NotFoundException(`Document not found: ${id}`);
    return document;
  }

  private previewPageUrl(id: string, pageNo: number, accessToken?: string) {
    const apiPrefix = (process.env.API_PREFIX ?? 'api').replace(/^\/+|\/+$/g, '');
    const query = accessToken ? `?accessToken=${encodeURIComponent(accessToken)}` : '';
    return `/${apiPrefix}/documents/${encodeURIComponent(id)}/preview-pages/${pageNo}${query}`;
  }

  private sourceStorageKey(document: ProductDocument) {
    return document.storageKey ?? document.storedFileName;
  }

  private previewDirFor(id: string) {
    const previewDir = resolve(this.previewRoot, safePathSegment(id));
    this.assertInside(this.previewRoot, previewDir);
    return previewDir;
  }

  private manifestPath(previewDir: string) {
    return resolve(previewDir, 'manifest.json');
  }

  private assertInside(root: string, target: string) {
    const relativePath = relative(root, target);
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new BadRequestException('Preview path is outside the storage root.');
    }
  }

  private isPdf(document: ProductDocument) {
    return document.mimeType === 'application/pdf' || document.previewType === 'pdf';
  }

  private isImage(document: ProductDocument) {
    return Boolean(document.mimeType?.startsWith('image/')) || document.previewType === 'image';
  }
}
