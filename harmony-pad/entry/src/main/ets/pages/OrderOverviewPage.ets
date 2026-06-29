import router from '@ohos.router';
import { BusinessError } from '@ohos.base';
import { OrderService } from '../services/OrderService';
import { OrderOverview, ProductionOrder, StatusCount } from '../services/DomainModels';

@Entry
@Component
export struct OrderOverviewPage {
  @State private todayOrders: ProductionOrder[] = [];
  @State private weekOrders: ProductionOrder[] = [];
  @State private allOrders: ProductionOrder[] = [];
  @State private productionStatus: StatusCount[] = [];
  @State private completionStatus: StatusCount[] = [];
  @State private orderCount: number = 0;
  @State private customerCount: number = 0;
  @State private lastAction: string = '等待操作';
  @State private errorText: string = '';
  @State private loadingText: string = '订单总览页已加载';
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

  private applyOverview(data: OrderOverview): void {
    this.todayOrders = data.todayOrders;
    this.weekOrders = data.weekOrders;
    this.allOrders = data.allOrders;
    this.productionStatus = data.productionStatus;
    this.completionStatus = data.completionStatus;
    this.orderCount = data.orderCount;
    this.customerCount = data.customerCount;
  }

  private async refresh(): Promise<void> {
    this.bump('order overview refresh clicked');
    this.errorText = '';
    this.loadingText = '正在加载订单总览...';
    try {
      const result = await OrderService.overview();
      this.applyOverview(result.data);
      this.sourceLabel = result.source === 'api' ? 'API 在线' : 'mock fallback';
      this.loadingText = result.message;
      this.lastAction = 'order overview refresh success';
    } catch (error) {
      this.todayOrders = [];
      this.weekOrders = [];
      this.allOrders = [];
      this.productionStatus = [];
      this.completionStatus = [];
      this.orderCount = 0;
      this.customerCount = 0;
      this.errorText = this.errorMessage(error, '订单总览加载失败');
      this.loadingText = '订单总览加载失败，已 fallback 空列表。';
      this.lastAction = `order overview refresh failed: ${this.errorText}`;
    }
  }

  private returnWorkbench(): void {
    this.bump('order overview return workbench clicked');
    router.replaceUrl({ url: 'pages/WorkbenchPage' })
      .catch((error: BusinessError) => {
        this.errorText = `返回工作台失败：${error.code} / ${error.message}`;
        this.lastAction = this.errorText;
      });
  }

  private statusColor(label: string): string {
    if (label.indexOf('完成') >= 0 || label.indexOf('completed') >= 0) {
      return '#2F6B4F';
    }
    if (label.indexOf('生产') >= 0 || label.indexOf('进行') >= 0 || label.indexOf('pending') >= 0) {
      return '#A84E22';
    }
    if (label.indexOf('未') >= 0 || label.indexOf('异常') >= 0) {
      return '#8F3F1D';
    }
    return '#614C8A';
  }

  build() {
    Column({ space: 12 }) {
      this.Header();
      Row({ space: 12 }) {
        this.StatCard('今日订单', `${this.todayOrders.length}`, '#A84E22');
        this.StatCard('本周订单', `${this.weekOrders.length}`, '#2F6B4F');
        this.StatCard('订单数量', `${this.orderCount}`, '#614C8A');
        this.StatCard('客户数量', `${this.customerCount}`, '#9C5725');
      }
      .height(110)
      .width('100%')

      Row({ space: 12 }) {
        Column({ space: 12 }) {
          this.StatusPanel('生产状态', this.productionStatus);
          this.StatusPanel('完成状态', this.completionStatus);
        }
        .width(300)
        .height('100%')

        this.OrderList('今日订单', this.todayOrders);
        this.OrderList('本周订单', this.weekOrders);
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
        Text('订单总览')
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
  private StatCard(title: string, value: string, color: string) {
    Row({ space: 12 }) {
      Text(value)
        .fontSize(30)
        .fontWeight(FontWeight.Bold)
        .fontColor(Color.White)
        .width(64)
        .height(64)
        .textAlign(TextAlign.Center)
        .backgroundColor(color)
        .borderRadius(8)
      Text(title)
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
        .fontColor('#342316')
        .layoutWeight(1)
    }
    .layoutWeight(1)
    .height('100%')
    .padding(14)
    .backgroundColor('#FFF8EA')
    .border({ width: 1, color: '#70482336', radius: 8 })
  }

  @Builder
  private StatusPanel(title: string, rows: StatusCount[]) {
    Column({ space: 8 }) {
      Text(title)
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
        .fontColor('#342316')
      if (rows.length === 0) {
        Text('暂无状态数据')
          .fontSize(14)
          .fontColor('#76512A')
      } else {
        ForEach(rows, (item: StatusCount) => {
          Row() {
            Text(item.label)
              .layoutWeight(1)
              .fontSize(14)
              .fontColor('#342316')
            Text(`${item.count}`)
              .width(48)
              .fontSize(16)
              .fontWeight(FontWeight.Bold)
              .fontColor(Color.White)
              .textAlign(TextAlign.Center)
              .padding({ top: 6, bottom: 6 })
              .backgroundColor(this.statusColor(item.label))
              .borderRadius(6)
          }
          .height(42)
        }, (item: StatusCount) => item.label)
      }
      Blank()
    }
    .layoutWeight(1)
    .width('100%')
    .padding(12)
    .backgroundColor('#FFF8EA')
    .border({ width: 1, color: '#70482336', radius: 8 })
  }

  @Builder
  private OrderList(title: string, rows: ProductionOrder[]) {
    Column({ space: 8 }) {
      Row() {
        Text(title)
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor('#342316')
          .layoutWeight(1)
        Text(`${rows.length} 单`)
          .fontSize(13)
          .fontWeight(FontWeight.Bold)
          .fontColor('#76512A')
      }

      if (rows.length === 0) {
        Text('暂无订单')
          .fontSize(16)
          .fontColor('#76512A')
          .width('100%')
          .height(100)
          .textAlign(TextAlign.Center)
          .backgroundColor('#FFFCF4')
          .borderRadius(8)
      } else {
        Scroll() {
          Column({ space: 8 }) {
            ForEach(rows, (order: ProductionOrder) => {
              Column({ space: 4 }) {
                Row({ space: 8 }) {
                  Text(order.weekPlanNo || order.id)
                    .fontSize(17)
                    .fontWeight(FontWeight.Bold)
                    .fontColor('#342316')
                    .layoutWeight(1)
                  Text(order.status)
                    .width(90)
                    .fontSize(12)
                    .fontWeight(FontWeight.Bold)
                    .fontColor(Color.White)
                    .textAlign(TextAlign.Center)
                    .padding({ top: 6, bottom: 6 })
                    .backgroundColor(this.statusColor(order.status))
                    .borderRadius(6)
                }
                Text(`${order.customer} / ${order.productCode} / ${order.productName}`)
                  .fontSize(13)
                  .fontColor('#76512A')
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
                Text(`数量 ${order.completedQuantity}/${order.plannedQuantity} / 资料 ${order.materialCompleteness}%`)
                  .fontSize(12)
                  .fontColor('#8A6037')
              }
              .width('100%')
              .height(86)
              .padding({ left: 12, right: 12, top: 8, bottom: 8 })
              .backgroundColor('#FFFCF4')
              .border({ width: 1, color: '#70482324', radius: 8 })
            }, (order: ProductionOrder) => order.id)
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
      Text(`allOrders: ${this.allOrders.length} / today: ${this.todayOrders.length} / week: ${this.weekOrders.length}`)
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
