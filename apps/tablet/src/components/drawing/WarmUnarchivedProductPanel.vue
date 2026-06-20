<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft, FileText, Lock, PackagePlus, UploadCloud } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { orderQuantity } from '@/lib/format'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()

const context = computed(() => store.unarchivedProductContext)
const order = computed(() => context.value?.order)
const customerName = computed(() => {
  const resolution = context.value?.resolution
  if (resolution?.status === 'product_not_found') return resolution.customer.customerName
  return order.value?.customerName ?? '订单客户'
})
const title = computed(() => (
  context.value?.status === 'customer_not_found'
    ? '订单客户尚未建立客户资料'
    : context.value?.status === 'error'
      ? '产品资料查询失败'
      : '当前型号尚未建立产品资料页'
))
const message = computed(() => context.value?.message || '当前型号尚未建立产品资料页。')

function promptArchiveFirst() {
  toast.warning('请先建立产品资料页。')
}
</script>

<template>
  <section class="unarchived-panel" data-scroll-key="unarchived">
    <header class="unarchived-head">
      <PrimeButton severity="secondary" outlined rounded title="返回订单列表" @click="store.goBack()">
        <ArrowLeft :size="19" />
      </PrimeButton>
      <div>
        <p>{{ customerName }}</p>
        <h2>{{ order?.productModel || '-' }}</h2>
        <span>{{ message }}</span>
      </div>
      <b>{{ order?.status === 'no_drawing' ? '未发图' : '待建档' }}</b>
    </header>

    <main class="unarchived-body">
      <div class="order-facts">
        <span>订单客户</span>
        <strong>{{ customerName }}</strong>
        <span>产品型号</span>
        <strong>{{ order?.productModel || '-' }}</strong>
        <span>订单数量</span>
        <strong>{{ order ? orderQuantity(order) : '-' }}</strong>
        <span>当前状态</span>
        <strong>{{ title }}</strong>
      </div>

      <section class="guidance">
        <Lock :size="30" />
        <div>
          <h3>{{ title }}</h3>
          <p>当前型号尚未建立产品资料页，暂时无法上传图纸、SOP 或现场照片。</p>
        </div>
      </section>

      <div class="actions">
        <PrimeButton @click="store.openPdfImportDialogForUnarchivedProduct()">
          <FileText :size="18" />
          <span>导入 PDF 图纸</span>
        </PrimeButton>
        <PrimeButton severity="secondary" outlined @click="store.openCreateProductArchiveDialog()">
          <PackagePlus :size="18" />
          <span>创建空白资料页</span>
        </PrimeButton>
        <PrimeButton severity="secondary" text @click="store.goBack()">
          <ArrowLeft :size="18" />
          <span>返回订单列表</span>
        </PrimeButton>
      </div>

      <div class="locked-actions">
        <PrimeButton severity="secondary" outlined @click="promptArchiveFirst">
          <UploadCloud :size="17" />
          <span>上传资料</span>
        </PrimeButton>
        <PrimeButton severity="secondary" outlined @click="promptArchiveFirst">查看 SOP</PrimeButton>
        <PrimeButton severity="secondary" outlined @click="promptArchiveFirst">查看成品图</PrimeButton>
      </div>
    </main>
  </section>
</template>

<style scoped>
.unarchived-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  height: 100%;
  overflow: auto;
  padding-right: 4px;
}

.unarchived-head,
.unarchived-body {
  border: 1px solid rgba(255, 255, 255, 0.9);
  background:
    linear-gradient(122deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.1) 52%),
    linear-gradient(304deg, rgba(91, 143, 137, 0.16), transparent 60%),
    rgba(255, 255, 255, 0.12);
  box-shadow:
    0 22px 42px rgba(80, 42, 16, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(28px) saturate(1.2);
  -webkit-backdrop-filter: blur(28px) saturate(1.2);
}

.unarchived-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 20px;
}

.unarchived-head p,
.unarchived-head h2,
.unarchived-head span,
.guidance h3,
.guidance p {
  margin: 0;
}

.unarchived-head p {
  color: #9b5125;
  font-size: 13px;
  font-weight: 950;
}

.unarchived-head h2 {
  overflow: hidden;
  margin-top: 2px;
  color: #332111;
  font-size: 24px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unarchived-head span {
  display: block;
  overflow: hidden;
  margin-top: 3px;
  color: #76512a;
  font-size: 13px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unarchived-head b {
  padding: 8px 12px;
  border-radius: 999px;
  color: #9b3d32;
  background: rgba(255, 235, 229, 0.66);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.unarchived-body {
  display: grid;
  align-content: start;
  gap: 14px;
  padding: 16px;
  border-radius: 22px;
}

.order-facts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.order-facts span,
.order-facts strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-facts span {
  color: #8a5b31;
  font-size: 12px;
  font-weight: 850;
}

.order-facts strong {
  grid-row: 2;
  color: #342112;
  font-size: 16px;
  font-weight: 950;
}

.guidance {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 14px;
  border: 1px solid rgba(166, 83, 48, 0.18);
  border-radius: 18px;
  color: #8d3d28;
  background: rgba(255, 241, 232, 0.58);
}

.guidance h3 {
  color: #4a2a18;
  font-size: 18px;
  font-weight: 950;
}

.guidance p {
  margin-top: 4px;
  color: #7a4f2a;
  font-weight: 850;
}

.actions,
.locked-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.actions :deep(.p-button),
.locked-actions :deep(.p-button) {
  min-height: 44px;
  border-radius: 14px;
  font-weight: 950;
}

.locked-actions {
  padding-top: 4px;
  border-top: 1px solid rgba(128, 88, 47, 0.12);
}

@media (max-width: 900px) {
  .order-facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .order-facts strong {
    grid-row: auto;
  }
}
</style>
