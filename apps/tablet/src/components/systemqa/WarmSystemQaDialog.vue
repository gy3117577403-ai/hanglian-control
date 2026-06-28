<script setup lang="ts">
import { computed, watch } from 'vue'
import { ClipboardCopy, RefreshCw, ShieldCheck } from 'lucide-vue-next'
import { APP_STAGE, APP_VERSION } from '@/config/app-version'
import { useSystemQaStore } from '@/stores/system-qa-store'
import type { SystemQaCheckItem, SystemQaListReport, SystemQaStatus } from '@/types/production'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()

const qa = useSystemQaStore()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const metricCards = computed(() => [
  { label: '通过项', value: qa.overview?.summary.pass ?? 0, tone: 'success' },
  { label: '提醒项', value: qa.overview?.summary.warning ?? 0, tone: 'warn' },
  { label: '失败项', value: qa.overview?.summary.fail ?? 0, tone: 'danger' },
  { label: '一致性分', value: qa.dataConsistency?.score ?? 0, tone: (qa.dataConsistency?.score ?? 0) >= 90 ? 'success' : 'warn' },
  { label: '链路分', value: qa.businessFlow?.score ?? 0, tone: (qa.businessFlow?.score ?? 0) >= 90 ? 'success' : 'warn' },
  { label: '权限分', value: qa.permissionRegression?.score ?? 0, tone: (qa.permissionRegression?.score ?? 0) >= 90 ? 'success' : 'warn' },
])

function severityFor(status?: SystemQaStatus) {
  if (status === 'pass') return 'success'
  if (status === 'warning') return 'warn'
  return 'danger'
}

function statusText(status?: SystemQaStatus) {
  if (status === 'pass') return '通过'
  if (status === 'warning') return '提醒'
  return '未通过'
}

function moduleSeverity(status?: 'ok' | 'warning' | 'fail') {
  if (status === 'ok') return 'success'
  if (status === 'warning') return 'warn'
  return 'danger'
}

function reportItems(report: SystemQaListReport | null): SystemQaCheckItem[] {
  return report?.items ?? []
}

function refresh() {
  void qa.loadAll()
}

function copyReport() {
  void qa.copyAcceptanceReportText()
}

watch(dialogVisible, (visible) => {
  if (visible) void qa.loadAll()
})
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="全流程总验收" class="system-qa-dialog">
    <div class="grid max-h-[76vh] gap-4 overflow-auto pr-1">
      <section class="analytics-hero">
        <div>
          <p class="section-kicker">V2.7 / FULL REGRESSION QA</p>
          <h2>全流程回归与演示版总验收</h2>
          <p>{{ APP_VERSION }} {{ APP_STAGE }}，只读检查 Mock / 本地 metadata，不连接数据库，不写库。</p>
        </div>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <PrimeButton severity="secondary" :loading="qa.loading" label="重新检查" @click="refresh">
            <template #icon><RefreshCw :size="16" /></template>
          </PrimeButton>
          <PrimeButton label="复制验收报告" @click="copyReport">
            <template #icon><ClipboardCopy :size="16" /></template>
          </PrimeButton>
        </div>
      </section>

      <PrimeMessage v-if="qa.errorMessage" severity="warn" :closable="false">
        {{ qa.errorMessage }}
      </PrimeMessage>

      <div class="analytics-metric-grid">
        <article v-for="card in metricCards" :key="card.label" :class="['analytics-metric', `tone-${card.tone}`]">
          <span>{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
          <em>warning 可见但不等同失败</em>
        </article>
      </div>

      <PrimeTabs v-model:value="qa.activeTab">
        <PrimeTabList class="maintenance-tab-list">
          <PrimeTab value="overview">总览</PrimeTab>
          <PrimeTab value="consistency">数据一致性</PrimeTab>
          <PrimeTab value="business">业务链路</PrimeTab>
          <PrimeTab value="permission">权限回归</PrimeTab>
          <PrimeTab value="readiness">演示准备</PrimeTab>
          <PrimeTab value="report">验收报告</PrimeTab>
        </PrimeTabList>

        <PrimeTabPanels>
          <PrimeTabPanel value="overview">
            <div class="analytics-chart-grid">
              <section class="analytics-summary-panel">
                <div v-for="(status, name) in qa.overview?.modules" :key="name">
                  {{ name }} <PrimeTag :severity="moduleSeverity(status)" :value="status === 'ok' ? 'ok' : status" />
                </div>
              </section>
              <section class="analytics-chart-panel">
                <div class="analytics-panel-title"><ShieldCheck :size="18" />安全边界</div>
                <div class="analytics-list">
                  <article><strong>Mock 数据源</strong><span>当前数据源：{{ qa.overview?.dataSource ?? 'mock' }}</span></article>
                  <article><strong>未接 Sealos</strong><span>databaseConnected = false</span></article>
                  <article><strong>未接企业微信微盘</strong><span>wecomConnected = false</span></article>
                  <article><strong>未接真实语音</strong><span>realVoiceConnected = false</span></article>
                </div>
              </section>
            </div>
          </PrimeTabPanel>

          <PrimeTabPanel value="consistency">
            <div class="analytics-list">
              <article v-for="item in reportItems(qa.dataConsistency)" :key="item.key">
                <PrimeTag :severity="severityFor(item.status)" :value="statusText(item.status)" />
                <strong>{{ item.label }}</strong>
                <span>{{ item.message }}</span>
              </article>
            </div>
          </PrimeTabPanel>

          <PrimeTabPanel value="business">
            <div class="analytics-list">
              <article v-for="item in reportItems(qa.businessFlow)" :key="item.key">
                <PrimeTag :severity="severityFor(item.status)" :value="statusText(item.status)" />
                <strong>{{ item.label }}</strong>
                <span>{{ item.message }}</span>
              </article>
            </div>
          </PrimeTabPanel>

          <PrimeTabPanel value="permission">
            <div class="analytics-list">
              <article v-for="role in qa.permissionRegression?.roles ?? []" :key="role.role">
                <PrimeTag :severity="severityFor(role.status)" :value="statusText(role.status)" />
                <strong>{{ role.roleLabel }}</strong>
                <span>可见菜单 {{ role.visibleMenus.length }} 项，允许操作 {{ role.allowedActions.length }} 项，应禁止 {{ role.shouldBlockActions.length }} 项。</span>
              </article>
            </div>
          </PrimeTabPanel>

          <PrimeTabPanel value="readiness">
            <div class="analytics-list">
              <article v-for="item in reportItems(qa.demoReadiness)" :key="item.key">
                <PrimeTag :severity="severityFor(item.status)" :value="statusText(item.status)" />
                <strong>{{ item.label }}</strong>
                <span>{{ item.message }}</span>
              </article>
            </div>
          </PrimeTabPanel>

          <PrimeTabPanel value="report">
            <div class="analytics-chart-grid">
              <section class="analytics-summary-panel">
                <div v-for="module in qa.acceptanceReport?.completedModules ?? []" :key="module">
                  {{ module }} <PrimeTag severity="success" value="已完成" />
                </div>
              </section>
              <section class="analytics-summary-panel">
                <div v-for="item in qa.acceptanceReport?.notConnected ?? []" :key="item">
                  {{ item }} <PrimeTag severity="warn" value="未接入" />
                </div>
              </section>
            </div>
            <PrimeTextarea
              v-if="qa.acceptanceReportText"
              :model-value="qa.acceptanceReportText"
              class="mt-4 min-h-44 w-full text-sm font-bold"
              readonly
            />
          </PrimeTabPanel>
        </PrimeTabPanels>
      </PrimeTabs>

      <PrimeMessage severity="warn" :closable="false">
        本面板用于 V2.7 演示总验收：warning 必须可见但不等同失败；fail 需要红色处理。不会连接数据库，不会执行写库。
      </PrimeMessage>
    </div>
  </PrimeDialog>
</template>
