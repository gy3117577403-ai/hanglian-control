<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { HubCustomer } from '@/types/production'
import type { MaintenanceProductRow } from '@/types/customer-product-maintenance'

const visible = defineModel<boolean>('visible', { required: true })
const props = defineProps<{
  customer?: HubCustomer | null
  product?: MaintenanceProductRow | null
}>()

const store = useDocumentHubStore()

const isEdit = computed(() => Boolean(props.product))
const openAfterCreate = ref(false)

const form = reactive({
  productModel: '',
  productName: '',
  searchKeywordsText: '',
  remark: '',
})

function resetForm() {
  const product = props.product
  form.productModel = product?.productModel ?? ''
  form.productName = product?.productName ?? ''
  form.searchKeywordsText = (product?.searchKeywords ?? []).join('\n')
  form.remark = product?.remark ?? ''
  openAfterCreate.value = false
}

function parseKeywords() {
  const seen = new Set<string>()
  return form.searchKeywordsText
    .split(/[\n,，;；]+/)
    .map((item) => item.trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false
      seen.add(item)
      return true
    })
}

async function submit() {
  if (!props.customer) return
  if (props.product) {
    const saved = await store.updateMaintenanceProduct(props.product.productId, {
      productName: form.productName,
      searchKeywords: parseKeywords(),
      remark: form.remark,
    })
    if (saved) visible.value = false
    return
  }

  const product = await store.createMaintenanceProduct({
    customerId: props.customer.customerId,
    productModel: form.productModel,
    productName: form.productName,
    searchKeywords: parseKeywords(),
    remark: form.remark,
    source: 'manual_create',
  })
  if (!product) return
  visible.value = false
  if (openAfterCreate.value) await store.openProductFromMaintenance(product)
}

watch([visible, () => props.product, () => props.customer], () => {
  if (visible.value) resetForm()
}, { immediate: true })
</script>

<template>
  <PrimeDialog
    v-model:visible="visible"
    modal
    :header="isEdit ? '编辑产品资料' : '新建产品资料页'"
    :style="{ width: '560px', maxWidth: '92vw' }"
  >
    <form class="product-editor" @submit.prevent="submit">
      <label>
        <span>客户</span>
        <input :value="props.customer?.customerName || ''" readonly>
      </label>

      <label>
        <span>产品型号</span>
        <input v-model="form.productModel" :readonly="isEdit" :required="!isEdit" maxlength="90" placeholder="请输入产品型号">
      </label>

      <PrimeMessage v-if="isEdit" severity="warn" :closable="false">
        当前产品已有资料或订单绑定，不能直接修改产品型号。
      </PrimeMessage>

      <label>
        <span>产品名称</span>
        <input v-model="form.productName" maxlength="100" placeholder="可留空，默认使用产品型号">
      </label>

      <label>
        <span>搜索关键词</span>
        <PrimeTextarea v-model="form.searchKeywordsText" rows="3" auto-resize placeholder="每行一个关键词，也可用逗号分隔" />
      </label>

      <label>
        <span>备注</span>
        <PrimeTextarea v-model="form.remark" rows="4" auto-resize placeholder="可留空" />
      </label>

      <label v-if="!isEdit" class="checkbox-line">
        <PrimeCheckbox v-model="openAfterCreate" binary input-id="open-product-after-create" />
        <span>创建后打开产品资料页</span>
      </label>

      <PrimeMessage v-if="props.customer?.status === 'disabled'" severity="warn" :closable="false">
        当前客户已停用，不能新增产品。
      </PrimeMessage>
      <PrimeMessage v-if="store.maintenanceError" severity="warn" :closable="false">
        {{ store.maintenanceError }}
      </PrimeMessage>

      <footer class="editor-actions">
        <PrimeButton type="button" label="取消" severity="secondary" outlined @click="visible = false" />
        <PrimeButton
          type="submit"
          :label="isEdit ? '保存产品' : '创建产品'"
          :loading="store.maintenanceSaving"
          :disabled="!props.customer || (!isEdit && props.customer.status === 'disabled')"
        />
      </footer>
    </form>
  </PrimeDialog>
</template>

<style scoped>
.product-editor {
  display: grid;
  gap: 14px;
  padding-top: 4px;
}

.product-editor label {
  display: grid;
  gap: 7px;
  color: #4b2d15;
  font-size: 13px;
  font-weight: 900;
}

.product-editor input,
.product-editor :deep(.p-textarea) {
  width: 100%;
  min-height: 44px;
  border-radius: 14px;
  font-size: 14px;
}

.product-editor input {
  border: 1px solid rgba(134, 91, 48, 0.18);
  padding: 0 12px;
  color: #3f2916;
  background: rgba(255, 255, 255, 0.7);
  outline: 0;
}

.product-editor input[readonly] {
  color: rgba(63, 41, 22, 0.66);
  background: rgba(248, 239, 226, 0.72);
}

.checkbox-line {
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}

.editor-actions :deep(.p-button) {
  min-height: 44px;
  border-radius: 14px;
  font-weight: 950;
}
</style>
