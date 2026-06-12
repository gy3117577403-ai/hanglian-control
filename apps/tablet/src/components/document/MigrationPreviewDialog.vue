<script setup lang="ts">
import { computed } from 'vue'
import {
  CheckCircle2,
  DatabaseZap,
  Download,
  LockKeyhole,
  ServerCog,
  ShieldAlert,
  XCircle,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
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
  get: () => store.migrationDialogOpen,
  set: (value: boolean) => {
    store.migrationDialogOpen = value
  },
})

const safety = computed(() => store.databaseSafety ?? store.migrationValidation?.safety ?? null)

const summaryRows = computed(() => {
  const summary = (store.prismaSeedPreview?.summary ?? store.migrationValidation?.summary ?? store.migrationPreview?.summary) as Record<string, number | undefined> | undefined
  if (!summary) return []
  return [
    ['用户', summary.users ?? 1],
    ['客户', summary.customers ?? 0],
    ['产品', summary.products ?? 0],
    ['生产计划', summary.productionPlans ?? 0],
    ['资料文件', summary.documents ?? 0],
    ['本地上传资料', summary.uploadedDocuments ?? 0],
    ['前段参数', summary.frontParameters ?? '-'],
    ['后段资料包', summary.backPackages ?? '-'],
    ['查询记录', summary.queryLogs ?? '-'],
    ['异常反馈', summary.feedbackRecords ?? 0],
    ['确认记录', summary.confirmationRecords ?? 0],
    ['审计记录', summary.auditLogs ?? 0],
  ]
})

const safetyRows = computed(() => {
  const current = safety.value
  if (!current) return []
  return [
    ['V0.8A 阶段', '只读验证'],
    ['数据源', current.dataSource.toUpperCase()],
    ['DB_TARGET', current.dbTarget],
    ['.env.local', current.envLocalExists ? '已检测到' : '未检测到'],
    ['测试库连接串', current.databaseConfigured ? '已配置' : '未配置/示例值'],
    ['只读连接许可', current.canReadDatabase ? '允许' : '未允许'],
    ['允许写库', current.canWriteDatabase ? '是' : '否'],
    ['危险操作', current.destructiveActionsAllowed ? '是' : '否'],
    ['疑似生产库', current.databaseUrlLooksProduction ? '是' : '否'],
    ['脱敏数据库地址', current.databaseUrlMasked],
  ]
})

const validationOk = computed(() => store.migrationValidation?.valid ?? false)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[88vh] overflow-y-auto border-cyan-300/30 bg-slate-950 text-slate-50 sm:max-w-5xl">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2 text-2xl text-slate-50">
          <DatabaseZap class="size-6 text-cyan-200" />
          Sealos 测试库只读验证预览
        </DialogTitle>
        <DialogDescription class="text-slate-400">
          V0.8A 只做只读连通检查、迁移 SQL 预览和 dry-run 校验，不执行建表、迁移、db push 或 seed。
        </DialogDescription>
      </DialogHeader>

      <div v-if="store.migrationPreview" class="space-y-4">
        <div class="grid grid-cols-3 gap-3">
          <div class="rounded-lg border border-slate-700 bg-slate-900/80 p-4">
            <p class="text-xs text-slate-500">当前数据流</p>
            <p class="mt-1 text-2xl font-semibold text-cyan-100">
              {{ store.dataSourceStatus.dataSource.toUpperCase() }} API
            </p>
            <p class="mt-2 text-xs text-slate-400">
              当前前端数据仍来自 Mock API，尚未切换到 Sealos。
            </p>
          </div>
          <div class="rounded-lg border border-slate-700 bg-slate-900/80 p-4">
            <p class="flex items-center gap-2 text-xs text-slate-500">
              <ServerCog class="size-4" />
              只读连接
            </p>
            <p class="mt-1 text-xl font-semibold" :class="safety?.canReadDatabase ? 'text-emerald-100' : 'text-amber-100'">
              {{ safety?.canReadDatabase ? '测试库只读已允许' : '默认不连接数据库' }}
            </p>
            <p class="mt-2 text-xs text-slate-400">{{ safety?.message }}</p>
          </div>
          <div class="rounded-lg border p-4" :class="validationOk ? 'border-emerald-300/30 bg-emerald-300/10' : 'border-amber-300/35 bg-amber-300/10'">
            <p class="flex items-center gap-2 text-xs" :class="validationOk ? 'text-emerald-200' : 'text-amber-100'">
              <CheckCircle2 v-if="validationOk" class="size-4" />
              <XCircle v-else class="size-4" />
              迁移数据校验
            </p>
            <p class="mt-1 text-xl font-semibold" :class="validationOk ? 'text-emerald-100' : 'text-amber-100'">
              {{ validationOk ? '通过' : '需检查' }}
            </p>
            <p class="mt-2 text-xs text-slate-300">
              错误 {{ store.migrationValidation?.errors.length ?? 0 }} / 警告 {{ store.migrationValidation?.warnings.length ?? 0 }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-5 gap-3">
          <div
            v-for="[label, value] in safetyRows"
            :key="label"
            class="rounded-lg border border-slate-700 bg-slate-900/80 p-3"
          >
            <p class="text-xs text-slate-500">{{ label }}</p>
            <p
              class="mt-1 break-all text-base font-semibold"
              :class="String(value) === '否' || String(value).includes('未') || String(value) === '是' && label === '疑似生产库' ? 'text-amber-100' : 'text-cyan-100'"
            >
              {{ value }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-6 gap-3">
          <div
            v-for="[label, value] in summaryRows"
            :key="label"
            class="rounded-lg border border-slate-700 bg-slate-900/80 p-3"
          >
            <p class="text-xs text-slate-500">{{ label }}</p>
            <p class="mt-1 text-2xl font-semibold text-slate-50">{{ value }}</p>
          </div>
        </div>

        <div class="rounded-lg border border-amber-300/35 bg-amber-300/10 p-4">
          <p class="flex items-center gap-2 text-sm font-semibold text-amber-100">
            <ShieldAlert class="size-4" />
            安全提醒
          </p>
          <ul class="mt-2 space-y-1 text-sm text-amber-50/90">
            <li v-for="warning in (store.migrationValidation?.warnings ?? store.migrationPreview.warnings)" :key="warning">
              {{ warning }}
            </li>
          </ul>
        </div>

        <div v-if="safety?.nextSteps?.length" class="rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-4">
          <p class="flex items-center gap-2 text-sm font-semibold text-cyan-100">
            <LockKeyhole class="size-4" />
            下一步建议
          </p>
          <ul class="mt-2 space-y-1 text-sm text-cyan-50/90">
            <li v-for="step in safety.nextSteps" :key="step">{{ step }}</li>
          </ul>
        </div>

        <div v-if="store.migrationValidation?.errors.length" class="rounded-lg border border-red-400/40 bg-red-500/10 p-4">
          <p class="text-sm font-semibold text-red-100">校验错误</p>
          <ul class="mt-2 space-y-1 text-sm text-red-50/90">
            <li v-for="error in store.migrationValidation.errors" :key="error">{{ error }}</li>
          </ul>
        </div>

        <div class="flex items-center justify-between rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-4">
          <div>
            <p class="text-sm font-semibold text-cyan-100">Seed dry-run</p>
            <p class="mt-1 text-xs text-cyan-50/80">
              已生成 Prisma seed 结构预览；页面不提供真实迁移、建表或写库操作。
            </p>
          </div>
          <Button type="button" class="h-11 bg-cyan-300 text-slate-950 hover:bg-cyan-200" @click="store.exportSeedPreview">
            <Download class="size-4" />
            导出 seed JSON 预览
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
