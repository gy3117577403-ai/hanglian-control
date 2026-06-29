import router from '@ohos.router';

@Entry
@Component
struct BootCheckPage {
  build() {
    Column({ space: 24 }) {
      Text('航联资料工作台')
        .fontSize(42)
        .fontWeight(FontWeight.Bold)
        .fontColor('#342316')

      Text('正在启动...')
        .fontSize(20)
        .fontColor('#76512A')
        .textAlign(TextAlign.Center)

      Button('进入登录')
        .height(56)
        .width(180)
        .fontSize(18)
        .fontColor(Color.White)
        .backgroundColor('#2F6B4F')
        .onClick(() => {
          router.replaceUrl({
            url: 'pages/LoginPage'
          });
        })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .padding(32)
    .backgroundColor('#F7F2EA')
  }
}
