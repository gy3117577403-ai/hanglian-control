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
  @State private lastAction: string = '等待操作';
  @State private errorText: string = '';
  @State private loadingText: string = '回收站页已加载';
  @State private sourceLabel: string = 'real API';
  @State private tapCount: number = 0;

  aboutToAppear(): void {
    void this.refresh();
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

  private filter(): RecycleBinFilter {
    return {
      customer: this.customerFilter.trim(),
      product: this.productFilter.trim(),
      entityType: this.entityTypeFilter
    };
  }

  private async refresh(): Promise<void> {
    this.bump('recycle refresh clicked');
    this.errorText = '';
    this.loadingText = '正在刷新回收站...';
    try {
      const result = await RecycleBinService.list(this.filter());
      this.rows = result.data;
      if (this.selectedId.length === 0 && this.rows.length > 0) {
        this.selectedId = this.rows[0].id;
      }
      this.sourceLabel = result.source === 'api' ? 'API 在线' : 'mock fallback';
      this.loadingText = result.message;
      this.lastAction = 'recycle refresh success';
    } catch (error) {
      this.errorText = this.errorMessage(error, '回收站刷新失败');
      this.loadingText = '回收站刷新失败';
      this.lastAction = `recycle refresh failed: ${this.errorText}`;
    }
  }

  private async restoreSelected(): Promise<void> {
    this.bump('recycle restore selected clicked');
    if (this.selectedId.length === 0) {
      this.errorText = '请先选中一条回收站资料。';
      return;
    }
    try {
      const result = await RecycleBinService.restore(this.selectedId);
      this.loadingText = result.message;
      this.lastAction = `restore success: ${this.selectedId}`;
      this.selectedId = '';
      await this.refresh();
    } catch (error) {
      this.errorText = this.errorMessage(error, '恢复失败');
      this.lastAction = `restore failed: ${this.errorText}`;
    }
  }

  private async purgeSelected(): Promise<void> {
    this.bump('recycle purge selected clicked');
    if (this.selectedId.length === 0) {
      this.errorText = '请先选中一条回收站资料。';
      return;
    }
    try {
      const result = await RecycleBinService.purge(this.selectedId);
      this.loadingText = result.message;
      this.lastAction = `purge success: ${this.selectedId}`;
      this.selectedId = '';
      await this.refresh();
    } catch (error) {
      this.errorText = this.errorMessage(error, '彻底删除失败');
      this.lastAction = `purge failed: ${this.errorText}`;
    }
  }

  private returnWorkbench(): void {
    this.bump('recycle return workbench clicked');
    router.replaceUrl({ url: 'pages/WorkbenchPage' })
      .catch((error: BusinessError) => {
        this.errorText = `返回工作台失败：${error.code} / ${error.message}`;
        this.lastAction = this.errorText;
      });
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
      Row({ space: 12 }) {
        this.FilterPanel();
        this.ListPanel();
      }
      .layoutWeight(1)
      .width('100%')
      this.Diagnostics();
    }
    .width('100%')
    .height('100%')
    .padding(12)
    .backgroundColor('#F7F2EA')
  }

  @Builder
  private Header() {
    Row({ space: 10 }) {
      Column({ space: 4 }) {
        Text('回收站')
          .fontSize(26)
          .fontWeight(FontWeight.Bold)
          .fontColor('#342316')
        Text(`${this.loadingText} / ${this.sourceLabel}`)
          .fontSize(13)
          .fontColor(this.errorText.length > 0 ? '#B91C1C' : '#76512A')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)

      Button('刷新')
        .height(46)
        .width(92)
        .backgroundColor('#2F6B4F')
        .fontColor(Color.White)
        .onClick(() => {
          void this.refresh();
        })
      Button('恢复选中项')
        .height(46)
        .width(120)
        .backgroundColor('#C87934')
        .fontColor(Color.White)
        .onClick(() => {
          void this.restoreSelected();
        })
      Button('彻底删除选中项')
        .height(46)
        .width(150)
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
      TextInput({ placeholder: '按产品/标题筛选', text: this.productFilter })
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
          this.bump('recycle reset filter clicked');
          this.customerFilter = '';
          this.productFilter = '';
          this.entityTypeFilter = '';
          void this.refresh();
        })
      Text(`当前 ${this.rows.length} 条已删除记录`)
        .fontSize(14)
        .fontWeight(FontWeight.Bold)
        .fontColor('#342316')
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
        this.bump(`recycle type filter clicked: ${label}`);
        this.entityTypeFilter = value;
      })
  }

  @Builder
  private ListPanel() {
    Column({ space: 8 }) {
      if (this.rows.length === 0) {
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
            ForEach(this.rows, (item: RecycleBinItem) => {
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
                  Text(item.title)
                    .fontSize(18)
                    .fontWeight(FontWeight.Bold)
                    .fontColor('#342316')
                    .maxLines(1)
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                  Text(`${item.customerName || '-'} / ${item.productName || '-'} / ${item.deletedAt}`)
                    .fontSize(13)
                    .fontColor('#76512A')
                    .maxLines(1)
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                }
                .layoutWeight(1)
                .alignItems(HorizontalAlign.Start)
                Button(this.selectedId === item.id ? '已选中' : '选中')
                  .height(42)
                  .width(86)
                  .backgroundColor(this.selectedId === item.id ? '#C87934' : '#2F6B4F')
                  .fontColor(Color.White)
                  .onClick(() => {
                    this.bump(`select recycle item clicked: ${item.id}`);
                    this.selectedId = item.id;
                  })
              }
              .width('100%')
              .height(78)
              .padding({ left: 12, right: 12 })
              .backgroundColor(this.selectedId === item.id ? '#FFF0CF' : '#FFFCF4')
              .border({ width: 1, color: this.selectedId === item.id ? '#C87934' : '#70482324', radius: 8 })
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
  private Diagnostics() {
    Column({ space: 4 }) {
      Text(`tapCount: ${this.tapCount} / lastAction: ${this.lastAction}`)
        .fontSize(12)
        .fontColor('#6F5845')
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
      Text(`selectedId: ${this.selectedId || '-'} / rows: ${this.rows.length}`)
        .fontSize(12)
        .fontColor('#6F5845')
      Text(this.errorText.length > 0 ? `errorText: ${this.errorText}` : 'errorText: -')
        .fontSize(12)
        .fontColor(this.errorText.length > 0 ? '#B91C1C' : '#6F5845')
        .maxLines(2)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
    }
    .width('100%')
    .padding(12)
    .backgroundColor('#FFF8EC')
    .borderRadius(8)
  }
}
