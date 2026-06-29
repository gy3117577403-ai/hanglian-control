import router from '@ohos.router';
import { BusinessError } from '@ohos.base';
import {
  ConnectorImportOnePayload,
  ConnectorParamPayload,
  ConnectorParamService
} from '../services/ConnectorParamService';
import { ConnectorParam, ConnectorParamStatus, StatusCount } from '../services/DomainModels';

@Entry
@Component
export struct ConnectorParamPage {
  @State private rows: ConnectorParam[] = [];
  @State private searchText: string = '';
  @State private selectedId: string = '';
  @State private lastAction: string = '等待操作';
  @State private errorText: string = '';
  @State private loadingText: string = '连接器参数页已加载';
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

  private activeStatus(): ConnectorParamStatus {
    return '启用';
  }

  private async refresh(): Promise<void> {
    this.bump('connector refresh clicked');
    this.errorText = '';
    this.loadingText = '正在刷新连接器参数...';
    try {
      const result = await ConnectorParamService.list();
      this.rows = result.data;
      if (this.selectedId.length === 0 && this.rows.length > 0) {
        this.selectedId = this.rows[0].id;
      }
      this.sourceLabel = result.source === 'api' ? 'API 在线' : 'mock fallback';
      this.loadingText = result.message;
      this.lastAction = 'connector refresh success';
    } catch (error) {
      this.errorText = this.errorMessage(error, '连接器刷新失败');
      this.loadingText = '连接器刷新失败';
      this.lastAction = `connector refresh failed: ${this.errorText}`;
    }
  }

  private async createTestConnector(): Promise<void> {
    this.bump('create test connector clicked');
    this.errorText = '';
    const suffix = this.nowSuffix();
    const payload: ConnectorParamPayload = {
      connectorModel: `CONN-TEST-${suffix}`,
      inputLength: '10',
      outerStripLength: '5',
      innerStripLength: '3',
      status: this.activeStatus(),
      remark: 'MatePad test'
    };
    try {
      const result = await ConnectorParamService.create(payload);
      this.selectedId = result.data.id;
      this.loadingText = `${result.message} / id: ${result.data.id}`;
      this.lastAction = `create connector success: ${result.data.id}`;
      await this.refresh();
    } catch (error) {
      this.errorText = this.errorMessage(error, '新增连接器失败');
      this.lastAction = `create connector failed: ${this.errorText}`;
    }
  }

  private async deleteSelected(): Promise<void> {
    this.bump('delete selected connector clicked');
    if (this.selectedId.length === 0) {
      this.errorText = '请先选中一条连接器参数。';
      return;
    }
    try {
      const result = await ConnectorParamService.delete(this.selectedId);
      this.loadingText = result.message;
      this.lastAction = `delete connector success: ${this.selectedId}`;
      this.selectedId = '';
      await this.refresh();
    } catch (error) {
      this.errorText = this.errorMessage(error, '删除连接器失败');
      this.lastAction = `delete connector failed: ${this.errorText}`;
    }
  }

  private async importOne(): Promise<void> {
    this.bump('connector import-one clicked');
    const suffix = this.nowSuffix();
    const payload: ConnectorImportOnePayload = {
      connectorModel: `CONN-TEST-${suffix}`,
      insertionLength: 10,
      outerStripLength: 5,
      innerStripLength: 3,
      status: 'active',
      remark: 'MatePad test'
    };
    try {
      const result = await ConnectorParamService.importOne(payload);
      this.selectedId = result.data.id;
      this.loadingText = result.message;
      this.lastAction = `import-one success: ${result.data.id}`;
      await this.refresh();
    } catch (error) {
      this.errorText = this.errorMessage(error, '单型号导入失败');
      this.lastAction = `import-one failed: ${this.errorText}`;
    }
  }

  private async exportCsv(): Promise<void> {
    this.bump('connector export clicked');
    try {
      const result = await ConnectorParamService.exportCsv();
      this.loadingText = result.message;
      this.lastAction = `export success: ${result.data}`;
    } catch (error) {
      this.errorText = this.errorMessage(error, '导出接口失败');
      this.lastAction = `export failed: ${this.errorText}`;
    }
  }

  private returnWorkbench(): void {
    this.bump('connector return workbench clicked');
    router.replaceUrl({ url: 'pages/WorkbenchPage' })
      .catch((error: BusinessError) => {
        this.errorText = `返回工作台失败：${error.code} / ${error.message}`;
        this.lastAction = this.errorText;
      });
  }

  private visibleRows(): ConnectorParam[] {
    const text = this.searchText.trim().toLowerCase();
    if (text.length === 0) {
      return this.rows;
    }
    return this.rows.filter((row: ConnectorParam) => row.connectorModel.toLowerCase().includes(text)
      || row.remark.toLowerCase().includes(text)
      || row.status.toLowerCase().includes(text));
  }

  private statusStats(): StatusCount[] {
    return ConnectorParamService.stats(this.visibleRows());
  }

  private statusColor(label: string): string {
    if (label === '启用') return '#2F6B4F';
    if (label === '复核') return '#9C5725';
    return '#8F3F1D';
  }

  build() {
    Column({ space: 12 }) {
      this.Header();
      this.Toolbar();
      this.ListPanel();
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
        Text('连接器参数')
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
  private Toolbar() {
    Row({ space: 10 }) {
      TextInput({ placeholder: '搜索型号、状态、备注', text: this.searchText })
        .height(46)
        .layoutWeight(1)
        .backgroundColor('#FFFCF4')
        .onChange((value: string) => {
          this.searchText = value;
          this.bump(`connector search changed: ${value}`);
        })
      Button('刷新')
        .height(46)
        .width(92)
        .backgroundColor('#2F6B4F')
        .fontColor(Color.White)
        .onClick(() => {
          void this.refresh();
        })
      Button('新增测试连接器')
        .height(46)
        .width(150)
        .backgroundColor('#C87934')
        .fontColor(Color.White)
        .onClick(() => {
          void this.createTestConnector();
        })
      Button('删除选中项')
        .height(46)
        .width(120)
        .backgroundColor('#8F3F1D')
        .fontColor(Color.White)
        .onClick(() => {
          void this.deleteSelected();
        })
      Button('单型号导入')
        .height(46)
        .width(120)
        .backgroundColor('#614C8A')
        .fontColor(Color.White)
        .onClick(() => {
          void this.importOne();
        })
      Button('导出 CSV')
        .height(46)
        .width(110)
        .backgroundColor('#9C5725')
        .fontColor(Color.White)
        .onClick(() => {
          void this.exportCsv();
        })
    }
    .width('100%')
    .height(58)
  }

  @Builder
  private ListPanel() {
    Column({ space: 8 }) {
      Row({ space: 8 }) {
        ForEach(this.statusStats(), (item: StatusCount) => {
          Text(`${item.label}: ${item.count}`)
            .fontSize(13)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.White)
            .padding({ left: 10, right: 10, top: 6, bottom: 6 })
            .backgroundColor(this.statusColor(item.label))
            .borderRadius(6)
        }, (item: StatusCount) => item.label)
      }
      .width('100%')

      Scroll() {
        Column({ space: 8 }) {
          ForEach(this.visibleRows(), (row: ConnectorParam) => {
            Row({ space: 10 }) {
              Column({ space: 4 }) {
                Text(row.connectorModel)
                  .fontSize(18)
                  .fontWeight(FontWeight.Bold)
                  .fontColor('#342316')
                Text(`入长 ${row.inputLength} / 外剥 ${row.outerStripLength} / 内剥 ${row.innerStripLength} / ${row.remark || '-'}`)
                  .fontSize(13)
                  .fontColor('#76512A')
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
              }
              .layoutWeight(1)
              .alignItems(HorizontalAlign.Start)

              Text(row.status)
                .width(74)
                .fontSize(13)
                .fontWeight(FontWeight.Bold)
                .fontColor(Color.White)
                .textAlign(TextAlign.Center)
                .padding({ top: 8, bottom: 8 })
                .backgroundColor(this.statusColor(row.status))
                .borderRadius(6)

              Button(this.selectedId === row.id ? '已选中' : '选中')
                .height(42)
                .width(86)
                .backgroundColor(this.selectedId === row.id ? '#C87934' : '#2F6B4F')
                .fontColor(Color.White)
                .onClick(() => {
                  this.bump(`select connector clicked: ${row.id}`);
                  this.selectedId = row.id;
                })
            }
            .width('100%')
            .height(78)
            .padding({ left: 12, right: 12 })
            .backgroundColor(this.selectedId === row.id ? '#FFF0CF' : '#FFFCF4')
            .border({ width: 1, color: this.selectedId === row.id ? '#C87934' : '#70482324', radius: 8 })
          }, (row: ConnectorParam) => row.id)
        }
      }
      .layoutWeight(1)
      .width('100%')
    }
    .layoutWeight(1)
    .width('100%')
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
      Text(`selectedId: ${this.selectedId || '-'} / rows: ${this.visibleRows().length}`)
        .fontSize(12)
        .fontColor('#6F5845')
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
