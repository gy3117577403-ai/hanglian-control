import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { toast } from 'vue-sonner'
import {
  createAnnouncement,
  createStationProfile,
  createSystemFeedback,
  getAnnouncements,
  getDictionaries,
  getDisplaySettings,
  getPilotCheck,
  getSettingsHistory,
  getSettingsSummary,
  getStationProfiles,
  getSystemFeedback,
  getSystemSettings,
  runPilotCheck as runPilotCheckApi,
  updateAnnouncement,
  updateAnnouncementStatus,
  updateDictionary,
  updateDisplaySettings,
  updateStationProfile,
  updateStationProfileStatus,
  updateSystemFeedbackStatus,
  updateSystemSettings,
} from '@/services/api'
import type {
  AnnouncementRecord,
  DictionaryGroup,
  DisplaySettings,
  PilotCheckResult,
  SettingsRecord,
  SettingsSummary,
  StationProfile,
  SystemFeedbackRecord,
  SystemSettings,
} from '@/types/production'

export const useSettingsStore = defineStore('settings', () => {
  const summary = ref<SettingsSummary | null>(null)
  const systemSettings = ref<SystemSettings | null>(null)
  const dictionaries = ref<DictionaryGroup[]>([])
  const stationProfiles = ref<StationProfile[]>([])
  const displaySettings = ref<DisplaySettings | null>(null)
  const announcements = ref<AnnouncementRecord[]>([])
  const feedbackRecords = ref<SystemFeedbackRecord[]>([])
  const pilotCheck = ref<PilotCheckResult | null>(null)
  const settingsHistory = ref<SettingsRecord[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const errorMessage = ref('')

  const activeAnnouncements = computed(() => announcements.value.filter((item) => item.active))
  const activeStationProfile = computed(() => stationProfiles.value.find((item) => item.status === 'active') ?? stationProfiles.value[0])

  async function guard<T>(task: () => Promise<T>, fallback: T): Promise<T> {
    try {
      errorMessage.value = ''
      return await task()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '系统配置接口暂不可用'
      return fallback
    }
  }

  async function loadSummary() {
    summary.value = await guard(() => getSettingsSummary(), summary.value as SettingsSummary)
    return summary.value
  }

  async function loadSystemSettings() {
    systemSettings.value = await guard(() => getSystemSettings(), systemSettings.value as SystemSettings)
    return systemSettings.value
  }

  async function saveSystemSettings(payload: Partial<SystemSettings>) {
    saving.value = true
    try {
      systemSettings.value = await updateSystemSettings(payload)
      await loadSummary()
      toast.success('系统配置已保存')
      return systemSettings.value
    } finally {
      saving.value = false
    }
  }

  async function loadDictionaries() {
    dictionaries.value = await guard(() => getDictionaries(), dictionaries.value)
    return dictionaries.value
  }

  async function saveDictionary(groupKey: string, items: DictionaryGroup['items']) {
    saving.value = true
    try {
      const updated = await updateDictionary(groupKey, { items })
      const index = dictionaries.value.findIndex((group) => group.groupKey === groupKey)
      if (index >= 0) dictionaries.value[index] = updated
      toast.success('字典配置已保存')
      return updated
    } finally {
      saving.value = false
    }
  }

  async function loadStationProfiles() {
    stationProfiles.value = await guard(() => getStationProfiles(), stationProfiles.value)
    return stationProfiles.value
  }

  async function saveStationProfile(payload: Partial<StationProfile>) {
    saving.value = true
    try {
      const saved = payload.stationId
        ? await updateStationProfile(payload.stationId, payload)
        : await createStationProfile(payload)
      await loadStationProfiles()
      toast.success('工位配置已保存')
      return saved
    } finally {
      saving.value = false
    }
  }

  async function setStationStatus(id: string, status: StationProfile['status']) {
    const saved = await updateStationProfileStatus(id, { status })
    await loadStationProfiles()
    return saved
  }

  async function loadDisplaySettings() {
    displaySettings.value = await guard(() => getDisplaySettings(), displaySettings.value as DisplaySettings)
    return displaySettings.value
  }

  async function saveDisplaySettings(payload: Partial<DisplaySettings>) {
    saving.value = true
    try {
      displaySettings.value = await updateDisplaySettings(payload)
      toast.success('显示配置已保存')
      return displaySettings.value
    } finally {
      saving.value = false
    }
  }

  async function loadAnnouncements() {
    announcements.value = await guard(() => getAnnouncements(), announcements.value)
    return announcements.value
  }

  async function saveAnnouncement(payload: Partial<AnnouncementRecord>) {
    saving.value = true
    try {
      const saved = payload.id
        ? await updateAnnouncement(payload.id, payload)
        : await createAnnouncement(payload)
      await loadAnnouncements()
      toast.success('公告通知已保存')
      return saved
    } finally {
      saving.value = false
    }
  }

  async function setAnnouncementActive(id: string, active: boolean) {
    const saved = await updateAnnouncementStatus(id, { active })
    await loadAnnouncements()
    return saved
  }

  async function loadFeedback(query?: Record<string, string | undefined>) {
    feedbackRecords.value = await guard(() => getSystemFeedback(query), feedbackRecords.value)
    return feedbackRecords.value
  }

  async function submitFeedback(payload: Partial<SystemFeedbackRecord>) {
    saving.value = true
    try {
      const saved = await createSystemFeedback(payload)
      await loadFeedback()
      await loadSummary()
      toast.success('使用反馈已提交')
      return saved
    } finally {
      saving.value = false
    }
  }

  async function updateFeedbackStatus(id: string, status: SystemFeedbackRecord['status']) {
    const saved = await updateSystemFeedbackStatus(id, { status })
    await loadFeedback()
    await loadSummary()
    return saved
  }

  async function loadPilotCheck() {
    pilotCheck.value = await guard(() => getPilotCheck(), pilotCheck.value as PilotCheckResult)
    return pilotCheck.value
  }

  async function runPilotCheck() {
    saving.value = true
    try {
      pilotCheck.value = await runPilotCheckApi()
      await loadHistory()
      toast.success('试运行检查已完成', { description: `得分 ${pilotCheck.value.score}` })
      return pilotCheck.value
    } finally {
      saving.value = false
    }
  }

  async function loadHistory(query?: Record<string, string | number | undefined>) {
    settingsHistory.value = await guard(() => getSettingsHistory(query), settingsHistory.value)
    return settingsHistory.value
  }

  async function initialize() {
    loading.value = true
    try {
      await Promise.all([
        loadSummary(),
        loadSystemSettings(),
        loadDictionaries(),
        loadStationProfiles(),
        loadDisplaySettings(),
        loadAnnouncements(),
        loadFeedback(),
        loadPilotCheck(),
        loadHistory(),
      ])
    } finally {
      loading.value = false
    }
  }

  return {
    summary,
    systemSettings,
    dictionaries,
    stationProfiles,
    displaySettings,
    announcements,
    feedbackRecords,
    pilotCheck,
    settingsHistory,
    loading,
    saving,
    errorMessage,
    activeAnnouncements,
    activeStationProfile,
    loadSummary,
    loadSystemSettings,
    saveSystemSettings,
    loadDictionaries,
    saveDictionary,
    loadStationProfiles,
    saveStationProfile,
    setStationStatus,
    loadDisplaySettings,
    saveDisplaySettings,
    loadAnnouncements,
    saveAnnouncement,
    setAnnouncementActive,
    loadFeedback,
    submitFeedback,
    updateFeedbackStatus,
    loadPilotCheck,
    runPilotCheck,
    loadHistory,
    initialize,
  }
})
