<script setup lang="ts">
import { computed } from 'vue'
import { useDocumentHubStore } from '@/stores/document-hub-store'
import type { DrawingItem, DrawingModule } from '@/types/production'

const visible = defineModel<boolean>('visible', { required: true })
const props = defineProps<{
  item?: DrawingItem | null
  module?: DrawingModule | null
}>()

const store = useDocumentHubStore()
const title = computed(() => props.item?.title ?? '当前资料')
const version = computed(() => props.item?.version ? `版本 ${props.item.version}` : '未填写版本')

async function confirm() {
  if (!props.item || !props.module) return
  await store.setDocumentEffective(props.item, props.module)
  visible.value = false
}
</script>

<template>
  <PrimeDialog
    v-model:visible="visible"
    modal
    header="设为当前有效"
    :style="{ width: '520px' }"
  >
    <section class="effective-confirm">
      <b>{{ title }}</b>
      <span>{{ version }}</span>
      <p>同组其他当前有效版本会变为历史版本，该资料也会设为模块首页封面。</p>
      <footer>
        <PrimeButton type="button" severity="secondary" outlined label="取消" @click="visible = false" />
        <PrimeButton :loading="store.lifecycleActionLoading" label="确认" @click="confirm" />
      </footer>
    </section>
  </PrimeDialog>
</template>

<style scoped>
.effective-confirm {
  display: grid;
  gap: 10px;
}

b {
  color: #342112;
  font-size: 18px;
  font-weight: 950;
}

span,
p {
  margin: 0;
  color: #76512a;
  font-weight: 850;
}

p {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(225, 125, 51, 0.11);
}

footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
}
</style>
