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

export const LOCAL_API_BASE_URL = 'http://localhost:3000/api'
export const CLOUD_API_BASE_URL = 'https://fyeboolnlvqv.sealoshzh.site/api'

export const API_RUNTIME_MODE_KEY = 'hanglian.tablet.apiRuntimeMode'
export const API_RUNTIME_CUSTOM_URL_KEY = 'hanglian.tablet.customApiBaseUrl'

const localHosts = new Set(['localhost', '127.0.0.1', '::1'])

declare global {
  interface Window {
    __HANG_LIAN_CONFIG__?: {
      apiBaseUrl?: string
    }
  }
}

function normalizeApiBaseUrl(value?: string) {
  const configured = value?.trim()
  return configured ? configured.replace(/\/$/, '') : ''
}

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
  const storedMode = getStoredApiRuntimeMode()

  if (storedMode === 'local') {
    return {
      apiBaseUrl: LOCAL_API_BASE_URL,
      source: 'stored-local',
      mode: 'local',
      label: '本机 API',
      canEdit: true,
    }
  }

  if (storedMode === 'cloud') {
    return {
      apiBaseUrl: CLOUD_API_BASE_URL,
      source: 'stored-cloud',
      mode: 'cloud',
      label: '云端 Sealos API',
      canEdit: true,
    }
  }

  if (storedMode === 'custom') {
    const customUrl = getStoredCustomApiBaseUrl()
    if (customUrl) {
      return {
        apiBaseUrl: customUrl,
        source: 'stored-custom',
        mode: 'custom',
        label: '自定义 API',
        canEdit: true,
      }
    }
  }

  const runtimeConfigured = typeof window === 'undefined'
    ? ''
    : normalizeApiBaseUrl(window.__HANG_LIAN_CONFIG__?.apiBaseUrl)
  if (runtimeConfigured) {
    return {
      apiBaseUrl: runtimeConfigured,
      source: 'runtime',
      mode: 'runtime',
      label: '运行时配置 API',
      canEdit: false,
    }
  }

  const configured = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)
  if (configured) {
    return {
      apiBaseUrl: configured,
      source: 'env',
      mode: 'env',
      label: '构建环境 API',
      canEdit: false,
    }
  }

  if (typeof window === 'undefined') {
    return {
      apiBaseUrl: LOCAL_API_BASE_URL,
      source: 'auto-local',
      mode: 'auto',
      label: '默认本机 API',
      canEdit: true,
    }
  }

  const { hostname } = window.location
  if (isLocalhostAccess(hostname)) {
    return {
      apiBaseUrl: LOCAL_API_BASE_URL,
      source: 'auto-local',
      mode: 'auto',
      label: '自动本机 API',
      canEdit: true,
    }
  }
  return {
    apiBaseUrl: `http://${hostname}:3000/api`,
    source: 'auto-lan',
    mode: 'auto',
    label: '自动局域网 API',
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
