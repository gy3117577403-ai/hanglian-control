import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEYS = {
  fieldMode: 'hanglian.ui.fieldMode',
  compactMode: 'hanglian.ui.compactMode',
  lastActiveTab: 'hanglian.ui.lastActiveTab',
}

function readBool(key: string) {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(key) === 'true'
}

function writeStorage(key: string, value: string) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(key, value)
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

  return {
    fieldMode,
    compactMode,
    lastActiveTab,
    toggleFieldMode,
    setLastActiveTab,
  }
})
