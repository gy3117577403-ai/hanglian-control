import common from '@ohos.app.ability.common';
import fs from '@ohos.file.fs';
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
  UploadProgress,
  safeDocumentTitle
} from '../models/DocumentModels';
import { CameraService } from '../services/CameraService';
import { FilePickerService } from '../services/FilePickerService';
import { TokenStorageService } from '../services/TokenStorageService';
import { UploadFailedDetail, UploadService } from '../services/UploadService';

interface UploadRouteParams {
  productId?: string;
  productModel?: string;
  planId?: string;
  category?: string;
  title?: string;
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
  private selectedFile: SelectedUploadFile | undefined = undefined;
  private uploadedDocumentId: string = '';
  private lastUploadErrorSummary: string = '';

  aboutToAppear(): void {
    const params = router.getParams() as UploadRouteParams;
    this.productId = params?.productId ?? '';
    this.productModel = params?.productModel ?? '';
    this.planId = params?.planId ?? '';
    this.category = this.normalizeCategory(params?.category ?? 'original_drawing');
    this.title = params?.title ?? categoryOptionFor(this.category).label;
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

  private applySelectedFile(file: SelectedUploadFile | undefined): void {
    this.lastUploadErrorSummary = '';
    this.canCopyErrorSummary = false;
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
    return {
      productId: this.productId,
      productModel: this.productModel,
      planId: this.planId.length > 0 ? this.planId : undefined,
      category: this.category,
      documentType: this.documentTypeFor(file),
      title: this.title.length > 0 ? this.title : safeDocumentTitle(file.name, this.category),
      version: 'V1.0',
      requiredForProcess: process,
      keywords: this.category,
      remark: 'MatePad upload',
      file: file
    };
  }

  private requestPath(url: string): string {
    const marker = '/documents/upload';
    return url.indexOf(marker) >= 0 ? marker : '/documents/upload';
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
    const requestPath = detail ? this.requestPath(detail.url) : '/documents/upload';
    const lines: string[] = [
      `上传失败阶段：${detail ? detail.step : 'upload'}`,
      `文件名：${file.name}`,
      `文件类型：${file.mimeType}`,
      `文件大小：${file.size}`,
      `后端状态码：${statusCode > 0 ? statusCode : '-'}`,
      `错误类型：${this.uploadErrorType(detail, error)}`,
      `请求路径：${requestPath}`,
      `时间：${detail ? detail.timestamp : new Date().toISOString()}`
    ];
    return lines.join('\n');
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
      this.statusMessage = '复制失败，请稍后重试。';
    }
  }

  private async upload(): Promise<void> {
    console.info('[HanglianPad] upload submit clicked');
    const validation = await this.validateBeforeUpload();
    if (validation.length > 0) {
      this.uploadStatus = '上传失败';
      this.statusMessage = validation;
      return;
    }

    const file = this.selectedFile as SelectedUploadFile;
    this.isUploading = true;
    this.canPreview = false;
    this.canCopyErrorSummary = false;
    this.lastUploadErrorSummary = '';
    this.uploadStatus = '正在上传';
    this.statusMessage = '资料正在上传，请稍候。';
    try {
      const input = this.buildInput(file);
      const documentId = await UploadService.uploadDocument(this.uiContext(), input, (progress: UploadProgress) => {
        this.statusMessage = `资料正在上传：${progress.percent}%`;
      });
      this.uploadedDocumentId = documentId;
      this.canPreview = true;
      this.canCopyErrorSummary = false;
      this.lastUploadErrorSummary = '';
      this.uploadStatus = '上传成功';
      this.statusMessage = '上传成功，资料已更新。';
    } catch (error) {
      this.lastUploadErrorSummary = this.buildErrorSummary(error, file);
      this.canCopyErrorSummary = true;
      console.error('[HanglianPad] upload failed summary ' + this.lastUploadErrorSummary.replace(/\n/g, ' | '));
      this.canPreview = false;
      this.uploadStatus = '上传失败';
      this.statusMessage = '上传失败，请检查网络后重试。';
    } finally {
      this.isUploading = false;
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

      Blank()
    }
    .width('100%')
    .height('100%')
    .padding(12)
    .backgroundColor('#F7F2EA')
  }
}
