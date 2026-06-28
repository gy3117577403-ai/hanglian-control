import { ConnectorParamPayload, ConnectorParamService } from '../services/ConnectorParamService';
import { ConnectorParam, ConnectorParamStatus, StatusCount } from '../services/DomainModels';

@Component
export struct ConnectorParamPage {
  @State rows: ConnectorParam[] = [];
  @State searchText: string = '';
  @State editingId: string = '';
  @State connectorModel: string = '';
  @State inputLength: string = '';
  @State outerStripLength: string = '';
  @State innerStripLength: string = '';
  @State remark: string = '';
  @State status: ConnectorParamStatus = '启用';
  @State sourceLabel: string = 'mock fallback 待命';
  @State message: string = '准备加载连接器工艺参数库';

  aboutToAppear(): void {
    this.refresh();
  }

  build() {
    Column({ space: 12 }) {
      Row({ space: 12 }) {
        this.Header();
        this.EntryButtons();
      }
      .height(102)
      .width('100%');

      Row({ space: 12 }) {
        this.FormPanel();
        this.TablePanel();
      }
      .layoutWeight(1)
      .width('100%');
    }
    .width('100%')
    .layoutWeight(1);
  }

  @Builder
  Header() {
    Column({ space: 8 }) {
      Row() {
        Column({ space: 4 }) {
          Text('连接器工艺参数库')
            .fontSize(23)
            .fontWeight(FontWeight.Bold)
            .fontColor('#342316');
          Text(this.message)
            .fontSize(13)
            .fontColor('#76512A')
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis });
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Start);

        Text(this.sourceLabel)
          .fontSize(13)
          .fontWeight(FontWeight.Bold)
          .fontColor('#2F6B4F');
      }
      Row({ space: 8 }) {
        TextInput({ placeholder: '搜索连接器型号、备注、状态', text: this.searchText })
          .onChange((value: string) => {
            this.searchText = value;
          })
          .height(42)
          .layoutWeight(1)
          .borderRadius(8)
          .backgroundColor('#FFFCF4');
        ForEach(this.statusStats(), (item: StatusCount) => {
          this.StatPill(item);
        }, (item: StatusCount) => item.label);
      }
    }
    .layoutWeight(1)
    .height('100%')
    .padding(12)
    .border({ width: 1, color: '#70482336', radius: 8 })
    .backgroundColor('#FFF8EA');
  }

  @Builder
  EntryButtons() {
    Column({ space: 8 }) {
      Button('Excel 导入入口')
        .height(44)
        .width(190)
        .backgroundColor('#A84E22')
        .onClick(() => {
          this.message = 'Excel 导入入口已就绪；等待 POST /connector-params/import';
        });
      Button('导出入口')
        .height(44)
        .width(190)
        .backgroundColor('#2F6B4F')
        .onClick(() => {
          this.message = '导出入口已就绪；等待 GET /connector-params/export';
        });
      Button('单型号导入入口')
        .height(44)
        .width(190)
        .fontColor('#342316')
        .backgroundColor('#F3C36F')
        .onClick(() => {
          this.message = '单型号导入入口已就绪；等待 POST /connector-params/import-one';
        });
    }
    .height('100%')
    .padding(8)
    .border({ width: 1, color: '#70482336', radius: 8 })
    .backgroundColor('#FFF4DE');
  }

  @Builder
  StatPill(item: StatusCount) {
    Column({ space: 2 }) {
      Text(`${item.count}`)
        .fontSize(18)
        .fontWeight(FontWeight.Bold)
        .fontColor(item.label === '启用' ? '#2F6B4F' : item.label === '复核' ? '#9C5725' : '#8F3F1D');
      Text(item.label)
        .fontSize(12)
        .fontColor('#76512A');
    }
    .width(70)
    .height(42)
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .border({ width: 1, color: '#70482324', radius: 8 })
    .backgroundColor('#FFFCF4');
  }

  @Builder
  FormPanel() {
    Column({ space: 10 }) {
      Text(this.editingId.length > 0 ? '编辑参数' : '新增参数')
        .fontSize(21)
        .fontWeight(FontWeight.Bold)
        .fontColor('#342316');
      TextInput({ placeholder: '连接器型号', text: this.connectorModel })
        .height(48)
        .borderRadius(8)
        .backgroundColor('#FFFCF4')
        .onChange((value: string) => {
          this.connectorModel = value;
        });
      TextInput({ placeholder: '入长，例如 42 mm', text: this.inputLength })
        .height(48)
        .borderRadius(8)
        .backgroundColor('#FFFCF4')
        .onChange((value: string) => {
          this.inputLength = value;
        });
      TextInput({ placeholder: '外剥长度', text: this.outerStripLength })
        .height(48)
        .borderRadius(8)
        .backgroundColor('#FFFCF4')
        .onChange((value: string) => {
          this.outerStripLength = value;
        });
      TextInput({ placeholder: '内剥长度', text: this.innerStripLength })
        .height(48)
        .borderRadius(8)
        .backgroundColor('#FFFCF4')
        .onChange((value: string) => {
          this.innerStripLength = value;
        });
      TextInput({ placeholder: '备注', text: this.remark })
        .height(48)
        .borderRadius(8)
        .backgroundColor('#FFFCF4')
        .onChange((value: string) => {
          this.remark = value;
        });

      Row({ space: 8 }) {
        this.StatusButton('启用');
        this.StatusButton('复核');
        this.StatusButton('停用');
      }
      .height(48);

      Row({ space: 8 }) {
        Button(this.editingId.length > 0 ? '保存' : '新增')
          .height(50)
          .layoutWeight(1)
          .backgroundColor('#A84E22')
          .onClick(() => {
            this.save();
          });
        Button('清空')
          .height(50)
          .width(90)
          .fontColor('#342316')
          .backgroundColor('#F6DEB9')
          .onClick(() => {
            this.clearForm();
          });
      }
      Blank();
      Text('字段：连接器型号、入长、外剥长度、内剥长度、备注、状态')
        .fontSize(12)
        .fontColor('#76512A');
    }
    .width(360)
    .height('100%')
    .padding(12)
    .border({ width: 1, color: '#70482336', radius: 8 })
    .backgroundColor('#FFF8EA');
  }

  @Builder
  StatusButton(label: ConnectorParamStatus) {
    Button(label)
      .height(46)
      .layoutWeight(1)
      .fontColor(this.status === label ? '#FFF8EA' : '#342316')
      .backgroundColor(this.status === label ? (label === '启用' ? '#2F6B4F' : label === '复核' ? '#9C5725' : '#8F3F1D') : '#F8E7C8')
      .onClick(() => {
        this.status = label;
      });
  }

  @Builder
  TablePanel() {
    Column({ space: 8 }) {
      Row() {
        Text('型号').layoutWeight(1).fontSize(13).fontWeight(FontWeight.Bold).fontColor('#76512A');
        Text('入长').width(92).fontSize(13).fontWeight(FontWeight.Bold).fontColor('#76512A');
        Text('外剥').width(92).fontSize(13).fontWeight(FontWeight.Bold).fontColor('#76512A');
        Text('内剥').width(92).fontSize(13).fontWeight(FontWeight.Bold).fontColor('#76512A');
        Text('状态').width(76).fontSize(13).fontWeight(FontWeight.Bold).fontColor('#76512A');
        Text('操作').width(168).fontSize(13).fontWeight(FontWeight.Bold).fontColor('#76512A');
      }
      .height(34)
      .padding({ left: 12, right: 12 });

      Scroll() {
        Column({ space: 8 }) {
          ForEach(this.visibleRows(), (row: ConnectorParam) => {
            Column({ space: 6 }) {
              Row({ space: 8 }) {
                Column({ space: 3 }) {
                  Text(row.connectorModel).fontSize(17).fontWeight(FontWeight.Bold).fontColor('#342316');
                  Text(row.remark || '无备注')
                    .fontSize(12)
                    .fontColor('#76512A')
                    .maxLines(1)
                    .textOverflow({ overflow: TextOverflow.Ellipsis });
                }
                .layoutWeight(1)
                .alignItems(HorizontalAlign.Start);
                Text(row.inputLength).width(92).fontSize(15).fontColor('#342316');
                Text(row.outerStripLength).width(92).fontSize(15).fontColor('#342316');
                Text(row.innerStripLength).width(92).fontSize(15).fontColor('#342316');
                Text(row.status)
                  .width(76)
                  .fontSize(13)
                  .fontWeight(FontWeight.Bold)
                  .fontColor('#FFF8EA')
                  .textAlign(TextAlign.Center)
                  .padding({ top: 6, bottom: 6 })
                  .backgroundColor(row.status === '启用' ? '#2F6B4F' : row.status === '复核' ? '#9C5725' : '#8F3F1D')
                  .borderRadius(6);
                Row({ space: 8 }) {
                  Button('编辑').height(42).width(76).backgroundColor('#2F6B4F').onClick(() => {
                    this.edit(row);
                  });
                  Button('删除').height(42).width(76).backgroundColor('#8F3F1D').onClick(() => {
                    this.remove(row.id);
                  });
                }
                .width(168);
              }
              Text(`更新：${row.updatedAt}`).fontSize(12).fontColor('#8A6037');
            }
            .width('100%')
            .height(86)
            .padding({ left: 12, right: 12, top: 8, bottom: 8 })
            .border({ width: 1, color: '#70482324', radius: 8 })
            .backgroundColor('#FFFCF4');
          }, (row: ConnectorParam) => row.id);
        }
      }
      .layoutWeight(1)
      .width('100%');
    }
    .layoutWeight(1)
    .height('100%')
    .padding(12)
    .border({ width: 1, color: '#70482336', radius: 8 })
    .backgroundColor('#FFF8EA');
  }

  async refresh(): Promise<void> {
    const result = await ConnectorParamService.list();
    this.rows = result.data;
    this.sourceLabel = result.source === 'api' ? 'API 在线' : 'mock fallback';
    this.message = result.message;
  }

  async save(): Promise<void> {
    if (this.connectorModel.trim().length === 0) {
      this.message = '请填写连接器型号';
      return;
    }
    const payload: ConnectorParamPayload = {
      connectorModel: this.connectorModel.trim(),
      inputLength: this.inputLength.trim(),
      outerStripLength: this.outerStripLength.trim(),
      innerStripLength: this.innerStripLength.trim(),
      remark: this.remark.trim(),
      status: this.status
    };
    const result = this.editingId.length > 0
      ? await ConnectorParamService.update(this.editingId, payload)
      : await ConnectorParamService.create(payload);
    this.message = result.message;
    this.clearForm();
    await this.refresh();
  }

  async remove(id: string): Promise<void> {
    const result = await ConnectorParamService.delete(id);
    this.message = result.message;
    await this.refresh();
  }

  edit(row: ConnectorParam): void {
    this.editingId = row.id;
    this.connectorModel = row.connectorModel;
    this.inputLength = row.inputLength;
    this.outerStripLength = row.outerStripLength;
    this.innerStripLength = row.innerStripLength;
    this.remark = row.remark;
    this.status = row.status;
  }

  clearForm(): void {
    this.editingId = '';
    this.connectorModel = '';
    this.inputLength = '';
    this.outerStripLength = '';
    this.innerStripLength = '';
    this.remark = '';
    this.status = '启用';
  }

  visibleRows(): ConnectorParam[] {
    const text = this.searchText.trim().toLowerCase();
    if (text.length === 0) {
      return this.rows;
    }
    return this.rows.filter((row: ConnectorParam) => row.connectorModel.toLowerCase().includes(text)
      || row.remark.toLowerCase().includes(text)
      || row.status.toLowerCase().includes(text));
  }

  statusStats(): StatusCount[] {
    return ConnectorParamService.stats(this.visibleRows());
  }
}
