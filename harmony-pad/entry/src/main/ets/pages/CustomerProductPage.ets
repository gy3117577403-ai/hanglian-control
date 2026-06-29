import router from '@ohos.router';
import { BusinessError } from '@ohos.base';
import { CustomerPayload, CustomerProductService, ProductPayload } from '../services/CustomerProductService';
import { Customer, ProcessSegment, Product } from '../services/DomainModels';

@Entry
@Component
export struct CustomerProductPage {
  @State private customers: Customer[] = [];
  @State private products: Product[] = [];
  @State private selectedCustomerId: string = '';
  @State private selectedProductId: string = '';
  @State private lastAction: string = '等待操作';
  @State private errorText: string = '';
  @State private loadingText: string = '客户与产品页已加载';
  @State private sourceLabel: string = 'real API';
  @State private tapCount: number = 0;

  aboutToAppear(): void {
    void this.refresh();
  }

  private bump(action: string): void {
    this.tapCount += 1;
    this.lastAction = action;
    console.info(`[HanglianPad] ${action}`);
  }

  private errorMessage(error: Object, fallback: string): string {
    if (error instanceof Error) {
      return error.message;
    }
    return fallback;
  }

  private nowSuffix(): string {
    return `${Date.now()}`;
  }

  private selectedCustomerName(): string {
    const row = this.customers.find((item: Customer) => item.id === this.selectedCustomerId);
    return row ? row.name : '未选择客户';
  }

  private async refresh(): Promise<void> {
    this.bump('customer product refresh clicked');
    this.loadingText = '正在刷新客户与产品...';
    this.errorText = '';
    try {
      const customerResult = await CustomerProductService.listCustomers();
      const productResult = await CustomerProductService.listProducts();
      this.customers = customerResult.data;
      this.products = productResult.data;
      if (this.selectedCustomerId.length === 0 && this.customers.length > 0) {
        this.selectedCustomerId = this.customers[0].id;
      }
      if (this.selectedProductId.length === 0 && this.products.length > 0) {
        this.selectedProductId = this.products[0].id;
      }
      this.sourceLabel = customerResult.source === 'api' && productResult.source === 'api' ? 'API 在线' : 'mock fallback';
      this.loadingText = `${customerResult.message} / ${productResult.message}`;
      this.lastAction = 'customer product refresh success';
    } catch (error) {
      this.errorText = this.errorMessage(error, '客户与产品刷新失败');
      this.loadingText = '客户与产品刷新失败';
      this.lastAction = `customer product refresh failed: ${this.errorText}`;
    }
  }

  private async createTestCustomer(): Promise<string> {
    this.bump('create test customer clicked');
    this.errorText = '';
    const suffix = this.nowSuffix();
    const payload: CustomerPayload = {
      name: `测试客户-${suffix}`,
      code: `CUS-${suffix}`,
      salesOwner: 'MatePad'
    };
    try {
      const result = await CustomerProductService.createCustomer(payload);
      this.selectedCustomerId = result.data.id;
      this.loadingText = `${result.message} / customerId: ${result.data.id}`;
      this.lastAction = `create customer success: ${result.data.id}`;
      await this.refresh();
      return result.data.id;
    } catch (error) {
      this.errorText = this.errorMessage(error, '新增测试客户失败');
      this.lastAction = `create customer failed: ${this.errorText}`;
      return '';
    }
  }

  private async createTestProduct(): Promise<void> {
    this.bump('create test product clicked');
    this.errorText = '';
    let customerId = this.selectedCustomerId;
    if (customerId.length === 0) {
      customerId = await this.createTestCustomer();
    }
    if (customerId.length === 0) {
      this.errorText = '没有可绑定的客户，无法新增产品。';
      return;
    }

    const suffix = this.nowSuffix();
    const processSegment: ProcessSegment = '通用';
    const payload: ProductPayload = {
      customerId: customerId,
      productCode: `HL-TEST-${suffix}`,
      productName: `测试产品-${suffix}`,
      currentVersion: 'V1.0',
      processSegment: processSegment
    };

    try {
      const result = await CustomerProductService.createProduct(payload);
      this.selectedProductId = result.data.id;
      this.loadingText = `${result.message} / productId: ${result.data.id}`;
      this.lastAction = `create product success: ${result.data.id}`;
      await this.refresh();
    } catch (error) {
      this.errorText = this.errorMessage(error, '新增测试产品失败');
      this.lastAction = `create product failed: ${this.errorText}`;
    }
  }

  private async deleteSelectedCustomer(): Promise<void> {
    this.bump('delete selected customer clicked');
    if (this.selectedCustomerId.length === 0) {
      this.errorText = '请先选中一个客户。';
      return;
    }
    try {
      const result = await CustomerProductService.deleteCustomer(this.selectedCustomerId);
      this.loadingText = result.message;
      this.lastAction = `delete customer success: ${this.selectedCustomerId}`;
      this.selectedCustomerId = '';
      await this.refresh();
    } catch (error) {
      this.errorText = this.errorMessage(error, '删除客户失败');
      this.lastAction = `delete customer failed: ${this.errorText}`;
    }
  }

  private async deleteSelectedProduct(): Promise<void> {
    this.bump('delete selected product clicked');
    if (this.selectedProductId.length === 0) {
      this.errorText = '请先选中一个产品。';
      return;
    }
    try {
      const result = await CustomerProductService.deleteProduct(this.selectedProductId);
      this.loadingText = result.message;
      this.lastAction = `delete product success: ${this.selectedProductId}`;
      this.selectedProductId = '';
      await this.refresh();
    } catch (error) {
      this.errorText = this.errorMessage(error, '删除产品失败');
      this.lastAction = `delete product failed: ${this.errorText}`;
    }
  }

  private returnWorkbench(): void {
    this.bump('customer product return workbench clicked');
    router.replaceUrl({ url: 'pages/WorkbenchPage' })
      .catch((error: BusinessError) => {
        this.errorText = `返回工作台失败：${error.code} / ${error.message}`;
        this.lastAction = this.errorText;
      });
  }

  build() {
    Column({ space: 12 }) {
      this.Header();

      Row({ space: 12 }) {
        this.CustomerPanel();
        this.ProductPanel();
      }
      .layoutWeight(1)
      .width('100%')

      this.Diagnostics();
    }
    .width('100%')
    .height('100%')
    .padding(12)
    .backgroundColor('#F7F2EA')
  }

  @Builder
  private Header() {
    Row({ space: 10 }) {
      Column({ space: 4 }) {
        Text('客户与产品')
          .fontSize(26)
          .fontWeight(FontWeight.Bold)
          .fontColor('#342316')
        Text(`${this.loadingText} / ${this.sourceLabel}`)
          .fontSize(13)
          .fontColor(this.errorText.length > 0 ? '#B91C1C' : '#76512A')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)

      Button('刷新客户')
        .height(46)
        .width(110)
        .backgroundColor('#2F6B4F')
        .fontColor(Color.White)
        .onClick(() => {
          void this.refresh();
        })
      Button('新增测试客户')
        .height(46)
        .width(140)
        .backgroundColor('#C87934')
        .fontColor(Color.White)
        .onClick(() => {
          void this.createTestCustomer();
        })
      Button('新增测试产品')
        .height(46)
        .width(140)
        .backgroundColor('#614C8A')
        .fontColor(Color.White)
        .onClick(() => {
          void this.createTestProduct();
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
  }

  @Builder
  private CustomerPanel() {
    Column({ space: 10 }) {
      Row() {
        Text('客户列表')
          .fontSize(21)
          .fontWeight(FontWeight.Bold)
          .fontColor('#342316')
          .layoutWeight(1)
        Button('删除/停用选中客户')
          .height(42)
          .width(160)
          .backgroundColor('#8F3F1D')
          .fontColor(Color.White)
          .onClick(() => {
            void this.deleteSelectedCustomer();
          })
      }

      Scroll() {
        Column({ space: 8 }) {
          ForEach(this.customers, (customer: Customer) => {
            Row({ space: 10 }) {
              Column({ space: 4 }) {
                Text(customer.name)
                  .fontSize(18)
                  .fontWeight(FontWeight.Bold)
                  .fontColor('#342316')
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
                Text(`${customer.code} / ${customer.salesOwner || '-'} / 产品 ${customer.productCount ?? 0}`)
                  .fontSize(13)
                  .fontColor('#76512A')
              }
              .layoutWeight(1)
              .alignItems(HorizontalAlign.Start)

              Button(this.selectedCustomerId === customer.id ? '已选中' : '选中')
                .height(42)
                .width(86)
                .backgroundColor(this.selectedCustomerId === customer.id ? '#C87934' : '#2F6B4F')
                .fontColor(Color.White)
                .onClick(() => {
                  this.bump(`select customer clicked: ${customer.id}`);
                  this.selectedCustomerId = customer.id;
                })
            }
            .width('100%')
            .height(74)
            .padding({ left: 12, right: 12 })
            .backgroundColor(this.selectedCustomerId === customer.id ? '#FFF0CF' : '#FFFCF4')
            .border({ width: 1, color: this.selectedCustomerId === customer.id ? '#C87934' : '#70482324', radius: 8 })
          }, (customer: Customer) => customer.id)
        }
      }
      .layoutWeight(1)
      .width('100%')
    }
    .layoutWeight(1)
    .height('100%')
    .padding(12)
    .backgroundColor('#FFF8EA')
    .border({ width: 1, color: '#70482336', radius: 8 })
  }

  @Builder
  private ProductPanel() {
    Column({ space: 10 }) {
      Row() {
        Text(`产品列表 / 当前客户：${this.selectedCustomerName()}`)
          .fontSize(21)
          .fontWeight(FontWeight.Bold)
          .fontColor('#342316')
          .layoutWeight(1)
        Button('删除/停用选中产品')
          .height(42)
          .width(160)
          .backgroundColor('#8F3F1D')
          .fontColor(Color.White)
          .onClick(() => {
            void this.deleteSelectedProduct();
          })
      }

      Scroll() {
        Column({ space: 8 }) {
          ForEach(this.products, (product: Product) => {
            Row({ space: 10 }) {
              Column({ space: 4 }) {
                Text(product.productCode)
                  .fontSize(18)
                  .fontWeight(FontWeight.Bold)
                  .fontColor('#342316')
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
                Text(`${product.productName} / ${product.currentVersion} / ${product.customerName || product.customerId}`)
                  .fontSize(13)
                  .fontColor('#76512A')
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
              }
              .layoutWeight(1)
              .alignItems(HorizontalAlign.Start)

              Button(this.selectedProductId === product.id ? '已选中' : '选中')
                .height(42)
                .width(86)
                .backgroundColor(this.selectedProductId === product.id ? '#C87934' : '#2F6B4F')
                .fontColor(Color.White)
                .onClick(() => {
                  this.bump(`select product clicked: ${product.id}`);
                  this.selectedProductId = product.id;
                  this.selectedCustomerId = product.customerId;
                })
            }
            .width('100%')
            .height(74)
            .padding({ left: 12, right: 12 })
            .backgroundColor(this.selectedProductId === product.id ? '#FFF0CF' : '#FFFCF4')
            .border({ width: 1, color: this.selectedProductId === product.id ? '#C87934' : '#70482324', radius: 8 })
          }, (product: Product) => product.id)
        }
      }
      .layoutWeight(1)
      .width('100%')
    }
    .layoutWeight(1)
    .height('100%')
    .padding(12)
    .backgroundColor('#FFF8EA')
    .border({ width: 1, color: '#70482336', radius: 8 })
  }

  @Builder
  private Diagnostics() {
    Column({ space: 4 }) {
      Text(`tapCount: ${this.tapCount} / lastAction: ${this.lastAction}`)
        .fontSize(12)
        .fontColor('#6F5845')
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
      Text(`selectedCustomerId: ${this.selectedCustomerId || '-'} / selectedProductId: ${this.selectedProductId || '-'}`)
        .fontSize(12)
        .fontColor('#6F5845')
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
      Text(this.errorText.length > 0 ? `errorText: ${this.errorText}` : 'errorText: -')
        .fontSize(12)
        .fontColor(this.errorText.length > 0 ? '#B91C1C' : '#6F5845')
        .maxLines(2)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
    }
    .width('100%')
    .padding(12)
    .backgroundColor('#FFF8EC')
    .borderRadius(8)
  }
}
