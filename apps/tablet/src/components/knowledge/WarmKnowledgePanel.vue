<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { BookOpenCheck, Search } from 'lucide-vue-next'
import WarmAbnormalCaseCard from '@/components/knowledge/WarmAbnormalCaseCard.vue'
import WarmFixtureCard from '@/components/knowledge/WarmFixtureCard.vue'
import WarmKnowledgeDetailDialog from '@/components/knowledge/WarmKnowledgeDetailDialog.vue'
import WarmQualityStandardCard from '@/components/knowledge/WarmQualityStandardCard.vue'
import { useKnowledgeStore } from '@/stores/knowledge-store'
import { useProductionStore } from '@/stores/production-store'
import type { AbnormalCaseKnowledge, FixtureKnowledge, KnowledgeProcessSegment, QualityStandardKnowledge } from '@/types/production'

type KnowledgeItem = FixtureKnowledge | AbnormalCaseKnowledge | QualityStandardKnowledge

const knowledge = useKnowledgeStore()
const production = useProductionStore()
const detailVisible = ref(false)
const selectedItem = ref<KnowledgeItem | null>(null)

const segment = computed<KnowledgeProcessSegment>(() => production.activeProcess === 'front' ? 'front' : 'back')
const titleSegment = computed(() => production.activeProcess === 'front' ? '前段' : '后段')

const fixtureRows = computed(() => knowledge.fixtures.slice(0, 4))
const abnormalRows = computed(() => knowledge.abnormalCases.slice(0, 4))
const qualityRows = computed(() => knowledge.qualityStandards.slice(0, 4))

function openDetail(item: KnowledgeItem) {
  selectedItem.value = item
  detailVisible.value = true
}

async function reload() {
  const planId = production.selectedPlan?.id
  if (!planId) return
  await knowledge.loadSummaryForPlan(planId, segment.value)
}

async function searchCurrent() {
  await knowledge.search(knowledge.keyword, production.selectedPlan.id, production.selectedPlan.productId)
}

watch(
  () => [production.selectedPlan?.id, production.activeProcess],
  () => {
    void reload()
  },
)

onMounted(() => {
  void reload()
})
</script>

<template>
  <section class="section-bay warm-enter">
    <div class="section-title">
      <div>
        <p class="section-kicker">FIELD KNOWLEDGE / V2.3</p>
        <h3 class="text-xl font-black">现场知识库</h3>
        <p class="mt-1 text-xs font-black text-[#7a5129]">
          {{ titleSegment }}联动：治具 {{ knowledge.fixtures.length }} / 异常 {{ knowledge.abnormalCases.length }} / 质量 {{ knowledge.qualityStandards.length }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <PrimeTag :value="knowledge.hasRisk ? '需关注' : '可生产'" :severity="knowledge.hasRisk ? 'danger' : 'success'" />
        <BookOpenCheck class="text-[#b45f22]" :size="24" />
      </div>
    </div>

    <PrimeMessage v-if="knowledge.errorMessage" severity="warn" :closable="false" class="mb-3">
      {{ knowledge.errorMessage }}
    </PrimeMessage>

    <div class="mb-3 grid grid-cols-[1fr_110px] gap-2">
      <PrimeInputText v-model="knowledge.keyword" placeholder="搜索治具 / 异常 / 质量标准" @keydown.enter="searchCurrent" />
      <PrimeButton label="搜索" :loading="knowledge.loading" @click="searchCurrent">
        <template #icon><Search :size="16" /></template>
      </PrimeButton>
    </div>

    <div v-if="knowledge.searchResults.length" class="mb-3 grid gap-2 lg:grid-cols-3">
      <button
        v-for="hit in knowledge.searchResults.slice(0, 6)"
        :key="hit.id"
        type="button"
        class="rounded-xl border border-[#8b5a2a26] bg-white/65 p-3 text-left shadow-sm"
      >
        <div class="mb-1 flex items-center justify-between gap-2">
          <strong class="truncate text-[#342316]">{{ hit.title }}</strong>
          <PrimeTag :value="hit.matchedField" severity="secondary" />
        </div>
        <p class="line-clamp-2 text-xs font-bold text-[#76512a]">{{ hit.snippet }}</p>
      </button>
    </div>

    <div class="grid gap-3 xl:grid-cols-3">
      <section class="rounded-2xl bg-[#fff4dc]/80 p-3 shadow-inner">
        <div class="mb-3 flex items-center justify-between">
          <h4 class="text-lg font-black text-[#342316]">相关治具</h4>
          <PrimeTag :value="fixtureRows.length" severity="warn" />
        </div>
        <div class="grid gap-2">
          <WarmFixtureCard v-for="item in fixtureRows" :key="item.fixtureId" :item="item" @open="openDetail" />
          <p v-if="!fixtureRows.length" class="rounded-xl bg-white/60 p-4 text-sm font-black text-[#76512a]">当前工序暂无治具记录。</p>
        </div>
      </section>

      <section class="rounded-2xl bg-[#fff0e0]/80 p-3 shadow-inner">
        <div class="mb-3 flex items-center justify-between">
          <h4 class="text-lg font-black text-[#342316]">常见异常</h4>
          <PrimeTag :value="abnormalRows.length" severity="danger" />
        </div>
        <div class="grid gap-2">
          <WarmAbnormalCaseCard v-for="item in abnormalRows" :key="item.abnormalId" :item="item" @open="openDetail" />
          <p v-if="!abnormalRows.length" class="rounded-xl bg-white/60 p-4 text-sm font-black text-[#76512a]">当前工序暂无异常案例。</p>
        </div>
      </section>

      <section class="rounded-2xl bg-[#fff7df]/80 p-3 shadow-inner">
        <div class="mb-3 flex items-center justify-between">
          <h4 class="text-lg font-black text-[#342316]">质量标准</h4>
          <PrimeTag :value="qualityRows.length" severity="success" />
        </div>
        <div class="grid gap-2">
          <WarmQualityStandardCard v-for="item in qualityRows" :key="item.qualityId" :item="item" @open="openDetail" />
          <p v-if="!qualityRows.length" class="rounded-xl bg-white/60 p-4 text-sm font-black text-[#76512a]">当前工序暂无质量标准。</p>
        </div>
      </section>
    </div>

    <WarmKnowledgeDetailDialog v-model:visible="detailVisible" :item="selectedItem" />
  </section>
</template>

