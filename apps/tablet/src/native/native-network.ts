import { reactive } from 'vue'
import { Network, type ConnectionStatus, type ConnectionType } from '@capacitor/network'
import { isNativeApp } from './native-platform'

type Removable = {
  remove: () => Promise<void> | void
}

export const nativeNetworkState = reactive({
  initialized: false,
  connected: true,
  connectionType: 'unknown',
  message: '',
  restoredAt: 0,
})

let cleanupNetworkListener: (() => void) | null = null
let restoredTimer: number | undefined

function setRestoredMessage() {
  nativeNetworkState.message = '网络已恢复。'
  nativeNetworkState.restoredAt = Date.now()
  if (restoredTimer) window.clearTimeout(restoredTimer)
  restoredTimer = window.setTimeout(() => {
    if (nativeNetworkState.connected) nativeNetworkState.message = ''
  }, 2600)
}

function applyStatus(status: Pick<ConnectionStatus, 'connected' | 'connectionType'>) {
  const wasConnected = nativeNetworkState.connected
  nativeNetworkState.connected = status.connected
  nativeNetworkState.connectionType = status.connectionType

  if (!status.connected) {
    nativeNetworkState.message = '网络已断开，部分资料暂时无法加载。'
    return
  }

  if (!wasConnected) setRestoredMessage()
  else if (!nativeNetworkState.message) nativeNetworkState.message = ''
}

function browserStatus() {
  return {
    connected: typeof navigator === 'undefined' ? true : navigator.onLine,
    connectionType: 'unknown' as ConnectionType,
  }
}

export async function refreshNativeNetworkStatus() {
  if (isNativeApp()) {
    try {
      applyStatus(await Network.getStatus())
      return nativeNetworkState
    } catch {
      applyStatus(browserStatus())
      return nativeNetworkState
    }
  }

  applyStatus(browserStatus())
  return nativeNetworkState
}

export async function initializeNativeNetwork() {
  if (cleanupNetworkListener) return cleanupNetworkListener

  nativeNetworkState.initialized = true
  await refreshNativeNetworkStatus()

  if (isNativeApp()) {
    const handle: Removable = await Network.addListener('networkStatusChange', (status) => {
      applyStatus(status)
    })
    cleanupNetworkListener = () => {
      void handle.remove()
      cleanupNetworkListener = null
    }
    return cleanupNetworkListener
  }

  const updateFromBrowser = () => {
    applyStatus(browserStatus())
  }
  window.addEventListener('online', updateFromBrowser)
  window.addEventListener('offline', updateFromBrowser)
  cleanupNetworkListener = () => {
    window.removeEventListener('online', updateFromBrowser)
    window.removeEventListener('offline', updateFromBrowser)
    cleanupNetworkListener = null
  }
  return cleanupNetworkListener
}
