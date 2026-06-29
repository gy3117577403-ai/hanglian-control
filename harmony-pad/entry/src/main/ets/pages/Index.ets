import router from '@ohos.router';
import { BusinessError } from '@ohos.base';

@Entry
@Component
struct Index {
  @State clickCount: number = 0;
  @State lastAction: string = '等待点击';

  private markOuterTap(): void {
    this.clickCount += 1;
  }

  private goLogin(): void {
    this.clickCount += 1;
    this.lastAction = '已点击，准备跳转 LoginPage';
    console.info('[HanglianPad] Index login button clicked');

    router.pushUrl({
      url: 'pages/LoginPage'
    })
      .then(() => {
        this.lastAction = 'router.pushUrl LoginPage 已调用';
        console.info('[HanglianPad] router.pushUrl LoginPage success');
      })
      .catch((error: BusinessError) => {
        const message = `router.pushUrl failed: ${error.code} ${error.message}`;
        this.lastAction = message;
        console.error('[HanglianPad] router.pushUrl LoginPage failed', error);
      });
  }

  private goLoginSmoke(): void {
    this.clickCount += 1;
    this.lastAction = '已点击，准备跳转 LoginSmokePage';
    console.info('[HanglianPad] Index login smoke button clicked');

    router.pushUrl({
      url: 'pages/LoginSmokePage'
    })
      .then(() => {
        this.lastAction = 'router.pushUrl LoginSmokePage 已调用';
        console.info('[HanglianPad] router.pushUrl LoginSmokePage success');
      })
      .catch((error: BusinessError) => {
        const message = `router.pushUrl smoke failed: ${error.code} ${error.message}`;
        this.lastAction = message;
        console.error('[HanglianPad] router.pushUrl LoginSmokePage failed', error);
      });
  }

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

        Text(`点击次数：${this.clickCount}`)
          .fontSize(22)
          .fontColor(Color.White)

        Text(this.lastAction)
          .fontSize(20)
          .fontColor('#E6FFE6')

        Button('进入登录页')
          .fontSize(24)
          .height(64)
          .onClick(() => {
            this.goLogin();
          })

        Text('点这里也进入登录页')
          .fontSize(24)
          .fontColor(Color.White)
          .padding(16)
          .onClick(() => {
            this.goLogin();
          })

        Button('进入 LoginSmokePage')
          .fontSize(22)
          .height(56)
          .onClick(() => {
            this.goLoginSmoke();
          })
      }
      .width('100%')
      .height('100%')
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)
      .backgroundColor('#008000')
      .onClick(() => {
        this.markOuterTap();
      })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#008000')
  }
}
