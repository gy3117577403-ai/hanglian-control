<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import gsap from 'gsap'
import { Mic, Search, Sparkles } from 'lucide-vue-next'
import { useProductionStore } from '@/stores/production-store'
import type { SearchHit } from '@/types/production'

const store = useProductionStore()
const rootRef = ref<HTMLElement | null>(null)
let ctx: gsap.Context | undefined

const searchValue = computed({
  get: () => store.searchKeyword,
  set: (value: string) => store.setSearchKeyword(value),
})

const resultTypeLabel: Record<string, string> = {
  plan: '计划',
  'front-parameter': '前段参数',
  'back-document': '后段资料',
  drawing: '图纸',
  sop: 'SOP',
  connector: '连接器',
  'detail-image': '成品图',
}

function search() {
  void store.search(searchValue.value)
}

function onPanelAction(event: MouseEvent) {
  const action = (event.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action
  if (action === 'search') search()
  if (action === 'voice') void store.runVoiceQuery()
}

async function openHit(hit: SearchHit) {
  if (hit.planId && hit.planId !== store.selectedPlan.id) {
    await store.selectPlan(hit.planId)
  }
  if (hit.type === 'front-parameter') store.setSegment('前段')
  if (['back-document', 'connector', 'sop', 'detail-image'].includes(String(hit.type))) store.setSegment('后段')
  if (hit.type === 'drawing') store.setDocumentTab('drawing')
  if (hit.type === 'sop') store.setDocumentTab('sop')
  if (hit.type === 'detail-image') store.setDocumentTab('finish')
  store.addQueryLog(`打开搜索结果：${hit.title}`, '搜索', hit.planId)
}

onMounted(() => {
  ctx = gsap.context(() => {
    gsap.to('.voice-button', {
      scale: 1.018,
      duration: 1.25,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    })
  }, rootRef.value ?? undefined)
})

onUnmounted(() => {
  ctx?.revert()
})
</script>

<template>
  <section ref="rootRef" class="section-bay" @click.capture="onPanelAction">
    <div class="section-title">
      <div>
        <p class="section-kicker">SEARCH / VOICE</p>
        <h2 class="text-xl font-black">资料快速查询</h2>
      </div>
      <Sparkles class="text-[#b45f22]" :size="22" />
    </div>

    <div class="grid grid-cols-[1fr_94px] gap-2">
      <span class="p-input-icon-left">
        <i class="pi pi-search" />
        <PrimeInputText v-model="searchValue" class="w-full text-base font-bold" placeholder="客户 / 产品 / 端子 / SOP / 孔位图" @keyup.enter="search" />
      </span>
      <PrimeButton data-action="search" label="搜索" icon="pi pi-search" class="touch-button-3d" />
    </div>

    <PrimeButton
      class="voice-button touch-button-3d mt-3 w-full"
      data-action="voice"
      severity="secondary"
    >
      <template #icon>
        <Mic :size="22" />
      </template>
      <span class="text-lg">按住说话</span>
    </PrimeButton>

    <div v-if="store.searchHits.length" v-auto-animate class="mt-3 max-h-36 space-y-2 overflow-auto pr-1">
      <button
        v-for="hit in store.searchHits.slice(0, 4)"
        :key="hit.id"
        type="button"
        class="w-full rounded-lg border border-[#8b5a2a33] bg-white/55 px-3 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff7e6]"
        @click="openHit(hit)"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="truncate text-sm font-black text-[#3b2514]">{{ hit.title }}</p>
          <PrimeTag :value="resultTypeLabel[String(hit.type)] ?? String(hit.type)" severity="secondary" />
        </div>
        <p class="mt-1 truncate text-xs font-bold text-[#7b5129]">{{ hit.snippet || hit.subtitle }}</p>
      </button>
    </div>

    <div class="mt-3">
      <div class="mb-2 flex items-center gap-2 text-sm font-black text-[#68411f]">
        <Search :size="16" />
        <span>最近查询</span>
      </div>
      <div v-auto-animate class="grid grid-cols-2 gap-2">
        <div v-for="log in store.queryRecords.slice(0, 4)" :key="log.id" class="rounded-md bg-[#fff8ea]/70 px-2 py-1.5">
          <p class="truncate text-xs font-black text-[#3b2514]">{{ log.text }}</p>
          <p class="text-[11px] font-bold text-[#80552c]">{{ log.time }} · {{ log.source }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
