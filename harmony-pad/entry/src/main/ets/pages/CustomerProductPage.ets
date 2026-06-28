import { CustomerProductService } from '../services/CustomerProductService';
import { Customer, ProcessSegment, Product } from '../services/DomainModels';

@Component
export struct CustomerProductPage {
  @State customers: Customer[] = [];
  @State products: Product[] = [];
  @State selectedCustomerId: string = '';
  @State editingCustomerId: string = '';
  @State editingProductId: string = '';
  @State customerName: string = '';
  @State customerCode: string = '';
  @State salesOwner: string = '';
  @State productCode: string = '';
  @State productName: string = '';
  @State currentVersion: string = '';
  @State productSegment: ProcessSegment = '通用';
  @State message: string = '准备加载客户与产品';
  @State sourceLabel: string = 'mock fallback 待命';

  aboutToAppear(): void {
    this.refresh();
  }

  build() {
    Row({ space: 12 }) {
      Column({ space: 12 }) {
        this.SectionTitle('客户列表', '新增、编辑、删除/停用客户');
        this.CustomerForm();
        this.CustomerList();
      }
      .layoutWeight(1)
      .height('100%');

      Column({ space: 12 }) {
        this.SectionTitle('产品列表', '新增、编辑、产品绑定客户');
        this.ProductForm();
        this.ProductList();
      }
      .layoutWeight(1)
      .height('100%');
    }
    .width('100%')
    .layoutWeight(1);
  }

  @Builder
  SectionTitle(title: string, subtitle: string) {
    Row() {
      Column({ space: 4 }) {
        Text(title)
          .fontSize(22)
          .fontWeight(FontWeight.Bold)
          .fontColor('#342316');
        Text(subtitle)
          .fontSize(13)
          .fontColor('#76512A');
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start);

      Column({ space: 3 }) {
        Text(this.sourceLabel)
          .fontSize(12)
          .fontWeight(FontWeight.Bold)
          .fontColor('#2F6B4F');
        Text(this.message)
          .fontSize(12)
          .fontColor('#76512A')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis });
      }
      .width(250)
      .alignItems(HorizontalAlign.End);
    }
    .width('100%')
    .height(70)
    .padding({ left: 14, right: 14 })
    .border({ width: 1, color: '#70482336', radius: 8 })
    .backgroundColor('#FFF8EA');
  }

  @Builder
  CustomerForm() {
    Column({ space: 8 }) {
      Row({ space: 8 }) {
        TextInput({ placeholder: '客户名称', text: this.customerName })
          .onChange((value: string) => {
            this.customerName = value;
          })
          .layoutWeight(1)
          .height(48)
          .borderRadius(8)
          .backgroundColor('#FFFCF4');
        TextInput({ placeholder: '客户编码', text: this.customerCode })
          .onChange((value: string) => {
            this.customerCode = value;
          })
          .layoutWeight(1)
          .height(48)
          .borderRadius(8)
          .backgroundColor('#FFFCF4');
      }
      Row({ space: 8 }) {
        TextInput({ placeholder: '销售负责人', text: this.salesOwner })
          .onChange((value: string) => {
            this.salesOwner = value;
          })
          .layoutWeight(1)
          .height(48)
          .borderRadius(8)
          .backgroundColor('#FFFCF4');
        Button(this.editingCustomerId.length > 0 ? '保存客户' : '新增客户')
          .height(48)
          .width(130)
          .backgroundColor('#A84E22')
          .onClick(() => {
            this.saveCustomer();
          });
        Button('清空')
          .height(48)
          .width(86)
          .fontColor('#342316')
          .backgroundColor('#F6DEB9')
          .onClick(() => {
            this.clearCustomerForm();
          });
      }
    }
    .width('100%')
    .padding(12)
    .border({ width: 1, color: '#70482330', radius: 8 })
    .backgroundColor('#FFF4DE');
  }

  @Builder
  CustomerList() {
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
                .textOverflow({ overflow: TextOverflow.Ellipsis });
              Text(`${customer.code} / ${customer.salesOwner || '未填写负责人'} / 产品 ${customer.productCount ?? 0}`)
                .fontSize(13)
                .fontColor('#76512A')
                .maxLines(1)
                .textOverflow({ overflow: TextOverflow.Ellipsis });
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Start);

            Button('绑定产品')
              .height(44)
              .width(102)
              .fontColor('#342316')
              .backgroundColor(this.selectedCustomerId === customer.id ? '#F3C36F' : '#F8E7C8')
              .onClick(() => {
                this.selectedCustomerId = customer.id;
              });
            Button('编辑')
              .height(44)
              .width(76)
              .backgroundColor('#2F6B4F')
              .onClick(() => {
                this.editCustomer(customer);
              });
            Button('停用')
              .height(44)
              .width(76)
              .backgroundColor('#8F3F1D')
              .onClick(() => {
                this.deleteCustomer(customer.id);
              });
          }
          .width('100%')
          .height(72)
          .padding({ left: 12, right: 12 })
          .border({ width: 1, color: this.selectedCustomerId === customer.id ? '#C45F24' : '#70482324', radius: 8 })
          .backgroundColor(this.selectedCustomerId === customer.id ? '#FFF0CF' : '#FFFCF4');
        }, (customer: Customer) => customer.id);
      }
    }
    .layoutWeight(1)
    .width('100%');
  }

  @Builder
  ProductForm() {
    Column({ space: 8 }) {
      Row({ space: 8 }) {
        TextInput({ placeholder: '产品编码', text: this.productCode })
          .onChange((value: string) => {
            this.productCode = value;
          })
          .layoutWeight(1)
          .height(48)
          .borderRadius(8)
          .backgroundColor('#FFFCF4');
        TextInput({ placeholder: '产品名称', text: this.productName })
          .onChange((value: string) => {
            this.productName = value;
          })
          .layoutWeight(1)
          .height(48)
          .borderRadius(8)
          .backgroundColor('#FFFCF4');
        TextInput({ placeholder: '版本', text: this.currentVersion })
          .onChange((value: string) => {
            this.currentVersion = value;
          })
          .width(100)
          .height(48)
          .borderRadius(8)
          .backgroundColor('#FFFCF4');
      }

      Row({ space: 8 }) {
        this.SegmentButton('前段');
        this.SegmentButton('后段');
        this.SegmentButton('通用');
        Text(this.selectedCustomerName())
          .layoutWeight(1)
          .height(48)
          .fontSize(14)
          .fontWeight(FontWeight.Bold)
          .fontColor('#76512A')
          .padding({ left: 12 })
          .border({ width: 1, color: '#70482324', radius: 8 })
          .backgroundColor('#FFFCF4');
        Button(this.editingProductId.length > 0 ? '保存产品' : '新增产品')
          .height(48)
          .width(130)
          .backgroundColor('#A84E22')
          .onClick(() => {
            this.saveProduct();
          });
        Button('清空')
          .height(48)
          .width(86)
          .fontColor('#342316')
          .backgroundColor('#F6DEB9')
          .onClick(() => {
            this.clearProductForm();
          });
      }
    }
    .width('100%')
    .padding(12)
    .border({ width: 1, color: '#70482330', radius: 8 })
    .backgroundColor('#FFF4DE');
  }

  @Builder
  SegmentButton(label: ProcessSegment) {
    Button(label)
      .height(48)
      .width(78)
      .fontColor(this.productSegment === label ? '#FFF8EA' : '#342316')
      .backgroundColor(this.productSegment === label ? '#2F6B4F' : '#F8E7C8')
      .onClick(() => {
        this.productSegment = label;
      });
  }

  @Builder
  ProductList() {
    Scroll() {
      Column({ space: 8 }) {
        ForEach(this.products, (product: Product) => {
          Row({ space: 10 }) {
            Column({ space: 4 }) {
              Row({ space: 8 }) {
                Text(product.productCode)
                  .fontSize(18)
                  .fontWeight(FontWeight.Bold)
                  .fontColor('#342316');
                Text(product.processSegment)
                  .fontSize(12)
                  .fontWeight(FontWeight.Bold)
                  .fontColor('#FFF8EA')
                  .padding({ left: 8, right: 8, top: 4, bottom: 4 })
                  .backgroundColor('#2F6B4F')
                  .borderRadius(6);
              }
              Text(`${product.productName} / ${product.currentVersion}`)
                .fontSize(14)
                .fontColor('#76512A')
                .maxLines(1)
                .textOverflow({ overflow: TextOverflow.Ellipsis });
              Text(`绑定客户：${product.customerName || this.customerNameById(product.customerId) || '未绑定'}`)
                .fontSize(13)
                .fontColor('#7A4A23');
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Start);

            Button('编辑')
              .height(44)
              .width(76)
              .backgroundColor('#2F6B4F')
              .onClick(() => {
                this.editProduct(product);
              });
            Button('删除')
              .height(44)
              .width(76)
              .backgroundColor('#8F3F1D')
              .onClick(() => {
                this.deleteProduct(product.id);
              });
          }
          .width('100%')
          .height(82)
          .padding({ left: 12, right: 12 })
          .border({ width: 1, color: '#70482324', radius: 8 })
          .backgroundColor('#FFFCF4');
        }, (product: Product) => product.id);
      }
    }
    .layoutWeight(1)
    .width('100%');
  }

  async refresh(): Promise<void> {
    const customerResult = await CustomerProductService.listCustomers();
    const productResult = await CustomerProductService.listProducts();
    this.customers = customerResult.data;
    this.products = productResult.data;
    if (this.selectedCustomerId.length === 0 && this.customers.length > 0) {
      this.selectedCustomerId = this.customers[0].id;
    }
    this.sourceLabel = customerResult.source === 'api' && productResult.source === 'api' ? 'API 在线' : 'mock fallback';
    this.message = `${customerResult.message}；${productResult.message}`;
  }

  async saveCustomer(): Promise<void> {
    if (this.customerName.trim().length === 0) {
      this.message = '请先填写客户名称';
      return;
    }
    const payload = {
      name: this.customerName.trim(),
      code: this.customerCode.trim(),
      salesOwner: this.salesOwner.trim()
    };
    const result = this.editingCustomerId.length > 0
      ? await CustomerProductService.updateCustomer(this.editingCustomerId, payload)
      : await CustomerProductService.createCustomer(payload);
    this.message = result.message;
    this.selectedCustomerId = result.data.id;
    this.clearCustomerForm();
    await this.refresh();
  }

  async deleteCustomer(id: string): Promise<void> {
    const result = await CustomerProductService.deleteCustomer(id);
    this.message = result.message;
    if (this.selectedCustomerId === id) {
      this.selectedCustomerId = '';
    }
    await this.refresh();
  }

  async saveProduct(): Promise<void> {
    if (this.selectedCustomerId.length === 0) {
      this.message = '请先选择客户，再新增或编辑产品';
      return;
    }
    if (this.productCode.trim().length === 0 || this.productName.trim().length === 0) {
      this.message = '请填写产品编码和产品名称';
      return;
    }
    const payload = {
      customerId: this.selectedCustomerId,
      productCode: this.productCode.trim(),
      productName: this.productName.trim(),
      currentVersion: this.currentVersion.trim().length > 0 ? this.currentVersion.trim() : 'V1.0',
      processSegment: this.productSegment
    };
    const result = this.editingProductId.length > 0
      ? await CustomerProductService.updateProduct(this.editingProductId, payload)
      : await CustomerProductService.createProduct(payload);
    this.message = result.message;
    this.clearProductForm();
    await this.refresh();
  }

  async deleteProduct(id: string): Promise<void> {
    const result = await CustomerProductService.deleteProduct(id);
    this.message = result.message;
    await this.refresh();
  }

  editCustomer(customer: Customer): void {
    this.editingCustomerId = customer.id;
    this.customerName = customer.name;
    this.customerCode = customer.code;
    this.salesOwner = customer.salesOwner;
    this.selectedCustomerId = customer.id;
  }

  editProduct(product: Product): void {
    this.editingProductId = product.id;
    this.selectedCustomerId = product.customerId;
    this.productCode = product.productCode;
    this.productName = product.productName;
    this.currentVersion = product.currentVersion;
    this.productSegment = product.processSegment;
  }

  clearCustomerForm(): void {
    this.editingCustomerId = '';
    this.customerName = '';
    this.customerCode = '';
    this.salesOwner = '';
  }

  clearProductForm(): void {
    this.editingProductId = '';
    this.productCode = '';
    this.productName = '';
    this.currentVersion = '';
    this.productSegment = '通用';
  }

  selectedCustomerName(): string {
    const name = this.customerNameById(this.selectedCustomerId);
    return name.length > 0 ? `绑定客户：${name}` : '请从左侧选择客户';
  }

  customerNameById(id: string): string {
    const customer = this.customers.find((item: Customer) => item.id === id);
    return customer?.name ?? '';
  }
}
