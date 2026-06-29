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
  @State private statusText: string = '连接器参数页已加载。';
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

  private activeStatus(): ConnectorParamStatus {
    return '启用';
  }

  private async refresh(): Promise<void> {
    this.logAction('connector refresh clicked');
    this.errorText = '';
    this.statusText = '正在刷新连接器参数...';
    try {
      const result = await ConnectorParamService.list();
      this.rows = result.data;
      if (this.selectedId.length === 0 && this.rows.length > 0) {
        this.selectedId = this.rows[0].id;
      }
      this.statusText = '资料已更新。';
    } catch (error) {
      this.showFailure('connector refresh', error);
    }
  }

  private async createConnector(): Promise<void> {
    this.logAction('create connector clicked');
    this.errorText = '';
    const suffix = this.nowSuffix();
    const payload: ConnectorParamPayload = {
      connectorModel: `CONN-${suffix}`,
      inputLength: '10',
      outerStripLength: '5',
      innerStripLength: '3',
      status: this.activeStatus(),
      remark: '现场录入'
    };
    try {
      const result = await ConnectorParamService.create(payload);
      this.selectedId = result.data.id;
      this.statusText = '新增成功。';
      await this.refresh();
    } catch (error) {
      this.showFailure('create connector', error);
    }
  }

  private async deleteSelected(): Promise<void> {
    this.logAction('delete selected connector clicked');
    if (this.selectedId.length === 0) {
      this.statusText = '请先选择连接器参数。';
      return;
    }
    try {
      await ConnectorParamService.delete(this.selectedId);
      this.selectedId = '';
      this.statusText = '删除成功。';
      await this.refresh();
    } catch (error) {
      this.showFailure('delete connector', error);
    }
  }

  private async editSelected(): Promise<void> {
    this.logAction('edit selected connector clicked');
    if (this.selectedId.length === 0) {
      this.statusText = '请先选择连接器参数。';
      return;
    }

    const current = this.rows.find((row: ConnectorParam) => row.id === this.selectedId);
    if (!current) {
      this.statusText = '请先选择连接器参数。';
      return;
    }

    const payload: ConnectorParamPayload = {
      connectorModel: current.connectorModel,
      inputLength: current.inputLength,
      outerStripLength: current.outerStripLength,
      innerStripLength: current.innerStripLength,
      status: current.status,
      remark: current.remark.length > 0 ? `${current.remark}；已复核` : '已复核'
    };

    try {
      await ConnectorParamService.update(this.selectedId, payload);
      this.statusText = '编辑已完成。';
      await this.refresh();
    } catch (error) {
      this.showFailure('edit connector', error);
    }
  }

  private async importOne(): Promise<void> {
    this.logAction('connector import-one clicked');
    const suffix = this.nowSuffix();
    const payload: ConnectorImportOnePayload = {
      connectorModel: `CONN-${suffix}`,
      insertionLength: 10,
      outerStripLength: 5,
      innerStripLength: 3,
      status: 'active',
      remark: '现场导入'
    };
    try {
      const result = await ConnectorParamService.importOne(payload);
      this.selectedId = result.data.id;
      this.statusText = '单型号导入完成。';
      await this.refresh();
    } catch (error) {
      this.showFailure('connector import-one', error);
    }
  }

  private async exportCsv(): Promise<void> {
    this.logAction('connector export clicked');
    try {
      await ConnectorParamService.exportCsv();
      this.statusText = '导出已完成。';
    } catch (error) {
      this.showFailure('connector export', error);
    }
  }

  private selectRow(row: ConnectorParam): void {
    this.logAction('connector edit clicked');
    this.selectedId = row.id;
    this.statusText = '已选择连接器参数。';
  }

  private returnWorkbench(): void {
    this.logAction('connector return workbench clicked');
    router.replaceUrl({ url: 'pages/WorkbenchPage' })
      .catch((error: BusinessError) => {
        console.error('[HanglianPad] connector return workbench failed', error);
        this.statusText = '操作失败，请稍后重试。';
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
      Text('连接器参数')
        .fontSize(26)
        .fontWeight(FontWeight.Bold)
        .fontColor('#342316')
        .layoutWeight(1)

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
          this.logAction('connector search changed');
        })
      Button('刷新')
        .height(46)
        .width(92)
        .backgroundColor('#2F6B4F')
        .fontColor(Color.White)
        .onClick(() => {
          void this.refresh();
        })
      Button('新增')
        .height(46)
        .width(92)
        .backgroundColor('#C87934')
        .fontColor(Color.White)
        .onClick(() => {
          void this.createConnector();
        })
      Button('删除')
        .height(46)
        .width(92)
        .backgroundColor('#8F3F1D')
        .fontColor(Color.White)
        .onClick(() => {
          void this.deleteSelected();
        })
      Button('编辑')
        .height(46)
        .width(92)
        .backgroundColor('#2F6B4F')
        .fontColor(Color.White)
        .onClick(() => {
          void this.editSelected();
        })
      Button('单型号导入')
        .height(46)
        .width(120)
        .backgroundColor('#614C8A')
        .fontColor(Color.White)
        .onClick(() => {
          void this.importOne();
        })
      Button('导出')
        .height(46)
        .width(92)
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
          Text(`${item.label}：${item.count}`)
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
                Text(`入长 ${row.inputLength} / 外剥长度 ${row.outerStripLength} / 内剥长度 ${row.innerStripLength} / ${row.remark || '-'}`)
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

              Button(this.selectedId === row.id ? '已选择' : '编辑')
                .height(42)
                .width(86)
                .backgroundColor(this.selectedId === row.id ? '#C87934' : '#2F6B4F')
                .fontColor(Color.White)
                .onClick(() => {
                  this.selectRow(row);
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
