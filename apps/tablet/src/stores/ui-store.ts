import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { APP_STAGE, APP_VERSION } from '@/config/app-version'

const STORAGE_KEYS = {
  fieldMode: 'hanglian.ui.fieldMode',
  compactMode: 'hanglian.ui.compactMode',
  lastActiveTab: 'hanglian.ui.lastActiveTab',
}

const DEMO_UI_STORAGE_KEYS = [
  'hanglian.fieldQaChecklist',
  'hanglian.freezeChecklist',
  'hanglian.ui.fieldMode',
  'hanglian.ui.compactMode',
  'hanglian.ui.lastActiveTab',
  'hanglian.scope',
  'hanglian.selectedPlanId',
  'hanglian.activeProcess',
  'hanglian.activeDocumentTab',
  'hanglian.queryLogs',
]

function readBool(key: string) {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(key) === 'true'
}

function writeStorage(key: string, value: string) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(key, value)
}

function removeStorage(key: string) {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(key)
}

export const useUiStore = defineStore('ui', () => {
  const fieldMode = ref(readBool(STORAGE_KEYS.fieldMode))
  const compactMode = ref(readBool(STORAGE_KEYS.compactMode))
  const lastActiveTab = ref(typeof localStorage === 'undefined' ? 'drawing' : localStorage.getItem(STORAGE_KEYS.lastActiveTab) ?? 'drawing')

  watch(fieldMode, (value) => writeStorage(STORAGE_KEYS.fieldMode, String(value)))
  watch(compactMode, (value) => writeStorage(STORAGE_KEYS.compactMode, String(value)))
  watch(lastActiveTab, (value) => writeStorage(STORAGE_KEYS.lastActiveTab, value))

  async function toggleFieldMode() {
    fieldMode.value = !fieldMode.value
    if (fieldMode.value && document.fullscreenEnabled && !document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => undefined)
    }
  }

  function setLastActiveTab(tab: string) {
    lastActiveTab.value = tab
  }

  function resetDemoUiState() {
    DEMO_UI_STORAGE_KEYS.forEach(removeStorage)
    fieldMode.value = false
    compactMode.value = false
    lastActiveTab.value = 'drawing'
  }

  function exportFieldQaResult(items: Array<{ id: string; title: string }>, checkedIds: string[]) {
    const completed = new Set(checkedIds)
    const unfinished = items.filter((item) => !completed.has(item.id)).map((item) => item.title)
    const completedCount = items.length - unfinished.length
    const progress = Math.round((completedCount / Math.max(items.length, 1)) * 100)
    const time = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    return [
      `线束车间生产计划资料管控系统 ${APP_VERSION} ${APP_STAGE} 现场走查结果`,
      `时间：${time}`,
      `已完成：${completedCount} / ${items.length}`,
      `完成率：${progress}%`,
      '未完成项：',
      ...(unfinished.length ? unfinished.map((title) => `- ${title}`) : ['- 无']),
    ].join('\n')
  }

  async function copyFieldQaResult(text: string) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return false
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }

  return {
    fieldMode,
    compactMode,
    lastActiveTab,
    toggleFieldMode,
    setLastActiveTab,
    resetDemoUiState,
    exportFieldQaResult,
    copyFieldQaResult,
  }
})
