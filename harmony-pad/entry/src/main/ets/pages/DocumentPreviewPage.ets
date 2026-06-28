import common from '@ohos.app.ability.common';
import promptAction from '@ohos.promptAction';
import router from '@ohos.router';
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
  @State private loading: boolean = false;
  @State private downloading: boolean = false;
  @State private downloadPercent: number = 0;

  aboutToAppear(): void {
    const params = router.getParams() as PreviewRouteParams;
    this.documentId = params?.documentId ?? '';
    this.title = params?.title ?? '资料预览';
    void this.loadPreview();
  }

  private async loadPreview(): Promise<void> {
    if (!this.documentId) return;
    this.loading = true;
    try {
      this.preview = await DocumentPreviewService.getPreview(this.documentId);
      this.title = this.preview.title || this.title;
    } catch (error) {
      promptAction.showToast({ message: `预览加载失败：${this.errorMessage(error)}` });
    } finally {
      this.loading = false;
    }
  }

  private async downloadOriginal(): Promise<void> {
    if (!this.documentId) return;
    const context = getContext(this) as common.UIAbilityContext;
    this.downloading = true;
    this.downloadPercent = 0;
    try {
      const filePath = await DownloadService.downloadOriginal(context, this.documentId, this.title, (progress: UploadProgress) => {
        this.downloadPercent = progress.percent;
      });
      promptAction.showToast({ message: `已下载到：${filePath}` });
    } catch (error) {
      promptAction.showToast({ message: `下载失败：${this.errorMessage(error)}` });
    } finally {
      this.downloading = false;
    }
  }

  private errorMessage(error: Object): string {
    if (error instanceof Error) return error.message;
    return JSON.stringify(error);
  }

  private previewPages(): DocumentPreviewPageItem[] {
    return this.preview ? this.preview.pages : [];
  }

  private isReady(): boolean {
    return this.preview ? this.preview.previewStatus === 'ready' : false;
  }

  @Builder
  private buildStatus() {
    if (this.loading) {
      Column({ space: 12 }) {
        LoadingProgress()
        Text('正在加载预览')
          .fontSize(16)
          .fontColor('#475569')
      }
      .width('100%')
      .height('100%')
      .justifyContent(FlexAlign.Center)
    } else if (!this.preview) {
      Column({ space: 12 }) {
        Text('暂无预览数据')
          .fontSize(16)
          .fontColor('#475569')
        Button('刷新')
          .onClick(() => void this.loadPreview())
      }
      .width('100%')
      .height('100%')
      .justifyContent(FlexAlign.Center)
    } else if (this.preview.previewStatus === 'pending') {
      Column({ space: 12 }) {
        LoadingProgress()
        Text('转换中')
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor('#1E293B')
        Button('刷新')
          .onClick(() => void this.loadPreview())
      }
      .width('100%')
      .height('100%')
      .justifyContent(FlexAlign.Center)
    } else if (this.preview.previewStatus === 'failed') {
      Column({ space: 12 }) {
        Text('预览转换失败')
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor('#B91C1C')
        Text(this.preview.errorMessage ?? '未返回失败原因')
          .fontSize(14)
          .fontColor('#64748B')
          .textAlign(TextAlign.Center)
        Button('刷新')
          .onClick(() => void this.loadPreview())
      }
      .padding(18)
      .width('100%')
      .height('100%')
      .justifyContent(FlexAlign.Center)
    }
  }

  @Builder
  private buildPages() {
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
    Column() {
      Row({ space: 10 }) {
        Button('返回')
          .type(ButtonType.Normal)
          .onClick(() => router.back())
        Column({ space: 2 }) {
          Text(this.title)
            .fontSize(20)
            .fontWeight(FontWeight.Bold)
            .fontColor('#111827')
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
          Text(this.preview ? `${this.preview.fileType} / ${this.preview.pageCount} 页` : this.documentId)
            .fontSize(12)
            .fontColor('#64748B')
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
        }
        .layoutWeight(1)
        Button('刷新')
          .enabled(!this.loading)
          .onClick(() => void this.loadPreview())
        Button(this.downloading ? `${this.downloadPercent}%` : '下载原文件')
          .enabled(!this.downloading)
          .onClick(() => void this.downloadOriginal())
      }
      .padding({ left: 16, right: 16, top: 14, bottom: 12 })
      .width('100%')
      .backgroundColor('#FFFFFF')
      .border({ width: 1, color: '#E2E8F0' })

      if (this.isReady()) {
        this.buildPages()
      } else {
        this.buildStatus()
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F8FAFC')
  }
}
