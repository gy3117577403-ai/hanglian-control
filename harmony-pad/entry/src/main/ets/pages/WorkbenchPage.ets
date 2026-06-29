import router from '@ohos.router';
import { BusinessError } from '@ohos.base';
import { DocumentCategoryGrid } from '../components/DocumentCategoryGrid';
import { OrderSidebar } from '../components/OrderSidebar';
import { AuthService } from '../services/AuthService';
import { ApiClient } from '../services/ApiClient';
import { CatalogService } from '../services/CatalogService';
import { TokenStorageService } from '../services/TokenStorageService';
import { WorkbenchApiClient } from '../services/WorkbenchApi';
import { WorkbenchRefreshBus } from '../services/WorkbenchRefreshBus';
import { ProductOption, WorkbenchRefreshEvent } from '../models/DocumentModels';
import { UserInfo } from '../models/AuthModels';
import {
  DocumentCategoryDefinition,
  DocumentCategoryKey,
  DocumentCategoryState,
  documentCategoryByKey,
  emptyDocumentCategories,
  OrderScope,
  WorkbenchDocument,
  WorkbenchOrder
} from '../model/WorkbenchTypes';

@Entry
@Component
struct WorkbenchPage {
  private api: WorkbenchApiClient = new WorkbenchApiClient();
  private unsubscribeRefresh: (() => void) | undefined = undefined;

  @State private displayName: string = '已登录用户';
  @State private scope: OrderScope = 'today';
  @State private orders: WorkbenchOrder[] = [];
  @State private selectedOrder: WorkbenchOrder | null = null;
  @State private categories: DocumentCategoryState[] = emptyDocumentCategories();
  @State private searchKeyword: string = '';
  @State private ordersLoading: boolean = false;
  @State private documentsLoading: boolean = false;
  @State private statusText: string = '工作台正在加载...';
  @State private errorText: string = '';
  @State private selectedProductId: string = '';
  @State private selectedProductModel: string = '';
  @State private selectedCustomerId: string = '';
  @State private pendingDeleteDocumentId: string = '';
  @State private labClicks: number = 0;

  aboutToAppear(): void {
    console.info('[HanglianPad] WorkbenchPage render');
    this.unsubscribeRefresh = WorkbenchRefreshBus.subscribe((event: WorkbenchRefreshEvent) => {
      console.info('[HanglianPad] Workbench refresh event received', event.category);
      if (this.selectedProductId.length === 0 || this.selectedProductId === event.productId) {
        this.statusText = '上传成功，资料已更新。';
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

  private logAction(action: string): void {
    console.info(`[HanglianPad] ${action}`);
  }

  private friendlyError(error: Object, fallback: string): string {
    console.error('[HanglianPad] workbench operation failed', error);
    return fallback;
  }

  private async loadUserInfo(): Promise<void> {
    try {
      const userInfo = await TokenStorageService.getUserInfo();
      if (userInfo) {
        this.applyUserInfo(userInfo);
      }
    } catch (error) {
      console.error('[HanglianPad] WorkbenchPage load user failed', error);
    }
  }

  private applyUserInfo(userInfo: UserInfo): void {
    this.displayName = userInfo.displayName ?? userInfo.name ?? userInfo.username ?? '已登录用户';
  }

  private async logout(): Promise<void> {
    this.logAction('logout clicked');
    this.statusText = '正在退出登录...';
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('[HanglianPad] WorkbenchPage logout failed', error);
    }
    await router.replaceUrl({ url: 'pages/LoginPage' });
  }

  private filteredOrders(): WorkbenchOrder[] {
    const keyword = this.searchKeyword.trim().toLowerCase();
    const activeOrders = this.orders.filter((order: WorkbenchOrder) => !order.completed);
    if (keyword.length === 0) {
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
    return this.selectedProductModel.length > 0 ? this.selectedProductModel : '未选择产品';
  }

  private async refreshOrders(scope: OrderScope): Promise<void> {
    this.logAction(scope === 'today' ? 'refresh today orders clicked' : 'refresh week orders clicked');
    this.scope = scope;
    this.ordersLoading = true;
    this.errorText = '';
    this.statusText = scope === 'today' ? '正在加载今日订单...' : '正在加载本周订单...';

    try {
      const rows = await this.api.loadOrders(scope);
      this.orders = rows;
      const visible = this.filteredOrders();
      const firstWithProduct = visible.find((order: WorkbenchOrder) => order.productId.length > 0);
      const selected = firstWithProduct ?? (visible.length > 0 ? visible[0] : null);
      if (selected) {
        await this.openOrder(selected);
        this.statusText = `已选择产品：${this.currentProductText()}`;
      } else {
        this.selectedOrder = null;
        this.categories = emptyDocumentCategories();
        const hasProduct = await this.ensureProductFromCatalog();
        this.statusText = hasProduct ? `已选择产品：${this.currentProductText()}` : '暂无产品，请先进入客户与产品创建产品。';
      }
    } catch (error) {
      this.errorText = this.friendlyError(error, '网络异常，请检查平板网络。');
      this.orders = [];
      this.selectedOrder = null;
      this.categories = emptyDocumentCategories();
      const hasProduct = await this.ensureProductFromCatalog();
      this.statusText = hasProduct ? `已选择产品：${this.currentProductText()}` : '暂无订单。';
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
        return false;
      }

      const product = products[0];
      const order = this.orderFromProduct(product);
      this.selectedOrder = order;
      this.applyProductSelection(order);
      await this.refreshSelectedDocuments();
      return true;
    } catch (error) {
      this.errorText = this.friendlyError(error, '网络异常，请稍后重试。');
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
    return '未命名产品';
  }

  private applyProductSelection(order: WorkbenchOrder): void {
    this.selectedProductId = order.productId;
    this.selectedProductModel = order.productModel || order.productName || '未命名产品';
    this.selectedCustomerId = order.customerId;
  }

  private async openOrder(order: WorkbenchOrder): Promise<void> {
    this.logAction('order selected');
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
    this.errorText = '';
    try {
      this.categories = await this.api.loadDocumentCategories(this.selectedOrder);
      this.statusText = '资料已更新。';
    } catch (error) {
      this.errorText = this.friendlyError(error, '网络异常，请稍后重试。');
      this.categories = emptyDocumentCategories();
      this.statusText = '当前资料暂无内容，请先上传。';
    } finally {
      this.documentsLoading = false;
    }
  }

  private completeOrder(order: WorkbenchOrder): void {
    this.logAction('complete order clicked');
    this.orders = this.orders.map((item: WorkbenchOrder): WorkbenchOrder => {
      if (item.orderId !== order.orderId) {
        return item;
      }
      return this.completedOrder(item);
    });
    this.statusText = `${order.productModel} 已完成。`;
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
    this.logAction('search clicked');
    this.searchKeyword = keyword;
    const visible = this.filteredOrders();
    if (visible.length > 0) {
      void this.openOrder(visible[0]);
      this.statusText = '已筛选订单。';
    } else {
      this.statusText = keyword.trim().length > 0 ? '暂无匹配订单。' : '暂无订单。';
    }
  }

  private async openImportPdf(): Promise<void> {
    this.logAction('import pdf clicked');
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
    this.logAction('upload category clicked');
    if (this.selectedProductId.length === 0) {
      this.statusText = '未选择产品，请先在“客户与产品”中创建产品。';
      return;
    }

    const definition: DocumentCategoryDefinition = documentCategoryByKey(category.category);
    router.pushUrl({
      url: 'pages/DocumentUploadPage',
      params: {
        productId: this.selectedProductId,
        productModel: this.selectedProductModel,
        planId: this.selectedOrder ? this.selectedOrder.orderId : '',
        category: definition.category,
        title: definition.label
      }
    }).catch((error: BusinessError) => {
      console.error('[HanglianPad] open upload page failed', error);
      this.statusText = '操作失败，请稍后重试。';
    });
  }

  private openPreview(category: DocumentCategoryState): void {
    this.logAction('preview clicked');
    if (category.documents.length === 0) {
      this.statusText = '当前资料暂无内容，请先上传。';
      return;
    }

    const document: WorkbenchDocument = category.documents[0];
    if (document.documentId.length === 0) {
      this.statusText = '当前资料暂无内容，请先上传。';
      return;
    }

    router.pushUrl({
      url: 'pages/DocumentPreviewPage',
      params: {
        documentId: document.documentId,
        title: document.title
      }
    }).catch((error: BusinessError) => {
      console.error('[HanglianPad] open preview failed', error);
      this.statusText = '操作失败，请稍后重试。';
    });
  }

  private async deleteDocument(category: DocumentCategoryState): Promise<void> {
    this.logAction('delete clicked');
    if (category.documents.length === 0) {
      this.statusText = '当前资料暂无内容，请先上传。';
      return;
    }

    const document: WorkbenchDocument = category.documents[0];
    if (document.documentId.length === 0) {
      this.statusText = '当前资料暂无内容，请先上传。';
      return;
    }

    if (this.pendingDeleteDocumentId !== document.documentId) {
      this.pendingDeleteDocumentId = document.documentId;
      this.statusText = '确认删除该资料？请再次点击删除。';
      return;
    }

    this.documentsLoading = true;
    try {
      await ApiClient.delete<object>(`/documents/${encodeURIComponent(document.documentId)}`);
      this.pendingDeleteDocumentId = '';
      this.statusText = '删除成功。';
      await this.refreshSelectedDocuments();
    } catch (error) {
      this.errorText = this.friendlyError(error, '操作失败，请稍后重试。');
      this.statusText = this.errorText;
    } finally {
      this.documentsLoading = false;
    }
  }

  private routeTo(label: string, url: string): void {
    this.logAction(`${label} clicked`);
    router.pushUrl({ url: url })
      .catch((error: BusinessError) => {
        console.error('[HanglianPad] route failed', error);
        this.statusText = '操作失败，请稍后重试。';
      });
  }

  private enterTestLab(): void {
    this.labClicks += 1;
    if (this.labClicks < 5) {
      return;
    }

    this.labClicks = 0;
    router.pushUrl({ url: 'pages/TestLabPage' })
      .catch((error: BusinessError) => {
        console.error('[HanglianPad] open test lab failed', error);
        this.statusText = '操作失败，请稍后重试。';
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
          errorMessage: this.errorText,
          onScopeChange: (nextScope: OrderScope) => {
            void this.refreshOrders(nextScope);
          },
          onOrderSelect: (order: WorkbenchOrder) => {
            void this.openOrder(order);
          },
          onCompleteOrder: (order: WorkbenchOrder) => {
            this.completeOrder(order);
          }
        });

        Column({ space: 12 }) {
          this.SelectionPanel();
          this.StatusPanel();
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
              void this.deleteDocument(category);
            }
          })
          .layoutWeight(1);
        }
        .layoutWeight(1)
        .height('100%');
      }
      .layoutWeight(1)
      .width('100%');
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
        .onClick(() => {
          this.enterTestLab();
        })

      Text('航联资料工作台')
        .fontSize(28)
        .fontWeight(FontWeight.Bold)
        .fontColor('#342316')
        .layoutWeight(1)

      Text(this.displayName)
        .fontSize(16)
        .fontWeight(FontWeight.Bold)
        .fontColor('#342316')
        .width(180)
        .textAlign(TextAlign.End)

      Button('退出登录')
        .height(46)
        .width(116)
        .backgroundColor('#342316')
        .fontColor(Color.White)
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
          this.routeTo('客户与产品', 'pages/CustomerProductPage');
        })

      Button('连接器参数')
        .layoutWeight(1)
        .height(48)
        .backgroundColor('#2F6B4F')
        .fontColor(Color.White)
        .onClick(() => {
          this.routeTo('连接器参数', 'pages/ConnectorParamPage');
        })

      Button('回收站')
        .layoutWeight(1)
        .height(48)
        .backgroundColor('#8F3F1D')
        .fontColor(Color.White)
        .onClick(() => {
          this.routeTo('回收站', 'pages/RecycleBinPage');
        })

      Button('订单总览')
        .layoutWeight(1)
        .height(48)
        .backgroundColor('#614C8A')
        .fontColor(Color.White)
        .onClick(() => {
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
    }
    .width('100%')
    .height(82)
    .padding({ left: 16, right: 16 })
    .backgroundColor('#FFFFFF')
    .border({ width: 1, color: '#E1E8E2', radius: 8 })
  }

  @Builder
  private StatusPanel() {
    Text(this.errorText.length > 0 ? this.errorText : this.statusText)
      .width('100%')
      .height(40)
      .fontSize(14)
      .fontWeight(FontWeight.Bold)
      .fontColor(this.errorText.length > 0 ? '#B91C1C' : '#6F5845')
      .padding({ left: 14, right: 14, top: 9, bottom: 9 })
      .backgroundColor(this.errorText.length > 0 ? '#FFF0EC' : '#FFF8EC')
      .borderRadius(8)
  }
}
