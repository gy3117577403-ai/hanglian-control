import router from '@ohos.router';

@Entry
@Component
struct Index {
  build() {
    Stack() {
      Column({ space: 24 }) {
        Text('HANG LIAN INDEX OK')
          .fontSize(48)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White)

        Text('API: https://fyeboolnlvqv.sealoshzh.site/api')
          .fontSize(22)
          .fontColor(Color.White)

        Button('进入登录页')
          .fontSize(24)
          .height(64)
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
      .backgroundColor('#008000')
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#008000')
  }
}
