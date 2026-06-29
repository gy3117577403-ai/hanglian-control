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
  @State private statusText: string = '预览页已加载。';
  @State private errorText: string = '';
  @State private downloading: boolean = false;
  @State private downloadPercent: number = 0;

  aboutToAppear(): void {
    const params = router.getParams() as PreviewRouteParams;
    this.documentId = params?.documentId ?? '';
    this.title = params?.title ?? '资料预览';
    console.info('[HanglianPad] DocumentPreviewPage render');
    void this.loadPreview();
  }

  private logAction(action: string): void {
    console.info(`[HanglianPad] ${action}`);
  }

  private uiContext(): common.UIAbilityContext {
    return getContext(this) as common.UIAbilityContext;
  }

  private async loadPreview(): Promise<void> {
    this.logAction('document preview refresh clicked');
    this.errorText = '';
    if (this.documentId.length === 0) {
      this.statusText = '缺少资料信息，无法预览。';
      return;
    }

    this.statusText = '正在加载预览...';
    try {
      this.preview = await DocumentPreviewService.getPreview(this.documentId);
      this.title = this.preview.title || this.title;
      if (this.preview.previewStatus === 'ready') {
        this.statusText = '预览已加载。';
      } else if (this.preview.previewStatus === 'pending') {
        this.statusText = '资料转换中，请稍后刷新。';
      } else {
        this.statusText = '预览转换失败，请稍后重试。';
      }
    } catch (error) {
      console.error('[HanglianPad] preview load failed', error);
      this.errorText = '网络异常，请稍后重试。';
      this.statusText = this.errorText;
    }
  }

  private async downloadOriginal(): Promise<void> {
    this.logAction('download original clicked');
    if (this.documentId.length === 0) {
      this.statusText = '缺少资料信息，无法下载。';
      return;
    }
    this.downloading = true;
    this.downloadPercent = 0;
    try {
      await DownloadService.downloadOriginal(this.uiContext(), this.documentId, this.title, (progress: UploadProgress) => {
        this.downloadPercent = progress.percent;
      });
      this.statusText = '已完成。';
    } catch (error) {
      console.error('[HanglianPad] download failed', error);
      this.errorText = '操作失败，请稍后重试。';
      this.statusText = this.errorText;
    } finally {
      this.downloading = false;
    }
  }

  private returnWorkbench(): void {
    this.logAction('preview return workbench clicked');
    router.replaceUrl({ url: 'pages/WorkbenchPage' })
      .catch((error: BusinessError) => {
        console.error('[HanglianPad] preview return workbench failed', error);
        this.statusText = '操作失败，请稍后重试。';
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
        Text('缺少资料信息，无法预览')
          .fontSize(22)
          .fontWeight(FontWeight.Bold)
          .fontColor('#B91C1C')
      } else if (!this.preview) {
        Text(this.statusText)
          .fontSize(18)
          .fontColor('#475569')
      } else if (this.preview.previewStatus === 'pending') {
        LoadingProgress()
        Text('资料转换中，请稍后刷新')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor('#1E293B')
      } else if (this.preview.previewStatus === 'failed') {
        Text('预览转换失败')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor('#B91C1C')
      } else {
        Text('当前资料暂无内容，请先上传')
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
          Text(this.statusText)
            .fontSize(12)
            .fontColor(this.errorText.length > 0 ? '#B91C1C' : '#64748B')
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
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F8FAFC')
  }
}
