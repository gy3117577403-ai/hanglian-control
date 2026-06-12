<script setup lang="ts">
import { computed } from 'vue'
import { ScrollText } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useProductionStore } from '@/stores/production-store'

const store = useProductionStore()

const open = computed({
  get: () => store.auditDialogOpen,
  set: (value: boolean) => {
    store.auditDialogOpen = value
  },
})

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    document_uploaded: '资料上传',
    document_status_changed: '状态变更',
    document_version_changed: '版本变更',
    document_set_effective: '设为有效',
    document_archived: '资料归档',
    document_previewed: '资料预览',
    document_downloaded: '资料下载',
    readiness_recalculated: '齐套性重算',
    migration_preview_generated: '迁移预览',
  }
  return labels[action] ?? action
}

function compactJson(value: unknown) {
  if (!value) return '-'
  const text = JSON.stringify(value, null, 2)
  return text.length > 420 ? `${text.slice(0, 420)}...` : text
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="border-cyan-300/30 bg-slate-950 text-slate-50 sm:max-w-5xl">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2 text-2xl text-slate-50">
          <ScrollText class="size-6 text-cyan-200" />
          审计记录
        </DialogTitle>
        <DialogDescription class="text-slate-400">
          当前审计记录保存在后端本地 audit-logs.json，用于开发原型留痕。
        </DialogDescription>
      </DialogHeader>

      <div class="max-h-[560px] space-y-3 overflow-y-auto pr-1">
        <div v-if="store.auditLogs.length === 0" class="rounded-lg border border-slate-700 bg-slate-900/80 p-6 text-center text-slate-400">
          暂无审计记录
        </div>
        <div
          v-for="log in store.auditLogs"
          :key="log.auditId"
          class="rounded-lg border border-slate-700 bg-slate-900/80 p-4"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <Badge class="border border-cyan-300/30 bg-cyan-300/10 text-cyan-100">{{ actionLabel(log.action) }}</Badge>
              <p class="mt-2 text-base font-semibold text-slate-50">{{ log.message }}</p>
              <p class="mt-1 text-sm text-slate-500">{{ log.operatorName }} / {{ log.operatorRole }} / {{ log.createdAt }}</p>
            </div>
            <p class="text-xs text-slate-500">{{ log.entityType }} / {{ log.entityId }}</p>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-3">
            <div class="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
              <p class="mb-2 text-xs font-semibold text-slate-500">变更前</p>
              <pre class="max-h-40 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-400">{{ compactJson(log.before) }}</pre>
            </div>
            <div class="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
              <p class="mb-2 text-xs font-semibold text-slate-500">变更后</p>
              <pre class="max-h-40 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-400">{{ compactJson(log.after) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
