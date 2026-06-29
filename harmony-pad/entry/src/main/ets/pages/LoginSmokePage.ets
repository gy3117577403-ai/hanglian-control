@Entry
@Component
struct LoginSmokePage {
  build() {
    Column({ space: 20 }) {
      Text('LOGIN SMOKE OK')
        .fontSize(48)
        .fontWeight(FontWeight.Bold)
        .fontColor(Color.White)
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .backgroundColor('#1E40AF')
  }
}
