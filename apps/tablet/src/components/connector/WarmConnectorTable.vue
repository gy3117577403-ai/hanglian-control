<script setup lang="ts">
import { Cable } from 'lucide-vue-next'
import type { ConnectorParameter } from '@/types/production'

defineProps<{
  rows: ConnectorParameter[]
}>()

const emit = defineEmits<{
  open: [row: ConnectorParameter]
}>()
</script>

<template>
  <div class="connector-grid">
    <button v-for="row in rows" :key="row.connectorId" type="button" @click="emit('open', row)">
      <Cable :size="24" />
      <b>{{ row.connectorModel }}</b>
      <span>端子：{{ row.terminalModel }}</span>
      <span>孔位：{{ row.pinCount }} / {{ row.color }}</span>
      <i>{{ row.manufacturer }}</i>
      <small>{{ row.status }} · {{ row.processSegment }}</small>
    </button>
  </div>
</template>

<style scoped>
.connector-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

button {
  min-height: 176px;
  padding: 14px;
  border: 1px solid rgba(139, 90, 42, 0.16);
  border-radius: 16px;
  background: linear-gradient(145deg, rgba(255, 252, 245, 0.96), rgba(255, 235, 205, 0.8));
  color: #8d4b22;
  text-align: left;
  box-shadow: 0 12px 22px rgba(80, 42, 16, 0.1);
}

b,
span,
i,
small {
  display: block;
  overflow: hidden;
  margin-top: 6px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

b {
  color: #342112;
  font-size: 21px;
  font-weight: 950;
}

span,
i,
small {
  color: #70502b;
  font-style: normal;
  font-weight: 850;
}
</style>
