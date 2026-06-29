import common from '@ohos.app.ability.common';
import fs from '@ohos.file.fs';
import fileUri from '@ohos.file.fileuri';
import picker from '@ohos.file.picker';
import { SelectedUploadFile, UploadSource } from '../models/DocumentModels';

const SUPPORTED_SUFFIXES: string[] = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

export class FilePickerService {
  static async pickDocument(context: common.UIAbilityContext): Promise<SelectedUploadFile | undefined> {
    const documentPicker = new picker.DocumentViewPicker();
    const options = new picker.DocumentSelectOptions();
    options.maxSelectNumber = 1;
    options.fileSuffixFilters = SUPPORTED_SUFFIXES;
    const result = await documentPicker.select(options);
    if (!result || result.length === 0) return undefined;
    return FilePickerService.preparePickedFile(context, result[0], 'manual_upload');
  }

  static async preparePickedFile(context: common.UIAbilityContext, uri: string, source: UploadSource): Promise<SelectedUploadFile> {
    const displayName = FilePickerService.safeFileName(FilePickerService.nameFromUri(uri, source));
    const cacheName = `${Date.now()}-${displayName}`;
    const cachePath = `${context.cacheDir}/${cacheName}`;

    let copiedSize = 0;
    let sourceFile: fs.File | undefined = undefined;
    try {
      sourceFile = fs.openSync(uri, fs.OpenMode.READ_ONLY);
      fs.copyFileSync(sourceFile.fd, cachePath);
      copiedSize = fs.statSync(cachePath).size;
    } finally {
      if (sourceFile) fs.closeSync(sourceFile);
    }

    return {
      uri,
      uploadUri: `internal://cache/${cacheName}`,
      fallbackUploadUri: fileUri.getUriFromPath(cachePath),
      cachePath,
      name: displayName,
      mimeType: FilePickerService.mimeTypeFor(displayName),
      size: copiedSize,
      source
    };
  }

  static mimeTypeFor(fileName: string): string {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }

  static isSupported(fileName: string): boolean {
    const lower = fileName.toLowerCase();
    return SUPPORTED_SUFFIXES.some((suffix: string) => lower.endsWith(suffix));
  }

  static nameFromUri(uri: string, source: UploadSource): string {
    const clean = decodeURIComponent(uri.split('?')[0]);
    const lastSlash = clean.lastIndexOf('/');
    const rawName = lastSlash >= 0 ? clean.substring(lastSlash + 1) : clean;
    if (FilePickerService.isSupported(rawName)) return rawName;
    return source === 'camera_capture' ? `camera-${Date.now()}.jpg` : `document-${Date.now()}.pdf`;
  }

  static safeFileName(fileName: string): string {
    const extension = FilePickerService.safeExtension(fileName);
    const rawBase = extension.length > 0 ? fileName.substring(0, fileName.length - extension.length) : fileName;
    const normalized = rawBase
      .replace(/[^A-Za-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    const safeBase = normalized.length > 0 ? normalized : `document-${Date.now()}`;
    return `${safeBase}${extension.length > 0 ? extension : '.pdf'}`;
  }

  static safeExtension(fileName: string): string {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) return '.pdf';
    if (lower.endsWith('.jpg')) return '.jpg';
    if (lower.endsWith('.jpeg')) return '.jpg';
    if (lower.endsWith('.png')) return '.png';
    if (lower.endsWith('.webp')) return '.webp';
    return '';
  }
}
