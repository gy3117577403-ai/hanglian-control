<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { GitCompareArrows } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useProductionStore } from '@/stores/production-store'
import type { ProductDocument } from '@/types/production'

const store = useProductionStore()
const leftId = ref('')
const rightId = ref('')

const open = computed({
  get: () => store.compareDialogOpen,
  set: (value: boolean) => {
    store.compareDialogOpen = value
  },
})

const versions = computed(() => store.documentVersions?.versions ?? [])

function documentId(document: ProductDocument) {
  return document.documentId ?? document.id
}

function optionLabel(document: ProductDocument) {
  return `${document.version} / ${document.documentStatus ?? document.status} / ${document.source ?? 'mock'}`
}

function displayValue(value: unknown) {
  if (Array.isArray(value)) return value.join(', ')
  return value === undefined || value === null || value === '' ? '-' : String(value)
}

watch(open, (value) => {
  if (!value) return
  leftId.value = documentId(versions.value[0] ?? { id: '' } as ProductDocument)
  rightId.value = documentId(versions.value[1] ?? versions.value[0] ?? { id: '' } as ProductDocument)
})

async function compare() {
  if (!leftId.value || !rightId.value || leftId.value === rightId.value) return
  await store.compareDocumentVersions([leftId.value, rightId.value])
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="border-cyan-300/30 bg-slate-950 text-slate-50 sm:max-w-5xl">
      <DialogHeader>
        <DialogTitle class="text-2xl text-slate-50">版本元数据对比</DialogTitle>
        <DialogDescription class="text-slate-400">
          当前只对比资料元数据，不解析 PDF 或图片内容。
        </DialogDescription>
      </DialogHeader>

      <div class="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
        <div>
          <label class="text-sm font-semibold text-slate-300">版本 A</label>
          <select v-model="leftId" class="mt-2 h-11 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-slate-50">
            <option v-for="document in versions" :key="documentId(document)" :value="documentId(document)">
              {{ optionLabel(document) }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-sm font-semibold text-slate-300">版本 B</label>
          <select v-model="rightId" class="mt-2 h-11 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-slate-50">
            <option v-for="document in versions" :key="documentId(document)" :value="documentId(document)">
              {{ optionLabel(document) }}
            </option>
          </select>
        </div>
        <Button type="button" class="h-11 bg-cyan-300 text-slate-950 hover:bg-cyan-200" :disabled="!leftId || !rightId || leftId === rightId" @click="compare">
          <GitCompareArrows class="size-4" />
          开始对比
        </Button>
      </div>

      <div v-if="store.versionCompareResult" class="max-h-[520px] overflow-y-auto rounded-lg border border-slate-700">
        <div
          v-for="field in store.versionCompareResult.fields"
          :key="field.field"
          class="grid grid-cols-[160px_1fr_1fr] border-b border-slate-800 text-sm last:border-b-0"
          :class="field.different ? 'bg-amber-300/5' : 'bg-slate-900/60'"
        >
          <div class="border-r border-slate-800 p-3 font-semibold text-slate-300">{{ field.label }}</div>
          <div class="border-r border-slate-800 p-3 text-slate-100">{{ displayValue(field.values[0]) }}</div>
          <div class="p-3 text-slate-100">{{ displayValue(field.values[1]) }}</div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
