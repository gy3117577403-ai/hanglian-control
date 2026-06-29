@Entry
@Component
struct LoginSmokePage {
  build() {
    Column({ space: 20 }) {
      Text('航联资料工作台')
        .fontSize(42)
        .fontWeight(FontWeight.Bold)
        .fontColor('#342316')
      Text('登录服务准备中')
        .fontSize(20)
        .fontColor('#76512A')
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .backgroundColor('#F7F2EA')
  }
}
