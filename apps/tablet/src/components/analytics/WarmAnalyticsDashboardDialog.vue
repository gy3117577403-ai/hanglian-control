<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BarChart3, ClipboardCopy, Gauge, Layers3, LineChart, RefreshCcw, ShieldAlert } from 'lucide-vue-next'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart as ELineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { PERMISSIONS } from '@/lib/permissions'
import { analyticsProcessOptions, analyticsRangeOptions, useAnalyticsStore } from '@/stores/analytics-store'
import { useAuthStore } from '@/stores/auth-store'
import type { AnalyticsChartPoint, AnalyticsRankingItem, AnalyticsTrendPoint } from '@/types/production'

use([CanvasRenderer, BarChart, ELineChart, PieChart, GridComponent, LegendComponent, TooltipComponent])

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()

const analytics = useAnalyticsStore()
const auth = useAuthStore()
const activeTab = ref('overview')

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const canCopy = computed(() => auth.hasPermission(PERMISSIONS.ANALYTICS_SUMMARY_COPY))
const metricCards = computed(() => {
  const overview = analytics.overview
  return [
    { label: '今日计划数', value: overview?.production.planCount ?? 0, unit: '单', hint: '当前筛选范围', tone: 'amber' },
    { label: '生产中', value: overview?.production.running ?? 0, unit: '单', hint: '正在执行', tone: 'green' },
    { label: '已完工', value: overview?.production.completed ?? 0, unit: '单', hint: '完成计划', tone: 'green' },
    { label: '异常停线', value: overview?.production.exceptionHold ?? 0, unit: '次', hint: '需跟进', tone: 'red' },
    { label: '完成率', value: overview?.production.completionRate ?? 0, unit: '%', hint: '完成 / 计划', tone: 'amber' },
    { label: '完成数量', value: overview?.quantity.completedQuantity ?? 0, unit: '件', hint: `计划 ${overview?.quantity.plannedQuantity ?? 0}`, tone: 'orange' },
    { label: '不良率', value: overview?.quantity.defectRate ?? 0, unit: '%', hint: `不良 ${overview?.quantity.defectQuantity ?? 0}`, tone: 'red' },
    { label: '资料待复核', value: overview?.documents.pendingReview ?? 0, unit: '项', hint: '版本或状态', tone: 'amber' },
    { label: '文件缺失', value: overview?.documents.missingFile ?? 0, unit: '项', hint: '需补传', tone: 'red' },
    { label: '高风险异常', value: overview?.risk.highSeverityAbnormal ?? 0, unit: '项', hint: 'high', tone: 'red' },
    { label: '知识待复核', value: overview?.knowledge.pendingReview ?? 0, unit: '项', hint: '治具/异常/质量', tone: 'amber' },
  ]
})

watch(dialogVisible, (visible) => {
  if (visible) void analytics.loadAll()
})

function chartColors() {
  return ['#b45f22', '#e0a13a', '#3f8f61', '#cf4b32', '#7a5a3a', '#d98b42']
}

function pieOption(data: AnalyticsChartPoint[], title: string) {
  return {
    color: chartColors(),
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: '#5f3d20', fontWeight: 700 } },
    series: [{
      name: title,
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '42%'],
      avoidLabelOverlap: true,
      label: { color: '#4c3018', fontWeight: 700 },
      data,
    }],
  }
}

function barOption(data: AnalyticsChartPoint[], title: string) {
  return {
    color: ['#b45f22'],
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 18, top: 22, bottom: 42 },
    xAxis: { type: 'category', data: data.map((item) => item.name), axisLabel: { color: '#5f3d20', fontWeight: 700 } },
    yAxis: { type: 'value', axisLabel: { color: '#5f3d20', fontWeight: 700 } },
    series: [{ name: title, type: 'bar', data: data.map((item) => item.value), barMaxWidth: 36, itemStyle: { borderRadius: [8, 8, 0, 0] } }],
  }
}

function trendOption(rows: AnalyticsTrendPoint[], key: 'completionRate' | 'defectRate' | 'exceptionCount', title: string) {
  return {
    color: [key === 'exceptionCount' ? '#cf4b32' : '#b45f22'],
    tooltip: { trigger: 'axis' },
    grid: { left: 42, right: 18, top: 24, bottom: 36 },
    xAxis: { type: 'category', data: rows.map((row) => row.date.slice(5)), axisLabel: { color: '#5f3d20', fontWeight: 700 } },
    yAxis: { type: 'value', axisLabel: { color: '#5f3d20', fontWeight: 700 } },
    series: [{ name: title, type: 'line', smooth: true, data: rows.map((row) => row[key]), areaStyle: { opacity: 0.16 }, symbolSize: 7 }],
  }
}

function rankingSource(type: 'document' | 'exception' | 'review' | 'missing' | 'risk'): AnalyticsRankingItem[] {
  const rankings = analytics.rankings
  if (type === 'document') return rankings?.documentIssueProducts ?? []
  if (type === 'exception') return rankings?.exceptionProducts ?? []
  if (type === 'review') return rankings?.pendingReviewProducts ?? []
  if (type === 'missing') return rankings?.missingFileProducts ?? []
  return rankings?.highRiskAbnormalCategories ?? []
}

async function refresh() {
  await analytics.loadAll()
}

async function copySummary() {
  await analytics.copySummaryText()
}
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="现场统计看板" class="analytics-dialog">
    <div class="grid gap-4">
      <section class="analytics-hero">
        <div>
          <p class="section-kicker">V2.6 / FIELD ANALYTICS</p>
          <h2>线束车间现场统计看板</h2>
          <p>Mock / 本地 metadata 统计，不接 Sealos、不接企业微信微盘、不接真实语音。</p>
        </div>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <PrimeSelect v-model="analytics.filters.range" :options="analyticsRangeOptions" option-label="label" option-value="value" class="w-32" @change="refresh" />
          <PrimeSelect v-model="analytics.filters.processSegment" :options="analyticsProcessOptions" option-label="label" option-value="value" class="w-32" @change="refresh" />
          <PrimeButton severity="secondary" :loading="analytics.loading" @click="refresh">
            <template #icon><RefreshCcw :size="16" /></template>
          </PrimeButton>
          <PrimeButton label="复制统计摘要" :disabled="!canCopy" @click="copySummary">
            <template #icon><ClipboardCopy :size="16" /></template>
          </PrimeButton>
        </div>
      </section>

      <PrimeMessage v-if="analytics.errorMessage" severity="warn" :closable="false">
        {{ analytics.errorMessage }}
      </PrimeMessage>

      <PrimeTabs v-model:value="activeTab">
        <PrimeTabList class="maintenance-tab-list">
          <PrimeTab value="overview">总览</PrimeTab>
          <PrimeTab value="production">生产执行</PrimeTab>
          <PrimeTab value="quality">数量质量</PrimeTab>
          <PrimeTab value="documents">资料问题</PrimeTab>
          <PrimeTab value="knowledge">现场知识</PrimeTab>
          <PrimeTab value="ranking">趋势排行</PrimeTab>
        </PrimeTabList>

        <PrimeTabPanels>
          <PrimeTabPanel value="overview">
            <div class="analytics-metric-grid">
              <article v-for="card in metricCards" :key="card.label" :class="['analytics-metric', `tone-${card.tone}`]">
                <span>{{ card.label }}</span>
                <strong>{{ card.value }}<small>{{ card.unit }}</small></strong>
                <em>{{ card.hint }}</em>
              </article>
            </div>
            <div class="analytics-chart-grid mt-4">
              <section class="analytics-chart-panel">
                <div class="analytics-panel-title"><Gauge :size="18" />计划状态分布</div>
                <VChart v-if="analytics.production?.statusDistribution.length" class="analytics-chart" :option="pieOption(analytics.production.statusDistribution, '计划状态')" autoresize />
                <PrimeMessage v-else severity="warn" :closable="false">暂无计划状态数据。</PrimeMessage>
              </section>
              <section class="analytics-chart-panel">
                <div class="analytics-panel-title"><LineChart :size="18" />完成率趋势</div>
                <VChart v-if="analytics.trends?.rows.length" class="analytics-chart" :option="trendOption(analytics.trends.rows, 'completionRate', '完成率')" autoresize />
                <PrimeMessage v-else severity="warn" :closable="false">暂无趋势数据。</PrimeMessage>
              </section>
            </div>
          </PrimeTabPanel>

          <PrimeTabPanel value="production">
            <div class="analytics-chart-grid">
              <section class="analytics-chart-panel">
                <div class="analytics-panel-title"><Layers3 :size="18" />工序分布</div>
                <VChart class="analytics-chart" :option="pieOption(analytics.production?.processDistribution ?? [], '工序分布')" autoresize />
              </section>
              <section class="analytics-chart-panel">
                <div class="analytics-panel-title"><BarChart3 :size="18" />班组 / 负责人分布</div>
                <VChart class="analytics-chart" :option="barOption(analytics.production?.teamDistribution ?? [], '班组分布')" autoresize />
              </section>
            </div>
            <div class="analytics-list mt-4">
              <article v-for="plan in analytics.production?.activePlans ?? []" :key="plan.id">
                <strong>{{ plan.productCode }} / {{ plan.productName }}</strong>
                <span>{{ plan.customer }} · {{ plan.executionStatusLabel }} · 完成率 {{ plan.completionRate }}%</span>
              </article>
            </div>
          </PrimeTabPanel>

          <PrimeTabPanel value="quality">
            <div class="analytics-chart-grid">
              <section class="analytics-chart-panel">
                <div class="analytics-panel-title"><LineChart :size="18" />不良率趋势</div>
                <VChart class="analytics-chart" :option="trendOption(analytics.trends?.rows ?? [], 'defectRate', '不良率')" autoresize />
              </section>
              <section class="analytics-chart-panel">
                <div class="analytics-panel-title"><ShieldAlert :size="18" />异常类别排行</div>
                <VChart class="analytics-chart" :option="barOption(analytics.exceptions?.categoryRanking ?? [], '异常类别')" autoresize />
              </section>
            </div>
            <div class="analytics-list mt-4">
              <article v-for="item in analytics.exceptions?.seriousItems ?? []" :key="`${item.title}-${item.productCode}`">
                <strong>{{ item.title }}</strong>
                <span>{{ item.productCode }} · {{ item.severity }} · {{ item.action }}</span>
              </article>
            </div>
          </PrimeTabPanel>

          <PrimeTabPanel value="documents">
            <div class="analytics-chart-grid">
              <section class="analytics-chart-panel">
                <div class="analytics-panel-title"><BarChart3 :size="18" />资料问题排行</div>
                <VChart class="analytics-chart" :option="barOption((analytics.documents?.issueRanking ?? []).map((item) => ({ name: item.productCode ?? item.category ?? '未分类', value: item.count })), '资料问题')" autoresize />
              </section>
              <section class="analytics-summary-panel">
                <div>资料总数 <strong>{{ analytics.documents?.summary.total ?? 0 }}</strong></div>
                <div>当前有效 <strong>{{ analytics.documents?.summary.effective ?? 0 }}</strong></div>
                <div>待复核 <strong>{{ analytics.documents?.summary.pendingReview ?? 0 }}</strong></div>
                <div>已失效 <strong>{{ analytics.documents?.summary.expired ?? 0 }}</strong></div>
                <div>文件缺失 <strong>{{ analytics.documents?.summary.missingFile ?? 0 }}</strong></div>
              </section>
            </div>
            <div class="analytics-ranking mt-4">
              <article v-for="item in rankingSource('document')" :key="`doc-${item.rank}`">
                <b>{{ item.rank }}</b>
                <div><strong>{{ item.productCode }} {{ item.productName }}</strong><span>{{ item.customer }} · {{ item.action }}</span></div>
                <em>{{ item.count }}</em>
              </article>
            </div>
          </PrimeTabPanel>

          <PrimeTabPanel value="knowledge">
            <div class="analytics-chart-grid">
              <section class="analytics-chart-panel">
                <div class="analytics-panel-title"><Gauge :size="18" />治具状态分布</div>
                <VChart class="analytics-chart" :option="pieOption(analytics.knowledge?.fixtureStatus ?? [], '治具状态')" autoresize />
              </section>
              <section class="analytics-chart-panel">
                <div class="analytics-panel-title"><ShieldAlert :size="18" />异常严重度</div>
                <VChart class="analytics-chart" :option="barOption(analytics.knowledge?.abnormalSeverity ?? [], '异常严重度')" autoresize />
              </section>
            </div>
            <div class="analytics-list mt-4">
              <article v-for="item in analytics.knowledge?.pendingReviewItems ?? []" :key="`${item.type}-${item.title}`">
                <strong>{{ item.type }} / {{ item.title }}</strong>
                <span>{{ item.productCode }} · {{ item.action }}</span>
              </article>
            </div>
          </PrimeTabPanel>

          <PrimeTabPanel value="ranking">
            <div class="analytics-chart-grid">
              <section class="analytics-chart-panel">
                <div class="analytics-panel-title"><LineChart :size="18" />异常次数趋势</div>
                <VChart class="analytics-chart" :option="trendOption(analytics.trends?.rows ?? [], 'exceptionCount', '异常次数')" autoresize />
              </section>
              <section class="analytics-ranking">
                <article v-for="item in rankingSource('risk')" :key="`risk-${item.rank}`">
                  <b>{{ item.rank }}</b>
                  <div><strong>{{ item.category }}</strong><span>{{ item.action }}</span></div>
                  <em>{{ item.count }}</em>
                </article>
              </section>
            </div>
            <pre v-if="analytics.summaryText" class="analytics-summary-text">{{ analytics.summaryText }}</pre>
          </PrimeTabPanel>
        </PrimeTabPanels>
      </PrimeTabs>
    </div>
  </PrimeDialog>
</template>

<style scoped>
.analytics-dialog {
  width: min(1180px, 96vw);
}

.analytics-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  border: 1px solid rgba(139, 90, 42, 0.18);
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(255, 248, 233, 0.96), rgba(255, 225, 178, 0.9));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 16px 38px rgba(109, 64, 24, 0.16);
  padding: 18px;
}

.analytics-hero h2 {
  color: #342316;
  font-size: 28px;
  font-weight: 950;
  line-height: 1.1;
}

.analytics-hero p {
  margin-top: 6px;
  color: #76512a;
  font-weight: 800;
}

.analytics-metric-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.analytics-metric {
  min-height: 112px;
  border: 1px solid rgba(139, 90, 42, 0.18);
  border-radius: 18px;
  background: #fff7e8;
  box-shadow: 0 13px 28px rgba(92, 55, 21, 0.12), inset 0 1px 0 rgba(255,255,255,0.85);
  padding: 14px;
}

.analytics-metric span,
.analytics-metric em {
  display: block;
  color: #76512a;
  font-size: 12px;
  font-style: normal;
  font-weight: 900;
}

.analytics-metric strong {
  display: block;
  margin: 6px 0;
  color: #342316;
  font-size: 30px;
  font-weight: 950;
  line-height: 1;
}

.analytics-metric small {
  margin-left: 3px;
  font-size: 13px;
}

.analytics-metric.tone-red {
  background: #fff0e8;
  border-color: rgba(207, 75, 50, 0.28);
}

.analytics-metric.tone-green {
  background: #eff8e9;
  border-color: rgba(63, 143, 97, 0.24);
}

.analytics-chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.analytics-chart-panel,
.analytics-summary-panel,
.analytics-ranking,
.analytics-list {
  border: 1px solid rgba(139, 90, 42, 0.18);
  border-radius: 20px;
  background: rgba(255, 248, 233, 0.82);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.75);
  padding: 14px;
}

.analytics-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #342316;
  font-size: 15px;
  font-weight: 950;
}

.analytics-chart {
  height: 300px;
  width: 100%;
}

.analytics-summary-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-content: start;
}

.analytics-summary-panel div {
  border-radius: 14px;
  background: rgba(255,255,255,0.62);
  padding: 13px;
  color: #76512a;
  font-weight: 900;
}

.analytics-summary-panel strong {
  display: block;
  color: #342316;
  font-size: 28px;
  font-weight: 950;
}

.analytics-ranking,
.analytics-list {
  display: grid;
  gap: 10px;
  max-height: 330px;
  overflow: auto;
}

.analytics-ranking article,
.analytics-list article {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  border-radius: 14px;
  background: rgba(255,255,255,0.66);
  padding: 11px;
}

.analytics-list article {
  grid-template-columns: minmax(0, 1fr);
}

.analytics-ranking b {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: #b45f22;
  color: white;
}

.analytics-ranking strong,
.analytics-list strong {
  color: #342316;
  font-weight: 950;
}

.analytics-ranking span,
.analytics-list span {
  display: block;
  color: #76512a;
  font-size: 12px;
  font-weight: 850;
}

.analytics-ranking em {
  color: #cf4b32;
  font-size: 20px;
  font-style: normal;
  font-weight: 950;
}

.analytics-summary-text {
  margin-top: 14px;
  max-height: 220px;
  overflow: auto;
  white-space: pre-wrap;
  border-radius: 18px;
  background: #fff7e8;
  padding: 14px;
  color: #342316;
  font-weight: 850;
}

@media (max-width: 1180px) {
  .analytics-metric-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .analytics-hero,
  .analytics-chart-grid {
    grid-template-columns: 1fr;
  }
}
</style>
