export interface PublicRuntimeConfig {
  API_BASE_URL: string
  APP_ENV: string
  STORAGE_MODE: string
}

export const LOCAL_API_BASE_URL = 'http://localhost:3000/api'

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, '')
}

function normalizePath(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  while (parts.length >= 2 && parts.at(-1) === 'api' && parts.at(-2) === 'api') {
    parts.pop()
  }
  if (parts.at(-1) !== 'api') parts.push('api')
  return `/${parts.join('/')}`
}

export function normalizeApiBaseUrl(value?: string) {
  const configured = trimTrailingSlashes(value?.trim() ?? '')
  if (!configured) return ''

  try {
    const url = new URL(configured)
    url.pathname = normalizePath(url.pathname)
    url.search = ''
    url.hash = ''
    return trimTrailingSlashes(url.toString())
  } catch {
    if (configured.startsWith('/')) return normalizePath(configured)
    return configured.replace(/\/api\/api$/i, '/api')
  }
}

export function readPublicRuntimeConfig(): PublicRuntimeConfig {
  if (typeof window === 'undefined') {
    return {
      API_BASE_URL: '',
      APP_ENV: 'local',
      STORAGE_MODE: 'local',
    }
  }

  const modern = window.__HANGLIAN_RUNTIME_CONFIG__
  const legacy = window.__HANG_LIAN_CONFIG__
  return {
    API_BASE_URL: normalizeApiBaseUrl(modern?.API_BASE_URL ?? legacy?.apiBaseUrl),
    APP_ENV: modern?.APP_ENV?.trim() || 'local',
    STORAGE_MODE: modern?.STORAGE_MODE?.trim() || 'local',
  }
}

export function resolveAutomaticApiBaseUrl() {
  if (typeof window === 'undefined') return LOCAL_API_BASE_URL
  const hostname = window.location.hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return LOCAL_API_BASE_URL
  }
  return `http://${hostname}:3000/api`
}
