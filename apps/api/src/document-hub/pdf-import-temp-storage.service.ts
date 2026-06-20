import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Dirent } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { LocalStorageService } from '../storage/local-storage.service';

const pdfImportRootName = 'pdf-import';
const batchMetaFileName = 'batch-meta.json';

export interface StagedPdfImportFile {
  stagedFileKey: string;
  stagedFileName: string;
  absolutePath: string;
}

@Injectable()
export class PdfImportTempStorageService {
  constructor(private readonly localStorageService: LocalStorageService) {}

  async cleanupExpiredBatches(now = new Date()) {
    const importRoot = await this.ensureImportRoot();
    let entries: Dirent[];
    try {
      entries = await readdir(importRoot, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || !this.isSafeSegment(entry.name)) continue;
      const batchDir = this.assertInside(importRoot, join(importRoot, entry.name));
      const metaFile = this.assertInside(batchDir, join(batchDir, batchMetaFileName));

      try {
        const raw = await readFile(metaFile, 'utf8');
        const meta = JSON.parse(raw) as { expiresAt?: string };
        if (meta.expiresAt && new Date(meta.expiresAt).getTime() <= now.getTime()) {
          await rm(batchDir, { recursive: true, force: true });
        }
      } catch {
        // Leave unknown directories alone; only explicit expired pdf-import batches are cleaned.
      }
    }
  }

  async createBatchDirectory(importBatchId: string, expiresAt: string) {
    const batchDir = await this.ensureBatchDirectory(importBatchId);
    const metaFile = this.assertInside(batchDir, join(batchDir, batchMetaFileName));
    await writeFile(metaFile, JSON.stringify({ importBatchId, expiresAt }, null, 2), 'utf8');
    return batchDir;
  }

  async stagePdf(importBatchId: string, file: Express.Multer.File): Promise<StagedPdfImportFile> {
    const batchDir = await this.ensureBatchDirectory(importBatchId);
    const stagedFileName = `${randomUUID().replace(/-/g, '')}.pdf`;
    const absolutePath = this.assertInside(batchDir, join(batchDir, stagedFileName));
    await writeFile(absolutePath, file.buffer);

    return {
      stagedFileKey: [pdfImportRootName, importBatchId, stagedFileName].join('/'),
      stagedFileName,
      absolutePath,
    };
  }

  async removeStagedFile(stagedFileKey?: string) {
    if (!stagedFileKey) return;
    const absolutePath = this.pathFromStagedFileKey(stagedFileKey);
    await rm(absolutePath, { force: true });
  }

  async removeBatch(importBatchId: string) {
    const importRoot = await this.ensureImportRoot();
    if (!this.isSafeSegment(importBatchId)) return;
    const batchDir = this.assertInside(importRoot, join(importRoot, importBatchId));
    await rm(batchDir, { recursive: true, force: true });
  }

  pathFromStagedFileKey(stagedFileKey: string) {
    const parts = stagedFileKey.split('/');
    if (
      parts.length !== 3 ||
      parts[0] !== pdfImportRootName ||
      !this.isSafeSegment(parts[1]) ||
      !this.isSafeSegment(parts[2]) ||
      !parts[2].toLowerCase().endsWith('.pdf')
    ) {
      throw new Error('Unsafe staged PDF import file key.');
    }

    const importRoot = this.importRootPath();
    const batchDir = this.assertInside(importRoot, join(importRoot, parts[1]));
    return this.assertInside(batchDir, join(batchDir, parts[2]));
  }

  private async ensureImportRoot() {
    const importRoot = this.importRootPath();
    await mkdir(importRoot, { recursive: true });
    return importRoot;
  }

  private async ensureBatchDirectory(importBatchId: string) {
    if (!this.isSafeSegment(importBatchId)) {
      throw new Error('Unsafe PDF import batch id.');
    }

    const importRoot = await this.ensureImportRoot();
    const batchDir = this.assertInside(importRoot, join(importRoot, importBatchId));
    await mkdir(batchDir, { recursive: true });
    return batchDir;
  }

  private importRootPath() {
    const tempRoot = resolve(this.localStorageService.getTempDir());
    return this.assertInside(tempRoot, join(tempRoot, pdfImportRootName));
  }

  private assertInside(root: string, target: string) {
    const resolvedRoot = resolve(root);
    const resolvedTarget = resolve(target);
    const pathRelativeToRoot = relative(resolvedRoot, resolvedTarget);
    const isSamePath = resolvedTarget === resolvedRoot;
    const isChildPath = resolvedTarget.startsWith(`${resolvedRoot}${sep}`);
    if (!isSamePath && !isChildPath) {
      throw new Error('Unsafe PDF import temp path.');
    }
    if (pathRelativeToRoot.startsWith('..') || pathRelativeToRoot === '..' || pathRelativeToRoot.includes(`..${sep}`)) {
      throw new Error('Unsafe PDF import temp path.');
    }
    return resolvedTarget;
  }

  private isSafeSegment(value: string) {
    return /^[A-Za-z0-9._-]+$/.test(value) && !value.includes('..');
  }
}
