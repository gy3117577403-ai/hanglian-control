import common from '@ohos.app.ability.common';
import router from '@ohos.router';
import { BusinessError } from '@ohos.base';
import {
  categoryOptionFor,
  DocumentCategory,
  RequiredProcess,
  SelectedUploadFile,
  UploadDocumentInput,
  UploadProgress,
  safeDocumentTitle
} from '../models/DocumentModels';
import { CameraService } from '../services/CameraService';
import { FilePickerService } from '../services/FilePickerService';
import { UploadService } from '../services/UploadService';

interface UploadRouteParams {
  productId?: string;
  planId?: string;
  category?: string;
  title?: string;
}

@Entry
@Component
struct DocumentUploadPage {
  @State private productId: string = '';
  @State private planId: string = '';
  @State private category: DocumentCategory = 'original_drawing';
  @State private title: string = '原图';
  @State private selectedFileName: string = '';
  @State private selectedFileUri: string = '';
  @State private uploadedDocumentId: string = '';
  @State private progressText: string = '等待选择文件';
  @State private loadingText: string = '上传页已加载';
  @State private lastAction: string = '等待操作';
  @State private errorText: string = '';
  @State private tapCount: number = 0;
  private selectedFile: SelectedUploadFile | undefined = undefined;

  aboutToAppear(): void {
    const params = router.getParams() as UploadRouteParams;
    this.productId = params?.productId ?? '';
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

  private bump(action: string): void {
    this.tapCount += 1;
    this.lastAction = action;
    console.info(`[HanglianPad] ${action}`);
  }

  private errorMessage(error: Object, fallback: string): string {
    if (error instanceof Error) {
      return error.message;
    }
    return fallback;
  }

  private uiContext(): common.UIAbilityContext {
    return getContext(this) as common.UIAbilityContext;
  }

  private applySelectedFile(file: SelectedUploadFile | undefined): void {
    if (!file) {
      this.loadingText = '未选择文件';
      return;
    }
    this.selectedFile = file;
    this.selectedFileName = file.name;
    this.selectedFileUri = file.uri;
    this.uploadedDocumentId = '';
    this.progressText = `已选择：${file.name}`;
    this.loadingText = '文件已准备，可以上传。';
  }

  private async pickFile(): Promise<void> {
    this.bump('upload pick file clicked');
    this.errorText = '';
    try {
      this.applySelectedFile(await FilePickerService.pickDocument(this.uiContext()));
    } catch (error) {
      this.errorText = this.errorMessage(error, '选择文件失败');
      this.lastAction = `pick file failed: ${this.errorText}`;
    }
  }

  private async takePhoto(): Promise<void> {
    this.bump('upload take photo clicked');
    this.errorText = '';
    try {
      this.applySelectedFile(await CameraService.takePhoto(this.uiContext()));
    } catch (error) {
      this.errorText = this.errorMessage(error, '拍照失败');
      this.lastAction = `take photo failed: ${this.errorText}`;
    }
  }

  private buildInput(file: SelectedUploadFile): UploadDocumentInput {
    const option = categoryOptionFor(this.category);
    const process: RequiredProcess = 'common';
    return {
      productId: this.productId,
      planId: this.planId.length > 0 ? this.planId : undefined,
      category: this.category,
      documentType: option.documentType,
      title: this.title.length > 0 ? this.title : safeDocumentTitle(file.name, this.category),
      version: 'V1.0',
      requiredForProcess: process,
      keywords: this.category,
      remark: 'MatePad MVP upload',
      file: file
    };
  }

  private async upload(): Promise<void> {
    this.bump('upload submit clicked');
    this.errorText = '';
    if (this.productId.length === 0) {
      this.errorText = '缺少 productId，请先在客户与产品页面创建或选择产品。';
      this.lastAction = 'upload failed: missing productId';
      return;
    }
    if (!this.selectedFile) {
      this.errorText = '请先选择文件或拍照。';
      this.lastAction = 'upload failed: missing file';
      return;
    }

    this.loadingText = '正在上传资料...';
    this.progressText = '0%';
    try {
      const input = this.buildInput(this.selectedFile);
      const documentId = await UploadService.uploadDocument(this.uiContext(), input, (progress: UploadProgress) => {
        this.progressText = `${progress.percent}%`;
      });
      this.uploadedDocumentId = documentId;
      this.loadingText = '上传成功';
      this.lastAction = `upload success: ${documentId}`;
    } catch (error) {
      this.errorText = this.errorMessage(error, '上传失败');
      this.loadingText = '上传失败';
      this.lastAction = `upload failed: ${this.errorText}`;
    }
  }

  private returnWorkbench(): void {
    this.bump('return workbench clicked');
    router.replaceUrl({ url: 'pages/WorkbenchPage' })
      .catch((error: BusinessError) => {
        this.errorText = `返回工作台失败：${error.code} / ${error.message}`;
        this.lastAction = this.errorText;
      });
  }

  private previewUploaded(): void {
    this.bump('preview uploaded document clicked');
    if (this.uploadedDocumentId.length === 0) {
      this.errorText = '暂无 documentId，上传成功后才能预览。';
      return;
    }
    router.pushUrl({
      url: 'pages/DocumentPreviewPage',
      params: {
        documentId: this.uploadedDocumentId,
        title: this.title
      }
    }).catch((error: BusinessError) => {
      this.errorText = `预览跳转失败：${error.code} / ${error.message}`;
      this.lastAction = this.errorText;
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
          Text(this.loadingText)
            .fontSize(14)
            .fontColor(this.errorText.length > 0 ? '#B91C1C' : '#76512A')
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

      Column({ space: 8 }) {
        Text(`productId: ${this.productId || '-'}`)
          .fontSize(15)
          .fontColor('#342316')
        Text(`category: ${this.category} / documentType: ${categoryOptionFor(this.category).documentType}`)
          .fontSize(15)
          .fontColor('#342316')
        Text(`title: ${this.title}`)
          .fontSize(15)
          .fontColor('#342316')
        Text(`file: ${this.selectedFileName || '-'} / ${this.selectedFileUri || '-'}`)
          .fontSize(14)
          .fontColor('#76512A')
          .maxLines(2)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
        Text(`documentId: ${this.uploadedDocumentId || '-'}`)
          .fontSize(15)
          .fontWeight(FontWeight.Bold)
          .fontColor('#2F6B4F')
      }
      .width('100%')
      .padding(16)
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
        Button('上传')
          .height(56)
          .layoutWeight(1)
          .backgroundColor('#C87934')
          .fontColor(Color.White)
          .onClick(() => {
            void this.upload();
          })
        Button('预览该文档')
          .height(56)
          .layoutWeight(1)
          .backgroundColor('#8F3F1D')
          .fontColor(Color.White)
          .onClick(() => {
            this.previewUploaded();
          })
      }
      .width('100%')

      Column({ space: 6 }) {
        Text(`progress: ${this.progressText}`)
          .fontSize(14)
          .fontColor('#342316')
        Text(`tapCount: ${this.tapCount} / lastAction: ${this.lastAction}`)
          .fontSize(13)
          .fontColor('#6F5845')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
        Text(this.errorText.length > 0 ? `errorText: ${this.errorText}` : 'errorText: -')
          .fontSize(13)
          .fontColor(this.errorText.length > 0 ? '#B91C1C' : '#6F5845')
          .maxLines(2)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
      }
      .width('100%')
      .padding(14)
      .backgroundColor('#FFF8EC')
      .borderRadius(8)

      Blank()
    }
    .width('100%')
    .height('100%')
    .padding(12)
    .backgroundColor('#F7F2EA')
  }
}
