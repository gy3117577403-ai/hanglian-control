import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);

export interface RenderedPdfPage {
  pageNo: number;
  fileName: string;
  width: number;
  height: number;
  mimeType: 'image/png';
}

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

@Injectable()
export class PdfPreviewWorker {
  private readonly logger = new Logger(PdfPreviewWorker.name);
  private readonly converterCommand = process.env.PDFTOPPM_PATH
    ?? (process.platform === 'win32' ? 'pdftoppm.exe' : 'pdftoppm');
  private readonly density = positiveInt(process.env.PDF_PREVIEW_DENSITY, 144);
  private readonly timeoutMs = positiveInt(process.env.PDF_PREVIEW_TIMEOUT_MS, 120_000);

  async renderToPngPages(pdfPath: string, outputDir: string): Promise<RenderedPdfPage[]> {
    const outputPrefix = join(outputDir, 'page');

    try {
      await execFileAsync(this.converterCommand, ['-png', '-r', String(this.density), pdfPath, outputPrefix], {
        shell: process.platform === 'win32' && /\.(cmd|bat)$/i.test(this.converterCommand),
        timeout: this.timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true,
      });
    } catch (error) {
      const exception = error as NodeJS.ErrnoException;
      const message = exception.code === 'ENOENT'
        ? 'PDF preview converter is unavailable. Install poppler-utils or set PDFTOPPM_PATH.'
        : exception.message ?? String(error);
      this.logger.error(`PDF render failed: ${message}`);
      throw new Error(message);
    }

    const files = (await readdir(outputDir))
      .map((fileName) => {
        const match = /^page-(\d+)\.png$/i.exec(fileName);
        return match ? { fileName, pageNo: Number.parseInt(match[1], 10) } : undefined;
      })
      .filter((item): item is { fileName: string; pageNo: number } => Boolean(item))
      .sort((left, right) => left.pageNo - right.pageNo);

    if (files.length === 0) {
      throw new Error('PDF conversion finished without generated page images.');
    }

    return Promise.all(
      files.map(async (file) => {
        const metadata = await sharp(join(outputDir, file.fileName)).metadata();
        return {
          ...file,
          width: metadata.width ?? 0,
          height: metadata.height ?? 0,
          mimeType: 'image/png' as const,
        };
      }),
    );
  }
}
