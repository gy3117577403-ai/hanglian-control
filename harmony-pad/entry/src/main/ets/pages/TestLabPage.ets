import router from '@ohos.router';
import { BusinessError } from '@ohos.base';
import { ApiClient } from '../services/ApiClient';
import { CatalogService } from '../services/CatalogService';
import { TokenStorageService } from '../services/TokenStorageService';
import { ProductOption } from '../models/DocumentModels';
import { UserInfo } from '../models/AuthModels';

interface TestItem {
  name: string;
  status: string;
  message: string;
}

@Entry
@Component
struct TestLabPage {
  @State private backendStatus: string = '待测试';
  @State private loginStatus: string = '未登录';
  @State private currentUser: string = '-';
  @State private currentProduct: string = '-';
  @State private running: boolean = false;
  @State private statusText: string = '点击一键自检开始。';
  @State private tests: TestItem[] = [
    { name: '后端健康', status: '未测试', message: '' },
    { name: '登录状态', status: '未测试', message: '' },
    { name: '客户列表', status: '未测试', message: '' },
    { name: '产品列表', status: '未测试', message: '' },
    { name: '今日订单', status: '未测试', message: '' },
    { name: '连接器参数', status: '未测试', message: '' },
    { name: '回收站', status: '未测试', message: '' },
    { name: '产品资料', status: '未测试', message: '' }
  ];

  aboutToAppear(): void {
    void this.loadEnvironment();
  }

  private async loadEnvironment(): Promise<void> {
    try {
      const userInfo = await TokenStorageService.getUserInfo();
      this.loginStatus = userInfo ? '已登录' : '未登录';
      this.currentUser = this.userName(userInfo);
    } catch (error) {
      this.loginStatus = '未登录';
      this.currentUser = '-';
    }

    try {
      const products = await CatalogService.getProducts();
      const product = products.length > 0 ? products[0] : undefined;
      this.currentProduct = product ? this.productModel(product) : '-';
    } catch (error) {
      console.error('[HanglianPad] test lab load products failed', error);
      this.currentProduct = '-';
    }
  }

  private userName(userInfo: UserInfo | undefined): string {
    if (!userInfo) return '-';
    return userInfo.displayName ?? userInfo.name ?? userInfo.username ?? '-';
  }

  private productModel(product: ProductOption): string {
    if (product.productCode && product.productCode.length > 0) return product.productCode;
    if (product.productName && product.productName.length > 0) return product.productName;
    return '-';
  }

  private setTest(name: string, passed: boolean, message: string): void {
    this.tests = this.tests.map((item: TestItem): TestItem => {
      if (item.name !== name) return item;
      return {
        name: item.name,
        status: passed ? '通过' : '失败',
        message
      };
    });
  }

  private async runCheck(name: string, action: () => Promise<void>): Promise<void> {
    this.setTest(name, false, '正在测试...');
    try {
      await action();
      this.setTest(name, true, '正常');
    } catch (error) {
      console.error('[HanglianPad] test lab check failed', name, error);
      this.setTest(name, false, '网络异常，请稍后重试');
    }
  }

  private async runAll(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.statusText = '正在执行现场功能自检...';
    this.backendStatus = '待测试';
    let firstProductId = '';

    await this.runCheck('后端健康', async () => {
      await ApiClient.get<object>('/health', { skipAuth: true });
      this.backendStatus = '正常';
    });
    await this.runCheck('登录状态', async () => {
      await ApiClient.get<object>('/auth/me');
      this.loginStatus = '已登录';
    });
    await this.runCheck('客户列表', async () => {
      await ApiClient.get<object>('/customers');
    });
    await this.runCheck('产品列表', async () => {
      const products = await CatalogService.getProducts();
      if (products.length === 0) {
        this.currentProduct = '-';
        return;
      }
      firstProductId = products[0].id;
      this.currentProduct = this.productModel(products[0]);
    });
    await this.runCheck('今日订单', async () => {
      await ApiClient.get<object>('/orders/today');
    });
    await this.runCheck('连接器参数', async () => {
      await ApiClient.get<object>('/connector-params');
    });
    await this.runCheck('回收站', async () => {
      await ApiClient.get<object>('/recycle-bin');
    });
    await this.runCheck('产品资料', async () => {
      if (firstProductId.length === 0) {
        const products = await CatalogService.getProducts();
        firstProductId = products.length > 0 ? products[0].id : '';
      }
      if (firstProductId.length === 0) {
        this.setTest('产品资料', true, '暂无产品，已跳过');
        return;
      }
      await ApiClient.get<object>(`/products/${encodeURIComponent(firstProductId)}/documents`);
    });

    this.statusText = '自检完成。';
    this.running = false;
  }

  private openPage(label: string, url: string): void {
    console.info('[HanglianPad] test lab open page', label);
    router.pushUrl({ url })
      .catch((error: BusinessError) => {
        console.error('[HanglianPad] test lab route failed', error);
        this.statusText = '页面打开失败，请稍后重试。';
      });
  }

  private openUploadPage(): void {
    console.info('[HanglianPad] test lab open upload');
    router.pushUrl({
      url: 'pages/DocumentUploadPage',
      params: {
        productModel: this.currentProduct,
        title: '原图'
      }
    }).catch((error: BusinessError) => {
      console.error('[HanglianPad] test lab upload route failed', error);
      this.statusText = '页面打开失败，请稍后重试。';
    });
  }

  private returnWorkbench(): void {
    router.replaceUrl({ url: 'pages/WorkbenchPage' })
      .catch((error: BusinessError) => {
        console.error('[HanglianPad] test lab return failed', error);
        this.statusText = '返回失败，请稍后重试。';
      });
  }

  private statusColor(status: string): string {
    if (status === '通过' || status === '正常' || status === '已登录') return '#2F6B4F';
    if (status === '失败' || status === '异常') return '#B91C1C';
    return '#9C5725';
  }

  build() {
    Column({ space: 12 }) {
      Row({ space: 10 }) {
        Text('现场功能自检')
          .fontSize(26)
          .fontWeight(FontWeight.Bold)
          .fontColor('#342316')
          .layoutWeight(1)
        Button('重新测试')
          .height(46)
          .width(116)
          .backgroundColor('#2F6B4F')
          .fontColor(Color.White)
          .onClick(() => {
            void this.runAll();
          })
        Button('返回工作台')
          .height(46)
          .width(120)
          .backgroundColor('#342316')
          .fontColor(Color.White)
          .onClick(() => {
            this.returnWorkbench();
          })
      }
      .width('100%')
      .height(82)
      .padding({ left: 16, right: 16 })
      .backgroundColor('#FFF4DE')
      .border({ width: 1, color: '#70482336', radius: 8 })

      Row({ space: 12 }) {
        this.EnvCard('后端连接', this.backendStatus);
        this.EnvCard('登录状态', this.loginStatus);
        this.EnvCard('当前用户', this.currentUser);
        this.EnvCard('当前产品', this.currentProduct);
      }
      .height(92)
      .width('100%')

      Row({ space: 10 }) {
        Button('一键自检')
          .height(50)
          .width(130)
          .backgroundColor('#C87934')
          .fontColor(Color.White)
          .onClick(() => {
            void this.runAll();
          })
        Button('打开客户与产品')
          .height(50)
          .layoutWeight(1)
          .backgroundColor('#2F6B4F')
          .fontColor(Color.White)
          .onClick(() => this.openPage('客户与产品', 'pages/CustomerProductPage'))
        Button('打开连接器参数')
          .height(50)
          .layoutWeight(1)
          .backgroundColor('#2F6B4F')
          .fontColor(Color.White)
          .onClick(() => this.openPage('连接器参数', 'pages/ConnectorParamPage'))
        Button('打开回收站')
          .height(50)
          .layoutWeight(1)
          .backgroundColor('#8F3F1D')
          .fontColor(Color.White)
          .onClick(() => this.openPage('回收站', 'pages/RecycleBinPage'))
        Button('打开订单总览')
          .height(50)
          .layoutWeight(1)
          .backgroundColor('#614C8A')
          .fontColor(Color.White)
          .onClick(() => this.openPage('订单总览', 'pages/OrderOverviewPage'))
        Button('打开上传页')
          .height(50)
          .layoutWeight(1)
          .backgroundColor('#9C5725')
          .fontColor(Color.White)
          .onClick(() => this.openUploadPage())
      }
      .width('100%')

      Scroll() {
        Column({ space: 8 }) {
          ForEach(this.tests, (item: TestItem) => {
            Row({ space: 10 }) {
              Text(item.name)
                .fontSize(18)
                .fontWeight(FontWeight.Bold)
                .fontColor('#342316')
                .layoutWeight(1)
              Text(item.status)
                .width(82)
                .fontSize(13)
                .fontWeight(FontWeight.Bold)
                .fontColor(Color.White)
                .textAlign(TextAlign.Center)
                .padding({ top: 8, bottom: 8 })
                .backgroundColor(this.statusColor(item.status))
                .borderRadius(6)
              Text(item.message.length > 0 ? item.message : '未测试')
                .width(220)
                .fontSize(14)
                .fontColor('#76512A')
                .maxLines(1)
                .textOverflow({ overflow: TextOverflow.Ellipsis })
            }
            .height(64)
            .width('100%')
            .padding({ left: 12, right: 12 })
            .backgroundColor('#FFFCF4')
            .border({ width: 1, color: '#70482324', radius: 8 })
          }, (item: TestItem) => item.name)
        }
      }
      .layoutWeight(1)
      .width('100%')

      Text(this.statusText)
        .width('100%')
        .height(42)
        .fontSize(14)
        .fontWeight(FontWeight.Bold)
        .fontColor('#6F5845')
        .padding({ left: 14, right: 14, top: 10, bottom: 10 })
        .backgroundColor('#FFF8EC')
        .borderRadius(8)
    }
    .width('100%')
    .height('100%')
    .padding(12)
    .backgroundColor('#F7F2EA')
  }

  @Builder
  private EnvCard(label: string, value: string) {
    Column({ space: 8 }) {
      Text(label)
        .fontSize(13)
        .fontWeight(FontWeight.Bold)
        .fontColor('#76512A')
      Text(value)
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
        .fontColor('#342316')
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
    }
    .layoutWeight(1)
    .height('100%')
    .padding(12)
    .alignItems(HorizontalAlign.Start)
    .backgroundColor('#FFF8EA')
    .border({ width: 1, color: '#70482336', radius: 8 })
  }
}
