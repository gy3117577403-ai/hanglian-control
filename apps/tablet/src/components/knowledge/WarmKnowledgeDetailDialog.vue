<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import type { AbnormalCaseKnowledge, FixtureKnowledge, QualityStandardKnowledge } from '@/types/production'

type KnowledgeItem = FixtureKnowledge | AbnormalCaseKnowledge | QualityStandardKnowledge

const props = defineProps<{
  visible: boolean
  item: KnowledgeItem | null
}>()

const emit = defineEmits<{ 'update:visible': [value: boolean] }>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const title = computed(() => {
  const item = props.item
  if (!item) return '现场知识详情'
  if ('fixtureName' in item) return item.fixtureName
  return item.title
})

const rows = computed(() => {
  const item = props.item
  if (!item) return []
  if ('fixtureId' in item) {
    return [
      ['治具编号', item.fixtureCode],
      ['治具类型', item.fixtureType],
      ['适用工位', item.applicableStation],
      ['使用方法', item.usageMethod],
      ['点检标准', item.checkStandard],
      ['保养周期', item.maintenanceCycle],
      ['下次保养', item.nextMaintenanceDate],
      ['关键词', item.keywords.join('，')],
    ]
  }
  if ('abnormalId' in item) {
    return [
      ['异常编号', item.abnormalCode],
      ['工位', item.station],
      ['类别', item.category],
      ['现象', item.symptom],
      ['原因', item.cause],
      ['处理', item.solution],
      ['预防', item.prevention],
      ['关键词', item.keywords.join('，')],
    ]
  }
  return [
    ['标准编号', item.qualityCode],
    ['检验项目', item.inspectionItem],
    ['标准值', item.standardValue],
    ['公差', item.tolerance],
    ['检验方法', item.inspectionMethod],
    ['抽检规则', item.samplingRule],
    ['缺陷等级', item.defectLevel],
    ['关键词', item.keywords.join('，')],
  ]
})
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal :header="title" class="knowledge-detail-dialog">
    <div v-if="item" class="grid gap-4">
      <section class="rounded-2xl bg-[#fff8ea] p-4 shadow-inner">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-sm font-black text-[#9d5d24]">{{ item.customerName }} / {{ item.productCode }}</p>
            <h3 class="text-2xl font-black text-[#342316]">{{ item.productName }}</h3>
          </div>
          <PrimeTag :value="item.processSegment" severity="warn" />
        </div>
      </section>

      <div class="grid gap-3 md:grid-cols-2">
        <article v-for="row in rows" :key="row[0]" class="rounded-xl border border-[#8b5a2a26] bg-white/70 p-3">
          <span class="text-xs font-black text-[#9a612a]">{{ row[0] }}</span>
          <p class="mt-1 text-base font-black leading-snug text-[#342316]">{{ row[1] || '-' }}</p>
        </article>
      </div>

      <p class="text-sm font-bold text-[#7b5129]">
        更新：{{ dayjs(item.updatedAt).format('YYYY-MM-DD HH:mm') }} / 备注：{{ item.remark || '无' }}
      </p>
    </div>

    <template #footer>
      <PrimeButton severity="secondary" label="关闭" @click="dialogVisible = false" />
    </template>
  </PrimeDialog>
</template>

