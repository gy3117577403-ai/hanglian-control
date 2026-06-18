import {
  LOCAL_API_BASE_URL,
  normalizeApiBaseUrl,
  readPublicRuntimeConfig,
  resolveAutomaticApiBaseUrl,
} from './runtime-config'

export interface ApiHostInfo {
  frontendOrigin: string
  frontendHostname: string
  frontendProtocol: string
  apiBaseUrl: string
  apiSource: ApiBaseSource
  apiLabel: string
  accessMode: 'local' | 'lan'
  mixedContentRisk: boolean
}

export type ApiBaseSource = 'stored-local' | 'stored-cloud' | 'stored-custom' | 'runtime' | 'env' | 'auto-local' | 'auto-lan'
export type ApiRuntimeMode = 'local' | 'cloud' | 'custom'

export interface ApiRuntimeConfig {
  apiBaseUrl: string
  source: ApiBaseSource
  mode: ApiRuntimeMode | 'runtime' | 'env' | 'auto'
  label: string
  canEdit: boolean
}

export { LOCAL_API_BASE_URL }
export const CLOUD_API_BASE_URL = ''

export const API_RUNTIME_MODE_KEY = 'hanglian.tablet.apiRuntimeMode'
export const API_RUNTIME_CUSTOM_URL_KEY = 'hanglian.tablet.customApiBaseUrl'

const localHosts = new Set(['localhost', '127.0.0.1', '::1'])

function readStorage(key: string) {
  if (typeof window === 'undefined') return ''
  try {
    return window.localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function writeStorage(key: string, value: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Ignore storage failures in restricted WebView/PWA contexts.
  }
}

function removeStorage(key: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignore storage failures in restricted WebView/PWA contexts.
  }
}

export function getStoredApiRuntimeMode(): ApiRuntimeMode | '' {
  const mode = readStorage(API_RUNTIME_MODE_KEY)
  return mode === 'local' || mode === 'cloud' || mode === 'custom' ? mode : ''
}

export function getStoredCustomApiBaseUrl() {
  return normalizeApiBaseUrl(readStorage(API_RUNTIME_CUSTOM_URL_KEY))
}

export function isLocalhostAccess(hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost') {
  return localHosts.has(hostname)
}

export function isLanAccess(hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost') {
  return !isLocalhostAccess(hostname)
}

export function getApiRuntimeConfig(): ApiRuntimeConfig {
  const runtimeConfigured = readPublicRuntimeConfig().API_BASE_URL
  if (runtimeConfigured) {
    return {
      apiBaseUrl: runtimeConfigured,
      source: 'runtime',
      mode: 'runtime',
      label: 'Runtime API',
      canEdit: false,
    }
  }

  const envConfigured = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)
  if (envConfigured) {
    return {
      apiBaseUrl: envConfigured,
      source: 'env',
      mode: 'env',
      label: 'Build env API',
      canEdit: false,
    }
  }

  const storedMode = getStoredApiRuntimeMode()
  if (storedMode === 'local') {
    return {
      apiBaseUrl: LOCAL_API_BASE_URL,
      source: 'stored-local',
      mode: 'local',
      label: 'Local API',
      canEdit: true,
    }
  }

  if (storedMode === 'cloud') {
    const cloudUrl = normalizeApiBaseUrl(CLOUD_API_BASE_URL)
    if (cloudUrl) {
      return {
        apiBaseUrl: cloudUrl,
        source: 'stored-cloud',
        mode: 'cloud',
        label: 'Cloud API',
        canEdit: true,
      }
    }
  }

  if (storedMode === 'custom') {
    const customUrl = getStoredCustomApiBaseUrl()
    if (customUrl) {
      return {
        apiBaseUrl: customUrl,
        source: 'stored-custom',
        mode: 'custom',
        label: 'Custom API',
        canEdit: true,
      }
    }
  }

  const autoUrl = normalizeApiBaseUrl(resolveAutomaticApiBaseUrl())
  const source = typeof window !== 'undefined' && isLanAccess(window.location.hostname) ? 'auto-lan' : 'auto-local'
  return {
    apiBaseUrl: autoUrl,
    source,
    mode: 'auto',
    label: source === 'auto-lan' ? 'Auto LAN API' : 'Auto local API',
    canEdit: true,
  }
}

export function getApiBaseUrl() {
  return getApiRuntimeConfig().apiBaseUrl
}

export function saveApiRuntimeMode(mode: ApiRuntimeMode, customUrl?: string) {
  writeStorage(API_RUNTIME_MODE_KEY, mode)
  if (mode === 'custom') {
    writeStorage(API_RUNTIME_CUSTOM_URL_KEY, normalizeApiBaseUrl(customUrl))
  }
  return getApiRuntimeConfig()
}

export function clearApiRuntimeMode() {
  removeStorage(API_RUNTIME_MODE_KEY)
  removeStorage(API_RUNTIME_CUSTOM_URL_KEY)
  return getApiRuntimeConfig()
}

export function getApiHostInfo(): ApiHostInfo {
  const frontendOrigin = typeof window === 'undefined' ? 'http://localhost:5173' : window.location.origin
  const frontendHostname = typeof window === 'undefined' ? 'localhost' : window.location.hostname
  const frontendProtocol = typeof window === 'undefined' ? 'http:' : window.location.protocol
  const runtimeConfig = getApiRuntimeConfig()

  return {
    frontendOrigin,
    frontendHostname,
    frontendProtocol,
    apiBaseUrl: runtimeConfig.apiBaseUrl,
    apiSource: runtimeConfig.source,
    apiLabel: runtimeConfig.label,
    accessMode: isLanAccess(frontendHostname) ? 'lan' : 'local',
    mixedContentRisk: frontendProtocol === 'https:' && runtimeConfig.apiBaseUrl.startsWith('http://'),
  }
}
