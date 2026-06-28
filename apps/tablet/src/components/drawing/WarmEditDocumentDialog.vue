<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { DrawingItem, DrawingModule } from '@/types/production'

const visible = defineModel<boolean>('visible', { required: true })
const props = defineProps<{
  item?: DrawingItem | null
  module?: DrawingModule | null
}>()

const store = useDocumentHubStore()
const form = reactive({
  title: '',
  version: '',
  keywords: '',
  remark: '',
})

function resetForm() {
  form.title = props.item?.title ?? ''
  form.version = props.item?.version ?? ''
  form.keywords = (props.item?.keywords ?? []).join(', ')
  form.remark = props.item?.remark ?? props.item?.description ?? ''
}

function keywordsArray() {
  return [...new Set(form.keywords
    .split(/[,，;；\n]/)
    .map((item) => item.trim())
    .filter(Boolean))]
}

async function submit() {
  if (!props.item || !props.module) return
  await store.updateDocumentMetadata(props.item, props.module, {
    title: form.title,
    version: form.version,
    keywords: keywordsArray(),
    remark: form.remark,
  })
  visible.value = false
}

watch(() => [visible.value, props.item?.itemId] as const, () => {
  if (visible.value) resetForm()
}, { immediate: true })
</script>

<template>
  <PrimeDialog
    v-model:visible="visible"
    modal
    header="编辑资料信息"
    :style="{ width: '560px' }"
  >
    <form class="edit-document-form" @submit.prevent="submit">
      <label>
        <span>标题</span>
        <PrimeInputText v-model="form.title" autofocus />
      </label>
      <label>
        <span>版本</span>
        <PrimeInputText v-model="form.version" placeholder="可留空" />
      </label>
      <label>
        <span>关键词</span>
        <PrimeInputText v-model="form.keywords" placeholder="逗号分隔" />
      </label>
      <label>
        <span>备注</span>
        <PrimeTextarea v-model="form.remark" rows="4" auto-resize placeholder="可留空" />
      </label>
      <footer>
        <PrimeButton type="button" severity="secondary" outlined label="取消" @click="visible = false" />
        <PrimeButton type="submit" :loading="store.lifecycleActionLoading" label="保存" />
      </footer>
    </form>
  </PrimeDialog>
</template>

<style scoped>
.edit-document-form {
  display: grid;
  gap: 14px;
}

label {
  display: grid;
  gap: 6px;
  color: #76512a;
  font-size: 13px;
  font-weight: 950;
}

footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}
</style>
