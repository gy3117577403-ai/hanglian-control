export interface ApiHostInfo {
  frontendOrigin: string
  frontendHostname: string
  frontendProtocol: string
  apiBaseUrl: string
  accessMode: 'local' | 'lan'
  mixedContentRisk: boolean
}

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

export function isLocalhostAccess(hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost') {
  return localHosts.has(hostname)
}

export function isLanAccess(hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost') {
  return !isLocalhostAccess(hostname)
}

export function getApiBaseUrl() {
  const runtimeConfigured = typeof window === 'undefined'
    ? ''
    : normalizeApiBaseUrl(window.__HANG_LIAN_CONFIG__?.apiBaseUrl)
  if (runtimeConfigured) return runtimeConfigured

  const configured = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)
  if (configured) return configured

  if (typeof window === 'undefined') return 'http://localhost:3000/api'

  const { hostname } = window.location
  if (isLocalhostAccess(hostname)) return 'http://localhost:3000/api'
  return `http://${hostname}:3000/api`
}

export function getApiHostInfo(): ApiHostInfo {
  const frontendOrigin = typeof window === 'undefined' ? 'http://localhost:5173' : window.location.origin
  const frontendHostname = typeof window === 'undefined' ? 'localhost' : window.location.hostname
  const frontendProtocol = typeof window === 'undefined' ? 'http:' : window.location.protocol
  const apiBaseUrl = getApiBaseUrl()

  return {
    frontendOrigin,
    frontendHostname,
    frontendProtocol,
    apiBaseUrl,
    accessMode: isLanAccess(frontendHostname) ? 'lan' : 'local',
    mixedContentRisk: frontendProtocol === 'https:' && apiBaseUrl.startsWith('http://'),
  }
}
