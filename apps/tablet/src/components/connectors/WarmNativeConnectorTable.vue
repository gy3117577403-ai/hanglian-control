<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import WarmNativeConnectorRow from './WarmNativeConnectorRow.vue'
import type { ConnectorParameter } from '@/types/production'

const props = defineProps<{
  rows: ConnectorParameter[]
}>()

const emit = defineEmits<{
  open: [row: ConnectorParameter]
  edit: [row: ConnectorParameter]
  delete: [row: ConnectorParameter]
}>()

const listRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const itemSize = 72
const toleratedItems = 8
let scrollFrame = 0

const useVirtualWindow = computed(() => props.rows.length > 40)
const visibleCount = computed(() => {
  const height = listRef.value?.clientHeight ?? 520
  return Math.ceil(height / itemSize) + toleratedItems * 2
})
const first = computed(() => {
  if (!useVirtualWindow.value) return 0
  return Math.max(0, Math.floor(scrollTop.value / itemSize) - toleratedItems)
})
const last = computed(() => {
  if (!useVirtualWindow.value) return props.rows.length
  return Math.min(props.rows.length, first.value + visibleCount.value)
})
const visibleRows = computed(() => props.rows.slice(first.value, last.value))
const virtualHeight = computed(() => props.rows.length * itemSize)
const offsetY = computed(() => first.value * itemSize)

function resetScroll() {
  scrollTop.value = 0
  if (listRef.value) listRef.value.scrollTop = 0
}

function handleScroll(event: Event) {
  const target = event.currentTarget as HTMLElement
  if (scrollFrame) return
  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = 0
    scrollTop.value = target.scrollTop
    window.dispatchEvent(new CustomEvent('hanglian:native-layout-refresh'))
  })
}

watch(() => props.rows, () => {
  void nextTick(resetScroll)
})
</script>

<template>
  <section
    class="native-connector-table"
    :data-connector-virtualized="useVirtualWindow ? 'true' : 'false'"
    :data-connector-item-count="rows.length"
  >
    <div class="native-connector-header" aria-hidden="true">
      <span>连接器型号</span>
      <span>入长</span>
      <span>外剥长度</span>
      <span>内剥长度</span>
      <span>备注</span>
      <span>操作</span>
    </div>

    <div
      ref="listRef"
      class="native-connector-list"
      data-native-connector-list
      @scroll.passive="handleScroll"
    >
      <div v-if="!rows.length" class="native-connector-empty">
        暂无连接器参数
      </div>

      <div
        v-else-if="useVirtualWindow"
        class="native-connector-spacer"
        :style="{ height: `${virtualHeight}px` }"
      >
        <div class="native-connector-window" :style="{ transform: `translateY(${offsetY}px)` }">
          <WarmNativeConnectorRow
            v-for="row in visibleRows"
            :key="row.connectorId"
            :row="row"
            @open="emit('open', $event)"
            @edit="emit('edit', $event)"
            @delete="emit('delete', $event)"
          />
        </div>
      </div>

      <WarmNativeConnectorRow
        v-for="row in rows"
        v-else
        :key="row.connectorId"
        :row="row"
        @open="emit('open', $event)"
        @edit="emit('edit', $event)"
        @delete="emit('delete', $event)"
      />
    </div>
  </section>
</template>
