import router from '@ohos.router';
import { TopSearchBar } from '../components/TopSearchBar';
import { OrderSidebar } from '../components/OrderSidebar';
import { DocumentCategoryGrid } from '../components/DocumentCategoryGrid';
import { UploadDocumentDialog } from '../components/UploadDocumentDialog';
import { CustomerProductPage } from './CustomerProductPage';
import { ConnectorParamPage } from './ConnectorParamPage';
import { OrderOverviewPage } from './OrderOverviewPage';
import { RecycleBinPage } from './RecycleBinPage';
import { AuthService } from '../services/AuthService';
import { TokenStorageService } from '../services/TokenStorageService';
import { WorkbenchApiClient } from '../services/WorkbenchApi';
import { WorkbenchRefreshBus } from '../services/WorkbenchRefreshBus';
import { DocumentCategory, WorkbenchRefreshEvent } from '../models/DocumentModels';
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

type WorkbenchTab = 'workbench' | 'orders' | 'customers' | 'connectors' | 'recycle';

interface WorkbenchNavItem {
  key: WorkbenchTab;
  label: string;
  subLabel: string;
}

const navItems: WorkbenchNavItem[] = [
  { key: 'workbench', label: '资料工作台', subLabel: '订单资料调用 / 上传 / 预览' },
  { key: 'orders', label: '订单总览', subLabel: '今日 / 本周 / 状态' },
  { key: 'customers', label: '客户与产品', subLabel: '客户维护 / 产品绑定' },
  { key: 'connectors', label: '连接器参数库', subLabel: '型号参数 / 导入导出' },
  { key: 'recycle', label: '回收站', subLabel: '恢复 / 彻底删除' }
];

@Entry
@Component
struct WorkbenchPage {
  private api: WorkbenchApiClient = new WorkbenchApiClient();
  private unsubscribeRefresh: (() => void) | undefined = undefined;
  private uploadDialog: CustomDialogController | undefined = undefined;

  @State private activeTab: WorkbenchTab = 'workbench';
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
  @State private actionMessage: string = '';

  aboutToAppear(): void {
    void this.loadUserInfo();
    this.unsubscribeRefresh = WorkbenchRefreshBus.subscribe((event: WorkbenchRefreshEvent) => {
      if (!this.selectedOrder || this.selectedOrder.productId === event.productId) {
        void this.refreshSelectedDocuments();
      }
    });
    void this.refreshOrders(this.scope);
  }

  aboutToDisappear(): void {
    if (this.unsubscribeRefresh) {
      this.unsubscribeRefresh();
      this.unsubscribeRefresh = undefined;
    }
  }

  private async loadUserInfo(): Promise<void> {
    const userInfo = await TokenStorageService.getUserInfo();
    this.applyUserInfo(userInfo);
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
    } finally {
      this.isLoggingOut = false;
      router.replaceUrl({
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
    this.scope = scope;
    this.ordersLoading = true;
    this.errorMessage = '';
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
      this.errorMessage = this.errorText(error, '订单加载失败');
      this.actionMessage = '真实 API 请求失败，请检查 API_BASE_URL、网络与鉴权配置。';
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
      this.errorMessage = this.errorText(error, '产品资料加载失败');
      this.categories = emptyDocumentCategories();
      this.actionMessage = '真实 API 资料请求失败，请检查产品资料接口。';
    } finally {
      this.documentsLoading = false;
    }
  }

  private completeOrder(order: WorkbenchOrder): void {
    this.orders = this.orders.map((item: WorkbenchOrder): WorkbenchOrder => {
      if (item.orderId !== order.orderId) {
        return item;
      }
      return {
        ...item,
        completed: true,
        completedQuantity: item.quantity,
        productionStatus: 'completed',
        status: 'completed'
      };
    });
    this.actionMessage = `${order.productModel} 已在本地标记完成`;
    const visible = this.filteredOrders();
    if (visible.length > 0) {
      void this.openOrder(visible[0]);
    } else {
      this.selectedOrder = null;
      this.categories = emptyDocumentCategories();
    }
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
    this.openUpload({
      category: definition.category,
      label: definition.label,
      documentType: definition.documentType,
      uploadStatus: 'missing',
      title: definition.label,
      version: '-',
      pageCount: 0,
      date: '-',
      documents: []
    });
  }

  private openUpload(category: DocumentCategoryState): void {
    if (!this.selectedOrder || this.selectedOrder.productId.length === 0) {
      this.actionMessage = '请先选择带产品 ID 的订单，再上传资料。';
      return;
    }

    const definition: DocumentCategoryDefinition = documentCategoryByKey(category.category);
    this.uploadDialog = new CustomDialogController({
      builder: UploadDocumentDialog({
        initialCustomerId: this.selectedOrder.customerId,
        initialProductId: this.selectedOrder.productId,
        initialPlanId: this.selectedOrder.orderId,
        initialCategory: definition.category as DocumentCategory,
        onUploaded: (event: WorkbenchRefreshEvent) => {
          this.actionMessage = `上传成功：${definition.label}`;
          if (!this.selectedOrder || this.selectedOrder.productId === event.productId) {
            void this.refreshSelectedDocuments();
          }
        }
      }),
      autoCancel: false,
      alignment: DialogAlignment.Center
    });
    this.uploadDialog.open();
  }

  private openPreview(category: DocumentCategoryState): void {
    if (category.documents.length === 0) {
      return;
    }

    const document = category.documents[0];
    router.pushUrl({
      url: 'pages/DocumentPreviewPage',
      params: {
        documentId: document.documentId,
        title: document.title
      }
    });
  }

  private deleteDocument(category: DocumentCategoryState): void {
    this.categories = this.categories.map((item: DocumentCategoryState): DocumentCategoryState => {
      if (item.category !== category.category) {
        return item;
      }
      return {
        ...item,
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
      Row({ space: 10 }) {
        ForEach(navItems, (item: WorkbenchNavItem) => {
          this.NavButton(item);
        }, (item: WorkbenchNavItem) => item.key);
      }
      .width('100%')
      .height(76);

      if (this.activeTab === 'workbench') {
        this.WorkbenchContent();
      } else if (this.activeTab === 'orders') {
        OrderOverviewPage();
      } else if (this.activeTab === 'customers') {
        CustomerProductPage();
      } else if (this.activeTab === 'connectors') {
        ConnectorParamPage();
      } else {
        RecycleBinPage();
      }
    }
    .width('100%')
    .height('100%')
    .padding(12)
    .backgroundColor('#edf3ee');
  }

  @Builder
  private TopBar() {
    Row({ space: 14 }) {
      Column() {
        Text('HL')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .fontColor('#FFF8EA');
      }
      .width(56)
      .height(56)
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)
      .border({ width: 1, color: '#815123', radius: 8 })
      .backgroundColor('#9C5725');

      Column({ space: 4 }) {
        Text('HANG LIAN CONTROL / HARMONYOS PAD')
          .fontSize(12)
          .fontWeight(FontWeight.Bold)
          .fontColor('#7A4A23');
        Text('线束车间资料库工作台')
          .fontSize(26)
          .fontWeight(FontWeight.Bold)
          .fontColor('#342316');
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start);

      Column({ space: 5 }) {
        Text(this.displayName)
          .fontSize(15)
          .fontWeight(FontWeight.Bold)
          .fontColor('#342316');
        Text(this.userSubtitle)
          .fontSize(12)
          .fontColor('#76512A');
      }
      .width(220)
      .alignItems(HorizontalAlign.End);

      Button(this.isLoggingOut ? '退出中...' : '退出登录')
        .height(46)
        .width(116)
        .backgroundColor('#342316')
        .enabled(!this.isLoggingOut)
        .onClick(() => {
          void this.logout();
        });
    }
    .width('100%')
    .height(76)
    .padding({ left: 16, right: 16 })
    .border({ width: 1, color: '#70482347', radius: 8 })
    .backgroundColor('#FFF4DE');
  }

  @Builder
  private NavButton(item: WorkbenchNavItem) {
    Button({ type: ButtonType.Normal, stateEffect: true }) {
      Column({ space: 3 }) {
        Text(item.label)
          .fontSize(17)
          .fontWeight(FontWeight.Bold)
          .fontColor(this.activeTab === item.key ? '#FFF8EA' : '#342316');
        Text(item.subLabel)
          .fontSize(11)
          .fontColor(this.activeTab === item.key ? '#FFE5BD' : '#76512A')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis });
      }
      .alignItems(HorizontalAlign.Start)
      .width('100%');
    }
    .height(74)
    .layoutWeight(1)
    .padding({ left: 12, right: 12 })
    .border({ width: 1, color: this.activeTab === item.key ? '#8F3F1D' : '#70482336', radius: 8 })
    .backgroundColor(this.activeTab === item.key ? '#A84E22' : '#FFF8EA')
    .onClick(() => {
      this.activeTab = item.key;
    });
  }

  @Builder
  private WorkbenchContent() {
    Column({ space: 12 }) {
      TopSearchBar({
        onSearch: (keyword: string) => {
          this.search(keyword);
        },
        onImportPdf: () => {
          this.openUploadByKey('original_drawing');
        },
        onOpenCustomerProduct: () => {
          this.activeTab = 'customers';
        },
        onOpenConnectorParam: () => {
          this.activeTab = 'connectors';
        },
        onOpenTrash: () => {
          this.activeTab = 'recycle';
        },
        onOpenOrderOverview: () => {
          this.activeTab = 'orders';
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
                .fontColor('#7b6755');
              Text(this.currentCustomerText())
                .fontSize(23)
                .fontWeight(FontWeight.Bold)
                .fontColor('#2c231b')
                .maxLines(1)
                .textOverflow({ overflow: TextOverflow.Ellipsis });
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Start);

            Column({ space: 6 }) {
              Text('当前产品型号')
                .fontSize(13)
                .fontWeight(FontWeight.Bold)
                .fontColor('#7b6755');
              Text(this.currentProductText())
                .fontSize(23)
                .fontWeight(FontWeight.Bold)
                .fontColor('#2f6f66')
                .maxLines(1)
                .textOverflow({ overflow: TextOverflow.Ellipsis });
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Start);

            Text(this.modeText())
              .fontSize(13)
              .fontWeight(FontWeight.Bold)
              .fontColor(this.api.isMockMode() ? '#9b5a25' : '#2f6f66')
              .padding({ left: 14, right: 14, top: 8, bottom: 8 })
              .backgroundColor(this.api.isMockMode() ? '#fff3e4' : '#e8f3ee')
              .borderRadius(999);
          }
          .width('100%')
          .padding(18)
          .backgroundColor('#ffffff')
          .border({ width: 1, color: '#e1e8e2' })
          .borderRadius(18);

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

          if (this.actionMessage.length > 0) {
            Text(this.actionMessage)
              .fontSize(13)
              .fontColor('#6f5845')
              .padding({ left: 14, right: 14, top: 8, bottom: 8 })
              .backgroundColor('#fff8ec')
              .borderRadius(999)
              .alignSelf(ItemAlign.Start);
          }
        }
        .layoutWeight(1)
        .height('100%')
        .padding(16)
        .backgroundColor('#f7faf6')
        .border({ width: 1, color: '#e0e9e3' })
        .borderRadius(20);
      }
      .width('100%')
      .layoutWeight(1);
    }
    .width('100%')
    .layoutWeight(1);
  }
}
