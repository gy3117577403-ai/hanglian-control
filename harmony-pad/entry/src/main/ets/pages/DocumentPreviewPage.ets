import common from '@ohos.app.ability.common';
import router from '@ohos.router';
import { BusinessError } from '@ohos.base';
import { DocumentPreviewPageItem, DocumentPreviewResponse, UploadProgress } from '../models/DocumentModels';
import { DocumentPreviewService } from '../services/DocumentPreviewService';
import { DownloadService } from '../services/DownloadService';

interface PreviewRouteParams {
  documentId?: string;
  title?: string;
}

@Entry
@Component
struct DocumentPreviewPage {
  @State private documentId: string = '';
  @State private title: string = '资料预览';
  @State private preview: DocumentPreviewResponse | undefined = undefined;
  @State private loadingText: string = '预览页已加载';
  @State private errorText: string = '';
  @State private lastAction: string = '等待操作';
  @State private downloading: boolean = false;
  @State private downloadPercent: number = 0;
  @State private tapCount: number = 0;

  aboutToAppear(): void {
    const params = router.getParams() as PreviewRouteParams;
    this.documentId = params?.documentId ?? '';
    this.title = params?.title ?? '资料预览';
    console.info('[HanglianPad] DocumentPreviewPage render');
    void this.loadPreview();
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

  private async loadPreview(): Promise<void> {
    this.bump('document preview refresh clicked');
    this.errorText = '';
    if (this.documentId.length === 0) {
      this.loadingText = '缺少 documentId';
      this.lastAction = 'preview missing documentId';
      return;
    }

    this.loadingText = '正在加载预览...';
    try {
      this.preview = await DocumentPreviewService.getPreview(this.documentId);
      this.title = this.preview.title || this.title;
      this.loadingText = `预览状态：${this.preview.previewStatus}`;
      this.lastAction = `preview load success: ${this.documentId}`;
    } catch (error) {
      this.errorText = this.errorMessage(error, '预览加载失败');
      this.loadingText = '预览加载失败';
      this.lastAction = `preview load failed: ${this.errorText}`;
    }
  }

  private async downloadOriginal(): Promise<void> {
    this.bump('download original clicked');
    if (this.documentId.length === 0) {
      this.errorText = '缺少 documentId，无法下载。';
      return;
    }
    this.downloading = true;
    this.downloadPercent = 0;
    try {
      const filePath = await DownloadService.downloadOriginal(this.uiContext(), this.documentId, this.title, (progress: UploadProgress) => {
        this.downloadPercent = progress.percent;
      });
      this.loadingText = `已下载到：${filePath}`;
      this.lastAction = `download success: ${filePath}`;
    } catch (error) {
      this.errorText = this.errorMessage(error, '下载失败');
      this.lastAction = `download failed: ${this.errorText}`;
    } finally {
      this.downloading = false;
    }
  }

  private returnWorkbench(): void {
    this.bump('preview return workbench clicked');
    router.replaceUrl({ url: 'pages/WorkbenchPage' })
      .catch((error: BusinessError) => {
        this.errorText = `返回工作台失败：${error.code} / ${error.message}`;
        this.lastAction = this.errorText;
      });
  }

  private previewPages(): DocumentPreviewPageItem[] {
    return this.preview ? this.preview.pages : [];
  }

  private isReady(): boolean {
    return this.preview ? this.preview.previewStatus === 'ready' : false;
  }

  @Builder
  private StatusPanel() {
    Column({ space: 12 }) {
      if (this.documentId.length === 0) {
        Text('缺少 documentId')
          .fontSize(22)
          .fontWeight(FontWeight.Bold)
          .fontColor('#B91C1C')
      } else if (!this.preview) {
        Text(this.loadingText)
          .fontSize(18)
          .fontColor('#475569')
      } else if (this.preview.previewStatus === 'pending') {
        LoadingProgress()
        Text('预览转换中，请稍后刷新')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor('#1E293B')
      } else if (this.preview.previewStatus === 'failed') {
        Text('预览转换失败')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor('#B91C1C')
        Text(this.preview.errorMessage ?? '未返回失败原因')
          .fontSize(14)
          .fontColor('#64748B')
          .textAlign(TextAlign.Center)
      } else {
        Text('暂无预览页')
          .fontSize(18)
          .fontColor('#475569')
      }
      Button('刷新')
        .height(46)
        .width(120)
        .backgroundColor('#2F6B4F')
        .fontColor(Color.White)
        .onClick(() => {
          void this.loadPreview();
        })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
  }

  @Builder
  private PagesPanel() {
    Scroll() {
      Column({ space: 14 }) {
        ForEach(this.previewPages(), (page: DocumentPreviewPageItem) => {
          Column({ space: 8 }) {
            Text(`第 ${page.pageNo} 页`)
              .fontSize(13)
              .fontColor('#475569')
              .width('100%')
            Image(page.imageUrl)
              .width('100%')
              .objectFit(ImageFit.Contain)
              .backgroundColor('#FFFFFF')
              .borderRadius(6)
              .border({ width: 1, color: '#E2E8F0' })
          }
          .width('100%')
        }, (page: DocumentPreviewPageItem) => `${page.pageNo}-${page.imageUrl}`)
      }
      .padding(12)
      .width('100%')
    }
    .width('100%')
    .layoutWeight(1)
  }

  build() {
    Column({ space: 0 }) {
      Row({ space: 10 }) {
        Button('返回工作台')
          .height(44)
          .width(120)
          .backgroundColor('#342316')
          .fontColor(Color.White)
          .onClick(() => {
            this.returnWorkbench();
          })
        Column({ space: 2 }) {
          Text(this.title)
            .fontSize(20)
            .fontWeight(FontWeight.Bold)
            .fontColor('#111827')
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
          Text(this.preview ? `${this.preview.fileType} / ${this.preview.pageCount} 页 / ${this.preview.previewStatus}` : `documentId: ${this.documentId || '-'}`)
            .fontSize(12)
            .fontColor('#64748B')
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
        }
        .layoutWeight(1)
        Button('刷新')
          .height(44)
          .width(90)
          .backgroundColor('#2F6B4F')
          .fontColor(Color.White)
          .onClick(() => {
            void this.loadPreview();
          })
        Button(this.downloading ? `${this.downloadPercent}%` : '下载原文件')
          .height(44)
          .width(120)
          .backgroundColor('#C87934')
          .fontColor(Color.White)
          .onClick(() => {
            void this.downloadOriginal();
          })
      }
      .padding({ left: 16, right: 16, top: 14, bottom: 12 })
      .width('100%')
      .backgroundColor('#FFFFFF')
      .border({ width: 1, color: '#E2E8F0' })

      if (this.isReady()) {
        this.PagesPanel()
      } else {
        this.StatusPanel()
      }

      Column({ space: 4 }) {
        Text(`tapCount: ${this.tapCount} / lastAction: ${this.lastAction}`)
          .fontSize(12)
          .fontColor('#6F5845')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
        Text(this.errorText.length > 0 ? `errorText: ${this.errorText}` : 'errorText: -')
          .fontSize(12)
          .fontColor(this.errorText.length > 0 ? '#B91C1C' : '#6F5845')
          .maxLines(2)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
      }
      .width('100%')
      .padding(10)
      .backgroundColor('#FFF8EC')
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F8FAFC')
  }
}
