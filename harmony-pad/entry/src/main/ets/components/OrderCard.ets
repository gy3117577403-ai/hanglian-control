import { displayOrderStatus, WorkbenchOrder } from '../model/WorkbenchTypes'

@Component
export struct OrderCard {
  order: WorkbenchOrder = {
    id: '',
    orderId: '',
    date: '',
    weekPlanNo: '',
    customerId: '',
    customerName: '',
    productId: '',
    productModel: '',
    productName: '',
    quantity: 0,
    completedQuantity: 0,
    productionStatus: '',
    status: '',
    completed: false
  }
  selected: boolean = false
  onOpen: (order: WorkbenchOrder) => void = () => {}
  onComplete: (order: WorkbenchOrder) => void = () => {}

  private statusColor(): string {
    if (this.order.productionStatus === 'front') return '#2e7d72'
    if (this.order.productionStatus === 'back') return '#b66a2f'
    if (this.order.productionStatus === 'no_drawing') return '#b34a3d'
    if (this.order.productionStatus === 'exception') return '#8a5ab8'
    return '#6b7b70'
  }

  build() {
    Column({ space: 9 }) {
      Row({ space: 8 }) {
        Text(this.order.productModel)
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor('#2b2118')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .layoutWeight(1)
        Text(`${this.order.quantity} 件`)
          .fontSize(13)
          .fontWeight(FontWeight.Bold)
          .fontColor('#87522a')
          .padding({ left: 10, right: 10, top: 5, bottom: 5 })
          .backgroundColor('#fff7ec')
          .borderRadius(12)
      }
      .width('100%')

      Text(this.order.customerName || '客户待确认')
        .fontSize(14)
        .fontWeight(FontWeight.Medium)
        .fontColor('#6f5b47')
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .width('100%')

      Row({ space: 8 }) {
        Text(displayOrderStatus(this.order.productionStatus))
          .fontSize(13)
          .fontWeight(FontWeight.Bold)
          .fontColor('#ffffff')
          .padding({ left: 12, right: 12, top: 6, bottom: 6 })
          .backgroundColor(this.statusColor())
          .borderRadius(14)
        Blank()
        Button('完成')
          .height(38)
          .padding({ left: 16, right: 16 })
          .fontSize(14)
          .fontWeight(FontWeight.Bold)
          .fontColor('#ffffff')
          .backgroundColor(this.order.completed ? '#93a39a' : '#c87833')
          .borderRadius(13)
          .onClick(() => {
            this.onComplete(this.order)
          })
      }
      .width('100%')

      Text(this.order.productName || this.order.weekPlanNo || this.order.orderId)
        .fontSize(12)
        .fontColor('#8a7868')
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .width('100%')
    }
    .width('100%')
    .padding(14)
    .backgroundColor(this.selected ? '#fff8ee' : '#ffffff')
    .border({ width: this.selected ? 2 : 1, color: this.selected ? '#c87833' : '#e2e8e2' })
    .borderRadius(18)
    .shadow({ radius: this.selected ? 16 : 8, color: '#14000000', offsetX: 0, offsetY: 6 })
    .onClick(() => {
      this.onOpen(this.order)
    })
  }
}
