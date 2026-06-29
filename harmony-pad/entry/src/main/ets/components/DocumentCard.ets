import { DocumentCategoryState, displayUploadStatus } from '../model/WorkbenchTypes'

@Component
export struct DocumentCard {
  category: DocumentCategoryState = {
    category: 'original_drawing',
    label: '原图',
    documentType: 'drawing_pdf',
    uploadStatus: 'missing',
    title: '原图',
    version: '-',
    pageCount: 0,
    date: '-',
    documents: []
  }
  onUpload: (category: DocumentCategoryState) => void = () => {}
  onPreview: (category: DocumentCategoryState) => void = () => {}
  onDelete: (category: DocumentCategoryState) => void = () => {}

  private hasDocument(): boolean {
    return this.category.documents.length > 0 && this.category.uploadStatus !== 'missing'
  }

  private statusColor(): string {
    if (this.category.uploadStatus === 'uploaded') return '#2f786d'
    if (this.category.uploadStatus === 'pending') return '#b9782d'
    if (this.category.uploadStatus === 'expired') return '#9b4a3f'
    return '#8d948e'
  }

  build() {
    Column({ space: 9 }) {
      Row() {
        Text(displayUploadStatus(this.category.uploadStatus))
          .fontSize(13)
          .fontWeight(FontWeight.Bold)
          .fontColor('#ffffff')
          .padding({ left: 11, right: 11, top: 5, bottom: 5 })
          .backgroundColor(this.statusColor())
          .borderRadius(999)
        Blank()
        Text(this.category.label)
          .fontSize(14)
          .fontWeight(FontWeight.Bold)
          .fontColor('#78604b')
      }
      .width('100%')

      Text(this.category.title)
        .fontSize(21)
        .fontWeight(FontWeight.Bold)
        .fontColor('#28211a')
        .maxLines(2)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .height(46)
        .width('100%')

      Column({ space: 5 }) {
        Row() {
          Text('版本').fontSize(12).fontColor('#8b7b6c')
          Text(this.category.version).fontSize(14).fontWeight(FontWeight.Bold).fontColor('#43382f')
        }
        .width('100%')
        .justifyContent(FlexAlign.SpaceBetween)

        Row() {
          Text('页数').fontSize(12).fontColor('#8b7b6c')
          Text(this.category.pageCount > 0 ? `${this.category.pageCount}` : '-')
            .fontSize(14)
            .fontWeight(FontWeight.Bold)
            .fontColor('#43382f')
        }
        .width('100%')
        .justifyContent(FlexAlign.SpaceBetween)

        Row() {
          Text('日期').fontSize(12).fontColor('#8b7b6c')
          Text(this.category.date).fontSize(14).fontWeight(FontWeight.Bold).fontColor('#43382f')
        }
        .width('100%')
        .justifyContent(FlexAlign.SpaceBetween)
      }
      .width('100%')
      .padding({ left: 12, right: 12, top: 8, bottom: 8 })
      .backgroundColor('#f7f6f1')
      .borderRadius(14)

      Row({ space: 8 }) {
        Button('上传')
          .height(38)
          .layoutWeight(1)
          .fontSize(14)
          .fontWeight(FontWeight.Bold)
          .fontColor('#ffffff')
          .backgroundColor('#c87833')
          .borderRadius(13)
          .onClick(() => {
            this.onUpload(this.category)
          })
        Button('预览')
          .height(38)
          .layoutWeight(1)
          .fontSize(14)
          .fontWeight(FontWeight.Bold)
          .fontColor(this.hasDocument() ? '#244a43' : '#8b928d')
          .backgroundColor(this.hasDocument() ? '#e8f1ed' : '#eef0ed')
          .borderRadius(13)
          .onClick(() => {
            if (this.hasDocument()) this.onPreview(this.category)
          })
        Button('删除')
          .height(38)
          .layoutWeight(1)
          .fontSize(14)
          .fontWeight(FontWeight.Bold)
          .fontColor(this.hasDocument() ? '#8f473d' : '#9a9d9a')
          .backgroundColor(this.hasDocument() ? '#fff0ec' : '#f0f1ef')
          .borderRadius(13)
          .onClick(() => {
            if (this.hasDocument()) this.onDelete(this.category)
          })
      }
      .width('100%')
    }
    .height(220)
    .padding(14)
    .backgroundColor('#ffffff')
    .border({ width: 1, color: this.hasDocument() ? '#d8e5df' : '#e6e4dd' })
    .borderRadius(20)
    .shadow({ radius: 12, color: '#14000000', offsetX: 0, offsetY: 8 })
  }
}
