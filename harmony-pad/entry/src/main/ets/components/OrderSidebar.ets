import { OrderCard } from './OrderCard'
import { OrderScope, WorkbenchOrder } from '../model/WorkbenchTypes'

@Component
export struct OrderSidebar {
  orders: WorkbenchOrder[] = []
  selectedOrderId: string = ''
  scope: OrderScope = 'today'
  isLoading: boolean = false
  errorMessage: string = ''
  onScopeChange: (scope: OrderScope) => void = () => {}
  onOrderSelect: (order: WorkbenchOrder) => void = () => {}
  onCompleteOrder: (order: WorkbenchOrder) => void = () => {}

  build() {
    Column({ space: 14 }) {
      Row() {
        Text('订单资料调用')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor('#2d241c')
          .layoutWeight(1)
        Text(`${this.orders.length}`)
          .fontSize(14)
          .fontWeight(FontWeight.Bold)
          .fontColor('#ffffff')
          .padding({ left: 10, right: 10, top: 4, bottom: 4 })
          .backgroundColor('#2f6f66')
          .borderRadius(999)
      }
      .width('100%')

      Row({ space: 8 }) {
        Button('今日订单')
          .layoutWeight(1)
          .height(42)
          .fontSize(14)
          .fontWeight(FontWeight.Bold)
          .fontColor(this.scope === 'today' ? '#ffffff' : '#60432c')
          .backgroundColor(this.scope === 'today' ? '#c87833' : '#f2eadf')
          .borderRadius(14)
          .onClick(() => {
            this.onScopeChange('today')
          })
        Button('本周订单')
          .layoutWeight(1)
          .height(42)
          .fontSize(14)
          .fontWeight(FontWeight.Bold)
          .fontColor(this.scope === 'week' ? '#ffffff' : '#60432c')
          .backgroundColor(this.scope === 'week' ? '#c87833' : '#f2eadf')
          .borderRadius(14)
          .onClick(() => {
            this.onScopeChange('week')
          })
      }
      .width('100%')

      if (this.errorMessage.length > 0) {
        Text(this.errorMessage)
          .fontSize(12)
          .fontColor('#a33f34')
          .padding(10)
          .backgroundColor('#fff1ef')
          .borderRadius(12)
          .width('100%')
      }

      if (this.isLoading && this.orders.length === 0) {
        Text('正在加载订单')
          .fontSize(14)
          .fontColor('#7a6653')
          .width('100%')
          .height(80)
          .textAlign(TextAlign.Center)
      } else {
        Scroll() {
          Column({ space: 12 }) {
            ForEach(this.orders, (order: WorkbenchOrder) => {
              OrderCard({
                order: order,
                selected: this.selectedOrderId === order.orderId,
                onOpen: this.onOrderSelect,
                onComplete: this.onCompleteOrder
              })
            }, (order: WorkbenchOrder) => order.orderId)

            if (this.orders.length === 0) {
              Text(this.scope === 'today' ? '今日暂无订单' : '本周暂无订单')
                .fontSize(14)
                .fontColor('#89725e')
                .width('100%')
                .height(120)
                .textAlign(TextAlign.Center)
            }
          }
          .width('100%')
        }
        .layoutWeight(1)
        .scrollBar(BarState.Auto)
      }
    }
    .height('100%')
    .width(300)
    .padding(16)
    .backgroundColor('#fbf8f2')
    .border({ width: 1, color: '#e6e0d6' })
    .borderRadius(24)
  }
}
