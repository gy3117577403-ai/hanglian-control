<script setup lang="ts">
import { ChevronRight, Pencil, Trash2 } from 'lucide-vue-next'
import type { ConnectorParameter } from '@/types/production'

defineProps<{
  row: ConnectorParameter
}>()

const emit = defineEmits<{
  open: [row: ConnectorParameter]
  edit: [row: ConnectorParameter]
  delete: [row: ConnectorParameter]
}>()

function formatMm(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `${value}`
}

function hasMm(value?: number | null) {
  return typeof value === 'number' && !Number.isNaN(value)
}

function cleanRemark(value?: string) {
  const remark = value?.trim() ?? ''
  if (!remark || remark.includes('?')) return '—'
  return remark
}
</script>

<template>
  <article
    class="native-connector-row"
    role="button"
    tabindex="0"
    @click="emit('open', row)"
    @keydown.enter.prevent="emit('open', row)"
  >
    <section class="native-connector-model native-connector-cell">
      <b :title="row.connectorModel">{{ row.connectorModel }}</b>
      <small :title="row.status || '启用'">{{ row.status || '启用' }}</small>
    </section>

    <section class="native-connector-cell metric" title="入长">
      <span>{{ formatMm(row.insertionLengthMm) }}</span>
      <em v-if="hasMm(row.insertionLengthMm)">mm</em>
    </section>

    <section class="native-connector-cell metric" title="外剥长度">
      <span>{{ formatMm(row.outerStripLengthMm) }}</span>
      <em v-if="hasMm(row.outerStripLengthMm)">mm</em>
    </section>

    <section class="native-connector-cell metric" title="内剥长度">
      <span>{{ formatMm(row.innerStripLengthMm) }}</span>
      <em v-if="hasMm(row.innerStripLengthMm)">mm</em>
    </section>

    <section class="native-connector-cell remark" :title="cleanRemark(row.remark)">
      {{ cleanRemark(row.remark) }}
    </section>

    <section class="native-connector-actions" aria-label="连接器参数操作">
      <button type="button" class="native-connector-action" title="编辑" @click.stop="emit('edit', row)">
        <Pencil :size="16" />
      </button>
      <button type="button" class="native-connector-action danger" title="删除" @click.stop="emit('delete', row)">
        <Trash2 :size="16" />
      </button>
      <button type="button" class="native-connector-action" title="详情" @click.stop="emit('open', row)">
        <ChevronRight :size="17" />
      </button>
    </section>
  </article>
</template>
