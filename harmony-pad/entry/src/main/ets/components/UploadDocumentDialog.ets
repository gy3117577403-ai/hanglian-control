import common from '@ohos.app.ability.common';
import promptAction from '@ohos.promptAction';
import {
  categoryOptionFor,
  CustomerOption,
  DOCUMENT_CATEGORY_OPTIONS,
  DocumentCategory,
  ProductOption,
  safeDocumentTitle,
  SelectedUploadFile,
  UploadProgress,
  WorkbenchRefreshEvent
} from '../models/DocumentModels';
import { CameraService } from '../services/CameraService';
import { CatalogService } from '../services/CatalogService';
import { FilePickerService } from '../services/FilePickerService';
import { UploadService } from '../services/UploadService';

@CustomDialog
export struct UploadDocumentDialog {
  controller?: CustomDialogController;
  initialCustomerId?: string;
  initialProductId?: string;
  initialPlanId?: string;
  initialCategory: DocumentCategory = 'original_drawing';
  onUploaded?: (event: WorkbenchRefreshEvent) => void;

  @State private customers: CustomerOption[] = [];
  @State private products: ProductOption[] = [];
  @State private selectedCustomerId: string = '';
  @State private selectedProductId: string = '';
  @State private category: DocumentCategory = 'original_drawing';
  @State private requiredForProcess: string = 'common';
  @State private title: string = '';
  @State private version: string = 'Rev.A';
  @State private keywords: string = '';
  @State private remark: string = '';
  @State private selectedFile: SelectedUploadFile | undefined = undefined;
  @State private loadingCatalogs: boolean = false;
  @State private uploading: boolean = false;
  @State private uploadPercent: number = 0;
  @State private statusMessage: string = '请选择文件后上传资料。';

  aboutToAppear(): void {
    this.category = this.initialCategory;
    this.selectedCustomerId = this.initialCustomerId ?? '';
    this.selectedProductId = this.initialProductId ?? '';
    void this.loadCatalogs();
  }

  private async loadCatalogs(): Promise<void> {
    this.loadingCatalogs = true;
    try {
      const customers = await CatalogService.getCustomers();
      const products = await CatalogService.getProducts();
      this.customers = customers;
      this.products = products;
      if (!this.selectedCustomerId && customers.length > 0) {
        this.selectedCustomerId = customers[0].id;
      }
      if (this.selectedProductId) {
        const product = products.find((item: ProductOption) => item.id === this.selectedProductId);
        if (product) this.selectedCustomerId = product.customerId;
      }
      if (!this.selectedProductId) {
        const firstProduct = this.filteredProducts()[0];
        if (firstProduct) this.selectedProductId = firstProduct.id;
      }
      this.statusMessage = products.length > 0 ? '客户/产品已加载。' : '暂无产品，请先进入客户与产品创建产品。';
    } catch (error) {
      this.statusMessage = `客户/产品加载失败：${this.errorMessage(error)}`;
      promptAction.showToast({ message: this.statusMessage });
    } finally {
      this.loadingCatalogs = false;
    }
  }

  private filteredProducts(): ProductOption[] {
    if (!this.selectedCustomerId) return this.products;
    return this.products.filter((item: ProductOption) => item.customerId === this.selectedCustomerId);
  }

  private customerSelectOptions(): Array<SelectOption> {
    if (this.customers.length === 0) {
      const emptyOption: SelectOption = { value: '暂无客户' };
      return [emptyOption];
    }
    return this.customers.map((item: CustomerOption): SelectOption => {
      return { value: item.name || item.code || item.id };
    });
  }

  private productSelectOptions(): Array<SelectOption> {
    const products = this.filteredProducts();
    if (products.length === 0) {
      const emptyOption: SelectOption = { value: '暂无产品' };
      return [emptyOption];
    }
    return products.map((item: ProductOption): SelectOption => {
      return { value: `${item.productCode} ${item.productName}`.trim() };
    });
  }

  private categorySelectOptions(): Array<SelectOption> {
    return DOCUMENT_CATEGORY_OPTIONS.map((item): SelectOption => {
      return { value: item.label };
    });
  }

  private processSelectOptions(): Array<SelectOption> {
    const commonOption: SelectOption = { value: '通用' };
    const frontOption: SelectOption = { value: '前段' };
    const backOption: SelectOption = { value: '后段' };
    return [commonOption, frontOption, backOption];
  }

  private customerIndex(): number {
    const index = this.customers.findIndex((item: CustomerOption) => item.id === this.selectedCustomerId);
    return index >= 0 ? index : 0;
  }

  private productIndex(): number {
    const products = this.filteredProducts();
    const index = products.findIndex((item: ProductOption) => item.id === this.selectedProductId);
    return index >= 0 ? index : 0;
  }

  private categoryIndex(): number {
    const index = DOCUMENT_CATEGORY_OPTIONS.findIndex((item) => item.category === this.category);
    return index >= 0 ? index : 0;
  }

  private processIndex(): number {
    if (this.requiredForProcess === 'front') return 1;
    if (this.requiredForProcess === 'back') return 2;
    return 0;
  }

  private onCustomerSelected(index: number): void {
    const customer = this.customers[index];
    if (!customer) return;
    this.selectedCustomerId = customer.id;
    const product = this.filteredProducts()[0];
    this.selectedProductId = product ? product.id : '';
  }

  private onProductSelected(index: number): void {
    const product = this.filteredProducts()[index];
    if (!product) return;
    this.selectedProductId = product.id;
  }

  private onCategorySelected(index: number): void {
    const option = DOCUMENT_CATEGORY_OPTIONS[index];
    if (!option) return;
    this.category = option.category;
    this.fillTitleFromFile();
  }

  private onProcessSelected(index: number): void {
    this.requiredForProcess = index === 1 ? 'front' : index === 2 ? 'back' : 'common';
  }

  private async pickFile(): Promise<void> {
    const context = getContext(this) as common.UIAbilityContext;
    try {
      const file = await FilePickerService.pickDocument(context);
      if (!file) return;
      this.selectedFile = file;
      this.fillTitleFromFile();
      this.statusMessage = `已选择文件：${file.name}`;
    } catch (error) {
      this.statusMessage = `选择文件失败：${this.errorMessage(error)}`;
      promptAction.showToast({ message: this.statusMessage });
    }
  }

  private async takePhoto(): Promise<void> {
    const context = getContext(this) as common.UIAbilityContext;
    try {
      const file = await CameraService.takePhoto(context);
      if (!file) return;
      this.selectedFile = file;
      this.fillTitleFromFile();
      this.statusMessage = `已拍照：${file.name}`;
    } catch (error) {
      this.statusMessage = `拍照失败：${this.errorMessage(error)}`;
      promptAction.showToast({ message: this.statusMessage });
    }
  }

  private fillTitleFromFile(): void {
    if (!this.selectedFile) return;
    if (this.title.trim().length > 0) return;
    this.title = safeDocumentTitle(this.selectedFile.name, this.category);
  }

  private validate(): string {
    if (!this.selectedCustomerId) return '请选择客户。';
    if (!this.selectedProductId) return '请选择产品。';
    if (!this.selectedFile) return '请先拍照或选择文件。';
    if (this.title.trim().length === 0) return '请输入资料标题。';
    if (this.version.trim().length === 0) return '请输入版本号。';
    return '';
  }

  private async submit(): Promise<void> {
    const validation = this.validate();
    if (validation) {
      this.statusMessage = validation;
      promptAction.showToast({ message: validation });
      return;
    }
    const file = this.selectedFile as SelectedUploadFile;
    const category = categoryOptionFor(this.category);
    const context = getContext(this) as common.UIAbilityContext;
    this.uploading = true;
    this.uploadPercent = 0;
    this.statusMessage = '正在上传资料...';
    try {
      const documentId = await UploadService.uploadDocument(context, {
        productId: this.selectedProductId,
        planId: this.initialPlanId,
        category: this.category,
        documentType: category.documentType,
        title: this.title.trim(),
        version: this.version.trim(),
        requiredForProcess: this.requiredForProcess as 'front' | 'back' | 'common',
        keywords: this.keywords.trim(),
        remark: this.remark.trim(),
        file
      }, (progress: UploadProgress) => {
        this.uploadPercent = progress.percent;
      });
      if (this.onUploaded) {
        this.onUploaded({
          productId: this.selectedProductId,
          category: this.category,
          documentId
        });
      }
      console.info('[HanglianPad] upload success');
      this.statusMessage = '上传成功';
      promptAction.showToast({ message: '上传成功' });
      this.controller?.close();
    } catch (error) {
      this.statusMessage = `上传失败：${this.errorMessage(error)}`;
      promptAction.showToast({ message: this.statusMessage });
    } finally {
      this.uploading = false;
    }
  }

  private errorMessage(error: Object): string {
    if (error instanceof Error) return error.message;
    return JSON.stringify(error);
  }

  build() {
    Column({ space: 14 }) {
      Text('上传资料')
        .fontSize(22)
        .fontWeight(FontWeight.Bold)
        .fontColor('#111827')
        .width('100%')

      Text(this.statusMessage)
        .fontSize(13)
        .fontColor(this.statusMessage.indexOf('失败') >= 0 || this.statusMessage.indexOf('暂无产品') >= 0 ? '#B91C1C' : '#2563EB')
        .lineHeight(20)
        .width('100%')

      Scroll() {
        Column({ space: 12 }) {
          Text('选择客户')
            .fontSize(13)
            .fontWeight(FontWeight.Medium)
            .fontColor('#475569')
            .width('100%')
          Select(this.customerSelectOptions())
            .selected(this.customerIndex())
            .enabled(!this.uploading && !this.loadingCatalogs)
            .width('100%')
            .onSelect((index: number) => this.onCustomerSelected(index))

          Text('选择产品')
            .fontSize(13)
            .fontWeight(FontWeight.Medium)
            .fontColor('#475569')
            .width('100%')
          Select(this.productSelectOptions())
            .selected(this.productIndex())
            .enabled(!this.uploading && !this.loadingCatalogs)
            .width('100%')
            .onSelect((index: number) => this.onProductSelected(index))

          Text('当前模块/资料分类')
            .fontSize(13)
            .fontWeight(FontWeight.Medium)
            .fontColor('#475569')
            .width('100%')
          Select(this.categorySelectOptions())
            .selected(this.categoryIndex())
            .enabled(!this.uploading)
            .width('100%')
            .onSelect((index: number) => this.onCategorySelected(index))

          Text('适用工序')
            .fontSize(13)
            .fontWeight(FontWeight.Medium)
            .fontColor('#475569')
            .width('100%')
          Select(this.processSelectOptions())
            .selected(this.processIndex())
            .enabled(!this.uploading)
            .width('100%')
            .onSelect((index: number) => this.onProcessSelected(index))

          TextInput({ placeholder: '资料标题', text: this.title })
            .enabled(!this.uploading)
            .height(44)
            .onChange((value: string) => this.title = value)

          TextInput({ placeholder: '版本号', text: this.version })
            .enabled(!this.uploading)
            .height(44)
            .onChange((value: string) => this.version = value)

          TextInput({ placeholder: '关键词，可选', text: this.keywords })
            .enabled(!this.uploading)
            .height(44)
            .onChange((value: string) => this.keywords = value)

          TextInput({ placeholder: '备注，可选', text: this.remark })
            .enabled(!this.uploading)
            .height(44)
            .onChange((value: string) => this.remark = value)

          Row({ space: 10 }) {
            Button('拍照')
              .layoutWeight(1)
              .enabled(!this.uploading)
              .onClick(() => void this.takePhoto())
            Button('选择文件')
              .layoutWeight(1)
              .enabled(!this.uploading)
              .onClick(() => void this.pickFile())
          }
          .width('100%')

          if (this.selectedFile) {
            Column({ space: 4 }) {
              Text(this.selectedFile.name)
                .fontSize(14)
                .fontWeight(FontWeight.Medium)
                .fontColor('#111827')
                .maxLines(2)
                .textOverflow({ overflow: TextOverflow.Ellipsis })
              Text(`${this.selectedFile.mimeType} / ${Math.max(1, Math.ceil(this.selectedFile.size / 1024))} KB`)
                .fontSize(12)
                .fontColor('#64748B')
            }
            .padding(10)
            .backgroundColor('#F8FAFC')
            .borderRadius(8)
            .width('100%')
          }

          if (this.uploading) {
            Progress({ value: this.uploadPercent, total: 100, type: ProgressType.Linear })
              .width('100%')
            Text(`上传中 ${this.uploadPercent}%`)
              .fontSize(12)
              .fontColor('#2563EB')
              .width('100%')
          }
        }
        .width('100%')
      }
      .height(520)
      .width('100%')

      Row({ space: 10 }) {
        Button('取消')
          .type(ButtonType.Normal)
          .layoutWeight(1)
          .enabled(!this.uploading)
          .onClick(() => this.controller?.close())
        Button('上传资料')
          .layoutWeight(1)
          .enabled(!this.uploading)
          .onClick(() => void this.submit())
      }
      .width('100%')
    }
    .padding(20)
    .width('86%')
    .constraintSize({ maxWidth: 720 })
    .backgroundColor(Color.White)
    .borderRadius(8)
  }
}
