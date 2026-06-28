<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useUnifiedDocumentStore } from '@/stores/unified-document-store'
import type { DocumentStatus, DocumentTypeV03, RequiredProcess } from '@/types/production'

const visible = defineModel<boolean>('visible', { required: true })
const store = useUnifiedDocumentStore()

const form = reactive({
  customerName: '',
  productCode: '',
  productName: '',
  productVersion: '',
  documentType: 'drawing_pdf' as DocumentTypeV03,
  title: '',
  version: '',
  status: 'effective' as DocumentStatus,
  requiredForProcess: 'common' as RequiredProcess,
  keywords: '',
  remark: '',
})

watch(() => store.selectedItem, (item) => {
  if (!item) return
  form.customerName = item.customerName ?? ''
  form.productCode = item.productCode ?? ''
  form.productName = item.productName ?? ''
  form.productVersion = item.productVersion ?? ''
  form.documentType = (item.document?.documentType ?? 'drawing_pdf') as DocumentTypeV03
  form.title = item.title
  form.version = item.version ?? ''
  form.status = (item.document?.documentStatus ?? 'effective') as DocumentStatus
  form.requiredForProcess = (item.requiredForProcess ?? 'common') as RequiredProcess
  form.keywords = item.keywords?.join('，') ?? ''
  form.remark = item.remark ?? ''
}, { immediate: true })

async function submit() {
  await store.updateCurrent({ ...form })
}
</script>

<template>
  <PrimeDialog v-model:visible="visible" modal header="编辑资料信息" :style="{ width: '720px' }">
    <div class="edit-grid">
      <label>客户<PrimeInputText v-model="form.customerName" /></label>
      <label>产品编号<PrimeInputText v-model="form.productCode" /></label>
      <label>产品名称<PrimeInputText v-model="form.productName" /></label>
      <label>产品版本<PrimeInputText v-model="form.productVersion" /></label>
      <label>
        资料类型
        <select v-model="form.documentType">
          <option value="drawing_pdf">PDF 图纸</option>
          <option value="sop_image">SOP 扫描图片</option>
          <option value="connector_manual">连接器装配说明书</option>
          <option value="pinout_diagram">插接孔位图</option>
          <option value="finished_detail_image">成品细节图</option>
          <option value="process_card">作业流程卡</option>
        </select>
      </label>
      <label>资料标题<PrimeInputText v-model="form.title" /></label>
      <label>资料版本<PrimeInputText v-model="form.version" /></label>
      <label>
        状态
        <select v-model="form.status">
          <option value="effective">有效</option>
          <option value="pending_review">待确认</option>
          <option value="expired">失效</option>
          <option value="missing">缺失</option>
          <option value="inconsistent">不一致</option>
        </select>
      </label>
      <label>
        适用范围
        <select v-model="form.requiredForProcess">
          <option value="common">通用</option>
          <option value="front">前段</option>
          <option value="back">后段</option>
        </select>
      </label>
      <label>关键词<PrimeInputText v-model="form.keywords" /></label>
      <label class="full">备注<PrimeTextarea v-model="form.remark" rows="3" auto-resize /></label>
    </div>
    <template #footer>
      <PrimeButton label="取消" severity="secondary" text @click="visible = false" />
      <PrimeButton label="保存修改" @click="submit" />
    </template>
  </PrimeDialog>
</template>

<style scoped>
.edit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

label {
  display: grid;
  gap: 6px;
  color: #5f351a;
  font-size: 13px;
  font-weight: 950;
}

.full {
  grid-column: 1 / -1;
}

select {
  min-height: 42px;
  border: 1px solid rgba(139, 90, 42, 0.22);
  border-radius: 10px;
  background: rgba(255, 248, 235, 0.95);
  color: #432813;
  font-weight: 850;
}
</style>
