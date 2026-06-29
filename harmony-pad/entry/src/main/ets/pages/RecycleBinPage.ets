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
export struct RecycleBinPage {
  @State private recycleItems: RecycleBinItem[] = [];
  @State private customerFilter: string = '';
  @State private productFilter: string = '';
  @State private entityTypeFilter: string = '';
  @State private statusText: string = '回收站页面已加载。';
  @State private errorText: string = '';
  @State private loading: boolean = false;

  aboutToAppear(): void {
    void this.refresh();
  }

  private filter(): RecycleBinFilter {
    return {
      customer: this.customerFilter.trim(),
      product: this.productFilter.trim(),
      entityType: this.entityTypeFilter
    };
  }

  private normalizeRows(value: RecycleBinItem[] | RecycleBinListResponse): RecycleBinItem[] {
    if (Array.isArray(value)) {
      return value;
    }
    const response = value as RecycleBinListResponse;
    if (Array.isArray(response.items)) {
      return response.items;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }

  private async refresh(): Promise<void> {
    this.loading = true;
    this.errorText = '';
    this.statusText = '正在刷新回收站...';
    try {
      const result = await RecycleBinService.list(this.filter());
      this.recycleItems = this.normalizeRows(result.data);
      this.statusText = this.recycleItems.length > 0 ? '回收站资料已更新。' : '暂无回收站资料';
    } catch (error) {
      console.error('[HanglianPad] recycle refresh failed', error);
      this.recycleItems = [];
      this.errorText = '网络异常，请稍后重试。';
      this.statusText = this.errorText;
    } finally {
      this.loading = false;
    }
  }

  private async restore(item: RecycleBinItem): Promise<void> {
    try {
      await RecycleBinService.restore(item.id);
      this.statusText = '恢复成功';
      await this.refresh();
    } catch (error) {
      console.error('[HanglianPad] recycle restore failed', error);
      this.errorText = '操作失败，请稍后重试';
      this.statusText = this.errorText;
    }
  }

  private async purge(item: RecycleBinItem): Promise<void> {
    try {
      await RecycleBinService.purge(item.id);
      this.statusText = '删除成功';
      await this.refresh();
    } catch (error) {
      console.error('[HanglianPad] recycle purge failed', error);
      this.errorText = '操作失败，请稍后重试';
      this.statusText = this.errorText;
    }
  }

  private returnWorkbench(): void {
    router.replaceUrl({ url: 'pages/WorkbenchPage' })
      .catch((error: BusinessError) => {
        console.error('[HanglianPad] recycle return failed', error);
        this.statusText = '操作失败，请稍后重试';
      });
  }

  private itemKey(item: RecycleBinItem): string {
    return item.id.length > 0 ? item.id : `${item.title}-${item.deletedAt}`;
  }

  private safeText(value: string, fallback: string = '-'): string {
    if (!value || value.length === 0) {
      return fallback;
    }
    return value;
  }

  private typeColor(type: RecycleEntityType): string {
    if (type === '客户') return '#2F6B4F';
    if (type === '产品') return '#9C5725';
    if (type === '工艺参数') return '#614C8A';
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
        .width(120)
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
          this.customerFilter = '';
          this.productFilter = '';
          this.entityTypeFilter = '';
          void this.refresh();
        })
    }
    .width('100%')
    .height(58)
  }

  @Builder
  private ListPanel() {
    Column({ space: 8 }) {
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
            ForEach(this.recycleItems, (item: RecycleBinItem) => {
              this.RecycleItem(item);
            }, (item: RecycleBinItem) => this.itemKey(item))
          }
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
  private RecycleItem(item: RecycleBinItem) {
    Row({ space: 10 }) {
      Text(item.entityType)
        .width(86)
        .fontSize(13)
        .fontWeight(FontWeight.Bold)
        .fontColor(Color.White)
        .textAlign(TextAlign.Center)
        .padding({ top: 8, bottom: 8 })
        .backgroundColor(this.typeColor(item.entityType))
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
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
      Button('恢复')
        .height(42)
        .width(86)
        .backgroundColor('#2F6B4F')
        .fontColor(Color.White)
        .onClick(() => {
          void this.restore(item);
        })
      Button('彻底删除')
        .height(42)
        .width(100)
        .backgroundColor('#8F3F1D')
        .fontColor(Color.White)
        .onClick(() => {
          void this.purge(item);
        })
    }
    .width('100%')
    .height(78)
    .padding({ left: 12, right: 12 })
    .backgroundColor('#FFFCF4')
    .border({ width: 1, color: '#70482324', radius: 8 })
  }

  @Builder
  private StatusPanel() {
    Text(this.errorText.length > 0 ? this.errorText : this.statusText)
      .width('100%')
      .height(42)
      .fontSize(14)
      .fontWeight(FontWeight.Bold)
      .fontColor(this.errorText.length > 0 ? '#B91C1C' : '#6F5845')
      .padding({ left: 14, right: 14, top: 10, bottom: 10 })
      .backgroundColor(this.errorText.length > 0 ? '#FFF0EC' : '#FFF8EC')
      .borderRadius(8)
  }
}
