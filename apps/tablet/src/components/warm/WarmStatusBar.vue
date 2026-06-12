<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import dayjs from 'dayjs'
import { CalendarDays, Factory, HardDrive, ShieldCheck, UserRound } from 'lucide-vue-next'
import { useProductionStore } from '@/stores/production-store'

const store = useProductionStore()
const currentTime = ref(dayjs().format('YYYY年MM月DD日 HH:mm'))
let timer: number | undefined

const roleLabel = computed(() => (store.activeProcess === 'front' ? '前段组长' : '后段组长'))
const apiLabel = computed(() => {
  if (store.offlineDemoMode) return '离线演示模式'
  return store.apiOnline ? 'API 在线' : 'API 检查中'
})
const apiSeverity = computed(() => (store.apiOnline ? 'success' : store.offlineDemoMode ? 'warn' : 'info'))

const menuItems = [
  { label: '安全基线已启用', icon: 'pi pi-shield' },
  { label: '资料版本留痕', icon: 'pi pi-history' },
  { label: '本地 Mock 数据流', icon: 'pi pi-database' },
]

onMounted(() => {
  timer = window.setInterval(() => {
    currentTime.value = dayjs().format('YYYY年MM月DD日 HH:mm')
  }, 30_000)
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <header class="warm-topbar warm-enter">
    <div class="flex min-w-0 items-center gap-4">
      <div class="warm-logo-mark">
        <Factory :size="30" stroke-width="2.4" />
      </div>
      <div class="min-w-0">
        <p class="section-kicker">HANG LIAN CONTROL / TABLET PWA</p>
        <h1 class="truncate text-[25px] font-black leading-tight tracking-normal text-[#342316]">
          线束车间生产计划资料管控系统
        </h1>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-2 text-sm font-bold">
      <div class="warm-chip">
        <CalendarDays :size="17" />
        <span>{{ currentTime }}</span>
      </div>
      <div class="warm-chip">
        <ShieldCheck :size="17" />
        <span>A 班</span>
      </div>
      <div class="warm-chip">
        <UserRound :size="17" />
        <span>{{ roleLabel }}</span>
      </div>
      <div class="warm-chip">
        <span :class="['status-lamp', { offline: !store.apiOnline }]" />
        <span>组长演示账号</span>
      </div>
    </div>

    <div class="grid grid-cols-[1fr_148px] items-center gap-3">
      <div class="space-y-2">
        <PrimeTag :severity="apiSeverity" :value="apiLabel" />
        <div class="flex items-center gap-2 text-xs font-bold text-[#76512a]">
          <HardDrive :size="15" />
          <span>{{ store.dataSourceStatus.dataSource === 'prisma' ? 'Prisma 数据源' : 'Mock 数据源' }}</span>
        </div>
      </div>
      <PrimeMenu :model="menuItems" class="warm-mini-menu" />
    </div>
  </header>
</template>
