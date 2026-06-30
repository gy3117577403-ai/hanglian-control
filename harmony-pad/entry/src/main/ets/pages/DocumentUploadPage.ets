import common from '@ohos.app.ability.common';
import fs from '@ohos.file.fs';
import fileUri from '@ohos.file.fileuri';
import pasteboard from '@ohos.pasteboard';
import router from '@ohos.router';
import { BusinessError } from '@ohos.base';
import {
  categoryOptionFor,
  DocumentCategory,
  DocumentType,
  RequiredProcess,
  SelectedUploadFile,
  UploadDocumentInput,
  UploadSource,
  UploadProgress,
  safeDocumentTitle
} from '../models/DocumentModels';
import { BuildInfo } from '../services/BuildInfo';
import { CameraService } from '../services/CameraService';
import { DocumentPreviewService } from '../services/DocumentPreviewService';
import { FilePickerService } from '../services/FilePickerService';
import { TokenStorageService } from '../services/TokenStorageService';
import { UploadFailedDetail, UploadService } from '../services/UploadService';

interface UploadRouteParams {
  productId?: string;
  productModel?: string;
  planId?: string;
  category?: string;
  title?: string;
  qaMode?: string;
}

interface ManualUploadPageResult {
  filePickerPdfUpload: boolean;
  filePickerPdfPreview: boolean;
  cameraJpgUpload: boolean;
  cameraJpgPreview: boolean;
  uploadUriScheme: string;
  requestUploadFile: boolean;
  multipartFallback: boolean;
}

const MAX_UPLOAD_SIZE: number = 50 * 1024 * 1024;

@Entry
@Component
struct DocumentUploadPage {
  @State private productId: string = '';
  @State private productModel: string = '';
  @State private planId: string = '';
  @State private category: DocumentCategory = 'original_drawing';
  @State private title: string = '原图';
  @State private selectedFileName: string = '未选择文件';
  @State private uploadStatus: string = '未上传';
  @State private statusMessage: string = '请选择 PDF、JPG、PNG 或 WEBP 文件。';
  @State private isUploading: boolean = false;
  @State private canPreview: boolean = false;
  @State private canCopyErrorSummary: boolean = false;
  @State private showErrorSummaryText: boolean = false;
  @State private showQaActions: boolean = false;
  private selectedFile: SelectedUploadFile | undefined = undefined;
  private uploadedDocumentId: string = '';
  private lastUploadErrorSummary: string = '';
  private qaTapCount: number = 0;
  private filePickerPdfUpload: boolean = false;
  private filePickerPdfPreview: boolean = false;
  private cameraJpgUpload: boolean = false;
  private cameraJpgPreview: boolean = false;
  private manualUploadUriScheme: string = 'none';
  private multipartFallbackEnabled: boolean = false;
  private manualQaActive: boolean = false;
  private manualQaVersion: string = '';

  aboutToAppear(): void {
    const params = router.getParams() as UploadRouteParams;
    this.productId = params?.productId ?? '';
    this.productModel = params?.productModel ?? '';
    this.planId = params?.planId ?? '';
    this.category = this.normalizeCategory(params?.category ?? 'original_drawing');
    this.title = params?.title ?? categoryOptionFor(this.category).label;
    this.showQaActions = params?.qaMode === 'true';
    console.info('[HanglianPad] DocumentUploadPage render');
  }

  private normalizeCategory(value: string): DocumentCategory {
    if (value === 'sop') return 'sop';
    if (value === 'finished_image') return 'finished_image';
    if (value === 'auxiliary_spec') return 'auxiliary_spec';
    if (value === 'notice') return 'notice';
    if (value === 'tooling') return 'tooling';
    return 'original_drawing';
  }

  private categoryLabel(): string {
    return categoryOptionFor(this.category).label;
  }

  private productLabel(): string {
    return this.productModel.length > 0 ? this.productModel : '未选择产品';
  }

  private uiContext(): common.UIAbilityContext {
    return getContext(this) as common.UIAbilityContext;
  }

  private isPdf(file: SelectedUploadFile): boolean {
    return file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }

  private documentTypeFor(file: SelectedUploadFile): DocumentType {
    const pdf = this.isPdf(file);
    if (this.category === 'original_drawing') return pdf ? 'drawing_pdf' : 'finished_detail_image';
    if (this.category === 'sop') return pdf ? 'process_card' : 'sop_image';
    if (this.category === 'finished_image') return pdf ? 'drawing_pdf' : 'finished_detail_image';
    if (this.category === 'auxiliary_spec') return 'connector_manual';
    if (this.category === 'notice') return pdf ? 'process_card' : 'sop_image';
    if (this.category === 'tooling') return 'process_card';
    return 'drawing_pdf';
  }

  private errorMessage(error: Object, fallback: string): string {
    if (error instanceof Error) {
      return error.message;
    }
    return fallback;
  }

  private sourceAction(file: SelectedUploadFile): string {
    if (file.source === 'camera') return 'camera';
    if (file.source === 'file_picker') return 'file_picker';
    return 'file_picker';
  }

  private sourceLabel(file: SelectedUploadFile): string {
    return file.source === 'camera' ? '拍照' : '选择文件';
  }

  private uriScheme(value: string): string {
    const index = value.indexOf(':');
    if (index <= 0) return 'path';
    return value.substring(0, index);
  }

  private cacheFileExists(file: SelectedUploadFile): boolean {
    return this.cacheFileSize(file) > 0;
  }

  private applySelectedFile(file: SelectedUploadFile | undefined): void {
    this.lastUploadErrorSummary = '';
    this.canCopyErrorSummary = false;
    this.showErrorSummaryText = false;
    if (!file) {
      this.selectedFile = undefined;
      this.selectedFileName = '未选择文件';
      this.statusMessage = '未选择文件，请重新选择。';
      this.uploadStatus = '未上传';
      return;
    }
    this.selectedFile = file;
    this.selectedFileName = file.name;
    this.uploadedDocumentId = '';
    this.canPreview = false;
    this.uploadStatus = '未上传';
    this.statusMessage = '文件已选择，可以上传。';
  }

  private async pickFile(): Promise<void> {
    console.info('[HanglianPad] upload pick file clicked');
    try {
      this.applySelectedFile(await FilePickerService.pickDocument(this.uiContext()));
    } catch (error) {
      console.error('[HanglianPad] pick file failed', JSON.stringify(error));
      this.uploadStatus = '选择失败';
      this.statusMessage = '文件读取失败，请重新选择。';
    }
  }

  private async takePhoto(): Promise<void> {
    console.info('[HanglianPad] upload take photo clicked');
    try {
      this.applySelectedFile(await CameraService.takePhoto(this.uiContext()));
    } catch (error) {
      console.error('[HanglianPad] take photo failed', JSON.stringify(error));
      this.uploadStatus = '拍照失败';
      this.statusMessage = '拍照失败，请稍后重试。';
    }
  }

  private cacheFileSize(file: SelectedUploadFile): number {
    if (!file.cachePath || file.cachePath.length === 0) {
      return 0;
    }
    try {
      return fs.statSync(file.cachePath).size;
    } catch (error) {
      console.error('[HanglianPad] cache file check failed', JSON.stringify(error));
      return 0;
    }
  }

  private async validateBeforeUpload(): Promise<string> {
    if (this.productId.length === 0) {
      return '未选择产品，请先在“客户与产品”中创建产品。';
    }
    if (!this.selectedFile) {
      return '请先选择文件或拍照。';
    }
    if (!FilePickerService.isSupported(this.selectedFile.name)) {
      return '文件格式不支持，请选择 PDF、JPG、PNG 或 WEBP。';
    }
    const size = this.cacheFileSize(this.selectedFile);
    if (size <= 0) {
      return '文件读取失败，请重新选择。';
    }
    if (size > MAX_UPLOAD_SIZE) {
      return '文件过大，请更换文件。';
    }
    const token = TokenStorageService.getCachedAccessToken() || await TokenStorageService.getAccessToken();
    if (token.length === 0) {
      return '登录已过期，请重新登录。';
    }
    return '';
  }

  private buildInput(file: SelectedUploadFile): UploadDocumentInput {
    const process: RequiredProcess = 'common';
    const planId = this.uploadPlanId();
    const qaKeywords = this.manualQaActive ? 'field-qa' : this.category;
    const qaRemark = this.manualQaActive ? 'MatePad field QA' : 'MatePad upload';
    const version = this.manualQaActive && this.manualQaVersion.length > 0 ? this.manualQaVersion : 'V1.0';
    return {
      productId: this.productId,
      productModel: this.productModel,
      planId: planId.length > 0 ? planId : undefined,
      category: this.category,
      documentType: this.documentTypeFor(file),
      title: this.title.length > 0 ? this.title : safeDocumentTitle(file.name, this.category),
      version,
      requiredForProcess: process,
      keywords: qaKeywords,
      remark: qaRemark,
      file: file
    };
  }

  private uploadPlanId(): string {
    const value = this.planId.trim();
    if (value.length === 0) return '';
    if (value.startsWith('product-')) return '';
    if (value === this.productId) return '';
    return value;
  }

  private requestPath(url: string): string {
    const marker = '/documents/upload';
    return url.indexOf(marker) >= 0 ? marker : '/documents/upload';
  }

  private fileExt(fileName: string): string {
    const index = fileName.lastIndexOf('.');
    return index >= 0 ? fileName.substring(index).toLowerCase() : '';
  }

  private uploadErrorType(detail: UploadFailedDetail | undefined, error: Object): string {
    if (detail) {
      const raw = `${detail.uploadTaskCode} ${detail.uploadTaskMessage} ${detail.osError} ${detail.rawError}`;
      if (/(^|\D)17(\D|$)|Http protocol error/i.test(raw)) {
        return 'Http protocol error';
      }
      if (detail.requestStatusCode > 0) {
        return `HTTP ${detail.requestStatusCode}`;
      }
      return detail.step;
    }
    if (error instanceof Error) {
      return error.name.length > 0 ? error.name : 'Error';
    }
    return 'Unknown';
  }

  private buildErrorSummary(error: Object, file: SelectedUploadFile): string {
    const detail = UploadService.extractErrorDetail(error);
    const statusCode = detail ? detail.requestStatusCode : 0;
    const requestPath = detail ? (detail.requestPath || this.requestPath(detail.url)) : '/documents/upload';
    const uploadUriScheme = detail ? detail.uploadUriScheme : this.uriScheme(file.uploadUri);
    const errorMessage = detail ? (detail.osError || detail.uploadTaskMessage || detail.rawErrorMessage || '-') : this.errorMessage(error, '-');
    this.multipartFallbackEnabled = detail ? detail.fallbackEnabled : false;
    const lines: string[] = [
      `时间：${detail ? detail.timestamp : new Date().toISOString()}`,
      `操作来源：${this.sourceLabel(file)}`,
      `文件名：${file.name}`,
      `文件类型：${file.mimeType}`,
      `文件大小：${file.size}`,
      `资料类型：${this.categoryLabel()}`,
      `上传阶段：${detail ? detail.step : 'upload'}`,
      `状态码：${statusCode > 0 ? statusCode : '-'}`,
      `错误码：${detail && detail.uploadTaskCode > 0 ? detail.uploadTaskCode : '-'}`,
      `错误信息：${errorMessage}`,
      `requestPath：${requestPath}`,
      `uploadUriScheme：${uploadUriScheme}`,
      `BUILD_INFO commit：${BuildInfo.COMMIT}`
    ];
    return lines.join('\n');
  }

  private logManualUploadFailure(error: Object, file: SelectedUploadFile): void {
    const detail = UploadService.extractErrorDetail(error);
    const payload = detail ?? new UploadFailedDetail();
    payload.source = 'document_upload_page';
    payload.action = this.sourceAction(file);
    payload.step = detail ? detail.step : 'upload_file';
    payload.fileName = file.name;
    payload.fileExt = this.fileExt(file.name);
    payload.mimeType = file.mimeType;
    payload.fileSize = file.size;
    payload.cacheFileExists = this.cacheFileExists(file);
    payload.uploadUriScheme = detail ? detail.uploadUriScheme : this.uriScheme(file.uploadUri);
    payload.uploadUriSample = detail ? detail.uploadUriSample : `${payload.uploadUriScheme}://.../${file.name}`;
    payload.productModel = this.productModel;
    payload.categoryLabel = this.categoryLabel();
    payload.documentType = this.documentTypeFor(file);
    payload.requestPath = detail ? (detail.requestPath || '/documents/upload') : '/documents/upload';
    payload.rawErrorMessage = detail ? detail.rawErrorMessage : this.errorMessage(error, '-');
    payload.timestamp = detail ? detail.timestamp : new Date().toISOString();
    this.manualUploadUriScheme = payload.uploadUriScheme;
    this.multipartFallbackEnabled = payload.fallbackEnabled;
    console.error('[HanglianPad] manual upload failed detail ' + JSON.stringify(payload));
  }

  private async copyErrorSummary(): Promise<void> {
    if (this.lastUploadErrorSummary.length === 0) {
      this.statusMessage = '暂无可复制的错误摘要。';
      return;
    }

    try {
      const systemPasteboard = pasteboard.getSystemPasteboard();
      await systemPasteboard.setData(pasteboard.createPlainTextData(this.lastUploadErrorSummary));
      this.statusMessage = '错误摘要已复制，可粘贴给现场支持。';
    } catch (error) {
      console.error('[HanglianPad] copy upload error summary failed', error);
      this.showErrorSummaryText = true;
      this.statusMessage = '复制失败，请长按下方错误摘要复制。';
    }
  }

  private async upload(): Promise<boolean> {
    console.info('[HanglianPad] upload submit clicked');
    const validation = await this.validateBeforeUpload();
    if (validation.length > 0) {
      this.uploadStatus = '上传失败';
      this.statusMessage = validation;
      return false;
    }

    const file = this.selectedFile as SelectedUploadFile;
    this.isUploading = true;
    this.canPreview = false;
    this.canCopyErrorSummary = false;
    this.showErrorSummaryText = false;
    this.lastUploadErrorSummary = '';
    this.multipartFallbackEnabled = false;
    this.uploadStatus = '正在上传';
    this.statusMessage = '资料正在上传，请稍候。';
    try {
      const input = this.buildInput(file);
      this.manualUploadUriScheme = this.uriScheme(file.uploadUri);
      const documentId = await UploadService.uploadDocument(this.uiContext(), input, (progress: UploadProgress) => {
        this.statusMessage = `资料正在上传：${progress.percent}%`;
      });
      this.uploadedDocumentId = documentId;
      this.canPreview = true;
      this.canCopyErrorSummary = false;
      this.lastUploadErrorSummary = '';
      this.uploadStatus = '上传成功';
      this.statusMessage = '上传成功，资料已更新。';
      return true;
    } catch (error) {
      this.lastUploadErrorSummary = this.buildErrorSummary(error, file);
      this.canCopyErrorSummary = true;
      this.logManualUploadFailure(error, file);
      console.error('[HanglianPad] upload failed summary ' + this.lastUploadErrorSummary.replace(/\n/g, ' | '));
      this.canPreview = false;
      this.uploadStatus = '上传失败';
      this.statusMessage = '上传失败，请检查网络后重试。';
      return false;
    } finally {
      this.isUploading = false;
    }
  }

  private revealQaActions(): void {
    this.qaTapCount += 1;
    if (this.qaTapCount >= 5) {
      this.qaTapCount = 0;
      this.showQaActions = true;
      this.statusMessage = '现场自测入口已开启。';
    }
  }

  private async runManualUploadPageQa(kind: string): Promise<void> {
    if (this.isUploading) return;
    const stamp = `${Date.now()}`;
    const previousTitle = this.title;
    const previousQaActive = this.manualQaActive;
    const previousQaVersion = this.manualQaVersion;
    try {
      this.manualQaActive = true;
      this.manualQaVersion = `V1.0-${stamp}`;
      if (kind === 'pdf') {
        this.title = `FIELD-UPLOAD-PDF-${stamp}`;
        this.applySelectedFile(this.createQaPdfFile(`field-pdf-${stamp}.pdf`));
      } else {
        this.title = `FIELD-UPLOAD-IMAGE-${stamp}`;
        this.applySelectedFile(this.createQaCameraImageFile(`field-camera-${stamp}.jpg`));
      }
      const uploaded = await this.upload();
      let previewReady = false;
      if (uploaded && this.uploadedDocumentId.length > 0) {
        await this.waitForPreviewReady(this.uploadedDocumentId);
        previewReady = true;
      }

      if (kind === 'pdf') {
        this.filePickerPdfUpload = uploaded;
        this.filePickerPdfPreview = previewReady;
      } else {
        this.cameraJpgUpload = uploaded;
        this.cameraJpgPreview = previewReady;
      }
    } catch (error) {
      console.error('[HanglianPad] manual upload page qa failed', error);
      this.statusMessage = '上传失败，请检查网络后重试。';
      if (kind === 'pdf') {
        this.filePickerPdfUpload = false;
        this.filePickerPdfPreview = false;
      } else {
        this.cameraJpgUpload = false;
        this.cameraJpgPreview = false;
      }
    } finally {
      this.title = previousTitle;
      this.manualQaActive = previousQaActive;
      this.manualQaVersion = previousQaVersion;
      this.emitManualUploadPageResult();
    }
  }

  private emitManualUploadPageResult(): void {
    const result: ManualUploadPageResult = {
      filePickerPdfUpload: this.filePickerPdfUpload,
      filePickerPdfPreview: this.filePickerPdfPreview,
      cameraJpgUpload: this.cameraJpgUpload,
      cameraJpgPreview: this.cameraJpgPreview,
      uploadUriScheme: this.manualUploadUriScheme,
      requestUploadFile: true,
      multipartFallback: this.multipartFallbackEnabled
    };
    console.info('[HanglianPad] FIELD_MANUAL_UPLOAD_PAGE_RESULT ' + JSON.stringify(result));
  }

  private async waitForPreviewReady(documentId: string): Promise<void> {
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      const preview = await DocumentPreviewService.getPreview(documentId);
      if (preview.previewStatus === 'ready') {
        return;
      }
      if (preview.previewStatus === 'failed') {
        throw new Error('preview failed');
      }
      await new Promise<void>((resolve: () => void) => setTimeout(resolve, 2000));
    }
    throw new Error('preview timeout');
  }

  private createQaPdfFile(fileName: string): SelectedUploadFile {
    const bytes: number[] = [
      37, 80, 68, 70, 45, 49, 46, 52, 10, 49, 32, 48, 32, 111, 98, 106, 10,
      60, 60, 32, 47, 84, 121, 112, 101, 32, 47, 67, 97, 116, 97, 108, 111,
      103, 32, 47, 80, 97, 103, 101, 115, 32, 50, 32, 48, 32, 82, 32, 62, 62,
      10, 101, 110, 100, 111, 98, 106, 10, 50, 32, 48, 32, 111, 98, 106, 10,
      60, 60, 32, 47, 84, 121, 112, 101, 32, 47, 80, 97, 103, 101, 115, 32,
      47, 75, 105, 100, 115, 32, 91, 51, 32, 48, 32, 82, 93, 32, 47, 67, 111,
      117, 110, 116, 32, 49, 32, 62, 62, 10, 101, 110, 100, 111, 98, 106, 10,
      51, 32, 48, 32, 111, 98, 106, 10, 60, 60, 32, 47, 84, 121, 112, 101,
      32, 47, 80, 97, 103, 101, 32, 47, 80, 97, 114, 101, 110, 116, 32, 50,
      32, 48, 32, 82, 32, 47, 77, 101, 100, 105, 97, 66, 111, 120, 32, 91,
      48, 32, 48, 32, 51, 54, 48, 32, 49, 54, 48, 93, 32, 47, 82, 101, 115,
      111, 117, 114, 99, 101, 115, 32, 60, 60, 32, 47, 70, 111, 110, 116,
      32, 60, 60, 32, 47, 70, 49, 32, 53, 32, 48, 32, 82, 32, 62, 62, 32,
      62, 62, 32, 47, 67, 111, 110, 116, 101, 110, 116, 115, 32, 52, 32, 48,
      32, 82, 32, 62, 62, 10, 101, 110, 100, 111, 98, 106, 10, 52, 32, 48,
      32, 111, 98, 106, 10, 60, 60, 32, 47, 76, 101, 110, 103, 116, 104, 32,
      53, 49, 32, 62, 62, 10, 115, 116, 114, 101, 97, 109, 10, 66, 84, 32,
      47, 70, 49, 32, 50, 48, 32, 84, 102, 32, 51, 54, 32, 57, 54, 32, 84,
      100, 32, 40, 72, 97, 114, 109, 111, 110, 121, 32, 70, 105, 101, 108,
      100, 32, 80, 68, 70, 32, 69, 50, 69, 41, 32, 84, 106, 32, 69, 84, 10,
      101, 110, 100, 115, 116, 114, 101, 97, 109, 10, 101, 110, 100, 111, 98,
      106, 10, 53, 32, 48, 32, 111, 98, 106, 10, 60, 60, 32, 47, 84, 121,
      112, 101, 32, 47, 70, 111, 110, 116, 32, 47, 83, 117, 98, 116, 121,
      112, 101, 32, 47, 84, 121, 112, 101, 49, 32, 47, 66, 97, 115, 101, 70,
      111, 110, 116, 32, 47, 72, 101, 108, 118, 101, 116, 105, 99, 97, 32,
      62, 62, 10, 101, 110, 100, 111, 98, 106, 10, 120, 114, 101, 102, 10,
      48, 32, 54, 10, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 32, 54, 53,
      53, 51, 53, 32, 102, 32, 10, 48, 48, 48, 48, 48, 48, 48, 48, 48, 57,
      32, 48, 48, 48, 48, 48, 32, 110, 32, 10, 48, 48, 48, 48, 48, 48, 48,
      48, 53, 56, 32, 48, 48, 48, 48, 48, 32, 110, 32, 10, 48, 48, 48, 48,
      48, 48, 48, 49, 49, 53, 32, 48, 48, 48, 48, 48, 32, 110, 32, 10, 48,
      48, 48, 48, 48, 48, 48, 50, 52, 49, 32, 48, 48, 48, 48, 48, 32, 110,
      32, 10, 48, 48, 48, 48, 48, 48, 48, 51, 52, 50, 32, 48, 48, 48, 48,
      48, 32, 110, 32, 10, 116, 114, 97, 105, 108, 101, 114, 10, 60, 60, 32,
      47, 83, 105, 122, 101, 32, 54, 32, 47, 82, 111, 111, 116, 32, 49, 32,
      48, 32, 82, 32, 62, 62, 10, 115, 116, 97, 114, 116, 120, 114, 101,
      102, 10, 52, 49, 50, 10, 37, 37, 69, 79, 70, 10
    ];
    return this.createQaFile(fileName, 'application/pdf', bytes, 'test_lab');
  }

  private createQaCameraImageFile(fileName: string): SelectedUploadFile {
    const bytes: number[] = [
      255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0,
      255, 219, 0, 67, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 219,
      0, 67, 1, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 255, 255, 255, 255, 255, 192, 0, 17, 8, 0, 1, 0,
      1, 3, 1, 34, 0, 2, 17, 1, 3, 17, 1, 255, 196, 0, 21, 0, 1, 1, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 255, 196, 0, 20, 16, 1,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 218, 0, 12,
      3, 1, 0, 2, 16, 3, 16, 0, 0, 1, 218, 63, 255, 196, 0, 20, 16, 1,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 218, 0, 8,
      1, 1, 0, 1, 5, 2, 127, 255, 196, 0, 20, 17, 1, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 255, 218, 0, 8, 1, 3, 1, 1, 63,
      1, 63, 255, 196, 0, 20, 17, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 16, 255, 218, 0, 8, 1, 2, 1, 1, 63, 1, 63, 255, 196,
      0, 20, 16, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      255, 218, 0, 8, 1, 1, 0, 6, 63, 2, 127, 255, 217
    ];
    return this.createQaFile(fileName, 'image/jpeg', bytes, 'camera');
  }

  private createQaFile(fileName: string, mimeType: string, bytes: number[], source: UploadSource): SelectedUploadFile {
    const cachePath = `${this.uiContext().cacheDir}/${fileName}`;
    this.writeBytes(cachePath, bytes);
    return {
      uri: cachePath,
      uploadUri: `internal://cache/${fileName}`,
      fallbackUploadUri: fileUri.getUriFromPath(cachePath),
      cachePath,
      name: fileName,
      mimeType,
      size: bytes.length,
      source,
      captureSource: source === 'camera' ? 'environment_camera' : undefined
    };
  }

  private writeBytes(filePath: string, bytes: number[]): void {
    const file = fs.openSync(filePath, fs.OpenMode.CREATE | fs.OpenMode.READ_WRITE);
    try {
      const buffer = new ArrayBuffer(bytes.length);
      const view = new Uint8Array(buffer);
      for (let index = 0; index < bytes.length; index += 1) {
        view[index] = bytes[index];
      }
      fs.writeSync(file.fd, buffer);
    } finally {
      fs.closeSync(file);
    }
  }

  private returnWorkbench(): void {
    console.info('[HanglianPad] upload return workbench clicked');
    router.replaceUrl({ url: 'pages/WorkbenchPage' })
      .catch((error: BusinessError) => {
        console.error('[HanglianPad] upload return workbench failed', error);
        this.statusMessage = '操作失败，请稍后重试。';
      });
  }

  private previewUploaded(): void {
    console.info('[HanglianPad] preview uploaded document clicked');
    if (this.uploadedDocumentId.length === 0) {
      this.statusMessage = '当前资料暂无内容，请先上传。';
      return;
    }
    router.pushUrl({
      url: 'pages/DocumentPreviewPage',
      params: {
        documentId: this.uploadedDocumentId,
        title: this.title
      }
    }).catch((error: BusinessError) => {
      console.error('[HanglianPad] upload preview failed', error);
      this.statusMessage = '操作失败，请稍后重试。';
    });
  }

  build() {
    Column({ space: 14 }) {
      Row({ space: 12 }) {
        Column({ space: 4 }) {
          Text('PDF / 图片资料上传')
            .fontSize(26)
            .fontWeight(FontWeight.Bold)
            .fontColor('#342316')
            .onClick(() => {
              this.revealQaActions();
            })
          Text(this.statusMessage)
            .fontSize(14)
            .fontColor(this.uploadStatus === '上传失败' ? '#B91C1C' : '#76512A')
            .maxLines(2)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Start)

        Button('返回工作台')
          .height(46)
          .width(130)
          .backgroundColor('#342316')
          .fontColor(Color.White)
          .onClick(() => {
            this.returnWorkbench();
          })
      }
      .width('100%')
      .height(84)
      .padding({ left: 16, right: 16 })
      .backgroundColor('#FFF4DE')
      .border({ width: 1, color: '#70482336', radius: 8 })

      Column({ space: 12 }) {
        Row() {
          Text('当前产品')
            .width(140)
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor('#76512A')
          Text(this.productLabel())
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor('#342316')
            .layoutWeight(1)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
        }
        Row() {
          Text('资料类型')
            .width(140)
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor('#76512A')
          Text(this.categoryLabel())
            .fontSize(18)
            .fontColor('#342316')
            .layoutWeight(1)
        }
        Row() {
          Text('已选择文件')
            .width(140)
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor('#76512A')
          Text(this.selectedFileName)
            .fontSize(18)
            .fontColor('#342316')
            .layoutWeight(1)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
        }
        Row() {
          Text('上传状态')
            .width(140)
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor('#76512A')
          Text(this.uploadStatus)
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor(this.uploadStatus === '上传成功' ? '#2F6B4F' : this.uploadStatus === '上传失败' ? '#B91C1C' : '#9C5725')
            .layoutWeight(1)
        }
      }
      .width('100%')
      .padding(18)
      .backgroundColor('#FFFFFF')
      .border({ width: 1, color: '#E1E8E2', radius: 8 })

      Row({ space: 12 }) {
        Button('选择文件')
          .height(56)
          .layoutWeight(1)
          .backgroundColor('#2F6B4F')
          .fontColor(Color.White)
          .onClick(() => {
            void this.pickFile();
          })
        Button('拍照')
          .height(56)
          .layoutWeight(1)
          .backgroundColor('#614C8A')
          .fontColor(Color.White)
          .onClick(() => {
            void this.takePhoto();
          })
        Button(this.isUploading ? '上传中...' : '上传')
          .height(56)
          .layoutWeight(1)
          .backgroundColor('#C87934')
          .fontColor(Color.White)
          .onClick(() => {
            if (!this.isUploading) {
              void this.upload();
            }
          })
        Button('预览资料')
          .height(56)
          .layoutWeight(1)
          .backgroundColor(this.canPreview ? '#8F3F1D' : '#B9A79B')
          .fontColor(Color.White)
          .onClick(() => {
            this.previewUploaded();
          })
      }
      .width('100%')

      if (this.canCopyErrorSummary) {
        Button('复制错误摘要')
          .height(48)
          .width(180)
          .backgroundColor('#8F3F1D')
          .fontColor(Color.White)
          .onClick(() => {
            void this.copyErrorSummary();
          })
      }

      if (this.showErrorSummaryText) {
        Text(this.lastUploadErrorSummary)
          .fontSize(12)
          .fontColor('#6F5845')
          .width('100%')
          .maxLines(8)
          .padding(12)
          .backgroundColor('#FFF8EA')
          .border({ width: 1, color: '#70482336', radius: 8 })
      }

      if (this.showQaActions) {
        Row({ space: 12 }) {
          Button('生成测试PDF并上传')
            .height(48)
            .layoutWeight(1)
            .backgroundColor('#2F6B4F')
            .fontColor(Color.White)
            .onClick(() => {
              void this.runManualUploadPageQa('pdf');
            })
          Button('生成测试图片并上传')
            .height(48)
            .layoutWeight(1)
            .backgroundColor('#614C8A')
            .fontColor(Color.White)
            .onClick(() => {
              void this.runManualUploadPageQa('image');
            })
        }
        .width('100%')
      }

      Blank()
    }
    .width('100%')
    .height('100%')
    .padding(12)
    .backgroundColor('#F7F2EA')
  }
}
