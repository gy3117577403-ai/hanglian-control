import { RecycleBinFilter, RecycleBinService } from '../services/RecycleBinService';
import { RecycleBinItem, RecycleEntityType } from '../services/DomainModels';

@Entry
@Component
export struct RecycleBinPage {
  @State rows: RecycleBinItem[] = [];
  @State customerFilter: string = '';
  @State productFilter: string = '';
  @State entityTypeFilter: string = '';
  @State sourceLabel: string = 'mock fallback 待命';
  @State message: string = '准备加载已删除资料';

  aboutToAppear(): void {
    this.refresh();
  }

  build() {
    Column({ space: 12 }) {
      this.Header();
      Row({ space: 12 }) {
        this.FilterPanel();
        this.ListPanel();
      }
      .layoutWeight(1)
      .width('100%');
    }
    .width('100%')
    .height('100%')
    .padding(12)
    .backgroundColor('#F7F2EA');
  }

  @Builder
  Header() {
    Row() {
      Column({ space: 5 }) {
        Text('回收站')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .fontColor('#342316');
        Text('已删除资料列表、恢复、彻底删除')
          .fontSize(13)
          .fontColor('#76512A');
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start);

      Column({ space: 4 }) {
        Text(this.sourceLabel)
          .fontSize(13)
          .fontWeight(FontWeight.Bold)
          .fontColor('#2F6B4F');
        Text(this.message)
          .fontSize(12)
          .fontColor('#76512A')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis });
      }
      .width(360)
      .alignItems(HorizontalAlign.End);
    }
    .width('100%')
    .height(82)
    .padding({ left: 14, right: 14 })
    .border({ width: 1, color: '#70482336', radius: 8 })
    .backgroundColor('#FFF8EA');
  }

  @Builder
  FilterPanel() {
    Column({ space: 12 }) {
      Text('筛选')
        .fontSize(21)
        .fontWeight(FontWeight.Bold)
        .fontColor('#342316');
      TextInput({ placeholder: '按客户筛选', text: this.customerFilter })
        .height(50)
        .borderRadius(8)
        .backgroundColor('#FFFCF4')
        .onChange((value: string) => {
          this.customerFilter = value;
        });
      TextInput({ placeholder: '按产品筛选', text: this.productFilter })
        .height(50)
        .borderRadius(8)
        .backgroundColor('#FFFCF4')
        .onChange((value: string) => {
          this.productFilter = value;
        });

      Text('资料类型')
        .fontSize(14)
        .fontWeight(FontWeight.Bold)
        .fontColor('#76512A');
      this.TypeButton('', '全部');
      this.TypeButton('客户', '客户');
      this.TypeButton('产品', '产品');
      this.TypeButton('资料', '资料');
      this.TypeButton('工艺参数', '工艺参数');

      Row({ space: 8 }) {
        Button('应用筛选')
          .height(50)
          .layoutWeight(1)
          .backgroundColor('#A84E22')
          .onClick(() => {
            this.refresh();
          });
        Button('重置')
          .height(50)
          .width(86)
          .fontColor('#342316')
          .backgroundColor('#F6DEB9')
          .onClick(() => {
            this.customerFilter = '';
            this.productFilter = '';
            this.entityTypeFilter = '';
            this.refresh();
          });
      }

      Blank();
      Text(`当前 ${this.rows.length} 条已删除记录`)
        .fontSize(15)
        .fontWeight(FontWeight.Bold)
        .fontColor('#342316');
    }
    .width(320)
    .height('100%')
    .padding(12)
    .border({ width: 1, color: '#70482336', radius: 8 })
    .backgroundColor('#FFF8EA');
  }

  @Builder
  TypeButton(value: string, label: string) {
    Button(label)
      .height(48)
      .width('100%')
      .fontColor(this.entityTypeFilter === value ? '#FFF8EA' : '#342316')
      .backgroundColor(this.entityTypeFilter === value ? '#2F6B4F' : '#F8E7C8')
      .onClick(() => {
        this.entityTypeFilter = value;
      });
  }

  @Builder
  ListPanel() {
    Column({ space: 8 }) {
      Row() {
        Text('删除对象').layoutWeight(1).fontSize(13).fontWeight(FontWeight.Bold).fontColor('#76512A');
        Text('客户 / 产品').layoutWeight(1).fontSize(13).fontWeight(FontWeight.Bold).fontColor('#76512A');
        Text('删除信息').layoutWeight(1).fontSize(13).fontWeight(FontWeight.Bold).fontColor('#76512A');
        Text('操作').width(190).fontSize(13).fontWeight(FontWeight.Bold).fontColor('#76512A');
      }
      .height(34)
      .padding({ left: 12, right: 12 });

      Scroll() {
        Column({ space: 8 }) {
          ForEach(this.rows, (item: RecycleBinItem) => {
            Row({ space: 10 }) {
              Column({ space: 5 }) {
                Row({ space: 8 }) {
                  Text(item.entityType)
                    .fontSize(12)
                    .fontWeight(FontWeight.Bold)
                    .fontColor('#FFF8EA')
                    .padding({ left: 8, right: 8, top: 4, bottom: 4 })
                    .backgroundColor(this.typeColor(item.entityType))
                    .borderRadius(6);
                  Text(item.title)
                    .fontSize(18)
                    .fontWeight(FontWeight.Bold)
                    .fontColor('#342316')
                    .maxLines(1)
                    .textOverflow({ overflow: TextOverflow.Ellipsis });
                }
                Text(item.reason || '无删除原因')
                  .fontSize(12)
                  .fontColor('#76512A')
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis });
              }
              .layoutWeight(1)
              .alignItems(HorizontalAlign.Start);

              Column({ space: 4 }) {
                Text(item.customerName || '未关联客户')
                  .fontSize(15)
                  .fontWeight(FontWeight.Bold)
                  .fontColor('#342316')
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis });
                Text(item.productName || '未关联产品')
                  .fontSize(13)
                  .fontColor('#76512A')
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis });
              }
              .layoutWeight(1)
              .alignItems(HorizontalAlign.Start);

              Column({ space: 4 }) {
                Text(item.deletedAt)
                  .fontSize(14)
                  .fontWeight(FontWeight.Bold)
                  .fontColor('#342316');
                Text(item.deletedBy)
                  .fontSize(12)
                  .fontColor('#76512A');
              }
              .layoutWeight(1)
              .alignItems(HorizontalAlign.Start);

              Row({ space: 8 }) {
                Button('恢复')
                  .height(44)
                  .width(86)
                  .backgroundColor('#2F6B4F')
                  .onClick(() => {
                    this.restore(item.id);
                  });
                Button('彻底删除')
                  .height(44)
                  .width(96)
                  .backgroundColor('#8F3F1D')
                  .onClick(() => {
                    this.purge(item.id);
                  });
              }
              .width(190);
            }
            .width('100%')
            .height(84)
            .padding({ left: 12, right: 12 })
            .border({ width: 1, color: '#70482324', radius: 8 })
            .backgroundColor('#FFFCF4');
          }, (item: RecycleBinItem) => item.id);
        }
      }
      .layoutWeight(1)
      .width('100%');
    }
    .layoutWeight(1)
    .height('100%')
    .padding(12)
    .border({ width: 1, color: '#70482336', radius: 8 })
    .backgroundColor('#FFF8EA');
  }

  async refresh(): Promise<void> {
    const filter: RecycleBinFilter = {
      customer: this.customerFilter.trim(),
      product: this.productFilter.trim(),
      entityType: this.entityTypeFilter
    };
    const result = await RecycleBinService.list(filter);
    this.rows = result.data;
    this.sourceLabel = result.source === 'api' ? 'API 在线' : 'mock fallback';
    this.message = result.message;
  }

  async restore(id: string): Promise<void> {
    const result = await RecycleBinService.restore(id);
    this.message = result.message;
    await this.refresh();
  }

  async purge(id: string): Promise<void> {
    const result = await RecycleBinService.purge(id);
    this.message = result.message;
    await this.refresh();
  }

  typeColor(type: RecycleEntityType): string {
    if (type === '客户') {
      return '#2F6B4F';
    }
    if (type === '产品') {
      return '#9C5725';
    }
    if (type === '工艺参数') {
      return '#614C8A';
    }
    return '#8F3F1D';
  }
}
