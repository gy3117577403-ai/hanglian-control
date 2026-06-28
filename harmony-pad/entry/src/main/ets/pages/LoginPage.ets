import promptAction from '@ohos.promptAction';
import router from '@ohos.router';
import { AuthService } from '../services/AuthService';
import { AppConfig } from '../services/AppConfig';

@Entry
@Component
struct LoginPage {
  @State username: string = '';
  @State password: string = '';
  @State errorText: string = '';
  @State isSubmitting: boolean = false;

  private canSubmit(): boolean {
    return this.username.trim().length > 0 && this.password.length > 0 && !this.isSubmitting;
  }

  private async submit(): Promise<void> {
    if (!this.canSubmit()) {
      return;
    }

    this.errorText = '';
    this.isSubmitting = true;

    try {
      await AuthService.login(this.username.trim(), this.password);
      promptAction.showToast({
        message: '登录成功'
      });
      router.replaceUrl({
        url: 'pages/WorkbenchPage'
      });
    } catch (error) {
      this.errorText = error instanceof Error ? error.message : '登录失败，请检查账号、密码和网络。';
    } finally {
      this.isSubmitting = false;
    }
  }

  build() {
    Row() {
      Column({ space: 18 }) {
        Text('航联')
          .fontSize(52)
          .fontWeight(FontWeight.Bold)
          .fontColor('#0F172A')
        Text('MatePad 原生工作台')
          .fontSize(28)
          .fontWeight(FontWeight.Medium)
          .fontColor('#1E40AF')
        Text('轻量登录入口，连接 Sealos 公网 HTTPS 后端。')
          .fontSize(18)
          .fontColor('#64748B')
          .lineHeight(28)
          .width(420)
        Text(`API: ${AppConfig.API_BASE_URL}`)
          .fontSize(14)
          .fontColor('#94A3B8')
          .margin({ top: 20 })
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
          this.submit();
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
