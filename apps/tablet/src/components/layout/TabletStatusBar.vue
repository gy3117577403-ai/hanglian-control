<script setup lang="ts">
import dayjs from 'dayjs'
import { CalendarDays, Database, LockKeyhole, ShieldCheck, UserRound, Wifi } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { useProductionStore } from '@/stores/production-store'

const store = useProductionStore()
</script>

<template>
  <header class="flex h-20 items-center justify-between border-b border-cyan-300/15 bg-slate-950/85 px-6 shadow-[0_12px_40px_rgba(0,0,0,0.28)]">
    <div class="flex items-center gap-4">
      <div class="flex size-12 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.16)]">
        <ShieldCheck class="size-7" />
      </div>
      <div>
        <p class="text-[13px] font-semibold text-cyan-200/70">HANG LIAN MES DATA CONTROL</p>
        <h1 class="m-0 text-[26px] font-semibold leading-tight tracking-normal text-slate-50">
          线束车间生产计划资料管控系统
        </h1>
      </div>
    </div>

    <div class="flex items-center gap-3 text-sm text-slate-200">
      <Badge class="h-9 gap-2 border border-slate-600 bg-slate-900 px-3 text-slate-100">
        <CalendarDays class="size-4 text-cyan-300" />
        {{ dayjs().format('YYYY年MM月DD日') }}
      </Badge>
      <Badge class="h-9 border border-amber-400/30 bg-amber-400/10 px-3 text-amber-100">
        当前班组：A 班
      </Badge>
      <Badge class="h-9 border border-blue-400/30 bg-blue-400/10 px-3 text-blue-100">
        角色：前段/后段组长
      </Badge>
      <Badge
        class="h-9 gap-2 border px-3"
        :class="store.apiOnline
          ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
          : 'border-orange-400/35 bg-orange-400/10 text-orange-100'"
      >
        <Wifi class="size-4" />
        {{ store.apiOnline ? 'API 在线' : '离线演示模式' }}
      </Badge>
      <Badge class="h-9 gap-2 border border-cyan-300/25 bg-cyan-300/10 px-3 text-cyan-100">
        <Database class="size-4" />
        数据源：{{ store.dataSourceStatus.dataSource === 'mock' ? 'Mock' : 'Prisma' }}
      </Badge>
      <Badge
        class="h-9 gap-2 border px-3"
        :class="store.databaseSafety?.canWriteDatabase
          ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
          : 'border-slate-500/70 bg-slate-900 text-slate-300'"
      >
        <LockKeyhole class="size-4" />
        {{ store.databaseSafety?.canWriteDatabase ? '测试库写入已授权' : '数据库写入保护' }}
      </Badge>
      <Badge class="h-9 gap-2 border border-slate-500 bg-slate-900 px-3 text-slate-100">
        <UserRound class="size-4 text-slate-300" />
        组长演示账号
      </Badge>
    </div>
  </header>
</template>
