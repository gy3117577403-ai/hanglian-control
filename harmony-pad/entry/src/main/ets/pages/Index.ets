import router from '@ohos.router';
import { BusinessError } from '@ohos.base';

@Entry
@Component
struct Index {
  @State private statusText: string = '正在启动...';

  private goLogin(): void {
    console.info('[HanglianPad] Index enter login clicked');
    router.replaceUrl({
      url: 'pages/LoginPage'
    })
      .catch((error: BusinessError) => {
        console.error('[HanglianPad] Index enter login failed', error);
        this.statusText = '启动失败，请重新打开应用。';
      });
  }

  build() {
    Column({ space: 24 }) {
      Text('航联资料工作台')
        .fontSize(42)
        .fontWeight(FontWeight.Bold)
        .fontColor('#342316')

      Text(this.statusText)
        .fontSize(20)
        .fontColor('#76512A')

      Button('进入登录')
        .height(56)
        .width(160)
        .backgroundColor('#2F6B4F')
        .fontColor(Color.White)
        .onClick(() => {
          this.goLogin();
        })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .backgroundColor('#F7F2EA')
  }
}
