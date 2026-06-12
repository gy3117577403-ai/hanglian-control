<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, CheckCircle2, GitCompareArrows } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useProductionStore } from '@/stores/production-store'
import type { DocumentStatus, ProductDocument } from '@/types/production'

const store = useProductionStore()

const open = computed({
  get: () => store.versionDialogOpen,
  set: (value: boolean) => {
    store.versionDialogOpen = value
  },
})

const versions = computed(() => store.documentVersions?.versions ?? [])
const effectiveId = computed(() => store.documentVersions?.effectiveDocumentId)

function documentId(document: ProductDocument) {
  return document.documentId ?? document.id
}

function statusLabel(status?: DocumentStatus) {
  const labels: Record<DocumentStatus, string> = {
    effective: '当前有效',
    pending_review: '待确认',
    expired: '已失效',
    missing: '缺失',
    inconsistent: '不一致',
  }
  return status ? labels[status] : '未知'
}

function statusClass(status?: DocumentStatus) {
  if (status === 'effective') return 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100'
  if (status === 'pending_review') return 'border-amber-300/40 bg-amber-300/10 text-amber-100'
  return 'border-red-400/40 bg-red-500/10 text-red-100'
}

function sourceLabel(document: ProductDocument) {
  if (document.source === 'manual_upload') return '本地上传'
  if (document.source === 'wecom_disk') return '企业微信微盘'
  return 'Mock 资料'
}

function fileSizeLabel(size?: number) {
  if (!size) return '无文件'
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function setEffective(document: ProductDocument) {
  if (!window.confirm(`确认将 ${document.title} ${document.version} 设为当前有效版本？同组其他有效版本会自动失效。`)) return
  store.setCurrentDocumentEffective(documentId(document), {
    reason: `平板端确认 ${document.version} 为当前有效版本`,
  })
}

function openCompare() {
  store.compareDialogOpen = true
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="border-cyan-300/30 bg-slate-950 text-slate-50 sm:max-w-5xl">
      <DialogHeader>
        <DialogTitle class="text-2xl text-slate-50">资料版本历史</DialogTitle>
        <DialogDescription class="text-slate-400">
          同一 productId + documentType + requiredForProcess 视为同组资料，每组最多一个当前有效版本。
        </DialogDescription>
      </DialogHeader>

      <div v-if="store.documentVersions" class="space-y-4">
        <div class="grid grid-cols-4 gap-3">
          <div class="rounded-lg border border-slate-700 bg-slate-900/80 p-3">
            <p class="text-xs text-slate-500">版本数量</p>
            <p class="mt-1 text-2xl font-semibold text-cyan-100">{{ store.documentVersions.versionCount }}</p>
          </div>
          <div class="rounded-lg border border-slate-700 bg-slate-900/80 p-3">
            <p class="text-xs text-slate-500">当前有效</p>
            <p class="mt-1 truncate text-lg font-semibold text-emerald-100">{{ effectiveId ?? '暂无' }}</p>
          </div>
          <div class="rounded-lg border border-slate-700 bg-slate-900/80 p-3">
            <p class="text-xs text-slate-500">待确认</p>
            <p class="mt-1 text-2xl font-semibold text-amber-100">{{ store.documentVersions.hasPendingReview ? '有' : '无' }}</p>
          </div>
          <div class="rounded-lg border border-slate-700 bg-slate-900/80 p-3">
            <p class="text-xs text-slate-500">历史/异常</p>
            <p class="mt-1 text-2xl font-semibold text-red-100">{{ store.documentVersions.hasExpired || store.documentVersions.hasInconsistent ? '有' : '无' }}</p>
          </div>
        </div>

        <div class="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/70 p-3">
          <p class="text-sm text-slate-400">历史版本可查看、可下载、可对比，但不会默认作为当前生产资料。</p>
          <Button type="button" class="bg-slate-800 text-cyan-100 hover:bg-slate-700" :disabled="versions.length < 2" @click="openCompare">
            <GitCompareArrows class="size-4" />
            对比版本
          </Button>
        </div>

        <div class="max-h-[430px] space-y-3 overflow-y-auto pr-1">
          <div
            v-for="document in versions"
            :key="documentId(document)"
            class="rounded-lg border border-slate-700 bg-slate-900/80 p-4"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <p class="truncate text-lg font-semibold text-slate-50">{{ document.title }}</p>
                  <Badge class="border" :class="statusClass(document.documentStatus)">
                    {{ statusLabel(document.documentStatus) }}
                  </Badge>
                </div>
                <p class="mt-2 text-sm text-slate-400">
                  {{ document.version }} / {{ sourceLabel(document) }} / {{ fileSizeLabel(document.fileSize) }} / {{ document.updatedAt ?? document.createdAt ?? 'Mock' }}
                </p>
                <p v-if="document.documentStatus === 'expired'" class="mt-2 text-sm font-semibold text-red-100">
                  <AlertTriangle class="mr-1 inline size-4" />
                  该资料为历史版本，不建议用于当前生产。
                </p>
              </div>
              <Button
                type="button"
                class="h-10 bg-emerald-300 px-4 text-slate-950 hover:bg-emerald-200 disabled:opacity-40"
                :disabled="document.documentStatus === 'effective'"
                @click="setEffective(document)"
              >
                <CheckCircle2 class="size-4" />
                设为当前有效
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
