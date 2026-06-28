<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { HubCustomer } from '@/types/production'

const visible = defineModel<boolean>('visible', { required: true })
const props = defineProps<{
  customer?: HubCustomer | null
}>()

const store = useDocumentHubStore()

const statusOptions = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'disabled' },
]

const form = reactive({
  customerName: '',
  customerShortName: '',
  customerCode: '',
  aliasesText: '',
  status: 'active' as 'active' | 'disabled',
})

function resetForm() {
  const customer = props.customer
  form.customerName = customer?.customerName ?? ''
  form.customerShortName = customer?.customerShortName ?? ''
  form.customerCode = customer?.customerCode ?? ''
  form.aliasesText = (customer?.aliases ?? []).join('\n')
  form.status = customer?.status ?? 'active'
}

function parseAliases() {
  const seen = new Set<string>()
  return form.aliasesText
    .split(/[\n,，;；]+/)
    .map((item) => item.trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false
      seen.add(item)
      return true
    })
}

async function submit() {
  const payload = {
    customerName: form.customerName,
    customerShortName: form.customerShortName,
    customerCode: form.customerCode,
    aliases: parseAliases(),
    status: form.status,
  }
  const saved = props.customer
    ? await store.updateMaintenanceCustomer(props.customer.customerId, payload)
    : await store.createMaintenanceCustomer(payload)
  if (saved) visible.value = false
}

watch([visible, () => props.customer], () => {
  if (visible.value) resetForm()
}, { immediate: true })
</script>

<template>
  <PrimeDialog
    v-model:visible="visible"
    modal
    :header="props.customer ? '编辑客户资料' : '新建客户资料'"
    :style="{ width: '520px', maxWidth: '92vw' }"
  >
    <form class="customer-editor" @submit.prevent="submit">
      <label>
        <span>客户名称</span>
        <input v-model="form.customerName" required maxlength="80" placeholder="请输入客户名称">
      </label>

      <label>
        <span>客户简称</span>
        <input v-model="form.customerShortName" maxlength="80" placeholder="可留空，默认使用客户名称">
      </label>

      <label>
        <span>客户编码</span>
        <input v-model="form.customerCode" maxlength="60" placeholder="可留空">
      </label>

      <label>
        <span>别名</span>
        <PrimeTextarea v-model="form.aliasesText" rows="4" auto-resize placeholder="每行一个别名，也可用逗号分隔" />
      </label>

      <label>
        <span>状态</span>
        <PrimeSelect v-model="form.status" :options="statusOptions" option-label="label" option-value="value" />
      </label>

      <PrimeMessage v-if="store.maintenanceError" severity="warn" :closable="false">
        {{ store.maintenanceError }}
      </PrimeMessage>

      <footer class="editor-actions">
        <PrimeButton type="button" label="取消" severity="secondary" outlined @click="visible = false" />
        <PrimeButton type="submit" label="保存客户" :loading="store.maintenanceSaving" />
      </footer>
    </form>
  </PrimeDialog>
</template>

<style scoped>
.customer-editor {
  display: grid;
  gap: 14px;
  padding-top: 4px;
}

.customer-editor label {
  display: grid;
  gap: 7px;
  color: #4b2d15;
  font-size: 13px;
  font-weight: 900;
}

.customer-editor input,
.customer-editor :deep(.p-textarea),
.customer-editor :deep(.p-select) {
  width: 100%;
  min-height: 44px;
  border-radius: 14px;
  font-size: 14px;
}

.customer-editor input {
  border: 1px solid rgba(134, 91, 48, 0.18);
  padding: 0 12px;
  color: #3f2916;
  background: rgba(255, 255, 255, 0.7);
  outline: 0;
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
