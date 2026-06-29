import router from '@ohos.router';
import { TokenStorageService } from '../services/TokenStorageService';

@Entry
@Component
struct SplashPage {
  @State loadingText: string = '正在检查登录状态...';

  aboutToAppear(): void {
    console.info('[HanglianPad] SplashPage aboutToAppear');
    setTimeout(() => {
      void this.bootstrap();
    }, 0);
  }

  private async bootstrap(): Promise<void> {
    try {
      const hasSession = await TokenStorageService.hasSession();
      router.replaceUrl({
        url: hasSession ? 'pages/WorkbenchPage' : 'pages/LoginPage'
      });
    } catch (error) {
      console.error('[HanglianPad] startup failed', error);
      try {
        await TokenStorageService.clear();
      } catch (clearError) {
        console.error('[HanglianPad] startup failed', clearError);
      } finally {
        router.replaceUrl({
          url: 'pages/LoginPage'
        });
      }
    }
  }

  build() {
    Column({ space: 20 }) {
      Text('航联生产平板')
        .fontSize(34)
        .fontWeight(FontWeight.Bold)
        .fontColor('#172033')
      LoadingProgress()
        .width(56)
        .height(56)
        .color('#2563EB')
      Text(this.loadingText)
        .fontSize(18)
        .fontColor('#64748B')
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .backgroundColor('#F6F8FB')
  }
}
