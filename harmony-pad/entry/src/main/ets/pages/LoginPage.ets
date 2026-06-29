import router from '@ohos.router';
import { BusinessError } from '@ohos.base';
import { ApiError } from '../services/ApiClient';
import { AuthService } from '../services/AuthService';

@Entry
@Component
struct LoginPage {
  @State username: string = 'admin';
  @State password: string = '123';
  @State errorText: string = '';
  @State statusText: string = '请输入账号密码后点击登录';
  @State isSubmitting: boolean = false;

  aboutToAppear(): void {
    console.info('[HanglianPad] LoginPage aboutToAppear');
  }

  private renderMarker(): string {
    console.info('[HanglianPad] LoginPage build/render');
    return '登录页已加载';
  }

  private canSubmit(): boolean {
    return this.username.trim().length > 0 && this.password.length > 0 && !this.isSubmitting;
  }

  private async submit(): Promise<void> {
    if (!this.canSubmit()) {
      return;
    }

    this.isSubmitting = true;
    this.errorText = '';
    this.statusText = '正在登录...';

    try {
      await AuthService.login(this.username.trim(), this.password);
      this.statusText = '登录成功，正在进入工作台...';
      await this.waitBeforeNavigation();
      await this.navigateToWorkbench();
    } catch (error) {
      this.errorText = this.formatError(error);
      this.statusText = '登录失败，请检查错误信息。';
      console.error('[HanglianPad] LoginPage login failed', error);
    } finally {
      this.isSubmitting = false;
    }
  }

  private waitBeforeNavigation(): Promise<void> {
    return new Promise((resolve: () => void) => {
      setTimeout(() => {
        resolve();
      }, 350);
    });
  }

  private async navigateToWorkbench(): Promise<void> {
    try {
      await router.replaceUrl({
        url: 'pages/WorkbenchPage'
      });
    } catch (error) {
      this.errorText = `Workbench 跳转失败：${this.formatRouterError(error)}`;
      this.statusText = '登录成功，但跳转工作台失败。';
      console.error('[HanglianPad] LoginPage workbench navigation failed', error);
    }
  }

  private formatError(error: Object): string {
    if (error instanceof ApiError) {
      let message = `HTTP ${error.statusCode}: ${error.message}`;
      if (error.requestUrl.length > 0) {
        message += `\nURL: ${error.requestUrl}`;
      }
      if (error.responseBody.length > 0) {
        message += `\n响应: ${error.responseBody}`;
      }
      return message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return '登录失败：未知错误';
  }

  private formatRouterError(error: Object): string {
    const businessError = error as BusinessError;
    if (businessError.code !== undefined) {
      return `${businessError.code} / ${businessError.message}`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return '未知错误';
  }

  build() {
    Row() {
      Column({ space: 18 }) {
        Text('航联')
          .fontSize(52)
          .fontWeight(FontWeight.Bold)
          .fontColor('#0F172A')
        Text(this.renderMarker())
          .fontSize(26)
          .fontWeight(FontWeight.Bold)
          .fontColor('#008000')
        Text('MatePad 原生工作台')
          .fontSize(28)
          .fontWeight(FontWeight.Medium)
          .fontColor('#1E40AF')
        Text('API: https://fyeboolnlvqv.sealoshzh.site/api')
          .fontSize(16)
          .fontColor('#64748B')
          .lineHeight(24)
          .width(460)
      }
      .layoutWeight(1)
      .height('100%')
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Start)
      .padding({ left: 72, right: 40 })

      Column({ space: 24 }) {
        Text('账号登录')
          .fontSize(32)
          .fontWeight(FontWeight.Bold)
          .fontColor('#172033')
          .width('100%')
          .textAlign(TextAlign.Start)

        Column({ space: 16 }) {
          Text(this.statusText)
            .fontSize(16)
            .fontColor(this.errorText.length > 0 ? '#DC2626' : '#2563EB')
            .lineHeight(22)
            .width('100%')

          Text('账号')
            .fontSize(16)
            .fontColor('#475569')
            .width('100%')
          TextInput({
            placeholder: '请输入账号',
            text: this.username
          })
            .height(60)
            .fontSize(20)
            .borderRadius(16)
            .backgroundColor('#F8FAFC')
            .padding({ left: 20, right: 20 })
            .onChange((value: string) => {
              this.username = value;
            })

          Text('密码')
            .fontSize(16)
            .fontColor('#475569')
            .width('100%')
            .margin({ top: 8 })
          TextInput({
            placeholder: '请输入密码',
            text: this.password
          })
            .type(InputType.Password)
            .height(60)
            .fontSize(20)
            .borderRadius(16)
            .backgroundColor('#F8FAFC')
            .padding({ left: 20, right: 20 })
            .onChange((value: string) => {
              this.password = value;
            })
        }
        .width('100%')

        if (this.errorText.length > 0) {
          Text(this.errorText)
            .fontSize(15)
            .fontColor('#DC2626')
            .lineHeight(22)
            .width('100%')
            .padding({ left: 4, right: 4 })
        }

        Button({ type: ButtonType.Capsule, stateEffect: true }) {
          Text(this.isSubmitting ? '登录中...' : '登录')
            .fontSize(22)
            .fontWeight(FontWeight.Medium)
            .fontColor(Color.White)
        }
        .height(64)
        .width('100%')
        .backgroundColor(this.canSubmit() ? '#2563EB' : '#CBD5E1')
        .enabled(this.canSubmit())
        .onClick(() => {
          void this.submit();
        })
      }
      .width(460)
      .padding({ left: 40, right: 40, top: 42, bottom: 42 })
      .borderRadius(28)
      .backgroundColor(Color.White)
      .shadow({
        radius: 24,
        color: '#1820331A',
        offsetX: 0,
        offsetY: 10
      })
      .margin({ right: 72 })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F6F8FB')
  }
}
