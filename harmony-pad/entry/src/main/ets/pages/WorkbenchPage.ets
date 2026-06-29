import router from '@ohos.router';
import { AuthService } from '../services/AuthService';
import { TokenStorageService } from '../services/TokenStorageService';
import { UserInfo } from '../models/AuthModels';

@Entry
@Component
struct WorkbenchPage {
  @State displayName: string = '已登录用户';
  @State statusText: string = '工作台正在加载...';
  @State errorText: string = '';
  @State isLoggingOut: boolean = false;

  aboutToAppear(): void {
    console.info('[HanglianPad] WorkbenchPage aboutToAppear');
    void this.loadUserInfo();
  }

  private async loadUserInfo(): Promise<void> {
    this.errorText = '';
    this.statusText = '工作台正在加载...';

    try {
      const userInfo = await TokenStorageService.getUserInfo();
      this.applyUserInfo(userInfo);
      this.statusText = '登录成功，工作台已进入。';
    } catch (error) {
      this.errorText = this.formatError(error);
      this.statusText = '工作台首屏已加载，但登录态读取失败。';
      console.error('[HanglianPad] WorkbenchPage load user failed', error);
    }
  }

  private applyUserInfo(userInfo?: UserInfo): void {
    if (!userInfo) {
      return;
    }

    this.displayName = userInfo.displayName ?? userInfo.name ?? userInfo.username ?? '已登录用户';
  }

  private async logout(): Promise<void> {
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;
    this.errorText = '';
    this.statusText = '正在退出登录...';

    try {
      await AuthService.logout();
    } catch (error) {
      console.error('[HanglianPad] WorkbenchPage logout failed', error);
    } finally {
      this.isLoggingOut = false;
      await router.replaceUrl({
        url: 'pages/LoginPage'
      });
    }
  }

  private formatError(error: Object): string {
    if (error instanceof Error) {
      return error.message;
    }
    return '未知错误';
  }

  build() {
    Column({ space: 24 }) {
      Text('航联资料工作台')
        .fontSize(42)
        .fontWeight(FontWeight.Bold)
        .fontColor('#0F172A')

      Text(this.statusText)
        .fontSize(24)
        .fontWeight(FontWeight.Medium)
        .fontColor('#2563EB')

      Text(`当前用户：${this.displayName}`)
        .fontSize(22)
        .fontColor('#334155')

      Text('API: https://fyeboolnlvqv.sealoshzh.site/api')
        .fontSize(16)
        .fontColor('#64748B')

      if (this.errorText.length > 0) {
        Text(this.errorText)
          .fontSize(16)
          .fontColor('#DC2626')
          .lineHeight(22)
          .width(560)
          .textAlign(TextAlign.Center)
      }

      Row({ space: 16 }) {
        Button('重新读取登录态')
          .height(56)
          .fontSize(20)
          .backgroundColor('#2563EB')
          .onClick(() => {
            void this.loadUserInfo();
          })

        Button(this.isLoggingOut ? '退出中...' : '退出登录')
          .height(56)
          .fontSize(20)
          .backgroundColor('#334155')
          .enabled(!this.isLoggingOut)
          .onClick(() => {
            void this.logout();
          })
      }
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .backgroundColor('#F6F8FB')
  }
}
