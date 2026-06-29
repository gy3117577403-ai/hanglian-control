import router from '@ohos.router';
import { BusinessError } from '@ohos.base';
import { DocumentCategoryGrid } from '../components/DocumentCategoryGrid';
import { OrderSidebar } from '../components/OrderSidebar';
import { UploadDocumentDialog } from '../components/UploadDocumentDialog';
import { AuthService } from '../services/AuthService';
import { CatalogService } from '../services/CatalogService';
import { TokenStorageService } from '../services/TokenStorageService';
import { WorkbenchApiClient } from '../services/WorkbenchApi';
import { WorkbenchRefreshBus } from '../services/WorkbenchRefreshBus';
import { DocumentCategory, ProductOption, WorkbenchRefreshEvent } from '../models/DocumentModels';
import { UserInfo } from '../models/AuthModels';
import {
  DocumentCategoryDefinition,
  DocumentCategoryKey,
  DocumentCategoryState,
  documentCategoryByKey,
  emptyDocumentCategories,
  OrderScope,
  WorkbenchOrder
} from '../model/WorkbenchTypes';

@Entry
@Component
struct WorkbenchPage {
  private api: WorkbenchApiClient = new WorkbenchApiClient();
  private uploadDialog: CustomDialogController | undefined = undefined;
  private unsubscribeRefresh: (() => void) | undefined = undefined;

  @State private displayName: string = '已登录用户';
  @State private userSubtitle: string = '登录态已保存';
  @State private isLoggingOut: boolean = false;
  @State private scope: OrderScope = 'today';
  @State private orders: WorkbenchOrder[] = [];
  @State private selectedOrder: WorkbenchOrder | null = null;
  @State private categories: DocumentCategoryState[] = emptyDocumentCategories();
  @State private searchKeyword: string = '';
  @State private ordersLoading: boolean = false;
  @State private documentsLoading: boolean = false;
  @State private errorMessage: string = '';
  @State private actionMessage: string = '工作台正在加载...';
  @State private tapCount: number = 0;
  @State private lastAction: string = '等待操作';
  @State private selectedProductId: string = '';
  @State private selectedProductModel: string = '';
  @State private selectedCustomerId: string = '';

  aboutToAppear(): void {
    console.info('[HanglianPad] WorkbenchPage aboutToAppear');
    this.unsubscribeRefresh = WorkbenchRefreshBus.subscribe((event: WorkbenchRefreshEvent) => {
      if (this.selectedProductId.length === 0 || this.selectedProductId === event.productId) {
        console.info('[HanglianPad] upload success');
        this.lastAction = `上传成功：${event.category}`;
        void this.refreshSelectedDocuments();
      }
    });
    void this.loadUserInfo();
    void this.refreshOrders(this.scope);
  }

  aboutToDisappear(): void {
    if (this.unsubscribeRefresh) {
      this.unsubscribeRefresh();
      this.unsubscribeRefresh = undefined;
    }
  }

  private renderTitle(): string {
    console.info('[HanglianPad] WorkbenchPage render');
    return '航联资料工作台';
  }

  private bump(action: string): void {
    this.tapCount += 1;
    this.lastAction = action;
  }

  private async loadUserInfo(): Promise<void> {
    try {
      const userInfo = await TokenStorageService.getUserInfo();
      this.applyUserInfo(userInfo);
    } catch (error) {
      console.error('[HanglianPad] WorkbenchPage load user failed', error);
      this.userSubtitle = this.errorText(error, '登录态读取失败');
    }
  }

  private applyUserInfo(userInfo?: UserInfo): void {
    if (!userInfo) {
      return;
    }

    this.displayName = userInfo.displayName ?? userInfo.name ?? userInfo.username ?? '已登录用户';
    this.userSubtitle = userInfo.username ? `账号：${userInfo.username}` : '登录态已保存';
  }

  private async logout(): Promise<void> {
    if (this.isLoggingOut) {
      return;
    }

    this.bump('退出登录');
    this.isLoggingOut = true;
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

  private filteredOrders(): WorkbenchOrder[] {
    const keyword = this.searchKeyword.trim().toLowerCase();
    const activeOrders = this.orders.filter((order: WorkbenchOrder) => !order.completed);
    if (!keyword) {
      return activeOrders;
    }

    return activeOrders.filter((order: WorkbenchOrder) => {
      return order.customerName.toLowerCase().indexOf(keyword) >= 0 ||
        order.productModel.toLowerCase().indexOf(keyword) >= 0 ||
        order.productName.toLowerCase().indexOf(keyword) >= 0 ||
        order.orderId.toLowerCase().indexOf(keyword) >= 0;
    });
  }

  private selectedOrderId(): string {
    return this.selectedOrder ? this.selectedOrder.orderId : '';
  }

  private currentCustomerText(): string {
    return this.selectedOrder ? this.selectedOrder.customerName : '未选择客户';
  }

  private currentProductText(): string {
    return this.selectedProductModel.length > 0 ? this.selectedProductModel : '未选择产品型号';
  }

  private modeText(): string {
    return this.api.isMockMode() ? 'mock fallback' : 'real API';
  }

  private errorText(error: Object, fallback: string): string {
    if (error instanceof Error) {
      return error.message;
    }
    return fallback;
  }

  private async refreshOrders(scope: OrderScope): Promise<void> {
    console.info('[HanglianPad] WorkbenchPage load data start');
    this.scope = scope;
    this.ordersLoading = true;
    this.errorMessage = '';
    this.actionMessage = scope === 'today' ? '正在加载今日订单...' : '正在加载本周订单...';

    try {
      const rows = await this.api.loadOrders(scope);
      this.orders = rows;
      const visible = this.filteredOrders();
      const firstWithProduct = visible.find((order: WorkbenchOrder) => order.productId.length > 0);
      const selected = firstWithProduct ?? (visible.length > 0 ? visible[0] : null);
      if (selected) {
        await this.openOrder(selected);
      } else {
        this.selectedOrder = null;
        this.categories = emptyDocumentCategories();
        await this.ensureProductFromCatalog();
        this.errorMessage = '暂无订单，已从产品列表选择测试产品。';
      }
      this.actionMessage = `订单已刷新：${scope === 'today' ? '今日订单' : '本周订单'} / ${this.modeText()}`;
    } catch (error) {
      console.error('[HanglianPad] WorkbenchPage load data failed', error);
      this.errorMessage = this.errorText(error, '订单接口失败');
      this.actionMessage = '订单接口失败，正在尝试从产品列表选择测试产品。';
      this.orders = [];
      this.selectedOrder = null;
      this.categories = emptyDocumentCategories();
      await this.ensureProductFromCatalog();
    } finally {
      this.ordersLoading = false;
    }
  }

  private async ensureProductFromCatalog(): Promise<boolean> {
    if (this.selectedProductId.length > 0) {
      return true;
    }

    try {
      const products = await CatalogService.getProducts();
      if (products.length === 0) {
        this.selectedProductId = '';
        this.selectedProductModel = '';
        this.selectedCustomerId = '';
        this.actionMessage = '暂无产品，请先进入客户与产品创建产品。';
        return false;
      }

      const product = products[0];
      const order = this.orderFromProduct(product);
      this.selectedOrder = order;
      this.applyProductSelection(order);
      await this.refreshSelectedDocuments();
      this.actionMessage = `已从产品列表选择测试产品：${this.selectedProductModel}`;
      return true;
    } catch (error) {
      console.error('[HanglianPad] WorkbenchPage load data failed', error);
      this.errorMessage = this.errorText(error, '产品列表加载失败');
      this.actionMessage = '产品列表加载失败，请进入客户与产品页面检查。';
      return false;
    }
  }

  private orderFromProduct(product: ProductOption): WorkbenchOrder {
    const model = this.productModelOf(product);
    return {
      id: `product-${product.id}`,
      orderId: `product-${product.id}`,
      date: '',
      weekPlanNo: '产品列表',
      customerId: product.customerId,
      customerName: product.customerName ?? '客户待确认',
      productId: product.id,
      productModel: model,
      productName: product.productName ?? '',
      quantity: 0,
      completedQuantity: 0,
      productionStatus: 'pending',
      status: 'pending',
      completed: false
    };
  }

  private productModelOf(product: ProductOption): string {
    if (product.productCode && product.productCode.length > 0) {
      return product.productCode;
    }
    if (product.productName && product.productName.length > 0) {
      return product.productName;
    }
    return product.id;
  }

  private applyProductSelection(order: WorkbenchOrder): void {
    this.selectedProductId = order.productId;
    this.selectedProductModel = order.productModel || order.productName || order.productId;
    this.selectedCustomerId = order.customerId;
  }

  private async openOrder(order: WorkbenchOrder): Promise<void> {
    this.selectedOrder = order;
    this.applyProductSelection(order);
    if (this.selectedProductId.length === 0) {
      await this.ensureProductFromCatalog();
      return;
    }
    await this.refreshSelectedDocuments();
  }

  private async refreshSelectedDocuments(): Promise<void> {
    this.documentsLoading = true;
    this.errorMessage = '';
    try {
      this.categories = await this.api.loadDocumentCategories(this.selectedOrder);
      if (this.selectedProductId.length > 0) {
        this.actionMessage = `${this.currentProductText()} 资料已刷新`;
      }
    } catch (error) {
      console.error('[HanglianPad] WorkbenchPage load data failed', error);
      this.errorMessage = this.errorText(error, '产品资料接口失败');
      this.categories = emptyDocumentCategories();
      this.actionMessage = '产品资料接口失败，资料卡片已保留，可点击重试。';
    } finally {
      this.documentsLoading = false;
    }
  }

  private completeOrder(order: WorkbenchOrder): void {
    this.bump(`完成订单：${order.productModel}`);
    this.orders = this.orders.map((item: WorkbenchOrder): WorkbenchOrder => {
      if (item.orderId !== order.orderId) {
        return item;
      }
      return this.completedOrder(item);
    });
    this.actionMessage = `${order.productModel} 已在本地标记完成`;
  }

  private completedOrder(order: WorkbenchOrder): WorkbenchOrder {
    return {
      id: order.id,
      orderId: order.orderId,
      date: order.date,
      weekPlanNo: order.weekPlanNo,
      customerId: order.customerId,
      customerName: order.customerName,
      productId: order.productId,
      productModel: order.productModel,
      productName: order.productName,
      quantity: order.quantity,
      completedQuantity: order.quantity,
      productionStatus: 'completed',
      status: 'completed',
      completed: true
    };
  }

  private search(keyword: string): void {
    this.bump(`搜索：${keyword}`);
    this.searchKeyword = keyword;
    const visible = this.filteredOrders();
    if (visible.length > 0) {
      void this.openOrder(visible[0]);
      this.actionMessage = `已按 "${keyword}" 筛选订单`;
    } else {
      this.actionMessage = keyword.trim().length > 0 ? `未找到 "${keyword}" 相关订单` : '已清空搜索';
    }
  }

  private async openImportPdf(): Promise<void> {
    console.info('[HanglianPad] click import pdf');
    this.bump('导入 PDF 图纸');
    if (this.selectedProductId.length === 0) {
      await this.ensureProductFromCatalog();
    }
    this.openUploadByKey('original_drawing');
  }

  private openUploadByKey(category: DocumentCategoryKey): void {
    const match = this.categories.find((item: DocumentCategoryState) => item.category === category);
    if (match) {
      this.openUpload(match);
      return;
    }

    const definition = documentCategoryByKey(category);
    const fallbackCategory: DocumentCategoryState = {
      category: definition.category,
      label: definition.label,
      documentType: definition.documentType,
      uploadStatus: 'missing',
      title: definition.label,
      version: '-',
      pageCount: 0,
      date: '-',
      documents: []
    };
    this.openUpload(fallbackCategory);
  }

  private openUpload(category: DocumentCategoryState): void {
    console.info(`[HanglianPad] click upload category ${category.category}`);
    this.bump(`上传 ${category.label}`);
    if (this.selectedProductId.length === 0) {
      this.actionMessage = '未选择产品，无法上传。请进入客户与产品创建或选择产品。';
      this.errorMessage = 'selectedProductId 为空';
      return;
    }

    const definition: DocumentCategoryDefinition = documentCategoryByKey(category.category);
    console.info('[HanglianPad] upload dialog open');
    this.uploadDialog = new CustomDialogController({
      builder: UploadDocumentDialog({
        initialCustomerId: this.selectedCustomerId,
        initialProductId: this.selectedProductId,
        initialPlanId: this.selectedOrder ? this.selectedOrder.orderId : undefined,
        initialCategory: definition.category as DocumentCategory,
        onUploaded: (event: WorkbenchRefreshEvent) => {
          console.info('[HanglianPad] upload success');
          this.actionMessage = `上传成功：${event.documentId}`;
          void this.refreshSelectedDocuments();
        }
      }),
      autoCancel: false,
      alignment: DialogAlignment.Center
    });
    this.uploadDialog.open();
  }

  private openPreview(category: DocumentCategoryState): void {
    this.bump(`预览 ${category.label}`);
    if (category.documents.length === 0) {
      this.actionMessage = '当前分类暂无资料，请先上传。';
      return;
    }

    const document = category.documents[0];
    if (document.documentId.length === 0) {
      this.actionMessage = '当前资料缺少 documentId，无法预览。';
      return;
    }

    console.info('[HanglianPad] preview document');
    router.pushUrl({
      url: 'pages/DocumentPreviewPage',
      params: {
        documentId: document.documentId,
        title: document.title
      }
    });
  }

  private deleteDocument(category: DocumentCategoryState): void {
    this.bump(`删除 ${category.label}`);
    this.actionMessage = '删除功能待确认';
  }

  private routeTo(label: string, url: string): void {
    this.bump(label);
    router.pushUrl({ url: url })
      .then(() => {
        this.lastAction = `${label} 已打开`;
      })
      .catch((error: BusinessError) => {
        this.lastAction = `${label} 跳转失败：${error.code} / ${error.message}`;
        this.actionMessage = this.lastAction;
      });
  }

  build() {
    Column({ space: 10 }) {
      this.TopBar();
      this.NavBar();

      Row({ space: 12 }) {
        OrderSidebar({
          orders: this.filteredOrders(),
          selectedOrderId: this.selectedOrderId(),
          scope: this.scope,
          isLoading: this.ordersLoading,
          errorMessage: this.errorMessage,
          onScopeChange: (nextScope: OrderScope) => {
            this.bump(nextScope === 'today' ? '今日订单' : '本周订单');
            void this.refreshOrders(nextScope);
          },
          onOrderSelect: (order: WorkbenchOrder) => {
            this.bump(`选择订单：${order.productModel}`);
            void this.openOrder(order);
          },
          onCompleteOrder: (order: WorkbenchOrder) => {
            this.completeOrder(order);
          }
        });

        Column({ space: 12 }) {
          this.SelectionPanel();

          DocumentCategoryGrid({
            categories: this.categories,
            isLoading: this.documentsLoading,
            onUpload: (category: DocumentCategoryState) => {
              this.openUpload(category);
            },
            onPreview: (category: DocumentCategoryState) => {
              this.openPreview(category);
            },
            onDelete: (category: DocumentCategoryState) => {
              this.deleteDocument(category);
            }
          })
          .layoutWeight(1);

          this.Diagnostics();
        }
        .layoutWeight(1)
        .height('100%')
      }
      .layoutWeight(1)
      .width('100%')
    }
    .width('100%')
    .height('100%')
    .padding(12)
    .backgroundColor('#F7F2EA')
  }

  @Builder
  private TopBar() {
    Row({ space: 14 }) {
      Text('HL')
        .fontSize(22)
        .fontWeight(FontWeight.Bold)
        .fontColor('#FFF8EA')
        .width(54)
        .height(54)
        .textAlign(TextAlign.Center)
        .backgroundColor('#9C5725')
        .borderRadius(8)

      Column({ space: 4 }) {
        Text(this.renderTitle())
          .fontSize(28)
          .fontWeight(FontWeight.Bold)
          .fontColor('#342316')
        Text(this.actionMessage)
          .fontSize(13)
          .fontColor(this.errorMessage.length > 0 ? '#A33F34' : '#76512A')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)

      Column({ space: 4 }) {
        Text(this.displayName)
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor('#342316')
        Text(this.userSubtitle)
          .fontSize(12)
          .fontColor('#76512A')
      }
      .width(220)
      .alignItems(HorizontalAlign.End)

      Button(this.isLoggingOut ? '退出中...' : '退出登录')
        .height(46)
        .width(116)
        .backgroundColor('#342316')
        .enabled(!this.isLoggingOut)
        .onClick(() => {
          void this.logout();
        })
    }
    .width('100%')
    .height(72)
    .padding({ left: 16, right: 16 })
    .backgroundColor('#FFF4DE')
    .border({ width: 1, color: '#70482347', radius: 8 })
  }

  @Builder
  private NavBar() {
    Row({ space: 10 }) {
      Button('导入 PDF 图纸')
        .layoutWeight(1)
        .height(48)
        .backgroundColor('#C87934')
        .fontColor(Color.White)
        .onClick(() => {
          void this.openImportPdf();
        })

      Button('客户与产品')
        .layoutWeight(1)
        .height(48)
        .backgroundColor('#2F6B4F')
        .fontColor(Color.White)
        .onClick(() => {
          console.info('[HanglianPad] click customer product');
          this.routeTo('客户与产品', 'pages/CustomerProductPage');
        })

      Button('连接器参数')
        .layoutWeight(1)
        .height(48)
        .backgroundColor('#2F6B4F')
        .fontColor(Color.White)
        .onClick(() => {
          console.info('[HanglianPad] click connector params');
          this.routeTo('连接器参数', 'pages/ConnectorParamPage');
        })

      Button('回收站')
        .layoutWeight(1)
        .height(48)
        .backgroundColor('#8F3F1D')
        .fontColor(Color.White)
        .onClick(() => {
          console.info('[HanglianPad] click recycle bin');
          this.routeTo('回收站', 'pages/RecycleBinPage');
        })

      Button('订单总览')
        .layoutWeight(1)
        .height(48)
        .backgroundColor('#614C8A')
        .fontColor(Color.White)
        .onClick(() => {
          console.info('[HanglianPad] click order overview');
          this.routeTo('订单总览', 'pages/OrderOverviewPage');
        })
    }
    .width('100%')
    .height(58)
    .padding({ left: 8, right: 8, top: 5, bottom: 5 })
    .backgroundColor('#FFF8EA')
    .border({ width: 1, color: '#70482324', radius: 8 })
  }

  @Builder
  private SelectionPanel() {
    Row({ space: 12 }) {
      Column({ space: 5 }) {
        Text('当前客户')
          .fontSize(13)
          .fontWeight(FontWeight.Bold)
          .fontColor('#7B6755')
        Text(this.currentCustomerText())
          .fontSize(22)
          .fontWeight(FontWeight.Bold)
          .fontColor('#2C231B')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)

      Column({ space: 5 }) {
        Text('当前产品型号')
          .fontSize(13)
          .fontWeight(FontWeight.Bold)
          .fontColor('#7B6755')
        Text(this.currentProductText())
          .fontSize(22)
          .fontWeight(FontWeight.Bold)
          .fontColor('#2F6F66')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)

      TextInput({ placeholder: '搜索订单、客户、产品型号', text: this.searchKeyword })
        .height(44)
        .width(280)
        .backgroundColor('#FFFCF4')
        .onChange((value: string) => {
          this.searchKeyword = value;
        })

      Button('搜索')
        .height(44)
        .width(88)
        .backgroundColor('#2F6B4F')
        .fontColor(Color.White)
        .onClick(() => {
          this.search(this.searchKeyword);
        })

      Button('重试')
        .height(44)
        .width(88)
        .backgroundColor('#9C5725')
        .fontColor(Color.White)
        .onClick(() => {
          this.bump('重试加载');
          void this.refreshOrders(this.scope);
        })

      Text(this.modeText())
        .fontSize(13)
        .fontWeight(FontWeight.Bold)
        .fontColor(this.api.isMockMode() ? '#9B5A25' : '#2F6F66')
        .padding({ left: 12, right: 12, top: 7, bottom: 7 })
        .backgroundColor(this.api.isMockMode() ? '#FFF3E4' : '#E8F3EE')
        .borderRadius(999)
    }
    .width('100%')
    .height(82)
    .padding({ left: 16, right: 16 })
    .backgroundColor('#FFFFFF')
    .border({ width: 1, color: '#E1E8E2', radius: 8 })
  }

  @Builder
  private Diagnostics() {
    Column({ space: 4 }) {
      Text(`tapCount: ${this.tapCount}    lastAction: ${this.lastAction}`)
        .fontSize(12)
        .fontColor('#6F5845')
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
      Text(`selectedProductId: ${this.selectedProductId || '-'}    selectedProductModel: ${this.selectedProductModel || '-'}`)
        .fontSize(12)
        .fontColor('#6F5845')
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
    }
    .width('100%')
    .padding({ left: 12, right: 12, top: 8, bottom: 8 })
    .backgroundColor('#FFF8EC')
    .borderRadius(8)
  }
}
