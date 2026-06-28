import { OrderService } from '../services/OrderService';
import { ProductionOrder, StatusCount } from '../services/DomainModels';

@Component
export struct OrderOverviewPage {
  @State todayOrders: ProductionOrder[] = [];
  @State weekOrders: ProductionOrder[] = [];
  @State allOrders: ProductionOrder[] = [];
  @State productionStatus: StatusCount[] = [];
  @State completionStatus: StatusCount[] = [];
  @State orderCount: number = 0;
  @State customerCount: number = 0;
  @State sourceLabel: string = 'mock fallback 待命';
  @State message: string = '准备加载订单总览';

  aboutToAppear(): void {
    this.refresh();
  }

  build() {
    Column({ space: 12 }) {
      this.Header();
      Row({ space: 12 }) {
        this.StatCard('今日订单', `${this.todayOrders.length}`, '当天计划单', '#A84E22');
        this.StatCard('本周订单', `${this.weekOrders.length}`, '周计划范围', '#2F6B4F');
        this.StatCard('订单数量', `${this.orderCount}`, '全部订单', '#614C8A');
        this.StatCard('客户数量', `${this.customerCount}`, '涉及客户', '#9C5725');
      }
      .height(118)
      .width('100%');

      Row({ space: 12 }) {
        Column({ space: 12 }) {
          this.StatusPanel('生产状态', this.productionStatus);
          this.StatusPanel('完成状态', this.completionStatus);
        }
        .width(310)
        .height('100%');

        this.OrderList('今日订单', this.todayOrders);
        this.OrderList('本周订单', this.weekOrders);
      }
      .layoutWeight(1)
      .width('100%');
    }
    .width('100%')
    .layoutWeight(1);
  }

  @Builder
  Header() {
    Row() {
      Column({ space: 5 }) {
        Text('订单总览')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .fontColor('#342316');
        Text('今日订单、本周订单、订单数量、客户数量、生产状态、完成状态')
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
      .width(470)
      .alignItems(HorizontalAlign.End);

      Button('刷新')
        .height(50)
        .width(100)
        .margin({ left: 12 })
        .backgroundColor('#A84E22')
        .onClick(() => {
          this.refresh();
        });
    }
    .width('100%')
    .height(82)
    .padding({ left: 14, right: 14 })
    .border({ width: 1, color: '#70482336', radius: 8 })
    .backgroundColor('#FFF8EA');
  }

  @Builder
  StatCard(title: string, value: string, subtitle: string, color: string) {
    Row({ space: 10 }) {
      Column() {
        Text(value)
          .fontSize(32)
          .fontWeight(FontWeight.Bold)
          .fontColor('#FFF8EA');
      }
      .width(64)
      .height(64)
      .alignItems(HorizontalAlign.Center)
      .justifyContent(FlexAlign.Center)
      .backgroundColor(color)
      .borderRadius(8);

      Column({ space: 5 }) {
        Text(title)
          .fontSize(19)
          .fontWeight(FontWeight.Bold)
          .fontColor('#342316');
        Text(subtitle)
          .fontSize(12)
          .fontColor('#76512A');
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start);
    }
    .layoutWeight(1)
    .height('100%')
    .padding(14)
    .border({ width: 1, color: '#70482336', radius: 8 })
    .backgroundColor('#FFF8EA');
  }

  @Builder
  StatusPanel(title: string, rows: StatusCount[]) {
    Column({ space: 8 }) {
      Text(title)
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
        .fontColor('#342316');
      ForEach(rows, (item: StatusCount) => {
        Row() {
          Text(item.label)
            .layoutWeight(1)
            .fontSize(15)
            .fontWeight(FontWeight.Bold)
            .fontColor('#342316');
          Text(`${item.count}`)
            .width(48)
            .height(34)
            .fontSize(17)
            .fontWeight(FontWeight.Bold)
            .fontColor('#FFF8EA')
            .textAlign(TextAlign.Center)
            .backgroundColor(this.statusColor(item.label))
            .borderRadius(6);
        }
        .height(46)
        .padding({ left: 10, right: 10 })
        .border({ width: 1, color: '#70482324', radius: 8 })
        .backgroundColor('#FFFCF4');
      }, (item: StatusCount) => item.label);
      Blank();
    }
    .layoutWeight(1)
    .width('100%')
    .padding(12)
    .border({ width: 1, color: '#70482336', radius: 8 })
    .backgroundColor('#FFF8EA');
  }

  @Builder
  OrderList(title: string, rows: ProductionOrder[]) {
    Column({ space: 8 }) {
      Row() {
        Text(title)
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor('#342316')
          .layoutWeight(1);
        Text(`${rows.length} 单`)
          .fontSize(13)
          .fontWeight(FontWeight.Bold)
          .fontColor('#76512A');
      }

      Row() {
        Text('订单 / 产品').layoutWeight(1).fontSize(13).fontWeight(FontWeight.Bold).fontColor('#76512A');
        Text('客户').layoutWeight(1).fontSize(13).fontWeight(FontWeight.Bold).fontColor('#76512A');
        Text('数量').width(110).fontSize(13).fontWeight(FontWeight.Bold).fontColor('#76512A');
        Text('状态').width(96).fontSize(13).fontWeight(FontWeight.Bold).fontColor('#76512A');
      }
      .height(30)
      .padding({ left: 12, right: 12 });

      Scroll() {
        Column({ space: 8 }) {
          ForEach(rows, (order: ProductionOrder) => {
            Row({ space: 10 }) {
              Column({ space: 4 }) {
                Text(order.weekPlanNo || order.id)
                  .fontSize(17)
                  .fontWeight(FontWeight.Bold)
                  .fontColor('#342316');
                Text(`${order.productCode} / ${order.productName}`)
                  .fontSize(13)
                  .fontColor('#76512A')
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis });
                Text(`${order.date} / ${order.owner} / ${order.segment}`)
                  .fontSize(12)
                  .fontColor('#8A6037')
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis });
              }
              .layoutWeight(1)
              .alignItems(HorizontalAlign.Start);

              Text(order.customer)
                .layoutWeight(1)
                .fontSize(14)
                .fontWeight(FontWeight.Bold)
                .fontColor('#342316')
                .maxLines(2)
                .textOverflow({ overflow: TextOverflow.Ellipsis });

              Column({ space: 3 }) {
                Text(`${order.completedQuantity}/${order.plannedQuantity}`)
                  .fontSize(15)
                  .fontWeight(FontWeight.Bold)
                  .fontColor('#342316');
                Text(`资料 ${order.materialCompleteness}%`)
                  .fontSize(12)
                  .fontColor('#76512A');
              }
              .width(110)
              .alignItems(HorizontalAlign.Start);

              Text(order.status)
                .width(96)
                .fontSize(13)
                .fontWeight(FontWeight.Bold)
                .fontColor('#FFF8EA')
                .textAlign(TextAlign.Center)
                .padding({ top: 8, bottom: 8 })
                .backgroundColor(this.statusColor(order.status))
                .borderRadius(6);
            }
            .width('100%')
            .height(88)
            .padding({ left: 12, right: 12 })
            .border({ width: 1, color: '#70482324', radius: 8 })
            .backgroundColor('#FFFCF4');
          }, (order: ProductionOrder) => order.id);
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
    const result = await OrderService.overview();
    this.todayOrders = result.data.todayOrders;
    this.weekOrders = result.data.weekOrders;
    this.allOrders = result.data.allOrders;
    this.productionStatus = result.data.productionStatus;
    this.completionStatus = result.data.completionStatus;
    this.orderCount = result.data.orderCount;
    this.customerCount = result.data.customerCount;
    this.sourceLabel = result.source === 'api' ? 'API 在线' : 'mock fallback';
    this.message = result.message;
  }

  statusColor(label: string): string {
    if (label.includes('完成')) {
      return '#2F6B4F';
    }
    if (label.includes('生产') || label.includes('进行')) {
      return '#A84E22';
    }
    if (label.includes('待') || label.includes('未')) {
      return '#8F3F1D';
    }
    return '#614C8A';
  }
}
