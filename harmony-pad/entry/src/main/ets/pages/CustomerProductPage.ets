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
  @State private statusText: string = '客户与产品页已加载。';
  @State private errorText: string = '';

  aboutToAppear(): void {
    void this.refresh();
  }

  private logAction(action: string): void {
    console.info(`[HanglianPad] ${action}`);
  }

  private showFailure(action: string, error: Object): void {
    console.error(`[HanglianPad] ${action} failed`, error);
    this.errorText = '操作失败，请稍后重试。';
    this.statusText = this.errorText;
  }

  private nowSuffix(): string {
    return `${Date.now()}`;
  }

  private selectedCustomerName(): string {
    const row = this.customers.find((item: Customer) => item.id === this.selectedCustomerId);
    return row ? row.name : '未选择客户';
  }

  private async refresh(): Promise<void> {
    this.logAction('customer product refresh clicked');
    this.statusText = '正在刷新客户与产品...';
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
      this.statusText = '资料已更新。';
    } catch (error) {
      this.showFailure('customer product refresh', error);
    }
  }

  private async createCustomer(): Promise<string> {
    this.logAction('create customer clicked');
    this.errorText = '';
    const suffix = this.nowSuffix();
    const payload: CustomerPayload = {
      name: `现场客户-${suffix}`,
      code: `CUS-${suffix}`,
      salesOwner: '现场'
    };
    try {
      const result = await CustomerProductService.createCustomer(payload);
      this.selectedCustomerId = result.data.id;
      this.statusText = '新增成功。';
      await this.refresh();
      return result.data.id;
    } catch (error) {
      this.showFailure('create customer', error);
      return '';
    }
  }

  private async createProduct(): Promise<void> {
    this.logAction('create product clicked');
    this.errorText = '';
    let customerId = this.selectedCustomerId;
    if (customerId.length === 0) {
      customerId = await this.createCustomer();
    }
    if (customerId.length === 0) {
      this.statusText = '请先新增客户。';
      return;
    }

    const suffix = this.nowSuffix();
    const processSegment: ProcessSegment = '通用';
    const payload: ProductPayload = {
      customerId: customerId,
      productCode: `HL-${suffix}`,
      productName: `线束产品-${suffix}`,
      currentVersion: 'V1.0',
      processSegment: processSegment
    };

    try {
      const result = await CustomerProductService.createProduct(payload);
      this.selectedProductId = result.data.id;
      this.statusText = '新增成功。';
      await this.refresh();
    } catch (error) {
      this.showFailure('create product', error);
    }
  }

  private async deleteSelectedCustomer(): Promise<void> {
    this.logAction('delete selected customer clicked');
    if (this.selectedCustomerId.length === 0) {
      this.statusText = '请先选择客户。';
      return;
    }
    try {
      await CustomerProductService.deleteCustomer(this.selectedCustomerId);
      this.selectedCustomerId = '';
      this.statusText = '删除成功。';
      await this.refresh();
    } catch (error) {
      this.showFailure('delete customer', error);
    }
  }

  private async deleteSelectedProduct(): Promise<void> {
    this.logAction('delete selected product clicked');
    if (this.selectedProductId.length === 0) {
      this.statusText = '请先选择产品。';
      return;
    }
    try {
      await CustomerProductService.deleteProduct(this.selectedProductId);
      this.selectedProductId = '';
      this.statusText = '删除成功。';
      await this.refresh();
    } catch (error) {
      this.showFailure('delete product', error);
    }
  }

  private editCustomer(customer: Customer): void {
    this.logAction('edit customer clicked');
    this.selectedCustomerId = customer.id;
    this.statusText = '已选择客户，可继续新增产品或删除。';
  }

  private editProduct(product: Product): void {
    this.logAction('edit product clicked');
    this.selectedProductId = product.id;
    this.selectedCustomerId = product.customerId;
    this.statusText = '已选择产品，可返回工作台上传资料。';
  }

  private returnWorkbench(): void {
    this.logAction('customer product return workbench clicked');
    router.replaceUrl({ url: 'pages/WorkbenchPage' })
      .catch((error: BusinessError) => {
        console.error('[HanglianPad] return workbench failed', error);
        this.statusText = '操作失败，请稍后重试。';
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

      this.StatusPanel();
    }
    .width('100%')
    .height('100%')
    .padding(12)
    .backgroundColor('#F7F2EA')
  }

  @Builder
  private Header() {
    Row({ space: 10 }) {
      Text('客户与产品')
        .fontSize(26)
        .fontWeight(FontWeight.Bold)
        .fontColor('#342316')
        .layoutWeight(1)

      Button('新增客户')
        .height(46)
        .width(120)
        .backgroundColor('#C87934')
        .fontColor(Color.White)
        .onClick(() => {
          void this.createCustomer();
        })
      Button('新增产品')
        .height(46)
        .width(120)
        .backgroundColor('#614C8A')
        .fontColor(Color.White)
        .onClick(() => {
          void this.createProduct();
        })
      Button('刷新')
        .height(46)
        .width(92)
        .backgroundColor('#2F6B4F')
        .fontColor(Color.White)
        .onClick(() => {
          void this.refresh();
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
        Button('删除')
          .height(42)
          .width(86)
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
                Text(`状态：启用 / 产品 ${customer.productCount ?? 0} / 创建时间：-`)
                  .fontSize(13)
                  .fontColor('#76512A')
              }
              .layoutWeight(1)
              .alignItems(HorizontalAlign.Start)

              Button(this.selectedCustomerId === customer.id ? '已选择' : '选择')
                .height(42)
                .width(86)
                .backgroundColor(this.selectedCustomerId === customer.id ? '#C87934' : '#2F6B4F')
                .fontColor(Color.White)
                .onClick(() => {
                  this.editCustomer(customer);
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
        Button('删除')
          .height(42)
          .width(86)
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
                Text(`${product.productName} / ${product.currentVersion} / 状态：${product.isActive === false ? '停用' : '启用'} / 创建时间：-`)
                  .fontSize(13)
                  .fontColor('#76512A')
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
              }
              .layoutWeight(1)
              .alignItems(HorizontalAlign.Start)

              Button(this.selectedProductId === product.id ? '已选择' : '编辑')
                .height(42)
                .width(86)
                .backgroundColor(this.selectedProductId === product.id ? '#C87934' : '#2F6B4F')
                .fontColor(Color.White)
                .onClick(() => {
                  this.editProduct(product);
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
  private StatusPanel() {
    Text(this.errorText.length > 0 ? this.errorText : this.statusText)
      .width('100%')
      .height(42)
      .fontSize(14)
      .fontWeight(FontWeight.Bold)
      .fontColor(this.errorText.length > 0 ? '#B91C1C' : '#6F5845')
      .padding({ left: 14, right: 14, top: 10, bottom: 10 })
      .backgroundColor(this.errorText.length > 0 ? '#FFF0EC' : '#FFF8EC')
      .borderRadius(8)
  }
}
