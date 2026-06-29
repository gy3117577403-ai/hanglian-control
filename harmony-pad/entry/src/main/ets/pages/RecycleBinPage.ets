import router from '@ohos.router';
import { BusinessError } from '@ohos.base';
import { RecycleBinFilter, RecycleBinService } from '../services/RecycleBinService';
import { RecycleBinItem, RecycleEntityType } from '../services/DomainModels';

@Entry
@Component
export struct RecycleBinPage {
  @State private rows: RecycleBinItem[] = [];
  @State private customerFilter: string = '';
  @State private productFilter: string = '';
  @State private entityTypeFilter: string = '';
  @State private selectedId: string = '';
  @State private statusText: string = '回收站页已加载。';
  @State private errorText: string = '';

  aboutToAppear(): void {
    void this.refresh();
  }

  private logAction(action: string): void {
    console.info(`[HanglianPad] ${action}`);
  }

  private showFailure(action: string, error: Object): void {
    console.error(`[HanglianPad] ${action} failed`, error);
    this.errorText = '操作失败，请稍后重试。';
    this.statusText = this.errorText;
  }

  private filter(): RecycleBinFilter {
    return {
      customer: this.customerFilter.trim(),
      product: this.productFilter.trim(),
      entityType: this.entityTypeFilter
    };
  }

  private async refresh(): Promise<void> {
    this.logAction('recycle refresh clicked');
    this.errorText = '';
    this.statusText = '正在刷新回收站...';
    try {
      const result = await RecycleBinService.list(this.filter());
      this.rows = Array.isArray(result.data) ? result.data : [];
      if (this.selectedId.length === 0 && this.rows.length > 0) {
        this.selectedId = this.rows[0].id;
      }
      this.statusText = this.rows.length > 0 ? '资料已更新。' : '暂无回收站资料。';
    } catch (error) {
      this.showFailure('recycle refresh', error);
    }
  }

  private async restoreSelected(): Promise<void> {
    this.logAction('recycle restore selected clicked');
    if (this.selectedId.length === 0) {
      this.statusText = '请先选择回收站资料。';
      return;
    }
    try {
      await RecycleBinService.restore(this.selectedId);
      this.selectedId = '';
      this.statusText = '恢复成功。';
      await this.refresh();
    } catch (error) {
      this.showFailure('recycle restore', error);
    }
  }

  private async purgeSelected(): Promise<void> {
    this.logAction('recycle purge selected clicked');
    if (this.selectedId.length === 0) {
      this.statusText = '请先选择回收站资料。';
      return;
    }
    try {
      await RecycleBinService.purge(this.selectedId);
      this.selectedId = '';
      this.statusText = '删除成功。';
      await this.refresh();
    } catch (error) {
      this.showFailure('recycle purge', error);
    }
  }

  private returnWorkbench(): void {
    this.logAction('recycle return workbench clicked');
    router.replaceUrl({ url: 'pages/WorkbenchPage' })
      .catch((error: BusinessError) => {
        console.error('[HanglianPad] recycle return workbench failed', error);
        this.statusText = '操作失败，请稍后重试。';
      });
  }

  private typeColor(type: RecycleEntityType): string {
    if (type === '客户') return '#2F6B4F';
    if (type === '产品') return '#9C5725';
    if (type === '工艺参数') return '#614C8A';
    return '#8F3F1D';
  }

  private recycleRows(): RecycleBinItem[] {
    return Array.isArray(this.rows) ? this.rows : [];
  }

  private safeText(value: string | undefined, fallback: string = '-'): string {
    if (value === undefined || value === null || value.length === 0) {
      return fallback;
    }
    return value;
  }

  private itemType(item: RecycleBinItem): RecycleEntityType {
    if (item.entityType === '客户' || item.entityType === '产品' || item.entityType === '工艺参数' || item.entityType === '资料') {
      return item.entityType;
    }
    return '资料';
  }

  private itemTitle(item: RecycleBinItem): string {
    return this.safeText(item.title, '已删除资料');
  }

  private itemMeta(item: RecycleBinItem): string {
    return `${this.safeText(item.productName)} / 删除时间：${this.safeText(item.deletedAt)}`;
  }

  private isSelected(item: RecycleBinItem): boolean {
    return this.selectedId.length > 0 && this.selectedId === this.safeText(item.id, '');
  }

  private selectRecycleItem(item: RecycleBinItem): void {
    this.logAction('select recycle item clicked');
    this.selectedId = this.safeText(item.id, '');
    this.statusText = '已选择回收站资料。';
  }

  build() {
    Column({ space: 12 }) {
      this.Header();
      Row({ space: 12 }) {
        this.FilterPanel();
        this.ListPanel();
      }
      .layoutWeight(1)
      .width('100%')
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
      Button('恢复')
        .height(46)
        .width(92)
        .backgroundColor('#C87934')
        .fontColor(Color.White)
        .onClick(() => {
          void this.restoreSelected();
        })
      Button('彻底删除')
        .height(46)
        .width(120)
        .backgroundColor('#8F3F1D')
        .fontColor(Color.White)
        .onClick(() => {
          void this.purgeSelected();
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
    Column({ space: 10 }) {
      Text('筛选条件')
        .fontSize(21)
        .fontWeight(FontWeight.Bold)
        .fontColor('#342316')
      TextInput({ placeholder: '按客户筛选', text: this.customerFilter })
        .height(46)
        .backgroundColor('#FFFCF4')
        .onChange((value: string) => {
          this.customerFilter = value;
        })
      TextInput({ placeholder: '按产品或资料名称筛选', text: this.productFilter })
        .height(46)
        .backgroundColor('#FFFCF4')
        .onChange((value: string) => {
          this.productFilter = value;
        })
      this.TypeButton('', '全部');
      this.TypeButton('客户', '客户');
      this.TypeButton('产品', '产品');
      this.TypeButton('资料', '资料');
      this.TypeButton('工艺参数', '工艺参数');
      Button('应用筛选')
        .height(46)
        .width('100%')
        .backgroundColor('#C87934')
        .fontColor(Color.White)
        .onClick(() => {
          void this.refresh();
        })
      Button('重置筛选')
        .height(46)
        .width('100%')
        .backgroundColor('#F6DEB9')
        .fontColor('#342316')
        .onClick(() => {
          this.logAction('recycle reset filter clicked');
          this.customerFilter = '';
          this.productFilter = '';
          this.entityTypeFilter = '';
          void this.refresh();
        })
    }
    .width(320)
    .height('100%')
    .padding(12)
    .backgroundColor('#FFF8EA')
    .border({ width: 1, color: '#70482336', radius: 8 })
  }

  @Builder
  private TypeButton(value: string, label: string) {
    Button(label)
      .height(42)
      .width('100%')
      .fontColor(this.entityTypeFilter === value ? Color.White : '#342316')
      .backgroundColor(this.entityTypeFilter === value ? '#2F6B4F' : '#F8E7C8')
      .onClick(() => {
        this.logAction('recycle type filter clicked');
        this.entityTypeFilter = value;
      })
  }

  @Builder
  private ListPanel() {
    Column({ space: 8 }) {
      if (this.recycleRows().length === 0) {
        Text('暂无回收站资料')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor('#76512A')
          .width('100%')
          .height(120)
          .textAlign(TextAlign.Center)
          .backgroundColor('#FFFCF4')
          .borderRadius(8)
      } else {
        Scroll() {
          Column({ space: 8 }) {
            ForEach(this.recycleRows(), (item: RecycleBinItem) => {
              this.RecycleItem(item);
            }, (item: RecycleBinItem) => item.id)
          }
        }
        .layoutWeight(1)
        .width('100%')
      }
    }
    .layoutWeight(1)
    .height('100%')
    .padding(12)
    .backgroundColor('#FFF8EA')
    .border({ width: 1, color: '#70482336', radius: 8 })
  }

  @Builder
  private RecycleItem(item: RecycleBinItem) {
    Row({ space: 10 }) {
      Text(this.itemType(item))
        .width(86)
        .fontSize(13)
        .fontWeight(FontWeight.Bold)
        .fontColor(Color.White)
        .textAlign(TextAlign.Center)
        .padding({ top: 8, bottom: 8 })
        .backgroundColor(this.typeColor(this.itemType(item)))
        .borderRadius(6)
      Column({ space: 4 }) {
        Text(this.itemTitle(item))
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor('#342316')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
        Text(this.itemMeta(item))
          .fontSize(13)
          .fontColor('#76512A')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
      Button(this.isSelected(item) ? '已选择' : '选择')
        .height(42)
        .width(86)
        .backgroundColor(this.isSelected(item) ? '#C87934' : '#2F6B4F')
        .fontColor(Color.White)
        .onClick(() => {
          this.selectRecycleItem(item);
        })
    }
    .width('100%')
    .height(78)
    .padding({ left: 12, right: 12 })
    .backgroundColor(this.isSelected(item) ? '#FFF0CF' : '#FFFCF4')
    .border({ width: 1, color: this.isSelected(item) ? '#C87934' : '#70482324', radius: 8 })
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
