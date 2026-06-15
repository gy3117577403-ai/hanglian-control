<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { Settings, SlidersHorizontal } from 'lucide-vue-next'
import { PERMISSIONS } from '@/lib/permissions'
import { useAuthStore } from '@/stores/auth-store'
import { useSettingsStore } from '@/stores/settings-store'
import type { AnnouncementRecord, DictionaryGroup, DisplaySettings, StationProfile, SystemSettings } from '@/types/production'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()
const settings = useSettingsStore()
const auth = useAuthStore()
const activeTab = ref('overview')
const selectedDictionary = ref('')

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const systemForm = reactive<Partial<SystemSettings>>({})
const displayForm = reactive<Partial<DisplaySettings>>({})
const stationForm = reactive<Partial<StationProfile>>({
  processSegment: 'common',
  defaultRole: 'front_leader',
  defaultTeam: 'A 班',
  defaultPlanScope: 'today',
  defaultTabs: ['plans', 'documents'],
  enabledQuickActions: ['feedback'],
  showKnowledgePanel: true,
  showExecutionPanel: true,
  showAnalyticsPanel: false,
  fieldModeDefault: true,
})
const announcementForm = reactive<Partial<AnnouncementRecord>>({
  type: 'notice',
  severity: 'info',
  active: true,
  pinned: false,
})

const canUpdate = computed(() => auth.hasPermission(PERMISSIONS.SETTINGS_UPDATE))
const canDictionaryUpdate = computed(() => auth.hasPermission(PERMISSIONS.SETTINGS_DICTIONARY_UPDATE))
const canStationUpdate = computed(() => auth.hasPermission(PERMISSIONS.SETTINGS_STATION_UPDATE))
const canDisplayUpdate = computed(() => auth.hasPermission(PERMISSIONS.SETTINGS_DISPLAY_UPDATE))
const canAnnouncementUpdate = computed(() => auth.hasPermission(PERMISSIONS.SETTINGS_ANNOUNCEMENT_UPDATE))
const canResolveFeedback = computed(() => auth.hasPermission(PERMISSIONS.SETTINGS_FEEDBACK_RESOLVE))
const canRunPilotCheck = computed(() => auth.hasPermission(PERMISSIONS.SETTINGS_PILOT_CHECK_RUN))

const selectedGroup = computed(() => settings.dictionaries.find((group) => group.groupKey === selectedDictionary.value) ?? settings.dictionaries[0])
const summaryTiles = computed(() => [
  { label: '版本', value: settings.summary?.version ?? 'V3.1' },
  { label: '工位配置', value: settings.summary?.stationProfiles ?? settings.stationProfiles.length },
  { label: '字典组', value: settings.summary?.dictionaryGroups ?? settings.dictionaries.length },
  { label: '有效公告', value: settings.summary?.announcements ?? settings.activeAnnouncements.length },
  { label: '待处理反馈', value: settings.summary?.openFeedback ?? settings.feedbackRecords.filter((item) => item.status === 'open').length },
])

const scopeOptions = [{ label: '今日计划', value: 'today' }, { label: '本周计划', value: 'week' }]
const roleOptions = [
  { label: '前段组长', value: 'front_leader' },
  { label: '后段组长', value: 'back_leader' },
  { label: '资料维护', value: 'maintainer' },
  { label: '工艺', value: 'process_engineer' },
  { label: '品质', value: 'quality' },
  { label: '管理员', value: 'admin' },
]
const processOptions = [{ label: '前段', value: 'front' }, { label: '后段', value: 'back' }, { label: '通用', value: 'common' }]
const fontOptions = [{ label: '标准', value: 'normal' }, { label: '大字', value: 'large' }, { label: '超大字', value: 'extra_large' }]
const densityOptions = [{ label: '标准', value: 'normal' }, { label: '舒展', value: 'comfortable' }]
const severity = (status: string) => ['active', 'pass', 'resolved'].includes(status) ? 'success' : ['inactive', 'ignored'].includes(status) ? 'secondary' : status === 'fail' ? 'danger' : 'warn'

function copyForms() {
  Object.assign(systemForm, settings.systemSettings ?? {})
  Object.assign(displayForm, settings.displaySettings ?? {})
  if (!selectedDictionary.value && settings.dictionaries[0]) selectedDictionary.value = settings.dictionaries[0].groupKey
}

async function loadAll() {
  await settings.initialize()
  copyForms()
}

async function saveSystem() {
  await settings.saveSystemSettings(systemForm)
  copyForms()
}

async function saveDisplay() {
  await settings.saveDisplaySettings(displayForm)
  copyForms()
}

async function saveDictionary(group?: DictionaryGroup) {
  if (!group) return
  await settings.saveDictionary(group.groupKey, group.items)
}

async function saveStation() {
  await settings.saveStationProfile(stationForm)
  Object.assign(stationForm, { stationId: undefined, stationName: '', stationCode: '', remark: '' })
}

function editStation(row: StationProfile) {
  Object.assign(stationForm, row)
  activeTab.value = 'stations'
}

async function saveAnnouncement() {
  await settings.saveAnnouncement(announcementForm)
  Object.assign(announcementForm, { id: undefined, title: '', content: '', type: 'notice', severity: 'info', active: true, pinned: false })
}

function editAnnouncement(row: AnnouncementRecord) {
  Object.assign(announcementForm, row)
  activeTab.value = 'announcements'
}

watch(dialogVisible, (visible) => {
  if (visible) void loadAll()
}, { immediate: true })
</script>

<template>
  <PrimeDialog v-model:visible="dialogVisible" modal header="系统配置中心" class="w-[1180px]">
    <div class="max-h-[76vh] overflow-auto pr-1">
      <section class="mb-4 rounded-[26px] border border-[#edc07d] bg-[#fff8ea] p-4 shadow-[0_18px_42px_rgba(91,55,20,0.14)]">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="grid h-14 w-14 place-items-center rounded-2xl bg-[#d8732a] text-white">
              <Settings :size="28" />
            </div>
            <div>
              <p class="section-kicker">V3.1 FIELD PILOT CONFIG</p>
              <h3 class="text-2xl font-black text-[#342316]">现场试运行配置版</h3>
              <p class="text-sm font-bold text-[#76512a]">Mock / 本地 metadata，不接 Sealos，不接企业微信微盘，不接真实语音。</p>
            </div>
          </div>
          <PrimeTag severity="warn" value="非生产正式版" />
        </div>
      </section>

      <PrimeTabs v-model:value="activeTab">
        <PrimeTabList class="maintenance-tab-list">
          <PrimeTab value="overview">概览</PrimeTab>
          <PrimeTab value="system">基础配置</PrimeTab>
          <PrimeTab value="dictionaries">字典配置</PrimeTab>
          <PrimeTab value="stations">工位配置</PrimeTab>
          <PrimeTab value="display">显示配置</PrimeTab>
          <PrimeTab value="announcements">公告通知</PrimeTab>
          <PrimeTab value="feedback">使用反馈</PrimeTab>
          <PrimeTab value="pilot">试运行检查</PrimeTab>
          <PrimeTab value="history">配置历史</PrimeTab>
        </PrimeTabList>
        <PrimeTabPanels>
          <PrimeTabPanel value="overview">
            <div class="grid grid-cols-5 gap-3">
              <article v-for="tile in summaryTiles" :key="tile.label" class="metric-tile-3d">
                <p class="metric-label">{{ tile.label }}</p>
                <p class="metric-value">{{ tile.value }}</p>
              </article>
            </div>
            <PrimeMessage class="mt-4" severity="warn" :closable="false">当前暂停 Sealos 数据库线，V3.1 聚焦现场试运行配置和软件反馈闭环。</PrimeMessage>
          </PrimeTabPanel>

          <PrimeTabPanel value="system">
            <div class="grid grid-cols-2 gap-4">
              <label class="grid gap-1 text-sm font-black text-[#76512a]">系统名称<PrimeInputText v-model="systemForm.systemName" /></label>
              <label class="grid gap-1 text-sm font-black text-[#76512a]">车间名称<PrimeInputText v-model="systemForm.workshopName" /></label>
              <label class="grid gap-1 text-sm font-black text-[#76512a]">默认班组<PrimeInputText v-model="systemForm.defaultTeam" /></label>
              <label class="grid gap-1 text-sm font-black text-[#76512a]">默认角色<PrimeSelect v-model="systemForm.defaultRole" :options="roleOptions" option-label="label" option-value="value" /></label>
              <label class="grid gap-1 text-sm font-black text-[#76512a]">默认计划范围<PrimeSelect v-model="systemForm.defaultPlanScope" :options="scopeOptions" option-label="label" option-value="value" /></label>
              <label class="grid gap-1 text-sm font-black text-[#76512a]">备注<PrimeInputText v-model="systemForm.remark" /></label>
            </div>
            <div class="mt-4 grid grid-cols-3 gap-3 text-sm font-black text-[#50331b]">
              <label><input v-model="systemForm.allowWarningStart" type="checkbox"> 允许带提醒开工</label>
              <label><input v-model="systemForm.enableFieldMode" type="checkbox"> 启用现场模式</label>
              <label><input v-model="systemForm.enableDemoTools" type="checkbox"> 启用演示工具</label>
            </div>
            <PrimeButton class="mt-4" label="保存基础配置" :disabled="!canUpdate" :loading="settings.saving" @click="saveSystem" />
          </PrimeTabPanel>

          <PrimeTabPanel value="dictionaries">
            <div class="grid grid-cols-[260px_minmax(0,1fr)] gap-4">
              <div class="grid gap-2">
                <button v-for="group in settings.dictionaries" :key="group.groupKey" type="button" class="rounded-2xl border border-[#e7c99d] bg-[#fff8ea] p-3 text-left font-black text-[#50331b]" @click="selectedDictionary = group.groupKey">
                  {{ group.groupName }}<p class="text-xs text-[#8a6338]">{{ group.items.length }} 项</p>
                </button>
              </div>
              <section v-if="selectedGroup" class="section-bay">
                <div class="flex items-center justify-between">
                  <div><p class="section-kicker">{{ selectedGroup.groupKey }}</p><h3 class="text-xl font-black text-[#342316]">{{ selectedGroup.groupName }}</h3></div>
                  <PrimeButton size="small" label="保存字典" :disabled="!canDictionaryUpdate" @click="saveDictionary(selectedGroup)" />
                </div>
                <div class="mt-3 grid gap-2">
                  <div v-for="item in selectedGroup.items" :key="item.key" class="grid grid-cols-[1fr_1fr_90px_90px] items-center gap-2 rounded-2xl bg-[#fff8ea] p-2">
                    <PrimeInputText v-model="item.key" disabled />
                    <PrimeInputText v-model="item.label" :disabled="!canDictionaryUpdate" />
                    <label class="text-sm font-bold"><input v-model="item.enabled" type="checkbox" :disabled="!canDictionaryUpdate"> 启用</label>
                    <PrimeTag :severity="item.required ? 'warn' : 'secondary'" :value="item.required ? '必需' : '可选'" />
                  </div>
                </div>
              </section>
            </div>
          </PrimeTabPanel>

          <PrimeTabPanel value="stations">
            <div class="grid grid-cols-[360px_minmax(0,1fr)] gap-4">
              <section class="section-bay">
                <p class="section-kicker">STATION PROFILE</p>
                <div class="grid gap-2">
                  <PrimeInputText v-model="stationForm.stationName" placeholder="工位名称" />
                  <PrimeInputText v-model="stationForm.stationCode" placeholder="工位编码" />
                  <PrimeSelect v-model="stationForm.processSegment" :options="processOptions" option-label="label" option-value="value" />
                  <PrimeSelect v-model="stationForm.defaultRole" :options="roleOptions" option-label="label" option-value="value" />
                  <PrimeInputText v-model="stationForm.defaultTeam" placeholder="默认班组" />
                  <PrimeSelect v-model="stationForm.defaultPlanScope" :options="scopeOptions" option-label="label" option-value="value" />
                  <PrimeInputText v-model="stationForm.remark" placeholder="说明" />
                </div>
                <div class="mt-3 grid gap-1 text-sm font-bold text-[#50331b]">
                  <label><input v-model="stationForm.showKnowledgePanel" type="checkbox"> 显示知识库</label>
                  <label><input v-model="stationForm.showExecutionPanel" type="checkbox"> 显示执行闭环</label>
                  <label><input v-model="stationForm.showAnalyticsPanel" type="checkbox"> 显示统计看板</label>
                  <label><input v-model="stationForm.fieldModeDefault" type="checkbox"> 默认现场模式</label>
                </div>
                <PrimeButton class="mt-3" label="保存工位" :disabled="!canStationUpdate" @click="saveStation" />
              </section>
              <PrimeDataTable :value="settings.stationProfiles" striped-rows scrollable scroll-height="430px">
                <PrimeColumn field="stationName" header="工位" />
                <PrimeColumn field="stationCode" header="编码" />
                <PrimeColumn field="defaultRole" header="角色" />
                <PrimeColumn field="defaultTeam" header="班组" />
                <PrimeColumn header="状态"><template #body="{ data }"><PrimeTag :severity="severity(data.status)" :value="data.status" /></template></PrimeColumn>
                <PrimeColumn header="操作"><template #body="{ data }"><PrimeButton size="small" label="编辑" :disabled="!canStationUpdate" @click="editStation(data)" /></template></PrimeColumn>
              </PrimeDataTable>
            </div>
          </PrimeTabPanel>

          <PrimeTabPanel value="display">
            <div class="grid grid-cols-2 gap-4">
              <label class="grid gap-1 text-sm font-black text-[#76512a]">字体大小<PrimeSelect v-model="displayForm.fontScale" :options="fontOptions" option-label="label" option-value="value" /></label>
              <label class="grid gap-1 text-sm font-black text-[#76512a]">卡片密度<PrimeSelect v-model="displayForm.cardDensity" :options="densityOptions" option-label="label" option-value="value" /></label>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-3 text-sm font-black text-[#50331b]">
              <label><input v-model="displayForm.defaultFieldMode" type="checkbox"> 默认现场模式</label>
              <label><input v-model="displayForm.showDemoBadges" type="checkbox"> 显示 Mock 标签</label>
              <label><input v-model="displayForm.showTechnicalWarnings" type="checkbox"> 显示技术提醒</label>
              <label><input v-model="displayForm.enableWarmAnimations" type="checkbox"> 暖色动效</label>
            </div>
            <PrimeButton class="mt-4" label="保存显示配置" :disabled="!canDisplayUpdate" @click="saveDisplay" />
          </PrimeTabPanel>

          <PrimeTabPanel value="announcements">
            <div class="grid grid-cols-[360px_minmax(0,1fr)] gap-4">
              <section class="section-bay">
                <p class="section-kicker">ANNOUNCEMENT</p>
                <div class="grid gap-2">
                  <PrimeInputText v-model="announcementForm.title" placeholder="公告标题" />
                  <PrimeTextarea v-model="announcementForm.content" rows="4" placeholder="公告内容" />
                  <PrimeSelect v-model="announcementForm.severity" :options="[{label:'普通',value:'info'},{label:'提醒',value:'warning'},{label:'关键',value:'critical'}]" option-label="label" option-value="value" />
                  <label class="font-bold"><input v-model="announcementForm.active" type="checkbox"> 有效</label>
                  <label class="font-bold"><input v-model="announcementForm.pinned" type="checkbox"> 置顶</label>
                </div>
                <PrimeButton class="mt-3" label="保存公告" :disabled="!canAnnouncementUpdate" @click="saveAnnouncement" />
              </section>
              <PrimeDataTable :value="settings.announcements" striped-rows scrollable scroll-height="430px">
                <PrimeColumn field="title" header="标题" />
                <PrimeColumn field="type" header="类型" />
                <PrimeColumn header="状态"><template #body="{ data }"><PrimeTag :severity="data.active ? 'success' : 'secondary'" :value="data.active ? '有效' : '关闭'" /></template></PrimeColumn>
                <PrimeColumn header="操作"><template #body="{ data }"><PrimeButton size="small" label="编辑" :disabled="!canAnnouncementUpdate" @click="editAnnouncement(data)" /></template></PrimeColumn>
              </PrimeDataTable>
            </div>
          </PrimeTabPanel>

          <PrimeTabPanel value="feedback">
            <PrimeDataTable :value="settings.feedbackRecords" striped-rows scrollable scroll-height="500px">
              <PrimeColumn field="title" header="标题" />
              <PrimeColumn field="feedbackType" header="类型" />
              <PrimeColumn field="userName" header="提交人" />
              <PrimeColumn header="状态"><template #body="{ data }"><PrimeTag :severity="severity(data.status)" :value="data.status" /></template></PrimeColumn>
              <PrimeColumn header="处理"><template #body="{ data }"><PrimeButton size="small" label="标记已解决" :disabled="!canResolveFeedback" @click="settings.updateFeedbackStatus(data.id, 'resolved')" /></template></PrimeColumn>
            </PrimeDataTable>
          </PrimeTabPanel>

          <PrimeTabPanel value="pilot">
            <section class="section-bay">
              <div class="flex items-center justify-between">
                <div><p class="section-kicker">PILOT CHECK</p><h3 class="text-2xl font-black text-[#342316]">{{ settings.pilotCheck?.score ?? '--' }} 分</h3><p class="font-bold text-[#76512a]">{{ settings.pilotCheck?.summary }}</p></div>
                <PrimeButton label="运行检查" :disabled="!canRunPilotCheck" @click="settings.runPilotCheck" />
              </div>
            </section>
            <div class="mt-3 grid grid-cols-2 gap-3">
              <article v-for="item in settings.pilotCheck?.items ?? []" :key="item.key" class="rounded-2xl border border-[#ead0a8] bg-[#fffaf0] p-3">
                <div class="flex justify-between gap-3"><strong>{{ item.label }}</strong><PrimeTag :severity="severity(item.status)" :value="item.status" /></div>
                <p class="mt-1 text-sm font-bold text-[#50331b]">{{ item.message }}</p>
              </article>
            </div>
          </PrimeTabPanel>

          <PrimeTabPanel value="history">
            <PrimeDataTable :value="settings.settingsHistory" striped-rows scrollable scroll-height="500px">
              <PrimeColumn header="时间"><template #body="{ data }">{{ dayjs(data.createdAt).format('MM-DD HH:mm') }}</template></PrimeColumn>
              <PrimeColumn field="entityType" header="对象" />
              <PrimeColumn field="action" header="动作" />
              <PrimeColumn field="operatorName" header="操作人" />
            </PrimeDataTable>
          </PrimeTabPanel>
        </PrimeTabPanels>
      </PrimeTabs>
    </div>

    <template #footer>
      <PrimeButton severity="secondary" label="刷新" :loading="settings.loading" @click="loadAll">
        <template #icon><SlidersHorizontal :size="17" /></template>
      </PrimeButton>
      <PrimeButton label="关闭" @click="dialogVisible = false" />
    </template>
  </PrimeDialog>
</template>
