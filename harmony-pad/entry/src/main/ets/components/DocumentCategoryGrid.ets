import { DocumentCard } from './DocumentCard'
import { DocumentCategoryState } from '../model/WorkbenchTypes'

@Component
export struct DocumentCategoryGrid {
  categories: DocumentCategoryState[] = []
  isLoading: boolean = false
  onUpload: (category: DocumentCategoryState) => void = () => {}
  onPreview: (category: DocumentCategoryState) => void = () => {}
  onDelete: (category: DocumentCategoryState) => void = () => {}

  build() {
    Column({ space: 12 }) {
      if (this.isLoading) {
        Text('正在刷新产品资料')
          .fontSize(14)
          .fontWeight(FontWeight.Bold)
          .fontColor('#775437')
          .padding({ left: 14, right: 14, top: 8, bottom: 8 })
          .backgroundColor('#fff6e8')
          .borderRadius(999)
          .alignSelf(ItemAlign.End)
      }

      Grid() {
        ForEach(this.categories, (category: DocumentCategoryState) => {
          GridItem() {
            DocumentCard({
              category: category,
              onUpload: this.onUpload,
              onPreview: this.onPreview,
              onDelete: this.onDelete
            })
          }
        }, (category: DocumentCategoryState) => category.category)
      }
      .columnsTemplate('1fr 1fr 1fr')
      .rowsGap(16)
      .columnsGap(16)
      .layoutWeight(1)
    }
    .width('100%')
    .height('100%')
  }
}
