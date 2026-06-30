import router from '@ohos.router';
import { BusinessError } from '@ohos.base';
import { RecycleBinFilter, RecycleBinService } from '../services/RecycleBinService';
import { RecycleBinItem, RecycleEntityType } from '../services/DomainModels';

interface RecycleBinListResponse {
  data?: RecycleBinItem[];
  items?: RecycleBinItem[];
}

@Entry
@Component
struct RecycleBinPage {
  @State private recycleItems: RecycleBinItem[] = [];
  @State private customerFilter: string = '';
  @State private productFilter: string = '';
  @State private entityTypeFilter: string = '';
  @State private statusText: string = '回收站页面已加载';
  @State private feedbackText: string = '';
  @State private loading: boolean = false;

  aboutToAppear(): void {
    console.info('[HanglianPad] RecycleBinPage render');
    void this.refresh();
  }

  private filter(): RecycleBinFilter {
    return {
      customer: this.customerFilter.trim(),
      product: this.productFilter.trim(),
      entityType: this.entityTypeFilter
    };
  }

  private normalizeItems(result: RecycleBinListResponse | RecycleBinItem[] | undefined | null): RecycleBinItem[] {
    if (Array.isArray(result)) {
      return result;
    }
    if (result && Array.isArray(result.items)) {
      return result.items;
    }
    if (result && Array.isArray(result.data)) {
      return result.data;
    }
    return [];
  }

  private async refresh(): Promise<void> {
    this.loading = true;
    this.feedbackText = '';
    this.statusText = '正在加载回收站资料...';
    try {
      const result = await RecycleBinService.list(this.filter());
      this.recycleItems = this.normalizeItems(result.data);
      this.statusText = this.recycleItems.length > 0 ? '回收站资料已更新' : '暂无回收站资料';
    } catch (error) {
      console.error('[HanglianPad] RecycleBinPage load failed', error);
      this.recycleItems = [];
      this.feedbackText = '回收站加载失败，请稍后重试';
      this.statusText = this.feedbackText;
    } finally {
      this.loading = false;
    }
  }

  private async restoreItem(item: RecycleBinItem): Promise<void> {
    const id = this.safeText(item.id, '');
    if (id.length === 0) {
      this.feedbackText = '恢复失败，请稍后重试';
      return;
    }

    this.feedbackText = '正在恢复资料...';
    try {
      await RecycleBinService.restore(id);
      this.feedbackText = '恢复成功';
      await this.refresh();
    } catch (error) {
      console.error('[HanglianPad] RecycleBinPage restore failed', error);
      this.feedbackText = '恢复失败，请稍后重试';
      this.statusText = this.feedbackText;
    }
  }

  private async deleteItem(item: RecycleBinItem): Promise<void> {
    const id = this.safeText(item.id, '');
    if (id.length === 0) {
      this.feedbackText = '彻底删除失败，请稍后重试';
      return;
    }

    this.feedbackText = '正在彻底删除资料...';
    try {
      await RecycleBinService.purge(id);
      this.feedbackText = '彻底删除成功';
      await this.refresh();
    } catch (error) {
      console.error('[HanglianPad] RecycleBinPage delete failed', error);
      this.feedbackText = '彻底删除失败，请稍后重试';
      this.statusText = this.feedbackText;
    }
  }

  private returnWorkbench(): void {
    router.replaceUrl({ url: 'pages/WorkbenchPage' })
      .catch((error: BusinessError) => {
        console.error('[HanglianPad] RecycleBinPage return failed', error);
        this.feedbackText = '返回工作台失败，请稍后重试';
      });
  }

  private resetFilter(): void {
    this.customerFilter = '';
    this.productFilter = '';
    this.entityTypeFilter = '';
    void this.refresh();
  }

  private safeText(value: string | undefined | null, fallback: string = '-'): string {
    const text = value ? `${value}`.trim() : '';
    return text.length > 0 ? text : fallback;
  }

  private entityLabel(type: RecycleEntityType | undefined | null): string {
    const text = this.safeText(type, '资料');
    if (text === '客户' || text === '产品' || text === '工艺参数' || text === '资料') {
      return text;
    }
    return '资料';
  }

  private entityColor(type: RecycleEntityType | undefined | null): string {
    const text = this.entityLabel(type);
    if (text === '客户') {
      return '#2F6B4F';
    }
    if (text === '产品') {
      return '#9C5725';
    }
    if (text === '工艺参数') {
      return '#614C8A';
    }
    return '#8F3F1D';
  }

  build() {
    Column({ space: 12 }) {
      this.Header();
      this.FilterPanel();
      this.ListPanel();
      this.StatusPanel();
    }
    .width('100%')
    .height('100%')
    .padding(12)
    .backgroundColor('#F7F2EA')
  }

  @Builder
  private Header() {
    Row({ space: 10 }) {
      Text('回收站')
        .fontSize(26)
        .fontWeight(FontWeight.Bold)
        .fontColor('#342316')
        .layoutWeight(1)
      Button('刷新')
        .height(46)
        .width(92)
        .backgroundColor('#2F6B4F')
        .fontColor(Color.White)
        .onClick(() => {
          void this.refresh();
        })
      Button('返回工作台')
        .height(46)
        .width(128)
        .backgroundColor('#342316')
        .fontColor(Color.White)
        .onClick(() => {
          this.returnWorkbench();
        })
    }
    .width('100%')
    .height(82)
    .padding({ left: 16, right: 16 })
    .backgroundColor('#FFF4DE')
    .border({ width: 1, color: '#70482336', radius: 8 })
  }

  @Builder
  private FilterPanel() {
    Row({ space: 10 }) {
      TextInput({ placeholder: '按客户筛选', text: this.customerFilter })
        .height(46)
        .layoutWeight(1)
        .backgroundColor('#FFFCF4')
        .onChange((value: string) => {
          this.customerFilter = value;
        })
      TextInput({ placeholder: '按产品或资料名称筛选', text: this.productFilter })
        .height(46)
        .layoutWeight(1)
        .backgroundColor('#FFFCF4')
        .onChange((value: string) => {
          this.productFilter = value;
        })
      Button('应用筛选')
        .height(46)
        .width(110)
        .backgroundColor('#C87934')
        .fontColor(Color.White)
        .onClick(() => {
          void this.refresh();
        })
      Button('重置筛选')
        .height(46)
        .width(110)
        .backgroundColor('#F6DEB9')
        .fontColor('#342316')
        .onClick(() => {
          this.resetFilter();
        })
    }
    .width('100%')
    .height(58)
  }

  @Builder
  private ListPanel() {
    Column() {
      if (this.recycleItems.length === 0) {
        Text(this.loading ? '正在加载回收站资料...' : '暂无回收站资料')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor('#76512A')
          .width('100%')
          .height(140)
          .textAlign(TextAlign.Center)
          .backgroundColor('#FFFCF4')
          .borderRadius(8)
      } else {
        Scroll() {
          Column({ space: 8 }) {
            ForEach(this.recycleItems, (item: RecycleBinItem, index: number) => {
              Row({ space: 10 }) {
                Text(this.entityLabel(item.entityType))
                  .width(92)
                  .fontSize(13)
                  .fontWeight(FontWeight.Bold)
                  .fontColor(Color.White)
                  .textAlign(TextAlign.Center)
                  .padding({ top: 8, bottom: 8 })
                  .backgroundColor(this.entityColor(item.entityType))
                  .borderRadius(6)

                Column({ space: 4 }) {
                  Text(this.safeText(item.title, '已删除资料'))
                    .fontSize(18)
                    .fontWeight(FontWeight.Bold)
                    .fontColor('#342316')
                    .maxLines(1)
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                  Text(`产品型号：${this.safeText(item.productName)} / 删除时间：${this.safeText(item.deletedAt)}`)
                    .fontSize(13)
                    .fontColor('#76512A')
                    .maxLines(1)
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                  Text(`客户：${this.safeText(item.customerName)} / 操作人：${this.safeText(item.deletedBy)}`)
                    .fontSize(12)
                    .fontColor('#8A6A45')
                    .maxLines(1)
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                }
                .layoutWeight(1)
                .alignItems(HorizontalAlign.Start)

                Button('恢复')
                  .height(42)
                  .width(86)
                  .backgroundColor('#2F6B4F')
                  .fontColor(Color.White)
                  .onClick(() => {
                    void this.restoreItem(item);
                  })

                Button('彻底删除')
                  .height(42)
                  .width(108)
                  .backgroundColor('#8F3F1D')
                  .fontColor(Color.White)
                  .onClick(() => {
                    void this.deleteItem(item);
                  })
              }
              .width('100%')
              .height(92)
              .padding({ left: 12, right: 12 })
              .backgroundColor('#FFFCF4')
              .border({ width: 1, color: '#70482324', radius: 8 })
            }, (item: RecycleBinItem, index: number) => `${this.safeText(item.id, 'item')}-${index}`)
          }
          .width('100%')
        }
        .layoutWeight(1)
        .width('100%')
      }
    }
    .layoutWeight(1)
    .width('100%')
    .padding(12)
    .backgroundColor('#FFF8EA')
    .border({ width: 1, color: '#70482336', radius: 8 })
  }

  @Builder
  private StatusPanel() {
    Text(this.feedbackText.length > 0 ? this.feedbackText : this.statusText)
      .width('100%')
      .height(42)
      .fontSize(14)
      .fontWeight(FontWeight.Bold)
      .fontColor(this.feedbackText.indexOf('失败') >= 0 ? '#B91C1C' : '#6F5845')
      .padding({ left: 14, right: 14, top: 10, bottom: 10 })
      .backgroundColor(this.feedbackText.indexOf('失败') >= 0 ? '#FFF0EC' : '#FFF8EC')
      .borderRadius(8)
  }
}
