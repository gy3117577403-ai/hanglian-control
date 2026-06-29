import router from '@ohos.router';
import { TopSearchBar } from '../components/TopSearchBar';
import { OrderSidebar } from '../components/OrderSidebar';
import { DocumentCategoryGrid } from '../components/DocumentCategoryGrid';
import { AuthService } from '../services/AuthService';
import { TokenStorageService } from '../services/TokenStorageService';
import { WorkbenchApiClient } from '../services/WorkbenchApi';
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

  aboutToAppear(): void {
    console.info('[HanglianPad] WorkbenchPage aboutToAppear');
    void this.loadUserInfo();
    void this.refreshOrders(this.scope);
  }

  private renderTitle(): string {
    console.info('[HanglianPad] WorkbenchPage render');
    return '航联资料工作台';
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
    if (!this.selectedOrder) {
      return '未选择产品型号';
    }
    return this.selectedOrder.productModel || this.selectedOrder.productName || '型号待确认';
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
      if (visible.length > 0) {
        await this.openOrder(visible[0]);
      } else {
        this.selectedOrder = null;
        this.categories = emptyDocumentCategories();
      }
      this.actionMessage = `订单已刷新：${scope === 'today' ? '今日订单' : '本周订单'} / ${this.modeText()}`;
    } catch (error) {
      console.error('[HanglianPad] WorkbenchPage load data failed', error);
      this.errorMessage = this.errorText(error, '订单接口失败');
      this.actionMessage = '订单接口失败，页面已保留首屏，可点击重试。';
      this.orders = [];
      this.selectedOrder = null;
      this.categories = emptyDocumentCategories();
    } finally {
      this.ordersLoading = false;
    }
  }

  private async openOrder(order: WorkbenchOrder): Promise<void> {
    this.selectedOrder = order;
    await this.refreshSelectedDocuments();
  }

  private async refreshSelectedDocuments(): Promise<void> {
    this.documentsLoading = true;
    this.errorMessage = '';
    try {
      this.categories = await this.api.loadDocumentCategories(this.selectedOrder);
      if (this.selectedOrder) {
        this.actionMessage = `${this.selectedOrder.customerName} / ${this.selectedOrder.productModel} 资料已刷新`;
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
    this.searchKeyword = keyword;
    const visible = this.filteredOrders();
    if (visible.length > 0) {
      void this.openOrder(visible[0]);
      this.actionMessage = `已按 "${keyword}" 筛选订单`;
    } else {
      this.selectedOrder = null;
      this.categories = emptyDocumentCategories();
      this.actionMessage = keyword.trim().length > 0 ? `未找到 "${keyword}" 相关订单` : '已清空搜索';
    }
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
    const definition: DocumentCategoryDefinition = documentCategoryByKey(category.category);
    if (!this.selectedOrder) {
      this.actionMessage = `请先选择订单，再上传${definition.label}。`;
      return;
    }

    if (this.selectedOrder.productId.length === 0) {
      this.actionMessage = '当前订单缺少产品 ID，暂不能上传资料。';
      return;
    }

    this.actionMessage = `上传入口已打开：${this.selectedOrder.productModel} / ${definition.label}`;
  }

  private openPreview(category: DocumentCategoryState): void {
    if (category.documents.length === 0) {
      this.actionMessage = `${category.label} 暂无可预览资料。`;
      return;
    }
    this.actionMessage = `预览入口已选择：${category.title}`;
  }

  private deleteDocument(category: DocumentCategoryState): void {
    this.categories = this.categories.map((item: DocumentCategoryState): DocumentCategoryState => {
      if (item.category !== category.category) {
        return item;
      }
      return {
        category: item.category,
        label: item.label,
        documentType: item.documentType,
        uploadStatus: 'missing',
        title: item.label,
        version: '-',
        pageCount: 0,
        date: '-',
        documents: []
      };
    });
    this.actionMessage = `${category.label} 已从本地视图移除`;
  }

  build() {
    Column({ space: 12 }) {
      this.TopBar();
      TopSearchBar({
        onSearch: (keyword: string) => {
          this.search(keyword);
        },
        onImportPdf: () => {
          this.openUploadByKey('original_drawing');
        },
        onOpenCustomerProduct: () => {
          this.actionMessage = '客户与产品入口已保留，后续恢复完整页面。';
        },
        onOpenConnectorParam: () => {
          this.actionMessage = '连接器参数入口已保留，后续恢复完整页面。';
        },
        onOpenTrash: () => {
          this.actionMessage = '回收站入口已保留，后续恢复完整页面。';
        },
        onOpenOrderOverview: () => {
          this.actionMessage = '订单总览入口已保留，后续恢复完整页面。';
        }
      });

      Row({ space: 14 }) {
        OrderSidebar({
          orders: this.filteredOrders(),
          selectedOrderId: this.selectedOrderId(),
          scope: this.scope,
          isLoading: this.ordersLoading,
          errorMessage: this.errorMessage,
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

        Column({ space: 14 }) {
          Row() {
            Column({ space: 6 }) {
              Text('当前客户')
                .fontSize(13)
                .fontWeight(FontWeight.Bold)
                .fontColor('#7b6755')
              Text(this.currentCustomerText())
                .fontSize(23)
                .fontWeight(FontWeight.Bold)
                .fontColor('#2c231b')
                .maxLines(1)
                .textOverflow({ overflow: TextOverflow.Ellipsis })
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Start)

            Column({ space: 6 }) {
              Text('当前产品型号')
                .fontSize(13)
                .fontWeight(FontWeight.Bold)
                .fontColor('#7b6755')
              Text(this.currentProductText())
                .fontSize(23)
                .fontWeight(FontWeight.Bold)
                .fontColor('#2f6f66')
                .maxLines(1)
                .textOverflow({ overflow: TextOverflow.Ellipsis })
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Start)

            Button('重试')
              .height(42)
              .padding({ left: 18, right: 18 })
              .fontSize(15)
              .fontWeight(FontWeight.Bold)
              .backgroundColor('#2f6f66')
              .fontColor(Color.White)
              .onClick(() => {
                void this.refreshOrders(this.scope);
              })

            Text(this.modeText())
              .fontSize(13)
              .fontWeight(FontWeight.Bold)
              .fontColor(this.api.isMockMode() ? '#9b5a25' : '#2f6f66')
              .padding({ left: 14, right: 14, top: 8, bottom: 8 })
              .backgroundColor(this.api.isMockMode() ? '#fff3e4' : '#e8f3ee')
              .borderRadius(999)
          }
          .width('100%')
          .padding(18)
          .backgroundColor('#ffffff')
          .border({ width: 1, color: '#e1e8e2' })
          .borderRadius(18)

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
          .layoutWeight(1)

          Text(this.actionMessage)
            .fontSize(13)
            .fontColor(this.errorMessage.length > 0 ? '#a33f34' : '#6f5845')
            .padding({ left: 14, right: 14, top: 8, bottom: 8 })
            .backgroundColor(this.errorMessage.length > 0 ? '#fff1ef' : '#fff8ec')
            .borderRadius(999)
            .alignSelf(ItemAlign.Start)
        }
        .layoutWeight(1)
        .height('100%')
        .padding(16)
        .backgroundColor('#f7faf6')
        .border({ width: 1, color: '#e0e9e3' })
        .borderRadius(20)
      }
      .width('100%')
      .layoutWeight(1)
    }
    .width('100%')
    .height('100%')
    .padding(12)
    .backgroundColor('#edf3ee')
  }

  @Builder
  private TopBar() {
    Row({ space: 14 }) {
      Column() {
        Text('HL')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .fontColor('#FFF8EA')
      }
      .width(56)
      .height(56)
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)
      .border({ width: 1, color: '#815123', radius: 8 })
      .backgroundColor('#9C5725')

      Column({ space: 4 }) {
        Text('HANG LIAN CONTROL / HARMONYOS PAD')
          .fontSize(12)
          .fontWeight(FontWeight.Bold)
          .fontColor('#7A4A23')
        Text(this.renderTitle())
          .fontSize(26)
          .fontWeight(FontWeight.Bold)
          .fontColor('#342316')
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)

      Column({ space: 5 }) {
        Text(this.displayName)
          .fontSize(15)
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
    .height(76)
    .padding({ left: 16, right: 16 })
    .border({ width: 1, color: '#70482347', radius: 8 })
    .backgroundColor('#FFF4DE')
  }
}
