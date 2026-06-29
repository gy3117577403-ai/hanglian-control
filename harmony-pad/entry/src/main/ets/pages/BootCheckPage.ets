import router from '@ohos.router';

@Entry
@Component
struct BootCheckPage {
  private readonly apiBaseUrl: string = 'https://fyeboolnlvqv.sealoshzh.site/api';

  build() {
    Column({ space: 24 }) {
      Text('Hanglian Boot OK')
        .fontSize(36)
        .fontWeight(FontWeight.Bold)
        .fontColor('#172033')

      Text(`API: ${this.apiBaseUrl}`)
        .fontSize(18)
        .fontColor('#475569')
        .textAlign(TextAlign.Center)

      Button('进入登录页')
        .height(56)
        .width(220)
        .fontSize(20)
        .backgroundColor('#2563EB')
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
    .backgroundColor('#F6F8FB')
  }
}
