import router from '@ohos.router';

@Entry
@Component
struct BootCheckPage {
  private readonly apiBaseUrl: string = 'https://fyeboolnlvqv.sealoshzh.site/api';

  build() {
    Column({ space: 28 }) {
      Text('HANG LIAN BOOT OK')
        .fontSize(42)
        .fontWeight(FontWeight.Bold)
        .fontColor(Color.White)

      Text(`API: ${this.apiBaseUrl}`)
        .fontSize(20)
        .fontColor('#E6FFE6')
        .textAlign(TextAlign.Center)

      Button('进入登录页')
        .height(64)
        .width(240)
        .fontSize(20)
        .fontColor('#008000')
        .backgroundColor(Color.White)
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
    .backgroundColor('#008000')
  }
}
