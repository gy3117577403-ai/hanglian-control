import { Capacitor } from '@capacitor/core'
import { normalizeApiBaseUrl } from '@/config/runtime-config'

export const NATIVE_API_MISSING_MESSAGE = 'APP \u5c1a\u672a\u914d\u7f6e\u670d\u52a1\u5668\u5730\u5740\u3002'
export const DEFAULT_ANDROID_ENTRY_URL = 'https://fyeboolnlvqv.sealoshzh.site/tablet'
export const DEFAULT_ANDROID_API_BASE_URL = 'https://fyeboolnlvqv.sealoshzh.site/api'

export function isNativeApp() {
  return Capacitor.isNativePlatform()
}

export function isAndroidApp() {
  return isNativeApp() && Capacitor.getPlatform() === 'android'
}

function getSameOriginApiBaseUrl() {
  if (typeof window === 'undefined') return ''
  if (window.location.protocol !== 'https:') return ''
  if (window.location.hostname !== 'fyeboolnlvqv.sealoshzh.site') return ''
  return `${window.location.origin}/api`
}

export function getNativeApiBaseUrl() {
  if (!isNativeApp()) return ''
  const configured = normalizeApiBaseUrl(import.meta.env.VITE_NATIVE_API_BASE_URL)
  if (configured) return configured
  if (!isAndroidApp()) return ''
  return normalizeApiBaseUrl(getSameOriginApiBaseUrl() || DEFAULT_ANDROID_API_BASE_URL)
}

export function getNativeRuntimeInfo() {
  const apiBaseUrl = getNativeApiBaseUrl()
  return {
    platform: Capacitor.getPlatform(),
    isNative: isNativeApp(),
    isAndroid: isAndroidApp(),
    apiBaseUrl,
    apiConfigured: Boolean(apiBaseUrl),
    apiEnv: String(import.meta.env.VITE_NATIVE_API_ENV ?? '').trim(),
  }
}
