<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { BookOpenCheck, CheckCircle2, ClipboardList, Search, ShieldAlert } from 'lucide-vue-next'
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
const segmentLabel = computed(() => production.activeProcess === 'front' ? '前段' : '后段')
const validation = computed(() => knowledge.planKnowledgeValidation)

function severityFor(status?: string) {
  if (status === 'ready' || status === 'pass') return 'success'
  if (status === 'blocked' || status === 'fail' || status === 'danger' || status === 'critical') return 'danger'
  return 'warn'
}

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
        <p class="section-kicker">FIELD KNOWLEDGE / V2.4</p>
        <h3 class="text-xl font-black">现场知识库</h3>
        <p class="mt-1 text-xs font-black text-[#7a5129]">
          {{ segmentLabel }}联动：治具 {{ knowledge.fixtures.length }} / 异常 {{ knowledge.abnormalCases.length }} / 质量 {{ knowledge.qualityStandards.length }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <PrimeTag :value="validation?.validationStatus === 'ready' ? '可开工验证' : validation?.validationStatus === 'blocked' ? '知识阻塞' : '需复核'" :severity="severityFor(validation?.validationStatus)" />
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
        class="rounded-xl border border-[#8b5a2a26] bg-white/70 p-3 text-left shadow-sm"
      >
        <div class="mb-1 flex items-center justify-between gap-2">
          <strong class="truncate text-[#342316]">{{ hit.title }}</strong>
          <PrimeTag :value="hit.matchedField" severity="secondary" />
        </div>
        <p class="line-clamp-2 text-xs font-bold text-[#76512a]">{{ hit.snippet }}</p>
      </button>
    </div>

    <PrimeTabs v-model:value="knowledge.activeTab">
      <PrimeTabList class="maintenance-tab-list">
        <PrimeTab value="validation">知识验证</PrimeTab>
        <PrimeTab value="fixtures">治具</PrimeTab>
        <PrimeTab value="abnormal">异常</PrimeTab>
        <PrimeTab value="quality">质量标准</PrimeTab>
      </PrimeTabList>
      <PrimeTabPanels>
        <PrimeTabPanel value="validation">
          <div class="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
            <section class="rounded-2xl bg-[#fff4dc]/80 p-4 shadow-inner">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="section-kicker">KNOWLEDGE VALIDATION</p>
                  <h4 class="text-lg font-black text-[#342316]">{{ validation?.summary ?? '正在检查现场知识齐套性' }}</h4>
                </div>
                <PrimeTag :value="`${validation?.score ?? 0} 分`" :severity="(validation?.score ?? 0) >= 90 ? 'success' : (validation?.score ?? 0) >= 75 ? 'warn' : 'danger'" />
              </div>
              <div class="mt-3 grid grid-cols-3 gap-2">
                <article class="rounded-xl bg-white/70 p-3">
                  <span class="text-xs font-black text-[#8a5a2c]">治具齐套</span>
                  <strong class="block text-2xl text-[#342316]">{{ validation?.fixtureSummary.total ?? 0 }}</strong>
                  <small>有效 {{ validation?.fixtureSummary.active ?? 0 }}</small>
                </article>
                <article class="rounded-xl bg-white/70 p-3">
                  <span class="text-xs font-black text-[#8a5a2c]">异常提醒</span>
                  <strong class="block text-2xl text-[#342316]">{{ validation?.abnormalSummary.total ?? 0 }}</strong>
                  <small>高风险 {{ validation?.abnormalSummary.highRisk ?? 0 }} / 严重 {{ validation?.abnormalSummary.critical ?? 0 }}</small>
                </article>
                <article class="rounded-xl bg-white/70 p-3">
                  <span class="text-xs font-black text-[#8a5a2c]">质量标准</span>
                  <strong class="block text-2xl text-[#342316]">{{ validation?.qualitySummary.total ?? 0 }}</strong>
                  <small>有效 {{ validation?.qualitySummary.effective ?? 0 }}</small>
                </article>
              </div>
            </section>

            <section class="rounded-2xl bg-[#fff8e9]/90 p-4 shadow-inner">
              <div class="mb-3 flex items-center gap-2">
                <ClipboardList :size="20" class="text-[#b45f22]" />
                <h4 class="text-lg font-black text-[#342316]">推荐动作</h4>
              </div>
              <div class="grid gap-2">
                <article
                  v-for="item in knowledge.recommendations.slice(0, 5)"
                  :key="`${item.title}-${item.action}`"
                  class="rounded-xl border border-[#8b5a2a22] bg-white/70 p-3"
                >
                  <div class="flex items-center justify-between gap-3">
                    <strong class="text-[#342316]">{{ item.title }}</strong>
                    <PrimeTag :value="item.level" :severity="severityFor(item.level)" />
                  </div>
                  <p class="mt-1 text-sm font-bold text-[#76512a]">{{ item.action }}</p>
                </article>
              </div>
            </section>
          </div>

          <div class="mt-3 grid gap-2 lg:grid-cols-4">
            <article
              v-for="item in validation?.checkItems ?? []"
              :key="item.key"
              class="rounded-xl border border-[#8b5a2a22] bg-white/65 p-3 shadow-sm"
            >
              <div class="mb-1 flex items-center justify-between gap-2">
                <strong class="truncate text-[#342316]">{{ item.label }}</strong>
                <PrimeTag :value="item.status" :severity="severityFor(item.status)" />
              </div>
              <p class="text-xs font-bold text-[#76512a]">{{ item.message }}</p>
            </article>
          </div>
        </PrimeTabPanel>

        <PrimeTabPanel value="fixtures">
          <div class="grid gap-3 xl:grid-cols-2">
            <WarmFixtureCard v-for="item in knowledge.fixtures" :key="item.fixtureId" :item="item" @open="openDetail" />
            <PrimeMessage v-if="!knowledge.fixtures.length" severity="warn" :closable="false">暂无治具记录，可在资料维护中心补充。</PrimeMessage>
          </div>
        </PrimeTabPanel>

        <PrimeTabPanel value="abnormal">
          <div class="mb-3 flex items-center gap-2 rounded-xl bg-[#fff0e0] p-3 text-sm font-black text-[#7a2e18]">
            <ShieldAlert :size="18" /> high / critical 异常会在开工验证中醒目提醒。
          </div>
          <div class="grid gap-3 xl:grid-cols-2">
            <WarmAbnormalCaseCard v-for="item in knowledge.abnormalCases" :key="item.abnormalId" :item="item" @open="openDetail" />
            <PrimeMessage v-if="!knowledge.abnormalCases.length" severity="warn" :closable="false">暂无异常案例，可在资料维护中心补充。</PrimeMessage>
          </div>
        </PrimeTabPanel>

        <PrimeTabPanel value="quality">
          <div class="mb-3 flex items-center gap-2 rounded-xl bg-[#fff8d9] p-3 text-sm font-black text-[#7a5129]">
            <CheckCircle2 :size="18" /> 待确认质量标准显示黄色提醒，已失效标准显示红线风险。
          </div>
          <div class="grid gap-3 xl:grid-cols-2">
            <WarmQualityStandardCard v-for="item in knowledge.qualityStandards" :key="item.qualityId" :item="item" @open="openDetail" />
            <PrimeMessage v-if="!knowledge.qualityStandards.length" severity="warn" :closable="false">暂无质量标准，可在资料维护中心补充。</PrimeMessage>
          </div>
        </PrimeTabPanel>
      </PrimeTabPanels>
    </PrimeTabs>

    <WarmKnowledgeDetailDialog v-model:visible="detailVisible" :item="selectedItem" />
  </section>
</template>
