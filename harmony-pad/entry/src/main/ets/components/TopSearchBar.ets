@Component
export struct TopSearchBar {
  @State private keyword: string = ''

  onSearch: (keyword: string) => void = () => {}
  onImportPdf: () => void = () => {}
  onOpenCustomerProduct: () => void = () => {}
  onOpenConnectorParam: () => void = () => {}
  onOpenTrash: () => void = () => {}
  onOpenOrderOverview: () => void = () => {}

  build() {
    Row({ space: 10 }) {
      Row({ space: 10 }) {
        Text('HL')
          .fontSize(22)
          .fontWeight(FontWeight.Bold)
          .fontColor('#214842')
        Button('菜单')
          .height(40)
          .padding({ left: 14, right: 14 })
          .fontSize(14)
          .fontWeight(FontWeight.Bold)
          .backgroundColor('#eaf2ec')
          .fontColor('#284941')
          .borderRadius(12)
      }
      .height(48)
      .padding({ left: 16, right: 10 })
      .borderRadius(16)
      .backgroundColor('#ffffff')
      .border({ width: 1, color: '#d8e5dd' })

      TextInput({ placeholder: '搜索订单、客户、产品型号', text: this.keyword })
        .height(48)
        .layoutWeight(1)
        .fontSize(16)
        .backgroundColor('#ffffff')
        .borderRadius(16)
        .padding({ left: 16, right: 16 })
        .onChange((value: string) => {
          this.keyword = value
        })

      Button('按住说话')
        .height(48)
        .padding({ left: 18, right: 18 })
        .fontSize(15)
        .fontWeight(FontWeight.Bold)
        .backgroundColor('#f4ede3')
        .fontColor('#81512a')
        .borderRadius(16)

      Button('搜索')
        .height(48)
        .padding({ left: 22, right: 22 })
        .fontSize(15)
        .fontWeight(FontWeight.Bold)
        .backgroundColor('#2e6f66')
        .fontColor('#ffffff')
        .borderRadius(16)
        .onClick(() => {
          this.onSearch(this.keyword)
        })

      Button('导入 PDF 图纸')
        .height(48)
        .padding({ left: 16, right: 16 })
        .fontSize(14)
        .fontWeight(FontWeight.Bold)
        .backgroundColor('#c87934')
        .fontColor('#ffffff')
        .borderRadius(16)
        .onClick(() => {
          this.onImportPdf()
        })

      Button('客户与产品')
        .height(48)
        .padding({ left: 16, right: 16 })
        .fontSize(14)
        .fontWeight(FontWeight.Bold)
        .backgroundColor('#eef5f1')
        .fontColor('#33564e')
        .borderRadius(16)
        .onClick(() => {
          this.onOpenCustomerProduct()
        })

      Button('连接器参数')
        .height(48)
        .padding({ left: 16, right: 16 })
        .fontSize(14)
        .fontWeight(FontWeight.Bold)
        .backgroundColor('#eef5f1')
        .fontColor('#33564e')
        .borderRadius(16)
        .onClick(() => {
          this.onOpenConnectorParam()
        })

      Button('回收站')
        .height(48)
        .padding({ left: 16, right: 16 })
        .fontSize(14)
        .fontWeight(FontWeight.Bold)
        .backgroundColor('#f6eadb')
        .fontColor('#855029')
        .borderRadius(16)
        .onClick(() => {
          this.onOpenTrash()
        })

      Button('订单总览')
        .height(48)
        .padding({ left: 16, right: 16 })
        .fontSize(14)
        .fontWeight(FontWeight.Bold)
        .backgroundColor('#ffffff')
        .fontColor('#3f4f4a')
        .border({ width: 1, color: '#dbe5df' })
        .borderRadius(16)
        .onClick(() => {
          this.onOpenOrderOverview()
        })
    }
    .height(72)
    .width('100%')
    .padding({ left: 14, right: 14 })
    .backgroundColor('#f9fbf8')
    .borderRadius(22)
    .border({ width: 1, color: '#e4eee8' })
  }
}
